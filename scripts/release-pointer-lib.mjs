import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function buildReleasePointerArtifactName(environment) {
  return `release-pointer-${normalizeRequiredSegment(environment, 'environment')}`;
}

export const releasePointerOutputRequiredFiles = ['release-pointer.json', 'release-pointer.md'];

export function buildReleasePointer({
  generatedAt = new Date().toISOString(),
  releaseDossier,
}) {
  if (releaseDossier?.decision?.status !== 'ready') {
    throw new Error('Release dossier must be ready before a release pointer can be generated.');
  }

  const environment = normalizeRequiredSegment(
    releaseDossier?.metadata?.environment,
    'releaseDossier.metadata.environment',
  );
  const repository = normalizeRequiredString(
    releaseDossier?.metadata?.repository,
    'releaseDossier.metadata.repository',
  );
  const releaseReviewRunId = normalizeRequiredString(
    releaseDossier?.metadata?.runId,
    'releaseDossier.metadata.runId',
  );
  const releaseReviewRunUrl = normalizeRequiredString(
    releaseDossier?.metadata?.runUrl,
    'releaseDossier.metadata.runUrl',
  );
  const candidateRunId = normalizeRequiredString(
    releaseDossier?.candidate?.runId,
    'releaseDossier.candidate.runId',
  );
  const candidateRunUrl = normalizeRequiredString(
    releaseDossier?.candidate?.runUrl,
    'releaseDossier.candidate.runUrl',
  );
  const commitSha = normalizeRequiredString(
    releaseDossier?.candidate?.commitSha,
    'releaseDossier.candidate.commitSha',
  );
  const imageDigest = normalizeRequiredString(
    releaseDossier?.candidate?.imageDigest,
    'releaseDossier.candidate.imageDigest',
  );
  const launchPosture = releaseDossier?.launchEvidence?.posture ?? null;
  const launchProviderValidation = launchPosture?.providerValidation ?? null;
  const launchEvidenceContract = launchPosture?.evidenceContract ?? null;
  const launchMarketplaceOrigin = launchPosture?.marketplaceOrigin ?? null;
  const launchExactLaneProof = launchMarketplaceOrigin?.exactLaneProof ?? null;
  const launchExecutionTraceCoverage = launchPosture?.executionTraceCoverage ?? null;
  const launchCanaries = launchPosture?.canaries ?? null;
  const rollback = launchPosture?.rollback ?? null;

  return {
    generatedAt,
    environment,
    repository,
    artifactName: buildReleasePointerArtifactName(environment),
    releaseReviewRunId,
    releaseReviewRunUrl,
    candidateRunId,
    candidateRunUrl,
    commitSha,
    imageDigest,
    imageReference: normalizeOptionalString(releaseDossier?.candidate?.imageReference),
    imageName: normalizeOptionalString(releaseDossier?.candidate?.imageName),
    launchStatus: normalizeOptionalString(launchPosture?.status),
    launchReady: normalizeOptionalBoolean(launchPosture?.launchReady),
    launchBlockerCount: Array.isArray(launchPosture?.blockers) ? launchPosture.blockers.length : null,
    launchWarningCount: Array.isArray(launchPosture?.warnings) ? launchPosture.warnings.length : null,
    rollbackImageSha: normalizeOptionalString(
      rollback?.rollbackImageSha ?? releaseDossier?.launchEvidence?.rollbackImageSha,
    ),
    rollbackSource: normalizeOptionalString(
      rollback?.rollbackSource ?? releaseDossier?.launchEvidence?.rollbackSource,
    ),
    rollbackPointerRunId: normalizeOptionalString(
      rollback?.rollbackPointerRunId ?? releaseDossier?.launchEvidence?.rollbackPointerRunId,
    ),
    rollbackPointerArtifactName: normalizeOptionalString(
      rollback?.rollbackPointerArtifactName ?? releaseDossier?.launchEvidence?.rollbackPointerArtifactName,
    ),
    rollbackPointerSelectionSource: normalizeOptionalString(
      rollback?.rollbackPointerSelectionSource ?? releaseDossier?.launchEvidence?.rollbackPointerSelectionSource,
    ),
    rollbackPointerArtifactId: normalizeOptionalString(
      rollback?.rollbackPointerArtifactId ?? releaseDossier?.launchEvidence?.rollbackPointerArtifactId,
    ),
    rollbackPointerSelectedCreatedAt: normalizeOptionalString(
      rollback?.rollbackPointerSelectedCreatedAt ?? releaseDossier?.launchEvidence?.rollbackPointerSelectedCreatedAt,
    ),
    deployedSmokePassed: normalizeOptionalBoolean(releaseDossier?.workflows?.deployedSmoke?.smokePassed),
    deployedSmokeSeededCanaryPassed: normalizeOptionalBoolean(
      releaseDossier?.workflows?.deployedSmoke?.seededCanaryPassed,
    ),
    deployedSmokeMarketplaceSeededCanaryPassed: normalizeOptionalBoolean(
      releaseDossier?.workflows?.deployedSmoke?.marketplaceSeededCanaryPassed,
    ),
    deployedSmokeSelectionSource: normalizeOptionalString(
      releaseDossier?.workflows?.deployedSmoke?.selectionSource,
    ),
    deployedSmokeArtifactId: normalizeOptionalString(releaseDossier?.workflows?.deployedSmoke?.artifactId),
    deployedSmokeArtifactName: normalizeOptionalString(releaseDossier?.workflows?.deployedSmoke?.artifactName),
    deployedSmokeSelectedCreatedAt: normalizeOptionalString(
      releaseDossier?.workflows?.deployedSmoke?.selectedCreatedAt,
    ),
    launchCandidateSelectionSource: normalizeOptionalString(
      releaseDossier?.workflows?.launchCandidate?.selectionSource,
    ),
    launchCandidateArtifactId: normalizeOptionalString(releaseDossier?.workflows?.launchCandidate?.artifactId),
    launchCandidateArtifactName: normalizeOptionalString(
      releaseDossier?.workflows?.launchCandidate?.artifactName,
    ),
    launchCandidateSelectedCreatedAt: normalizeOptionalString(
      releaseDossier?.workflows?.launchCandidate?.selectedCreatedAt,
    ),
    launchMarketplaceSeededCanaryFailures: normalizeOptionalNumber(
      launchCanaries?.marketplaceSeededCanaryFailures ??
        releaseDossier?.launchEvidence?.marketplaceSeededCanaryFailures,
    ),
    launchMarketplaceExactCanaryFailures: normalizeOptionalNumber(
      launchCanaries?.marketplaceExactCanaryFailures ??
        releaseDossier?.launchEvidence?.marketplaceExactCanaryFailures,
    ),
    authorityAuditSource: normalizeOptionalString(
      launchPosture?.authority?.auditSource ?? releaseDossier?.launchEvidence?.authorityAuditSource,
    ),
    launchRequiredArtifactCount: normalizeOptionalNumber(
      launchEvidenceContract?.requiredArtifactCount ??
        releaseDossier?.launchEvidence?.requiredArtifactCount,
    ),
    launchMissingArtifactCount: normalizeOptionalNumber(
      launchEvidenceContract?.missingArtifactCount ??
        (Array.isArray(releaseDossier?.launchEvidence?.missingArtifacts)
          ? releaseDossier.launchEvidence.missingArtifacts.length
          : null),
    ),
    launchEvidenceComplete:
      typeof launchEvidenceContract?.complete === 'boolean'
        ? launchEvidenceContract.complete
        : Array.isArray(releaseDossier?.launchEvidence?.missingArtifacts)
          ? releaseDossier.launchEvidence.missingArtifacts.length === 0
          : null,
    launchProviderFailureCount: normalizeOptionalNumber(
      launchProviderValidation?.failureCount ??
        (Array.isArray(
          releaseDossier?.promotionReview?.reviews?.launchCandidate?.providerValidationFailures,
        )
          ? releaseDossier.promotionReview.reviews.launchCandidate.providerValidationFailures.length
          : null),
    ),
    launchProviderWarningCount: normalizeOptionalNumber(
      launchProviderValidation?.warningCount ??
        (Array.isArray(
          releaseDossier?.promotionReview?.reviews?.launchCandidate?.providerValidationWarnings,
        )
          ? releaseDossier.promotionReview.reviews.launchCandidate.providerValidationWarnings.length
          : null),
    ),
    launchExecutionTraceExecutionCount: normalizeOptionalNumber(
      launchExecutionTraceCoverage?.executionCount ??
        releaseDossier?.launchEvidence?.executionTraceCoverage?.executionCount,
    ),
    launchExecutionTraceCorrelationTaggedExecutions: normalizeOptionalNumber(
      launchExecutionTraceCoverage?.correlationTaggedExecutions ??
        releaseDossier?.launchEvidence?.executionTraceCoverage?.correlationTaggedExecutions,
    ),
    launchExecutionTraceRequestTaggedExecutions: normalizeOptionalNumber(
      launchExecutionTraceCoverage?.requestTaggedExecutions ??
        releaseDossier?.launchEvidence?.executionTraceCoverage?.requestTaggedExecutions,
    ),
    launchExecutionTraceOperationTaggedExecutions: normalizeOptionalNumber(
      launchExecutionTraceCoverage?.operationTaggedExecutions ??
        releaseDossier?.launchEvidence?.executionTraceCoverage?.operationTaggedExecutions,
    ),
    launchMarketplaceOriginOk:
      typeof launchMarketplaceOrigin?.ok === 'boolean'
        ? launchMarketplaceOrigin.ok
        : releaseDossier?.launchEvidence?.marketplaceOrigin?.ok === true,
    launchMarketplaceOriginConfirmedModes: normalizeOptionalStringArray(
      launchMarketplaceOrigin?.confirmedModes ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.confirmedModes,
    ),
    launchMarketplaceOriginMissingModes: normalizeOptionalStringArray(
      launchMarketplaceOrigin?.missingModes ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.missingModes,
    ),
    launchMarketplaceOriginFailedModes: normalizeOptionalStringArray(
      launchMarketplaceOrigin?.failedModes ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.failedModes,
    ),
    launchMarketplaceExactLaneProofOk: normalizeOptionalBoolean(
      launchExactLaneProof?.ok ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.exactLaneProof?.ok,
    ),
    launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher: normalizeOptionalBoolean(
      launchExactLaneProof?.clientSwitchedViaWorkspaceSwitcher ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.exactLaneProof
          ?.clientSwitchedViaWorkspaceSwitcher,
    ),
    launchMarketplaceExactFreelancerLaneSwitchedViaWorkspaceSwitcher: normalizeOptionalBoolean(
      launchExactLaneProof?.freelancerSwitchedViaWorkspaceSwitcher ??
        releaseDossier?.launchEvidence?.marketplaceOrigin?.exactLaneProof
          ?.freelancerSwitchedViaWorkspaceSwitcher,
    ),
  };
}

