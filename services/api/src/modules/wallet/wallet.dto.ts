import { z } from 'zod';
import {
  evmAddressPattern,
  normalizeEvmAddress,
} from '../../common/evm-address';

const walletAddressSchema = z
  .string()
  .trim()
  .regex(evmAddressPattern)
  .transform(normalizeEvmAddress);

export const linkWalletSchema = z
  .object({
    address: walletAddressSchema,
    walletKind: z.enum(['eoa', 'smart_account']),
    label: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const setDefaultWalletSchema = z
  .object({
    address: walletAddressSchema,
  })
  .strict();

export type LinkWalletDto = z.infer<typeof linkWalletSchema>;
export type SetDefaultWalletDto = z.infer<typeof setDefaultWalletSchema>;
