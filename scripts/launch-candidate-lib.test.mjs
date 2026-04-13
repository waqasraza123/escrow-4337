import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildEvidenceManifest,
  buildLaunchMetadata,
  validateIncidentPlaybook,
  validateLaunchMetadata,
} from './launch-candidate-lib.mjs';

test('validateIncidentPlaybook rejects duplicate ids, unknown severities, and invalid evidence paths', () => {
  const issues = validateIncidentPlaybook({
    severities: [
      {
        id: 'critical',
        summary: 'Critical severity',
      },
      {
        id: 'critical',
        summary: 'Duplicate critical severity',
      },
    ],
    incidents: [
      {
        id: 'operator_authority_gap',
        severity: 'missing',
        owner: 'operator',
        summary: 'Operator authority unavailable',
        rollback: 'Hold promotion',
        evidence: ['../escape.json'],
      },
      {
        id: 'operator_authority_gap',
        severity: 'critical',
        owner: '',
        summary: '',
        rollback: '',
        evidence: [],
      },
    ],
  });

  assert.ok(issues.includes('Severity critical is duplicated.'));
  assert.ok(
    issues.includes('Incident operator_authority_gap references unknown severity missing.'),
  );
  assert.ok(
    issues.includes(
      'Incident operator_authority_gap has an invalid evidence artifact path: ../escape.json.',
    ),
  );
  assert.ok(issues.includes('Incident operator_authority_gap is duplicated.'));
});

test('validateLaunchMetadata requires promotion metadata for GitHub runs', () => {
  const metadata = buildLaunchMetadata({
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: 'mc/escrow4337',
    GITHUB_WORKFLOW: 'Launch Candidate',
    GITHUB_RUN_ID: '12',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_SHA: 'abc123',
    GITHUB_REF_NAME: 'main',
    GITHUB_ACTOR: 'mc',
    LAUNCH_CANDIDATE_ENVIRONMENT: 'staging',
  });
  const issues = validateLaunchMetadata(metadata, {
    GITHUB_ACTIONS: 'true',
  });

  assert.deepEqual(issues, [
    'Launch candidate metadata is missing run URL.',
    'Launch candidate metadata is missing deployed image SHA.',
  ]);
});

test('buildEvidenceManifest reports missing artifacts and incident evidence coverage', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'launch-candidate-lib-'));

  try {
    writeFileSync(resolve(root, 'deployment-validation.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'runtime-profile.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'launch-readiness.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'smoke-deployed.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-seeded-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-exact-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-walkthrough.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-authority-evidence.json'), '{}\n', 'utf8');
    mkdirSync(resolve(root, 'authority-evidence'), {
      recursive: true,
    });
    writeFileSync(resolve(root, 'authority-evidence', 'summary.json'), '{}\n', 'utf8');

    const manifest = buildEvidenceManifest({
      artifactsDir: root,
      repoRoot: root,
      metadata: {
        environment: 'staging',
      },
      playbook: {
        incidents: [
          {
            id: 'operator_authority_gap',
            owner: 'operator',
            severity: 'critical',
            evidence: ['launch-readiness.json', 'authority-evidence/summary.json'],
          },
        ],
      },
    });

    assert.equal(manifest.requiredArtifacts.total, 10);
    assert.ok(manifest.requiredArtifacts.missing.includes('chain-sync-daemon-health.json'));
    assert.deepEqual(manifest.incidents, [
      {
        id: 'operator_authority_gap',
        owner: 'operator',
        severity: 'critical',
        presentEvidence: ['authority-evidence/summary.json', 'launch-readiness.json'],
        missingEvidence: [],
      },
    ]);
    assert.ok(manifest.producedArtifacts.includes('authority-evidence/summary.json'));
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
