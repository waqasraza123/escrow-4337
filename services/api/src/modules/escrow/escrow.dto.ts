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
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
const sha256Schema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{64}$/);

export const createJobSchema = z
  .object({
    contractorEmail: emailSchema,
    workerAddress: addressSchema,
    currencyAddress: addressSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    category: z.string().trim().min(1).max(64),
    termsJSON: z.record(z.string(), z.unknown()),
  })
  .strict();

export const fundJobSchema = z
  .object({
    amount: z.string().regex(amountPattern),
  })
  .strict();

export const milestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    deliverable: z.string().trim().min(1).max(5000),
    amount: z.string().regex(amountPattern),
    dueAt: z.number().int().positive().optional(),
  })
  .strict();

export const setMilestonesSchema = z
  .object({
    milestones: z.array(milestoneSchema).min(1).max(20),
  })
  .strict();

export const deliverMilestoneSchema = z
  .object({
    note: z.string().trim().min(1).max(5000),
    evidenceUrls: z.array(z.string().url().max(2048)).max(10).default([]),
  })
  .strict();

export const releaseMilestoneSchema = z.object({}).strict();

export const disputeMilestoneSchema = z
  .object({
    reason: z.string().trim().min(1).max(5000),
    evidenceUrls: z.array(z.string().url().max(2048)).max(10).default([]),
  })
  .strict();

export const resolveMilestoneSchema = z
  .object({
    action: z.enum(['release', 'refund']),
    note: z.string().trim().min(1).max(5000),
  })
  .strict();

export const contractorInviteSchema = z
  .object({
    delivery: z.enum(['email', 'manual']),
    frontendOrigin: z.string().trim().url().max(2048),
    regenerate: z.boolean().optional(),
  })
  .strict();

export const updateContractorEmailSchema = z
  .object({
    contractorEmail: emailSchema,
  })
  .strict();

export const contractorJoinReadinessQuerySchema = z
  .object({
    inviteToken: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const joinContractorSchema = z
  .object({
    inviteToken: z.string().trim().min(1).max(256),
  })
  .strict();

export const projectArtifactSchema = z
  .object({
    label: z.string().trim().min(1).max(160),
    url: z.string().trim().url().max(2048),
    sha256: sha256Schema,
    mimeType: z.string().trim().min(1).max(120).nullable().optional(),
    byteSize: z.coerce.number().int().min(0).nullable().optional(),
  })
  .strict();

export const submitProjectMilestoneSchema = z
  .object({
    note: z.string().trim().min(1).max(5000),
    artifacts: z.array(projectArtifactSchema).max(10).default([]),
  })
  .strict();

export const requestProjectRevisionSchema = z
  .object({
    note: z.string().trim().min(1).max(4000),
  })
  .strict();

export const approveProjectSubmissionSchema = z
  .object({
    note: z.string().trim().min(1).max(4000).nullable().optional(),
  })
  .strict();

export const postProjectRoomMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

export const deliverProjectSubmissionSchema = z.object({}).strict();

export const createSupportCaseSchema = z
  .object({
    reason: z.enum([
      'general_help',
      'fee_question',
      'fee_exception',
      'stuck_funding',
      'dispute_followup',
      'release_delay',
    ]),
    severity: z.enum(['routine', 'elevated', 'critical']).optional(),
    milestoneIndex: z.number().int().min(0).nullable().optional(),
    subject: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(4000),
  })
  .strict();

export const postSupportCaseMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
    visibility: z.enum(['external', 'internal']).optional(),
  })
  .strict();

export const updateSupportCaseSchema = z
  .object({
    status: z
      .enum([
        'open',
        'investigating',
        'waiting_on_client',
        'waiting_on_worker',
        'resolved',
      ])
      .optional(),
    severity: z.enum(['routine', 'elevated', 'critical']).optional(),
    assignToSelf: z.boolean().optional(),
    feeDecision: z
      .enum([
        'default',
        'waive_open_and_future',
        'refund_realized_and_waive',
        'manual_review',
      ])
      .optional(),
    feeDecisionNote: z.string().trim().min(1).max(4000).nullable().optional(),
    internalNote: z.string().trim().min(1).max(4000).nullable().optional(),
  })
  .strict();

export const exportArtifactQuerySchema = z
  .object({
    artifact: z.enum(['job-history', 'dispute-case']).default('job-history'),
    format: z.enum(['json', 'csv']).default('json'),
  })
  .strict();

export type CreateJobDto = z.infer<typeof createJobSchema>;
export type FundJobDto = z.infer<typeof fundJobSchema>;
export type MilestoneDto = z.infer<typeof milestoneSchema>;
export type SetMilestonesDto = z.infer<typeof setMilestonesSchema>;
export type DeliverMilestoneDto = z.infer<typeof deliverMilestoneSchema>;
export type ReleaseMilestoneDto = z.infer<typeof releaseMilestoneSchema>;
export type DisputeMilestoneDto = z.infer<typeof disputeMilestoneSchema>;
export type ResolveMilestoneDto = z.infer<typeof resolveMilestoneSchema>;
export type ContractorInviteDto = z.infer<typeof contractorInviteSchema>;
export type UpdateContractorEmailDto = z.infer<
  typeof updateContractorEmailSchema
>;
export type ContractorJoinReadinessQueryDto = z.infer<
  typeof contractorJoinReadinessQuerySchema
>;
export type JoinContractorDto = z.infer<typeof joinContractorSchema>;
export type ExportArtifactQueryDto = z.infer<typeof exportArtifactQuerySchema>;
export type ProjectArtifactDto = z.infer<typeof projectArtifactSchema>;
export type SubmitProjectMilestoneDto = z.infer<
  typeof submitProjectMilestoneSchema
>;
export type RequestProjectRevisionDto = z.infer<
  typeof requestProjectRevisionSchema
>;
export type ApproveProjectSubmissionDto = z.infer<
  typeof approveProjectSubmissionSchema
>;
export type PostProjectRoomMessageDto = z.infer<
  typeof postProjectRoomMessageSchema
>;
export type DeliverProjectSubmissionDto = z.infer<
  typeof deliverProjectSubmissionSchema
>;
export type CreateSupportCaseDto = z.infer<typeof createSupportCaseSchema>;
export type PostSupportCaseMessageDto = z.infer<
  typeof postSupportCaseMessageSchema
>;
export type UpdateSupportCaseDto = z.infer<typeof updateSupportCaseSchema>;
