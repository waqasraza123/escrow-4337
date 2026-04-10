import { createHash, randomBytes } from 'node:crypto';
import { Wallet } from 'ethers';
import { Pool } from 'pg';

export const apiPort = 4100;
export const webPort = 3100;
export const adminPort = 3101;
export const apiBaseUrl = `http://localhost:${apiPort}`;
export const apiReadyUrl = `${apiBaseUrl}/auth/me`;
export const webBaseUrl = `http://localhost:${webPort}`;
export const adminBaseUrl = `http://localhost:${adminPort}`;
export const localDatabaseUrl =
  'postgresql://escrow4337:escrow4337@127.0.0.1:5432/escrow4337';
export const localOtpCode = '123456';
export const localArbitratorPrivateKey =
  '0x59c6995e998f97a5a0044966f094538c5f2f6f7d5f6a17d4f2ff1f908db8b27b';
export const localArbitratorWallet = new Wallet(localArbitratorPrivateKey);
export const localArbitratorAddress = localArbitratorWallet.address;
export const webSessionStorageKey = 'escrow4337.web.session';

export const localApiEnv: Record<string, string> = {
  NODE_ENV: 'development',
  PERSISTENCE_DRIVER: 'postgres',
  DATABASE_URL: localDatabaseUrl,
  DATABASE_SSL: 'false',
  JWT_SECRET: 'local_development_secret_change_me_123456',
  JWT_ISSUER: 'escrow4337',
  JWT_AUDIENCE: 'escrow4337:web',
  JWT_ACCESS_TTL_SEC: '900',
  JWT_REFRESH_TTL_SEC: '1209600',
  AUTH_SESSION_TTL_SEC: '1209600',
  AUTH_OTP_TTL_SEC: '600',
  AUTH_OTP_VERIFY_MAX_ATTEMPTS: '5',
  AUTH_OTP_LOCK_SEC: '600',
  AUTH_OTP_SEND_WINDOW_SEC: '3600',
  AUTH_OTP_SEND_MAX_PER_WINDOW: '5',
  AUTH_OTP_IP_SEND_WINDOW_SEC: '3600',
  AUTH_OTP_IP_SEND_MAX_PER_WINDOW: '20',
  NEST_API_CORS_ORIGINS: `${webBaseUrl},${adminBaseUrl}`,
  NEST_API_TRUST_PROXY: 'loopback',
  NEST_API_PORT: String(apiPort),
  AUTH_EMAIL_MODE: 'mock',
  AUTH_EMAIL_FROM_EMAIL: 'no-reply@escrow.local',
  AUTH_EMAIL_FROM_NAME: 'Escrow4337 Local',
  AUTH_EMAIL_OTP_SUBJECT: 'Your Escrow4337 code',
  WALLET_SMART_ACCOUNT_MODE: 'mock',
  WALLET_SMART_ACCOUNT_CHAIN_ID: '84532',
  WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS:
    '0x00000061FEfce24A79343c27127435286BB7A4E1',
  WALLET_SMART_ACCOUNT_FACTORY_ADDRESS:
    '0x3333333333333333333333333333333333333333',
  WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE: 'verified_owner',
  ESCROW_CONTRACT_MODE: 'mock',
  ESCROW_CHAIN_ID: '84532',
  ESCROW_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
  ESCROW_ARBITRATOR_ADDRESS: localArbitratorAddress,
};

let pool: Pool | null = null;

export type LocalSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type VerifyAuthResponse = LocalSessionTokens & {
  user: {
    id: string;
    email: string;
  };
};

type WalletLinkChallengeResponse = {
  challengeId: string;
  message: string;
};

type CreateJobResponse = {
  jobId: string;
};

