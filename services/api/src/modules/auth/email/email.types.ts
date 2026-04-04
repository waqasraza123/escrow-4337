export type EmailDeliveryMode = 'mock' | 'relay';
export type EmailProviderKind = 'mock' | 'relay';

export type EmailMessage = {
  to: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  tags?: string[];
};

export type EmailDeliveryReceipt = {
  providerKind: EmailProviderKind;
  acceptedAt: number;
  messageId?: string;
};

export interface EmailProvider {
  readonly providerKind: EmailProviderKind;
  send(message: EmailMessage): Promise<EmailDeliveryReceipt>;
}
