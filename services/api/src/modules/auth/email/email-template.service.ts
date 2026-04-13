import { Injectable } from '@nestjs/common';
import { EmailConfigService } from './email.config';
import type { ContractorInviteEmailInput, EmailMessage } from './email.types';

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

  createContractorInviteMessage(
    input: ContractorInviteEmailInput,
  ): EmailMessage {
    return {
      to: input.email,
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      replyTo: this.config.replyTo,
      subject: `Join your Escrow4337 contract: ${input.jobTitle}`,
      text: this.createContractorInviteText(input),
      html: this.createContractorInviteHtml(input),
      tags: ['escrow', 'contractor-invite'],
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

  private createContractorInviteText(input: ContractorInviteEmailInput) {
    return [
      `You've been invited to join the Escrow4337 contract "${input.jobTitle}".`,
      '',
      input.clientEmail
        ? `The client sent this invite from ${input.clientEmail}.`
        : 'A client sent this invite to your pending contractor email.',
      `Join using this wallet: ${input.workerAddress}.`,
      '',
      input.joinUrl,
      '',
      'Sign in with this invited email, link the required wallet if needed, and then complete the join step from the contract page.',
    ].join('\n');
  }

  private createContractorInviteHtml(input: ContractorInviteEmailInput) {
    return [
      `<p>You've been invited to join the Escrow4337 contract "<strong>${input.jobTitle}</strong>".</p>`,
      `<p>${
        input.clientEmail
          ? `The client sent this invite from <strong>${input.clientEmail}</strong>.`
          : 'A client sent this invite to your pending contractor email.'
      }</p>`,
      `<p>Join using this wallet: <strong>${input.workerAddress}</strong>.</p>`,
      `<p><a href="${input.joinUrl}">Open contractor join link</a></p>`,
      '<p>Sign in with this invited email, link the required wallet if needed, and then complete the join step from the contract page.</p>',
    ].join('');
  }
}
