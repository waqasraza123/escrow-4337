import 'reflect-metadata';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, join, resolve } from 'path';
import { once } from 'events';
import net from 'net';
import { spawn, type ChildProcess } from 'child_process';
import { Client } from 'pg';
import {
  BigNumber,
  Contract,
  ContractFactory,
  providers,
  utils,
  type BigNumberish,
  type ContractReceipt,
  type ContractTransaction,
  type ContractInterface,
  type Signer,
} from 'ethers';
import { NestFactory } from '@nestjs/core';
import { loadApiEnvironment } from '../../common/env/load-env';
import { normalizeEvmAddress } from '../../common/evm-address';
import { AppModule } from '../../app.module';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import { applyPendingMigrations } from '../../persistence/postgres/migrations';
import { EscrowService } from '../escrow/escrow.service';
import type {
  EscrowAuthorityStatus,
  EscrowJobRecord,
  EscrowOnchainProjectionRecord,
  EscrowPublicJobView,
} from '../escrow/escrow.types';
import { UsersService } from '../users/users.service';
import { EscrowChainSyncService } from './escrow-chain-sync.service';
import type { EscrowChainSyncBatchReport } from './escrow-health.types';
import { RuntimeProfileService } from './runtime-profile.service';
import type { BackendRuntimeProfile } from './runtime-profile.types';

const DEFAULT_LOCAL_DATABASE_URL =
  'postgresql://escrow4337:escrow4337@127.0.0.1:5432/escrow4337';
const DEFAULT_CHAIN_ID = 31337;
const ONE_USDC = 1_000_000n;

type RunnerInput = {
  databaseUrl: string;
  anvilPort: number | null;
  outputPath: string | null;
  keepResources: boolean;
};

type VerificationArtifact = {
  generatedAt: string;
  resources: {
    isolationMode: 'database' | 'schema';
    databaseName: string;
    schemaName: string | null;
    rpcUrl: string;
    chainId: number;
  };
  deployments: {
    escrowContractAddress: string;
    usdcAddress: string;
    ownerAddress: string;
    arbitratorAddress: string;
    clientAddress: string;
    workerAddress: string;
  };
  seededJob: {
    jobId: string;
    escrowId: string;
    localStatusBeforeIngestion: EscrowJobRecord['status'];
    publicJobAfterAuthority: EscrowPublicJobView;
  };
  lifecycle: {
    jobHash: string;
    txs: {
      createJob: {
        hash: string;
        blockNumber: number;
      };
      setMilestones: {
        hash: string;
        blockNumber: number;
      };
      fund: {
        hash: string;
        blockNumber: number;
      };
      deliverFirst: {
        hash: string;
        blockNumber: number;
      };
      releaseFirst: {
        hash: string;
        blockNumber: number;
      };
      deliverSecond: {
        hash: string;
        blockNumber: number;
      };
      openDisputeSecond: {
        hash: string;
        blockNumber: number;
      };
      resolveSecond: {
        hash: string;
        blockNumber: number;
      };
    };
  };
  batchReport: {
    mode: EscrowChainSyncBatchReport['mode'];
    summary: EscrowChainSyncBatchReport['summary'];
    selection: EscrowChainSyncBatchReport['selection'];
  };
  ingestionStatus: {
    status: string;
    summary: string;
    latestBlock: number | null;
    finalizedBlock: number | null;
    lagBlocks: number | null;
    projections: {
      totalJobs: number;
      projectedJobs: number;
      healthyJobs: number;
      degradedJobs: number;
      staleJobs: number;
    };
    cursor: {
      nextFromBlock: number | null;
      lastFinalizedBlock: number | null;
      lastScannedBlock: number | null;
    } | null;
    issues: string[];
    warnings: string[];
  };
  runtimeProfile: {
    profile: BackendRuntimeProfile['profile'];
    chainIngestion: BackendRuntimeProfile['operations']['chainIngestion'];
  };
  authority: EscrowAuthorityStatus;
  projection: Pick<
    EscrowOnchainProjectionRecord,
    | 'health'
    | 'status'
    | 'fundedAmount'
    | 'lastEventCount'
    | 'lastProjectedBlock'
    | 'driftSummary'
  >;
  auditEventTypes: string[];
  outputPath: string | null;
};

