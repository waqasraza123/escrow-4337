import { Injectable } from '@nestjs/common';
import {
  readPositiveInteger,
  readRequiredUrl,
} from '../../../common/config/readers';
import { normalizeEvmAddress } from '../../../common/evm-address';
import type {
  SmartAccountProvisioningMode,
  SmartAccountSponsorshipMode,
} from './smart-account.types';

function readRequiredAddress(
  value: string | undefined,
  envName: string,
  fallback: string | null,
) {
  const candidate = value?.trim() || fallback;
  if (!candidate) {
    throw new Error(`${envName} must be set`);
  }
  return normalizeEvmAddress(candidate);
}

@Injectable()
export class SmartAccountConfigService {
  get mode(): SmartAccountProvisioningMode {
    const configuredMode =
      process.env.WALLET_SMART_ACCOUNT_MODE?.trim().toLowerCase();
    if (configuredMode === 'mock') {
      return 'mock';
    }
    if (configuredMode === 'relay') {
      return 'relay';
    }
    return process.env.NODE_ENV === 'test' ? 'mock' : 'relay';
  }

  get chainId() {
    return readPositiveInteger(
      process.env.WALLET_SMART_ACCOUNT_CHAIN_ID ||
        process.env.ESCROW_CHAIN_ID ||
        undefined,
      84532,
    );
  }

  get entryPointAddress() {
    return readRequiredAddress(
      process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS,
      'WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS',
      process.env.NODE_ENV === 'test'
        ? '0x00000061FEfce24A79343c27127435286BB7A4E1'
        : null,
    );
  }

  get factoryAddress() {
    return readRequiredAddress(
      process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS,
      'WALLET_SMART_ACCOUNT_FACTORY_ADDRESS',
      process.env.NODE_ENV === 'test'
        ? '0x3333333333333333333333333333333333333333'
        : null,
    );
  }

  get bundlerUrl() {
    return readRequiredUrl(
      process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL,
      'WALLET_SMART_ACCOUNT_BUNDLER_URL',
      process.env.NODE_ENV === 'test' ? 'https://bundler.wallet.local' : null,
    );
  }

  get recoveryMode() {
    return 'owner_eoa' as const;
  }

  get sponsorshipMode(): SmartAccountSponsorshipMode {
    const configuredMode =
      process.env.WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE?.trim().toLowerCase();
    if (configuredMode === 'disabled') {
      return 'disabled';
    }
    if (configuredMode === 'verified_owner') {
      return 'verified_owner';
    }
    return 'verified_owner';
  }

  get paymasterUrl() {
    if (this.sponsorshipMode === 'disabled') {
      return null;
    }
    return readRequiredUrl(
      process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL,
      'WALLET_SMART_ACCOUNT_PAYMASTER_URL',
      process.env.NODE_ENV === 'test' ? 'https://paymaster.wallet.local' : null,
    );
  }

  get relayBaseUrl() {
    return readRequiredUrl(
      process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL,
      'WALLET_SMART_ACCOUNT_RELAY_BASE_URL',
      process.env.NODE_ENV === 'test' ? 'https://relay.wallet.local' : null,
    );
  }

  get relayApiKey() {
    return process.env.WALLET_SMART_ACCOUNT_RELAY_API_KEY?.trim() || null;
  }
}
