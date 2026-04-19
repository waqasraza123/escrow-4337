import { appendFileSync, copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { buildImageCandidateSelection } from './api-image-manifest-lib.mjs';

export const releaseDossierSourceSpecs = [
  {
    key: 'imageManifest',
    label: 'api-image-manifest',
    requiredFiles: ['manifest.json', 'manifest.md'],
  },
  {
    key: 'deployedSmokeReview',
    label: 'deployed-smoke-review',
    requiredFiles: ['deployed-smoke-record.json', 'deployed-smoke-record.md'],
  },
  {
    key: 'launchCandidateReview',
    label: 'launch-candidate-review',
    requiredFiles: [
      'evidence-manifest.json',
      'promotion-record.json',
      'promotion-record.md',
      'provider-validation-summary.json',
      'summary.md',
    ],
  },
  {
    key: 'promotionReview',
    label: 'promotion-review',
    requiredFiles: ['promotion-review.json', 'promotion-review.md'],
  },
];

export function buildReleaseDossierMetadata(env = process.env) {
  return {
    source: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
    environment: trimToNull(env.RELEASE_DOSSIER_ENVIRONMENT),
    repository:
      trimToNull(env.RELEASE_DOSSIER_REPOSITORY) ?? trimToNull(env.GITHUB_REPOSITORY),
    workflow: trimToNull(env.RELEASE_DOSSIER_WORKFLOW) ?? trimToNull(env.GITHUB_WORKFLOW),
    runId: trimToNull(env.GITHUB_RUN_ID),
    runAttempt: trimToNull(env.GITHUB_RUN_ATTEMPT),
    runUrl: trimToNull(env.RELEASE_DOSSIER_RUN_URL),
    actor: trimToNull(env.RELEASE_DOSSIER_ACTOR) ?? trimToNull(env.GITHUB_ACTOR),
  };
}

export function validateReleaseDossierMetadata(metadata, env = process.env) {
  const issues = [];
  const requireMetadata =
    env.GITHUB_ACTIONS === 'true' ||
    metadata.environment !== null ||
    metadata.repository !== null;

  if (!requireMetadata) {
    return issues;
  }

  for (const [field, label] of [
    ['environment', 'environment'],
    ['repository', 'repository'],
    ['workflow', 'workflow'],
    ['runId', 'run id'],
    ['runUrl', 'run URL'],
    ['actor', 'actor'],
  ]) {
    if (!metadata[field]) {
      issues.push(`Release dossier metadata is missing ${label}.`);
    }
  }

  return issues;
}

export function copyReleaseDossierSources({
  outputDir,
  imageManifestDir,
  deployedSmokeReviewDir,
  launchCandidateReviewDir,
  promotionReviewDir,
}) {
  const evidenceRoot = resolve(outputDir, 'evidence');
  mkdirSync(evidenceRoot, {
    recursive: true,
  });

  const sourceDirs = {
    imageManifest: resolve(imageManifestDir),
    deployedSmokeReview: resolve(deployedSmokeReviewDir),
    launchCandidateReview: resolve(launchCandidateReviewDir),
    promotionReview: resolve(promotionReviewDir),
  };
  const copiedFiles = [];

  for (const spec of releaseDossierSourceSpecs) {
    const sourceDir = sourceDirs[spec.key];
    const destinationDir = resolve(evidenceRoot, spec.label);
    mkdirSync(destinationDir, {
      recursive: true,
    });

    for (const relativePath of spec.requiredFiles) {
      const sourcePath = resolve(sourceDir, relativePath);
      const destinationPath = resolve(destinationDir, relativePath);
      mkdirSync(resolve(destinationPath, '..'), {
        recursive: true,
      });
      copyFileSync(sourcePath, destinationPath);
      copiedFiles.push(relative(outputDir, destinationPath));
    }
  }

  return {
    evidenceRoot,
    copiedFiles: copiedFiles.sort(),
  };
}

export function validateReleaseDossierInputs({
  imageManifest,
  deployedSmokeRecord,
  launchPromotionRecord,
  launchEvidenceManifest,
  promotionReview,
  metadata,
}) {
  const issues = [];
  issues.push(...validateReleaseDossierMetadata(metadata, { GITHUB_ACTIONS: 'true' }));

  if (!promotionReview || typeof promotionReview !== 'object') {
    issues.push('Release dossier is missing promotion review JSON.');
    return issues;
  }

  const candidate = buildImageCandidateSelection(imageManifest ?? {});
  compareField({
    issues,
    leftLabel: 'Image manifest candidate run id',
    leftValue: candidate.runId,
    rightLabel: 'promotion review candidate run id',
    rightValue: promotionReview?.candidate?.runId,
  });
  compareField({
    issues,
    leftLabel: 'Image manifest commit SHA',
    leftValue: candidate.commitSha,
    rightLabel: 'promotion review commit SHA',
    rightValue: promotionReview?.candidate?.commitSha,
  });
  compareField({
    issues,
    leftLabel: 'Image manifest image digest',
    leftValue: candidate.imageDigest,
    rightLabel: 'promotion review image digest',
    rightValue: promotionReview?.candidate?.imageDigest,
  });
  compareField({
    issues,
    leftLabel: 'Deployed smoke review run id',
    leftValue: deployedSmokeRecord?.metadata?.runId,
    rightLabel: 'promotion review deployed smoke run id',
    rightValue: promotionReview?.reviews?.deployedSmoke?.runId,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate review run id',
    leftValue: launchPromotionRecord?.metadata?.runId,
    rightLabel: 'promotion review launch candidate run id',
    rightValue: promotionReview?.reviews?.launchCandidate?.runId,
  });
  compareField({
    issues,
    leftLabel: 'Deployed smoke review artifact name',
    leftValue: promotionReview?.reviews?.deployedSmoke?.artifactName,
    rightLabel: 'deployed smoke review expected artifact name',
    rightValue: buildReviewArtifactName({
      kind: 'deployed-smoke-review',
      environment: metadata?.environment,
      candidateRunId: candidate.runId,
    }),
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate review artifact name',
    leftValue: promotionReview?.reviews?.launchCandidate?.artifactName,
    rightLabel: 'launch candidate review expected artifact name',
    rightValue: buildReviewArtifactName({
      kind: 'launch-candidate-review',
      environment: metadata?.environment,
      candidateRunId: candidate.runId,
    }),
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback image SHA',
    leftValue: launchPromotionRecord?.rollback?.rollbackImageSha,
    rightLabel: 'launch candidate metadata rollback image SHA',
    rightValue: launchPromotionRecord?.metadata?.rollbackImageSha,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback source',
    leftValue: launchPromotionRecord?.rollback?.rollbackSource,
    rightLabel: 'launch candidate metadata rollback source',
    rightValue: launchPromotionRecord?.metadata?.rollbackSource,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback pointer run id',
    leftValue: launchPromotionRecord?.rollback?.rollbackPointerRunId,
    rightLabel: 'launch candidate metadata rollback pointer run id',
    rightValue: launchPromotionRecord?.metadata?.rollbackPointerRunId,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback pointer artifact name',
    leftValue: launchPromotionRecord?.rollback?.rollbackPointerArtifactName,
    rightLabel: 'launch candidate metadata rollback pointer artifact name',
    rightValue: launchPromotionRecord?.metadata?.rollbackPointerArtifactName,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback pointer selection source',
    leftValue: launchPromotionRecord?.rollback?.rollbackPointerSelectionSource,
    rightLabel: 'launch candidate metadata rollback pointer selection source',
    rightValue: launchPromotionRecord?.metadata?.rollbackPointerSelectionSource,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback pointer artifact id',
    leftValue: launchPromotionRecord?.rollback?.rollbackPointerArtifactId,
    rightLabel: 'launch candidate metadata rollback pointer artifact id',
    rightValue: launchPromotionRecord?.metadata?.rollbackPointerArtifactId,
  });
  compareField({
    issues,
    leftLabel: 'Launch candidate rollback pointer selected timestamp',
    leftValue: launchPromotionRecord?.rollback?.rollbackPointerSelectedCreatedAt,
    rightLabel: 'launch candidate metadata rollback pointer selected timestamp',
    rightValue: launchPromotionRecord?.metadata?.rollbackPointerSelectedCreatedAt,
  });
  compareBooleanField({
    issues,
    leftLabel: 'Deployed smoke seeded canary passed',
    leftValue: deployedSmokeRecord?.checks?.seededCanaryPassed,
    rightLabel: 'promotion review deployed smoke seeded canary passed',
    rightValue: promotionReview?.reviews?.deployedSmoke?.seededCanaryPassed,
  });
  compareBooleanField({
    issues,
    leftLabel: 'Deployed smoke marketplace seeded canary passed',
    leftValue: deployedSmokeRecord?.checks?.marketplaceSeededCanaryPassed,
    rightLabel: 'promotion review deployed smoke marketplace seeded canary passed',
    rightValue: promotionReview?.reviews?.deployedSmoke?.marketplaceSeededCanaryPassed,
  });
  issues.push(
    ...validateReviewSelection({
      label: 'Release dossier deployed smoke review selection',
      workflow: promotionReview?.reviews?.deployedSmoke,
    }),
  );
  issues.push(
    ...validateReviewSelection({
      label: 'Release dossier launch candidate review selection',
      workflow: promotionReview?.reviews?.launchCandidate,
    }),
  );

  const missingArtifacts = Array.isArray(launchEvidenceManifest?.requiredArtifacts?.missing)
    ? launchEvidenceManifest.requiredArtifacts.missing
    : null;
  if (!Array.isArray(missingArtifacts)) {
    issues.push('Release dossier launch evidence manifest is missing requiredArtifacts.missing.');
  }
  if (
    promotionReview?.reviews?.launchCandidate?.evidenceComplete === true &&
    Array.isArray(missingArtifacts) &&
    missingArtifacts.length > 0
  ) {
    issues.push(
      `Release dossier launch evidence completeness disagrees with missing artifacts: ${missingArtifacts.join(', ')}.`,
    );
  }

  return issues;
}

export function buildReleaseDossier({
  generatedAt = new Date().toISOString(),
  metadata,
  imageManifest,
  deployedSmokeRecord,
  launchPromotionRecord,
  launchEvidenceManifest,
  promotionReview,
  evidenceFiles,
}) {
  const candidate = buildImageCandidateSelection(imageManifest);
  const missingArtifacts = Array.isArray(launchEvidenceManifest?.requiredArtifacts?.missing)
    ? launchEvidenceManifest.requiredArtifacts.missing
    : [];
  const totalBytes = evidenceFiles.reduce((sum, entry) => sum + entry.bytes, 0);

  return {
    generatedAt,
    metadata,
    decision: {
      status: promotionReview.status ?? 'blocked',
      blockers: Array.isArray(promotionReview.blockers) ? promotionReview.blockers : [],
      warnings: Array.isArray(promotionReview.warnings) ? promotionReview.warnings : [],
    },
    candidate: {
      repository: candidate.repository ?? null,
      workflow: candidate.workflow ?? null,
      runId: candidate.runId ?? null,
      runUrl: candidate.runUrl ?? null,
      commitSha: candidate.commitSha ?? null,
      gitRef: candidate.gitRef ?? null,
      imageName: candidate.imageName ?? null,
      imageDigest: candidate.imageDigest ?? null,
      imageReference: candidate.imageReference ?? null,
      imageTags: Array.isArray(candidate.imageTags) ? candidate.imageTags : [],
    },
    workflows: {
      candidateCi: {
        workflow: candidate.workflow ?? null,
        runId: candidate.runId ?? null,
        runUrl: candidate.runUrl ?? null,
      },
      deployedSmoke: {
        workflow: deployedSmokeRecord?.metadata?.workflow ?? null,
        runId: deployedSmokeRecord?.metadata?.runId ?? null,
        runUrl: deployedSmokeRecord?.metadata?.runUrl ?? null,
        status: deployedSmokeRecord?.status ?? 'missing',
        selectionSource: promotionReview?.reviews?.deployedSmoke?.selectionSource ?? null,
        artifactId: promotionReview?.reviews?.deployedSmoke?.artifactId ?? null,
        artifactName: promotionReview?.reviews?.deployedSmoke?.artifactName ?? null,
        selectedCreatedAt: promotionReview?.reviews?.deployedSmoke?.selectedCreatedAt ?? null,
        smokePassed: deployedSmokeRecord?.checks?.smokePassed ?? null,
        seededCanaryPassed: deployedSmokeRecord?.checks?.seededCanaryPassed ?? null,
        marketplaceSeededCanaryPassed:
          deployedSmokeRecord?.checks?.marketplaceSeededCanaryPassed ?? null,
      },
      launchCandidate: {
        workflow: launchPromotionRecord?.metadata?.workflow ?? null,
        runId: launchPromotionRecord?.metadata?.runId ?? null,
        runUrl: launchPromotionRecord?.metadata?.runUrl ?? null,
        status: launchPromotionRecord?.status ?? 'missing',
        selectionSource: promotionReview?.reviews?.launchCandidate?.selectionSource ?? null,
        artifactId: promotionReview?.reviews?.launchCandidate?.artifactId ?? null,
        artifactName: promotionReview?.reviews?.launchCandidate?.artifactName ?? null,
        selectedCreatedAt: promotionReview?.reviews?.launchCandidate?.selectedCreatedAt ?? null,
      },
      promotionReview: {
        workflow: metadata.workflow,
        runId: metadata.runId,
        runUrl: metadata.runUrl,
        status: promotionReview.status ?? 'blocked',
      },
    },
    launchEvidence: {
      requiredArtifactCount: launchEvidenceManifest?.requiredArtifacts?.total ?? null,
      missingArtifacts,
      authorityAuditSource: launchPromotionRecord?.launchCandidate?.authorityAuditSource ?? null,
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
      marketplaceSeededCanaryFailures:
        launchPromotionRecord?.launchCandidate?.marketplaceSeededCanaryFailures ?? null,
      marketplaceExactCanaryFailures:
        launchPromotionRecord?.launchCandidate?.marketplaceExactCanaryFailures ?? null,
    },
    evidence: {
      fileCount: evidenceFiles.length,
      totalBytes,
      files: evidenceFiles,
    },
  };
}

export function buildReleaseDossierMarkdown(record) {
  return `# Release Dossier

- Generated at: ${record.generatedAt}
- Status: ${record.decision.status}
- Environment: ${record.metadata.environment ?? 'n/a'}
- Repository: ${record.metadata.repository ?? 'n/a'}
- Promotion review run URL: ${record.metadata.runUrl ?? 'n/a'}
- Candidate CI run URL: ${record.candidate.runUrl ?? 'n/a'}
- Commit SHA: ${record.candidate.commitSha ?? 'n/a'}
- Image digest: ${record.candidate.imageDigest ?? 'n/a'}
- Deployed smoke passed: ${formatBoolean(record.workflows.deployedSmoke.smokePassed)}
- Deployed smoke seeded canary passed: ${formatBoolean(record.workflows.deployedSmoke.seededCanaryPassed)}
- Deployed smoke marketplace seeded canary passed: ${formatBoolean(record.workflows.deployedSmoke.marketplaceSeededCanaryPassed)}
- Launch rollback image SHA: ${record.launchEvidence.rollbackImageSha ?? 'n/a'}
- Launch rollback source: ${record.launchEvidence.rollbackSource ?? 'n/a'}
- Launch rollback pointer run ID: ${record.launchEvidence.rollbackPointerRunId ?? 'n/a'}
- Launch rollback pointer artifact: ${record.launchEvidence.rollbackPointerArtifactName ?? 'n/a'}
- Launch rollback pointer selection source: ${record.launchEvidence.rollbackPointerSelectionSource ?? 'n/a'}
- Launch rollback pointer artifact ID: ${record.launchEvidence.rollbackPointerArtifactId ?? 'n/a'}
- Launch rollback pointer selected at: ${record.launchEvidence.rollbackPointerSelectedCreatedAt ?? 'n/a'}
- Launch authority audit source: ${record.launchEvidence.authorityAuditSource ?? 'n/a'}
- Launch marketplace seeded canary failures: ${record.launchEvidence.marketplaceSeededCanaryFailures ?? 'n/a'}
- Launch marketplace exact canary failures: ${record.launchEvidence.marketplaceExactCanaryFailures ?? 'n/a'}
- Evidence files: ${record.evidence.fileCount}
- Evidence bytes: ${record.evidence.totalBytes}

## Workflow Runs

- Candidate CI: ${formatWorkflow(record.workflows.candidateCi)}
- Deployed Smoke: ${formatWorkflow(record.workflows.deployedSmoke)}
  Selection source: ${record.workflows.deployedSmoke.selectionSource ?? 'n/a'}
  Selection artifact: ${record.workflows.deployedSmoke.artifactName ?? 'n/a'}
  Selection artifact ID: ${record.workflows.deployedSmoke.artifactId ?? 'n/a'}
  Selection selected at: ${record.workflows.deployedSmoke.selectedCreatedAt ?? 'n/a'}
- Launch Candidate: ${formatWorkflow(record.workflows.launchCandidate)}
  Selection source: ${record.workflows.launchCandidate.selectionSource ?? 'n/a'}
  Selection artifact: ${record.workflows.launchCandidate.artifactName ?? 'n/a'}
  Selection artifact ID: ${record.workflows.launchCandidate.artifactId ?? 'n/a'}
  Selection selected at: ${record.workflows.launchCandidate.selectedCreatedAt ?? 'n/a'}
- Promotion Review: ${formatWorkflow(record.workflows.promotionReview)}

## Blockers

${record.decision.blockers.length === 0 ? '- none' : record.decision.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Warnings

${record.decision.warnings.length === 0 ? '- none' : record.decision.warnings.map((warning) => `- ${warning}`).join('\n')}

## Missing Launch Artifacts

${record.launchEvidence.missingArtifacts.length === 0
    ? '- none'
    : record.launchEvidence.missingArtifacts.map((artifact) => `- ${artifact}`).join('\n')}

## Evidence Files

${record.evidence.files.map((file) => `- ${file.path} (${file.sha256})`).join('\n')}
`;
}

export function buildChecksumsText(evidenceFiles) {
  return evidenceFiles.map((file) => `${file.sha256}  ${file.path}`).join('\n');
}

export function listReleaseDossierFiles(rootDir) {
  return listFiles(rootDir).map((path) => {
    const absolutePath = resolve(rootDir, path);
    const bytes = statSync(absolutePath).size;
    return {
      path,
      sha256: hashFile(absolutePath),
      bytes,
    };
  });
}

export function writeGitHubStepSummary(markdown, env = process.env) {
  const summaryPath = trimToNull(env.GITHUB_STEP_SUMMARY);
  if (!summaryPath) {
    return;
  }

  appendFileSync(summaryPath, `${markdown}${markdown.endsWith('\n') ? '' : '\n'}`, 'utf8');
}

function listFiles(rootDir, currentDir = rootDir) {
  const entries = readdirSync(currentDir, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(rootDir, entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(relative(rootDir, entryPath));
    }
  }

  return files.sort();
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function formatWorkflow(workflow) {
  const name = trimToNull(workflow?.workflow) ?? 'n/a';
  const runId = trimToNull(workflow?.runId) ?? 'n/a';
  const status = trimToNull(workflow?.status);
  const url = trimToNull(workflow?.runUrl);
  return `${name} run ${runId}${status ? ` (${status})` : ''}${url ? ` ${url}` : ''}`;
}

function compareField({ issues, leftLabel, leftValue, rightLabel, rightValue }) {
  const normalizedLeft = trimToNull(leftValue);
  const normalizedRight = trimToNull(rightValue);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return;
  }

  issues.push(`${leftLabel} ${normalizedLeft} does not match ${rightLabel} ${normalizedRight}.`);
}

function compareBooleanField({ issues, leftLabel, leftValue, rightLabel, rightValue }) {
  if (typeof leftValue !== 'boolean' || typeof rightValue !== 'boolean' || leftValue === rightValue) {
    return;
  }

  issues.push(`${leftLabel} ${leftValue} does not match ${rightLabel} ${rightValue}.`);
}

function formatBoolean(value) {
  return typeof value === 'boolean' ? String(value) : 'n/a';
}

function validateReviewSelection({ label, workflow }) {
  const issues = [];
  const source = trimToNull(workflow?.selectionSource);

  if (source) {
    if (!trimToNull(workflow?.artifactName)) {
      issues.push(`${label} is missing artifact name when selection source is present.`);
    }
  }

  if (source === 'artifact-search') {
    if (!trimToNull(workflow?.artifactId)) {
      issues.push(`${label} is missing artifact id for artifact-search selection.`);
    }
    if (!trimToNull(workflow?.selectedCreatedAt)) {
      issues.push(`${label} is missing selected timestamp for artifact-search selection.`);
    }
  }

  return issues;
}

function buildReviewArtifactName({ kind, environment, candidateRunId }) {
  const normalizedKind = trimToNull(kind);
  const normalizedEnvironment = normalizeSegment(environment);
  const normalizedCandidateRunId = normalizeSegment(candidateRunId);
  if (!normalizedKind || !normalizedEnvironment || !normalizedCandidateRunId) {
    return null;
  }

  return `${normalizedKind}-${normalizedEnvironment}-candidate-${normalizedCandidateRunId}`;
}

function normalizeSegment(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length === 0 ? null : normalized;
}

function trimToNull(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
