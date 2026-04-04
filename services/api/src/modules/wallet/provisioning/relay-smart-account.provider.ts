import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { normalizeEvmAddress } from '../../../common/evm-address';
import { SmartAccountConfigService } from './smart-account.config';
import { SmartAccountProviderError } from './smart-account.errors';
import type {
  SmartAccountProvider,
  SmartAccountProvisioningRequest,
} from './smart-account.types';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const provisionResponseSchema = z.object({
  address: addressSchema,
  provisionedAt: z.number().int().positive(),
});

const relayErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

type RelayProvisionBody = {
  chainId: number;
  ownerAddress: string;
  recoveryAddress: string;
  entryPointAddress: string;
  factoryAddress: string;
  bundlerUrl: string;
  paymasterUrl: string | null;
  sponsorshipPolicy: 'disabled' | 'sponsored';
};

@Injectable()
export class RelaySmartAccountProvider implements SmartAccountProvider {
  readonly providerKind = 'relay' as const;

  constructor(private readonly config: SmartAccountConfigService) {}

  async provision(request: SmartAccountProvisioningRequest) {
    const ownerAddress = normalizeEvmAddress(request.ownerAddress);
    const response = await this.fetchProvision(ownerAddress, request);
    return {
      address: normalizeEvmAddress(response.address),
      walletKind: 'smart_account' as const,
      ownerAddress,
      recoveryAddress: normalizeEvmAddress(request.recoveryAddress),
      chainId: this.config.chainId,
      providerKind: this.providerKind,
      entryPointAddress: this.config.entryPointAddress,
      factoryAddress: this.config.factoryAddress,
      sponsorshipPolicy: request.sponsorshipPolicy,
      provisionedAt: response.provisionedAt,
    };
  }

  private async fetchProvision(
    ownerAddress: string,
    request: SmartAccountProvisioningRequest,
  ) {
    const headers = new Headers({
      'content-type': 'application/json',
    });

    if (this.config.relayApiKey) {
      headers.set('x-api-key', this.config.relayApiKey);
    }

    let response: Response;
    try {
      response = await fetch(
        `${this.config.relayBaseUrl}/wallets/smart-accounts/provision`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(this.createRequestBody(request)),
        },
      );
    } catch {
      throw new SmartAccountProviderError(
        'Smart-account relay is unavailable',
        {
          code: 'relay_unavailable',
          chainId: this.config.chainId,
          ownerAddress,
          providerKind: this.providerKind,
        },
      );
    }

    const bodyText = await response.text();
    let parsedBody: unknown = null;
    if (bodyText.length > 0) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        throw new SmartAccountProviderError(
          'Smart-account relay returned invalid JSON',
          {
            code: 'relay_invalid_json',
            chainId: this.config.chainId,
            ownerAddress,
            providerKind: this.providerKind,
          },
        );
      }
    }

    if (!response.ok) {
      const relayError = relayErrorSchema.safeParse(parsedBody);
      if (relayError.success) {
        throw new SmartAccountProviderError(relayError.data.message, {
          code: relayError.data.code,
          chainId: this.config.chainId,
          ownerAddress,
          providerKind: this.providerKind,
        });
      }

      throw new SmartAccountProviderError(
        'Smart-account relay rejected the request',
        {
          code: 'relay_request_failed',
          chainId: this.config.chainId,
          ownerAddress,
          providerKind: this.providerKind,
        },
      );
    }

    return provisionResponseSchema.parse(parsedBody);
  }

  private createRequestBody(
    request: SmartAccountProvisioningRequest,
  ): RelayProvisionBody {
    return {
      chainId: this.config.chainId,
      ownerAddress: normalizeEvmAddress(request.ownerAddress),
      recoveryAddress: normalizeEvmAddress(request.recoveryAddress),
      entryPointAddress: this.config.entryPointAddress,
      factoryAddress: this.config.factoryAddress,
      bundlerUrl: this.config.bundlerUrl,
      paymasterUrl:
        request.sponsorshipPolicy === 'sponsored'
          ? this.config.paymasterUrl
          : null,
      sponsorshipPolicy: request.sponsorshipPolicy,
    };
  }
}
