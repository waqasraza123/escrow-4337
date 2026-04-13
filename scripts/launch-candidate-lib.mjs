import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const launchCandidateRequiredArtifacts = [
  'deployment-validation.json',
  'chain-sync-daemon-health.json',
  'runtime-profile.json',
  'launch-readiness.json',
  'smoke-deployed.json',
  'deployed-seeded-canary.json',
  'deployed-exact-canary.json',
  'deployed-walkthrough.json',
  'deployed-authority-evidence.json',
  'authority-evidence/summary.json',
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
    rollbackImageSha: trimToNull(env.LAUNCH_CANDIDATE_ROLLBACK_IMAGE_SHA),
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

export function buildSummaryMarkdown(summary) {
  const metadata = summary.launchMetadata ?? {};
  const evidenceContract = summary.evidenceContract ?? {
    presentArtifactCount: 0,
    requiredArtifactCount: 0,
    missingArtifacts: [],
    incidents: [],
  };

  return `# Launch Candidate Summary

- Generated at: ${summary.generatedAt}
- Artifact directory: ${summary.artifactsDir}
- Environment: ${metadata.environment ?? 'local'}
- Repository: ${metadata.repository ?? 'n/a'}
- Workflow: ${metadata.workflow ?? 'n/a'}
- Run URL: ${metadata.runUrl ?? 'n/a'}
- Commit SHA: ${metadata.commitSha ?? 'n/a'}
- Git ref: ${metadata.gitRef ?? 'n/a'}
- Actor: ${metadata.actor ?? 'n/a'}
- Deployed image SHA: ${metadata.deployedImageSha ?? 'n/a'}
- Rollback image SHA: ${metadata.rollbackImageSha ?? 'n/a'}
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

## Evidence Contract

- Required artifacts present: ${evidenceContract.presentArtifactCount}/${evidenceContract.requiredArtifactCount}
- Produced artifacts: ${evidenceContract.producedArtifactCount}
- Missing artifacts: ${evidenceContract.missingArtifacts.length === 0 ? 'none' : evidenceContract.missingArtifacts.join(', ')}

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
