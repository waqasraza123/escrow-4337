export type SessionRecord = {
  sid: string;
  userId: string;
  email: string;
  exp: number;
  revoked: boolean;
  refreshTokenId: string;
};

export type OtpEntry = {
  hash: string;
  salt: string;
  exp: number;
  email: string;
  attempts: number;
  lockedUntil?: number;
  lastSentAt: number;
  sentCountWindow: { windowStart: number; count: number };
};
