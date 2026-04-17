import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReleasePointer,
  buildReleasePointerArtifactName,
  selectLatestReleasePointerArtifact,
  validateReleasePointer,
} from './release-pointer-lib.mjs';

test('buildReleasePointerArtifactName normalizes environment', () => {
  assert.equal(buildReleasePointerArtifactName('Production'), 'release-pointer-production');
});

test('buildReleasePointer requires a ready release dossier and carries rollback metadata', () => {
  const pointer = buildReleasePointer({
    releaseDossier: {
      metadata: {
        environment: 'production',
        repository: 'mc/escrow4337',
        runId: '701',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/701',
      },
      decision: {
        status: 'ready',
      },
      workflows: {
        deployedSmoke: {
          smokePassed: true,
          seededCanaryPassed: true,
          marketplaceSeededCanaryPassed: true,
          selectionSource: 'artifact-search',
          artifactId: '22',
          artifactName: 'deployed-smoke-review-production-candidate-101',
          selectedCreatedAt: '2026-04-13T01:00:00Z',
        },
        launchCandidate: {
          selectionSource: 'input',
          artifactId: '12',
          artifactName: 'launch-candidate-review-production-candidate-101',
          selectedCreatedAt: '2026-04-13T02:00:00Z',
        },
      },
      launchEvidence: {
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '651',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
        authorityAuditSource: 'chain_projection',
        marketplaceSeededCanaryFailures: 0,
        marketplaceExactCanaryFailures: 0,
      },
      candidate: {
        runId: '101',
        runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
        commitSha: 'abc123',
        imageDigest: 'sha256:deadbeef',
        imageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
        imageName: 'ghcr.io/mc/escrow-4337-api',
      },
    },
  });

  assert.equal(pointer.artifactName, 'release-pointer-production');
  assert.equal(pointer.imageDigest, 'sha256:deadbeef');
  assert.equal(pointer.releaseReviewRunId, '701');
  assert.equal(pointer.rollbackImageSha, 'sha256:old');
  assert.equal(pointer.rollbackSource, 'release-pointer');
  assert.equal(pointer.rollbackPointerRunId, '651');
  assert.equal(pointer.rollbackPointerArtifactName, 'release-pointer-staging');
  assert.equal(pointer.rollbackPointerSelectionSource, 'artifact-search');
  assert.equal(pointer.rollbackPointerArtifactId, '41');
  assert.equal(pointer.rollbackPointerSelectedCreatedAt, '2026-04-13T03:00:00Z');
  assert.equal(pointer.deployedSmokeMarketplaceSeededCanaryPassed, true);
  assert.equal(pointer.deployedSmokeSelectionSource, 'artifact-search');
  assert.equal(pointer.deployedSmokeArtifactId, '22');
  assert.equal(pointer.deployedSmokeArtifactName, 'deployed-smoke-review-production-candidate-101');
  assert.equal(pointer.deployedSmokeSelectedCreatedAt, '2026-04-13T01:00:00Z');
  assert.equal(pointer.launchCandidateSelectionSource, 'input');
  assert.equal(pointer.launchCandidateArtifactId, '12');
  assert.equal(pointer.launchCandidateArtifactName, 'launch-candidate-review-production-candidate-101');
  assert.equal(pointer.launchCandidateSelectedCreatedAt, '2026-04-13T02:00:00Z');
  assert.equal(pointer.launchMarketplaceSeededCanaryFailures, 0);
  assert.equal(pointer.launchMarketplaceExactCanaryFailures, 0);
  assert.equal(pointer.authorityAuditSource, 'chain_projection');
});

test('validateReleasePointer catches environment drift and invalid digests', () => {
  const issues = validateReleasePointer(
    {
      generatedAt: '2026-04-13T00:00:00.000Z',
      environment: 'staging',
      repository: 'mc/escrow4337',
      artifactName: 'release-pointer-prod',
      releaseReviewRunId: '701',
      releaseReviewRunUrl: 'https://github.com/mc/escrow4337/actions/runs/701',
      candidateRunId: '101',
      candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
      commitSha: 'abc123',
      imageDigest: 'deadbeef',
      imageReference: 'ghcr.io/mc/escrow-4337-api:main',
      rollbackSource: 'pointer',
      rollbackPointerSelectionSource: 'manual',
      deployedSmokeMarketplaceSeededCanaryPassed: 'true',
      deployedSmokeSelectionSource: 'manual',
      launchCandidateSelectionSource: 'manual',
      launchMarketplaceExactCanaryFailures: -1,
    },
    {
      expectedEnvironment: 'production',
    },
  );

  assert.deepEqual(issues, [
    'Release pointer image digest must start with sha256:.',
    'Release pointer artifact name release-pointer-prod does not match expected artifact name release-pointer-staging.',
    'Release pointer image reference must include the image digest when present.',
    'Release pointer environment staging does not match expected environment production.',
    'Release pointer rollback source must be input or release-pointer but was pointer.',
    'Release pointer rollback image SHA is required when rollback source is present.',
    'Release pointer rollback pointer selection source must be input or artifact-search when present.',
    'Release pointer deployed smoke marketplace seeded canary passed must be boolean when present.',
    'Release pointer launch marketplace exact canary failures must be a non-negative integer when present.',
    'Release pointer deployed smoke selection source must be input or artifact-search when present.',
    'Release pointer launch candidate selection source must be input or artifact-search when present.',
  ]);
});

