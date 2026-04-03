import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isAuthenticatedRequest } from '../../../common/http/authenticated-request';
import { JwtService } from '../jwt';
import { SessionsService } from '../sessions.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<unknown>();

    if (!isAuthenticatedRequest(request)) {
      throw new UnauthorizedException('Invalid request context');
    }

    const authorizationHeader = request.headers.authorization;
    const authHeader = Array.isArray(authorizationHeader)
      ? (authorizationHeader[0] ?? '')
      : (authorizationHeader ?? '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) throw new UnauthorizedException('Missing token');

    const { userId, email, sid } = await this.jwt.verifyAccess(token);
    this.sessions.validate(sid);
    request.user = { id: userId, email, sid };

    return true;
  }
}
