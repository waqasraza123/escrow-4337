import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthTooManyRequestsException extends HttpException {
  constructor(message = 'Too many requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
