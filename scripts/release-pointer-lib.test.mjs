import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReleasePointer,
  buildReleasePointerArtifactName,
  selectLatestReleasePointerArtifact,
  validateReleasePointer,
  validateReleasePointerOutputDirectory,
} from './release-pointer-lib.mjs';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

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
        posture: {
          status: 'ready',
          launchReady: true,
          blockers: [],
          warnings: ['paymaster readability degraded'],
          authority: {
            auditSource: 'chain_projection',
          },
          evidenceContract: {
            requiredArtifactCount: 20,
            missingArtifactCount: 0,
            complete: true,
          },
          providerValidation: {
            failureCount: 0,
            warningCount: 1,
          },
          executionTraceCoverage: {
            executionCount: 8,
            correlationTaggedExecutions: 8,
            requestTaggedExecutions: 8,
            operationTaggedExecutions: 8,
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
          canaries: {
            marketplaceSeededCanaryFailures: 0,
            marketplaceExactCanaryFailures: 0,
          },
          rollback: {
            rollbackImageSha: 'sha256:old',
            rollbackSource: 'release-pointer',
            rollbackPointerRunId: '651',
            rollbackPointerArtifactName: 'release-pointer-staging',
            rollbackPointerSelectionSource: 'artifact-search',
            rollbackPointerArtifactId: '41',
            rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
          },
        },
        rollbackImageSha: 'sha256:old',
        rollbackSource: 'release-pointer',
        rollbackPointerRunId: '651',
        rollbackPointerArtifactName: 'release-pointer-staging',
        rollbackPointerSelectionSource: 'artifact-search',
        rollbackPointerArtifactId: '41',
        rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
        authorityAuditSource: 'chain_projection',
        requiredArtifactCount: 19,
        missingArtifacts: [],
        executionTraceCoverage: {
          executionCount: 8,
          correlationTaggedExecutions: 8,
          requestTaggedExecutions: 8,
          operationTaggedExecutions: 8,
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
      promotionReview: {
        reviews: {
          launchCandidate: {
            providerValidationFailures: [],
            providerValidationWarnings: ['paymaster'],
          },
        },
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
  assert.equal(pointer.launchStatus, 'ready');
  assert.equal(pointer.launchReady, true);
  assert.equal(pointer.launchBlockerCount, 0);
  assert.equal(pointer.launchWarningCount, 1);
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
  assert.equal(pointer.launchRequiredArtifactCount, 20);
  assert.equal(pointer.launchMissingArtifactCount, 0);
  assert.equal(pointer.launchEvidenceComplete, true);
  assert.equal(pointer.launchProviderFailureCount, 0);
  assert.equal(pointer.launchProviderWarningCount, 1);
  assert.equal(pointer.launchExecutionTraceExecutionCount, 8);
  assert.equal(pointer.launchExecutionTraceCorrelationTaggedExecutions, 8);
  assert.equal(pointer.launchExecutionTraceRequestTaggedExecutions, 8);
  assert.equal(pointer.launchExecutionTraceOperationTaggedExecutions, 8);
  assert.equal(pointer.launchMarketplaceOriginOk, true);
  assert.deepEqual(pointer.launchMarketplaceOriginConfirmedModes, ['seeded', 'exact']);
  assert.deepEqual(pointer.launchMarketplaceOriginMissingModes, []);
  assert.deepEqual(pointer.launchMarketplaceOriginFailedModes, []);
  assert.equal(pointer.launchMarketplaceExactLaneProofOk, true);
  assert.equal(pointer.launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher, false);
  assert.equal(pointer.launchMarketplaceExactFreelancerLaneSwitchedViaWorkspaceSwitcher, true);
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
      launchStatus: 'pending',
      launchReady: 'true',
      launchBlockerCount: -1,
      launchEvidenceComplete: 'true',
      launchMarketplaceOriginOk: 'true',
      launchMarketplaceExactLaneProofOk: 'true',
      launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher: 'false',
      launchMarketplaceOriginConfirmedModes: ['seeded', ''],
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
    'Release pointer launch ready must be boolean when present.',
    'Release pointer launch marketplace exact canary failures must be a non-negative integer when present.',
    'Release pointer launch blocker count must be a non-negative integer when present.',
    'Release pointer deployed smoke selection source must be input or artifact-search when present.',
    'Release pointer launch candidate selection source must be input or artifact-search when present.',
    'Release pointer deployed smoke artifact name is required when selection source is present.',
    'Release pointer launch candidate artifact name is required when selection source is present.',
    'Release pointer launch status must be ready or blocked when present, but was pending.',
    'Release pointer launch evidence complete must be boolean when present.',
    'Release pointer launch marketplace origin ok must be boolean when present.',
    'Release pointer launch marketplace exact lane proof ok must be boolean when present.',
    'Release pointer launch marketplace exact client lane workspace switch must be boolean when present.',
    'Release pointer launch marketplace origin confirmed modes must be an array of non-empty strings when present.',
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

test('validateReleasePointerOutputDirectory reports missing generated output files explicitly', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-pointer-lib-'));

  try {
    writeFileSync(resolve(root, 'release-pointer.json'), '{}\n', 'utf8');

    assert.deepEqual(validateReleasePointerOutputDirectory({ outputDir: root }), [
      'Release pointer output is missing required file release-pointer.md.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateReleasePointerOutputDirectory reports semantic drift for a non-ready pointer', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'release-pointer-lib-'));

  try {
    writeFileSync(
      resolve(root, 'release-pointer.json'),
      `${JSON.stringify(
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
          launchStatus: 'ready',
          launchReady: false,
          launchBlockerCount: 0,
          launchWarningCount: 0,
          rollbackImageSha: 'sha256:old',
          rollbackSource: 'release-pointer',
          rollbackPointerRunId: '651',
          rollbackPointerArtifactName: 'release-pointer-staging',
          rollbackPointerSelectionSource: 'artifact-search',
          rollbackPointerArtifactId: '41',
          rollbackPointerSelectedCreatedAt: '2026-04-13T03:00:00Z',
          deployedSmokePassed: true,
          deployedSmokeSeededCanaryPassed: true,
          deployedSmokeMarketplaceSeededCanaryPassed: true,
          deployedSmokeSelectionSource: 'artifact-search',
          deployedSmokeArtifactId: '22',
          deployedSmokeArtifactName: 'deployed-smoke-review-production-candidate-101',
          deployedSmokeSelectedCreatedAt: '2026-04-13T01:00:00Z',
          launchCandidateSelectionSource: 'input',
          launchCandidateArtifactId: '12',
          launchCandidateArtifactName: 'launch-candidate-review-production-candidate-101',
          launchCandidateSelectedCreatedAt: '2026-04-13T02:00:00Z',
          launchMarketplaceSeededCanaryFailures: 0,
          launchMarketplaceExactCanaryFailures: 0,
          authorityAuditSource: 'chain_projection',
          launchRequiredArtifactCount: 20,
          launchMissingArtifactCount: 0,
          launchEvidenceComplete: true,
          launchProviderFailureCount: 0,
          launchProviderWarningCount: 0,
          launchExecutionTraceExecutionCount: 8,
          launchExecutionTraceCorrelationTaggedExecutions: 8,
          launchExecutionTraceRequestTaggedExecutions: 8,
          launchExecutionTraceOperationTaggedExecutions: 8,
          launchMarketplaceOriginOk: true,
          launchMarketplaceOriginConfirmedModes: ['seeded', 'exact'],
          launchMarketplaceOriginMissingModes: [],
          launchMarketplaceOriginFailedModes: [],
          launchMarketplaceExactLaneProofOk: true,
          launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher: false,
          launchMarketplaceExactFreelancerLaneSwitchedViaWorkspaceSwitcher: true,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(resolve(root, 'release-pointer.md'), '# pointer\n', 'utf8');

    assert.deepEqual(validateReleasePointerOutputDirectory({ outputDir: root }), [
      'Release pointer does not confirm launch ready posture.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    'Release pointer deployed smoke artifact name is required when selection source is present.',
    'Release pointer launch candidate artifact id is required for artifact-search selection.',
    'Release pointer launch candidate selected timestamp is required for artifact-search selection.',
    'Release pointer launch candidate artifact name is required when selection source is present.',
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
      launchStatus: 'blocked',
      launchReady: false,
      launchBlockerCount: 1,
      deployedSmokePassed: true,
      deployedSmokeSeededCanaryPassed: false,
      deployedSmokeMarketplaceSeededCanaryPassed: false,
      launchEvidenceComplete: false,
      launchMissingArtifactCount: 2,
      launchMarketplaceSeededCanaryFailures: 1,
      launchMarketplaceExactCanaryFailures: 2,
      authorityAuditSource: 'aggregate',
      launchMarketplaceOriginOk: false,
      launchMarketplaceExactLaneProofOk: false,
      launchMarketplaceOriginConfirmedModes: ['seeded'],
      launchMarketplaceOriginMissingModes: ['exact'],
      launchMarketplaceOriginFailedModes: ['seeded'],
    },
    {
      expectedEnvironment: 'production',
      requireReadyLaunchPosture: true,
    },
  );

  assert.deepEqual(issues, [
    'Release pointer launch status must be ready but was blocked.',
    'Release pointer does not confirm launch ready posture.',
    'Release pointer reports launch blockers.',
    'Release pointer does not confirm deployed smoke seeded canary passed.',
    'Release pointer does not confirm deployed smoke marketplace seeded canary passed.',
    'Release pointer reports launch marketplace seeded canary failures.',
    'Release pointer reports launch marketplace exact canary failures.',
    'Release pointer authority audit source must be chain_projection but was aggregate.',
    'Release pointer does not confirm launch evidence completeness.',
    'Release pointer reports missing launch evidence artifacts.',
    'Release pointer does not confirm marketplace origin proof.',
    'Release pointer does not confirm exact marketplace lane proof.',
    'Release pointer does not confirm both seeded and exact marketplace origin modes.',
    'Release pointer reports missing marketplace origin modes.',
    'Release pointer reports failed marketplace origin modes.',
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
