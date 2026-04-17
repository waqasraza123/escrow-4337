import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const launchCandidateRequiredArtifacts = [
  'deployment-validation.json',
  'chain-sync-daemon-health.json',
  'chain-sync-daemon-alert-dry-run.json',
  'runtime-profile.json',
  'launch-readiness.json',
  'smoke-deployed.json',
  'deployed-seeded-canary.json',
  'deployed-exact-canary.json',
  'deployed-marketplace-seeded-canary.json',
  'deployed-marketplace-exact-canary.json',
  'deployed-walkthrough.json',
  'deployed-authority-evidence.json',
  'authority-evidence/summary.json',
  'promotion-record.json',
  'promotion-record.md',
];

export function validateIncidentPlaybook(playbook) {
  const issues = [];

  if (!Array.isArray(playbook?.severities) || playbook.severities.length === 0) {
    issues.push('docs/incident-playbook.json must define at least one severity.');
  }

  if (!Array.isArray(playbook?.incidents) || playbook.incidents.length === 0) {
    issues.push('docs/incident-playbook.json must define at least one incident.');
    return issues;
  }

  const severityIds = new Set();
  for (const severity of playbook.severities ?? []) {
    if (!severity?.id) {
      issues.push('Every severity must have an id.');
      continue;
    }
    if (severityIds.has(severity.id)) {
      issues.push(`Severity ${severity.id} is duplicated.`);
    }
    severityIds.add(severity.id);

    if (!severity.summary) {
      issues.push(`Severity ${severity.id} is missing a summary.`);
    }
  }

  const incidentIds = new Set();
  for (const incident of playbook.incidents) {
    if (!incident?.id) {
      issues.push('Every incident must have an id.');
    } else if (incidentIds.has(incident.id)) {
      issues.push(`Incident ${incident.id} is duplicated.`);
    } else {
      incidentIds.add(incident.id);
    }

    if (!incident?.summary) {
      issues.push(`Incident ${incident?.id || '<missing id>'} is missing a summary.`);
    }
    if (!incident?.owner) {
      issues.push(`Incident ${incident?.id || '<missing id>'} is missing an owner.`);
    }
    if (!incident?.rollback) {
      issues.push(`Incident ${incident?.id || '<missing id>'} is missing rollback guidance.`);
    }
    if (!incident?.severity) {
      issues.push(`Incident ${incident?.id || '<missing id>'} is missing a severity.`);
    } else if (!severityIds.has(incident.severity)) {
      issues.push(
        `Incident ${incident.id || '<missing id>'} references unknown severity ${incident.severity}.`,
      );
    }
    if (!Array.isArray(incident?.evidence) || incident.evidence.length === 0) {
      issues.push(
        `Incident ${incident?.id || '<missing id>'} must list at least one evidence artifact.`,
      );
      continue;
    }

    for (const evidencePath of incident.evidence) {
      const normalized = normalizeArtifactPath(evidencePath);
      if (!normalized) {
        issues.push(
          `Incident ${incident?.id || '<missing id>'} has an invalid evidence artifact path: ${String(evidencePath)}.`,
        );
      }
    }
  }

  return issues;
}

export function buildLaunchMetadata(env = process.env) {
  return {
    source: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
    environment: trimToNull(env.LAUNCH_CANDIDATE_ENVIRONMENT),
    repository:
      trimToNull(env.LAUNCH_CANDIDATE_REPOSITORY) ?? trimToNull(env.GITHUB_REPOSITORY),
    workflow: trimToNull(env.LAUNCH_CANDIDATE_WORKFLOW) ?? trimToNull(env.GITHUB_WORKFLOW),
    candidateRunId: trimToNull(env.LAUNCH_CANDIDATE_CANDIDATE_RUN_ID),
    candidateRunUrl: trimToNull(env.LAUNCH_CANDIDATE_CANDIDATE_RUN_URL),
    runId: trimToNull(env.GITHUB_RUN_ID),
    runAttempt: trimToNull(env.GITHUB_RUN_ATTEMPT),
    runUrl: trimToNull(env.LAUNCH_CANDIDATE_RUN_URL),
    commitSha: trimToNull(env.LAUNCH_CANDIDATE_COMMIT_SHA) ?? trimToNull(env.GITHUB_SHA),
    gitRef:
      trimToNull(env.LAUNCH_CANDIDATE_GIT_REF) ??
      trimToNull(env.GITHUB_REF_NAME) ??
      trimToNull(env.GITHUB_REF),
    actor: trimToNull(env.LAUNCH_CANDIDATE_ACTOR) ?? trimToNull(env.GITHUB_ACTOR),
    deployedImageSha: trimToNull(env.LAUNCH_CANDIDATE_DEPLOYED_IMAGE_SHA),
    deployedImageReference: trimToNull(env.LAUNCH_CANDIDATE_DEPLOYED_IMAGE_REFERENCE),
    rollbackImageSha: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_IMAGE_SHA),
    rollbackSource: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_SOURCE),
    rollbackPointerRunId: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_POINTER_RUN_ID),
    rollbackPointerArtifactName: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_POINTER_ARTIFACT_NAME),
    rollbackPointerSelectionSource: trimToNull(
      env.LAUNCH_CANDIDATE_ROLLBACK_POINTER_SELECTION_SOURCE,
    ),
    rollbackPointerArtifactId: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_POINTER_ARTIFACT_ID),
    rollbackPointerSelectedCreatedAt: trimToNull(
      env.LAUNCH_CANDIDATE_ROLLBACK_POINTER_SELECTED_CREATED_AT,
    ),
  };
}

