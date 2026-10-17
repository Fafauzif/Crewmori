# Worker operations and unresolved deployment

The user does not know where the current worker is hosted. This source run cannot establish that a persistent worker is running on the deployed site. Improved delayed-task copy must not be mistaken for a repaired deployment.

The existing scripts/worker.ts process runs pg-boss agent.run, knowledge.ingest and maintenance.sweep, a one-second outbox relay and LangGraph PostgreSQL checkpoints. Web hosting alone does not prove these processes are active. The existing Dockerfile.worker is a deployment starting point, not evidence of a provisioned host.

## What to establish after pushing

1. Identify an existing persistent worker service, or provision a persistent Node process/container using the same release and configured database as the web app. Do not run the worker as a request-limited web function.
2. Use Node >=22.13 and the lockfile. Set CREWMORI_BACKEND_ENABLED=true and the existing server-only DB/storage/model configuration. Keep all credentials in the host secret store. Never paste them into a support report.
3. Run backend:check to see missing variable names. Its “configured” result is presence only, not a connectivity test. Apply existing migrations as a deliberate release operation if the deployment has not already applied them; this UI release introduces no new SQL migration.
4. Start npm run worker separately from npm start, with host restart policy and logs. Look for “Crewmori worker ready.” Check continuing outbox/queue consumption; a startup message alone does not establish ongoing health.
5. Use one disposable named task and text knowledge source. Verify queued→running→completed/awaiting review, saved outputs and indexed retrieval. Check worker/provider/database logs if queued work does not move. Do not repeatedly retry uncertain paid model attempts.
6. Confirm graceful restart, model quota/budget behavior and maintenance. A 15-minute interrupted index and 30-minute interrupted agent run have existing maintenance rules; these are recovery thresholds, not promised completion times.

UI queue states show saved request, real last activity, delayed explanation, supported controls and manual alternatives. They do not claim that a worker heartbeat was observed. Automated deployment health/heartbeat monitoring remains an operational follow-up; no provider account or host was created here.
