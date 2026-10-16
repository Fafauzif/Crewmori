-- Published handles are globally unique, while draft content remains private.
create table crewmori.public_profiles (
  handle text primary key check (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  workspace_id uuid not null unique references crewmori.workspaces on delete cascade,
  profile_id text not null
);
alter table crewmori.public_profiles enable row level security;
revoke all on crewmori.public_profiles from public, anon, authenticated;

-- Invitation tokens are exchanged once for an HTTP-only engagement session.
create table crewmori.buyer_invitations (
  token_hash text primary key,
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  engagement_id text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);
alter table crewmori.buyer_invitations enable row level security;
revoke all on crewmori.buyer_invitations from public, anon, authenticated;
create table crewmori.request_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);
alter table crewmori.request_limits enable row level security;
revoke all on crewmori.request_limits from public, anon, authenticated;

create unique index one_acceptance_per_offer_version on crewmori.records(workspace_id,(data->>'offer_version_id')) where collection='acceptances';
create unique index one_project_per_acceptance on crewmori.records(workspace_id,(data->>'acceptance_id')) where collection='projects' and data->>'acceptance_id' is not null;

alter table crewmori.payment_requests add column checkout_url text;
