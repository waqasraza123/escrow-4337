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
