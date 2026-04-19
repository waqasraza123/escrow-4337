import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';
import { assertRequiredDeployedFlowEnv } from './deployed-flow-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const defaultPollAttempts = 24;
const defaultPollIntervalMs = 5_000;
const defaultBatchLimit = 200;

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`Usage: node ./scripts/deployed-authority-evidence.mjs [--artifacts-dir <path>] [--poll-attempts <count>] [--poll-interval-ms <ms>]

Creates a real staged escrow job through the deployed API, runs protected chain
reconciliation as the configured operator, and verifies that public audit and
export reads switch to chain_projection with healthy ingestion posture.`);
  process.exit(0);
}

loadOptionalEnv('.env.e2e.deployed');

const input = readInput(args);
const apiBaseUrl = readRequiredAbsoluteUrl('PLAYWRIGHT_DEPLOYED_API_BASE_URL');
const webBaseUrl = readRequiredAbsoluteUrl('PLAYWRIGHT_DEPLOYED_WEB_BASE_URL');
const frontendOrigin = new URL(webBaseUrl).origin;
assertRequiredDeployedFlowEnv();

const flow = {
  currencyAddress: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CURRENCY_ADDRESS'),
  client: {
    email: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_EMAIL'),
    otpCode: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_OTP_CODE'),
    privateKey: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_PRIVATE_KEY'),
  },
  contractor: {
    email: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_EMAIL'),
    otpCode: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_OTP_CODE'),
    privateKey: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_PRIVATE_KEY'),
  },
  operator: {
    email: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_EMAIL'),
    otpCode: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_OTP_CODE'),
    privateKey: readRequiredEnv('PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_PRIVATE_KEY'),
  },
};

const outputDir =
  input.artifactsDir ??
  resolve(
    repoRoot,
    'artifacts',
    'deployed-authority',
    new Date().toISOString().replace(/[:.]/g, '-'),
  );

const partialState = {
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  webBaseUrl,
  outputDir,
  runId: null,
  jobId: null,
  txHashes: {},
};

