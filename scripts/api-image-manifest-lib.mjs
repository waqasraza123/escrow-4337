import { appendFileSync } from 'node:fs';

export function buildApiImageManifest(input) {
  const tags = normalizeTags(input.imageTags);
  const digest = normalizeDigest(input.imageDigest);
  const imageName = normalizeRequiredString(input.imageName, 'imageName');

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    repository: normalizeRequiredString(input.repository, 'repository'),
    workflow: normalizeRequiredString(input.workflow, 'workflow'),
    runId: normalizeRequiredString(input.runId, 'runId'),
    runAttempt: normalizeRequiredString(input.runAttempt, 'runAttempt'),
    runUrl: normalizeRequiredString(input.runUrl, 'runUrl'),
    eventName: normalizeRequiredString(input.eventName, 'eventName'),
    gitRef: normalizeRequiredString(input.gitRef, 'gitRef'),
    commitSha: normalizeRequiredString(input.commitSha, 'commitSha'),
    image: {
      name: imageName,
      digest,
      tags,
      tagReferences: tags.map((tag) => `${imageName}:${tag}`),
      canonicalReference: `${imageName}@${digest}`,
    },
  };
}

export function validateApiImageManifest(
  manifest,
  { expectedRepository, expectedCommitSha, expectedRunId } = {},
) {
  const issues = [];

  for (const field of [
    'generatedAt',
    'repository',
    'workflow',
    'runId',
    'runAttempt',
    'runUrl',
    'eventName',
    'gitRef',
    'commitSha',
  ]) {
    if (!normalizeOptionalString(manifest?.[field])) {
      issues.push(`Image manifest is missing ${field}.`);
    }
  }

  if (!normalizeOptionalString(manifest?.image?.name)) {
    issues.push('Image manifest is missing image.name.');
  }
  if (!normalizeOptionalString(manifest?.image?.digest)) {
    issues.push('Image manifest is missing image.digest.');
  } else if (!manifest.image.digest.startsWith('sha256:')) {
    issues.push('Image manifest image.digest must start with sha256:.');
  }
  if (!Array.isArray(manifest?.image?.tags) || manifest.image.tags.length === 0) {
    issues.push('Image manifest must include at least one published image tag.');
  }

  if (
    expectedRepository &&
    normalizeOptionalString(manifest?.repository) !== expectedRepository
  ) {
    issues.push(
      `Image manifest repository ${manifest?.repository ?? '<missing>'} does not match expected repository ${expectedRepository}.`,
    );
  }
  if (
    expectedCommitSha &&
    normalizeOptionalString(manifest?.commitSha) !== expectedCommitSha
  ) {
    issues.push(
      `Image manifest commit SHA ${manifest?.commitSha ?? '<missing>'} does not match expected commit SHA ${expectedCommitSha}.`,
    );
  }
  if (expectedRunId && normalizeOptionalString(manifest?.runId) !== expectedRunId) {
    issues.push(
      `Image manifest run id ${manifest?.runId ?? '<missing>'} does not match expected run id ${expectedRunId}.`,
    );
  }

  return issues;
}

export function buildImageCandidateSelection(manifest) {
  return {
    repository: manifest.repository,
    workflow: manifest.workflow,
    runId: manifest.runId,
    runAttempt: manifest.runAttempt,
    runUrl: manifest.runUrl,
    gitRef: manifest.gitRef,
    commitSha: manifest.commitSha,
    imageName: manifest.image.name,
    imageDigest: manifest.image.digest,
    imageReference: manifest.image.canonicalReference,
    imageTags: manifest.image.tags,
  };
}

export function buildApiImageManifestMarkdown(manifest) {
  return `# API Image Manifest

- Generated at: ${manifest.generatedAt}
- Repository: ${manifest.repository}
- Workflow: ${manifest.workflow}
- Run ID: ${manifest.runId}
- Run Attempt: ${manifest.runAttempt}
- Run URL: ${manifest.runUrl}
- Event: ${manifest.eventName}
- Git Ref: ${manifest.gitRef}
- Commit SHA: ${manifest.commitSha}
- Image Name: ${manifest.image.name}
- Image Digest: ${manifest.image.digest}
- Canonical Reference: ${manifest.image.canonicalReference}

## Tags

${manifest.image.tags.map((tag) => `- ${tag}`).join('\n')}
`;
}

export function writeGitHubStepSummary(markdown, env = process.env) {
  const summaryPath = normalizeOptionalString(env.GITHUB_STEP_SUMMARY);
  if (!summaryPath) {
    return;
  }

  appendFileSync(summaryPath, `${markdown}${markdown.endsWith('\n') ? '' : '\n'}`, 'utf8');
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/);
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.split(':').pop() ?? tag),
    ),
  );
}

function normalizeDigest(value) {
  const normalized = normalizeRequiredString(value, 'imageDigest');
  if (!normalized.startsWith('sha256:')) {
    throw new Error('imageDigest must start with sha256:.');
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
  return trimmed.length > 0 ? trimmed : null;
}
