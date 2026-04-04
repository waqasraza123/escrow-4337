import { Injectable } from '@nestjs/common';
import { EmailConfigService } from './email.config';
import type { EmailMessage } from './email.types';

@Injectable()
export class EmailTemplateService {
  constructor(private readonly config: EmailConfigService) {}

  createOtpMessage(email: string, code: string): EmailMessage {
    return {
      to: email,
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      replyTo: this.config.replyTo,
      subject: this.config.otpSubject,
      text: this.createOtpText(code),
      html: this.createOtpHtml(code),
      tags: ['auth', 'otp'],
    };
  }

  private createOtpText(code: string) {
    return [
      'Your Escrow4337 verification code is below.',
      '',
      code,
      '',
      `This code expires in ${this.config.otpTtlMinutes} minutes.`,
      'If you did not request this code, you can ignore this email.',
    ].join('\n');
  }

  private createOtpHtml(code: string) {
    return [
      '<p>Your Escrow4337 verification code is below.</p>',
      `<p><strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>`,
      `<p>This code expires in ${this.config.otpTtlMinutes} minutes.</p>`,
      '<p>If you did not request this code, you can ignore this email.</p>',
    ].join('');
  }
}
