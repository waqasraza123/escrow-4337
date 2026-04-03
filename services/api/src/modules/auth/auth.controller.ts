import {
  Body,
  Controller,
  Get,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from './guards/auth.guard';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import * as authDto from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('start')
  start(
    @Body(new ZodValidationPipe(authDto.startSchema)) dto: authDto.StartDto,
    @Ip() ip: string,
  ) {
    return this.auth.start(dto, ip);
  }

  @Post('verify')
  verify(
    @Body(new ZodValidationPipe(authDto.verifySchema)) dto: authDto.VerifyDto,
  ) {
    return this.auth.verify(dto);
  }

  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(authDto.refreshSchema)) dto: authDto.RefreshDto,
  ) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  logout(
    @Body(new ZodValidationPipe(authDto.refreshSchema)) dto: authDto.RefreshDto,
  ) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@User() u: ReqUser) {
    return this.auth.me(u.id);
  }

  @UseGuards(AuthGuard)
  @Patch('shariah')
  setShariah(
    @Body(new ZodValidationPipe(authDto.shariahSchema)) dto: authDto.ShariahDto,
    @User() u: ReqUser,
  ) {
    return this.auth.setShariah(u.id, dto.shariah);
  }
}
