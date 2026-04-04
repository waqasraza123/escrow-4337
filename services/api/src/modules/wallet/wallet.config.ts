import { Injectable } from '@nestjs/common';

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class WalletConfigService {
  readonly siweDomain = process.env.WALLET_SIWE_DOMAIN || 'localhost';
  readonly siweUri = process.env.WALLET_SIWE_URI || 'http://localhost';
  readonly linkStatement =
    process.env.WALLET_SIWE_STATEMENT ||
    'Link this wallet to your Escrow4337 account.';
  readonly challengeTtlMs = readPositiveInteger(
    process.env.WALLET_LINK_CHALLENGE_TTL_MS,
    5 * 60 * 1000,
  );
  readonly maxVerificationAttempts = readPositiveInteger(
    process.env.WALLET_LINK_CHALLENGE_MAX_ATTEMPTS,
    5,
  );
}
