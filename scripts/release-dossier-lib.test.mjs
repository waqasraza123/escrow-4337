import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildReleaseDossier,
  buildReleaseDossierMarkdown,
  buildReleaseDossierMetadata,
  buildChecksumsText,
  copyReleaseDossierSources,
  findReleaseDossierSourceSpec,
  listReleaseDossierFiles,
  validateReleaseDossierOutputDirectory,
  validateReleaseDossierSourceDirectory,
  validateReleaseDossierSourceDirectories,
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
    writeFileSync(resolve(launchReviewDir, 'launch-evidence-posture.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-origin-summary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-seeded-evidence.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-exact-evidence.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.md'), '# launch\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'provider-validation-summary.json'), '{}\n', 'utf8');
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
    assert.equal(files.length, 15);
    assert.ok(files.every((entry) => entry.sha256.length === 64));

    const checksums = buildChecksumsText(files);
    assert.ok(checksums.includes('api-image-manifest/manifest.json'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierSourceDirectories reports missing reviewed evidence files explicitly', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const imageManifestDir = resolve(root, 'image');
    const deployedSmokeDir = resolve(root, 'smoke');
    const launchReviewDir = resolve(root, 'launch');
    const promotionReviewDir = resolve(root, 'promotion');

    mkdirSync(imageManifestDir, { recursive: true });
    mkdirSync(deployedSmokeDir, { recursive: true });
    mkdirSync(launchReviewDir, { recursive: true });
    mkdirSync(promotionReviewDir, { recursive: true });

    writeFileSync(
      resolve(imageManifestDir, 'manifest.json'),
      `${JSON.stringify(
        {
          generatedAt: '2026-04-13T00:00:00.000Z',
          repository: 'mc/escrow4337',
          workflow: 'CI',
          runId: '101',
          runAttempt: '1',
          runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
          eventName: 'push',
          gitRef: 'main',
          commitSha: 'abc123',
          image: {
            name: 'ghcr.io/mc/escrow-4337-api',
            digest: 'sha256:deadbeef',
            tags: ['main'],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(imageManifestDir, 'manifest.md'), '# image\n', 'utf8');
    writeFileSync(
      resolve(deployedSmokeDir, 'deployed-smoke-record.json'),
      `${JSON.stringify(
        {
          generatedAt: '2026-04-13T00:00:00.000Z',
          status: 'ready',
          metadata: {
            environment: 'staging',
            repository: 'mc/escrow4337',
            workflow: 'Deployed Smoke',
            runId: '201',
            runAttempt: '1',
            runUrl: 'https://github.com/mc/escrow4337/actions/runs/201',
            actor: 'mc',
            candidateRunId: '101',
            candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
            commitSha: 'abc123',
            gitRef: 'main',
            deployedImageSha: 'sha256:deadbeef',
          },
          checks: {
            smokePassed: true,
            seededCanaryPassed: true,
            marketplaceSeededCanaryPassed: true,
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(deployedSmokeDir, 'deployed-smoke-record.md'), '# smoke\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'evidence-manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'launch-evidence-posture.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.md'), '# launch\n', 'utf8');
    writeFileSync(
      resolve(promotionReviewDir, 'promotion-review.json'),
      `${JSON.stringify(
        {
          generatedAt: '2026-04-13T00:00:00.000Z',
          status: 'blocked',
          environment: 'staging',
          candidate: {
            repository: 'mc/escrow4337',
            runId: '101',
            runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
            commitSha: 'abc123',
            imageDigest: 'sha256:deadbeef',
          },
          reviews: {
            deployedSmoke: {
              status: 'ready',
              workflow: 'Deployed Smoke',
              runId: '201',
              runUrl: 'https://github.com/mc/escrow4337/actions/runs/201',
              candidateRunId: '101',
            },
            launchCandidate: {
              status: 'blocked',
              workflow: 'Launch Candidate',
              runId: '301',
              runUrl: 'https://github.com/mc/escrow4337/actions/runs/301',
              candidateRunId: '101',
              postureLaunchReady: false,
              evidenceComplete: false,
              missingArtifactCount: 1,
              marketplaceSeededCanaryPassed: true,
              marketplaceExactCanaryPassed: false,
            },
          },
          blockers: ['missing launch evidence'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(promotionReviewDir, 'promotion-review.md'), '# promotion\n', 'utf8');

    const issues = validateReleaseDossierSourceDirectories({
      imageManifestDir,
      deployedSmokeReviewDir: deployedSmokeDir,
      launchCandidateReviewDir: launchReviewDir,
      promotionReviewDir,
    });

    assert.deepEqual(issues, [
      'Release dossier source launch-candidate-review is missing required file marketplace-origin-summary.json.',
      'Release dossier source launch-candidate-review is missing required file marketplace-seeded-evidence.json.',
      'Release dossier source launch-candidate-review is missing required file marketplace-exact-evidence.json.',
      'Release dossier source launch-candidate-review is missing required file provider-validation-summary.json.',
      'Release dossier source launch-candidate-review is missing required file summary.md.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierSourceDirectory validates one source bundle by key', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const launchReviewDir = resolve(root, 'launch');
    mkdirSync(launchReviewDir, { recursive: true });

    writeFileSync(resolve(launchReviewDir, 'evidence-manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'launch-evidence-posture.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-origin-summary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-seeded-evidence.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-exact-evidence.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'promotion-record.md'), '# launch\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'provider-validation-summary.json'), '{}\n', 'utf8');

    assert.deepEqual(findReleaseDossierSourceSpec('launchCandidateReview')?.label, 'launch-candidate-review');
    assert.deepEqual(
      validateReleaseDossierSourceDirectory({
        sourceKey: 'launchCandidateReview',
        sourceDir: launchReviewDir,
      }),
      ['Release dossier source launch-candidate-review is missing required file summary.md.'],
    );
    assert.deepEqual(
      validateReleaseDossierSourceDirectory({
        sourceKey: 'unknown',
        sourceDir: launchReviewDir,
      }),
      ['Unknown release dossier source key unknown.'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierSourceDirectory validates image manifest semantics', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const imageDir = resolve(root, 'image');
    mkdirSync(imageDir, { recursive: true });

    writeFileSync(
      resolve(imageDir, 'manifest.json'),
      `${JSON.stringify(
        {
          generatedAt: '2026-04-13T00:00:00.000Z',
          repository: 'mc/escrow4337',
          workflow: 'CI',
          runId: '101',
          runAttempt: '1',
          runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
          eventName: 'push',
          gitRef: 'main',
          commitSha: 'abc123',
          image: {
            name: 'ghcr.io/mc/escrow-4337-api',
            digest: 'deadbeef',
            tags: ['main'],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(imageDir, 'manifest.md'), '# image\n', 'utf8');

    assert.deepEqual(
      validateReleaseDossierSourceDirectory({
        sourceKey: 'imageManifest',
        sourceDir: imageDir,
      }),
      ['Image manifest image.digest must start with sha256:.'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierSourceDirectory validates launch candidate review semantics', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const launchReviewDir = resolve(root, 'launch');
    mkdirSync(launchReviewDir, { recursive: true });

    writeFileSync(
      resolve(launchReviewDir, 'evidence-manifest.json'),
      `${JSON.stringify(
        {
          requiredArtifacts: {
            missing: [],
            total: 20,
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      resolve(launchReviewDir, 'launch-evidence-posture.json'),
      `${JSON.stringify(
        {
          status: 'ready',
          launchReady: true,
          authority: {
            auditSource: 'chain_projection',
          },
          providerValidation: {
            failureCount: 0,
            warningCount: 0,
          },
          evidenceContract: {
            complete: true,
            requiredArtifactCount: 20,
            missingArtifactCount: 0,
          },
          executionTraceCoverage: {
            executionCount: 8,
            correlationTaggedExecutions: 8,
          },
          marketplaceOrigin: {
            ok: true,
            confirmedModes: ['seeded', 'exact'],
            missingModes: [],
            failedModes: [],
            exactLaneProof: {
              ok: true,
              clientSwitchedViaWorkspaceSwitcher: false,
              freelancerSwitchedViaWorkspaceSwitcher: true,
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(launchReviewDir, 'marketplace-origin-summary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-seeded-evidence.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'marketplace-exact-evidence.json'), '{}\n', 'utf8');
    writeFileSync(
      resolve(launchReviewDir, 'promotion-record.json'),
      `${JSON.stringify(
        {
          status: 'blocked',
          metadata: {
            environment: 'staging',
            repository: 'mc/escrow4337',
            workflow: 'Launch Candidate',
            runId: '301',
            runUrl: 'https://github.com/mc/escrow4337/actions/runs/301',
            candidateRunId: '101',
            candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
            commitSha: 'abc123',
            gitRef: 'main',
            deployedImageSha: 'sha256:deadbeef',
          },
          launchCandidate: {
            launchReady: true,
            smokeFailures: 0,
            seededCanaryFailures: 0,
            exactCanaryFailures: 0,
            marketplaceSeededCanaryFailures: 0,
            marketplaceExactCanaryFailures: 0,
            walkthroughCanaryFailures: 0,
            authorityEvidenceOk: true,
            authorityAuditSource: 'chain_projection',
            executionTraceCoverage: {
              executionCount: 8,
              traceCount: 8,
              correlationTaggedExecutions: 8,
              requestTaggedExecutions: 8,
              operationTaggedExecutions: 8,
              confirmedWithoutCorrelation: 0,
              missingTxHashes: [],
            },
            providerValidation: {
              failedProviders: [],
              warningProviders: [],
            },
            marketplaceOrigin: {
              ok: true,
              confirmedModes: ['seeded', 'exact'],
              missingModes: [],
              failedModes: [],
              exactLaneProof: {
                ok: true,
                clientSwitchedViaWorkspaceSwitcher: false,
                freelancerSwitchedViaWorkspaceSwitcher: true,
              },
            },
          },
          rollback: {},
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(launchReviewDir, 'promotion-record.md'), '# launch\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'provider-validation-summary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(launchReviewDir, 'summary.md'), '# summary\n', 'utf8');

    assert.deepEqual(
      validateReleaseDossierSourceDirectory({
        sourceKey: 'launchCandidateReview',
        sourceDir: launchReviewDir,
      }),
      [
        'Launch candidate promotion record status must be ready but was blocked.',
        'Launch evidence posture status ready does not match launch candidate promotion status blocked.',
      ],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierOutputDirectory reports missing generated output files explicitly', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const outputDir = resolve(root, 'out');
    mkdirSync(resolve(outputDir, 'evidence', 'api-image-manifest'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'deployed-smoke-review'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'launch-candidate-review'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'promotion-review'), { recursive: true });

    writeFileSync(resolve(outputDir, 'release-dossier.json'), '{}\n', 'utf8');
    writeFileSync(resolve(outputDir, 'release-dossier.md'), '# dossier\n', 'utf8');
    writeFileSync(resolve(outputDir, 'release-dossier-checksums.txt'), 'abc  file\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'api-image-manifest', 'manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'api-image-manifest', 'manifest.md'), '# image\n', 'utf8');
    writeFileSync(
      resolve(outputDir, 'evidence', 'deployed-smoke-review', 'deployed-smoke-record.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'deployed-smoke-review', 'deployed-smoke-record.md'),
      '# smoke\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'evidence-manifest.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'launch-evidence-posture.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-origin-summary.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-seeded-evidence.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-exact-evidence.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'promotion-record.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'promotion-record.md'),
      '# launch\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'provider-validation-summary.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(resolve(outputDir, 'evidence', 'promotion-review', 'promotion-review.json'), '{}\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'promotion-review', 'promotion-review.md'), '# review\n', 'utf8');

    assert.deepEqual(validateReleaseDossierOutputDirectory({ outputDir }), [
      'Release dossier output is missing required file evidence/launch-candidate-review/summary.md.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleaseDossierOutputDirectory reports semantic drift in copied evidence inventory', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-dossier-lib-'));

  try {
    const outputDir = resolve(root, 'out');
    mkdirSync(resolve(outputDir, 'evidence', 'api-image-manifest'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'deployed-smoke-review'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'launch-candidate-review'), { recursive: true });
    mkdirSync(resolve(outputDir, 'evidence', 'promotion-review'), { recursive: true });

    writeFileSync(
      resolve(outputDir, 'release-dossier.json'),
      `${JSON.stringify(
        {
          evidence: {
            fileCount: 0,
            totalBytes: 0,
            files: [],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(outputDir, 'release-dossier.md'), '# dossier\n', 'utf8');
    writeFileSync(resolve(outputDir, 'release-dossier-checksums.txt'), 'bad-checksum  wrong-file\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'api-image-manifest', 'manifest.json'), '{}\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'api-image-manifest', 'manifest.md'), '# image\n', 'utf8');
    writeFileSync(
      resolve(outputDir, 'evidence', 'deployed-smoke-review', 'deployed-smoke-record.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'deployed-smoke-review', 'deployed-smoke-record.md'),
      '# smoke\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'evidence-manifest.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'launch-evidence-posture.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-origin-summary.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-seeded-evidence.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'marketplace-exact-evidence.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'promotion-record.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'promotion-record.md'),
      '# launch\n',
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'evidence', 'launch-candidate-review', 'provider-validation-summary.json'),
      '{}\n',
      'utf8',
    );
    writeFileSync(resolve(outputDir, 'evidence', 'launch-candidate-review', 'summary.md'), '# summary\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'promotion-review', 'promotion-review.json'), '{}\n', 'utf8');
    writeFileSync(resolve(outputDir, 'evidence', 'promotion-review', 'promotion-review.md'), '# review\n', 'utf8');

    const issues = validateReleaseDossierOutputDirectory({ outputDir });
    assert.ok(
      issues.some((issue) =>
        issue.startsWith('Release dossier evidence file count 0 does not match actual evidence file count '),
      ),
    );
    assert.ok(
      issues.some((issue) =>
        issue.startsWith('Release dossier checksums text bad-checksum  wrong-file'),
      ),
    );
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
      status: 'blocked',
      metadata: {
        runId: '301',
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
      rollback: {
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'input',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'input',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
      launchCandidate: {
        authorityAuditSource: 'chain_projection',
        providerValidation: {
          failedProviders: [],
          warningProviders: ['paymaster'],
        },
        marketplaceOrigin: {
          ok: true,
          confirmedModes: ['seeded', 'exact'],
          missingModes: ['seeded'],
          failedModes: ['seeded'],
          exactLaneProof: {
            ok: false,
            clientSwitchedViaWorkspaceSwitcher: true,
            freelancerSwitchedViaWorkspaceSwitcher: false,
          },
        },
        executionTraceCoverage: {
          executionCount: 8,
          correlationTaggedExecutions: 8,
        },
      },
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: ['authority-evidence/summary.json'],
      },
    },
    launchEvidencePosture: {
      status: 'ready',
      authority: {
        auditSource: 'aggregate',
      },
      evidenceContract: {
        complete: true,
        requiredArtifactCount: 16,
        missingArtifactCount: 0,
      },
      providerValidation: {
        failureCount: 1,
        warningCount: 2,
      },
      marketplaceOrigin: {
        ok: false,
        confirmedModes: ['seeded'],
        missingModes: ['exact'],
        failedModes: ['exact'],
        exactLaneProof: {
          ok: true,
          clientSwitchedViaWorkspaceSwitcher: false,
          freelancerSwitchedViaWorkspaceSwitcher: true,
        },
      },
      executionTraceCoverage: {
        executionCount: 7,
        correlationTaggedExecutions: 6,
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
          selectionSource: 'artifact-search',
          runId: '201',
          artifactName: 'deployed-smoke-review-staging-candidate-999',
          seededCanaryPassed: true,
          marketplaceSeededCanaryPassed: true,
        },
        launchCandidate: {
          runId: '301',
          artifactName: 'launch-candidate-review-staging-candidate-101',
          evidenceComplete: true,
        },
      },
    },
  });

  assert.deepEqual(issues, [
    'Image manifest commit SHA abc123 does not match promotion review commit SHA wrong.',
    'Deployed smoke review artifact name deployed-smoke-review-staging-candidate-999 does not match deployed smoke review expected artifact name deployed-smoke-review-staging-candidate-101.',
    'Launch candidate rollback source input does not match launch candidate metadata rollback source release-pointer.',
    'Launch candidate rollback pointer selection source input does not match launch candidate metadata rollback pointer selection source artifact-search.',
    'Deployed smoke marketplace seeded canary passed false does not match promotion review deployed smoke marketplace seeded canary passed true.',
    'Release dossier deployed smoke review selection is missing artifact id for artifact-search selection.',
    'Release dossier deployed smoke review selection is missing selected timestamp for artifact-search selection.',
    'Release dossier launch evidence completeness disagrees with missing artifacts: authority-evidence/summary.json.',
    'Launch evidence posture status ready does not match launch candidate promotion status blocked.',
    'Launch evidence posture authority audit source aggregate does not match launch promotion authority audit source chain_projection.',
    'Launch evidence posture completeness true does not match launch evidence completeness false.',
    'Launch evidence posture missing artifact count 0 does not match launch evidence manifest missing artifact count 1.',
    'Launch evidence posture provider failure count 1 does not match launch promotion provider failure count 0.',
    'Launch evidence posture provider warning count 2 does not match launch promotion provider warning count 1.',
    'Launch evidence posture marketplace origin proof false does not match launch promotion marketplace origin proof true.',
    'Launch evidence posture exact marketplace lane proof true does not match launch promotion exact marketplace lane proof false.',
    'Launch evidence posture exact marketplace client lane workspace switch false does not match launch promotion exact marketplace client lane workspace switch true.',
    'Launch evidence posture exact marketplace freelancer lane workspace switch true does not match launch promotion exact marketplace freelancer lane workspace switch false.',
    'Launch evidence posture confirmed marketplace origin modes seeded does not match launch promotion confirmed marketplace origin modes exact, seeded.',
    'Launch evidence posture missing marketplace origin modes exact does not match launch promotion missing marketplace origin modes seeded.',
    'Launch evidence posture failed marketplace origin modes exact does not match launch promotion failed marketplace origin modes seeded.',
    'Launch evidence posture execution trace count 7 does not match launch promotion execution trace count 8.',
    'Launch evidence posture correlation-tagged execution count 6 does not match launch promotion correlation-tagged execution count 8.',
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
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
      launchCandidate: {
        authorityAuditSource: 'chain_projection',
        executionTraceCoverage: {
          executionCount: 8,
          traceCount: 8,
          correlationTaggedExecutions: 8,
          requestTaggedExecutions: 8,
          operationTaggedExecutions: 8,
          confirmedWithoutCorrelation: 0,
          missingTxHashes: [],
        },
        marketplaceOrigin: {
          ok: true,
          confirmedModes: ['seeded', 'exact'],
          missingModes: [],
          failedModes: [],
          exactLaneProof: {
            ok: true,
            clientSwitchedViaWorkspaceSwitcher: false,
            freelancerSwitchedViaWorkspaceSwitcher: true,
          },
        },
        marketplaceSeededCanaryFailures: 0,
        marketplaceExactCanaryFailures: 0,
      },
      rollback: {
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        total: 16,
        missing: [],
      },
    },
    launchEvidencePosture: {
      status: 'ready',
      authority: {
        ok: true,
        auditSource: 'chain_projection',
        jobId: 'job-123',
      },
      executionTraceCoverage: {
        executionCount: 8,
        traceCount: 8,
        correlationTaggedExecutions: 8,
        requestTaggedExecutions: 8,
        operationTaggedExecutions: 8,
        confirmedWithoutCorrelation: 0,
        missingTxHashes: [],
      },
      providerValidation: {
        ok: true,
        failureCount: 0,
        warningCount: 1,
        failedProviders: [],
        warningProviders: ['paymaster'],
      },
      evidenceContract: {
        requiredArtifactCount: 16,
        presentArtifactCount: 16,
        missingArtifactCount: 0,
        complete: true,
        missingArtifacts: [],
      },
      marketplaceOrigin: {
        ok: true,
        confirmedModes: ['seeded', 'exact'],
        missingModes: [],
        failedModes: [],
        jobIds: ['job-123'],
        opportunityIds: ['opp-1'],
        applicationIds: ['app-1'],
        exactLaneProof: {
          ok: true,
          clientSwitchedViaWorkspaceSwitcher: false,
          freelancerSwitchedViaWorkspaceSwitcher: true,
        },
      },
      rollback: {
        required: false,
        ready: true,
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
      observability: {
        daemonStatus: 'ok',
        daemonIssueCodes: [],
        alertDrillConfigured: true,
        alertDrillAttempted: true,
        alertDrillSent: false,
        alertDrillDryRun: true,
        alertDrillReason: null,
      },
      canaries: {
        smokeFailures: 0,
        seededCanaryFailures: 0,
        exactCanaryFailures: 0,
        marketplaceSeededCanaryFailures: 0,
        marketplaceExactCanaryFailures: 0,
        walkthroughCanaryFailures: 0,
      },
      blockers: [],
      warnings: [],
      launchReady: true,
      environment: 'staging',
      repository: 'mc/escrow4337',
      candidateRunId: '101',
      launchRunId: '301',
    },
    promotionReview: {
      status: 'ready',
      blockers: [],
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
      reviews: {
        deployedSmoke: {
          selectionSource: 'artifact-search',
          artifactId: '22',
          artifactName: 'deployed-smoke-review-staging-candidate-101',
          selectedCreatedAt: '2026-04-13T01:00:00Z',
        },
        launchCandidate: {
          selectionSource: 'input',
          artifactId: '12',
          artifactName: 'launch-candidate-review-staging-candidate-101',
          selectedCreatedAt: '2026-04-13T02:00:00Z',
        },
      },
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
  assert.equal(record.launchEvidence.rollbackPointerSelectionSource, 'artifact-search');
  assert.equal(record.launchEvidence.rollbackPointerArtifactId, '41');
  assert.equal(record.launchEvidence.executionTraceCoverage.executionCount, 8);
  assert.equal(record.launchEvidence.marketplaceOrigin.ok, true);
  assert.equal(record.launchEvidence.marketplaceOrigin.exactLaneProof.ok, true);
  assert.equal(record.launchEvidence.posture.status, 'ready');
  assert.equal(record.launchEvidence.posture.providerValidation.warningCount, 1);
  assert.equal(record.workflows.deployedSmoke.selectionSource, 'artifact-search');
  assert.equal(record.workflows.deployedSmoke.artifactId, '22');
  assert.equal(record.workflows.launchCandidate.selectionSource, 'input');
  assert.equal(record.workflows.launchCandidate.artifactId, '12');
  assert.equal(record.workflows.deployedSmoke.smokePassed, true);
  assert.equal(record.workflows.deployedSmoke.seededCanaryPassed, true);
  assert.equal(record.workflows.deployedSmoke.marketplaceSeededCanaryPassed, true);
  assert.equal(record.launchEvidence.marketplaceSeededCanaryFailures, 0);
  assert.equal(record.launchEvidence.marketplaceExactCanaryFailures, 0);
  assert.deepEqual(record.decision.warnings, [
    'Rollback image SHA is not yet recorded for this candidate.',
  ]);

  const markdown = buildReleaseDossierMarkdown(record);
  assert.ok(markdown.includes('Selection artifact ID: 22'));
  assert.ok(markdown.includes('Selection selected at: 2026-04-13T01:00:00Z'));
  assert.ok(markdown.includes('Selection artifact ID: 12'));
  assert.ok(markdown.includes('Selection selected at: 2026-04-13T02:00:00Z'));
  assert.ok(markdown.includes('Launch posture status: ready'));
  assert.ok(markdown.includes('Launch provider warnings: 1'));
  assert.ok(
    markdown.includes(
      'Launch exact marketplace lane proof: confirmed · client switched no · freelancer switched yes',
    ),
  );
});
