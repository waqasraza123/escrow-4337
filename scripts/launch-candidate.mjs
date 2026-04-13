import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';
import { assertRequiredDeployedFlowEnv } from './deployed-flow-env.mjs';
import {
  buildEvidenceManifest,
  buildPromotionMarkdown,
  buildPromotionRecord,
  buildLaunchMetadata,
  buildSummaryMarkdown,
  evaluatePromotionReadiness,
  validateIncidentPlaybook,
  validateLaunchMetadata,
  writeGitHubStepSummary,
} from './launch-candidate-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`Usage: pnpm launch:candidate [--artifacts-dir <path>]

Runs the deployed launch-candidate gate, captures evidence artifacts under
artifacts/launch-candidate by default, and exits non-zero on launch blockers.`);
  process.exit(0);
}

const artifactsDir = readArtifactsDir(args);

loadOptionalEnv('.env.e2e.deployed');

const apiBaseUrl = readRequiredEnv('PLAYWRIGHT_DEPLOYED_API_BASE_URL');
const expectLaunchReady =
  process.env.PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY?.trim().toLowerCase() !== 'false';
const launchMetadata = buildLaunchMetadata(process.env);

mkdirSync(artifactsDir, {
  recursive: true,
});

async function main() {
  const incidentPlaybook = readIncidentPlaybook();
  const incidentOwnershipIssues = validateIncidentPlaybook(incidentPlaybook);
  if (incidentOwnershipIssues.length > 0) {
    const error = [
      'Launch candidate is blocked because the incident playbook is incomplete.',
      ...incidentOwnershipIssues.map((issue) => `- ${issue}`),
    ].join('\n');
    writeFileSync(resolve(artifactsDir, 'incident-playbook-validation.txt'), `${error}\n`, 'utf8');
    throw new Error(error);
  }

  const metadataIssues = validateLaunchMetadata(launchMetadata, process.env);
  if (metadataIssues.length > 0) {
    const error = [
      'Launch candidate is blocked because the promotion metadata is incomplete.',
      ...metadataIssues.map((issue) => `- ${issue}`),
    ].join('\n');
    writeFileSync(resolve(artifactsDir, 'launch-metadata-validation.txt'), `${error}\n`, 'utf8');
    throw new Error(error);
  }

  assertRequiredDeployedFlowEnv();

  await runLoggedCommand(
    'verify-ci',
    ['pnpm', 'verify:ci'],
    resolve(artifactsDir, 'verify-ci.log'),
  );
  await runLoggedCommand(
    'api-build',
    ['pnpm', '--filter', 'escrow4334-api', 'build'],
    resolve(artifactsDir, 'api-build.log'),
  );
  await runLoggedCommand(
    'db-migrate-status',
    ['pnpm', '--filter', 'escrow4334-api', 'db:migrate:status'],
    resolve(artifactsDir, 'db-migrate-status.log'),
  );

  const deploymentValidation = await runJsonCommand(
    'deployment-validate',
    [
      'pnpm',
      '--filter',
      'escrow4334-api',
      'exec',
      'node',
      './scripts/run-built-cli.mjs',
      'dist/modules/operations/deployment-validation-runner.js',
    ],
    resolve(artifactsDir, 'deployment-validation.raw.log'),
    resolve(artifactsDir, 'deployment-validation.json'),
  );

  const daemonHealth = await runJsonCommand(
    'chain-sync-daemon-health',
    [
      'pnpm',
      '--filter',
      'escrow4334-api',
      'exec',
      'node',
      './scripts/run-built-cli.mjs',
      'dist/modules/operations/escrow-chain-sync-daemon-health-runner.js',
      '--fail-on',
      'never',
    ],
    resolve(artifactsDir, 'chain-sync-daemon-health.raw.log'),
    resolve(artifactsDir, 'chain-sync-daemon-health.json'),
  );
  const daemonAlertDryRun = await runJsonCommand(
    'chain-sync-daemon-alert-dry-run',
    [
      'pnpm',
      '--filter',
      'escrow4334-api',
      'exec',
      'node',
      './scripts/run-built-cli.mjs',
      'dist/modules/operations/escrow-chain-sync-daemon-health-runner.js',
      '--dry-run',
      '--fail-on',
      'never',
    ],
    resolve(artifactsDir, 'chain-sync-daemon-alert-dry-run.raw.log'),
    resolve(artifactsDir, 'chain-sync-daemon-alert-dry-run.json'),
  );

  const runtimeProfile = await fetchJsonArtifact(
    new URL('/operations/runtime-profile', apiBaseUrl).toString(),
    resolve(artifactsDir, 'runtime-profile.json'),
  );
  const launchReadiness = await fetchJsonArtifact(
    new URL('/operations/launch-readiness', apiBaseUrl).toString(),
    resolve(artifactsDir, 'launch-readiness.json'),
  );

  const smokeReport = await runJsonCommand(
    'smoke-deployed',
    ['pnpm', 'exec', 'playwright', 'test'],
    resolve(artifactsDir, 'smoke-deployed.raw.log'),
    resolve(artifactsDir, 'smoke-deployed.json'),
    {
      PLAYWRIGHT_PROFILE: 'deployed',
      PLAYWRIGHT_REPORTER: 'json',
      PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY: expectLaunchReady ? 'true' : 'false',
    },
  );
  const seededCanaryReport = await runJsonCommand(
    'deployed-seeded-canary',
    ['pnpm', 'e2e:canary:deployed'],
    resolve(artifactsDir, 'deployed-seeded-canary.raw.log'),
    resolve(artifactsDir, 'deployed-seeded-canary.json'),
    {
      PLAYWRIGHT_REPORTER: 'json',
      PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY: expectLaunchReady ? 'true' : 'false',
    },
  );
  const exactCanaryReport = await runJsonCommand(
    'deployed-exact-canary',
    ['pnpm', 'e2e:canary:deployed:exact'],
    resolve(artifactsDir, 'deployed-exact-canary.raw.log'),
    resolve(artifactsDir, 'deployed-exact-canary.json'),
    {
      PLAYWRIGHT_REPORTER: 'json',
      PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY: expectLaunchReady ? 'true' : 'false',
    },
  );
  const walkthroughCanaryReport = await runJsonCommand(
    'deployed-walkthrough',
    ['pnpm', 'e2e:walkthrough:deployed'],
    resolve(artifactsDir, 'deployed-walkthrough.raw.log'),
    resolve(artifactsDir, 'deployed-walkthrough.json'),
    {
      PLAYWRIGHT_REPORTER: 'json',
      PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY: expectLaunchReady ? 'true' : 'false',
    },
  );
  const authorityEvidence = await runJsonCommand(
    'deployed-authority-evidence',
    [
      'node',
      './scripts/deployed-authority-evidence.mjs',
      '--artifacts-dir',
      resolve(artifactsDir, 'authority-evidence'),
    ],
    resolve(artifactsDir, 'deployed-authority-evidence.raw.log'),
    resolve(artifactsDir, 'deployed-authority-evidence.json'),
  );

  const smokeSummary = summarizePlaywrightReport(smokeReport);
  const seededCanarySummary = summarizePlaywrightReport(seededCanaryReport);
  const exactCanarySummary = summarizePlaywrightReport(exactCanaryReport);
  const walkthroughCanarySummary = summarizePlaywrightReport(walkthroughCanaryReport);
  writeFileSync(
    resolve(artifactsDir, 'promotion-record.json'),
    `${JSON.stringify({ status: 'pending' }, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(resolve(artifactsDir, 'promotion-record.md'), '# Promotion Record\n\nPending.\n', 'utf8');
  let evidenceManifest = buildEvidenceManifest({
    artifactsDir,
    playbook: incidentPlaybook,
    metadata: launchMetadata,
    repoRoot,
  });
  let blockers = collectBlockers({
    deploymentValidation,
    daemonHealth,
    daemonAlertDryRun,
    runtimeProfile,
    launchReadiness,
    expectLaunchReady,
    smokeSummary,
    seededCanarySummary,
    exactCanarySummary,
    walkthroughCanarySummary,
    authorityEvidence,
    evidenceManifest,
  });
  let summary = {
    generatedAt: new Date().toISOString(),
    artifactsDir,
    expectLaunchReady,
    launchMetadata,
    incidentPlaybook: {
      file: 'docs/incident-playbook.json',
      incidentCount: incidentPlaybook.incidents.length,
      ownerCount: uniqueCount(incidentPlaybook.incidents.map((incident) => incident.owner)),
    },
    deploymentValidation: {
      ok: deploymentValidation.ok,
      failedChecks: deploymentValidation.checks
        .filter((check) => check.status === 'failed')
        .map((check) => check.id),
      warningChecks: deploymentValidation.checks
        .filter((check) => check.status === 'warning')
        .map((check) => check.id),
    },
    daemonHealth: {
      status: daemonHealth.status,
      summary: daemonHealth.summary,
      issueCodes: daemonHealth.issues.map((issue) => issue.code),
    },
    daemonAlertDrill: {
      configured: daemonAlertDryRun.notification?.configured === true,
      attempted: daemonAlertDryRun.notification?.attempted === true,
      sent: daemonAlertDryRun.notification?.sent === true,
      dryRun: daemonAlertDryRun.notification?.dryRun === true,
      event: daemonAlertDryRun.notification?.event ?? null,
      reason: daemonAlertDryRun.notification?.reason ?? null,
    },
    runtimeProfile: {
      profile: runtimeProfile.profile,
      providers: runtimeProfile.providers,
      warnings: runtimeProfile.warnings,
    },
    launchReadiness: {
      ready: launchReadiness.ready,
      blockers: launchReadiness.blockers,
      warnings: launchReadiness.warnings,
    },
    smoke: smokeSummary,
    seededCanary: seededCanarySummary,
    exactCanary: exactCanarySummary,
    walkthroughCanary: walkthroughCanarySummary,
    authorityEvidence: {
      ok: authorityEvidence.ok,
      jobId: authorityEvidence.jobId,
      syncAttempts: authorityEvidence.syncAttempts,
      auditSource: authorityEvidence.authority.source,
      ingestionStatus: authorityEvidence.ingestion.status,
      exportSources: {
        jobHistory: authorityEvidence.exports.jobHistoryAuthoritySource,
        disputeCase: authorityEvidence.exports.disputeCaseAuthoritySource,
      },
    },
    evidenceContract: {
      requiredArtifactCount: evidenceManifest.requiredArtifacts.total,
      presentArtifactCount: evidenceManifest.requiredArtifacts.present.length,
      producedArtifactCount: evidenceManifest.producedArtifacts.length,
      missingArtifacts: evidenceManifest.requiredArtifacts.missing,
      incidents: evidenceManifest.incidents,
    },
    blockers,
  };
  let promotionReadiness = evaluatePromotionReadiness({
    metadata: launchMetadata,
    runtimeProfile,
    daemonHealth,
    daemonAlertDrill,
    evidenceManifest,
    launchBlockers: blockers,
  });
  const promotionRecord = buildPromotionRecord({
    metadata: launchMetadata,
    runtimeProfile,
    daemonHealth,
    daemonAlertDrill,
    evidenceManifest,
    summary,
    promotionReadiness,
  });
  writeFileSync(
    resolve(artifactsDir, 'promotion-record.json'),
    `${JSON.stringify(promotionRecord, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(
    resolve(artifactsDir, 'promotion-record.md'),
    buildPromotionMarkdown(promotionRecord),
    'utf8',
  );
  evidenceManifest = buildEvidenceManifest({
    artifactsDir,
    playbook: incidentPlaybook,
    metadata: launchMetadata,
    repoRoot,
  });
  writeFileSync(
    resolve(artifactsDir, 'evidence-manifest.json'),
    `${JSON.stringify(evidenceManifest, null, 2)}\n`,
    'utf8',
  );
  promotionReadiness = evaluatePromotionReadiness({
    metadata: launchMetadata,
    runtimeProfile,
    daemonHealth,
    daemonAlertDrill,
    evidenceManifest,
    launchBlockers: blockers,
  });
  blockers = collectBlockers({
    deploymentValidation,
    daemonHealth,
    daemonAlertDryRun,
    runtimeProfile,
    launchReadiness,
    expectLaunchReady,
    smokeSummary,
    seededCanarySummary,
    exactCanarySummary,
    walkthroughCanarySummary,
    authorityEvidence,
    evidenceManifest,
    promotionReadiness,
  });
  summary = {
    ...summary,
    evidenceContract: {
      requiredArtifactCount: evidenceManifest.requiredArtifacts.total,
      presentArtifactCount: evidenceManifest.requiredArtifacts.present.length,
      producedArtifactCount: evidenceManifest.producedArtifacts.length,
      missingArtifacts: evidenceManifest.requiredArtifacts.missing,
      incidents: evidenceManifest.incidents,
    },
    promotion: {
      status: promotionReadiness.status,
      alertDrillConfigured: daemonAlertDryRun.notification?.configured === true,
      alertDrillReason: daemonAlertDryRun.notification?.reason ?? null,
      rollbackReady:
        launchMetadata.environment === 'production'
          ? Boolean(launchMetadata.rollbackImageSha)
          : true,
      warnings: promotionReadiness.warnings,
      blockers: promotionReadiness.blockers,
    },
    blockers,
  };

  writeFileSync(
    resolve(artifactsDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );
  const summaryMarkdown = buildSummaryMarkdown(summary);
  writeFileSync(resolve(artifactsDir, 'summary.md'), summaryMarkdown, 'utf8');
  writeGitHubStepSummary(summaryMarkdown, process.env);

  if (blockers.length > 0) {
    throw new Error(
      `Launch candidate is blocked:\n${blockers.map((blocker) => `- ${blocker}`).join('\n')}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function readArtifactsDir(argv) {
  const flagIndex = argv.indexOf('--artifacts-dir');
  if (flagIndex >= 0) {
    const provided = argv[flagIndex + 1];
    if (!provided) {
      throw new Error('--artifacts-dir requires a value.');
    }

    return resolve(repoRoot, provided);
  }

  if (process.env.LAUNCH_CANDIDATE_ARTIFACT_DIR) {
    return resolve(repoRoot, process.env.LAUNCH_CANDIDATE_ARTIFACT_DIR);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return resolve(repoRoot, 'artifacts', 'launch-candidate', timestamp);
}

function loadOptionalEnv(fileName) {
  const envPath = resolve(repoRoot, fileName);
  if (!existsSync(envPath)) {
    return;
  }

  loadDotenv({
    path: envPath,
    override: false,
  });
}

function readRequiredEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Launch candidate requires ${key}. Copy .env.e2e.deployed.example to .env.e2e.deployed or export the variable explicitly.`,
    );
  }
  return value;
}

function readIncidentPlaybook() {
  const filePath = resolve(repoRoot, 'docs', 'incident-playbook.json');
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

async function runLoggedCommand(stepName, command, logPath, extraEnv = {}) {
  console.log(`launch-candidate: ${command.join(' ')}`);
  const result = await spawnCommand(command, extraEnv);
  writeFileSync(
    logPath,
    [renderCommand(stepName, command), result.stdout, result.stderr].filter(Boolean).join('\n'),
    'utf8',
  );

  if (result.code !== 0) {
    throw new Error(`${stepName} failed with exit code ${result.code}.`);
  }

  return result;
}

async function runJsonCommand(stepName, command, rawLogPath, jsonPath, extraEnv = {}) {
  const result = await runLoggedCommand(stepName, command, rawLogPath, extraEnv);
  const parsed = parseTrailingJson(result.stdout);
  writeFileSync(jsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return parsed;
}

async function spawnCommand(command, extraEnv) {
  const executable = process.platform === 'win32' ? `${command[0]}.cmd` : command[0];
  const child = spawn(executable, command.slice(1), {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const code = await new Promise((resolveCode, reject) => {
    child.on('error', reject);
    child.on('close', resolveCode);
  });

  return {
    code,
    stdout,
    stderr,
  };
}

function parseTrailingJson(input) {
  const trimmed = input.trim();
  const starts = [trimmed.lastIndexOf('\n{'), trimmed.lastIndexOf('\n[')]
    .filter((index) => index >= 0)
    .sort((left, right) => right - left);

  const candidates = [trimmed];
  for (const index of starts) {
    candidates.push(trimmed.slice(index + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error('Expected command output to end with valid JSON.');
}

async function fetchJsonArtifact(url, outputPath) {
  console.log(`launch-candidate: fetch ${url}`);
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    writeFileSync(outputPath, text ? `${text}\n` : `HTTP ${response.status}\n`, 'utf8');
    throw new Error(`Fetch failed for ${url} with status ${response.status}.`);
  }

  const parsed = JSON.parse(text);
  writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return parsed;
}

function collectBlockers({
  deploymentValidation,
  daemonHealth,
  daemonAlertDryRun,
  runtimeProfile,
  launchReadiness,
  expectLaunchReady,
  smokeSummary,
  seededCanarySummary,
  exactCanarySummary,
  walkthroughCanarySummary,
  authorityEvidence,
  evidenceManifest,
  promotionReadiness = { blockers: [] },
}) {
  const blockers = [];

  if (deploymentValidation.ok !== true) {
    blockers.push('Deployment validation reported failed checks.');
  }

  if (daemonHealth.status === 'failed') {
    blockers.push('Daemon health reported failed posture.');
  }
  if (
    runtimeProfile.operations?.chainSyncDaemon?.required === true &&
    daemonAlertDryRun.notification?.configured !== true
  ) {
    blockers.push(
      'Daemon alert dry-run did not confirm configured alert delivery posture for the required worker.',
    );
  }
  if (
    runtimeProfile.operations?.chainSyncDaemon?.required === true &&
    daemonAlertDryRun.notification?.dryRun !== true
  ) {
    blockers.push('Daemon alert dry-run did not execute in dry-run mode.');
  }

  if (expectLaunchReady && launchReadiness.ready !== true) {
    blockers.push(
      ...launchReadiness.blockers.map((blocker) => `Launch readiness blocker: ${blocker}`),
    );
  }

  if (smokeSummary.failed > 0) {
    blockers.push('Deployed smoke tests reported failures.');
  }
  if (seededCanarySummary.failed > 0) {
    blockers.push('Seeded deployed canary reported failures.');
  }
  if (seededCanarySummary.skipped > 0 || seededCanarySummary.total === 0) {
    blockers.push('Seeded deployed canary did not execute its required staged mutation path.');
  }
  if (exactCanarySummary.failed > 0) {
    blockers.push('Exact deployed canary reported failures.');
  }
  if (exactCanarySummary.skipped > 0 || exactCanarySummary.total === 0) {
    blockers.push('Exact deployed canary did not execute its required staged launch path.');
  }
  if (walkthroughCanarySummary.failed > 0) {
    blockers.push('Deployed walkthrough canary reported failures.');
  }
  if (walkthroughCanarySummary.skipped > 0 || walkthroughCanarySummary.total === 0) {
    blockers.push('Deployed walkthrough canary did not execute its required guided launch path.');
  }
  if (authorityEvidence.ok !== true) {
    blockers.push('Deployed authority evidence did not complete successfully.');
  }
  if (authorityEvidence.authority?.source !== 'chain_projection') {
    blockers.push('Deployed authority evidence did not prove chain_projection audit reads.');
  }
  if (authorityEvidence.ingestion?.status !== 'ok') {
    blockers.push('Deployed authority evidence reported unhealthy ingestion posture.');
  }
  if (evidenceManifest.requiredArtifacts.missing.length > 0) {
    blockers.push(
      `Evidence contract is incomplete. Missing artifacts: ${evidenceManifest.requiredArtifacts.missing.join(', ')}`,
    );
  }
  for (const incident of evidenceManifest.incidents) {
    if (incident.missingEvidence.length > 0) {
      blockers.push(
        `Incident ${incident.id} is missing required evidence artifacts: ${incident.missingEvidence.join(', ')}`,
      );
    }
  }
  blockers.push(...promotionReadiness.blockers);

  return blockers;
}

function summarizePlaywrightReport(report) {
  const stats = report.stats || {};
  const expected = stats.expected ?? 0;
  const unexpected = stats.unexpected ?? 0;
  const flaky = stats.flaky ?? 0;
  const skipped = stats.skipped ?? 0;

  return {
    expected,
    unexpected,
    flaky,
    skipped,
    total: expected + unexpected + flaky + skipped,
    failed: unexpected + flaky,
  };
}

function renderCommand(stepName, command) {
  return [`# ${stepName}`, `$ ${command.join(' ')}`].join('\n');
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}
