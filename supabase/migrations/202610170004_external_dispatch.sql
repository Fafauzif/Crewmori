create table crewmori.external_dispatches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  owner_id uuid not null,
  operation text not null,
  command_key uuid not null,
  fingerprint text not null,
  input jsonb not null,
  payload jsonb not null,
  reference_ids text[] not null,
  state text not null check(state in ('dispatching','completed','unknown','abandoned')),
  provider_reference text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,command_key)
);
alter table crewmori.external_dispatches enable row level security;
revoke all on crewmori.external_dispatches from public, anon, authenticated;
create index active_dispatch_references on crewmori.external_dispatches using gin(reference_ids) where state in ('dispatching','unknown');