type PostgresIsolation = {
  mode: 'database' | 'schema';
  databaseName: string;
  databaseUrl: string;
  schemaName: string | null;
  cleanup: () => Promise<void>;
};

type LocalContracts = {
  provider: providers.JsonRpcProvider;
  owner: providers.JsonRpcSigner;
  arbitrator: providers.JsonRpcSigner;
  client: providers.JsonRpcSigner;
  worker: providers.JsonRpcSigner;
  ownerAddress: string;
  arbitratorAddress: string;
  clientAddress: string;
  workerAddress: string;
  usdcAddress: string;
  escrowAddress: string;
  usdc: LocalUsdcContract;
  escrow: LocalEscrowContract;
};

type LocalEscrowMilestoneInput = {
  amount: BigNumberish;
  deliverableHash: string;
  delivered: boolean;
  released: boolean;
  disputed: boolean;
};

type LocalUsdcContract = Contract & {
  connect(signer: Signer): LocalUsdcContract;
  deployed(): Promise<LocalUsdcContract>;
  mint(to: string, amount: BigNumberish): Promise<ContractTransaction>;
  approve(spender: string, amount: BigNumberish): Promise<ContractTransaction>;
};

type LocalEscrowContract = Contract & {
  connect(signer: Signer): LocalEscrowContract;
  deployed(): Promise<LocalEscrowContract>;
  createJob(
    workerAddress: string,
    currencyAddress: string,
    jobHash: string,
  ): Promise<ContractTransaction>;
  setMilestones(
    escrowId: string,
    milestones: LocalEscrowMilestoneInput[],
  ): Promise<ContractTransaction>;
  fund(escrowId: string, amount: BigNumberish): Promise<ContractTransaction>;
  deliver(
    escrowId: string,
    milestoneIndex: number,
    deliverableHash: string,
  ): Promise<ContractTransaction>;
  release(
    escrowId: string,
    milestoneIndex: number,
  ): Promise<ContractTransaction>;
  openDispute(
    escrowId: string,
    milestoneIndex: number,
    reasonHash: string,
  ): Promise<ContractTransaction>;
  resolve(
    escrowId: string,
    milestoneIndex: number,
    workerShareBps: number,
  ): Promise<ContractTransaction>;
};

function asLocalUsdcContract(contract: Contract): LocalUsdcContract {
  return contract as LocalUsdcContract;
}

function asLocalEscrowContract(contract: Contract): LocalEscrowContract {
  return contract as LocalEscrowContract;
}

function connectLocalUsdc(
  contract: LocalUsdcContract,
  signer: Signer,
): LocalUsdcContract {
  return asLocalUsdcContract(contract.connect(signer));
}

function connectLocalEscrow(
  contract: LocalEscrowContract,
  signer: Signer,
): LocalEscrowContract {
  return asLocalEscrowContract(contract.connect(signer));
}

async function waitForContractReceipt(
  transaction: Promise<ContractTransaction> | ContractTransaction,
): Promise<ContractReceipt> {
  return (await transaction).wait();
}

function readJobCreatedEscrowId(receipt: ContractReceipt): string | null {
  for (const event of receipt.events ?? []) {
    if (event.event !== 'JobCreated') {
      continue;
    }

    const args = event.args as Record<string, unknown> | undefined;
    const escrowId = args?.escrowId;
    if (escrowId === undefined || escrowId === null) {
      continue;
    }

    if (typeof escrowId === 'string') {
      return escrowId;
    }

    if (BigNumber.isBigNumber(escrowId)) {
      return escrowId.toString();
    }
  }

  return null;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage: node dist/modules/operations/escrow-chain-sync-local-verification-runner.js [--database-url <url>] [--anvil-port <port>] [--output <path>] [--keep-resources]',
      '',
      'Creates isolated local Postgres state plus an Anvil chain, emits real WorkstreamEscrow events, runs finalized ingestion, and verifies authority reads switch to chain_projection.',
      '--database-url <url>  Base Postgres URL used to create a disposable database. Defaults to the pinned local docker profile.',
      '--anvil-port <port>   Bind Anvil to a specific port. Defaults to an ephemeral free port.',
      '--output <path>      Write the verification artifact JSON to this path.',
      '--keep-resources     Skip dropping the temp database and stopping Anvil so the environment can be inspected manually.',
    ].join('\n'),
  );
}

