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
const reviewScoresSchema = z
  .object({
    scopeClarity: z.coerce.number().int().min(1).max(5),
    communication: z.coerce.number().int().min(1).max(5),
    timeliness: z.coerce.number().int().min(1).max(5),
    outcomeQuality: z.coerce.number().int().min(1).max(5),
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

export const createMarketplaceTalentPoolSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    focusSkills: stringArraySchema.default([]),
    note: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .strict();

export const addMarketplaceTalentPoolMemberSchema = z
  .object({
    profileSlug: slugSchema,
    stage: z
      .enum([
        'saved',
        'contacted',
        'interviewing',
        'offered',
        'rehire_ready',
        'archived',
      ])
      .default('saved'),
    note: z.string().trim().min(1).max(1000).nullable().optional(),
    sourceOpportunityId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    sourceApplicationId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    sourceJobId: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();

export const updateMarketplaceTalentPoolMemberSchema = z
  .object({
    stage: z
      .enum([
        'saved',
        'contacted',
        'interviewing',
        'offered',
        'rehire_ready',
        'archived',
      ])
      .optional(),
    note: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .strict();

export const createMarketplaceAutomationRuleSchema = z
  .object({
    kind: z.enum([
      'saved_search_digest',
      'talent_pool_digest',
      'invite_followup',
      'rehire_digest',
    ]),
    label: z.string().trim().min(1).max(120),
    targetId: z.string().trim().min(1).max(120).nullable().optional(),
    schedule: z.enum(['manual', 'daily', 'weekly']).default('manual'),
    enabled: z.boolean().default(true),
  })
  .strict();

export const updateMarketplaceAutomationRuleSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    targetId: z.string().trim().min(1).max(120).nullable().optional(),
    schedule: z.enum(['manual', 'daily', 'weekly']).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const runMarketplaceAutomationRuleSchema = z
  .object({
    trigger: z.enum(['manual', 'scheduled']).default('manual'),
  })
  .strict();

export const dispatchMarketplaceAutomationRunsSchema = z
  .object({
    mode: z.enum(['due', 'all_enabled']).default('due'),
  })
  .strict();

export const updateMarketplaceNotificationSchema = z
  .object({
    status: z.enum(['read', 'dismissed']),
  })
  .strict();

export const createMarketplaceOpportunityInviteSchema = z
  .object({
    profileSlug: slugSchema,
    message: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .strict();

export const createMarketplaceRehireOpportunitySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().min(1).max(280).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    budgetMin: z.string().regex(amountPattern).nullable().optional(),
    budgetMax: z.string().regex(amountPattern).nullable().optional(),
    timeline: z.string().trim().min(1).max(240).optional(),
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

export const reviseMarketplaceContractDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    scopeSummary: z.string().trim().min(1).max(5000),
    acceptanceCriteria: stringArraySchema.default([]),
    outcomes: stringArraySchema.default([]),
    timeline: z.string().trim().min(1).max(240),
    milestones: z.array(offerMilestoneDraftSchema).min(1).max(12),
    reviewWindowDays: z.coerce.number().int().min(1).max(30),
    disputeModel: z.string().trim().min(1).max(120),
    evidenceExpectation: z.string().trim().min(1).max(1000),
    kickoffNote: z.string().trim().min(1).max(2000),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();

export const approveMarketplaceContractDraftSchema = z.object({}).strict();
export const convertMarketplaceContractDraftSchema = z.object({}).strict();

export const createMarketplaceReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    scores: reviewScoresSchema,
    headline: z.string().trim().min(1).max(140).nullable().optional(),
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

export const updateMarketplaceReviewModerationSchema = z
  .object({
    visibilityStatus: z.enum(['visible', 'hidden']),
    moderationNote: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

export const updateMarketplaceIdentityRiskReviewSchema = z
  .object({
    confidenceLabel: z.enum([
      'email_verified',
      'wallet_verified',
      'smart_account_ready',
      'operator_reviewed_proof',
    ]),
    riskLevel: z.enum(['low', 'medium', 'high']),
    flags: z
      .array(
        z.enum([
          'high_dispute_rate',
          'repeat_abuse_reports',
          'review_hidden_by_operator',
          'identity_mismatch',
          'off_platform_payment_report',
          'revision_heavy_delivery',
        ]),
      )
      .max(8)
      .default([]),
    operatorSummary: z.string().trim().min(1).max(2000).nullable().optional(),
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

export const recordMarketplaceInteractionSchema = z
  .object({
    surface: z.enum(['public_marketplace', 'workspace', 'admin', 'system']),
    entityType: z.enum([
      'search',
      'profile',
      'opportunity',
      'application',
      'saved_search',
      'job',
    ]),
    eventType: z.enum([
      'search_impression',
      'result_click',
      'detail_view',
      'saved_search_created',
      'invite_sent',
      'application_submitted',
      'application_revised',
      'application_withdrawn',
      'application_shortlisted',
      'application_rejected',
      'interview_started',
      'interview_message_posted',
      'offer_created',
      'offer_accepted',
      'offer_declined',
      'contract_converted',
      'hire_recorded',
      'no_hire_recorded',
      'job_funded',
      'milestone_released',
      'milestone_disputed',
      'review_submitted',
    ]),
    entityId: z.string().trim().min(1).max(120).nullable().optional(),
    searchKind: z.enum(['talent', 'opportunity']).nullable().optional(),
    queryLabel: z.string().trim().min(1).max(200).nullable().optional(),
    category: z.string().trim().min(1).max(120).nullable().optional(),
    timezone: z.string().trim().min(1).max(120).nullable().optional(),
    skillTags: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    resultCount: z.coerce.number().int().min(1).max(250).default(1),
    relatedOpportunityId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    relatedProfileUserId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    relatedApplicationId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    relatedJobId: z.string().trim().min(1).max(120).nullable().optional(),
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
export type CreateMarketplaceTalentPoolDto = z.infer<
  typeof createMarketplaceTalentPoolSchema
>;
export type AddMarketplaceTalentPoolMemberDto = z.infer<
  typeof addMarketplaceTalentPoolMemberSchema
>;
export type UpdateMarketplaceTalentPoolMemberDto = z.infer<
  typeof updateMarketplaceTalentPoolMemberSchema
>;
export type CreateMarketplaceAutomationRuleDto = z.infer<
  typeof createMarketplaceAutomationRuleSchema
>;
export type UpdateMarketplaceAutomationRuleDto = z.infer<
  typeof updateMarketplaceAutomationRuleSchema
>;
export type RunMarketplaceAutomationRuleDto = z.infer<
  typeof runMarketplaceAutomationRuleSchema
>;
export type DispatchMarketplaceAutomationRunsDto = z.infer<
  typeof dispatchMarketplaceAutomationRunsSchema
>;
export type UpdateMarketplaceNotificationDto = z.infer<
  typeof updateMarketplaceNotificationSchema
>;
export type CreateMarketplaceOpportunityInviteDto = z.infer<
  typeof createMarketplaceOpportunityInviteSchema
>;
export type CreateMarketplaceRehireOpportunityDto = z.infer<
  typeof createMarketplaceRehireOpportunitySchema
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
export type ReviseMarketplaceContractDraftDto = z.infer<
  typeof reviseMarketplaceContractDraftSchema
>;
export type ApproveMarketplaceContractDraftDto = z.infer<
  typeof approveMarketplaceContractDraftSchema
>;
export type ConvertMarketplaceContractDraftDto = z.infer<
  typeof convertMarketplaceContractDraftSchema
>;
export type CreateMarketplaceReviewDto = z.infer<
  typeof createMarketplaceReviewSchema
>;
export type UpdateMarketplaceReviewModerationDto = z.infer<
  typeof updateMarketplaceReviewModerationSchema
>;
export type UpdateMarketplaceIdentityRiskReviewDto = z.infer<
  typeof updateMarketplaceIdentityRiskReviewSchema
>;
export type UpdateModerationDto = z.infer<typeof updateModerationSchema>;
export type CreateMarketplaceAbuseReportDto = z.infer<
  typeof createMarketplaceAbuseReportSchema
>;
export type MarketplaceModerationReportsQueryDto = z.infer<
  typeof marketplaceModerationReportsQuerySchema
>;
export type RecordMarketplaceInteractionDto = z.infer<
  typeof recordMarketplaceInteractionSchema
>;
export type UpdateMarketplaceAbuseReportDto = z.infer<
  typeof updateMarketplaceAbuseReportSchema
>;
