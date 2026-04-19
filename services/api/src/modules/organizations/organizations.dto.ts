import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .transform((value) => value.toLowerCase());

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: slugSchema.optional(),
    setActive: z.boolean().optional().default(true),
  })
  .strict();

export const selectWorkspaceSchema = z
  .object({
    workspaceId: z.string().trim().min(1).max(120),
  })
  .strict();

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type SelectWorkspaceDto = z.infer<typeof selectWorkspaceSchema>;
