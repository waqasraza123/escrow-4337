import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeployedSmokeMetadata,
  buildDeployedSmokeRecord,
  buildPromotionReview,
  buildPromotionReviewMarkdown,
  validateDeployedSmokeMetadata,
  validateDeployedSmokeRecord,
} from './promotion-review-lib.mjs';

test('validateDeployedSmokeMetadata requires promotion review fields for GitHub runs', () => {
  const metadata = buildDeployedSmokeMetadata({
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: 'mc/escrow4337',
    GITHUB_WORKFLOW: 'Deployed Smoke',
    GITHUB_RUN_ID: '88',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_ACTOR: 'mc',
    DEPLOYED_SMOKE_ENVIRONMENT: 'staging',
    DEPLOYED_SMOKE_CANDIDATE_RUN_ID: '101',
    DEPLOYED_SMOKE_COMMIT_SHA: 'abc123',
    DEPLOYED_SMOKE_GIT_REF: 'main',
    DEPLOYED_SMOKE_DEPLOYED_IMAGE_SHA: 'sha256:deadbeef',
  });
  const issues = validateDeployedSmokeMetadata(metadata, {
    GITHUB_ACTIONS: 'true',
  });

  assert.deepEqual(issues, [
    'Deployed smoke metadata is missing run URL.',
    'Deployed smoke metadata is missing candidate run URL.',
  ]);
});

test('validateDeployedSmokeRecord catches mismatched environment and run ids', () => {
  const issues = validateDeployedSmokeRecord(
    buildDeployedSmokeRecord({
      metadata: {
        environment: 'production',
        repository: 'mc/escrow4337',
        workflow: 'Deployed Smoke',
        runId: '77',
        runAttempt: '1',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/77',
        actor: 'mc',
        candidateRunId: '100',
        candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/100',
        commitSha: 'abc123',
        gitRef: 'main',
        deployedImageSha: 'sha256:deadbeef',
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      },
    }),
    {
      expectedEnvironment: 'staging',
      expectedRepository: 'mc/escrow4337',
      expectedCandidateRunId: '101',
      expectedRunId: '88',
    },
  );

  assert.deepEqual(issues, [
    'Deployed smoke review environment production does not match expected environment staging.',
    'Deployed smoke review candidate run id 100 does not match expected candidate run id 101.',
    'Deployed smoke review run id 77 does not match expected run id 88.',
  ]);
});

test('validateDeployedSmokeRecord blocks when marketplace seeded canary evidence is missing', () => {
  const issues = validateDeployedSmokeRecord(
    buildDeployedSmokeRecord({
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
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      },
      marketplaceSeededCanaryPassed: false,
    }),
  );

  assert.deepEqual(issues, [
    'Deployed smoke review artifact status must be ready but was blocked.',
    'Deployed smoke review artifact does not confirm marketplace seeded canary passed.',
  ]);
});