export function validateReleasePointer(
  pointer,
  { expectedEnvironment = null, requireReadyLaunchPosture = false } = {},
) {
  const issues = [];

  for (const [field, label] of [
    ['generatedAt', 'generatedAt'],
    ['environment', 'environment'],
    ['repository', 'repository'],
    ['artifactName', 'artifact name'],
    ['releaseReviewRunId', 'release review run id'],
    ['releaseReviewRunUrl', 'release review run URL'],
    ['candidateRunId', 'candidate run id'],
    ['candidateRunUrl', 'candidate run URL'],
    ['commitSha', 'commit SHA'],
    ['imageDigest', 'image digest'],
  ]) {
    if (!normalizeOptionalString(pointer?.[field])) {
      issues.push(`Release pointer is missing ${label}.`);
    }
  }

  if (
    normalizeOptionalString(pointer?.imageDigest) &&
    !pointer.imageDigest.startsWith('sha256:')
  ) {
    issues.push('Release pointer image digest must start with sha256:.');
  }

  const environment = normalizeOptionalString(pointer?.environment);
  const artifactName = normalizeOptionalString(pointer?.artifactName);
  if (environment && artifactName) {
    const expectedArtifactName = buildReleasePointerArtifactName(environment);
    if (artifactName !== expectedArtifactName) {
      issues.push(
        `Release pointer artifact name ${artifactName} does not match expected artifact name ${expectedArtifactName}.`,
      );
    }
  }

  const repository = normalizeOptionalString(pointer?.repository);
  if (repository && !/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    issues.push('Release pointer repository must be formatted as owner/repo.');
  }

  const imageReference = normalizeOptionalString(pointer?.imageReference);
  if (
    imageReference &&
    normalizeOptionalString(pointer?.imageDigest) &&
    !imageReference.includes(pointer.imageDigest)
  ) {
    issues.push('Release pointer image reference must include the image digest when present.');
  }

  if (
    expectedEnvironment &&
    normalizeOptionalString(pointer?.environment) !== normalizeRequiredSegment(expectedEnvironment, 'expectedEnvironment')
  ) {
    issues.push(
      `Release pointer environment ${pointer?.environment ?? '<missing>'} does not match expected environment ${normalizeRequiredSegment(expectedEnvironment, 'expectedEnvironment')}.`,
    );
  }

  if (pointer?.rollbackSource) {
    if (pointer.rollbackSource !== 'input' && pointer.rollbackSource !== 'release-pointer') {
      issues.push(
        `Release pointer rollback source must be input or release-pointer but was ${pointer.rollbackSource}.`,
      );
    }
    if (!normalizeOptionalString(pointer?.rollbackImageSha)) {
      issues.push('Release pointer rollback image SHA is required when rollback source is present.');
    }
    if (pointer.rollbackSource === 'release-pointer') {
      if (!normalizeOptionalString(pointer?.rollbackPointerRunId)) {
        issues.push('Release pointer rollback pointer run id is required when rollback source is release-pointer.');
      }
      if (!normalizeOptionalString(pointer?.rollbackPointerArtifactName)) {
        issues.push(
          'Release pointer rollback pointer artifact name is required when rollback source is release-pointer.',
        );
      }
      if (!normalizeOptionalString(pointer?.rollbackPointerSelectionSource)) {
        issues.push(
          'Release pointer rollback pointer selection source is required when rollback source is release-pointer.',
        );
      }
    }
  }
  if (
    pointer?.rollbackPointerSelectionSource &&
    pointer.rollbackPointerSelectionSource !== 'input' &&
    pointer.rollbackPointerSelectionSource !== 'artifact-search'
  ) {
    issues.push(
      'Release pointer rollback pointer selection source must be input or artifact-search when present.',
    );
  }
  if (pointer?.rollbackPointerSelectionSource === 'artifact-search') {
    if (!normalizeOptionalString(pointer?.rollbackPointerArtifactId)) {
      issues.push(
        'Release pointer rollback pointer artifact id is required for artifact-search selection.',
      );
    }
    if (!normalizeOptionalString(pointer?.rollbackPointerSelectedCreatedAt)) {
      issues.push(
        'Release pointer rollback pointer selected timestamp is required for artifact-search selection.',
      );
    }
  }

  for (const [field, label] of [
    ['deployedSmokePassed', 'deployed smoke passed'],
    ['deployedSmokeSeededCanaryPassed', 'deployed smoke seeded canary passed'],
    ['deployedSmokeMarketplaceSeededCanaryPassed', 'deployed smoke marketplace seeded canary passed'],
    ['launchReady', 'launch ready'],
  ]) {
    if (pointer?.[field] !== undefined && pointer?.[field] !== null && typeof pointer[field] !== 'boolean') {
      issues.push(`Release pointer ${label} must be boolean when present.`);
    }
  }

  for (const [field, label] of [
    ['launchMarketplaceSeededCanaryFailures', 'launch marketplace seeded canary failures'],
    ['launchMarketplaceExactCanaryFailures', 'launch marketplace exact canary failures'],
    ['launchRequiredArtifactCount', 'launch required artifact count'],
    ['launchMissingArtifactCount', 'launch missing artifact count'],
    ['launchProviderFailureCount', 'launch provider failure count'],
    ['launchProviderWarningCount', 'launch provider warning count'],
    ['launchBlockerCount', 'launch blocker count'],
    ['launchWarningCount', 'launch warning count'],
    ['launchExecutionTraceExecutionCount', 'launch execution trace execution count'],
    [
      'launchExecutionTraceCorrelationTaggedExecutions',
      'launch execution trace correlation-tagged executions',
    ],
    [
      'launchExecutionTraceRequestTaggedExecutions',
      'launch execution trace request-tagged executions',
    ],
    [
      'launchExecutionTraceOperationTaggedExecutions',
      'launch execution trace operation-tagged executions',
    ],
  ]) {
    if (pointer?.[field] !== undefined && pointer?.[field] !== null) {
      if (!Number.isInteger(pointer[field]) || pointer[field] < 0) {
        issues.push(`Release pointer ${label} must be a non-negative integer when present.`);
      }
    }
  }

  for (const [field, label] of [
    ['deployedSmokeSelectionSource', 'deployed smoke selection source'],
    ['launchCandidateSelectionSource', 'launch candidate selection source'],
  ]) {
    if (pointer?.[field] && pointer[field] !== 'input' && pointer[field] !== 'artifact-search') {
      issues.push(`Release pointer ${label} must be input or artifact-search when present.`);
    }
  }
  if (pointer?.deployedSmokeSelectionSource === 'artifact-search') {
    if (!normalizeOptionalString(pointer?.deployedSmokeArtifactId)) {
      issues.push(
        'Release pointer deployed smoke artifact id is required for artifact-search selection.',
      );
    }
    if (!normalizeOptionalString(pointer?.deployedSmokeSelectedCreatedAt)) {
      issues.push(
        'Release pointer deployed smoke selected timestamp is required for artifact-search selection.',
      );
    }
  }
  if (
    pointer?.deployedSmokeSelectionSource &&
    !normalizeOptionalString(pointer?.deployedSmokeArtifactName)
  ) {
    issues.push(
      'Release pointer deployed smoke artifact name is required when selection source is present.',
    );
  }
  if (pointer?.launchCandidateSelectionSource === 'artifact-search') {
    if (!normalizeOptionalString(pointer?.launchCandidateArtifactId)) {
      issues.push(
        'Release pointer launch candidate artifact id is required for artifact-search selection.',
      );
    }
    if (!normalizeOptionalString(pointer?.launchCandidateSelectedCreatedAt)) {
      issues.push(
        'Release pointer launch candidate selected timestamp is required for artifact-search selection.',
      );
    }
  }
  if (
    pointer?.launchCandidateSelectionSource &&
    !normalizeOptionalString(pointer?.launchCandidateArtifactName)
  ) {
    issues.push(
      'Release pointer launch candidate artifact name is required when selection source is present.',
    );
  }

  if (
    pointer?.launchStatus !== undefined &&
    pointer?.launchStatus !== null &&
    pointer.launchStatus !== 'ready' &&
    pointer.launchStatus !== 'blocked'
  ) {
    issues.push(
      `Release pointer launch status must be ready or blocked when present, but was ${pointer.launchStatus}.`,
    );
  }

  for (const [field, label] of [
    ['launchEvidenceComplete', 'launch evidence complete'],
    ['launchMarketplaceOriginOk', 'launch marketplace origin ok'],
    ['launchMarketplaceExactLaneProofOk', 'launch marketplace exact lane proof ok'],
    [
      'launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher',
      'launch marketplace exact client lane workspace switch',
    ],
    [
      'launchMarketplaceExactFreelancerLaneSwitchedViaWorkspaceSwitcher',
      'launch marketplace exact freelancer lane workspace switch',
    ],
  ]) {
    if (pointer?.[field] !== undefined && pointer?.[field] !== null && typeof pointer[field] !== 'boolean') {
      issues.push(`Release pointer ${label} must be boolean when present.`);
    }
  }

  for (const [field, label] of [
    ['launchMarketplaceOriginConfirmedModes', 'launch marketplace origin confirmed modes'],
    ['launchMarketplaceOriginMissingModes', 'launch marketplace origin missing modes'],
    ['launchMarketplaceOriginFailedModes', 'launch marketplace origin failed modes'],
  ]) {
    if (pointer?.[field] !== undefined && pointer?.[field] !== null) {
      if (!Array.isArray(pointer[field]) || pointer[field].some((value) => !normalizeOptionalString(value))) {
        issues.push(`Release pointer ${label} must be an array of non-empty strings when present.`);
      }
    }
  }

  if (requireReadyLaunchPosture) {
    if (normalizeOptionalString(pointer?.launchStatus) !== 'ready') {
      issues.push(
        `Release pointer launch status must be ready but was ${pointer?.launchStatus ?? '<missing>'}.`,
      );
    }
    if (pointer?.launchReady !== true) {
      issues.push('Release pointer does not confirm launch ready posture.');
    }
    if ((pointer?.launchBlockerCount ?? 0) > 0) {
      issues.push('Release pointer reports launch blockers.');
    }
    if (pointer?.deployedSmokePassed !== true) {
      issues.push('Release pointer does not confirm deployed smoke passed.');
    }
    if (pointer?.deployedSmokeSeededCanaryPassed !== true) {
      issues.push('Release pointer does not confirm deployed smoke seeded canary passed.');
    }
    if (pointer?.deployedSmokeMarketplaceSeededCanaryPassed !== true) {
      issues.push('Release pointer does not confirm deployed smoke marketplace seeded canary passed.');
    }
    if ((pointer?.launchMarketplaceSeededCanaryFailures ?? 0) > 0) {
      issues.push('Release pointer reports launch marketplace seeded canary failures.');
    }
    if ((pointer?.launchMarketplaceExactCanaryFailures ?? 0) > 0) {
      issues.push('Release pointer reports launch marketplace exact canary failures.');
    }
    if (normalizeOptionalString(pointer?.authorityAuditSource) !== 'chain_projection') {
      issues.push(
        `Release pointer authority audit source must be chain_projection but was ${pointer?.authorityAuditSource ?? '<missing>'}.`,
      );
    }
    if (pointer?.launchEvidenceComplete !== true) {
      issues.push('Release pointer does not confirm launch evidence completeness.');
    }
    if ((pointer?.launchMissingArtifactCount ?? 0) > 0) {
      issues.push('Release pointer reports missing launch evidence artifacts.');
    }
    if (pointer?.launchMarketplaceOriginOk !== true) {
      issues.push('Release pointer does not confirm marketplace origin proof.');
    }
    if (pointer?.launchMarketplaceExactLaneProofOk !== true) {
      issues.push('Release pointer does not confirm exact marketplace lane proof.');
    }
    if (!hasRequiredModes(pointer?.launchMarketplaceOriginConfirmedModes, ['seeded', 'exact'])) {
      issues.push('Release pointer does not confirm both seeded and exact marketplace origin modes.');
    }
    if ((pointer?.launchMarketplaceOriginMissingModes ?? []).length > 0) {
      issues.push('Release pointer reports missing marketplace origin modes.');
    }
    if ((pointer?.launchMarketplaceOriginFailedModes ?? []).length > 0) {
      issues.push('Release pointer reports failed marketplace origin modes.');
    }
    if (!normalizeOptionalString(pointer?.rollbackSource)) {
      issues.push('Release pointer does not record rollback source.');
    }
  }

  return issues;
}