export function validateLaunchMetadata(metadata, env = process.env) {
  const issues = [];
  const requirePromotionMetadata =
    env.GITHUB_ACTIONS === 'true' ||
    metadata.environment !== null ||
    metadata.deployedImageSha !== null ||
    metadata.runUrl !== null;

  if (!requirePromotionMetadata) {
    return issues;
  }

  for (const [field, label] of [
    ['environment', 'environment'],
    ['repository', 'repository'],
    ['workflow', 'workflow'],
    ['candidateRunId', 'candidate run id'],
    ['candidateRunUrl', 'candidate run URL'],
    ['runUrl', 'run URL'],
    ['commitSha', 'commit SHA'],
    ['gitRef', 'git ref'],
    ['actor', 'actor'],
    ['deployedImageSha', 'deployed image SHA'],
  ]) {
    if (!metadata[field]) {
      issues.push(`Launch candidate metadata is missing ${label}.`);
    }
  }

  if (metadata.rollbackImageSha && !metadata.rollbackSource) {
    issues.push('Launch candidate metadata is missing rollback source.');
  }
  if (
    metadata.rollbackSource &&
    metadata.rollbackSource !== 'input' &&
    metadata.rollbackSource !== 'release-pointer'
  ) {
    issues.push(
      `Launch candidate rollback source must be input or release-pointer but was ${metadata.rollbackSource}.`,
    );
  }
  if (metadata.rollbackSource === 'release-pointer') {
    if (!metadata.rollbackPointerRunId) {
      issues.push('Launch candidate metadata is missing rollback release pointer run id.');
    }
    if (!metadata.rollbackPointerArtifactName) {
      issues.push('Launch candidate metadata is missing rollback release pointer artifact name.');
    }
    if (!metadata.rollbackPointerSelectionSource) {
      issues.push('Launch candidate metadata is missing rollback release pointer selection source.');
    }
  }
  if (
    metadata.rollbackPointerSelectionSource &&
    metadata.rollbackPointerSelectionSource !== 'input' &&
    metadata.rollbackPointerSelectionSource !== 'artifact-search'
  ) {
    issues.push(
      `Launch candidate rollback release pointer selection source must be input or artifact-search but was ${metadata.rollbackPointerSelectionSource}.`,
    );
  }

  return issues;
}

export function buildEvidenceManifest({
  artifactsDir,
  playbook,
  metadata,
  repoRoot,
  generatedAt = new Date().toISOString(),
}) {
  const incidentRequiredArtifacts = Array.from(
    new Set(playbook.incidents.flatMap((incident) => incident.evidence).map(normalizeArtifactPath)),
  ).filter(Boolean);
  const requiredArtifacts = Array.from(
    new Set([...launchCandidateRequiredArtifacts, ...incidentRequiredArtifacts]),
  ).sort();
  const requiredArtifactEntries = requiredArtifacts.map((artifactPath) => ({
    path: artifactPath,
    present: existsSync(resolve(artifactsDir, artifactPath)),
  }));
  const incidents = playbook.incidents.map((incident) => {
    const evidence = incident.evidence
      .map(normalizeArtifactPath)
      .filter(Boolean)
      .map((artifactPath) => ({
        path: artifactPath,
        present: existsSync(resolve(artifactsDir, artifactPath)),
      }));

    return {
      id: incident.id,
      owner: incident.owner,
      severity: incident.severity,
      presentEvidence: evidence
        .filter((entry) => entry.present)
        .map((entry) => entry.path)
        .sort(),
      missingEvidence: evidence
        .filter((entry) => !entry.present)
        .map((entry) => entry.path)
        .sort(),
    };
  });

  return {
    generatedAt,
    artifactsDir:
      repoRoot && artifactsDir.startsWith(repoRoot)
        ? relative(repoRoot, artifactsDir) || '.'
        : artifactsDir,
    metadata,
    requiredArtifacts: {
      total: requiredArtifactEntries.length,
      present: requiredArtifactEntries.filter((entry) => entry.present).map((entry) => entry.path),
      missing: requiredArtifactEntries.filter((entry) => !entry.present).map((entry) => entry.path),
    },
    incidents,
    producedArtifacts: listArtifacts(artifactsDir),
  };
}

