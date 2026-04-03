import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  sendOtp(email: string, code: string) {
    const masked = email.replace(/(.{2}).+(@.+)/, '$1***$2');
    const line = `[AUTH] OTP for ${masked}: ${code}`;
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(line);
    }
    return true;
  }
}
