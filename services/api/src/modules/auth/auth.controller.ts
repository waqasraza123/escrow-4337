import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('start')
  start(@Body() dto: { email: string }) {
    return this.auth.start(dto);
  }

  @Post('verify')
  verify(@Body() dto: { email: string; code: string }) {
    return this.auth.verify(dto);
  }
}
