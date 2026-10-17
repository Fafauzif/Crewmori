-- A running ingestion records when its lease began so a crashed worker can be detected.
alter table crewmori.knowledge_jobs add column started_at timestamptz;
create index knowledge_jobs_running on crewmori.knowledge_jobs(started_at) where state='running';
