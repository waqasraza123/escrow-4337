import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EMAIL_PROVIDER } from './email/email.tokens';
import { EmailProviderError } from './email/email.errors';
import { EmailTemplateService } from './email/email-template.service';
import type { EmailProvider } from './email/email.types';

@Injectable()
export class EmailService {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async sendOtp(email: string, code: string) {
    try {
      return await this.emailProvider.send(
        this.emailTemplateService.createOtpMessage(email, code),
      );
    } catch (error) {
      if (error instanceof EmailProviderError) {
        if (error.code === 'relay_unavailable') {
          throw new ServiceUnavailableException(error.message);
        }
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }
}