export function evaluatePromotionReadiness({
  metadata,
  runtimeProfile,
  daemonHealth,
  daemonAlertDrill,
  evidenceManifest,
  launchBlockers = [],
}) {
  const blockers = [];
  const warnings = [];
  const daemonRequired = runtimeProfile?.operations?.chainSyncDaemon?.required === true;
  const notification = daemonAlertDrill?.notification ?? null;

  if (launchBlockers.length > 0) {
    blockers.push('Launch candidate still has unresolved blockers.');
  }

  if (evidenceManifest.requiredArtifacts.missing.length > 0) {
    blockers.push('Launch artifact bundle is incomplete.');
  }

  if (metadata.environment === 'production' && !metadata.rollbackImageSha) {
    blockers.push('Production promotion requires a designated rollback image SHA.');
  } else if (!metadata.rollbackImageSha) {
    warnings.push('Rollback image SHA is not yet recorded for this candidate.');
  }

  if (daemonRequired) {
    if (daemonHealth.status === 'failed') {
      blockers.push('Required recurring chain-sync daemon is unhealthy.');
    }
    if (notification?.dryRun !== true) {
      blockers.push('Daemon alert drill did not run in dry-run mode.');
    }
    if (notification?.configured !== true) {
      blockers.push('Daemon alert drill did not confirm configured alert delivery posture.');
    }
    if (notification?.reason === 'webhook_unconfigured') {
      blockers.push('Daemon alert drill reports webhook delivery is unconfigured.');
    }
  } else if (notification?.configured !== true) {
    warnings.push('Daemon alert webhook is not configured because recurring chain sync is optional.');
  }

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    warnings,
  };
}

export function buildPromotionRecord({
  generatedAt = new Date().toISOString(),
  metadata,
  runtimeProfile,
  daemonHealth,
  daemonAlertDrill,
  evidenceManifest,
  summary,
  promotionReadiness,
}) {
  return {
    generatedAt,
    status: promotionReadiness.status,
    metadata,
    launchCandidate: {
      launchReady: summary.launchReadiness.ready,
      blockers: summary.blockers,
      warnings: summary.launchReadiness.warnings,
      smokeFailures: summary.smoke.failed,
      seededCanaryFailures: summary.seededCanary.failed,
      exactCanaryFailures: summary.exactCanary.failed,
      marketplaceSeededCanaryFailures: summary.marketplaceSeededCanary.failed,
      marketplaceExactCanaryFailures: summary.marketplaceExactCanary.failed,
      walkthroughCanaryFailures: summary.walkthroughCanary.failed,
      authorityEvidenceOk: summary.authorityEvidence.ok,
      authorityAuditSource: summary.authorityEvidence.auditSource,
    },
    rollback: {
      deployedImageSha: metadata.deployedImageSha,
      rollbackImageSha: metadata.rollbackImageSha,
      rollbackSource: metadata.rollbackSource,
      rollbackPointerRunId: metadata.rollbackPointerRunId,
      rollbackPointerArtifactName: metadata.rollbackPointerArtifactName,
      rollbackPointerSelectionSource: metadata.rollbackPointerSelectionSource,
      rollbackPointerArtifactId: metadata.rollbackPointerArtifactId,
      rollbackPointerSelectedCreatedAt: metadata.rollbackPointerSelectedCreatedAt,
      required: metadata.environment === 'production',
      ready:
        metadata.environment === 'production'
          ? Boolean(metadata.rollbackImageSha)
          : true,
    },
    observability: {
      daemonRequired: runtimeProfile.operations.chainSyncDaemon.required,
      daemonHealthStatus: daemonHealth.status,
      daemonHealthSummary: daemonHealth.summary,
      alertingConfigured: runtimeProfile.operations.chainSyncDaemon.alertingConfigured,
      alertMinSeverity: runtimeProfile.operations.chainSyncDaemon.alertMinSeverity,
      alertSendRecovery: runtimeProfile.operations.chainSyncDaemon.alertSendRecovery,
      alertResendIntervalSeconds:
        runtimeProfile.operations.chainSyncDaemon.alertResendIntervalSeconds,
      alertDrill: summarizeNotification(daemonAlertDrill),
    },
    evidence: {
      requiredArtifactCount: evidenceManifest.requiredArtifacts.total,
      presentArtifactCount: evidenceManifest.requiredArtifacts.present.length,
      missingArtifacts: evidenceManifest.requiredArtifacts.missing,
      incidentCoverage: evidenceManifest.incidents,
    },
    blockers: promotionReadiness.blockers,
    warnings: promotionReadiness.warnings,
  };
}

