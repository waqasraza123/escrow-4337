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
const abuseEvidenceUrlsSchema = z.array(z.string().url().max(2048)).max(5);
const offerMilestoneDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    deliverable: z.string().trim().min(1).max(1000),
    amount: z.string().regex(amountPattern),
    dueAt: timestampSchema.nullable().optional(),
  })
  .strict();

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
    skills: z.string().trim().min(1).max(500).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    availability: z.enum(['open', 'limited', 'unavailable']).optional(),
    cryptoReadiness: z
      .enum(['wallet_only', 'smart_account_ready', 'escrow_power_user'])
      .optional(),
    engagementType: z
      .enum(['fixed_scope', 'milestone_retainer', 'advisory'])
      .optional(),
    verificationLevel: z
      .enum([
        'wallet_verified',
        'wallet_and_escrow_history',
        'wallet_escrow_and_delivery',
      ])
      .optional(),
    sort: z.enum(['relevance', 'recent']).default('relevance'),
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
    skills: z.string().trim().min(1).max(500).optional(),
    category: z.string().trim().min(1).max(64).optional(),
    engagementType: z
      .enum(['fixed_scope', 'milestone_retainer', 'advisory'])
      .optional(),
    cryptoReadinessRequired: z
      .enum(['wallet_only', 'smart_account_ready', 'escrow_power_user'])
      .optional(),
    minBudget: z.string().regex(amountPattern).optional(),
    maxBudget: z.string().regex(amountPattern).optional(),
    timezoneOverlapHours: z.coerce.number().int().min(0).max(24).optional(),
    sort: z.enum(['relevance', 'recent']).default('relevance'),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  })
  .strict();

export const createMarketplaceSavedSearchSchema = z
  .object({
    kind: z.enum(['talent', 'opportunity']),
    label: z.string().trim().min(1).max(120),
    query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    alertFrequency: z.enum(['manual', 'daily', 'weekly']).default('manual'),
  })
  .strict();

export const marketplaceSavedSearchesQuerySchema = z
  .object({
    kind: z.enum(['talent', 'opportunity']).optional(),
  })
  .strict();

export const createMarketplaceOpportunityInviteSchema = z
  .object({
    profileSlug: slugSchema,
    message: z.string().trim().min(1).max(1000).nullable().optional(),
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

export const reviseMarketplaceApplicationSchema = applyToOpportunitySchema
  .extend({
    revisionReason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();

export const applicationDecisionNoteSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).nullable().optional(),
    noHireReason: z
      .enum([
        'budget_changed',
        'scope_changed',
        'fit_not_strong_enough',
        'candidate_withdrew',
        'timeline_mismatch',
        'other',
      ])
      .nullable()
      .optional(),
  })
  .strict();

export const createMarketplaceInterviewMessageSchema = z
  .object({
    kind: z.enum(['clarification', 'interview']),
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

export const createMarketplaceOfferSchema = z
  .object({
    message: z.string().trim().min(1).max(4000).nullable().optional(),
    proposedRate: z.string().regex(amountPattern).nullable().optional(),
    milestones: z.array(offerMilestoneDraftSchema).min(1).max(12),
  })
  .strict();

export const respondToMarketplaceOfferSchema = z
  .object({
    action: z.enum(['accept', 'counter', 'decline']),
    message: z.string().trim().min(1).max(4000).nullable().optional(),
    proposedRate: z.string().regex(amountPattern).nullable().optional(),
    milestones: z.array(offerMilestoneDraftSchema).max(12).optional(),
    declineReason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();

export const updateModerationSchema = z
  .object({
    moderationStatus: z.enum(['visible', 'hidden', 'suspended']),
  })
  .strict();

export const createMarketplaceAbuseReportSchema = z
  .object({
    reason: z.enum([
      'spam',
      'scam',
      'impersonation',
      'harassment',
      'off_platform_payment',
      'policy_violation',
      'other',
    ]),
    details: z.string().trim().min(1).max(2000).nullable().optional(),
    evidenceUrls: abuseEvidenceUrlsSchema.default([]),
  })
  .strict();

export const marketplaceModerationReportsQuerySchema = z
  .object({
    status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional(),
    subjectType: z.enum(['profile', 'opportunity']).optional(),
    claimState: z.enum(['claimed', 'unclaimed']).optional(),
    sortBy: z
      .enum(['priority', 'oldest_open', 'stale_activity', 'recent_activity'])
      .optional(),
    escalated: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    evidenceReviewStatus: z
      .enum([
        'pending',
        'supports_report',
        'insufficient_evidence',
        'contradicts_report',
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const updateMarketplaceAbuseReportSchema = z
  .object({
    status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
    claimAction: z.enum(['claim', 'release']).optional(),
    escalationReason: z.string().trim().min(1).max(2000).nullable().optional(),
    evidenceReviewStatus: z
      .enum([
        'pending',
        'supports_report',
        'insufficient_evidence',
        'contradicts_report',
      ])
      .optional(),
    investigationSummary: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .nullable()
      .optional(),
    resolutionNote: z.string().trim().min(1).max(2000).nullable().optional(),
    subjectModerationStatus: z
      .enum(['visible', 'hidden', 'suspended'])
      .nullable()
      .optional(),
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
export type CreateMarketplaceSavedSearchDto = z.infer<
  typeof createMarketplaceSavedSearchSchema
>;
export type MarketplaceSavedSearchesQueryDto = z.infer<
  typeof marketplaceSavedSearchesQuerySchema
>;
export type CreateMarketplaceOpportunityInviteDto = z.infer<
  typeof createMarketplaceOpportunityInviteSchema
>;
export type ApplyToOpportunityDto = z.infer<typeof applyToOpportunitySchema>;
export type ReviseMarketplaceApplicationDto = z.infer<
  typeof reviseMarketplaceApplicationSchema
>;
export type ApplicationDecisionNoteDto = z.infer<
  typeof applicationDecisionNoteSchema
>;
export type CreateMarketplaceInterviewMessageDto = z.infer<
  typeof createMarketplaceInterviewMessageSchema
>;
export type CreateMarketplaceOfferDto = z.infer<
  typeof createMarketplaceOfferSchema
>;
export type RespondToMarketplaceOfferDto = z.infer<
  typeof respondToMarketplaceOfferSchema
>;
export type UpdateModerationDto = z.infer<typeof updateModerationSchema>;
export type CreateMarketplaceAbuseReportDto = z.infer<
  typeof createMarketplaceAbuseReportSchema
>;
export type MarketplaceModerationReportsQueryDto = z.infer<
  typeof marketplaceModerationReportsQuerySchema
>;
export type UpdateMarketplaceAbuseReportDto = z.infer<
  typeof updateMarketplaceAbuseReportSchema
>;