test('buildPromotionReview reports cross-artifact mismatches and incomplete evidence', () => {
  const review = buildPromotionReview({
    expectedEnvironment: 'staging',
    expectedRepository: 'mc/escrow4337',
    expectedCandidateRunId: '101',
    expectedSmokeRunId: '201',
    expectedLaunchRunId: '301',
    deployedSmokeSelection: {
      source: 'artifact-search',
      artifactId: '22',
      artifactName: 'deployed-smoke-review-staging-candidate-101',
      createdAt: '2026-04-13T01:00:00Z',
    },
    launchCandidateSelection: {
      source: 'input',
      artifactId: '12',
      artifactName: 'launch-candidate-review-staging-candidate-101',
      createdAt: '2026-04-13T02:00:00Z',
    },
    imageManifest: {
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
        canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        tags: ['sha-abc123', 'main'],
      },
    },
    deployedSmokeRecord: buildDeployedSmokeRecord({
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
        deployedImageSha: 'sha256:badc0de',
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:badc0de',
      },
      marketplaceSeededCanaryPassed: false,
    }),
    launchPromotionRecord: {
      status: 'blocked',
      metadata: {
        environment: 'staging',
        repository: 'mc/escrow4337',
        workflow: 'Launch Candidate',
        runId: '301',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/301',
        candidateRunId: '101',
        candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
        commitSha: 'wrong',
        gitRef: 'main',
        deployedImageSha: 'sha256:deadbeef',
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
      },
      launchCandidate: {
        launchReady: false,
        smokeFailures: 1,
        seededCanaryFailures: 0,
        exactCanaryFailures: 0,
        marketplaceSeededCanaryFailures: 0,
        marketplaceExactCanaryFailures: 2,
        walkthroughCanaryFailures: 0,
        authorityEvidenceOk: false,
        authorityAuditSource: 'aggregate',
        marketplaceOrigin: {
          ok: false,
          exactLaneProof: {
            ok: false,
            clientSwitchedViaWorkspaceSwitcher: true,
            freelancerSwitchedViaWorkspaceSwitcher: false,
          },
          missingModes: ['seeded'],
          failedModes: ['exact'],
        },
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
      warnings: [],
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: ['authority-evidence/summary.json'],
        total: 20,
      },
    },
    launchEvidencePosture: {
      status: 'ready',
      launchReady: true,
      authority: {
        auditSource: 'aggregate',
      },
      providerValidation: {
        failureCount: 1,
        warningCount: 0,
      },
      evidenceContract: {
        complete: false,
        requiredArtifactCount: 21,
        missingArtifactCount: 1,
      },
      executionTraceCoverage: {
        executionCount: 2,
        correlationTaggedExecutions: 1,
      },
      marketplaceOrigin: {
        ok: false,
        exactLaneProof: {
          ok: true,
          clientSwitchedViaWorkspaceSwitcher: false,
          freelancerSwitchedViaWorkspaceSwitcher: true,
        },
        confirmedModes: ['exact'],
        missingModes: [],
        failedModes: ['seeded'],
      },
    },
  });

  assert.equal(review.status, 'blocked');
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record status must be ready but was blocked.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Candidate image manifest image digest sha256:deadbeef does not match deployed smoke review image digest sha256:badc0de.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Deployed smoke review artifact does not confirm marketplace seeded canary passed.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Candidate image manifest commit SHA abc123 does not match launch candidate review commit SHA wrong.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate evidence manifest is missing required artifacts: authority-evidence/summary.json.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record rollback source does not match launch metadata.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record rollback pointer selection source does not match launch metadata.',
    ),
  );
  assert.equal(review.reviews.deployedSmoke.selectionSource, 'artifact-search');
  assert.equal(review.reviews.launchCandidate.selectionSource, 'input');
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record reports marketplace exact canary failures.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record does not confirm marketplace origin evidence.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate promotion record is missing marketplace evidence modes: seeded.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture status ready does not match launch candidate promotion status blocked.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture required artifact count 21 does not match launch candidate evidence manifest required artifact count 20.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture failed marketplace origin modes ["seeded"] does not match launch candidate promotion failed marketplace origin modes ["exact"].',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture exact marketplace lane proof true does not match launch candidate promotion exact marketplace lane proof false.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture exact marketplace client lane switch false does not match launch candidate promotion exact marketplace client lane switch true.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch evidence posture exact marketplace freelancer lane switch true does not match launch candidate promotion exact marketplace freelancer lane switch false.',
    ),
  );
  const markdown = buildPromotionReviewMarkdown(review);
  assert.ok(
    markdown.includes(
      'Launch exact marketplace lane proof: blocked · client switched yes · freelancer switched no',
    ),
  );
});

test('buildPromotionReview requires artifact-search selections to include artifact details', () => {
  const review = buildPromotionReview({
    expectedEnvironment: 'staging',
    expectedRepository: 'mc/escrow4337',
    expectedCandidateRunId: '101',
    expectedSmokeRunId: '201',
    expectedLaunchRunId: '301',
    deployedSmokeSelection: {
      source: 'artifact-search',
    },
    launchCandidateSelection: {
      source: 'artifact-search',
    },
    imageManifest: {
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
        canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        tags: ['sha-abc123', 'main'],
      },
    },
    deployedSmokeRecord: buildDeployedSmokeRecord({
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
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      },
    }),
    launchPromotionRecord: {
      status: 'ready',
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
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
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
        marketplaceOrigin: {
          ok: true,
          confirmedModes: ['seeded', 'exact'],
          missingModes: [],
          failedModes: [],
        },
      },
      rollback: {},
      warnings: [],
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: [],
        total: 20,
      },
    },
    launchEvidencePosture: {
      status: 'ready',
      launchReady: true,
      blockers: [],
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
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
      },
    },
  });

  assert.ok(
    review.blockers.includes(
      'Deployed smoke review selection is missing artifact name when selection source is present.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Deployed smoke review selection is missing artifact id for artifact-search selection.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Deployed smoke review selection is missing selected timestamp for artifact-search selection.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate review selection is missing artifact name when selection source is present.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate review selection is missing artifact id for artifact-search selection.',
    ),
  );
  assert.ok(
    review.blockers.includes(
      'Launch candidate review selection is missing selected timestamp for artifact-search selection.',
    ),
  );
});

