import { appendFileSync } from 'node:fs';
import { buildImageCandidateSelection, validateApiImageManifest } from './api-image-manifest-lib.mjs';

export function buildDeployedSmokeMetadata(env = process.env) {
  return {
    source: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
    environment: trimToNull(env.DEPLOYED_SMOKE_ENVIRONMENT),
    repository: trimToNull(env.DEPLOYED_SMOKE_REPOSITORY) ?? trimToNull(env.GITHUB_REPOSITORY),
    workflow: trimToNull(env.DEPLOYED_SMOKE_WORKFLOW) ?? trimToNull(env.GITHUB_WORKFLOW),
    runId: trimToNull(env.GITHUB_RUN_ID),
    runAttempt: trimToNull(env.GITHUB_RUN_ATTEMPT),
    runUrl: trimToNull(env.DEPLOYED_SMOKE_RUN_URL),
    actor: trimToNull(env.DEPLOYED_SMOKE_ACTOR) ?? trimToNull(env.GITHUB_ACTOR),
    candidateRunId: trimToNull(env.DEPLOYED_SMOKE_CANDIDATE_RUN_ID),
    candidateRunUrl: trimToNull(env.DEPLOYED_SMOKE_CANDIDATE_RUN_URL),
    commitSha: trimToNull(env.DEPLOYED_SMOKE_COMMIT_SHA) ?? trimToNull(env.GITHUB_SHA),
    gitRef:
      trimToNull(env.DEPLOYED_SMOKE_GIT_REF) ??
      trimToNull(env.GITHUB_REF_NAME) ??
      trimToNull(env.GITHUB_REF),
    deployedImageSha: trimToNull(env.DEPLOYED_SMOKE_DEPLOYED_IMAGE_SHA),
    deployedImageReference: trimToNull(env.DEPLOYED_SMOKE_DEPLOYED_IMAGE_REFERENCE),
  };
}

export function validateDeployedSmokeMetadata(metadata, env = process.env) {
  const issues = [];
  const requireReviewMetadata =
    env.GITHUB_ACTIONS === 'true' ||
    metadata.environment !== null ||
    metadata.candidateRunId !== null ||
    metadata.deployedImageSha !== null;

  if (!requireReviewMetadata) {
    return issues;
  }

  for (const [field, label] of [
    ['environment', 'environment'],
    ['repository', 'repository'],
    ['workflow', 'workflow'],
    ['runId', 'run id'],
    ['runUrl', 'run URL'],
    ['actor', 'actor'],
    ['candidateRunId', 'candidate run id'],
    ['candidateRunUrl', 'candidate run URL'],
    ['commitSha', 'commit SHA'],
    ['gitRef', 'git ref'],
    ['deployedImageSha', 'deployed image SHA'],
  ]) {
    if (!metadata[field]) {
      issues.push(`Deployed smoke metadata is missing ${label}.`);
    }
  }

  return issues;
}

export function buildDeployedSmokeRecord({
  generatedAt = new Date().toISOString(),
  metadata,
  smokePassed = true,
  seededCanaryPassed = true,
}) {
  const checks = {
    smokePassed: smokePassed === true,
    seededCanaryPassed: seededCanaryPassed === true,
  };

  return {
    generatedAt,
    status: checks.smokePassed && checks.seededCanaryPassed ? 'ready' : 'blocked',
    metadata,
    checks,
  };
}