test('validateReleasePointer requires rollback pointer artifact details for artifact-search selection', () => {
  const issues = validateReleasePointer({
    generatedAt: '2026-04-13T00:00:00.000Z',
    environment: 'production',
    repository: 'mc/escrow4337',
    artifactName: 'release-pointer-production',
    releaseReviewRunId: '701',
    releaseReviewRunUrl: 'https://github.com/mc/escrow4337/actions/runs/701',
    candidateRunId: '101',
    candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
    commitSha: 'abc123',
    imageDigest: 'sha256:deadbeef',
    rollbackImageSha: 'sha256:old',
    rollbackSource: 'release-pointer',
    rollbackPointerRunId: '651',
    rollbackPointerArtifactName: 'release-pointer-staging',
    rollbackPointerSelectionSource: 'artifact-search',
  });

  assert.deepEqual(issues, [
    'Release pointer rollback pointer artifact id is required for artifact-search selection.',
    'Release pointer rollback pointer selected timestamp is required for artifact-search selection.',
  ]);
});

test('validateReleasePointer requires review selection artifact details for artifact-search selection', () => {
  const issues = validateReleasePointer({
    generatedAt: '2026-04-13T00:00:00.000Z',
    environment: 'production',
    repository: 'mc/escrow4337',
    artifactName: 'release-pointer-production',
    releaseReviewRunId: '701',
    releaseReviewRunUrl: 'https://github.com/mc/escrow4337/actions/runs/701',
    candidateRunId: '101',
    candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
    commitSha: 'abc123',
    imageDigest: 'sha256:deadbeef',
    deployedSmokeSelectionSource: 'artifact-search',
    launchCandidateSelectionSource: 'artifact-search',
  });

  assert.deepEqual(issues, [
    'Release pointer deployed smoke artifact id is required for artifact-search selection.',
    'Release pointer deployed smoke selected timestamp is required for artifact-search selection.',
    'Release pointer launch candidate artifact id is required for artifact-search selection.',
    'Release pointer launch candidate selected timestamp is required for artifact-search selection.',
  ]);
});

test('validateReleasePointer can require ready marketplace launch posture', () => {
  const issues = validateReleasePointer(
    {
      generatedAt: '2026-04-13T00:00:00.000Z',
      environment: 'production',
      repository: 'mc/escrow4337',
      artifactName: 'release-pointer-production',
      releaseReviewRunId: '701',
      releaseReviewRunUrl: 'https://github.com/mc/escrow4337/actions/runs/701',
      candidateRunId: '101',
      candidateRunUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
      commitSha: 'abc123',
      imageDigest: 'sha256:deadbeef',
      imageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      rollbackImageSha: 'sha256:old',
      rollbackSource: null,
      deployedSmokePassed: true,
      deployedSmokeSeededCanaryPassed: false,
      deployedSmokeMarketplaceSeededCanaryPassed: false,
      launchMarketplaceSeededCanaryFailures: 1,
      launchMarketplaceExactCanaryFailures: 2,
      authorityAuditSource: 'aggregate',
    },
    {
      expectedEnvironment: 'production',
      requireReadyLaunchPosture: true,
    },
  );

  assert.deepEqual(issues, [
    'Release pointer does not confirm deployed smoke seeded canary passed.',
    'Release pointer does not confirm deployed smoke marketplace seeded canary passed.',
    'Release pointer reports launch marketplace seeded canary failures.',
    'Release pointer reports launch marketplace exact canary failures.',
    'Release pointer authority audit source must be chain_projection but was aggregate.',
    'Release pointer does not record rollback source.',
  ]);
});

test('selectLatestReleasePointerArtifact chooses newest non-expired pointer artifact', () => {
  const selection = selectLatestReleasePointerArtifact({
    environment: 'production',
    artifacts: [
      {
        id: 4,
        name: 'release-pointer-production',
        expired: false,
        created_at: '2026-04-12T00:00:00Z',
        workflow_run: {
          id: 701,
        },
      },
      {
        id: 5,
        name: 'release-pointer-production',
        expired: false,
        created_at: '2026-04-13T00:00:00Z',
        workflow_run: {
          id: 702,
        },
      },
    ],
  });

  assert.deepEqual(selection, {
    artifactId: 5,
    artifactName: 'release-pointer-production',
    runId: '702',
    source: 'artifact-search',
    createdAt: '2026-04-13T00:00:00Z',
  });
});
