export function buildReleasePointerArtifactName(environment) {
  return `release-pointer-${normalizeRequiredSegment(environment, 'environment')}`;
}

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
    rollbackImageSha: normalizeOptionalString(releaseDossier?.launchEvidence?.rollbackImageSha),
    rollbackSource: normalizeOptionalString(releaseDossier?.launchEvidence?.rollbackSource),
    rollbackPointerRunId: normalizeOptionalString(releaseDossier?.launchEvidence?.rollbackPointerRunId),
    rollbackPointerArtifactName: normalizeOptionalString(
      releaseDossier?.launchEvidence?.rollbackPointerArtifactName,
    ),
    rollbackPointerSelectionSource: normalizeOptionalString(
      releaseDossier?.launchEvidence?.rollbackPointerSelectionSource,
    ),
    rollbackPointerArtifactId: normalizeOptionalString(
      releaseDossier?.launchEvidence?.rollbackPointerArtifactId,
    ),
    rollbackPointerSelectedCreatedAt: normalizeOptionalString(
      releaseDossier?.launchEvidence?.rollbackPointerSelectedCreatedAt,
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
      releaseDossier?.launchEvidence?.marketplaceSeededCanaryFailures,
    ),
    launchMarketplaceExactCanaryFailures: normalizeOptionalNumber(
      releaseDossier?.launchEvidence?.marketplaceExactCanaryFailures,
    ),
    authorityAuditSource: normalizeOptionalString(releaseDossier?.launchEvidence?.authorityAuditSource),
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
  ]) {
    if (pointer?.[field] !== undefined && pointer?.[field] !== null && typeof pointer[field] !== 'boolean') {
      issues.push(`Release pointer ${label} must be boolean when present.`);
    }
  }

  for (const [field, label] of [
    ['launchMarketplaceSeededCanaryFailures', 'launch marketplace seeded canary failures'],
    ['launchMarketplaceExactCanaryFailures', 'launch marketplace exact canary failures'],
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

  if (requireReadyLaunchPosture) {
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
    if (!normalizeOptionalString(pointer?.rollbackSource)) {
      issues.push('Release pointer does not record rollback source.');
    }
  }

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
