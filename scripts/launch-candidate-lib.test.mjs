import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildEvidenceManifest,
  buildPromotionRecord,
  buildLaunchMetadata,
  evaluatePromotionReadiness,
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
    LAUNCH_CANDIDATE_CANDIDATE_RUN_ID: '44',
    LAUNCH_CANDIDATE_CANDIDATE_RUN_URL:
      'https://github.com/mc/escrow4337/actions/runs/44',
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
    writeFileSync(resolve(root, 'chain-sync-daemon-health.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'chain-sync-daemon-alert-dry-run.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'runtime-profile.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'launch-readiness.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'smoke-deployed.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-seeded-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-exact-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-marketplace-seeded-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-marketplace-exact-canary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-walkthrough.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'deployed-authority-evidence.json'), '{}\n', 'utf8');
    mkdirSync(resolve(root, 'authority-evidence'), {
      recursive: true,
    });
    writeFileSync(resolve(root, 'authority-evidence', 'summary.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'promotion-record.json'), '{}\n', 'utf8');
    writeFileSync(resolve(root, 'promotion-record.md'), '# promotion\n', 'utf8');

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

    assert.equal(manifest.requiredArtifacts.total, 15);
    assert.deepEqual(manifest.requiredArtifacts.missing, []);
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

test('evaluatePromotionReadiness requires rollback metadata for production and alert posture for required daemon', () => {
  const readiness = evaluatePromotionReadiness({
    metadata: {
      environment: 'production',
      rollbackImageSha: null,
    },
    runtimeProfile: {
      operations: {
        chainSyncDaemon: {
          required: true,
        },
      },
    },
    daemonHealth: {
      status: 'ok',
    },
    daemonAlertDrill: {
      notification: {
        configured: false,
        dryRun: true,
        reason: 'webhook_unconfigured',
      },
    },
    evidenceManifest: {
      requiredArtifacts: {
        missing: [],
      },
    },
    launchBlockers: [],
  });

  assert.equal(readiness.status, 'blocked');
  assert.deepEqual(readiness.blockers, [
    'Production promotion requires a designated rollback image SHA.',
    'Daemon alert drill did not confirm configured alert delivery posture.',
    'Daemon alert drill reports webhook delivery is unconfigured.',
  ]);
});

test('buildPromotionRecord summarizes launch, rollback, and observability posture', () => {
  const record = buildPromotionRecord({
    metadata: {
      environment: 'staging',
      deployedImageSha: 'sha256:new',
      rollbackImageSha: null,
    },
    runtimeProfile: {
      operations: {
        chainSyncDaemon: {
          required: true,
          alertingConfigured: true,
          alertMinSeverity: 'warning',
          alertSendRecovery: true,
          alertResendIntervalSeconds: 900,
        },
      },
    },
    daemonHealth: {
      status: 'ok',
      summary: 'healthy',
    },
    daemonAlertDrill: {
      notification: {
        configured: true,
        attempted: false,
        sent: false,
        dryRun: true,
        event: null,
        severity: null,
        reason: 'no_active_alert',
        webhookResponseStatus: null,
      },
    },
    evidenceManifest: {
      requiredArtifacts: {
        total: 15,
        present: Array.from({ length: 15 }, (_, index) => `artifact-${index}`),
        missing: [],
      },
      incidents: [],
    },
    summary: {
      launchReadiness: {
        ready: true,
        warnings: [],
      },
      blockers: [],
      smoke: {
        failed: 0,
      },
      seededCanary: {
        failed: 0,
      },
      exactCanary: {
        failed: 0,
      },
      marketplaceSeededCanary: {
        failed: 0,
      },
      marketplaceExactCanary: {
        failed: 0,
      },
      walkthroughCanary: {
        failed: 0,
      },
      authorityEvidence: {
        ok: true,
        auditSource: 'chain_projection',
      },
    },
    promotionReadiness: {
      status: 'ready',
      blockers: [],
      warnings: ['Rollback image SHA is not yet recorded for this candidate.'],
    },
  });

  assert.equal(record.status, 'ready');
  assert.equal(record.rollback.ready, true);
  assert.equal(record.observability.alertDrill.configured, true);
  assert.equal(record.evidence.presentArtifactCount, 15);
  assert.deepEqual(record.warnings, ['Rollback image SHA is not yet recorded for this candidate.']);
});
