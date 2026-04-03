import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpStore } from './otp.store';
import { EmailService } from './email.service';
import { JwtService } from './jwt';
import { SessionsService } from './sessions.service';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpStore,
    EmailService,
    JwtService,
    SessionsService,
    AuthGuard,
  ],
  exports: [AuthGuard],
})
export class AuthModule {}
