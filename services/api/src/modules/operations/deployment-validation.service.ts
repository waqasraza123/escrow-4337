import { Injectable } from '@nestjs/common';
import { readPositiveInteger } from '../../common/config/readers';
import { readApiPort } from '../../common/http/port';
import { readTrustProxyValue } from '../../common/http/trust-proxy';
import { AuthConfigService } from '../auth/auth.config';
import { EmailConfigService } from '../auth/email/email.config';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import { PostgresDatabaseService } from '../../persistence/postgres/postgres-database.service';
import { inspectMigrationStatus } from '../../persistence/postgres/migrations';
import { SmartAccountConfigService } from '../wallet/provisioning/smart-account.config';
import { EscrowChainSyncDaemonDeploymentService } from './escrow-chain-sync-daemon-deployment.service';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import type {
  DeploymentCheck,
  DeploymentValidationReport,
} from './deployment-validation.types';
import {
  isLoopbackUrl,
  isStrictDeploymentValidationEnvironment,
  readBooleanFlag,
  readDeploymentTargetEnvironment,
  readRequiredDeployedBrowserTargets,
  toOrigin,
} from './deployment-target';
import { readCorsOrigins } from '../../common/http/cors';

type JsonRpcSuccess = {
  result?: string;
  error?: {
    code?: number;
    message?: string;
  };
};

@Injectable()
export class DeploymentValidationService {
  constructor(
    private readonly authConfig: AuthConfigService,
    private readonly emailConfig: EmailConfigService,
    private readonly escrowConfig: EscrowContractConfigService,
    private readonly persistenceConfig: PersistenceConfigService,
    private readonly postgres: PostgresDatabaseService,
    private readonly smartAccountConfig: SmartAccountConfigService,
    private readonly daemonDeployment: EscrowChainSyncDaemonDeploymentService,
    private readonly daemonMonitoring: EscrowChainSyncDaemonMonitoringService,
  ) {}

  assertRuntimeConfiguration() {
    const checks = this.collectConfigurationChecks();
    const failedCheck = checks.find((check) => check.status === 'failed');
    if (failedCheck) {
      throw new Error(failedCheck.details || failedCheck.summary);
    }
  }