function parsePositiveInteger(raw: string, flag: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return value;
}

function parseArgs(args: string[]): RunnerInput | null {
  const input: RunnerInput = {
    databaseUrl: DEFAULT_LOCAL_DATABASE_URL,
    anvilPort: null,
    outputPath: null,
    keepResources: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      return null;
    }

    if (arg === '--keep-resources') {
      input.keepResources = true;
      continue;
    }

    if (arg === '--database-url') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--database-url requires a value');
      }
      input.databaseUrl = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith('--database-url=')) {
      input.databaseUrl = arg.slice('--database-url='.length);
      continue;
    }

    if (arg === '--output') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--output requires a value');
      }
      input.outputPath = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      input.outputPath = arg.slice('--output='.length);
      continue;
    }

    if (arg === '--anvil-port') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--anvil-port requires a value');
      }
      input.anvilPort = parsePositiveInteger(raw, '--anvil-port');
      index += 1;
      continue;
    }

    if (arg.startsWith('--anvil-port=')) {
      input.anvilPort = parsePositiveInteger(
        arg.slice('--anvil-port='.length),
        '--anvil-port',
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return input;
}

function readContractArtifact(repoRoot: string, relativePath: string) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8')) as {
    abi: ContractInterface;
    bytecode: { object: string };
  };
}

function createDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function createAdminDatabaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

async function withAdminClient<T>(
  baseDatabaseUrl: string,
  handler: (client: Client) => Promise<T>,
) {
  const client = new Client({
    connectionString: createAdminDatabaseUrl(baseDatabaseUrl),
  });
  await client.connect();
  try {
    return await handler(client);
  } finally {
    await client.end();
  }
}

async function createDisposableDatabase(baseDatabaseUrl: string) {
  const databaseName = `escrow4337_chain_verify_${Date.now()}_${randomUUID().slice(0, 8)}`;
  await withAdminClient(baseDatabaseUrl, async (client) => {
    await client.query(`CREATE DATABASE "${databaseName}"`);
  });
  return {
    databaseName,
    databaseUrl: createDatabaseUrl(baseDatabaseUrl, databaseName),
  };
}

