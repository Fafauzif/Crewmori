create schema if not exists crewmori_jobs;
create schema if not exists crewmori_checkpoints;
revoke all on schema crewmori_jobs, crewmori_checkpoints from public, anon, authenticated;

alter table crewmori.agent_runs add column previous_attempt_id uuid references crewmori.agent_runs(id);
create table crewmori.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces,
  grant_id uuid not null references crewmori.buyer_grants,
  engagement_id text not null,
  binding_hash text not null unique,
  provider_conversation_id text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table crewmori.voice_sessions enable row level security;
revoke all on crewmori.voice_sessions from public, anon, authenticated;
create table crewmori.payment_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces,
  invoice_id text not null,
  engagement_id text not null,
  provider text not null check(provider in ('sandbox','stripe_test')),
  provider_reference text unique,
  expected_minor bigint not null check(expected_minor > 0 and expected_minor <= 9007199254740991),
  currency text not null check(currency in ('USD','IDR')),
  state text not null default 'created' check(state in ('created','pending','unknown','confirmed','failed','cancelled')),
  created_at timestamptz not null default now(),
  unique(workspace_id,id)
);
create table crewmori.payment_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  request_id uuid not null,
  provider text not null,
  event_id text not null,
  provider_reference text,
  gross_minor bigint not null check(gross_minor > 0),
  fee_minor bigint check(fee_minor >= 0 and fee_minor <= gross_minor),
  currency text not null check(currency in ('USD','IDR')),
  occurred_at timestamptz not null,
  state text not null default 'unmatched' check(state in ('unmatched','review_required','reconciled')),
  foreign key(workspace_id,request_id) references crewmori.payment_requests(workspace_id,id),
  unique(provider,event_id)
);
-- Multiple provider events can describe the same Stripe Checkout settlement.
create unique index one_stripe_settlement on crewmori.payment_observations(provider,provider_reference) where provider='stripe_test';
alter table crewmori.payment_requests enable row level security;
alter table crewmori.payment_observations enable row level security;
revoke all on crewmori.payment_requests, crewmori.payment_observations from public, anon, authenticated;
create policy owner_payment_requests on crewmori.payment_requests for select to authenticated using(crewmori.owns_workspace(workspace_id));
create policy owner_payment_observations on crewmori.payment_observations for select to authenticated using(crewmori.owns_workspace(workspace_id));
grant select on crewmori.payment_requests, crewmori.payment_observations to authenticated;
