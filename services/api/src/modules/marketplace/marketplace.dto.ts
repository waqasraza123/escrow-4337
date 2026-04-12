import { z } from 'zod';
import {
  evmAddressPattern,
  normalizeEvmAddress,
} from '../../common/evm-address';

const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;
const addressSchema = z
  .string()
  .trim()
  .regex(evmAddressPattern)
  .transform(normalizeEvmAddress);
const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .transform((value) => value.toLowerCase());
const stringArraySchema = z.array(z.string().trim().min(1).max(120)).max(20);
const urlArraySchema = z.array(z.string().url().max(2048)).max(10);

export const upsertMarketplaceProfileSchema = z
  .object({
    slug: slugSchema,
    displayName: z.string().trim().min(1).max(80),
    headline: z.string().trim().min(1).max(140),
    bio: z.string().trim().min(1).max(5000),
    skills: stringArraySchema.min(1),
    rateMin: z.string().regex(amountPattern).optional().nullable(),
    rateMax: z.string().regex(amountPattern).optional().nullable(),
    timezone: z.string().trim().min(1).max(80),
    availability: z.enum(['open', 'limited', 'unavailable']),
    portfolioUrls: urlArraySchema.min(1),
  })
  .strict();

export const marketplaceProfilesQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    skill: z.string().trim().min(1).max(120).optional(),
    availability: z.enum(['open', 'limited', 'unavailable']).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  })
  .strict();

export const createMarketplaceOpportunitySchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(280),
    description: z.string().trim().min(1).max(5000),
    category: z.string().trim().min(1).max(64),
    currencyAddress: addressSchema,
    requiredSkills: stringArraySchema.min(1),
    visibility: z.enum(['public', 'private']),
    budgetMin: z.string().regex(amountPattern).optional().nullable(),
    budgetMax: z.string().regex(amountPattern).optional().nullable(),
    timeline: z.string().trim().min(1).max(240),
  })
  .strict();

export const updateMarketplaceOpportunitySchema =
  createMarketplaceOpportunitySchema.partial();

export const marketplaceOpportunitiesQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    skill: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  })
  .strict();

export const applyToOpportunitySchema = z
  .object({
    coverNote: z.string().trim().min(1).max(5000),
    proposedRate: z.string().regex(amountPattern).optional().nullable(),
    selectedWalletAddress: addressSchema,
    portfolioUrls: urlArraySchema.default([]),
  })
  .strict();

export const updateModerationSchema = z
  .object({
    moderationStatus: z.enum(['visible', 'hidden', 'suspended']),
  })
  .strict();

export type UpsertMarketplaceProfileDto = z.infer<
  typeof upsertMarketplaceProfileSchema
>;
export type MarketplaceProfilesQueryDto = z.infer<
  typeof marketplaceProfilesQuerySchema
>;
export type CreateMarketplaceOpportunityDto = z.infer<
  typeof createMarketplaceOpportunitySchema
>;
export type UpdateMarketplaceOpportunityDto = z.infer<
  typeof updateMarketplaceOpportunitySchema
>;
export type MarketplaceOpportunitiesQueryDto = z.infer<
  typeof marketplaceOpportunitiesQuerySchema
>;
export type ApplyToOpportunityDto = z.infer<typeof applyToOpportunitySchema>;
export type UpdateModerationDto = z.infer<typeof updateModerationSchema>;