export function validateDeployedSmokeRecord(
  record,
  {
    expectedEnvironment = null,
    expectedRepository = null,
    expectedCandidateRunId = null,
    expectedRunId = null,
  } = {},
) {
  const issues = [];

  if (!record || typeof record !== 'object') {
    return ['Deployed smoke review artifact is missing or invalid JSON.'];
  }

  for (const [field, label] of [
    ['generatedAt', 'generatedAt'],
    ['status', 'status'],
  ]) {
    if (!trimToNull(record[field])) {
      issues.push(`Deployed smoke review artifact is missing ${label}.`);
    }
  }

  const metadataIssues = validateDeployedSmokeMetadata(record.metadata ?? {}, {
    GITHUB_ACTIONS: 'true',
  });
  issues.push(...metadataIssues);

  if (record.status !== 'ready') {
    issues.push(`Deployed smoke review artifact status must be ready but was ${record.status ?? '<missing>'}.`);
  }

  if (record?.checks?.smokePassed !== true) {
    issues.push('Deployed smoke review artifact does not confirm read-only smoke passed.');
  }
  if (record?.checks?.seededCanaryPassed !== true) {
    issues.push('Deployed smoke review artifact does not confirm seeded canary passed.');
  }

  if (
    expectedEnvironment &&
    trimToNull(record?.metadata?.environment) !== expectedEnvironment
  ) {
    issues.push(
      `Deployed smoke review environment ${record?.metadata?.environment ?? '<missing>'} does not match expected environment ${expectedEnvironment}.`,
    );
  }
  if (
    expectedRepository &&
    trimToNull(record?.metadata?.repository) !== expectedRepository
  ) {
    issues.push(
      `Deployed smoke review repository ${record?.metadata?.repository ?? '<missing>'} does not match expected repository ${expectedRepository}.`,
    );
  }
  if (
    expectedCandidateRunId &&
    trimToNull(record?.metadata?.candidateRunId) !== expectedCandidateRunId
  ) {
    issues.push(
      `Deployed smoke review candidate run id ${record?.metadata?.candidateRunId ?? '<missing>'} does not match expected candidate run id ${expectedCandidateRunId}.`,
    );
  }
  if (expectedRunId && trimToNull(record?.metadata?.runId) !== expectedRunId) {
    issues.push(
      `Deployed smoke review run id ${record?.metadata?.runId ?? '<missing>'} does not match expected run id ${expectedRunId}.`,
    );
  }

  return issues;
}

export function buildDeployedSmokeRecordMarkdown(record) {
  return `# Deployed Smoke Record

- Generated at: ${record.generatedAt}
- Status: ${record.status}
- Environment: ${record.metadata.environment ?? 'n/a'}
- Repository: ${record.metadata.repository ?? 'n/a'}
- Workflow: ${record.metadata.workflow ?? 'n/a'}
- Run ID: ${record.metadata.runId ?? 'n/a'}
- Run URL: ${record.metadata.runUrl ?? 'n/a'}
- Candidate Run ID: ${record.metadata.candidateRunId ?? 'n/a'}
- Candidate Run URL: ${record.metadata.candidateRunUrl ?? 'n/a'}
- Commit SHA: ${record.metadata.commitSha ?? 'n/a'}
- Git Ref: ${record.metadata.gitRef ?? 'n/a'}
- Deployed image SHA: ${record.metadata.deployedImageSha ?? 'n/a'}
- Deployed image reference: ${record.metadata.deployedImageReference ?? 'n/a'}
- Read-only smoke passed: ${record.checks.smokePassed ? 'true' : 'false'}
- Seeded canary passed: ${record.checks.seededCanaryPassed ? 'true' : 'false'}
`;
}