export function buildPromotionMarkdown(record) {
  return `# Promotion Record

- Generated at: ${record.generatedAt}
- Status: ${record.status}
- Environment: ${record.metadata.environment ?? 'local'}
- Commit SHA: ${record.metadata.commitSha ?? 'n/a'}
- Deployed image SHA: ${record.metadata.deployedImageSha ?? 'n/a'}
- Rollback image SHA: ${record.metadata.rollbackImageSha ?? 'n/a'}
- Rollback source: ${record.rollback.rollbackSource ?? 'n/a'}
- Rollback pointer run ID: ${record.rollback.rollbackPointerRunId ?? 'n/a'}
- Rollback pointer artifact: ${record.rollback.rollbackPointerArtifactName ?? 'n/a'}
- Rollback pointer selection source: ${record.rollback.rollbackPointerSelectionSource ?? 'n/a'}
- Rollback pointer artifact ID: ${record.rollback.rollbackPointerArtifactId ?? 'n/a'}
- Rollback pointer selected at: ${record.rollback.rollbackPointerSelectedCreatedAt ?? 'n/a'}
- Launch readiness: ${record.launchCandidate.launchReady ? 'ready' : 'blocked'}
- Authority audit source: ${record.launchCandidate.authorityAuditSource}
- Marketplace seeded canary failures: ${record.launchCandidate.marketplaceSeededCanaryFailures}
- Marketplace exact canary failures: ${record.launchCandidate.marketplaceExactCanaryFailures}
- Daemon health: ${record.observability.daemonHealthStatus}
- Alert drill configured: ${record.observability.alertDrill.configured ? 'true' : 'false'}
- Alert drill reason: ${record.observability.alertDrill.reason ?? 'n/a'}
- Required artifacts present: ${record.evidence.presentArtifactCount}/${record.evidence.requiredArtifactCount}

## Blockers

${record.blockers.length === 0 ? '- none' : record.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Warnings

${record.warnings.length === 0 ? '- none' : record.warnings.map((warning) => `- ${warning}`).join('\n')}

## Incident Coverage

${record.evidence.incidentCoverage.length === 0
    ? '- none'
    : record.evidence.incidentCoverage
        .map((incident) =>
          `- ${incident.id}: ${
            incident.missingEvidence.length === 0
              ? 'ok'
              : `missing ${incident.missingEvidence.join(', ')}`
          }`,
        )
        .join('\n')}
`;
}

