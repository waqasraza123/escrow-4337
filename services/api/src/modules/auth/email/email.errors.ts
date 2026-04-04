import type { EmailProviderKind } from './email.types';

export type EmailProviderErrorContext = {
  code: string;
  providerKind: EmailProviderKind;
  recipientEmail: string;
};

export class EmailProviderError extends Error {
  readonly code: string;
  readonly providerKind: EmailProviderKind;
  readonly recipientEmail: string;

  constructor(message: string, context: EmailProviderErrorContext) {
    super(message);
    this.name = 'EmailProviderError';
    this.code = context.code;
    this.providerKind = context.providerKind;
    this.recipientEmail = context.recipientEmail;
  }
}
