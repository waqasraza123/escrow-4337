import { z } from 'zod';

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

export const releaseStaleJobSchema = z.object({}).strict();

export type EscrowHealthQueryDto = z.infer<typeof escrowHealthQuerySchema>;
export type ClaimStaleJobDto = z.infer<typeof claimStaleJobSchema>;
export type ReleaseStaleJobDto = z.infer<typeof releaseStaleJobSchema>;
