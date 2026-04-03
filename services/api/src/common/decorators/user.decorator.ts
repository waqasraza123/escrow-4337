import {
  UnauthorizedException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { ReqUser } from '../http/authenticated-request';
import { isAuthenticatedRequest } from '../http/authenticated-request';

export type { ReqUser } from '../http/authenticated-request';

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqUser => {
    const request = ctx.switchToHttp().getRequest<unknown>();

    if (!isAuthenticatedRequest(request)) {
      throw new UnauthorizedException('Invalid request context');
    }

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return user;
  },
);
