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
  marketplaceSeededCanaryPassed = true,
}) {
  const checks = {
    smokePassed: smokePassed === true,
    seededCanaryPassed: seededCanaryPassed === true,
    marketplaceSeededCanaryPassed: marketplaceSeededCanaryPassed === true,
  };

  return {
    generatedAt,
    status:
      checks.smokePassed && checks.seededCanaryPassed && checks.marketplaceSeededCanaryPassed
        ? 'ready'
        : 'blocked',
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
  if (record?.checks?.marketplaceSeededCanaryPassed !== true) {
    issues.push('Deployed smoke review artifact does not confirm marketplace seeded canary passed.');
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

export function validateLaunchCandidateReviewBundle({
  record,
  evidenceManifest,
  evidencePosture,
  expectedEnvironment,
  expectedRepository,
  expectedCandidateRunId,
  expectedRunId,
}) {
  return validateLaunchPromotionReview({
    record,
    evidenceManifest,
    evidencePosture,
    expectedEnvironment,
    expectedRepository,
    expectedCandidateRunId,
    expectedRunId,
  });
}

export function validatePromotionReviewArtifact(review) {
  const issues = [];

  if (!review || typeof review !== 'object') {
    return ['Promotion review artifact is missing or invalid JSON.'];
  }

  if (!trimToNull(review.generatedAt)) {
    issues.push('Promotion review artifact is missing generatedAt.');
  }
  if (!trimToNull(review.status)) {
    issues.push('Promotion review artifact is missing status.');
  } else if (review.status !== 'ready' && review.status !== 'blocked') {
    issues.push(
      `Promotion review artifact status must be ready or blocked but was ${review.status}.`,
    );
  }
  if (review.status === 'ready' && Array.isArray(review.blockers) && review.blockers.length > 0) {
    issues.push('Promotion review artifact status ready cannot include blockers.');
  }

  for (const [field, label] of [
    ['environment', 'environment'],
  ]) {
    if (!trimToNull(review?.[field])) {
      issues.push(`Promotion review artifact is missing ${label}.`);
    }
  }

  for (const [field, label] of [
    ['repository', 'candidate repository'],
    ['runId', 'candidate run id'],
    ['runUrl', 'candidate run URL'],
    ['commitSha', 'candidate commit SHA'],
    ['imageDigest', 'candidate image digest'],
  ]) {
    if (!trimToNull(review?.candidate?.[field])) {
      issues.push(`Promotion review artifact is missing ${label}.`);
    }
  }
  if (
    trimToNull(review?.candidate?.imageDigest) &&
    !review.candidate.imageDigest.startsWith('sha256:')
  ) {
    issues.push('Promotion review artifact candidate image digest must start with sha256:.');
  }

  for (const [scope, label] of [
    ['deployedSmoke', 'deployed smoke review'],
    ['launchCandidate', 'launch candidate review'],
  ]) {
    const reviewEntry = review?.reviews?.[scope];
    if (!reviewEntry || typeof reviewEntry !== 'object') {
      issues.push(`Promotion review artifact is missing ${label} details.`);
      continue;
    }

    for (const [field, fieldLabel] of [
      ['status', 'status'],
      ['workflow', 'workflow'],
      ['runId', 'run id'],
      ['runUrl', 'run URL'],
      ['candidateRunId', 'candidate run id'],
    ]) {
      if (!trimToNull(reviewEntry[field])) {
        issues.push(`Promotion review artifact is missing ${label} ${fieldLabel}.`);
      }
    }

    issues.push(
      ...validateSelection({
        label: `${label[0].toUpperCase()}${label.slice(1)} selection`,
        selection: {
          source: reviewEntry.selectionSource,
          artifactId: reviewEntry.artifactId,
          artifactName: reviewEntry.artifactName,
          createdAt: reviewEntry.selectedCreatedAt,
        },
      }),
    );
  }

  if (typeof review?.reviews?.launchCandidate?.postureLaunchReady !== 'boolean') {
    issues.push('Promotion review artifact is missing launch candidate posture launch readiness.');
  }
  if (typeof review?.reviews?.launchCandidate?.evidenceComplete !== 'boolean') {
    issues.push('Promotion review artifact is missing launch candidate evidence completeness.');
  }
  if (
    typeof review?.reviews?.launchCandidate?.evidenceComplete === 'boolean' &&
    Number.isInteger(review?.reviews?.launchCandidate?.missingArtifactCount)
  ) {
    const expectedEvidenceComplete = review.reviews.launchCandidate.missingArtifactCount === 0;
    if (review.reviews.launchCandidate.evidenceComplete !== expectedEvidenceComplete) {
      issues.push(
        'Promotion review artifact evidence completeness does not match launch candidate missing artifact count.',
      );
    }
  }
  if (
    typeof review?.reviews?.launchCandidate?.marketplaceSeededCanaryPassed !== 'boolean' ||
    typeof review?.reviews?.launchCandidate?.marketplaceExactCanaryPassed !== 'boolean'
  ) {
    issues.push(
      'Promotion review artifact is missing launch candidate marketplace canary posture.',
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
- Marketplace seeded canary passed: ${record.checks.marketplaceSeededCanaryPassed ? 'true' : 'false'}
`;
}

export function buildPromotionReview({
  generatedAt = new Date().toISOString(),
  imageManifest,
  deployedSmokeRecord,
  launchPromotionRecord,
  launchEvidenceManifest,
  launchEvidencePosture,
  deployedSmokeSelection = {},
  launchCandidateSelection = {},
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
      evidencePosture: launchEvidencePosture,
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
  const launchPosture = launchEvidencePosture ?? null;

  blockers.push(
    ...validateSelection({
      label: 'Deployed smoke review selection',
      selection: deployedSmokeSelection,
    }),
  );
  blockers.push(
    ...validateSelection({
      label: 'Launch candidate review selection',
      selection: launchCandidateSelection,
    }),
  );

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
        selectionSource: trimToNull(deployedSmokeSelection.source),
        artifactId: trimToNull(deployedSmokeSelection.artifactId),
        artifactName: trimToNull(deployedSmokeSelection.artifactName),
        selectedCreatedAt: trimToNull(deployedSmokeSelection.createdAt),
        smokePassed: deployedSmokeRecord?.checks?.smokePassed === true,
        seededCanaryPassed: deployedSmokeRecord?.checks?.seededCanaryPassed === true,
        marketplaceSeededCanaryPassed:
          deployedSmokeRecord?.checks?.marketplaceSeededCanaryPassed === true,
      },
      launchCandidate: {
        status: launchPromotionRecord?.status ?? 'missing',
        workflow: launchMetadata.workflow ?? null,
        runId: launchMetadata.runId ?? null,
        runUrl: launchMetadata.runUrl ?? null,
        candidateRunId: launchMetadata.candidateRunId ?? null,
        selectionSource: trimToNull(launchCandidateSelection.source),
        artifactId: trimToNull(launchCandidateSelection.artifactId),
        artifactName: trimToNull(launchCandidateSelection.artifactName),
        selectedCreatedAt: trimToNull(launchCandidateSelection.createdAt),
        postureStatus: launchPosture?.status ?? null,
        postureLaunchReady: launchPosture?.launchReady === true,
        postureBlockerCount: Array.isArray(launchPosture?.blockers)
          ? launchPosture.blockers.length
          : 0,
        postureWarningCount: Array.isArray(launchPosture?.warnings)
          ? launchPosture.warnings.length
          : 0,
        launchReady: launchPromotionRecord?.launchCandidate?.launchReady === true,
        evidenceComplete: missingLaunchArtifacts.length === 0,
        missingArtifacts: missingLaunchArtifacts,
        requiredArtifactCount: launchPosture?.evidenceContract?.requiredArtifactCount ?? null,
        missingArtifactCount: launchPosture?.evidenceContract?.missingArtifactCount ?? null,
        rollbackImageSha: launchPromotionRecord?.rollback?.rollbackImageSha ?? null,
        rollbackSource: launchPromotionRecord?.rollback?.rollbackSource ?? null,
        rollbackPointerRunId: launchPromotionRecord?.rollback?.rollbackPointerRunId ?? null,
        rollbackPointerArtifactName:
          launchPromotionRecord?.rollback?.rollbackPointerArtifactName ?? null,
        rollbackPointerSelectionSource:
          launchPromotionRecord?.rollback?.rollbackPointerSelectionSource ?? null,
        rollbackPointerArtifactId:
          launchPromotionRecord?.rollback?.rollbackPointerArtifactId ?? null,
        rollbackPointerSelectedCreatedAt:
          launchPromotionRecord?.rollback?.rollbackPointerSelectedCreatedAt ?? null,
        marketplaceSeededCanaryPassed:
          (launchPromotionRecord?.launchCandidate?.marketplaceSeededCanaryFailures ?? 0) === 0,
        marketplaceExactCanaryPassed:
          (launchPromotionRecord?.launchCandidate?.marketplaceExactCanaryFailures ?? 0) === 0,
        authorityAuditSource: launchPromotionRecord?.launchCandidate?.authorityAuditSource ?? null,
        providerFailureCount: launchPosture?.providerValidation?.failureCount ?? null,
        providerWarningCount: launchPosture?.providerValidation?.warningCount ?? null,
        executionTraceCoverage:
          launchPromotionRecord?.launchCandidate?.executionTraceCoverage ?? null,
        marketplaceOrigin: launchPromotionRecord?.launchCandidate?.marketplaceOrigin ?? null,
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
- Deployed smoke selection: ${review.reviews.deployedSmoke.selectionSource ?? 'n/a'} ${review.reviews.deployedSmoke.artifactName ?? 'n/a'}
- Deployed smoke selection artifact ID: ${review.reviews.deployedSmoke.artifactId ?? 'n/a'}
- Deployed smoke selection selected at: ${review.reviews.deployedSmoke.selectedCreatedAt ?? 'n/a'}
- Deployed smoke seeded canary passed: ${review.reviews.deployedSmoke.seededCanaryPassed ? 'true' : 'false'}
- Deployed smoke marketplace seeded canary passed: ${review.reviews.deployedSmoke.marketplaceSeededCanaryPassed ? 'true' : 'false'}
- Launch candidate run ID: ${review.reviews.launchCandidate.runId ?? 'n/a'}
- Launch candidate status: ${review.reviews.launchCandidate.status}
- Launch posture status: ${review.reviews.launchCandidate.postureStatus ?? 'n/a'}
- Launch candidate selection: ${review.reviews.launchCandidate.selectionSource ?? 'n/a'} ${review.reviews.launchCandidate.artifactName ?? 'n/a'}
- Launch candidate selection artifact ID: ${review.reviews.launchCandidate.artifactId ?? 'n/a'}
- Launch candidate selection selected at: ${review.reviews.launchCandidate.selectedCreatedAt ?? 'n/a'}
- Launch posture launch ready: ${review.reviews.launchCandidate.postureLaunchReady ? 'true' : 'false'}
- Launch posture blocker count: ${review.reviews.launchCandidate.postureBlockerCount}
- Launch posture warning count: ${review.reviews.launchCandidate.postureWarningCount}
- Launch evidence complete: ${review.reviews.launchCandidate.evidenceComplete ? 'true' : 'false'}
- Launch required artifact count: ${review.reviews.launchCandidate.requiredArtifactCount ?? 'n/a'}
- Launch missing artifact count: ${review.reviews.launchCandidate.missingArtifactCount ?? 'n/a'}
- Launch rollback image SHA: ${review.reviews.launchCandidate.rollbackImageSha ?? 'n/a'}
- Launch rollback source: ${review.reviews.launchCandidate.rollbackSource ?? 'n/a'}
- Launch rollback pointer run ID: ${review.reviews.launchCandidate.rollbackPointerRunId ?? 'n/a'}
- Launch rollback pointer artifact: ${review.reviews.launchCandidate.rollbackPointerArtifactName ?? 'n/a'}
- Launch rollback pointer selection source: ${review.reviews.launchCandidate.rollbackPointerSelectionSource ?? 'n/a'}
- Launch rollback pointer artifact ID: ${review.reviews.launchCandidate.rollbackPointerArtifactId ?? 'n/a'}
- Launch rollback pointer selected at: ${review.reviews.launchCandidate.rollbackPointerSelectedCreatedAt ?? 'n/a'}
- Launch marketplace seeded canary passed: ${review.reviews.launchCandidate.marketplaceSeededCanaryPassed ? 'true' : 'false'}
- Launch marketplace exact canary passed: ${review.reviews.launchCandidate.marketplaceExactCanaryPassed ? 'true' : 'false'}
- Launch authority audit source: ${review.reviews.launchCandidate.authorityAuditSource ?? 'n/a'}
- Launch provider failure count: ${review.reviews.launchCandidate.providerFailureCount ?? 'n/a'}
- Launch provider warning count: ${review.reviews.launchCandidate.providerWarningCount ?? 'n/a'}
- Launch execution trace coverage: ${
    review.reviews.launchCandidate.executionTraceCoverage
      ? `${review.reviews.launchCandidate.executionTraceCoverage.correlationTaggedExecutions}/${review.reviews.launchCandidate.executionTraceCoverage.executionCount} correlated`
      : 'n/a'
  }
- Launch marketplace origin proof: ${
    review.reviews.launchCandidate.marketplaceOrigin
      ? `${review.reviews.launchCandidate.marketplaceOrigin.ok ? 'confirmed' : 'blocked'}`
      : 'n/a'
  }
- Launch exact marketplace lane proof: ${
    review.reviews.launchCandidate.marketplaceOrigin?.exactLaneProof
      ? `${review.reviews.launchCandidate.marketplaceOrigin.exactLaneProof.ok ? 'confirmed' : 'blocked'} · client switched ${review.reviews.launchCandidate.marketplaceOrigin.exactLaneProof.clientSwitchedViaWorkspaceSwitcher ? 'yes' : 'no'} · freelancer switched ${review.reviews.launchCandidate.marketplaceOrigin.exactLaneProof.freelancerSwitchedViaWorkspaceSwitcher ? 'yes' : 'no'}`
      : 'n/a'
  }

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
  evidencePosture,
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
  if (trimToNull(record?.rollback?.rollbackImageSha) !== trimToNull(metadata.rollbackImageSha)) {
    issues.push('Launch candidate promotion record rollback image SHA does not match launch metadata.');
  }
  if (trimToNull(record?.rollback?.rollbackSource) !== trimToNull(metadata.rollbackSource)) {
    issues.push('Launch candidate promotion record rollback source does not match launch metadata.');
  }
  if (
    trimToNull(record?.rollback?.rollbackPointerRunId) !==
    trimToNull(metadata.rollbackPointerRunId)
  ) {
    issues.push('Launch candidate promotion record rollback pointer run id does not match launch metadata.');
  }
  if (
    trimToNull(record?.rollback?.rollbackPointerArtifactName) !==
    trimToNull(metadata.rollbackPointerArtifactName)
  ) {
    issues.push(
      'Launch candidate promotion record rollback pointer artifact name does not match launch metadata.',
    );
  }
  if (
    trimToNull(record?.rollback?.rollbackPointerSelectionSource) !==
    trimToNull(metadata.rollbackPointerSelectionSource)
  ) {
    issues.push(
      'Launch candidate promotion record rollback pointer selection source does not match launch metadata.',
    );
  }
  if (
    trimToNull(record?.rollback?.rollbackPointerArtifactId) !==
    trimToNull(metadata.rollbackPointerArtifactId)
  ) {
    issues.push(
      'Launch candidate promotion record rollback pointer artifact id does not match launch metadata.',
    );
  }
  if (
    trimToNull(record?.rollback?.rollbackPointerSelectedCreatedAt) !==
    trimToNull(metadata.rollbackPointerSelectedCreatedAt)
  ) {
    issues.push(
      'Launch candidate promotion record rollback pointer selected timestamp does not match launch metadata.',
    );
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
  const executionTraceCoverage = record?.launchCandidate?.executionTraceCoverage ?? null;
  if (!executionTraceCoverage) {
    issues.push('Launch candidate promotion record is missing execution trace coverage.');
  } else {
    if ((executionTraceCoverage.executionCount ?? 0) <= 0) {
      issues.push('Launch candidate promotion record reports zero execution traces.');
    }
    if (
      (executionTraceCoverage.correlationTaggedExecutions ?? 0) !==
      (executionTraceCoverage.executionCount ?? 0)
    ) {
      issues.push(
        'Launch candidate promotion record reports executions without correlation ids.',
      );
    }
    if (
      (executionTraceCoverage.requestTaggedExecutions ?? 0) !==
      (executionTraceCoverage.executionCount ?? 0)
    ) {
      issues.push('Launch candidate promotion record reports executions without request ids.');
    }
    if (
      (executionTraceCoverage.operationTaggedExecutions ?? 0) !==
      (executionTraceCoverage.executionCount ?? 0)
    ) {
      issues.push(
        'Launch candidate promotion record reports executions without operation keys.',
      );
    }
    if ((executionTraceCoverage.confirmedWithoutCorrelation ?? 0) > 0) {
      issues.push(
        'Launch candidate promotion record reports confirmed executions without correlation ids.',
      );
    }
    if (Array.isArray(executionTraceCoverage.missingTxHashes) && executionTraceCoverage.missingTxHashes.length > 0) {
      issues.push(
        `Launch candidate promotion record is missing traced tx hashes: ${executionTraceCoverage.missingTxHashes.join(', ')}.`,
      );
    }
  }
  const marketplaceOrigin = record?.launchCandidate?.marketplaceOrigin ?? null;
  if (!marketplaceOrigin) {
    issues.push('Launch candidate promotion record is missing marketplace origin evidence.');
  } else {
    if (marketplaceOrigin.ok !== true) {
      issues.push('Launch candidate promotion record does not confirm marketplace origin evidence.');
    }
    if (Array.isArray(marketplaceOrigin.missingModes) && marketplaceOrigin.missingModes.length > 0) {
      issues.push(
        `Launch candidate promotion record is missing marketplace evidence modes: ${marketplaceOrigin.missingModes.join(', ')}.`,
      );
    }
    if (Array.isArray(marketplaceOrigin.failedModes) && marketplaceOrigin.failedModes.length > 0) {
      issues.push(
        `Launch candidate promotion record reports failed marketplace evidence modes: ${marketplaceOrigin.failedModes.join(', ')}.`,
      );
    }
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

  if (!evidencePosture || typeof evidencePosture !== 'object') {
    issues.push('Launch candidate evidence posture is missing or invalid JSON.');
    return issues;
  }

  compareField({
    blockers: issues,
    leftLabel: 'Launch evidence posture status',
    leftValue: evidencePosture.status,
    rightLabel: 'launch candidate promotion status',
    rightValue: record?.status,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture readiness',
    leftValue: evidencePosture.launchReady,
    rightLabel: 'launch candidate promotion readiness',
    rightValue: record?.launchCandidate?.launchReady,
  });
  compareField({
    blockers: issues,
    leftLabel: 'Launch evidence posture authority audit source',
    leftValue: evidencePosture?.authority?.auditSource,
    rightLabel: 'launch candidate promotion authority audit source',
    rightValue: record?.launchCandidate?.authorityAuditSource,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture completeness',
    leftValue: evidencePosture?.evidenceContract?.complete,
    rightLabel: 'launch candidate evidence completeness',
    rightValue: Array.isArray(missingArtifacts) ? missingArtifacts.length === 0 : null,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture required artifact count',
    leftValue: evidencePosture?.evidenceContract?.requiredArtifactCount,
    rightLabel: 'launch candidate evidence manifest required artifact count',
    rightValue: evidenceManifest?.requiredArtifacts?.total,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture missing artifact count',
    leftValue: evidencePosture?.evidenceContract?.missingArtifactCount,
    rightLabel: 'launch candidate evidence manifest missing artifact count',
    rightValue: Array.isArray(missingArtifacts) ? missingArtifacts.length : null,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture provider failure count',
    leftValue: evidencePosture?.providerValidation?.failureCount,
    rightLabel: 'launch candidate promotion provider failure count',
    rightValue: Array.isArray(record?.launchCandidate?.providerValidation?.failedProviders)
      ? record.launchCandidate.providerValidation.failedProviders.length
      : null,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture provider warning count',
    leftValue: evidencePosture?.providerValidation?.warningCount,
    rightLabel: 'launch candidate promotion provider warning count',
    rightValue: Array.isArray(record?.launchCandidate?.providerValidation?.warningProviders)
      ? record.launchCandidate.providerValidation.warningProviders.length
      : null,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture marketplace origin proof',
    leftValue: evidencePosture?.marketplaceOrigin?.ok,
    rightLabel: 'launch candidate promotion marketplace origin proof',
    rightValue: record?.launchCandidate?.marketplaceOrigin?.ok,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture exact marketplace lane proof',
    leftValue: evidencePosture?.marketplaceOrigin?.exactLaneProof?.ok,
    rightLabel: 'launch candidate promotion exact marketplace lane proof',
    rightValue: record?.launchCandidate?.marketplaceOrigin?.exactLaneProof?.ok,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture exact marketplace client lane switch',
    leftValue:
      evidencePosture?.marketplaceOrigin?.exactLaneProof?.clientSwitchedViaWorkspaceSwitcher,
    rightLabel: 'launch candidate promotion exact marketplace client lane switch',
    rightValue:
      record?.launchCandidate?.marketplaceOrigin?.exactLaneProof
        ?.clientSwitchedViaWorkspaceSwitcher,
  });
  compareBooleanField({
    blockers: issues,
    leftLabel: 'Launch evidence posture exact marketplace freelancer lane switch',
    leftValue:
      evidencePosture?.marketplaceOrigin?.exactLaneProof?.freelancerSwitchedViaWorkspaceSwitcher,
    rightLabel: 'launch candidate promotion exact marketplace freelancer lane switch',
    rightValue:
      record?.launchCandidate?.marketplaceOrigin?.exactLaneProof
        ?.freelancerSwitchedViaWorkspaceSwitcher,
  });
  compareStringListField({
    blockers: issues,
    leftLabel: 'Launch evidence posture confirmed marketplace origin modes',
    leftValue: evidencePosture?.marketplaceOrigin?.confirmedModes,
    rightLabel: 'launch candidate promotion confirmed marketplace origin modes',
    rightValue: record?.launchCandidate?.marketplaceOrigin?.confirmedModes,
  });
  compareStringListField({
    blockers: issues,
    leftLabel: 'Launch evidence posture missing marketplace origin modes',
    leftValue: evidencePosture?.marketplaceOrigin?.missingModes,
    rightLabel: 'launch candidate promotion missing marketplace origin modes',
    rightValue: record?.launchCandidate?.marketplaceOrigin?.missingModes,
  });
  compareStringListField({
    blockers: issues,
    leftLabel: 'Launch evidence posture failed marketplace origin modes',
    leftValue: evidencePosture?.marketplaceOrigin?.failedModes,
    rightLabel: 'launch candidate promotion failed marketplace origin modes',
    rightValue: record?.launchCandidate?.marketplaceOrigin?.failedModes,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture execution trace count',
    leftValue: evidencePosture?.executionTraceCoverage?.executionCount,
    rightLabel: 'launch candidate promotion execution trace count',
    rightValue: record?.launchCandidate?.executionTraceCoverage?.executionCount,
  });
  compareNumberField({
    blockers: issues,
    leftLabel: 'Launch evidence posture correlation-tagged execution count',
    leftValue: evidencePosture?.executionTraceCoverage?.correlationTaggedExecutions,
    rightLabel: 'launch candidate promotion correlation-tagged execution count',
    rightValue: record?.launchCandidate?.executionTraceCoverage?.correlationTaggedExecutions,
  });

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

function compareBooleanField({
  blockers,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}) {
  if (typeof leftValue !== 'boolean' || typeof rightValue !== 'boolean' || leftValue === rightValue) {
    return;
  }

  blockers.push(`${leftLabel} ${leftValue} does not match ${rightLabel} ${rightValue}.`);
}

function compareNumberField({
  blockers,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}) {
  if (typeof leftValue !== 'number' || typeof rightValue !== 'number' || leftValue === rightValue) {
    return;
  }

  blockers.push(`${leftLabel} ${leftValue} does not match ${rightLabel} ${rightValue}.`);
}

function compareStringListField({
  blockers,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}) {
  const normalizedLeft = normalizeStringList(leftValue);
  const normalizedRight = normalizeStringList(rightValue);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return;
  }

  blockers.push(`${leftLabel} ${normalizedLeft} does not match ${rightLabel} ${normalizedRight}.`);
}

function validateSelection({ label, selection }) {
  const issues = [];
  const source = trimToNull(selection?.source);

  if (source) {
    if (!trimToNull(selection?.artifactName)) {
      issues.push(`${label} is missing artifact name when selection source is present.`);
    }
  }

  if (source === 'artifact-search') {
    if (!trimToNull(selection?.artifactId)) {
      issues.push(`${label} is missing artifact id for artifact-search selection.`);
    }
    if (!trimToNull(selection?.createdAt)) {
      issues.push(`${label} is missing selected timestamp for artifact-search selection.`);
    }
  }

  return issues;
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

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  return JSON.stringify(value.map((entry) => trimToNull(entry)).filter(Boolean).sort());
}
