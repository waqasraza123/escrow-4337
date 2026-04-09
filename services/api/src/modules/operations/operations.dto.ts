import { z } from 'zod';

const failureWorkflowStatusSchema = z.enum([
  'investigating',
  'blocked_external',
  'ready_to_retry',
  'monitoring',
]);
const attentionReasonSchema = z.enum([
  'chain_sync_backlog',
  'open_dispute',
  'reconciliation_drift',
  'failed_execution',
  'stale_job',
]);

export const escrowHealthQuerySchema = z
  .object({
    reason: z
      .enum([
        'chain_sync_backlog',
        'open_dispute',
        'reconciliation_drift',
        'failed_execution',
        'stale_job',
      ])
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

export const importJobHistorySchema = z
  .object({
    documentJson: z.string().trim().min(1).max(1_000_000),
  })
  .strict();

export const syncEscrowChainAuditSchema = z
  .object({
    jobId: z.string().trim().uuid(),
    fromBlock: z.coerce.number().int().nonnegative().optional(),
    toBlock: z.coerce.number().int().nonnegative().optional(),
    persist: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.fromBlock === undefined ||
      value.toBlock === undefined ||
      value.toBlock >= value.fromBlock,
    {
      message: 'toBlock must be greater than or equal to fromBlock',
      path: ['toBlock'],
    },
  );

export const syncEscrowChainAuditBatchSchema = z
  .object({
    scope: z.enum(['all', 'attention']).optional(),
    reason: attentionReasonSchema.optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    persist: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => value.scope === 'attention' || value.reason === undefined,
    {
      message: 'reason can only be provided when scope is attention',
      path: ['reason'],
    },
  );

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
export type ImportJobHistoryDto = z.infer<typeof importJobHistorySchema>;
export type SyncEscrowChainAuditDto = z.infer<typeof syncEscrowChainAuditSchema>;
export type SyncEscrowChainAuditBatchDto = z.infer<
  typeof syncEscrowChainAuditBatchSchema
>;
export type ReleaseStaleJobDto = z.infer<typeof releaseStaleJobSchema>;
export type ReleaseExecutionFailureWorkflowDto = z.infer<
  typeof releaseExecutionFailureWorkflowSchema
>;
