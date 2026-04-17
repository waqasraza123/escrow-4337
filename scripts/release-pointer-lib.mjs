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
    deployedSmokePassed: normalizeOptionalBoolean(releaseDossier?.workflows?.deployedSmoke?.smokePassed),
    deployedSmokeSeededCanaryPassed: normalizeOptionalBoolean(
      releaseDossier?.workflows?.deployedSmoke?.seededCanaryPassed,
    ),
    deployedSmokeMarketplaceSeededCanaryPassed: normalizeOptionalBoolean(
      releaseDossier?.workflows?.deployedSmoke?.marketplaceSeededCanaryPassed,
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

export function validateReleasePointer(pointer, { expectedEnvironment = null } = {}) {
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
