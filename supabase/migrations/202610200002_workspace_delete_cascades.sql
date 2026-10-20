-- Deleting a workspace removes everything it owns. Provider inbox rows keep their
-- event IDs for deduplication and only lose the workspace link.
alter table crewmori.model_calls drop constraint model_calls_workspace_id_run_id_fkey,
  add constraint model_calls_workspace_id_run_id_fkey foreign key (workspace_id, run_id) references crewmori.agent_runs(workspace_id, id) on delete cascade;
alter table crewmori.voice_sessions drop constraint voice_sessions_workspace_id_fkey,
  add constraint voice_sessions_workspace_id_fkey foreign key (workspace_id) references crewmori.workspaces on delete cascade;
alter table crewmori.voice_sessions drop constraint voice_sessions_grant_id_fkey,
  add constraint voice_sessions_grant_id_fkey foreign key (grant_id) references crewmori.buyer_grants on delete cascade;
alter table crewmori.payment_requests drop constraint payment_requests_workspace_id_fkey,
  add constraint payment_requests_workspace_id_fkey foreign key (workspace_id) references crewmori.workspaces on delete cascade;
alter table crewmori.payment_observations drop constraint payment_observations_workspace_id_request_id_fkey,
  add constraint payment_observations_workspace_id_request_id_fkey foreign key (workspace_id, request_id) references crewmori.payment_requests(workspace_id, id) on delete cascade;
alter table crewmori.provider_inbox drop constraint provider_inbox_workspace_id_fkey,
  add constraint provider_inbox_workspace_id_fkey foreign key (workspace_id) references crewmori.workspaces on delete set null;
