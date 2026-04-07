import { Injectable } from '@nestjs/common';
import { readPositiveInteger } from '../../common/config/readers';

@Injectable()
export class OperationsConfigService {
  get escrowStaleJobHours() {
    return readPositiveInteger(process.env.OPERATIONS_ESCROW_STALE_JOB_HOURS, 72);
  }

  get escrowStaleJobMs() {
    return this.escrowStaleJobHours * 60 * 60 * 1000;
  }
}
