import { z } from 'zod';

export const escrowHealthQuerySchema = z
  .object({
    reason: z
      .enum(['open_dispute', 'failed_execution', 'stale_job'])
      .optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  })
  .strict();

export type EscrowHealthQueryDto = z.infer<typeof escrowHealthQuerySchema>;