async function dropDisposableDatabase(
  baseDatabaseUrl: string,
  databaseName: string,
) {
  await withAdminClient(baseDatabaseUrl, async (client) => {
    await client.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
      [databaseName],
    );
    await client.query(
      `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
    );
  });
}

async function createDisposableSchema(baseDatabaseUrl: string) {
  const schemaName =
    `escrow4337_chain_verify_${Date.now()}_${randomUUID().slice(0, 8)}`.replace(
      /-/g,
      '_',
    );
  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  } finally {
    await client.end();
  }

  return {
    schemaName,
    databaseUrl: baseDatabaseUrl,
  };
}

async function dropDisposableSchema(
  baseDatabaseUrl: string,
  schemaName: string,
) {
  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await client.end();
  }
}

function canFallbackToSchemaIsolation(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code?: string }).code === '42501'
  );
}

async function preparePostgresIsolation(
  baseDatabaseUrl: string,
): Promise<PostgresIsolation> {
  try {
    const database = await createDisposableDatabase(baseDatabaseUrl);
    return {
      mode: 'database',
      databaseName: database.databaseName,
      databaseUrl: database.databaseUrl,
      schemaName: null,
      cleanup: async () => {
        await dropDisposableDatabase(baseDatabaseUrl, database.databaseName);
      },
    };
  } catch (error) {
    if (!canFallbackToSchemaIsolation(error)) {
      throw error;
    }

    const schema = await createDisposableSchema(baseDatabaseUrl);
    const databaseName =
      new URL(baseDatabaseUrl).pathname.replace(/^\//, '') || 'postgres';
    return {
      mode: 'schema',
      databaseName,
      databaseUrl: schema.databaseUrl,
      schemaName: schema.schemaName,
      cleanup: async () => {
        await dropDisposableSchema(baseDatabaseUrl, schema.schemaName);
      },
    };
  }
}

async function applyMigrations(databaseUrl: string, schemaName: string | null) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await applyPendingMigrations(client, process.cwd(), schemaName ?? 'public');
  } finally {
    await client.end();
  }
}

async function findFreePort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a free port'));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePort(port);
      });
    });
  });
}

async function waitForRpc(
  provider: providers.JsonRpcProvider,
  timeoutMs = 15_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await provider.getBlockNumber();
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  throw new Error('Timed out waiting for the local Anvil RPC to become ready');
}

async function stopChildProcess(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
  }, 5_000);

  try {
    await once(child, 'exit');
  } finally {
    clearTimeout(timeout);
  }
}

async function startAnvil(requestedPort: number | null): Promise<{
  port: number;
  rpcUrl: string;
  child: ChildProcess;
}> {
  const port = requestedPort ?? (await findFreePort());
  let spawnError: Error | null = null;
  const child = spawn(
    'anvil',
    [
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--chain-id',
      String(DEFAULT_CHAIN_ID),
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.once('error', (error) => {
    spawnError = error;
  });

  let stderrBuffer = '';
  child.stderr.on('data', (chunk: Buffer | string) => {
    const nextChunk =
      typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    stderrBuffer = `${stderrBuffer}${nextChunk}`;
  });

  const provider = new providers.JsonRpcProvider(`http://127.0.0.1:${port}`);
  try {
    await waitForRpc(provider);
    if (spawnError) {
      throw new Error('Anvil child process emitted an error before RPC ready');
    }
  } catch {
    await stopChildProcess(child).catch(() => undefined);
    throw new Error(
      `Failed to start Anvil on port ${port}.${stderrBuffer ? ` stderr: ${stderrBuffer.trim()}` : ''}`,
    );
  }

  return {
    port,
    rpcUrl: `http://127.0.0.1:${port}`,
    child,
  };
}

async function deployLocalContracts(
  repoRoot: string,
  rpcUrl: string,
): Promise<LocalContracts> {
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const owner = provider.getSigner(0);
  const arbitrator = provider.getSigner(1);
  const client = provider.getSigner(2);
  const worker = provider.getSigner(3);
  const [ownerAddress, arbitratorAddress, clientAddress, workerAddress] =
    await Promise.all([
      owner.getAddress(),
      arbitrator.getAddress(),
      client.getAddress(),
      worker.getAddress(),
    ]);

  const escrowArtifact = readContractArtifact(
    repoRoot,
    'packages/contracts/out/WorkstreamEscrow.sol/WorkstreamEscrow.json',
  );
  const usdcArtifact = readContractArtifact(
    repoRoot,
    'packages/contracts/out/WorkstreamEscrow.t.sol/USDCMock.json',
  );

  const usdcFactory = new ContractFactory(
    usdcArtifact.abi,
    usdcArtifact.bytecode.object,
    owner,
  );
  const usdc = asLocalUsdcContract(await usdcFactory.deploy());
  await usdc.deployed();

  const escrowFactory = new ContractFactory(
    escrowArtifact.abi,
    escrowArtifact.bytecode.object,
    owner,
  );
  const escrow = asLocalEscrowContract(
    await escrowFactory.deploy(ownerAddress, arbitratorAddress),
  );
  await escrow.deployed();

  return {
    provider,
    owner,
    arbitrator,
    client,
    worker,
    ownerAddress: normalizeEvmAddress(ownerAddress),
    arbitratorAddress: normalizeEvmAddress(arbitratorAddress),
    clientAddress: normalizeEvmAddress(clientAddress),
    workerAddress: normalizeEvmAddress(workerAddress),
    usdcAddress: normalizeEvmAddress(usdc.address),
    escrowAddress: normalizeEvmAddress(escrow.address),
    usdc,
    escrow,
  };
}

function applyDeterministicEnvironment(input: {
  databaseUrl: string;
  databaseSchema: string | null;
  rpcUrl: string;
  escrowAddress: string;
  arbitratorAddress: string;
}) {
  process.env.NODE_ENV = 'development';
  process.env.PERSISTENCE_DRIVER = 'postgres';
  process.env.DATABASE_URL = input.databaseUrl;
  process.env.DATABASE_SSL = 'false';
  if (input.databaseSchema) {
    process.env.DATABASE_SCHEMA = input.databaseSchema;
  } else {
    delete process.env.DATABASE_SCHEMA;
  }
  process.env.JWT_SECRET = 'local_chain_ingestion_verifier_secret_123456789';
  process.env.JWT_ISSUER = 'escrow4337';
  process.env.JWT_AUDIENCE = 'escrow4337:web';
  process.env.AUTH_EMAIL_MODE = 'mock';
  process.env.AUTH_EMAIL_FROM_EMAIL = 'no-reply@escrow.local';
  process.env.AUTH_EMAIL_FROM_NAME = 'Escrow4337 Local';
  process.env.WALLET_SMART_ACCOUNT_MODE = 'mock';
  process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = String(DEFAULT_CHAIN_ID);
  process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
    '0x00000061FEfce24A79343c27127435286BB7A4E1';
  process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
    '0x3333333333333333333333333333333333333333';
  process.env.WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE = 'verified_owner';
  process.env.ESCROW_CONTRACT_MODE = 'mock';
  process.env.ESCROW_CHAIN_ID = String(DEFAULT_CHAIN_ID);
  process.env.ESCROW_CONTRACT_ADDRESS = input.escrowAddress;
  process.env.ESCROW_ARBITRATOR_ADDRESS = input.arbitratorAddress;
  process.env.OPERATIONS_ESCROW_RPC_URL = input.rpcUrl;
  process.env.OPERATIONS_ESCROW_INGESTION_ENABLED = 'true';
  process.env.OPERATIONS_ESCROW_INGESTION_CONFIRMATIONS = '1';
  process.env.OPERATIONS_ESCROW_INGESTION_BATCH_BLOCKS = '1000';
  process.env.OPERATIONS_ESCROW_INGESTION_RESYNC_BLOCKS = '2';
  process.env.OPERATIONS_ESCROW_AUTHORITY_READS_ENABLED = 'true';
  process.env.OPERATIONS_ESCROW_BATCH_SYNC_LIMIT = '10';
  process.env.OPERATIONS_ESCROW_BATCH_SYNC_PERSIST = 'true';
}

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function summarizeTransaction(receipt: providers.TransactionReceipt) {
  return {
    hash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
  };
}

async function seedPersistedJob(
  escrowRepository: EscrowRepository,
  input: {
    jobHash: string;
    escrowId: string;
    escrowAddress: string;
    usdcAddress: string;
    clientAddress: string;
    workerAddress: string;
  },
) {
  const createdAt = Date.now() - 60_000;
  const jobId = randomUUID();
  const job: EscrowJobRecord = {
    id: jobId,
    title: 'Local chain ingestion verification',
    description:
      'Proof that finalized ingestion can project live chain history into authoritative audit reads.',
    category: 'software-development',
    termsJSON: {
      currency: 'USDC',
      chain: 'anvil',
      verification: 'local-chain-ingestion',
    },
    jobHash: input.jobHash,
    fundedAmount: '500',
    status: 'funded',
    createdAt,
    updatedAt: createdAt,
    contractorParticipation: {
      contractorEmail: 'worker@example.com',
      status: 'pending',
      joinedUserId: null,
      joinedAt: null,
      invite: {
        token: 'local-proof-invite',
        tokenIssuedAt: createdAt,
        lastSentAt: createdAt,
        lastSentMode: 'manual',
      },
    },
    milestones: [
      {
        title: 'Discovery',
        deliverable: 'Initial plan and scope checkpoint',
        amount: '300',
        status: 'pending',
      },
      {
        title: 'Delivery',
        deliverable: 'Final shipped implementation',
        amount: '200',
        status: 'pending',
      },
    ],
    audit: [
      {
        type: 'job.contractor_participation_requested',
        at: createdAt,
        payload: {
          jobId,
          workerAddress: input.workerAddress,
        },
      },
    ],
    operations: {
      chainSync: null,
      executionFailureWorkflow: null,
      staleWorkflow: null,
      commercial: null,
    },
    projectRoom: {
      submissions: [],
      messages: [],
      activity: [],
      supportCases: [],
    },
    onchain: {
      chainId: DEFAULT_CHAIN_ID,
      contractAddress: input.escrowAddress,
      escrowId: input.escrowId,
      clientAddress: input.clientAddress,
      workerAddress: input.workerAddress,
      currencyAddress: input.usdcAddress,
    },
    executions: [],
  };

  await escrowRepository.create(job);
  return job;
}

async function runVerification(
  input: RunnerInput,
): Promise<VerificationArtifact> {
  const serviceRoot = process.cwd();
  const repoRoot = resolve(serviceRoot, '..', '..');
  const outputPath =
    input.outputPath ??
    join(
      repoRoot,
      'artifacts',
      'local-chain-ingestion',
      `${Date.now()}-verification.json`,
    );

  const db = await preparePostgresIsolation(input.databaseUrl);
  const anvil = await startAnvil(input.anvilPort);
  let app: Awaited<
    ReturnType<typeof NestFactory.createApplicationContext>
  > | null = null;

  try {
    await applyMigrations(db.databaseUrl, db.schemaName);
    const contracts = await deployLocalContracts(repoRoot, anvil.rpcUrl);
    applyDeterministicEnvironment({
      databaseUrl: db.databaseUrl,
      databaseSchema: db.schemaName,
      rpcUrl: anvil.rpcUrl,
      escrowAddress: contracts.escrowAddress,
      arbitratorAddress: contracts.arbitratorAddress,
    });

    const mintAmount = 1_000n * ONE_USDC;
    await waitForContractReceipt(
      contracts.usdc.mint(contracts.clientAddress, mintAmount),
    );

    const jobHash = utils.keccak256(
      utils.toUtf8Bytes('escrow4337-local-chain-verification'),
    );

    const clientEscrow = connectLocalEscrow(contracts.escrow, contracts.client);
    const workerEscrow = connectLocalEscrow(contracts.escrow, contracts.worker);
    const arbitratorEscrow = connectLocalEscrow(
      contracts.escrow,
      contracts.arbitrator,
    );
    const clientUsdc = connectLocalUsdc(contracts.usdc, contracts.client);

    const createReceipt = await waitForContractReceipt(
      clientEscrow.createJob(
        contracts.workerAddress,
        contracts.usdcAddress,
        jobHash,
      ),
    );
    const escrowId = readJobCreatedEscrowId(createReceipt);
    requireCondition(
      escrowId,
      'Failed to read escrow id from the JobCreated receipt',
    );

    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const escrowRepository = app.get<EscrowRepository>(ESCROW_REPOSITORY);
    const usersService = app.get(UsersService);
    const chainSync = app.get(EscrowChainSyncService);
    const runtimeProfile = app.get(RuntimeProfileService);
    const escrowService = app.get(EscrowService);

    const localJob = await seedPersistedJob(escrowRepository, {
      jobHash,
      escrowId,
      escrowAddress: contracts.escrowAddress,
      usdcAddress: contracts.usdcAddress,
      clientAddress: contracts.clientAddress,
      workerAddress: contracts.workerAddress,
    });

    const operator = await usersService.getOrCreateByEmail(
      'operator@example.com',
    );
    await usersService.linkWallet(operator.id, {
      address: contracts.arbitratorAddress,
      walletKind: 'eoa',
      verificationMethod: 'siwe',
      verificationChainId: DEFAULT_CHAIN_ID,
      verifiedAt: Date.now(),
      label: 'Local arbitrator',
    });

    const milestones: LocalEscrowMilestoneInput[] = [
      {
        amount: 300n * ONE_USDC,
        deliverableHash: utils.hexZeroPad('0x0', 32),
        delivered: false,
        released: false,
        disputed: false,
      },
      {
        amount: 200n * ONE_USDC,
        deliverableHash: utils.hexZeroPad('0x0', 32),
        delivered: false,
        released: false,
        disputed: false,
      },
    ];

    const setMilestonesReceipt = await waitForContractReceipt(
      clientEscrow.setMilestones(escrowId, milestones),
    );

    const fundAmount = 500n * ONE_USDC;
    await waitForContractReceipt(
      clientUsdc.approve(contracts.escrowAddress, fundAmount),
    );
    const fundReceipt = await waitForContractReceipt(
      clientEscrow.fund(escrowId, fundAmount),
    );

    const deliverFirstReceipt = await waitForContractReceipt(
      workerEscrow.deliver(
        escrowId,
        0,
        utils.keccak256(utils.toUtf8Bytes('delivery-1')),
      ),
    );

    const releaseFirstReceipt = await waitForContractReceipt(
      clientEscrow.release(escrowId, 0),
    );

    const deliverSecondReceipt = await waitForContractReceipt(
      workerEscrow.deliver(
        escrowId,
        1,
        utils.keccak256(utils.toUtf8Bytes('delivery-2')),
      ),
    );

    const openDisputeSecondReceipt = await waitForContractReceipt(
      clientEscrow.openDispute(
        escrowId,
        1,
        utils.keccak256(utils.toUtf8Bytes('needs-fix')),
      ),
    );

    const resolveSecondReceipt = await waitForContractReceipt(
      arbitratorEscrow.resolve(escrowId, 1, 10_000),
    );

    await contracts.provider.send('evm_mine', []);

    const batchReport = await chainSync.runBatchBackfill({
      limit: 10,
      persist: true,
    });
    const protectedIngestionStatus = await chainSync.getIngestionStatus(
      operator.id,
    );
    const profile = await runtimeProfile.getProfile();
    const bundle = await escrowService.getAuditBundle(localJob.id);
    const projection = await escrowRepository.getOnchainProjection(localJob.id);

    requireCondition(
      projection,
      'Expected a persisted onchain projection after batch ingestion',
    );
    requireCondition(
      projection.health === 'healthy',
      `Expected a healthy onchain projection but received ${projection.health}`,
    );
    requireCondition(
      projection.status === 'resolved',
      `Expected projected job status resolved but received ${projection.status}`,
    );
    requireCondition(
      projection.lastEventCount >= 8,
      `Expected at least 8 ingested chain events but received ${projection.lastEventCount}`,
    );
    requireCondition(
      bundle.bundle.authority.source === 'chain_projection',
      `Expected authority source chain_projection but received ${bundle.bundle.authority.source}`,
    );
    requireCondition(
      bundle.bundle.job.status === 'resolved',
      `Expected authority-merged public job status resolved but received ${bundle.bundle.job.status}`,
    );
    requireCondition(
      bundle.bundle.job.milestones[0]?.status === 'released' &&
        bundle.bundle.job.milestones[1]?.status === 'refunded',
      'Expected chain authority to project milestone 0 as released and milestone 1 as refunded',
    );
    requireCondition(
      protectedIngestionStatus.status === 'ok',
      `Expected ingestion status ok but received ${protectedIngestionStatus.status}`,
    );
    requireCondition(
      protectedIngestionStatus.projections.healthyJobs >= 1,
      'Expected at least one healthy projected job',
    );
    requireCondition(
      profile.operations.chainIngestion.status === 'ok',
      `Expected runtime profile chain ingestion status ok but received ${profile.operations.chainIngestion.status}`,
    );
    requireCondition(
      batchReport.summary.failedJobs === 0 &&
        batchReport.summary.blockedJobs === 0 &&
        batchReport.summary.persistedJobs >= 1,
      `Batch verification failed with ${batchReport.summary.failedJobs} failed job(s), ${batchReport.summary.blockedJobs} blocked job(s), and ${batchReport.summary.persistedJobs} persisted job(s)`,
    );
    requireCondition(
      bundle.bundle.audit.some((event) => event.type === 'milestone.resolved'),
      'Expected the authority-backed audit bundle to include milestone.resolved',
    );
    requireCondition(
      bundle.bundle.audit.some(
        (event) => event.type === 'job.contractor_participation_requested',
      ),
      'Expected the audit bundle to retain off-chain contractor participation events',
    );

    const artifact: VerificationArtifact = {
      generatedAt: new Date().toISOString(),
      resources: {
        isolationMode: db.mode,
        databaseName: db.databaseName,
        schemaName: db.schemaName,
        rpcUrl: anvil.rpcUrl,
        chainId: DEFAULT_CHAIN_ID,
      },
      deployments: {
        escrowContractAddress: contracts.escrowAddress,
        usdcAddress: contracts.usdcAddress,
        ownerAddress: contracts.ownerAddress,
        arbitratorAddress: contracts.arbitratorAddress,
        clientAddress: contracts.clientAddress,
        workerAddress: contracts.workerAddress,
      },
      seededJob: {
        jobId: localJob.id,
        escrowId,
        localStatusBeforeIngestion: localJob.status,
        publicJobAfterAuthority: bundle.bundle.job,
      },
      lifecycle: {
        jobHash,
        txs: {
          createJob: summarizeTransaction(createReceipt),
          setMilestones: summarizeTransaction(setMilestonesReceipt),
          fund: summarizeTransaction(fundReceipt),
          deliverFirst: summarizeTransaction(deliverFirstReceipt),
          releaseFirst: summarizeTransaction(releaseFirstReceipt),
          deliverSecond: summarizeTransaction(deliverSecondReceipt),
          openDisputeSecond: summarizeTransaction(openDisputeSecondReceipt),
          resolveSecond: summarizeTransaction(resolveSecondReceipt),
        },
      },
      batchReport: {
        mode: batchReport.mode,
        summary: batchReport.summary,
        selection: batchReport.selection,
      },
      ingestionStatus: {
        status: protectedIngestionStatus.status,
        summary: protectedIngestionStatus.summary,
        latestBlock: protectedIngestionStatus.latestBlock,
        finalizedBlock: protectedIngestionStatus.finalizedBlock,
        lagBlocks: protectedIngestionStatus.lagBlocks,
        projections: protectedIngestionStatus.projections,
        cursor: protectedIngestionStatus.cursor
          ? {
              nextFromBlock: protectedIngestionStatus.cursor.nextFromBlock,
              lastFinalizedBlock:
                protectedIngestionStatus.cursor.lastFinalizedBlock,
              lastScannedBlock:
                protectedIngestionStatus.cursor.lastScannedBlock,
            }
          : null,
        issues: protectedIngestionStatus.issues,
        warnings: protectedIngestionStatus.warnings,
      },
      runtimeProfile: {
        profile: profile.profile,
        chainIngestion: profile.operations.chainIngestion,
      },
      authority: bundle.bundle.authority,
      projection: {
        health: projection.health,
        status: projection.status,
        fundedAmount: projection.fundedAmount,
        lastEventCount: projection.lastEventCount,
        lastProjectedBlock: projection.lastProjectedBlock,
        driftSummary: projection.driftSummary,
      },
      auditEventTypes: bundle.bundle.audit.map((event) => event.type),
      outputPath,
    };

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(artifact, null, 2));

    return artifact;
  } finally {
    if (app) {
      await app.close();
    }
    if (!input.keepResources) {
      await stopChildProcess(anvil.child).catch(() => undefined);
      await db.cleanup().catch(() => undefined);
    }
  }
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  if (!input) {
    return;
  }

  loadApiEnvironment();
  const artifact = await runVerification(input);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
