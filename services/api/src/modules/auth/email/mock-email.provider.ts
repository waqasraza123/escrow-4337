import { Injectable } from '@nestjs/common';
import type {
  EmailDeliveryReceipt,
  EmailMessage,
  EmailProvider,
} from './email.types';

@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly providerKind = 'mock' as const;

  send(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    void message;
    return Promise.resolve({
      providerKind: this.providerKind,
      acceptedAt: Date.now(),
    });
  }
}
