# Runtime and database interruption recovery

The game has one database-fenced coordinator. A lost ownership connection stops the entire worker immediately; it never reconnects a pooled connection and continues writing under an old owner. The replacement must acquire the same MySQL advisory lock and hydrate the durable matches before readiness or mutations are enabled.

The dedicated ownership connection sets `SESSION wait_timeout = 60` before acquiring its lock. Its 500ms heartbeat keeps a healthy session active. A server-side TCP session orphaned by a network interruption expires after 60 seconds of inactivity, rather than retaining the lock for MySQL's default eight hours. No automatic lock stealing or session killing is implemented.

Initial transient connection failures retry within the 120-second acquisition deadline. Container mode uses a small supervisor: worker exit 75 retries after 2–30 seconds; successful shutdown/takeover exits 0; configuration or programming errors remain failures. The supervisor forwards SIGTERM/SIGINT and waits for the worker's ownership-preserving drain. A replacement worker opens fresh database connections, reruns safe bootstrap and hydrates active games. Admission remains unavailable until ownership and initialization succeed.

Runtime logs record allowlisted driver codes, error names, numeric connection IDs and phases. They omit driver messages, SQL, credentials and connection URLs. `coordinator_waiting` distinguishes connection failures from an existing owner holding the advisory lock.

The release gate tests real MySQL lock exclusion, 60-second timeout configuration, idle orphan expiry in an isolated test namespace, supervisor backoff and signals, plus an actual Linux Docker worker recovery after deliberately terminating its isolated test owner connection. Session and active-match continuity are checked after recovery. Existing game turn clocks and timeout rules remain unchanged.

## 15 October 2026 incident

- The production worker became ready at 05:39:45 UTC, then logged `coordinator_lost` / `ownership_check_failed` at 07:04:34 UTC. Initial retries experienced connection failures; subsequent retries could reach MySQL but remained blocked acquiring ownership until Railway's restart allowance was exhausted at 07:19 UTC.
- App memory peaked at approximately 0.105 GB against a 1 GB limit; MySQL peaked at approximately 0.390 GB against a 0.75 GB limit. The available metrics and logs did not indicate an out-of-memory crash or database restart.
- A read-only diagnostic at 08:51 UTC found advisory-lock owner connection 1451 in `Sleep` for 6,429 seconds. The replacement's request connection was active and waiting. The original ownership connection had remained orphaned on MySQL after the worker was gone.
- At 08:53:26 UTC, a targeted repair rechecked the exact database, lock owner 1451, `Sleep` age 6,536 seconds, zero active InnoDB transactions, and public readiness 503. Only that stale connection was terminated. The waiting worker acquired ownership; public readiness returned 200 for release `4ba22c034090d4774fcdf7d2261d40323f806497`. Player rows and databases were preserved.
- The temporary diagnostic/repair function has been retired to an inert exit-only script and its database reference cleared. Its service has no public domain. Removing the service itself was rejected by automatic approval review; no active diagnostic job or database access remains.

The exact underlying network event is not available in the old logs because the previous startup handler omitted driver error codes. The confirmed cause of the prolonged outage was the orphaned advisory lock; the bounded session lifetime and diagnostic logging address that observed failure.
