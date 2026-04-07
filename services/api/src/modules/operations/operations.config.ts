import { Injectable } from '@nestjs/common';
import { readPositiveInteger } from '../../common/config/readers';

@Injectable()
export class OperationsConfigService {
  get escrowStaleJobHours() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_STALE_JOB_HOURS,
      72,
    );
  }

  get escrowStaleJobMs() {
    return this.escrowStaleJobHours * 60 * 60 * 1000;
  }

  get escrowHealthDefaultLimit() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_HEALTH_DEFAULT_LIMIT,
      25,
    );
  }

  get escrowHealthMaxLimit() {
    const configured = readPositiveInteger(
      process.env.OPERATIONS_ESCROW_HEALTH_MAX_LIMIT,
      100,
    );

    return Math.max(configured, this.escrowHealthDefaultLimit);
  }
}
