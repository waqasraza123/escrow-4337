# Incident Playbook

This playbook defines the launch-scoped incident classes, ownership, severity, first response, and minimum evidence artifacts for promotion decisions.

The machine-readable source of truth is `docs/incident-playbook.json`. `pnpm launch:candidate` validates that every listed incident has an owner, rollback guidance, and evidence requirements before it will pass.

## Severity

- `critical`: launch blocker that requires rollback, containment, or explicit release hold.
- `warning`: degraded posture that still requires owner acknowledgement and evidence before promotion.

## Launch-Scoped Incidents

### API unavailable

- Owner: deployment
- Severity: critical
- Trigger: public API endpoints, launch smoke, or deployment validation fail for the candidate environment.
- First response: stop promotion, roll back the API image to the last known-good SHA, and rerun deployment validation plus deployed smoke.
- Evidence: `deployment-validation.json`, `launch-readiness.json`, `smoke-deployed.json`

### Daemon unhealthy

- Owner: worker
- Severity: critical
- Trigger: recurring chain-sync daemon is stopped, heartbeat-stale, run-stalled, or failing beyond configured thresholds.
- First response: stop or roll back the worker independently from the API, then confirm recovered daemon health before promotion.
- Evidence: `chain-sync-daemon-health.json`, `launch-readiness.json`

### Operator authority gap

- Owner: operator
- Severity: critical
- Trigger: configured arbitrator wallet, export support, or launch-scoped operator posture is unavailable.
- First response: hold promotion until operator authority is restored or the launch scope is explicitly redefined.
- Evidence: `launch-readiness.json`, `runtime-profile.json`, `authority-evidence/summary.json`

### Frontend runtime mismatch

- Owner: frontend
- Severity: warning
- Trigger: deployed web or admin targets no longer align with backend runtime-profile expectations or page availability.
- First response: hold promotion or revert the affected frontend deploy until deployed smoke passes again.
- Evidence: `runtime-profile.json`, `smoke-deployed.json`

### Relay or chain assumption gap

- Owner: deployment
- Severity: critical
- Trigger: deployment validation, runtime profile, or documented launch assumptions no longer match the candidate environment.
- First response: block promotion until chain assumptions, relay posture, and deployment config are corrected and re-validated.
- Evidence: `deployment-validation.json`, `runtime-profile.json`, `launch-readiness.json`

## Rollback Drill Evidence

For a launch candidate, keep the artifact bundle from `pnpm launch:candidate` or the `Launch Candidate` workflow. Promotion evidence should include:

- the generated `summary.json` and `summary.md`
- deployment validation output
- daemon health output
- runtime-profile output
- launch-readiness output
- deployed smoke JSON report
- authority-evidence summary plus public audit/export proof for the staged resolved job

If an incident is unowned, lacks rollback guidance, or lacks evidence requirements, treat it as a launch blocker.