export function buildPromotionReview({
  generatedAt = new Date().toISOString(),
  imageManifest,
  deployedSmokeRecord,
  launchPromotionRecord,
  launchEvidenceManifest,
  expectedEnvironment = null,
  expectedRepository = null,
  expectedCandidateRunId = null,
  expectedSmokeRunId = null,
  expectedLaunchRunId = null,
}) {
  const blockers = [];
  const warnings = [];
  const imageIssues = validateApiImageManifest(imageManifest, {
    expectedRepository,
    expectedRunId: expectedCandidateRunId,
  });
  blockers.push(...imageIssues);

  const smokeIssues = validateDeployedSmokeRecord(deployedSmokeRecord, {
    expectedEnvironment,
    expectedRepository,
    expectedCandidateRunId,
    expectedRunId: expectedSmokeRunId,
  });
  blockers.push(...smokeIssues);

  blockers.push(
    ...validateLaunchPromotionReview({
      record: launchPromotionRecord,
      evidenceManifest: launchEvidenceManifest,
      expectedEnvironment,
      expectedRepository,
      expectedCandidateRunId,
      expectedRunId: expectedLaunchRunId,
    }),
  );

  const candidate = buildImageCandidateSelection(imageManifest ?? {});
  const smokeMetadata = deployedSmokeRecord?.metadata ?? {};
  const launchMetadata = launchPromotionRecord?.metadata ?? {};
  const missingLaunchArtifacts = Array.isArray(launchEvidenceManifest?.requiredArtifacts?.missing)
    ? launchEvidenceManifest.requiredArtifacts.missing
    : [];

  compareField({
    blockers,
    leftLabel: 'Candidate image manifest commit SHA',
    leftValue: candidate.commitSha,
    rightLabel: 'deployed smoke review commit SHA',
    rightValue: smokeMetadata.commitSha,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest commit SHA',
    leftValue: candidate.commitSha,
    rightLabel: 'launch candidate review commit SHA',
    rightValue: launchMetadata.commitSha,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest run id',
    leftValue: candidate.runId,
    rightLabel: 'deployed smoke review candidate run id',
    rightValue: smokeMetadata.candidateRunId,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest run id',
    leftValue: candidate.runId,
    rightLabel: 'launch candidate review candidate run id',
    rightValue: launchMetadata.candidateRunId,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest run URL',
    leftValue: candidate.runUrl,
    rightLabel: 'deployed smoke review candidate run URL',
    rightValue: smokeMetadata.candidateRunUrl,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest run URL',
    leftValue: candidate.runUrl,
    rightLabel: 'launch candidate review candidate run URL',
    rightValue: launchMetadata.candidateRunUrl,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest image digest',
    leftValue: candidate.imageDigest,
    rightLabel: 'deployed smoke review image digest',
    rightValue: smokeMetadata.deployedImageSha,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest image digest',
    leftValue: candidate.imageDigest,
    rightLabel: 'launch candidate review image digest',
    rightValue: launchMetadata.deployedImageSha,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest image reference',
    leftValue: candidate.imageReference,
    rightLabel: 'deployed smoke review image reference',
    rightValue: smokeMetadata.deployedImageReference,
    severity: 'warning',
    warnings,
  });
  compareField({
    blockers,
    leftLabel: 'Candidate image manifest image reference',
    leftValue: candidate.imageReference,
    rightLabel: 'launch candidate review image reference',
    rightValue: launchMetadata.deployedImageReference,
    severity: 'warning',
    warnings,
  });

  if (launchPromotionRecord?.status === 'ready' && missingLaunchArtifacts.length === 0) {
    const launchWarnings = Array.isArray(launchPromotionRecord?.warnings)
      ? launchPromotionRecord.warnings
      : [];
    warnings.push(...launchWarnings);
  }

  return {
    generatedAt,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    environment:
      expectedEnvironment ??
      trimToNull(smokeMetadata.environment) ??
      trimToNull(launchMetadata.environment),
    candidate: {
      repository: candidate.repository ?? null,
      workflow: candidate.workflow ?? null,
      runId: candidate.runId ?? null,
      runUrl: candidate.runUrl ?? null,
      gitRef: candidate.gitRef ?? null,
      commitSha: candidate.commitSha ?? null,
      imageName: candidate.imageName ?? null,
      imageDigest: candidate.imageDigest ?? null,
      imageReference: candidate.imageReference ?? null,
      imageTags: Array.isArray(candidate.imageTags) ? candidate.imageTags : [],
    },
    reviews: {
      deployedSmoke: {
        status: deployedSmokeRecord?.status ?? 'missing',
        workflow: smokeMetadata.workflow ?? null,
        runId: smokeMetadata.runId ?? null,
        runUrl: smokeMetadata.runUrl ?? null,
        candidateRunId: smokeMetadata.candidateRunId ?? null,
        smokePassed: deployedSmokeRecord?.checks?.smokePassed === true,
        seededCanaryPassed: deployedSmokeRecord?.checks?.seededCanaryPassed === true,
      },
      launchCandidate: {
        status: launchPromotionRecord?.status ?? 'missing',
        workflow: launchMetadata.workflow ?? null,
        runId: launchMetadata.runId ?? null,
        runUrl: launchMetadata.runUrl ?? null,
        candidateRunId: launchMetadata.candidateRunId ?? null,
        launchReady: launchPromotionRecord?.launchCandidate?.launchReady === true,
        evidenceComplete: missingLaunchArtifacts.length === 0,
        missingArtifacts: missingLaunchArtifacts,
        marketplaceSeededCanaryPassed:
          (launchPromotionRecord?.launchCandidate?.marketplaceSeededCanaryFailures ?? 0) === 0,
        marketplaceExactCanaryPassed:
          (launchPromotionRecord?.launchCandidate?.marketplaceExactCanaryFailures ?? 0) === 0,
        authorityAuditSource: launchPromotionRecord?.launchCandidate?.authorityAuditSource ?? null,
      },
    },
    blockers: uniqueMessages(blockers),
    warnings: uniqueMessages(warnings),
  };
}

