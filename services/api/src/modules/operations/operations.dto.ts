import { z } from 'zod';

const failureWorkflowStatusSchema = z.enum([
  'investigating',
  'blocked_external',
  'ready_to_retry',
  'monitoring',
]);

export const escrowHealthQuerySchema = z
  .object({
    reason: z
      .enum(['open_dispute', 'failed_execution', 'stale_job'])
      .optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  })
  .strict();

export const claimStaleJobSchema = z
  .object({
    note: z.string().trim().min(1).max(5000).optional(),
  })
  .strict();

export const claimExecutionFailureWorkflowSchema = z
  .object({
    note: z.string().trim().min(1).max(5000).optional(),
    status: failureWorkflowStatusSchema.optional(),
  })
  .strict();

export const acknowledgeExecutionFailureWorkflowSchema = z
  .object({
    note: z.string().trim().min(1).max(5000).optional(),
    status: failureWorkflowStatusSchema.optional(),
  })
  .strict();

export const updateExecutionFailureWorkflowSchema = z
  .object({
    note: z.string().trim().min(1).max(5000).optional(),
    status: failureWorkflowStatusSchema.optional(),
  })
  .refine((value) => value.note !== undefined || value.status !== undefined, {
    message: 'Provide a note or status update',
  })
  .strict();

export const releaseStaleJobSchema = z.object({}).strict();
export const releaseExecutionFailureWorkflowSchema = z.object({}).strict();

export type EscrowHealthQueryDto = z.infer<typeof escrowHealthQuerySchema>;
export type ClaimStaleJobDto = z.infer<typeof claimStaleJobSchema>;
export type ClaimExecutionFailureWorkflowDto = z.infer<
  typeof claimExecutionFailureWorkflowSchema
>;
export type AcknowledgeExecutionFailureWorkflowDto = z.infer<
  typeof acknowledgeExecutionFailureWorkflowSchema
>;
export type UpdateExecutionFailureWorkflowDto = z.infer<
  typeof updateExecutionFailureWorkflowSchema
>;
export type ReleaseStaleJobDto = z.infer<typeof releaseStaleJobSchema>;
export type ReleaseExecutionFailureWorkflowDto = z.infer<
  typeof releaseExecutionFailureWorkflowSchema
>;