test('buildPromotionReview returns ready when manifest, smoke, and launch evidence agree', () => {
  const review = buildPromotionReview({
    expectedEnvironment: 'staging',
    expectedRepository: 'mc/escrow4337',
    expectedCandidateRunId: '101',
    expectedSmokeRunId: '201',
    expectedLaunchRunId: '301',
    deployedSmokeSelection: {
      source: 'artifact-search',
      artifactId: '22',
      artifactName: 'deployed-smoke-review-staging-candidate-101',
      createdAt: '2026-04-13T01:00:00Z',
    },
    launchCandidateSelection: {
      source: 'artifact-search',
      artifactId: '12',
      artifactName: 'launch-candidate-review-staging-candidate-101',
      createdAt: '2026-04-13T02:00:00Z',
    },
    imageManifest: {
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
        canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        tags: ['sha-abc123', 'main'],
      },
    },
    deployedSmokeRecord: buildDeployedSmokeRecord({
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
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      },
    }),
    launchPromotionRecord: {
      status: 'ready',
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
        deployedImageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
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
        marketplaceOrigin: {
          ok: true,
          confirmedModes: ['seeded', 'exact'],
          missingModes: [],
          failedModes: [],
        },
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
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: [],
        total: 20,
      },
    },
    launchEvidencePosture: {
      status: 'ready',
      launchReady: true,
      blockers: [],
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
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
      },
    },
  });

  assert.equal(review.status, 'ready');
  assert.deepEqual(review.blockers, []);
  assert.equal(review.reviews.deployedSmoke.selectionSource, 'artifact-search');
  assert.equal(review.reviews.deployedSmoke.artifactName, 'deployed-smoke-review-staging-candidate-101');
  assert.equal(review.reviews.launchCandidate.selectionSource, 'artifact-search');
  assert.equal(review.reviews.launchCandidate.artifactName, 'launch-candidate-review-staging-candidate-101');
  assert.equal(review.reviews.launchCandidate.rollbackSource, 'release-pointer');
  assert.equal(review.reviews.launchCandidate.rollbackPointerRunId, '701');
  assert.equal(review.reviews.launchCandidate.rollbackPointerSelectionSource, 'artifact-search');
  assert.equal(review.reviews.deployedSmoke.marketplaceSeededCanaryPassed, true);
  assert.equal(review.reviews.launchCandidate.marketplaceSeededCanaryPassed, true);
  assert.equal(review.reviews.launchCandidate.marketplaceExactCanaryPassed, true);
  assert.equal(review.reviews.launchCandidate.postureStatus, 'ready');
  assert.equal(review.reviews.launchCandidate.providerFailureCount, 0);
  assert.equal(review.reviews.launchCandidate.requiredArtifactCount, 20);
  assert.equal(review.reviews.launchCandidate.executionTraceCoverage.executionCount, 8);
  assert.equal(review.reviews.launchCandidate.marketplaceOrigin.ok, true);
  assert.deepEqual(review.warnings, ['Rollback image SHA is not yet recorded for this candidate.']);
});

test('buildPromotionReviewMarkdown surfaces canonical launch posture details', () => {
  const markdown = buildPromotionReviewMarkdown({
    generatedAt: '2026-04-13T04:00:00.000Z',
    status: 'ready',
    environment: 'staging',
    candidate: {
      repository: 'mc/escrow4337',
      runId: '101',
      runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
      commitSha: 'abc123',
      imageDigest: 'sha256:deadbeef',
      imageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
    },
    reviews: {
      deployedSmoke: {
        runId: '201',
        status: 'ready',
        selectionSource: 'artifact-search',
        artifactName: 'deployed-smoke-review-staging-candidate-101',
        artifactId: '22',
        selectedCreatedAt: '2026-04-13T01:00:00Z',
        seededCanaryPassed: true,
        marketplaceSeededCanaryPassed: true,
      },
      launchCandidate: {
        runId: '301',
        status: 'ready',
        postureStatus: 'ready',
        selectionSource: 'artifact-search',
        artifactName: 'launch-candidate-review-staging-candidate-101',
        artifactId: '12',
        selectedCreatedAt: '2026-04-13T02:00:00Z',
        postureLaunchReady: true,
        postureBlockerCount: 0,
        postureWarningCount: 1,
        evidenceComplete: true,
        requiredArtifactCount: 20,
        missingArtifactCount: 0,
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '701',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
        marketplaceSeededCanaryPassed: true,
        marketplaceExactCanaryPassed: true,
        authorityAuditSource: 'chain_projection',
        providerFailureCount: 0,
        providerWarningCount: 1,
        executionTraceCoverage: {
          correlationTaggedExecutions: 8,
          executionCount: 8,
        },
        marketplaceOrigin: {
          ok: true,
        },
      },
    },
    blockers: [],
    warnings: [],
  });

  assert.match(markdown, /Launch posture status: ready/);
  assert.match(markdown, /Launch provider warning count: 1/);
  assert.match(markdown, /Launch required artifact count: 20/);
});
