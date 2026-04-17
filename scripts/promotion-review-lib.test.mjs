import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeployedSmokeMetadata,
  buildDeployedSmokeRecord,
  buildPromotionReview,
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
      },
      warnings: [],
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: ['authority-evidence/summary.json'],
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
      'Launch candidate promotion record reports marketplace exact canary failures.',
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
      },
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
    },
    launchEvidenceManifest: {
      requiredArtifacts: {
        missing: [],
      },
    },
  });

  assert.equal(review.status, 'ready');
  assert.deepEqual(review.blockers, []);
  assert.equal(review.reviews.deployedSmoke.marketplaceSeededCanaryPassed, true);
  assert.equal(review.reviews.launchCandidate.marketplaceSeededCanaryPassed, true);
  assert.equal(review.reviews.launchCandidate.marketplaceExactCanaryPassed, true);
  assert.deepEqual(review.warnings, ['Rollback image SHA is not yet recorded for this candidate.']);
});