  async runValidation(): Promise<DeploymentValidationReport> {
    const targetEnvironment = readDeploymentTargetEnvironment();
    const checks = this.collectConfigurationChecks();

    checks.push(
      await this.whenChecksPass(
        checks,
        ['persistence-config'],
        'database',
        'Database connectivity skipped because persistence configuration is invalid',
        () => this.checkDatabase(),
      ),
    );
    checks.push(
      await this.whenChecksPass(
        checks,
        ['email-config'],
        'email-relay',
        'Email relay probe skipped because email configuration is invalid',
        () => this.checkEmailRelay(),
      ),
    );
    checks.push(
      await this.whenChecksPass(
        checks,
        ['smart-account-config'],
        'smart-account-relay',
        'Smart-account relay probe skipped because smart-account configuration is invalid',
        () => this.checkSmartAccountRelay(),
      ),
    );
    checks.push(
      await this.whenChecksPass(
        checks,
        ['smart-account-config'],
        'bundler',
        'Bundler probe skipped because smart-account configuration is invalid',
        () => this.checkBundler(),
      ),
    );
    checks.push(
      await this.whenChecksPass(
        checks,
        ['smart-account-config'],
        'paymaster',
        'Paymaster probe skipped because smart-account configuration is invalid',
        () => this.checkPaymaster(),
      ),
    );
    checks.push(
      await this.whenChecksPass(
        checks,
        ['escrow-config'],
        'escrow-relay',
        'Escrow relay probe skipped because escrow configuration is invalid',
        () => this.checkEscrowRelay(),
      ),
    );
    checks.push(await this.checkChainSyncDaemon());

    return {
      generatedAt: new Date().toISOString(),
      ok: !checks.some((check) => check.status === 'failed'),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        targetEnvironment,
        strictValidation: isStrictDeploymentValidationEnvironment(),
        persistenceDriver: this.persistenceConfig.driver,
        trustProxyRaw: process.env.NEST_API_TRUST_PROXY?.trim() || null,
        trustProxyParsed:
          readTrustProxyValue(process.env.NEST_API_TRUST_PROXY) ?? null,
      },
      checks,
    };
  }

  private async checkChainSyncDaemon(): Promise<DeploymentCheck> {
    const report = await this.daemonMonitoring.getReport();
    const primaryIssue = report.issues[0];

    if (report.status === 'ok') {
      return {
        id: 'chain-sync-daemon',
        status: 'ok',
        summary: report.summary,
        metadata: {
          required: report.required,
        },
      };
    }

    return {
      id: 'chain-sync-daemon',
      status: report.status === 'failed' ? 'failed' : 'warning',
      summary: report.summary,
      details: primaryIssue?.detail ?? undefined,
      metadata: {
        required: report.required,
        issueCodes: report.issues.map((issue) => issue.code),
      },
    };
  }

  private checkChainSyncDaemonConfiguration(): DeploymentCheck {
    const posture = this.daemonDeployment.getPosture();

    return {
      id: 'chain-sync-daemon-config',
      status: posture.status,
      summary: posture.summary,
      details:
        posture.issues[0] ??
        posture.warnings[0] ??
        'Recurring chain-sync daemon configuration is aligned with the current environment.',
      metadata: {
        required: posture.required,
        rpcConfigured: posture.rpcConfigured,
        persistDefault: posture.persistDefault,
        intervalSeconds: posture.intervalSeconds,
        runOnStart: posture.runOnStart,
        lockProvider: posture.lockProvider,
        alertingConfigured: posture.alertingConfigured,
        alertMinSeverity: posture.alertMinSeverity,
        alertSendRecovery: posture.alertSendRecovery,
        alertResendIntervalSeconds: posture.alertResendIntervalSeconds,
        thresholds: posture.thresholds,
        issues: posture.issues,
        warnings: posture.warnings,
      },
    };
  }

  private async whenChecksPass(
    checks: DeploymentCheck[],
    dependencies: string[],
    id: string,
    summary: string,
    probe: () => Promise<DeploymentCheck>,
  ): Promise<DeploymentCheck> {
    const failedDependency = this.failedDependencyCheck(dependencies, checks);

    if (!failedDependency) {
      return probe();
    }

    return {
      id,
      status: 'skipped',
      summary,
      details:
        failedDependency.details ||
        `Skipped because ${failedDependency.id} failed`,
      metadata: {
        blockedBy: failedDependency.id,
      },
    };
  }

  private failedDependencyCheck(
    dependencies: string[],
    checks: DeploymentCheck[],
  ) {
    return checks.find(
      (check) => dependencies.includes(check.id) && check.status === 'failed',
    );
  }

  private collectConfigurationChecks() {
    const checks: DeploymentCheck[] = [];
    const targetEnvironment = readDeploymentTargetEnvironment();

    checks.push(
      {
        id: 'deployment-target',
        status: 'ok',
        summary: targetEnvironment
          ? `Deployment validation is enforcing the ${targetEnvironment} target contract.`
          : 'Deployment validation is running without an explicit staging/production target contract.',
        details: targetEnvironment
          ? undefined
          : 'Set DEPLOYMENT_TARGET_ENVIRONMENT, LAUNCH_CANDIDATE_ENVIRONMENT, or DEPLOYED_SMOKE_ENVIRONMENT to enforce deployed browser target and CORS alignment checks.',
        metadata: {
          targetEnvironment,
          strictValidation: isStrictDeploymentValidationEnvironment(),
        },
      },
    );

    checks.push(
      this.captureCheck(
        'api-port-config',
        'API listen port is configured',
        () => {
          void readApiPort();
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'auth-config',
        'Auth runtime configuration is valid',
        () => {
          void this.authConfig.jwtSecret;
          void this.authConfig.jwtIssuer;
          void this.authConfig.jwtAudience;
          void this.authConfig.accessTtlSec;
          void this.authConfig.refreshTtlSec;
          void this.authConfig.sessionTtlMs;
          void this.authConfig.otpTtlMs;
          void this.authConfig.otpVerifyMaxAttempts;
          void this.authConfig.otpLockMs;
          void this.authConfig.otpSendWindowMs;
          void this.authConfig.otpSendMaxPerWindow;
          void this.authConfig.otpIpSendWindowMs;
          void this.authConfig.otpIpSendMaxPerWindow;
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'persistence-config',
        this.persistenceConfig.driver === 'postgres'
          ? 'Persistence is configured for Postgres'
          : 'Persistence is configured for file storage',
        () => {
          if (
            isStrictDeploymentValidationEnvironment() &&
            this.persistenceConfig.driver !== 'postgres'
          ) {
            throw new Error(
              'PERSISTENCE_DRIVER=file is not deployment-ready; use postgres for deployed validation',
            );
          }

          if (this.persistenceConfig.driver === 'postgres') {
            void this.persistenceConfig.databaseUrl;
          }
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'email-config',
        this.emailConfig.mode === 'relay'
          ? 'Auth email delivery is configured for relay mode'
          : 'Auth email delivery is configured for mock mode',
        () => {
          void this.emailConfig.fromEmail;
          void this.emailConfig.fromName;
          void this.emailConfig.otpSubject;
          void this.emailConfig.otpTtlMinutes;

          if (
            isStrictDeploymentValidationEnvironment() &&
            this.emailConfig.mode === 'mock'
          ) {
            throw new Error(
              'AUTH_EMAIL_MODE=mock does not validate deployed email delivery',
            );
          }

          if (this.emailConfig.mode === 'relay') {
            void this.emailConfig.relayBaseUrl;
          }
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'smart-account-config',
        this.smartAccountConfig.mode === 'relay'
          ? 'Smart-account provisioning is configured for relay mode'
          : 'Smart-account provisioning is configured for mock mode',
        () => {
          void this.smartAccountConfig.chainId;
          void this.smartAccountConfig.sponsorshipMode;

          if (
            isStrictDeploymentValidationEnvironment() &&
            this.smartAccountConfig.mode === 'mock'
          ) {
            throw new Error(
              'WALLET_SMART_ACCOUNT_MODE=mock does not validate deployed smart-account infrastructure',
            );
          }

          if (this.smartAccountConfig.mode === 'relay') {
            void this.smartAccountConfig.entryPointAddress;
            void this.smartAccountConfig.factoryAddress;
            void this.smartAccountConfig.bundlerUrl;
            void this.smartAccountConfig.relayBaseUrl;
            if (this.smartAccountConfig.sponsorshipMode !== 'disabled') {
              void this.smartAccountConfig.paymasterUrl;
            }
          }
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'escrow-config',
        this.escrowConfig.mode === 'relay'
          ? 'Escrow execution is configured for relay mode'
          : 'Escrow execution is configured for mock mode',
        () => {
          void this.escrowConfig.chainId;

          if (
            isStrictDeploymentValidationEnvironment() &&
            this.escrowConfig.mode === 'mock'
          ) {
            throw new Error(
              'ESCROW_CONTRACT_MODE=mock does not validate deployed escrow execution',
            );
          }

          if (this.escrowConfig.mode === 'relay') {
            void this.escrowConfig.contractAddress;
            void this.escrowConfig.arbitratorAddress;
            void this.escrowConfig.relayBaseUrl;
          }
        },
      ),
    );

    checks.push(
      this.captureCheck(
        'chain-alignment',
        'Smart-account and escrow chain configuration are aligned',
        () => {
          if (
            this.smartAccountConfig.mode !== 'relay' ||
            this.escrowConfig.mode !== 'relay'
          ) {
            return;
          }

          if (this.smartAccountConfig.chainId !== this.escrowConfig.chainId) {
            throw new Error(
              `Smart-account chain ${this.smartAccountConfig.chainId} does not match escrow chain ${this.escrowConfig.chainId}`,
            );
          }
        },
      ),
    );

    const trustProxy = process.env.NEST_API_TRUST_PROXY?.trim() || null;
    const parsedTrustProxy = readTrustProxyValue(
      process.env.NEST_API_TRUST_PROXY,
    );
    checks.push({
      id: 'trust-proxy',
      status:
        isStrictDeploymentValidationEnvironment() && !trustProxy
          ? 'warning'
          : 'ok',
      summary: trustProxy
        ? 'Trusted proxy configuration is set'
        : 'Trusted proxy configuration is not set',
      details: trustProxy
        ? `NEST_API_TRUST_PROXY resolves to ${String(parsedTrustProxy)}`
        : 'Set NEST_API_TRUST_PROXY when the API runs behind an ingress or reverse proxy so IP-aware OTP throttling sees the real client address.',
      metadata: {
        raw: trustProxy,
        parsed: parsedTrustProxy ?? null,
      },
    });

    checks.push(this.checkDeployedBrowserTargets(targetEnvironment));
    checks.push(this.checkDeployedBrowserCorsAlignment(targetEnvironment));

    checks.push(this.checkChainSyncDaemonConfiguration());

    return checks;
  }

  private captureCheck(
    id: string,
    summary: string,
    reader: () => void,
  ): DeploymentCheck {
    try {
      reader();
      return {
        id,
        status: 'ok',
        summary,
      };
    } catch (error) {
      return {
        id,
        status: 'failed',
        summary,
        details:
          error instanceof Error ? error.message : 'Unknown validation failure',
      };
    }
  }

  private async checkDatabase(): Promise<DeploymentCheck> {
    if (this.persistenceConfig.driver !== 'postgres') {
      return {
        id: 'database',
        status: 'skipped',
        summary: 'Database connectivity skipped because Postgres is disabled',
      };
    }

    try {
      const info = await this.postgres.query<{
        currentDatabase: string;
      }>('SELECT current_database() AS "currentDatabase"');
      const migrationStatus = await inspectMigrationStatus(this.postgres);

      if (migrationStatus.pending.length > 0) {
        return {
          id: 'database',
          status: 'failed',
          summary: 'Postgres is reachable but migrations are still pending',
          details: `Pending migrations: ${migrationStatus.pending.join(', ')}`,
          metadata: {
            database: info.rows[0]?.currentDatabase ?? null,
            appliedMigrations: migrationStatus.applied.length,
            pendingMigrations: migrationStatus.pending,
          },
        };
      }

      return {
        id: 'database',
        status: 'ok',
        summary: 'Postgres is reachable and migrations are fully applied',
        metadata: {
          database: info.rows[0]?.currentDatabase ?? null,
          appliedMigrations: migrationStatus.applied.length,
          totalMigrations: migrationStatus.total,
        },
      };
    } catch (error) {
      return {
        id: 'database',
        status: 'failed',
        summary: 'Postgres connectivity or migration inspection failed',
        details:
          error instanceof Error ? error.message : 'Unknown database failure',
      };
    }
  }

  private async checkEmailRelay() {
    if (this.emailConfig.mode !== 'relay') {
      return {
        id: 'email-relay',
        status: 'skipped',
        summary: 'Email relay probe skipped because mock mode is enabled',
      } satisfies DeploymentCheck;
    }

    return this.probeReachability(
      'email-relay',
      process.env.AUTH_EMAIL_RELAY_HEALTHCHECK_URL?.trim() ||
        `${this.emailConfig.relayBaseUrl}/health`,
      'Auth email relay is reachable',
      this.emailConfig.relayApiKey
        ? {
            'x-api-key': this.emailConfig.relayApiKey,
          }
        : undefined,
    );
  }

  private async checkSmartAccountRelay() {
    if (this.smartAccountConfig.mode !== 'relay') {
      return {
        id: 'smart-account-relay',
        status: 'skipped',
        summary:
          'Smart-account relay probe skipped because mock mode is enabled',
      } satisfies DeploymentCheck;
    }

    return this.probeReachability(
      'smart-account-relay',
      process.env.WALLET_SMART_ACCOUNT_RELAY_HEALTHCHECK_URL?.trim() ||
        `${this.smartAccountConfig.relayBaseUrl}/health`,
      'Smart-account relay is reachable',
      this.smartAccountConfig.relayApiKey
        ? {
            'x-api-key': this.smartAccountConfig.relayApiKey,
          }
        : undefined,
    );
  }

  private async checkEscrowRelay() {
    if (this.escrowConfig.mode !== 'relay') {
      return {
        id: 'escrow-relay',
        status: 'skipped',
        summary: 'Escrow relay probe skipped because mock mode is enabled',
      } satisfies DeploymentCheck;
    }

    return this.probeReachability(
      'escrow-relay',
      process.env.ESCROW_RELAY_HEALTHCHECK_URL?.trim() ||
        `${this.escrowConfig.relayBaseUrl}/health`,
      'Escrow relay is reachable',
      this.escrowConfig.relayApiKey
        ? {
            'x-api-key': this.escrowConfig.relayApiKey,
          }
        : undefined,
    );
  }

  private async checkBundler() {
    if (this.smartAccountConfig.mode !== 'relay') {
      return {
        id: 'bundler',
        status: 'skipped',
        summary:
          'Bundler probe skipped because mock smart-account mode is enabled',
      } satisfies DeploymentCheck;
    }

    return this.probeJsonRpcChain(
      'bundler',
      process.env.WALLET_SMART_ACCOUNT_BUNDLER_HEALTHCHECK_URL?.trim() ||
        this.smartAccountConfig.bundlerUrl,
      this.smartAccountConfig.chainId,
      false,
    );
  }

  private async checkPaymaster() {
    if (
      this.smartAccountConfig.mode !== 'relay' ||
      this.smartAccountConfig.sponsorshipMode === 'disabled'
    ) {
      return {
        id: 'paymaster',
        status: 'skipped',
        summary:
          'Paymaster probe skipped because sponsorship is disabled or relay mode is off',
      } satisfies DeploymentCheck;
    }

    return this.probeJsonRpcChain(
      'paymaster',
      process.env.WALLET_SMART_ACCOUNT_PAYMASTER_HEALTHCHECK_URL?.trim() ||
        this.smartAccountConfig.paymasterUrl!,
      this.smartAccountConfig.chainId,
      true,
    );
  }

  private async probeReachability(
    id: string,
    url: string,
    summary: string,
    extraHeaders?: Record<string, string>,
  ): Promise<DeploymentCheck> {
    try {
      const headers = new Headers(extraHeaders);
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.status >= 500) {
        return {
          id,
          status: 'failed',
          summary,
          details: `Received ${response.status} from ${url}`,
          metadata: {
            statusCode: response.status,
            url,
          },
        };
      }

      return {
        id,
        status: 'ok',
        summary,
        details: `Received ${response.status} from ${url}`,
        metadata: {
          statusCode: response.status,
          url,
        },
      };
    } catch (error) {
      return {
        id,
        status: 'failed',
        summary,
        details:
          error instanceof Error ? error.message : 'Unknown network failure',
        metadata: { url },
      };
    }
  }

  private async probeJsonRpcChain(
    id: string,
    url: string,
    expectedChainId: number,
    allowMethodNotFound: boolean,
  ): Promise<DeploymentCheck> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'deployment_validation',
          method: 'eth_chainId',
          params: [],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const bodyText = await response.text();
      let body: JsonRpcSuccess = {};
      if (bodyText.length > 0) {
        body = JSON.parse(bodyText) as JsonRpcSuccess;
      }

      if (!response.ok) {
        return {
          id,
          status: 'failed',
          summary: `${id} probe failed`,
          details: `Received ${response.status} from ${url}`,
          metadata: {
            statusCode: response.status,
            url,
          },
        };
      }

      if (body.error) {
        if (allowMethodNotFound) {
          return {
            id,
            status: 'warning',
            summary: `${id} is reachable but did not answer eth_chainId`,
            details: body.error.message || 'JSON-RPC error returned',
            metadata: {
              url,
              errorCode: body.error.code ?? null,
            },
          };
        }

        return {
          id,
          status: 'failed',
          summary: `${id} returned a JSON-RPC error`,
          details: body.error.message || 'JSON-RPC error returned',
          metadata: {
            url,
            errorCode: body.error.code ?? null,
          },
        };
      }

      if (typeof body.result !== 'string' || !body.result.startsWith('0x')) {
        return {
          id,
          status: 'failed',
          summary: `${id} returned an invalid eth_chainId response`,
          details: `Expected a hex chain id result from ${url}`,
          metadata: {
            url,
            result: body.result ?? null,
          },
        };
      }

      const actualChainId = Number.parseInt(body.result, 16);
      if (actualChainId !== expectedChainId) {
        return {
          id,
          status: 'failed',
          summary: `${id} chain id does not match application configuration`,
          details: `Expected chain ${expectedChainId}, received ${actualChainId}`,
          metadata: {
            expectedChainId,
            actualChainId,
            url,
          },
        };
      }

      return {
        id,
        status: 'ok',
        summary: `${id} is reachable and reports the expected chain id`,
        metadata: {
          expectedChainId,
          actualChainId,
          url,
        },
      };
    } catch (error) {
      return {
        id,
        status: 'failed',
        summary: `${id} probe failed`,
        details:
          error instanceof Error ? error.message : 'Unknown network failure',
        metadata: { url },
      };
    }
  }

  private get timeoutMs() {
    return readPositiveInteger(
      process.env.DEPLOYMENT_VALIDATION_TIMEOUT_MS,
      5000,
    );
  }

  private checkDeployedBrowserTargets(
    targetEnvironment: ReturnType<typeof readDeploymentTargetEnvironment>,
  ): DeploymentCheck {
    if (!targetEnvironment) {
      return {
        id: 'deployed-browser-targets',
        status: 'skipped',
        summary:
          'Deployed browser target checks skipped because no deployment target environment is set',
      };
    }

    return this.captureCheck(
      'deployed-browser-targets',
      `Deployed browser targets are configured for ${targetEnvironment}`,
      () => {
        const targets = readRequiredDeployedBrowserTargets();
        const allowInsecureHttp = readBooleanFlag(
          process.env.PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP,
        );
        const allowLocalhost = readBooleanFlag(
          process.env.PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST,
        );

        for (const [label, value] of Object.entries(targets)) {
          const parsed = new URL(value);

          if (parsed.protocol !== 'https:' && !allowInsecureHttp) {
            throw new Error(
              `${label} must use HTTPS unless PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP=true`,
            );
          }

          if (isLoopbackUrl(value) && !allowLocalhost) {
            throw new Error(
              `${label} must not point at localhost unless PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST=true`,
            );
          }
        }
      },
    );
  }

  private checkDeployedBrowserCorsAlignment(
    targetEnvironment: ReturnType<typeof readDeploymentTargetEnvironment>,
  ): DeploymentCheck {
    if (!targetEnvironment) {
      return {
        id: 'deployed-browser-cors',
        status: 'skipped',
        summary:
          'Deployed browser CORS alignment skipped because no deployment target environment is set',
      };
    }

    return this.captureCheck(
      'deployed-browser-cors',
      `Backend CORS allowlist covers deployed browser targets for ${targetEnvironment}`,
      () => {
        const corsOrigins = readCorsOrigins(process.env.NEST_API_CORS_ORIGINS);
        const targets = readRequiredDeployedBrowserTargets();
        const requiredOrigins = [
          toOrigin(targets.webBaseUrl),
          toOrigin(targets.adminBaseUrl),
        ];
        const missingOrigins = requiredOrigins.filter(
          (origin) => !corsOrigins.includes(origin),
        );

        if (missingOrigins.length > 0) {
          throw new Error(
            `NEST_API_CORS_ORIGINS must include deployed browser origins: ${missingOrigins.join(', ')}`,
          );
        }
      },
    );
  }
}