async function main() {
  mkdirSync(outputDir, {
    recursive: true,
  });

  const runId = randomUUID().slice(0, 8);
  partialState.runId = runId;

  const clientWallet = readWalletFromPrivateKey(flow.client.privateKey);
  const contractorWallet = readWalletFromPrivateKey(flow.contractor.privateKey);
  const operatorWallet = readWalletFromPrivateKey(flow.operator.privateKey);

  const sessions = {
    client: await createApiSession({
      apiBaseUrl,
      email: flow.client.email,
      otpCode: flow.client.otpCode,
    }),
    contractor: await createApiSession({
      apiBaseUrl,
      email: flow.contractor.email,
      otpCode: flow.contractor.otpCode,
    }),
    operator: await createApiSession({
      apiBaseUrl,
      email: flow.operator.email,
      otpCode: flow.operator.otpCode,
    }),
  };

  const linkedWallets = {
    client: await linkWalletForApiSession({
      apiBaseUrl,
      session: sessions.client,
      wallet: clientWallet,
    }),
    contractor: await linkWalletForApiSession({
      apiBaseUrl,
      session: sessions.contractor,
      wallet: contractorWallet,
    }),
    operator: await linkWalletForApiSession({
      apiBaseUrl,
      session: sessions.operator,
      wallet: operatorWallet,
    }),
  };

  const smartAccount = await apiJson(
    apiBaseUrl,
    '/wallet/smart-account/provision',
    {
      method: 'POST',
      body: JSON.stringify({
        ownerAddress: clientWallet.address,
        setAsDefault: true,
      }),
    },
    sessions.client.accessToken,
  );

  const title = `Authority evidence ${runId}`;
  const description = [
    'Staged authority evidence flow.',
    `Run ${runId}.`,
    'Used to verify chain_projection audit and export reads before promotion.',
  ].join(' ');

  const createJob = await apiJson(
    apiBaseUrl,
    '/jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        contractorEmail: flow.contractor.email,
        workerAddress: contractorWallet.address,
        currencyAddress: flow.currencyAddress,
        title,
        description,
        category: 'software-development',
        termsJSON: {
          disputeModel: 'operator-mediation',
          verificationRunId: runId,
          evidenceMode: 'deployed-authority-evidence',
        },
      }),
    },
    sessions.client.accessToken,
  );
  partialState.jobId = createJob.jobId;
  partialState.txHashes.createJob = createJob.txHash;

  const invite = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/contractor/invite`,
    {
      method: 'POST',
      body: JSON.stringify({
        delivery: 'manual',
        frontendOrigin,
      }),
    },
    sessions.client.accessToken,
  );
  const inviteToken = readInviteToken(invite.invite.joinUrl);

  const milestones = [
    {
      title: 'Discovery',
      deliverable: `Authority evidence discovery ${runId}`,
      amount: '7',
    },
    {
      title: 'Delivery',
      deliverable: `Authority evidence delivery ${runId}`,
      amount: '5',
    },
  ];

  const setMilestones = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones`,
    {
      method: 'POST',
      body: JSON.stringify({
        milestones,
      }),
    },
    sessions.client.accessToken,
  );
  partialState.txHashes.setMilestones = setMilestones.txHash;

  const fundJob = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/fund`,
    {
      method: 'POST',
      body: JSON.stringify({
        amount: '12',
      }),
    },
    sessions.client.accessToken,
  );
  partialState.txHashes.fundJob = fundJob.txHash;

  const joinReadiness = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/contractor/join-readiness?inviteToken=${encodeURIComponent(inviteToken)}`,
    {},
    sessions.contractor.accessToken,
  );
  requireCondition(
    joinReadiness.status === 'ready',
    `Expected contractor join readiness to be ready but received ${joinReadiness.status}`,
  );

  await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/contractor/join`,
    {
      method: 'POST',
      body: JSON.stringify({
        inviteToken,
      }),
    },
    sessions.contractor.accessToken,
  );

  const deliverFirst = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones/0/deliver`,
    {
      method: 'POST',
      body: JSON.stringify({
        note: `Authority evidence delivery note A ${runId}`,
        evidenceUrls: [`https://example.com/evidence/${runId}/delivery-a`],
      }),
    },
    sessions.contractor.accessToken,
  );
  partialState.txHashes.deliverFirst = deliverFirst.txHash;

  const releaseFirst = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones/0/release`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    sessions.client.accessToken,
  );
  partialState.txHashes.releaseFirst = releaseFirst.txHash;

  const deliverSecond = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones/1/deliver`,
    {
      method: 'POST',
      body: JSON.stringify({
        note: `Authority evidence delivery note B ${runId}`,
        evidenceUrls: [`https://example.com/evidence/${runId}/delivery-b`],
      }),
    },
    sessions.contractor.accessToken,
  );
  partialState.txHashes.deliverSecond = deliverSecond.txHash;

  const disputeSecond = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones/1/dispute`,
    {
      method: 'POST',
      body: JSON.stringify({
        reason: `Authority evidence dispute ${runId}`,
        evidenceUrls: [`https://example.com/evidence/${runId}/dispute`],
      }),
    },
    sessions.client.accessToken,
  );
  partialState.txHashes.disputeSecond = disputeSecond.txHash;

  const resolveSecond = await apiJson(
    apiBaseUrl,
    `/jobs/${encodeURIComponent(createJob.jobId)}/milestones/1/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'refund',
        note: `Authority evidence operator refund ${runId}`,
      }),
    },
    sessions.operator.accessToken,
  );
  partialState.txHashes.resolveSecond = resolveSecond.txHash;

  const authorityProbe = await waitForAuthorityProjection({
    apiBaseUrl,
    jobId: createJob.jobId,
    operatorAccessToken: sessions.operator.accessToken,
    pollAttempts: input.pollAttempts,
    pollIntervalMs: input.pollIntervalMs,
  });

  const runtimeProfile = await fetchJsonArtifact(
    new URL('/operations/runtime-profile', apiBaseUrl).toString(),
    resolve(outputDir, 'runtime-profile.json'),
  );
  const daemonHealth = await fetchJsonArtifact(
    new URL('/operations/reconciliation/chain-audit-sync/daemon-health', apiBaseUrl).toString(),
    resolve(outputDir, 'daemon-health.json'),
    sessions.operator.accessToken,
  );

  const exportArtifacts = await fetchExportArtifacts({
    apiBaseUrl,
    jobId: createJob.jobId,
    outputDir,
  });

  requireCondition(
    authorityProbe.audit.bundle.authority.source === 'chain_projection',
    `Expected audit authority source chain_projection but received ${authorityProbe.audit.bundle.authority.source}`,
  );
  requireCondition(
    authorityProbe.audit.bundle.job.status === 'resolved',
    `Expected resolved job status but received ${authorityProbe.audit.bundle.job.status}`,
  );
  requireCondition(
    authorityProbe.audit.bundle.job.milestones[0]?.status === 'released' &&
      authorityProbe.audit.bundle.job.milestones[1]?.status === 'refunded',
    'Expected chain-projected milestones to be released then refunded',
  );
  requireCondition(
    authorityProbe.audit.bundle.audit.some(
      (event) => event.type === 'job.contractor_invite_sent',
    ) &&
      authorityProbe.audit.bundle.audit.some((event) => event.type === 'job.contractor_joined') &&
      authorityProbe.audit.bundle.audit.some((event) => event.type === 'milestone.resolved'),
    'Expected staged authority audit to retain invite and join events plus milestone.resolved',
  );
  requireCondition(
    exportArtifacts.jobHistoryJson.authority.source === 'chain_projection' &&
      exportArtifacts.disputeCaseJson.authority.source === 'chain_projection',
    'Expected JSON export artifacts to report chain_projection authority',
  );
  const executionTraces = exportArtifacts.jobHistoryJson.summary?.executionTraces ?? null;
  const recordedTxHashes = Object.values(partialState.txHashes).filter(
    (value) => typeof value === 'string' && value.length > 0,
  );
  const exportedTxHashes = new Set(
    (exportArtifacts.jobHistoryJson.executions ?? [])
      .map((execution) => execution?.txHash ?? null)
      .filter((value) => typeof value === 'string' && value.length > 0),
  );
  const missingTxHashes = recordedTxHashes.filter((txHash) => !exportedTxHashes.has(txHash));

  requireCondition(
    executionTraces !== null,
    'Expected job-history export summary to include execution trace coverage',
  );
  requireCondition(
    executionTraces.executionCount === recordedTxHashes.length,
    `Expected ${recordedTxHashes.length} execution traces but received ${executionTraces.executionCount}`,
  );
  requireCondition(
    executionTraces.confirmedExecutions === recordedTxHashes.length,
    `Expected ${recordedTxHashes.length} confirmed executions but received ${executionTraces.confirmedExecutions}`,
  );
  requireCondition(
    executionTraces.correlationTaggedExecutions === executionTraces.executionCount,
    'Expected every staged authority execution to include a correlation id',
  );
  requireCondition(
    executionTraces.requestTaggedExecutions === executionTraces.executionCount,
    'Expected every staged authority execution to include a request id',
  );
  requireCondition(
    executionTraces.operationTaggedExecutions === executionTraces.executionCount,
    'Expected every staged authority execution to include an operation key',
  );
  requireCondition(
    executionTraces.confirmedWithoutCorrelation === 0,
    'Expected staged authority executions to have zero confirmed-without-correlation entries',
  );
  requireCondition(
    missingTxHashes.length === 0,
    `Expected all staged tx hashes in job-history export but missing ${missingTxHashes.join(', ')}`,
  );

  const summary = {
    ok: true,
    generatedAt: new Date().toISOString(),
    runId,
    apiBaseUrl,
    webBaseUrl,
    jobId: createJob.jobId,
    wallets: {
      client: clientWallet.address,
      contractor: contractorWallet.address,
      operator: operatorWallet.address,
      smartAccountAddress: smartAccount.address ?? null,
    },
    syncAttempts: authorityProbe.attempts,
    batch: {
      processedJobs: authorityProbe.batchReport.summary.processedJobs,
      persistedJobs: authorityProbe.batchReport.summary.persistedJobs,
      failedJobs: authorityProbe.batchReport.summary.failedJobs,
      blockedJobs: authorityProbe.batchReport.summary.blockedJobs,
    },
    ingestion: {
      status: authorityProbe.ingestionStatus.status,
      summary: authorityProbe.ingestionStatus.summary,
      latestBlock: authorityProbe.ingestionStatus.latestBlock,
      finalizedBlock: authorityProbe.ingestionStatus.finalizedBlock,
      lagBlocks: authorityProbe.ingestionStatus.lagBlocks,
      healthyJobs: authorityProbe.ingestionStatus.projections.healthyJobs,
    },
    authority: authorityProbe.audit.bundle.authority,
    audit: {
      jobStatus: authorityProbe.audit.bundle.job.status,
      milestoneStatuses: authorityProbe.audit.bundle.job.milestones.map(
        (milestone) => milestone.status,
      ),
      eventTypes: authorityProbe.audit.bundle.audit.map((event) => event.type),
    },
    exports: {
      jobHistoryAuthoritySource: exportArtifacts.jobHistoryJson.authority.source,
      disputeCaseAuthoritySource: exportArtifacts.disputeCaseJson.authority.source,
      jobHistoryCsvBytes: exportArtifacts.jobHistoryCsv.length,
      disputeCaseCsvBytes: exportArtifacts.disputeCaseCsv.length,
    },
    executionTraces: {
      executionCount: executionTraces.executionCount,
      traceCount: executionTraces.traceCount,
      correlationTaggedExecutions: executionTraces.correlationTaggedExecutions,
      requestTaggedExecutions: executionTraces.requestTaggedExecutions,
      operationTaggedExecutions: executionTraces.operationTaggedExecutions,
      confirmedWithoutCorrelation: executionTraces.confirmedWithoutCorrelation,
      missingTxHashes,
      traces: executionTraces.traces,
    },
    runtimeProfile: {
      profile: runtimeProfile.profile,
      chainIngestion: runtimeProfile.operations?.chainIngestion ?? null,
    },
    daemonHealth: {
      status: daemonHealth.status,
      summary: daemonHealth.summary,
    },
    txHashes: partialState.txHashes,
    files: {
      outputDir: relative(repoRoot, outputDir),
      audit: relative(repoRoot, resolve(outputDir, 'audit.json')),
      batchSync: relative(repoRoot, resolve(outputDir, 'batch-sync.json')),
      ingestionStatus: relative(repoRoot, resolve(outputDir, 'ingestion-status.json')),
      runtimeProfile: relative(repoRoot, resolve(outputDir, 'runtime-profile.json')),
      daemonHealth: relative(repoRoot, resolve(outputDir, 'daemon-health.json')),
      jobHistoryJson: relative(repoRoot, resolve(outputDir, 'job-history.json')),
      jobHistoryCsv: relative(repoRoot, resolve(outputDir, 'job-history.csv')),
      disputeCaseJson: relative(repoRoot, resolve(outputDir, 'dispute-case.json')),
      disputeCaseCsv: relative(repoRoot, resolve(outputDir, 'dispute-case.csv')),
    },
  };

  writeFileSync(resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const summary = {
    ok: false,
    generatedAt: new Date().toISOString(),
    ...partialState,
    error: error instanceof Error ? error.message : String(error),
  };

  mkdirSync(outputDir, {
    recursive: true,
  });
  writeFileSync(resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function waitForAuthorityProjection(input) {
  let lastBatchReport = null;
  let lastIngestionStatus = null;
  let lastAudit = null;

  for (let attempt = 1; attempt <= input.pollAttempts; attempt += 1) {
    lastBatchReport = await apiJson(
      input.apiBaseUrl,
      '/operations/reconciliation/chain-audit-sync/batch',
      {
        method: 'POST',
        body: JSON.stringify({
          scope: 'all',
          limit: defaultBatchLimit,
          persist: true,
        }),
      },
      input.operatorAccessToken,
    );
    writeFileSync(
      resolve(outputDir, 'batch-sync.json'),
      `${JSON.stringify(lastBatchReport, null, 2)}\n`,
      'utf8',
    );

    lastIngestionStatus = await fetchJsonArtifact(
      new URL('/operations/reconciliation/chain-audit-sync/status', input.apiBaseUrl).toString(),
      resolve(outputDir, 'ingestion-status.json'),
      input.operatorAccessToken,
    );

    lastAudit = await fetchJsonArtifact(
      new URL(`/jobs/${input.jobId}/audit`, input.apiBaseUrl).toString(),
      resolve(outputDir, 'audit.json'),
    );

    const authority = lastAudit.bundle?.authority;
    const milestones = lastAudit.bundle?.job?.milestones ?? [];

    const auditReady =
      authority?.source === 'chain_projection' &&
      authority.authorityReadsEnabled === true &&
      authority.projectionAvailable === true &&
      authority.projectionFresh === true &&
      authority.projectionHealthy === true &&
      milestones[0]?.status === 'released' &&
      milestones[1]?.status === 'refunded' &&
      lastAudit.bundle?.job?.status === 'resolved';
    const ingestionReady =
      lastIngestionStatus.status === 'ok' &&
      lastIngestionStatus.authorityReadsEnabled === true &&
      lastIngestionStatus.projections.healthyJobs >= 1;
    const batchJob = Array.isArray(lastBatchReport.jobs)
      ? lastBatchReport.jobs.find((job) => job.jobId === input.jobId)
      : null;
    const batchReady =
      batchJob !== null &&
      batchJob.outcome !== 'failed' &&
      batchJob.blocked !== true &&
      batchJob.errorMessage === null;

    if (auditReady && ingestionReady && batchReady) {
      return {
        attempts: attempt,
        batchReport: lastBatchReport,
        ingestionStatus: lastIngestionStatus,
        audit: lastAudit,
      };
    }

    if (attempt < input.pollAttempts) {
      await sleep(input.pollIntervalMs);
    }
  }

  throw new Error(
    [
      `Authority evidence did not converge within ${input.pollAttempts} attempts.`,
      lastAudit?.bundle?.authority
        ? `Audit authority: ${JSON.stringify(lastAudit.bundle.authority)}`
        : 'Audit authority unavailable.',
      lastIngestionStatus
        ? `Ingestion status: ${lastIngestionStatus.status} (${lastIngestionStatus.summary})`
        : 'Ingestion status unavailable.',
      lastBatchReport
        ? `Batch summary: ${JSON.stringify(lastBatchReport.summary)}`
        : 'Batch summary unavailable.',
    ].join('\n'),
  );
}

async function fetchExportArtifacts(input) {
  const jobHistoryJsonText = await fetchTextArtifact(
    new URL(
      `/jobs/${input.jobId}/export?artifact=job-history&format=json`,
      input.apiBaseUrl,
    ).toString(),
    resolve(input.outputDir, 'job-history.json'),
  );
  const jobHistoryCsv = await fetchTextArtifact(
    new URL(
      `/jobs/${input.jobId}/export?artifact=job-history&format=csv`,
      input.apiBaseUrl,
    ).toString(),
    resolve(input.outputDir, 'job-history.csv'),
  );
  const disputeCaseJsonText = await fetchTextArtifact(
    new URL(
      `/jobs/${input.jobId}/export?artifact=dispute-case&format=json`,
      input.apiBaseUrl,
    ).toString(),
    resolve(input.outputDir, 'dispute-case.json'),
  );
  const disputeCaseCsv = await fetchTextArtifact(
    new URL(
      `/jobs/${input.jobId}/export?artifact=dispute-case&format=csv`,
      input.apiBaseUrl,
    ).toString(),
    resolve(input.outputDir, 'dispute-case.csv'),
  );

  return {
    jobHistoryJson: JSON.parse(jobHistoryJsonText),
    jobHistoryCsv,
    disputeCaseJson: JSON.parse(disputeCaseJsonText),
    disputeCaseCsv,
  };
}

async function createApiSession(input) {
  await apiJson(input.apiBaseUrl, '/auth/start', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
    }),
  });

  const response = await apiJson(input.apiBaseUrl, '/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      code: input.otpCode,
    }),
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

async function linkWalletForApiSession(input) {
  const challenge = await apiJson(
    input.apiBaseUrl,
    '/wallet/link/challenge',
    {
      method: 'POST',
      body: JSON.stringify({
        address: input.wallet.address,
        walletKind: 'eoa',
        chainId: readWalletChainId(),
      }),
    },
    input.session.accessToken,
  );
  const signature = signWalletMessage(input.wallet.privateKey, challenge.message);

  return apiJson(
    input.apiBaseUrl,
    '/wallet/link/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    },
    input.session.accessToken,
  );
}

async function apiJson(apiBaseUrl, path, init = {}, accessToken) {
  const response = await fetchWithAuth(
    path.startsWith('http://') || path.startsWith('https://') ? path : `${apiBaseUrl}${path}`,
    {
      ...init,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...Object.fromEntries(new Headers(init.headers).entries()),
      },
    },
    accessToken,
  );
  const text = await response.text();

  if (!response.ok) {
    throw new Error(await formatErrorMessage(response.status, text));
  }

  if (response.status === 204) {
    return undefined;
  }

  return text ? JSON.parse(text) : null;
}

async function fetchJsonArtifact(url, outputPath, accessToken) {
  const response = await fetchWithAuth(
    url,
    {
      headers: {
        accept: 'application/json',
      },
    },
    accessToken,
  );
  const text = await response.text();
  writeFileSync(outputPath, `${text || ''}${text.endsWith('\n') ? '' : '\n'}`, 'utf8');

  if (!response.ok) {
    throw new Error(await formatErrorMessage(response.status, text));
  }

  return text ? JSON.parse(text) : null;
}

async function fetchTextArtifact(url, outputPath, accessToken) {
  const response = await fetchWithAuth(url, {}, accessToken);
  const text = await response.text();
  writeFileSync(outputPath, `${text}${text.endsWith('\n') ? '' : '\n'}`, 'utf8');

  if (!response.ok) {
    throw new Error(await formatErrorMessage(response.status, text));
  }

  return text;
}

async function fetchWithAuth(url, init = {}, accessToken) {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

async function formatErrorMessage(status, text) {
  if (!text) {
    return `Request failed with ${status}`;
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }

    return parsed.message || parsed.error || text;
  } catch {
    return text;
  }
}

function readInviteToken(joinUrl) {
  const parsed = new URL(joinUrl);
  const token = parsed.searchParams.get('invite');
  requireCondition(token, 'Invite join URL did not contain an invite token');
  return token;
}

function readWalletChainId() {
  const raw =
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID?.trim() ||
    process.env.ESCROW_CHAIN_ID?.trim() ||
    '84532';
  const chainId = Number.parseInt(raw, 10);
  requireCondition(Number.isInteger(chainId) && chainId > 0, `Invalid wallet chain id: ${raw}`);
  return chainId;
}

function readInput(argv) {
  const input = {
    artifactsDir: null,
    pollAttempts: defaultPollAttempts,
    pollIntervalMs: defaultPollIntervalMs,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--artifacts-dir') {
      const value = argv[index + 1];
      requireCondition(value, '--artifacts-dir requires a value');
      input.artifactsDir = resolve(repoRoot, value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--artifacts-dir=')) {
      input.artifactsDir = resolve(repoRoot, arg.slice('--artifacts-dir='.length));
      continue;
    }

    if (arg === '--poll-attempts') {
      const value = argv[index + 1];
      requireCondition(value, '--poll-attempts requires a value');
      input.pollAttempts = readPositiveInteger(value, '--poll-attempts');
      index += 1;
      continue;
    }

    if (arg.startsWith('--poll-attempts=')) {
      input.pollAttempts = readPositiveInteger(
        arg.slice('--poll-attempts='.length),
        '--poll-attempts',
      );
      continue;
    }

    if (arg === '--poll-interval-ms') {
      const value = argv[index + 1];
      requireCondition(value, '--poll-interval-ms requires a value');
      input.pollIntervalMs = readPositiveInteger(value, '--poll-interval-ms');
      index += 1;
      continue;
    }

    if (arg.startsWith('--poll-interval-ms=')) {
      input.pollIntervalMs = readPositiveInteger(
        arg.slice('--poll-interval-ms='.length),
        '--poll-interval-ms',
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return input;
}

function readPositiveInteger(raw, flag) {
  const value = Number.parseInt(raw, 10);
  requireCondition(Number.isInteger(value) && value > 0, `${flag} must be a positive integer`);
  return value;
}

function readRequiredEnv(key) {
  const value = process.env[key]?.trim();
  requireCondition(
    value,
    `Missing required environment variable ${key}. Copy .env.e2e.deployed.example to .env.e2e.deployed or export it explicitly.`,
  );
  return value;
}

function readRequiredAbsoluteUrl(key) {
  const value = readRequiredEnv(key);
  try {
    return new URL(value).toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`${key} must be an absolute URL. Received: ${value}`);
  }
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function readWalletFromPrivateKey(privateKey) {
  return {
    privateKey,
    address: runCast(['wallet', 'address', '--private-key', privateKey]),
  };
}

function signWalletMessage(privateKey, message) {
  return runCast(['wallet', 'sign', '--private-key', privateKey, message]);
}

function runCast(args) {
  const result = spawnSync('cast', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [`cast ${args.join(' ')} failed with exit code ${result.status}.`, result.stderr?.trim()]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const value = result.stdout.trim();
  requireCondition(value, `cast ${args.join(' ')} returned no output.`);
  return value;
}
