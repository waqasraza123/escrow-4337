import { Injectable } from '@nestjs/common';
import { readRequiredUrl } from '../../../common/config/readers';
import { normalizeEvmAddress } from '../../../common/evm-address';

@Injectable()
export class EscrowContractConfigService {
  get mode() {
    const configured = process.env.ESCROW_CONTRACT_MODE?.trim().toLowerCase();
    if (configured === 'mock') {
      return 'mock' as const;
    }
    if (configured === 'relay') {
      return 'relay' as const;
    }
    return process.env.NODE_ENV === 'test'
      ? ('mock' as const)
      : ('relay' as const);
  }

  get chainId() {
    const raw = process.env.ESCROW_CHAIN_ID?.trim() || '84532';
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('ESCROW_CHAIN_ID must be a positive integer');
    }
    return value;
  }

  get contractAddress() {
    const value = process.env.ESCROW_CONTRACT_ADDRESS?.trim();
    if (!value && process.env.NODE_ENV === 'test') {
      return '0x1111111111111111111111111111111111111111';
    }
    if (!value) {
      throw new Error('ESCROW_CONTRACT_ADDRESS must be set');
    }
    return normalizeEvmAddress(value);
  }

  get arbitratorAddress() {
    const value = process.env.ESCROW_ARBITRATOR_ADDRESS?.trim();
    if (!value && process.env.NODE_ENV === 'test') {
      return '0x2222222222222222222222222222222222222222';
    }
    if (!value) {
      throw new Error('ESCROW_ARBITRATOR_ADDRESS must be set');
    }
    return normalizeEvmAddress(value);
  }

  get relayBaseUrl() {
    return readRequiredUrl(
      process.env.ESCROW_RELAY_BASE_URL,
      'ESCROW_RELAY_BASE_URL',
      process.env.NODE_ENV === 'test' ? 'https://escrow-relay.local' : null,
    );
  }

  get relayApiKey() {
    return process.env.ESCROW_RELAY_API_KEY?.trim() || null;
  }
}
