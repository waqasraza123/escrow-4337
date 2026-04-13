import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReviewArtifactName,
  resolvePromotionReviewSelections,
  selectLatestArtifactRun,
} from './release-review-selection-lib.mjs';

test('buildReviewArtifactName normalizes kind environment and candidate run id', () => {
  assert.equal(
    buildReviewArtifactName({
      kind: 'launch-candidate-review',
      environment: 'Staging',
      candidateRunId: '101',
    }),
    'launch-candidate-review-staging-candidate-101',
  );
});

test('selectLatestArtifactRun chooses newest non-expired matching artifact', () => {
  const selection = selectLatestArtifactRun({
    label: 'deployed smoke review',
    artifactName: 'deployed-smoke-review-staging-candidate-101',
    artifacts: [
      {
        id: 1,
        name: 'deployed-smoke-review-staging-candidate-101',
        expired: false,
        created_at: '2026-04-12T00:00:00Z',
        workflow_run: {
          id: 201,
        },
      },
      {
        id: 2,
        name: 'deployed-smoke-review-staging-candidate-101',
        expired: false,
        created_at: '2026-04-13T00:00:00Z',
        workflow_run: {
          id: 202,
        },
      },
      {
        id: 3,
        name: 'deployed-smoke-review-staging-candidate-101',
        expired: true,
        created_at: '2026-04-14T00:00:00Z',
        workflow_run: {
          id: 203,
        },
      },
    ],
  });

  assert.deepEqual(selection, {
    artifactId: 2,
    artifactName: 'deployed-smoke-review-staging-candidate-101',
    runId: '202',
    source: 'artifact-search',
    createdAt: '2026-04-13T00:00:00Z',
  });
});

test('resolvePromotionReviewSelections uses provided run ids and computed artifact names', () => {
  const selection = resolvePromotionReviewSelections({
    environment: 'production',
    candidateRunId: '404',
    deployedSmokeRunId: '501',
    launchCandidateRunId: '601',
  });

  assert.deepEqual(selection, {
    environment: 'production',
    candidateRunId: '404',
    deployedSmoke: {
      artifactName: 'deployed-smoke-review-production-candidate-404',
      runId: '501',
      source: 'input',
    },
    launchCandidate: {
      artifactName: 'launch-candidate-review-production-candidate-404',
      runId: '601',
      source: 'input',
    },
  });
});

test('resolvePromotionReviewSelections auto-discovers matching review artifacts', () => {
  const selection = resolvePromotionReviewSelections({
    environment: 'staging',
    candidateRunId: '101',
    artifacts: [
      {
        id: 12,
        name: 'launch-candidate-review-staging-candidate-101',
        expired: false,
        created_at: '2026-04-13T02:00:00Z',
        workflow_run: {
          id: 301,
        },
      },
      {
        id: 22,
        name: 'deployed-smoke-review-staging-candidate-101',
        expired: false,
        created_at: '2026-04-13T01:00:00Z',
        workflow_run: {
          id: 201,
        },
      },
    ],
  });

  assert.equal(selection.deployedSmoke.runId, '201');
  assert.equal(selection.deployedSmoke.artifactName, 'deployed-smoke-review-staging-candidate-101');
  assert.equal(selection.launchCandidate.runId, '301');
  assert.equal(
    selection.launchCandidate.artifactName,
    'launch-candidate-review-staging-candidate-101',
  );
});