export function buildSummaryMarkdown(summary) {
  const metadata = summary.launchMetadata ?? {};
  const evidenceContract = summary.evidenceContract ?? {
    presentArtifactCount: 0,
    requiredArtifactCount: 0,
    missingArtifacts: [],
    incidents: [],
  };
  const promotion = summary.promotion ?? {
    status: 'blocked',
    alertDrillConfigured: false,
    alertDrillReason: null,
    rollbackReady: false,
    warnings: [],
  };

  return `# Launch Candidate Summary

- Generated at: ${summary.generatedAt}
- Artifact directory: ${summary.artifactsDir}
- Environment: ${metadata.environment ?? 'local'}
- Repository: ${metadata.repository ?? 'n/a'}
- Workflow: ${metadata.workflow ?? 'n/a'}
- Candidate Run ID: ${metadata.candidateRunId ?? 'n/a'}
- Candidate Run URL: ${metadata.candidateRunUrl ?? 'n/a'}
- Run URL: ${metadata.runUrl ?? 'n/a'}
- Commit SHA: ${metadata.commitSha ?? 'n/a'}
- Git ref: ${metadata.gitRef ?? 'n/a'}
- Actor: ${metadata.actor ?? 'n/a'}
- Deployed image SHA: ${metadata.deployedImageSha ?? 'n/a'}
- Deployed image reference: ${metadata.deployedImageReference ?? 'n/a'}
- Rollback image SHA: ${metadata.rollbackImageSha ?? 'n/a'}
- Rollback source: ${metadata.rollbackSource ?? 'n/a'}
- Rollback pointer run ID: ${metadata.rollbackPointerRunId ?? 'n/a'}
- Rollback pointer artifact: ${metadata.rollbackPointerArtifactName ?? 'n/a'}
- Rollback pointer selection source: ${metadata.rollbackPointerSelectionSource ?? 'n/a'}
- Rollback pointer artifact ID: ${metadata.rollbackPointerArtifactId ?? 'n/a'}
- Rollback pointer selected at: ${metadata.rollbackPointerSelectedCreatedAt ?? 'n/a'}
- Expect launch ready: ${summary.expectLaunchReady ? 'true' : 'false'}
- Deployment validation: ${summary.deploymentValidation.ok ? 'ok' : 'failed'}
- Daemon health: ${summary.daemonHealth.status}
- Runtime profile: ${summary.runtimeProfile.profile}
- Launch readiness: ${summary.launchReadiness.ready ? 'ready' : 'blocked'}
- Smoke failures: ${summary.smoke.failed}
- Seeded canary failures: ${summary.seededCanary.failed}
- Exact canary failures: ${summary.exactCanary.failed}
- Walkthrough canary failures: ${summary.walkthroughCanary.failed}
- Authority evidence: ${summary.authorityEvidence.auditSource} after ${summary.authorityEvidence.syncAttempts} sync attempt(s)
- Promotion review: ${promotion.status}
- Alert drill configured: ${promotion.alertDrillConfigured ? 'true' : 'false'}
- Alert drill reason: ${promotion.alertDrillReason ?? 'n/a'}
- Rollback ready: ${promotion.rollbackReady ? 'true' : 'false'}

## Evidence Contract

- Required artifacts present: ${evidenceContract.presentArtifactCount}/${evidenceContract.requiredArtifactCount}
- Produced artifacts: ${evidenceContract.producedArtifactCount}
- Missing artifacts: ${evidenceContract.missingArtifacts.length === 0 ? 'none' : evidenceContract.missingArtifacts.join(', ')}

## Promotion Warnings

${promotion.warnings.length === 0 ? '- none' : promotion.warnings.map((warning) => `- ${warning}`).join('\n')}

## Blockers

${summary.blockers.length === 0 ? '- none' : summary.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Launch Readiness Warnings

${summary.launchReadiness.warnings.length === 0 ? '- none' : summary.launchReadiness.warnings.map((warning) => `- ${warning}`).join('\n')}

## Incident Evidence

${evidenceContract.incidents.length === 0
    ? '- none'
    : evidenceContract.incidents
        .map((incident) =>
          `- ${incident.id} (${incident.owner}, ${incident.severity}): ${
            incident.missingEvidence.length === 0
              ? 'ok'
              : `missing ${incident.missingEvidence.join(', ')}`
          }`,
        )
        .join('\n')}

## Incident Ownership

- Incident definitions: ${summary.incidentPlaybook.incidentCount}
- Distinct owners: ${summary.incidentPlaybook.ownerCount}
`;
}

export function writeGitHubStepSummary(markdown, env = process.env) {
  const summaryPath = trimToNull(env.GITHUB_STEP_SUMMARY);
  if (!summaryPath) {
    return;
  }

  appendFileSync(summaryPath, `${markdown}${markdown.endsWith('\n') ? '' : '\n'}`, 'utf8');
}

function listArtifacts(rootDir, currentDir = rootDir) {
  if (!existsSync(currentDir)) {
    return [];
  }

  const entries = readdirSync(currentDir, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listArtifacts(rootDir, entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(rootDir, entryPath));
    }
  }

  return files.sort();
}

function normalizeArtifactPath(value) {
  const normalized = trimToNull(value)?.replaceAll('\\', '/');
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('/') || normalized === '..') {
    return null;
  }
  if (normalized.startsWith('../') || normalized.includes('/../')) {
    return null;
  }

  return normalized;
}

function trimToNull(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function summarizeNotification(daemonAlertDrill) {
  const notification = daemonAlertDrill?.notification ?? {};
  return {
    configured: notification.configured === true,
    attempted: notification.attempted === true,
    sent: notification.sent === true,
    dryRun: notification.dryRun === true,
    event: notification.event ?? null,
    severity: notification.severity ?? null,
    reason: notification.reason ?? null,
    webhookResponseStatus: notification.webhookResponseStatus ?? null,
  };
}
