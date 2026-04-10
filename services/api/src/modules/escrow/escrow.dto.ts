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
const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

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

export const joinContractorSchema = z.object({}).strict();

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
export type JoinContractorDto = z.infer<typeof joinContractorSchema>;
export type ExportArtifactQueryDto = z.infer<typeof exportArtifactQuerySchema>;
