import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  readRequestExecutionContext,
  type RequestExecutionContext,
} from '../http/request-context';

export const RequestContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestExecutionContext => {
    const request = ctx.switchToHttp().getRequest<unknown>();
    return readRequestExecutionContext(request);
  },
);