function getPool() {
  pool ??= new Pool({
    connectionString: localDatabaseUrl,
  });

  return pool;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashOtp(code: string, salt: string) {
  return createHash('sha256')
    .update(salt + code)
    .digest('hex');
}

async function readErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Request failed with ${response.status}`;
  }

  try {
    const body = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message || body.error || text;
  } catch {
    return text;
  }
}

async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function resetOtpState(email: string) {
  const key = normalizeEmail(email);
  const db = getPool();

  await db.query('DELETE FROM auth_otp_entries WHERE email = $1', [key]);
  await db.query(
    "DELETE FROM auth_otp_request_throttles WHERE scope = 'ip' AND throttle_key IN ($1, $2)",
    ['127.0.0.1', '::1'],
  );
}

export async function forceOtpCode(email: string, code = localOtpCode) {
  const key = normalizeEmail(email);
  const db = getPool();
  const salt = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const hash = hashOtp(code, salt);

  await db.query(
    `
      UPDATE auth_otp_entries
      SET hash = $2,
          salt = $3,
          expires_at_ms = $4,
          attempts = 0,
          locked_until_ms = NULL
      WHERE email = $1
    `,
    [key, hash, salt, expiresAt],
  );
}

export async function createLocalSession(email: string): Promise<LocalSessionTokens> {
  await resetOtpState(email);
  await apiJson<{ ok: true }>('/auth/start', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  await forceOtpCode(email, localOtpCode);

  const response = await apiJson<VerifyAuthResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code: localOtpCode }),
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

export async function linkWalletForSession(
  session: LocalSessionTokens,
  wallet: Wallet,
) {
  const challenge = await apiJson<WalletLinkChallengeResponse>(
    '/wallet/link/challenge',
    {
      method: 'POST',
      body: JSON.stringify({
        address: wallet.address,
        walletKind: 'eoa',
        chainId: 84532,
      }),
    },
    session.accessToken,
  );
  const signature = await wallet.signMessage(challenge.message);

  return apiJson(
    '/wallet/link/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    },
    session.accessToken,
  );
}

export async function provisionSmartAccountForSession(
  session: LocalSessionTokens,
  ownerAddress: string,
) {
  return apiJson(
    '/wallet/smart-account/provision',
    {
      method: 'POST',
      body: JSON.stringify({
        ownerAddress,
        setAsDefault: true,
      }),
    },
    session.accessToken,
  );
}

export async function createJobForSession(
  session: LocalSessionTokens,
  input: {
    contractorEmail: string;
    workerAddress: string;
    currencyAddress: string;
    title: string;
    description: string;
    category?: string;
    termsJSON?: Record<string, string | number | boolean>;
  },
) {
  const response = await apiJson<CreateJobResponse>(
    '/jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        contractorEmail: input.contractorEmail,
        workerAddress: input.workerAddress,
        currencyAddress: input.currencyAddress,
        title: input.title,
        description: input.description,
        category: input.category ?? 'software-development',
        termsJSON: input.termsJSON ?? {
          disputeModel: 'operator-mediation',
          reviewWindowDays: 3,
          evidenceExpectation: 'Delivery note plus linked evidence URLs',
        },
      }),
    },
    session.accessToken,
  );

  return response.jobId;
}

export async function fundJobForSession(
  session: LocalSessionTokens,
  jobId: string,
  amount: string,
) {
  return apiJson(
    `/jobs/${jobId}/fund`,
    {
      method: 'POST',
      body: JSON.stringify({ amount }),
    },
    session.accessToken,
  );
}

export async function setMilestonesForSession(
  session: LocalSessionTokens,
  jobId: string,
  milestones: Array<{
    title: string;
    deliverable: string;
    amount: string;
    dueAt?: number;
  }>,
) {
  return apiJson(
    `/jobs/${jobId}/milestones`,
    {
      method: 'POST',
      body: JSON.stringify({ milestones }),
    },
    session.accessToken,
  );
}

export async function waitForJobIdByTitle(
  title: string,
  timeoutMs = 20_000,
) {
  const db = getPool();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await db.query<{ id: string }>(
      `
        SELECT id
        FROM escrow_jobs
        WHERE title = $1
        ORDER BY created_at_ms DESC
        LIMIT 1
      `,
      [title],
    );

    const jobId = result.rows[0]?.id;
    if (jobId) {
      return jobId;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for job id for title: ${title}`);
}

export async function closeLocalProfileDb() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
