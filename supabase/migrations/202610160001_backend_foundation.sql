-- Private application schema. All writes use authenticated application services.
-- Public/buyer responses are projected by the API; no anonymous table reads.
create schema if not exists crewmori;
revoke all on schema crewmori from public;

create table crewmori.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  name text not null check (length(name) between 1 and 120),
  timezone text not null default 'Asia/Jakarta',
  revision bigint not null default 0,
  event_sequence bigint not null default 0,
  created_at timestamptz not null default now()
);
create table crewmori.records (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  collection text not null check (collection ~ '^[a-z_]{1,60}$'),
  id text not null,
  version integer not null check (version > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  primary key (workspace_id, collection, id)
);
create table crewmori.events (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  sequence bigint not null,
  id uuid not null default gen_random_uuid(),
  kind text not null,
  summary text not null,
  record_refs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  primary key (workspace_id, sequence),
  unique (id)
);
create table crewmori.command_receipts (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  actor_id text not null,
  operation text not null,
  key uuid not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, actor_id, operation, key)
);
create table crewmori.buyer_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  engagement_id text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table crewmori.oauth_states (
  state_hash text primary key,
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  owner_id uuid not null,
  verifier_ciphertext text not null,
  scopes text[] not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create table crewmori.connections (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  provider text not null,
  credential_ciphertext text not null,
  scopes text[] not null default '{}',
  version integer not null default 1,
  state text not null check (state in ('active','revoked')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);
create table crewmori.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  role text not null check (role in ('scout','promoter','sales','account_manager','operations','finance')),
  instruction text not null,
  input_refs jsonb not null default '[]',
  state text not null default 'queued' check (state in ('queued','running','paused','cancelled','completed','blocked','failed')),
  control_version integer not null default 1,
  artifact jsonb,
  error_code text,
  usage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create table crewmori.usage_budgets (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  day date not null,
  reserved_tokens integer not null default 0 check (reserved_tokens >= 0),
  consumed_tokens integer not null default 0 check (consumed_tokens >= 0),
  primary key (workspace_id, day)
);
create table crewmori.model_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id uuid not null,
  control_version integer not null,
  reserved_tokens integer not null,
  budget_day date not null,
  state text not null check (state in ('reserved','completed','unknown','cancelled')),
  artifact jsonb,
  usage jsonb,
  foreign key (workspace_id, run_id) references crewmori.agent_runs(workspace_id, id),
  unique (run_id, control_version)
);
create table crewmori.outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  kind text not null,
  reference_id uuid not null,
  deduplication_key text not null unique,
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);
create table crewmori.provider_inbox (
  provider text not null,
  event_id text not null,
  fingerprint text not null,
  workspace_id uuid references crewmori.workspaces,
  payload jsonb not null,
  state text not null default 'received' check (state in ('received','processed','quarantined')),
  created_at timestamptz not null default now(),
  primary key (provider, event_id)
);
create table crewmori.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  engagement_id text,
  owner_id uuid not null,
  name text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text not null,
  object_path text not null unique,
  audience text not null default 'owner' check (audience in ('owner','buyer')),
  state text not null default 'pending' check (state in ('pending','available','deleted')),
  created_at timestamptz not null default now()
);
create index outbox_pending on crewmori.outbox(created_at) where dispatched_at is null;
create index agent_runs_workspace on crewmori.agent_runs(workspace_id, created_at desc);
create index grants_lookup on crewmori.buyer_grants(workspace_id, engagement_id);

-- SECURITY DEFINER avoids recursive membership policies. The function cannot mutate data.
create function crewmori.owns_workspace(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from crewmori.workspaces w where w.id = target and w.owner_id = auth.uid());
$$;
revoke all on function crewmori.owns_workspace(uuid) from public;
grant usage on schema crewmori to authenticated;
grant execute on function crewmori.owns_workspace(uuid) to authenticated;

alter table crewmori.workspaces enable row level security;
create policy owner_workspace_read on crewmori.workspaces for select to authenticated using (owner_id = auth.uid());
grant select on crewmori.workspaces to authenticated;

do $$ declare item text; begin
  foreach item in array array['records','events','command_receipts','buyer_grants','oauth_states','connections','agent_runs','usage_budgets','model_calls','outbox','provider_inbox','files'] loop
    execute format('alter table crewmori.%I enable row level security', item);
    execute format('revoke all on crewmori.%I from anon, authenticated', item);
  end loop;
  foreach item in array array['records','events','agent_runs','files'] loop
    execute format('create policy workspace_read on crewmori.%I for select to authenticated using (crewmori.owns_workspace(workspace_id))', item);
    execute format('grant select on crewmori.%I to authenticated', item);
  end loop;
end $$;

-- Browser identities have no INSERT/UPDATE/DELETE grants, including on financial records.
-- Connector secrets, inbox, grants, budgets and jobs are never readable by browser roles.
