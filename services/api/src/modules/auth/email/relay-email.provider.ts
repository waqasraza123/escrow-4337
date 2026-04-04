import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EmailConfigService } from './email.config';
import { EmailProviderError } from './email.errors';
import type {
  EmailDeliveryReceipt,
  EmailMessage,
  EmailProvider,
} from './email.types';

const receiptSchema = z.object({
  acceptedAt: z.number().int().positive(),
  messageId: z.string().trim().min(1).optional(),
});

const relayErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

type RelayEmailBody = {
  to: string;
  from: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  tags?: string[];
};

@Injectable()
export class RelayEmailProvider implements EmailProvider {
  readonly providerKind = 'relay' as const;

  constructor(private readonly config: EmailConfigService) {}

  async send(message: EmailMessage): Promise<EmailDeliveryReceipt> {
    const headers = new Headers({
      'content-type': 'application/json',
    });

    if (this.config.relayApiKey) {
      headers.set('x-api-key', this.config.relayApiKey);
    }

    let response: Response;
    try {
      response = await fetch(`${this.config.relayBaseUrl}/email/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.createBody(message)),
      });
    } catch {
      throw new EmailProviderError('Email relay is unavailable', {
        code: 'relay_unavailable',
        providerKind: this.providerKind,
        recipientEmail: message.to,
      });
    }

    const bodyText = await response.text();
    let parsedBody: unknown = null;
    if (bodyText.length > 0) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        throw new EmailProviderError('Email relay returned invalid JSON', {
          code: 'relay_invalid_json',
          providerKind: this.providerKind,
          recipientEmail: message.to,
        });
      }
    }

    if (!response.ok) {
      const relayError = relayErrorSchema.safeParse(parsedBody);
      if (relayError.success) {
        throw new EmailProviderError(relayError.data.message, {
          code: relayError.data.code,
          providerKind: this.providerKind,
          recipientEmail: message.to,
        });
      }

      throw new EmailProviderError('Email relay rejected the request', {
        code: 'relay_request_failed',
        providerKind: this.providerKind,
        recipientEmail: message.to,
      });
    }

    const receipt = receiptSchema.parse(parsedBody);
    return {
      providerKind: this.providerKind,
      acceptedAt: receipt.acceptedAt,
      messageId: receipt.messageId,
    };
  }

  private createBody(message: EmailMessage): RelayEmailBody {
    return {
      to: message.to,
      from: {
        email: message.fromEmail,
        name: message.fromName,
      },
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      tags: message.tags,
    };
  }
}
