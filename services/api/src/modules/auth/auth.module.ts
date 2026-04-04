import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthEmailModule } from './email/email.module';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { AuthGuard } from './guards/auth.guard';
import { JwtService } from './jwt';
import { OtpStore } from './otp.store';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PersistenceModule, UsersModule, AuthEmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpStore,
    EmailService,
    JwtService,
    SessionsService,
    AuthGuard,
  ],
  exports: [AuthGuard, JwtService, SessionsService],
})
export class AuthModule {}