export function buildPromotionReviewMarkdown(review) {
  return `# Promotion Review

- Generated at: ${review.generatedAt}
- Status: ${review.status}
- Environment: ${review.environment ?? 'n/a'}
- Candidate repository: ${review.candidate.repository ?? 'n/a'}
- Candidate run ID: ${review.candidate.runId ?? 'n/a'}
- Candidate run URL: ${review.candidate.runUrl ?? 'n/a'}
- Commit SHA: ${review.candidate.commitSha ?? 'n/a'}
- Image digest: ${review.candidate.imageDigest ?? 'n/a'}
- Image reference: ${review.candidate.imageReference ?? 'n/a'}
- Deployed smoke run ID: ${review.reviews.deployedSmoke.runId ?? 'n/a'}
- Deployed smoke status: ${review.reviews.deployedSmoke.status}
- Launch candidate run ID: ${review.reviews.launchCandidate.runId ?? 'n/a'}
- Launch candidate status: ${review.reviews.launchCandidate.status}
- Launch evidence complete: ${review.reviews.launchCandidate.evidenceComplete ? 'true' : 'false'}
- Launch marketplace seeded canary passed: ${review.reviews.launchCandidate.marketplaceSeededCanaryPassed ? 'true' : 'false'}
- Launch marketplace exact canary passed: ${review.reviews.launchCandidate.marketplaceExactCanaryPassed ? 'true' : 'false'}
- Launch authority audit source: ${review.reviews.launchCandidate.authorityAuditSource ?? 'n/a'}

## Blockers

${review.blockers.length === 0 ? '- none' : review.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Warnings

${review.warnings.length === 0 ? '- none' : review.warnings.map((warning) => `- ${warning}`).join('\n')}
`;
}

export function writeGitHubStepSummary(markdown, env = process.env) {
  const summaryPath = trimToNull(env.GITHUB_STEP_SUMMARY);
  if (!summaryPath) {
    return;
  }

  appendFileSync(summaryPath, `${markdown}${markdown.endsWith('\n') ? '' : '\n'}`, 'utf8');
}

