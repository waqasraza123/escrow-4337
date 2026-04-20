import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const launchCandidateRequiredArtifacts = [
  'deployment-validation.json',
  'provider-validation-summary.json',
  'launch-evidence-posture.json',
  'chain-sync-daemon-health.json',
  'chain-sync-daemon-alert-dry-run.json',
  'runtime-profile.json',
  'launch-readiness.json',
  'smoke-deployed.json',
  'deployed-seeded-canary.json',
  'deployed-exact-canary.json',
  'deployed-marketplace-seeded-canary.json',
  'deployed-marketplace-exact-canary.json',
  'marketplace-seeded-evidence.json',
  'marketplace-exact-evidence.json',
  'marketplace-origin-summary.json',
  'deployed-walkthrough.json',
  'deployed-authority-evidence.json',
  'authority-evidence/summary.json',
  'promotion-record.json',
  'promotion-record.md',
];

const providerValidationGroups = [
  {
    id: 'emailRelay',
    label: 'Email relay',
    checkIds: ['email-config', 'email-relay', 'email-relay-auth'],
  },
  {
    id: 'smartAccountRelay',
    label: 'Smart-account relay',
    checkIds: ['smart-account-config', 'smart-account-relay', 'smart-account-relay-auth'],
  },
  {
    id: 'bundler',
    label: 'Bundler',
    checkIds: ['smart-account-config', 'bundler'],
  },
  {
    id: 'paymaster',
    label: 'Paymaster',
    checkIds: ['smart-account-config', 'paymaster'],
  },
  {
    id: 'escrowRelay',
    label: 'Escrow relay',
    checkIds: ['escrow-config', 'escrow-relay', 'escrow-relay-auth'],
  },
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
  if (metadata.rollbackPointerSelectionSource === 'artifact-search') {
    if (!metadata.rollbackPointerArtifactId) {
      issues.push(
        'Launch candidate metadata is missing rollback release pointer artifact id for artifact-search selection.',
      );
    }
    if (!metadata.rollbackPointerSelectedCreatedAt) {
      issues.push(
        'Launch candidate metadata is missing rollback release pointer selected timestamp for artifact-search selection.',
      );
    }
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

export function summarizeProviderValidation(
  report,
  { generatedAt = new Date().toISOString() } = {},
) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const checksById = new Map(checks.map((check) => [check.id, check]));
  const providerCheckIds = new Set(providerValidationGroups.flatMap((group) => group.checkIds));
  const providers = providerValidationGroups.map((group) => {
    const groupChecks = group.checkIds
      .map((checkId) => checksById.get(checkId))
      .filter(Boolean);
    const blockingChecks = groupChecks.filter((check) => check.status === 'failed');
    const warningChecks = groupChecks.filter((check) => check.status === 'warning');

    return {
      id: group.id,
      label: group.label,
      status: summarizeProviderStatus(groupChecks),
      blocking: blockingChecks.length > 0,
      failureModes: uniqueStrings(groupChecks.flatMap((check) => inferProviderFailureModes(check))),
      blockingDetails: blockingChecks.map((check) => formatValidationCheck(check)),
      warningDetails: warningChecks.map((check) => formatValidationCheck(check)),
      checks: groupChecks.map((check) => ({
        id: check.id,
        status: check.status,
        summary: check.summary,
        details: check.details ?? null,
      })),
    };
  });

  return {
    generatedAt,
    ok: report?.ok === true,
    targetEnvironment: report?.environment?.targetEnvironment ?? null,
    strictValidation: report?.environment?.strictValidation === true,
    failedProviders: providers.filter((provider) => provider.status === 'failed').map((p) => p.id),
    warningProviders: providers
      .filter((provider) => provider.status === 'warning')
      .map((p) => p.id),
    failedChecks: checks.filter((check) => check.status === 'failed').map((check) => check.id),
    warningChecks: checks.filter((check) => check.status === 'warning').map((check) => check.id),
    nonProviderFailures: checks
      .filter((check) => check.status === 'failed' && !providerCheckIds.has(check.id))
      .map((check) => ({
        id: check.id,
        summary: check.summary,
        details: check.details ?? null,
      })),
    providers,
  };
}

export function summarizeMarketplaceJourneyEvidence(
  {
    seededEvidence = null,
    exactEvidence = null,
  },
  { generatedAt = new Date().toISOString() } = {},
) {
  const seeded = normalizeMarketplaceJourneyEvidence('seeded', seededEvidence);
  const exact = normalizeMarketplaceJourneyEvidence('exact', exactEvidence);
  const journeys = {
    seeded,
    exact,
  };
  const confirmedModes = Object.values(journeys)
    .filter((journey) => journey.present && journey.originConfirmed)
    .map((journey) => journey.mode);
  const missingModes = Object.values(journeys)
    .filter((journey) => !journey.present)
    .map((journey) => journey.mode);
  const failedModes = Object.values(journeys)
    .filter((journey) => journey.present && !journey.originConfirmed)
    .map((journey) => journey.mode);

  return {
    generatedAt,
    ok: missingModes.length === 0 && failedModes.length === 0,
    confirmedModes,
    missingModes,
    failedModes,
    jobIds: uniqueStrings(Object.values(journeys).map((journey) => journey.jobId)),
    opportunityIds: uniqueStrings(
      Object.values(journeys).map((journey) => journey.opportunityId),
    ),
    applicationIds: uniqueStrings(
      Object.values(journeys).map((journey) => journey.applicationId),
    ),
    exactLaneProof: exact.present
      ? {
          ok:
            exact.laneProof?.client?.expectedLane === 'client' &&
            exact.laneProof?.client?.currentLaneConfirmed === true &&
            exact.laneProof?.client?.emptyStateConfirmed === true &&
            exact.laneProof?.client?.laneSurfaceConfirmed === true &&
            exact.laneProof?.freelancer?.expectedLane === 'freelancer' &&
            exact.laneProof?.freelancer?.currentLaneConfirmed === true &&
            exact.laneProof?.freelancer?.emptyStateConfirmed === true &&
            exact.laneProof?.freelancer?.laneSurfaceConfirmed === true,
          clientSwitchedViaWorkspaceSwitcher:
            exact.laneProof?.client?.switchedViaWorkspaceSwitcher === true,
          freelancerSwitchedViaWorkspaceSwitcher:
            exact.laneProof?.freelancer?.switchedViaWorkspaceSwitcher === true,
        }
      : null,
    journeys,
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

export function buildLaunchEvidencePosture({
  generatedAt = new Date().toISOString(),
  metadata,
  summary,
  evidenceManifest,
  promotionReadiness,
}) {
  const requiredArtifacts = evidenceManifest?.requiredArtifacts ?? {};
  const providerValidation = summary?.providerValidation ?? {};
  const executionTraces = summary?.authorityEvidence?.executionTraces ?? null;
  const marketplaceOrigin = summary?.marketplaceOrigin ?? null;
  const daemon = summary?.daemonHealth ?? {};
  const alertDrill = summary?.daemonAlertDrill ?? {};

  return {
    generatedAt,
    environment: metadata?.environment ?? null,
    repository: metadata?.repository ?? null,
    candidateRunId: metadata?.candidateRunId ?? null,
    launchRunId: metadata?.runId ?? null,
    status: promotionReadiness?.status ?? 'blocked',
    blockers: Array.isArray(promotionReadiness?.blockers) ? promotionReadiness.blockers : [],
    warnings: Array.isArray(promotionReadiness?.warnings) ? promotionReadiness.warnings : [],
    launchReady: summary?.launchReadiness?.ready === true,
    authority: {
      ok: summary?.authorityEvidence?.ok === true,
      auditSource: summary?.authorityEvidence?.auditSource ?? null,
      jobId: summary?.authorityEvidence?.jobId ?? null,
    },
    executionTraceCoverage: executionTraces
      ? {
          executionCount: executionTraces.executionCount ?? null,
          traceCount: executionTraces.traceCount ?? null,
          correlationTaggedExecutions: executionTraces.correlationTaggedExecutions ?? null,
          requestTaggedExecutions: executionTraces.requestTaggedExecutions ?? null,
          operationTaggedExecutions: executionTraces.operationTaggedExecutions ?? null,
          confirmedWithoutCorrelation: executionTraces.confirmedWithoutCorrelation ?? null,
          missingTxHashes: executionTraces.missingTxHashes ?? [],
        }
      : null,
    providerValidation: {
      ok: providerValidation.ok === true,
      failedProviders: providerValidation.failedProviders ?? [],
      warningProviders: providerValidation.warningProviders ?? [],
      failureCount: Array.isArray(providerValidation.failedProviders)
        ? providerValidation.failedProviders.length
        : 0,
      warningCount: Array.isArray(providerValidation.warningProviders)
        ? providerValidation.warningProviders.length
        : 0,
    },
    evidenceContract: {
      requiredArtifactCount: requiredArtifacts.total ?? null,
      presentArtifactCount: Array.isArray(requiredArtifacts.present)
        ? requiredArtifacts.present.length
        : null,
      missingArtifactCount: Array.isArray(requiredArtifacts.missing)
        ? requiredArtifacts.missing.length
        : null,
      complete: Array.isArray(requiredArtifacts.missing)
        ? requiredArtifacts.missing.length === 0
        : false,
      missingArtifacts: requiredArtifacts.missing ?? [],
    },
    marketplaceOrigin: marketplaceOrigin
      ? {
          ok: marketplaceOrigin.ok === true,
          confirmedModes: marketplaceOrigin.confirmedModes ?? [],
          missingModes: marketplaceOrigin.missingModes ?? [],
          failedModes: marketplaceOrigin.failedModes ?? [],
          jobIds: marketplaceOrigin.jobIds ?? [],
          opportunityIds: marketplaceOrigin.opportunityIds ?? [],
          applicationIds: marketplaceOrigin.applicationIds ?? [],
          exactLaneProof: marketplaceOrigin.exactLaneProof
            ? {
                ok: marketplaceOrigin.exactLaneProof.ok === true,
                clientSwitchedViaWorkspaceSwitcher:
                  marketplaceOrigin.exactLaneProof.clientSwitchedViaWorkspaceSwitcher === true,
                freelancerSwitchedViaWorkspaceSwitcher:
                  marketplaceOrigin.exactLaneProof.freelancerSwitchedViaWorkspaceSwitcher === true,
              }
            : null,
        }
      : null,
    canaries: {
      smokeFailures: summary?.smoke?.failed ?? null,
      seededCanaryFailures: summary?.seededCanary?.failed ?? null,
      exactCanaryFailures: summary?.exactCanary?.failed ?? null,
      marketplaceSeededCanaryFailures: summary?.marketplaceSeededCanary?.failed ?? null,
      marketplaceExactCanaryFailures: summary?.marketplaceExactCanary?.failed ?? null,
      walkthroughCanaryFailures: summary?.walkthroughCanary?.failed ?? null,
    },
    rollback: {
      required: metadata?.environment === 'production',
      ready:
        metadata?.environment === 'production'
          ? Boolean(metadata?.rollbackImageSha)
          : true,
      rollbackImageSha: metadata?.rollbackImageSha ?? null,
      rollbackSource: metadata?.rollbackSource ?? null,
      rollbackPointerRunId: metadata?.rollbackPointerRunId ?? null,
      rollbackPointerArtifactName: metadata?.rollbackPointerArtifactName ?? null,
      rollbackPointerSelectionSource: metadata?.rollbackPointerSelectionSource ?? null,
      rollbackPointerArtifactId: metadata?.rollbackPointerArtifactId ?? null,
      rollbackPointerSelectedCreatedAt: metadata?.rollbackPointerSelectedCreatedAt ?? null,
    },
    observability: {
      daemonStatus: daemon.status ?? null,
      daemonIssueCodes: daemon.issueCodes ?? [],
      alertDrillConfigured: alertDrill.configured === true,
      alertDrillAttempted: alertDrill.attempted === true,
      alertDrillSent: alertDrill.sent === true,
      alertDrillDryRun: alertDrill.dryRun === true,
      alertDrillReason: alertDrill.reason ?? null,
    },
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
      executionTraceCoverage: summary.authorityEvidence.executionTraces
        ? {
            executionCount: summary.authorityEvidence.executionTraces.executionCount,
            traceCount: summary.authorityEvidence.executionTraces.traceCount,
            correlationTaggedExecutions:
              summary.authorityEvidence.executionTraces.correlationTaggedExecutions,
            requestTaggedExecutions:
              summary.authorityEvidence.executionTraces.requestTaggedExecutions,
            operationTaggedExecutions:
              summary.authorityEvidence.executionTraces.operationTaggedExecutions,
            confirmedWithoutCorrelation:
              summary.authorityEvidence.executionTraces.confirmedWithoutCorrelation,
            missingTxHashes: summary.authorityEvidence.executionTraces.missingTxHashes ?? [],
          }
        : null,
      providerValidation: {
        failedProviders: summary.providerValidation?.failedProviders ?? [],
        warningProviders: summary.providerValidation?.warningProviders ?? [],
        providers: (summary.providerValidation?.providers ?? []).map((provider) => ({
          id: provider.id,
          label: provider.label,
          status: provider.status,
          failureModes: provider.failureModes ?? [],
          blockingDetails: provider.blockingDetails ?? [],
          warningDetails: provider.warningDetails ?? [],
        })),
      },
      marketplaceOrigin: summary.marketplaceOrigin
        ? {
            ok: summary.marketplaceOrigin.ok === true,
            confirmedModes: summary.marketplaceOrigin.confirmedModes ?? [],
            missingModes: summary.marketplaceOrigin.missingModes ?? [],
            failedModes: summary.marketplaceOrigin.failedModes ?? [],
            jobIds: summary.marketplaceOrigin.jobIds ?? [],
            opportunityIds: summary.marketplaceOrigin.opportunityIds ?? [],
            exactLaneProof: summary.marketplaceOrigin.exactLaneProof
              ? {
                  ok: summary.marketplaceOrigin.exactLaneProof.ok === true,
                  clientSwitchedViaWorkspaceSwitcher:
                    summary.marketplaceOrigin.exactLaneProof
                      .clientSwitchedViaWorkspaceSwitcher === true,
                  freelancerSwitchedViaWorkspaceSwitcher:
                    summary.marketplaceOrigin.exactLaneProof
                      .freelancerSwitchedViaWorkspaceSwitcher === true,
                }
              : null,
          }
        : null,
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
- Execution trace coverage: ${
    record.launchCandidate.executionTraceCoverage
      ? `${record.launchCandidate.executionTraceCoverage.correlationTaggedExecutions}/${record.launchCandidate.executionTraceCoverage.executionCount} correlated, ${record.launchCandidate.executionTraceCoverage.requestTaggedExecutions}/${record.launchCandidate.executionTraceCoverage.executionCount} request-tagged, ${record.launchCandidate.executionTraceCoverage.operationTaggedExecutions}/${record.launchCandidate.executionTraceCoverage.executionCount} operation-tagged`
      : 'n/a'
  }
- Marketplace seeded canary failures: ${record.launchCandidate.marketplaceSeededCanaryFailures}
- Marketplace exact canary failures: ${record.launchCandidate.marketplaceExactCanaryFailures}
- Marketplace origin proof: ${
    record.launchCandidate.marketplaceOrigin
      ? `${record.launchCandidate.marketplaceOrigin.ok ? 'confirmed' : 'blocked'} · confirmed ${record.launchCandidate.marketplaceOrigin.confirmedModes.join(', ') || 'none'}`
      : 'n/a'
  }
- Exact marketplace lane proof: ${
    record.launchCandidate.marketplaceOrigin?.exactLaneProof
      ? `${record.launchCandidate.marketplaceOrigin.exactLaneProof.ok ? 'confirmed' : 'blocked'} · client switched ${record.launchCandidate.marketplaceOrigin.exactLaneProof.clientSwitchedViaWorkspaceSwitcher ? 'yes' : 'no'} · freelancer switched ${record.launchCandidate.marketplaceOrigin.exactLaneProof.freelancerSwitchedViaWorkspaceSwitcher ? 'yes' : 'no'}`
      : 'n/a'
  }
- Provider validation failures: ${
    record.launchCandidate.providerValidation.failedProviders.length === 0
      ? 'none'
      : record.launchCandidate.providerValidation.failedProviders.join(', ')
  }
- Provider validation warnings: ${
    record.launchCandidate.providerValidation.warningProviders.length === 0
      ? 'none'
      : record.launchCandidate.providerValidation.warningProviders.join(', ')
  }
- Daemon health: ${record.observability.daemonHealthStatus}
- Alert drill configured: ${record.observability.alertDrill.configured ? 'true' : 'false'}
- Alert drill reason: ${record.observability.alertDrill.reason ?? 'n/a'}
- Required artifacts present: ${record.evidence.presentArtifactCount}/${record.evidence.requiredArtifactCount}

## Blockers

${record.blockers.length === 0 ? '- none' : record.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Warnings

${record.warnings.length === 0 ? '- none' : record.warnings.map((warning) => `- ${warning}`).join('\n')}

## Provider Validation

${record.launchCandidate.providerValidation.providers.length === 0
    ? '- none'
    : record.launchCandidate.providerValidation.providers
        .map((provider) => {
          const posture = [
            provider.label,
            provider.status,
            provider.failureModes.length === 0 ? null : provider.failureModes.join(', '),
          ]
            .filter(Boolean)
            .join(' | ');
          const details = provider.blockingDetails[0] ?? provider.warningDetails[0] ?? null;
          return `- ${posture}${details ? ` | ${details}` : ''}`;
        })
        .join('\n')}

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
- Execution traces: ${
    summary.authorityEvidence.executionTraces
      ? `${summary.authorityEvidence.executionTraces.correlationTaggedExecutions}/${summary.authorityEvidence.executionTraces.executionCount} correlated, ${summary.authorityEvidence.executionTraces.requestTaggedExecutions}/${summary.authorityEvidence.executionTraces.executionCount} request-tagged, ${summary.authorityEvidence.executionTraces.operationTaggedExecutions}/${summary.authorityEvidence.executionTraces.executionCount} operation-tagged`
      : 'n/a'
  }
- Promotion review: ${promotion.status}
- Alert drill configured: ${promotion.alertDrillConfigured ? 'true' : 'false'}
- Alert drill reason: ${promotion.alertDrillReason ?? 'n/a'}
- Rollback ready: ${promotion.rollbackReady ? 'true' : 'false'}
- Provider validation failures: ${
    summary.providerValidation?.failedProviders?.length
      ? summary.providerValidation.failedProviders.join(', ')
      : 'none'
  }
- Provider validation warnings: ${
    summary.providerValidation?.warningProviders?.length
      ? summary.providerValidation.warningProviders.join(', ')
      : 'none'
  }
- Marketplace origin proof: ${
    summary.marketplaceOrigin
      ? `${summary.marketplaceOrigin.ok ? 'confirmed' : 'blocked'} · confirmed ${summary.marketplaceOrigin.confirmedModes.join(', ') || 'none'}`
      : 'n/a'
  }

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

## Provider Validation

${summary.providerValidation?.providers?.length
    ? summary.providerValidation.providers
        .map((provider) => {
          const posture = [
            provider.label,
            provider.status,
            provider.failureModes.length === 0 ? null : provider.failureModes.join(', '),
          ]
            .filter(Boolean)
            .join(' | ');
          const details = provider.blockingDetails[0] ?? provider.warningDetails[0] ?? null;
          return `- ${posture}${details ? ` | ${details}` : ''}`;
        })
        .join('\n')
    : '- none'}

## Marketplace Origin

${summary.marketplaceOrigin
    ? Object.values(summary.marketplaceOrigin.journeys)
        .map((journey) => {
          const posture = journey.present
            ? journey.originConfirmed
              ? 'confirmed'
              : 'blocked'
            : 'missing';
          const details = [
            journey.jobId ? `job ${journey.jobId}` : null,
            journey.opportunityId ? `opportunity ${journey.opportunityId}` : null,
            journey.applicationId ? `application ${journey.applicationId}` : null,
            journey.fitScore !== null ? `fit ${journey.fitScore}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const issueText = journey.issues.length === 0 ? 'ok' : journey.issues.join(' | ');
          return `- ${journey.mode}: ${posture}${details ? ` · ${details}` : ''} · ${issueText}`;
        })
        .join('\n')
    : '- none'}

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

function normalizeMarketplaceJourneyEvidence(mode, evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return {
      mode,
      present: false,
      originConfirmed: false,
      issues: ['evidence artifact missing'],
      jobId: null,
      opportunityId: null,
      applicationId: null,
      visibility: null,
      fitScore: null,
      riskFlags: [],
      authority: {
        jobHistory: null,
        disputeCase: null,
      },
      executionTraces: null,
      laneProof: null,
    };
  }

  return {
    mode,
    present: true,
    originConfirmed: evidence.originConfirmed === true,
    issues: Array.isArray(evidence.issues)
      ? evidence.issues.filter((issue) => typeof issue === 'string' && issue.length > 0)
      : [],
    jobId: trimToNull(evidence.jobId),
    opportunityId: trimToNull(evidence.opportunityId),
    applicationId: trimToNull(evidence.marketplaceTerms?.applicationId),
    visibility: trimToNull(evidence.marketplaceTerms?.visibility),
    fitScore:
      Number.isFinite(evidence.marketplaceTerms?.fitScore) ? evidence.marketplaceTerms.fitScore : null,
    riskFlags: Array.isArray(evidence.marketplaceTerms?.riskFlags)
      ? evidence.marketplaceTerms.riskFlags.filter(
          (flag) => typeof flag === 'string' && flag.length > 0,
        )
      : [],
    authority: {
      jobHistory: trimToNull(evidence.authority?.jobHistory),
      disputeCase: trimToNull(evidence.authority?.disputeCase),
    },
    laneProof: evidence.laneProof
      ? {
          client: evidence.laneProof.client
            ? {
                expectedLane: trimToNull(evidence.laneProof.client.expectedLane),
                currentLaneConfirmed:
                  evidence.laneProof.client.currentLaneConfirmed === true,
                switchedViaWorkspaceSwitcher:
                  evidence.laneProof.client.switchedViaWorkspaceSwitcher === true,
                emptyStateConfirmed:
                  evidence.laneProof.client.emptyStateConfirmed === true,
                laneSurfaceConfirmed:
                  evidence.laneProof.client.laneSurfaceConfirmed === true,
              }
            : null,
          freelancer: evidence.laneProof.freelancer
            ? {
                expectedLane: trimToNull(evidence.laneProof.freelancer.expectedLane),
                currentLaneConfirmed:
                  evidence.laneProof.freelancer.currentLaneConfirmed === true,
                switchedViaWorkspaceSwitcher:
                  evidence.laneProof.freelancer.switchedViaWorkspaceSwitcher === true,
                emptyStateConfirmed:
                  evidence.laneProof.freelancer.emptyStateConfirmed === true,
                laneSurfaceConfirmed:
                  evidence.laneProof.freelancer.laneSurfaceConfirmed === true,
              }
            : null,
        }
      : null,
    executionTraces: evidence.executionTraces
      ? {
          executionCount:
            Number.isInteger(evidence.executionTraces.executionCount)
              ? evidence.executionTraces.executionCount
              : null,
          traceCount:
            Number.isInteger(evidence.executionTraces.traceCount)
              ? evidence.executionTraces.traceCount
              : null,
          correlationTaggedExecutions:
            Number.isInteger(evidence.executionTraces.correlationTaggedExecutions)
              ? evidence.executionTraces.correlationTaggedExecutions
              : null,
        }
      : null,
  };
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

function summarizeProviderStatus(checks) {
  if (checks.some((check) => check.status === 'failed')) {
    return 'failed';
  }
  if (checks.some((check) => check.status === 'warning')) {
    return 'warning';
  }
  if (checks.some((check) => check.status === 'ok')) {
    return 'ok';
  }
  if (checks.length === 0 || checks.every((check) => check.status === 'skipped')) {
    return 'skipped';
  }
  return 'unknown';
}

function inferProviderFailureModes(check) {
  const summary = String(check?.summary ?? '').toLowerCase();
  const details = String(check?.details ?? '').toLowerCase();
  const combined = `${summary}\n${details}`;
  const modes = [];

  if (check?.status === 'warning' && combined.includes('did not answer eth_chainid')) {
    modes.push('degraded_readability');
  }
  if (check?.status === 'warning' && combined.includes('accepted the probe payload')) {
    modes.push('unsafe_validation_route');
  }
  if (combined.includes('must be set') || combined.includes('configuration is invalid')) {
    modes.push('missing_config');
  }
  if (combined.includes('rejected credentials')) {
    modes.push('credentials_rejected');
  }
  if (combined.includes('was not found')) {
    modes.push('validation_route_missing');
  }
  if (
    combined.includes('expected chain ') ||
    combined.includes('invalid eth_chainid response') ||
    combined.includes('chain id does not match')
  ) {
    modes.push('invalid_chain_target');
  }
  if (
    combined.includes('received 5') ||
    combined.includes('returned 5') ||
    combined.includes('json-rpc error')
  ) {
    modes.push('provider_unhealthy');
  }
  if (
    combined.includes('network failure') ||
    combined.includes('fetch failed') ||
    combined.includes('timed out') ||
    combined.includes('abort') ||
    combined.includes('econn')
  ) {
    modes.push('unreachable');
  }

  if (modes.length === 0 && (check?.status === 'failed' || check?.status === 'warning')) {
    modes.push('unknown');
  }

  return uniqueStrings(modes);
}

function formatValidationCheck(check) {
  return check.details ? `${check.id}: ${check.details}` : `${check.id}: ${check.summary}`;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
