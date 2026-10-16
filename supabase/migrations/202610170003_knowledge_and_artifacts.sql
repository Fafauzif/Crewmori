create table crewmori.knowledge_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  source_id text not null,
  source_version integer not null,
  state text not null default 'queued' check(state in ('queued','running','completed','failed','superseded')),
  error_code text,
  created_at timestamptz not null default now(),
  unique(workspace_id,source_id,source_version)
);
create table crewmori.knowledge_chunks (
  workspace_id uuid not null references crewmori.workspaces on delete cascade,
  source_id text not null,
  source_version integer not null,
  position integer not null,
  content text not null,
  embedding double precision[] not null,
  model text not null,
  dimensions integer not null,
  primary key(workspace_id,source_id,position)
);
create index knowledge_text_search on crewmori.knowledge_chunks using gin(to_tsvector('simple',content));
alter table crewmori.knowledge_jobs enable row level security;
alter table crewmori.knowledge_chunks enable row level security;
revoke all on crewmori.knowledge_jobs,crewmori.knowledge_chunks from public, anon, authenticated;
alter table crewmori.agent_runs add column applied_at timestamptz;
alter table crewmori.agent_runs add column applied_result jsonb;
