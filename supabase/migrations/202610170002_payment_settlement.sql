alter table crewmori.payment_requests add column domain_request_id text;
create unique index payment_domain_request on crewmori.payment_requests(workspace_id,domain_request_id) where domain_request_id is not null;
create unique index receipt_observation_identity on crewmori.records(workspace_id,(data->>'observation_id')) where collection='receipts' and data->>'observation_id' is not null;
