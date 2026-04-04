import { Inject, Injectable } from '@nestjs/common';
import { OTP_REQUEST_THROTTLES_REPOSITORY } from '../../persistence/persistence.tokens';
import type { OtpRequestThrottlesRepository } from '../../persistence/persistence.types';
import { AuthConfigService } from './auth.config';
import { AuthTooManyRequestsException } from './auth.errors';
import type {
  OtpRequestThrottleRecord,
  OtpRequestThrottleScope,
} from './auth.types';

@Injectable()
export class OtpRequestThrottleService {
  constructor(
    private readonly config: AuthConfigService,
    @Inject(OTP_REQUEST_THROTTLES_REPOSITORY)
    private readonly throttlesRepository: OtpRequestThrottlesRepository,
  ) {}

  async consumeIpRequest(ip?: string) {
    const key = this.normalizeIp(ip);
    if (!key) {
      return;
    }

    const now = Date.now();
    const current = await this.throttlesRepository.get('ip', key);
    const next = this.buildNextRecord('ip', key, current, now);

    await this.throttlesRepository.set(next);

    if (next.count > this.config.otpIpSendMaxPerWindow) {
      throw new AuthTooManyRequestsException('Too many requests');
    }
  }

  private buildNextRecord(
    scope: OtpRequestThrottleScope,
    key: string,
    current: OtpRequestThrottleRecord | null,
    now: number,
  ): OtpRequestThrottleRecord {
    if (!current || now - current.windowStart > this.config.otpIpSendWindowMs) {
      return {
        scope,
        key,
        windowStart: now,
        count: 1,
        updatedAt: now,
      };
    }

    return {
      ...current,
      count: current.count + 1,
      updatedAt: now,
    };
  }

  private normalizeIp(ip?: string) {
    const value = ip?.trim().toLowerCase();
    if (!value) {
      return null;
    }
    return value.startsWith('::ffff:') ? value.slice(7) : value;
  }
}
