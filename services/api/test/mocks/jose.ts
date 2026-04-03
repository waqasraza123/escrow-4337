type JwtPayload = Record<string, unknown>;

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export class SignJWT {
  constructor(private readonly payload: JwtPayload) {}

  setProtectedHeader() {
    return this;
  }

  setIssuer() {
    return this;
  }

  setAudience() {
    return this;
  }

  setIssuedAt() {
    return this;
  }

  setExpirationTime() {
    return this;
  }

  sign() {
    return encodeBase64Url(JSON.stringify(this.payload));
  }
}

export function jwtVerify(token: string) {
  const payload = JSON.parse(decodeBase64Url(token)) as JwtPayload;
  return { payload };
}