function validateLaunchPromotionReview({
  record,
  evidenceManifest,
  expectedEnvironment,
  expectedRepository,
  expectedCandidateRunId,
  expectedRunId,
}) {
  const issues = [];

  if (!record || typeof record !== 'object') {
    return ['Launch candidate promotion record is missing or invalid JSON.'];
  }

  if (trimToNull(record.status) !== 'ready') {
    issues.push(
      `Launch candidate promotion record status must be ready but was ${record.status ?? '<missing>'}.`,
    );
  }

  const metadata = record.metadata ?? {};
  for (const [field, label] of [
    ['environment', 'environment'],
    ['repository', 'repository'],
    ['workflow', 'workflow'],
    ['runId', 'run id'],
    ['runUrl', 'run URL'],
    ['candidateRunId', 'candidate run id'],
    ['candidateRunUrl', 'candidate run URL'],
    ['commitSha', 'commit SHA'],
    ['gitRef', 'git ref'],
    ['deployedImageSha', 'deployed image SHA'],
  ]) {
    if (!trimToNull(metadata[field])) {
      issues.push(`Launch candidate promotion record is missing ${label}.`);
    }
  }

  if (
    expectedEnvironment &&
    trimToNull(metadata.environment) !== expectedEnvironment
  ) {
    issues.push(
      `Launch candidate promotion record environment ${metadata.environment ?? '<missing>'} does not match expected environment ${expectedEnvironment}.`,
    );
  }
  if (
    expectedRepository &&
    trimToNull(metadata.repository) !== expectedRepository
  ) {
    issues.push(
      `Launch candidate promotion record repository ${metadata.repository ?? '<missing>'} does not match expected repository ${expectedRepository}.`,
    );
  }
  if (
    expectedCandidateRunId &&
    trimToNull(metadata.candidateRunId) !== expectedCandidateRunId
  ) {
    issues.push(
      `Launch candidate promotion record candidate run id ${metadata.candidateRunId ?? '<missing>'} does not match expected candidate run id ${expectedCandidateRunId}.`,
    );
  }
  if (expectedRunId && trimToNull(metadata.runId) !== expectedRunId) {
    issues.push(
      `Launch candidate promotion record run id ${metadata.runId ?? '<missing>'} does not match expected run id ${expectedRunId}.`,
    );
  }

  if (record?.launchCandidate?.launchReady !== true) {
    issues.push('Launch candidate promotion record does not confirm launch readiness passed.');
  }
  if ((record?.launchCandidate?.smokeFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports deployed smoke failures.');
  }
  if ((record?.launchCandidate?.seededCanaryFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports seeded canary failures.');
  }
  if ((record?.launchCandidate?.exactCanaryFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports exact canary failures.');
  }
  if ((record?.launchCandidate?.marketplaceSeededCanaryFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports marketplace seeded canary failures.');
  }
  if ((record?.launchCandidate?.marketplaceExactCanaryFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports marketplace exact canary failures.');
  }
  if ((record?.launchCandidate?.walkthroughCanaryFailures ?? 0) > 0) {
    issues.push('Launch candidate promotion record reports walkthrough canary failures.');
  }
  if (record?.launchCandidate?.authorityEvidenceOk !== true) {
    issues.push('Launch candidate promotion record does not confirm authority evidence passed.');
  }
  if (trimToNull(record?.launchCandidate?.authorityAuditSource) !== 'chain_projection') {
    issues.push(
      `Launch candidate promotion record authority audit source must be chain_projection but was ${record?.launchCandidate?.authorityAuditSource ?? '<missing>'}.`,
    );
  }

  const missingArtifacts = Array.isArray(evidenceManifest?.requiredArtifacts?.missing)
    ? evidenceManifest.requiredArtifacts.missing
    : null;
  if (!Array.isArray(missingArtifacts)) {
    issues.push('Launch candidate evidence manifest is missing requiredArtifacts.missing.');
  } else if (missingArtifacts.length > 0) {
    issues.push(
      `Launch candidate evidence manifest is missing required artifacts: ${missingArtifacts.join(', ')}.`,
    );
  }

  return issues;
}

function compareField({
  blockers,
  warnings,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  severity = 'blocker',
}) {
  const normalizedLeft = trimToNull(leftValue);
  const normalizedRight = trimToNull(rightValue);

  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return;
  }

  const message = `${leftLabel} ${normalizedLeft} does not match ${rightLabel} ${normalizedRight}.`;
  if (severity === 'warning' && warnings) {
    warnings.push(message);
    return;
  }

  blockers.push(message);
}

function trimToNull(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function uniqueMessages(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
