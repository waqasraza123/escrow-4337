import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildReleaseDossier,
  buildReleaseDossierMetadata,
  buildChecksumsText,
  copyReleaseDossierSources,
  listReleaseDossierFiles,
  validateReleaseDossierInputs,
  validateReleaseDossierMetadata,
} from './release-dossier-lib.mjs';

test('validateReleaseDossierMetadata requires workflow review fields for GitHub runs', () => {
  const metadata = buildReleaseDossierMetadata({
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: 'mc/escrow4337',
    GITHUB_WORKFLOW: 'Promotion Review',
    GITHUB_RUN_ID: '401',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_ACTOR: 'mc',
    RELEASE_DOSSIER_ENVIRONMENT: 'staging',
  });
  const issues = validateReleaseDossierMetadata(metadata, {
    GITHUB_ACTIONS: 'true',
  });

  assert.deepEqual(issues, ['Release dossier metadata is missing run URL.']);
});

test('copyReleaseDossierSources copies canonical evidence files and hashes them', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const imageManifestDir = resolve(root, 'image');
    const deployedSmokeDir = resolve(root, 'smoke');
    const launchReviewDir = resolve(root, 'launch');
    const promotionReviewDir = resolve(root, 'promotion');
    const outputDir = resolve(root, 'out');

    mkdirSync(imageManifestDir, { recursive: true });
    mkdirSync(deployedSmokeDir, { recursive: true });
    mkdirSync(launchReviewDir, { recursive: true });
    mkdirSync(promotionReviewDir, { recursive: true });

    writeFileSync(resolve(imageManifestDir, 'manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(imageManifestDir, 'manifest.md'), '# image\n', 'utf8');
    writeFileSync(resolve(deployedSmokeDir, 'deployed-smoke-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(deployedSmokeDir, 'deployed-smoke-record.md'), '# smoke\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'evidence-manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.md'), '# launch\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'summary.md'), '# summary\n', 'utf8');
    writeFileSync(resolve(promotionReviewDir, 'promotion-review.json'), '{}\n', 'utf8');
    writeFileSync(resolve(promotionReviewDir, 'promotion-review.md'), '# promotion\n', 'utf8');

    const copied = copyReleaseDossierSources({
      outputDir,
      imageManifestDir,
      deployedSmokeReviewDir: deployedSmokeDir,
      launchCandidateReviewDir: launchReviewDir,
      promotionReviewDir,
    });
    assert.ok(copied.copiedFiles.includes('evidence/api-image-manifest/manifest.json'));

    const files = listReleaseDossierFiles(resolve(outputDir, 'evidence'));
    assert.equal(files.length, 10);
    assert.ok(files.every((entry) => entry.sha256.length === 64));

    const checksums = buildChecksumsText(files);
    assert.ok(checksums.includes('api-image-manifest/manifest.json'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierInputs catches inconsistent evidence sets', () => {
  const issues = validateReleaseDossierInputs({
    metadata: {
      environment: 'staging',
      repository: 'mc/escrow4337',
      workflow: 'Promotion Review',
      runId: '401',
      runUrl: 'https://github.com/mc/escrow4337/actions/runs/401',
      actor: 'mc',
    },
    imageManifest: {
      repository: 'mc/escrow4337',
      workflow: 'CI',
      runId: '101',
      runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
      gitRef: 'main',
      commitSha: 'abc123',
      image: {
        name: 'ghcr.io/mc/escrow-4337-api',
        digest: 'sha256:deadbeef',
        canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        tags: ['sha-abc123', 'main'],
      },
    },
    deployedSmokeRecord: {
      metadata: {
        runId: '201',
      },
      checks: {
        seededCanaryPassed: true,
        marketplaceSeededCanaryPassed: false,
      },
    },
    launchPromotionRecord: {
      metadata: {
        runId: '301',
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
      },
      rollback: {
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'input',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
      },
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: ['authority-evidence/summary.json'],
      },
    },
    promotionReview: {
      candidate: {
        runId: '101',
        commitSha: 'wrong',
        imageDigest: 'sha256:deadbeef',
      },
      reviews: {
        deployedSmoke: {
          runId: '201',
          seededCanaryPassed: true,
          marketplaceSeededCanaryPassed: true,
        },
        launchCandidate: {
          runId: '301',
          evidenceComplete: true,
        },
      },
    },
  });

  assert.deepEqual(issues, [
    'Image manifest commit SHA abc123 does not match promotion review commit SHA wrong.',
    'Launch candidate rollback source input does not match launch candidate metadata rollback source release-pointer.',
    'Deployed smoke marketplace seeded canary passed false does not match promotion review deployed smoke marketplace seeded canary passed true.',
    'Release dossier launch evidence completeness disagrees with missing artifacts: authority-evidence/summary.json.',
  ]);
});

test('buildReleaseDossier summarizes decision and copied evidence inventory', () => {
  const record = buildReleaseDossier({
    metadata: {
      environment: 'staging',
      repository: 'mc/escrow4337',
      workflow: 'Promotion Review',
      runId: '401',
      runUrl: 'https://github.com/mc/escrow4337/actions/runs/401',
      actor: 'mc',
    },
    imageManifest: {
      repository: 'mc/escrow4337',
      workflow: 'CI',
      runId: '101',
      runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
      gitRef: 'main',
      commitSha: 'abc123',
      image: {
        name: 'ghcr.io/mc/escrow-4337-api',
        digest: 'sha256:deadbeef',
        canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        tags: ['sha-abc123', 'main'],
      },
    },
    deployedSmokeRecord: {
      status: 'ready',
      metadata: {
        workflow: 'Deployed Smoke',
        runId: '201',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/201',
      },
      checks: {
        smokePassed: true,
        seededCanaryPassed: true,
        marketplaceSeededCanaryPassed: true,
      },
    },
    launchPromotionRecord: {
      status: 'ready',
      metadata: {
        workflow: 'Launch Candidate',
        runId: '301',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/301',
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
      },
      launchCandidate: {
        authorityAuditSource: 'chain_projection',
        marketplaceSeededCanaryFailures: 0,
        marketplaceExactCanaryFailures: 0,
      },
      rollback: {
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
      },
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        total: 15,
        missing: [],
      },
    },
    promotionReview: {
      status: 'ready',
      blockers: [],
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
    },
    evidenceFiles: [
      {
        path: 'api-image-manifest/manifest.json',
        sha256: 'a'.repeat(64),
        bytes: 120,
      },
      {
        path: 'promotion-review/promotion-review.json',
        sha256: 'b'.repeat(64),
        bytes: 80,
      },
    ],
  });

  assert.equal(record.decision.status, 'ready');
  assert.equal(record.evidence.fileCount, 2);
  assert.equal(record.evidence.totalBytes, 200);
  assert.equal(record.launchEvidence.authorityAuditSource, 'chain_projection');
  assert.equal(record.launchEvidence.rollbackImageSha, 'sha256:old');
  assert.equal(record.launchEvidence.rollbackSource, 'release-pointer');
  assert.equal(record.launchEvidence.rollbackPointerRunId, '701');
  assert.equal(record.launchEvidence.rollbackPointerArtifactName, 'release-pointer-staging');
  assert.equal(record.workflows.deployedSmoke.smokePassed, true);
  assert.equal(record.workflows.deployedSmoke.seededCanaryPassed, true);
  assert.equal(record.workflows.deployedSmoke.marketplaceSeededCanaryPassed, true);
  assert.equal(record.launchEvidence.marketplaceSeededCanaryFailures, 0);
  assert.equal(record.launchEvidence.marketplaceExactCanaryFailures, 0);
  assert.deepEqual(record.decision.warnings, [
    'Rollback image SHA is not yet recorded for this candidate.',
  ]);
});