export function validateReleasePointerOutputDirectory({ outputDir }) {
  const resolvedOutputDir = resolve(outputDir);
  const issues = [];

  for (const relativePath of releasePointerOutputRequiredFiles) {
    const filePath = resolve(resolvedOutputDir, relativePath);
    if (!existsSync(filePath)) {
      issues.push(`Release pointer output is missing required file ${relativePath}.`);
    }
  }

  if (issues.length > 0) {
    return issues;
  }

  const pointer = readJsonOutputFile(resolvedOutputDir, 'release-pointer.json', issues);
  if (!pointer) {
    return issues;
  }

  issues.push(
    ...validateReleasePointer(pointer, {
      expectedEnvironment: normalizeOptionalString(pointer?.environment),
      requireReadyLaunchPosture: true,
    }),
  );

  return issues;
}

export function selectLatestReleasePointerArtifact({ artifacts, environment }) {
  const artifactName = buildReleasePointerArtifactName(environment);
  const matches = (artifacts ?? [])
    .filter(
      (artifact) =>
        artifact?.name === artifactName &&
        artifact?.expired !== true &&
        artifact?.workflow_run?.id !== undefined &&
        artifact?.workflow_run?.id !== null,
    )
    .sort(compareArtifactsNewestFirst);

  if (matches.length === 0) {
    throw new Error(
      `Could not find a non-expired release pointer artifact named ${artifactName}.`,
    );
  }

  const selected = matches[0];
  return {
    artifactId: selected.id ?? null,
    artifactName,
    runId: String(selected.workflow_run.id),
    source: 'artifact-search',
    createdAt: selected.created_at ?? null,
  };
}

function compareArtifactsNewestFirst(left, right) {
  const leftTime = Date.parse(left?.created_at ?? '') || 0;
  const rightTime = Date.parse(right?.created_at ?? '') || 0;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return Number(right?.id ?? 0) - Number(left?.id ?? 0);
}

function readJsonOutputFile(rootDir, relativePath, issues) {
  const filePath = resolve(rootDir, relativePath);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    issues.push(
      `Release pointer output ${relativePath} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    );
    return null;
  }
}

function normalizeRequiredSegment(value, field) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${field} is required.`);
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function normalizeRequiredString(value, field) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeOptionalBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeOptionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeOptionalStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeOptionalString(entry)).filter(Boolean);
}

function hasRequiredModes(values, requiredModes) {
  if (!Array.isArray(values)) {
    return false;
  }

  const normalized = new Set(values.map((value) => normalizeOptionalString(value)).filter(Boolean));
  return requiredModes.every((mode) => normalized.has(mode));
}
