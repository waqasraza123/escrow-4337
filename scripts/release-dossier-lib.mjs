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
    requiredFiles: ['evidence-manifest.json', 'promotion-record.json', 'promotion-record.md', 'summary.md'],
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
      },
      launchCandidate: {
        workflow: launchPromotionRecord?.metadata?.workflow ?? null,
        runId: launchPromotionRecord?.metadata?.runId ?? null,
        runUrl: launchPromotionRecord?.metadata?.runUrl ?? null,
        status: launchPromotionRecord?.status ?? 'missing',
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
- Launch authority audit source: ${record.launchEvidence.authorityAuditSource ?? 'n/a'}
- Launch marketplace seeded canary failures: ${record.launchEvidence.marketplaceSeededCanaryFailures ?? 'n/a'}
- Launch marketplace exact canary failures: ${record.launchEvidence.marketplaceExactCanaryFailures ?? 'n/a'}
- Evidence files: ${record.evidence.fileCount}
- Evidence bytes: ${record.evidence.totalBytes}

## Workflow Runs

- Candidate CI: ${formatWorkflow(record.workflows.candidateCi)}
- Deployed Smoke: ${formatWorkflow(record.workflows.deployedSmoke)}
- Launch Candidate: ${formatWorkflow(record.workflows.launchCandidate)}
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

function trimToNull(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
