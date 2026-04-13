export function buildReviewArtifactName({ kind, environment, candidateRunId }) {
  const normalizedKind = normalizeRequiredSegment(kind, 'kind');
  const normalizedEnvironment = normalizeRequiredSegment(environment, 'environment');
  const normalizedCandidateRunId = normalizeRequiredSegment(candidateRunId, 'candidateRunId');
  return `${normalizedKind}-${normalizedEnvironment}-candidate-${normalizedCandidateRunId}`;
}

export function resolvePromotionReviewSelections({
  environment,
  candidateRunId,
  deployedSmokeRunId = null,
  launchCandidateRunId = null,
  artifacts = [],
}) {
  const deployedSmokeArtifactName = buildReviewArtifactName({
    kind: 'deployed-smoke-review',
    environment,
    candidateRunId,
  });
  const launchCandidateArtifactName = buildReviewArtifactName({
    kind: 'launch-candidate-review',
    environment,
    candidateRunId,
  });

  const deployedSmokeSelection = deployedSmokeRunId
    ? {
        artifactName: deployedSmokeArtifactName,
        runId: String(deployedSmokeRunId),
        source: 'input',
      }
    : selectLatestArtifactRun({
        artifacts,
        artifactName: deployedSmokeArtifactName,
        label: 'deployed smoke review',
      });

  const launchCandidateSelection = launchCandidateRunId
    ? {
        artifactName: launchCandidateArtifactName,
        runId: String(launchCandidateRunId),
        source: 'input',
      }
    : selectLatestArtifactRun({
        artifacts,
        artifactName: launchCandidateArtifactName,
        label: 'launch candidate review',
      });

  return {
    environment: normalizeRequiredSegment(environment, 'environment'),
    candidateRunId: normalizeRequiredSegment(candidateRunId, 'candidateRunId'),
    deployedSmoke: deployedSmokeSelection,
    launchCandidate: launchCandidateSelection,
  };
}

export function selectLatestArtifactRun({ artifacts, artifactName, label }) {
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
      `Could not find a non-expired ${label} artifact named ${artifactName}.`,
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
