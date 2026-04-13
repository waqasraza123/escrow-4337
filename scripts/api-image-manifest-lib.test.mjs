import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiImageManifest,
  buildImageCandidateSelection,
  validateApiImageManifest,
} from './api-image-manifest-lib.mjs';

test('buildApiImageManifest normalizes tags and canonical references', () => {
  const manifest = buildApiImageManifest({
    repository: 'mc/escrow4337',
    workflow: 'CI',
    runId: '101',
    runAttempt: '2',
    runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
    eventName: 'push',
    gitRef: 'main',
    commitSha: 'abc123',
    imageName: 'ghcr.io/mc/escrow-4337-api',
    imageDigest: 'sha256:deadbeef',
    imageTags:
      'ghcr.io/mc/escrow-4337-api:sha-abc123\nghcr.io/mc/escrow-4337-api:main\n',
  });

  assert.deepEqual(manifest.image.tags, ['sha-abc123', 'main']);
  assert.equal(
    manifest.image.canonicalReference,
    'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
  );
});

test('validateApiImageManifest catches mismatched repository, commit, and run id', () => {
  const issues = validateApiImageManifest(
    {
      generatedAt: '2026-04-13T00:00:00.000Z',
      repository: 'other/repo',
      workflow: 'CI',
      runId: '101',
      runAttempt: '1',
      runUrl: 'https://github.com/other/repo/actions/runs/101',
      eventName: 'push',
      gitRef: 'main',
      commitSha: 'wrong',
      image: {
        name: 'ghcr.io/other/repo',
        digest: 'sha256:deadbeef',
        tags: ['main'],
      },
    },
    {
      expectedRepository: 'mc/escrow4337',
      expectedCommitSha: 'abc123',
      expectedRunId: '202',
    },
  );

  assert.deepEqual(issues, [
    'Image manifest repository other/repo does not match expected repository mc/escrow4337.',
    'Image manifest commit SHA wrong does not match expected commit SHA abc123.',
    'Image manifest run id 101 does not match expected run id 202.',
  ]);
});

test('buildImageCandidateSelection exposes commit and digest for downstream workflows', () => {
  const selection = buildImageCandidateSelection({
    repository: 'mc/escrow4337',
    workflow: 'CI',
    runId: '101',
    runAttempt: '1',
    runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
    gitRef: 'main',
    commitSha: 'abc123',
    image: {
      name: 'ghcr.io/mc/escrow-4337-api',
      digest: 'sha256:deadbeef',
      canonicalReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
      tags: ['sha-abc123', 'main'],
    },
  });

  assert.deepEqual(selection, {
    repository: 'mc/escrow4337',
    workflow: 'CI',
    runId: '101',
    runAttempt: '1',
    runUrl: 'https://github.com/mc/escrow4337/actions/runs/101',
    gitRef: 'main',
    commitSha: 'abc123',
    imageName: 'ghcr.io/mc/escrow-4337-api',
    imageDigest: 'sha256:deadbeef',
    imageReference: 'ghcr.io/mc/escrow-4337-api@sha256:deadbeef',
    imageTags: ['sha-abc123', 'main'],
  });
});
