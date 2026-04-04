import { z } from 'zod';
import { evmAddressPattern } from '../../common/evm-address';

const walletAddressSchema = z.string().trim().regex(evmAddressPattern);

const signatureSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]+$/)
  .refine((value) => value.length >= 130 && (value.length - 2) % 2 === 0, {
    message: 'Invalid signature format',
  });

export const createLinkWalletChallengeSchema = z
  .object({
    address: walletAddressSchema,
    walletKind: z.literal('eoa'),
    chainId: z.number().int().positive(),
    label: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const verifyLinkWalletSchema = z
  .object({
    challengeId: z.string().uuid(),
    message: z.string().trim().min(1).max(10_000),
    signature: signatureSchema,
  })
  .strict();

export const setDefaultWalletSchema = z
  .object({
    address: walletAddressSchema,
  })
  .strict();

export type CreateLinkWalletChallengeDto = z.infer<
  typeof createLinkWalletChallengeSchema
>;
export type VerifyLinkWalletDto = z.infer<typeof verifyLinkWalletSchema>;
export type SetDefaultWalletDto = z.infer<typeof setDefaultWalletSchema>;
