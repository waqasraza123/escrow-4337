import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { AuthConfigService } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthEmailModule } from './email/email.module';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { AuthGuard } from './guards/auth.guard';
import { JwtService } from './jwt';
import { OtpRequestThrottleService } from './otp-request-throttle.service';
import { OtpStore } from './otp.store';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PersistenceModule, UsersModule, OrganizationsModule, AuthEmailModule],
  controllers: [AuthController],
  providers: [
    AuthConfigService,
    AuthService,
    OtpRequestThrottleService,
    OtpStore,
    EmailService,
    JwtService,
    SessionsService,
    AuthGuard,
  ],
  exports: [AuthGuard, EmailService, JwtService, SessionsService],
})
export class AuthModule {}
