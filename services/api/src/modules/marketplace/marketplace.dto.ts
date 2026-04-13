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
const stringArraySchema = z.array(z.string().trim().min(1).max(160)).max(20);
const urlArraySchema = z.array(z.string().url().max(2048)).max(10);
const proofArtifactSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(160),
    url: z.string().url().max(2048),
    kind: z.enum([
      'portfolio',
      'escrow_delivery',
      'escrow_case',
      'external_case_study',
    ]),
    jobId: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();
const screeningQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    prompt: z.string().trim().min(1).max(500),
    required: z.boolean().default(true),
  })
  .strict();
const screeningAnswerSchema = z
  .object({
    questionId: z.string().trim().min(1).max(80),
    answer: z.string().trim().min(1).max(2000),
  })
  .strict();
const timestampSchema = z.coerce.number().int().positive();

export const upsertMarketplaceProfileSchema = z
  .object({
    slug: slugSchema,
    displayName: z.string().trim().min(1).max(80),
    headline: z.string().trim().min(1).max(140),
    bio: z.string().trim().min(1).max(5000),
    skills: stringArraySchema.min(1),
    specialties: stringArraySchema.default([]),
    rateMin: z.string().regex(amountPattern).optional().nullable(),
    rateMax: z.string().regex(amountPattern).optional().nullable(),
    timezone: z.string().trim().min(1).max(80),
    availability: z.enum(['open', 'limited', 'unavailable']),
    preferredEngagements: z
      .array(z.enum(['fixed_scope', 'milestone_retainer', 'advisory']))
      .max(5)
      .default([]),
    cryptoReadiness: z.enum([
      'wallet_only',
      'smart_account_ready',
      'escrow_power_user',
    ]),
    portfolioUrls: urlArraySchema.default([]),
  })
  .strict();

export const updateMarketplaceProofsSchema = z
  .object({
    proofArtifacts: z.array(proofArtifactSchema).max(12),
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
    mustHaveSkills: stringArraySchema.default([]),
    outcomes: stringArraySchema.default([]),
    acceptanceCriteria: stringArraySchema.default([]),
    screeningQuestions: z.array(screeningQuestionSchema).max(8).default([]),
    visibility: z.enum(['public', 'private']),
    budgetMin: z.string().regex(amountPattern).optional().nullable(),
    budgetMax: z.string().regex(amountPattern).optional().nullable(),
    timeline: z.string().trim().min(1).max(240),
    desiredStartAt: timestampSchema.nullable().optional(),
    timezoneOverlapHours: z.coerce
      .number()
      .int()
      .min(0)
      .max(24)
      .nullable()
      .optional(),
    engagementType: z.enum(['fixed_scope', 'milestone_retainer', 'advisory']),
    cryptoReadinessRequired: z.enum([
      'wallet_only',
      'smart_account_ready',
      'escrow_power_user',
    ]),
  })
  .strict();

export const updateMarketplaceOpportunitySchema =
  createMarketplaceOpportunitySchema.partial();

export const updateMarketplaceScreeningSchema = z
  .object({
    outcomes: stringArraySchema.default([]),
    acceptanceCriteria: stringArraySchema.default([]),
    mustHaveSkills: stringArraySchema.default([]),
    screeningQuestions: z.array(screeningQuestionSchema).max(8).default([]),
    desiredStartAt: timestampSchema.nullable().optional(),
    timezoneOverlapHours: z.coerce
      .number()
      .int()
      .min(0)
      .max(24)
      .nullable()
      .optional(),
    engagementType: z
      .enum(['fixed_scope', 'milestone_retainer', 'advisory'])
      .optional(),
    cryptoReadinessRequired: z
      .enum(['wallet_only', 'smart_account_ready', 'escrow_power_user'])
      .optional(),
  })
  .strict();

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
    screeningAnswers: z.array(screeningAnswerSchema).max(8).default([]),
    deliveryApproach: z.string().trim().min(1).max(5000),
    milestonePlanSummary: z.string().trim().min(1).max(5000),
    estimatedStartAt: timestampSchema.nullable().optional(),
    relevantProofArtifacts: z.array(proofArtifactSchema).max(8).default([]),
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
export type UpdateMarketplaceProofsDto = z.infer<
  typeof updateMarketplaceProofsSchema
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
export type UpdateMarketplaceScreeningDto = z.infer<
  typeof updateMarketplaceScreeningSchema
>;
export type MarketplaceOpportunitiesQueryDto = z.infer<
  typeof marketplaceOpportunitiesQuerySchema
>;
export type ApplyToOpportunityDto = z.infer<typeof applyToOpportunitySchema>;
export type UpdateModerationDto = z.infer<typeof updateModerationSchema>;
