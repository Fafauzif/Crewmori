-- A blocked or failed run can be retried once; later retries continue from the newest attempt.
create unique index agent_runs_single_retry on crewmori.agent_runs(previous_attempt_id) where previous_attempt_id is not null;
