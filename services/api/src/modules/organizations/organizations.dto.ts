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
    kind: z.enum(['client', 'agency']).default('client'),
    slug: slugSchema.optional(),
    setActive: z.boolean().optional().default(true),
  })
  .strict();

export const createOrganizationInvitationSchema = z
  .object({
    email: z.string().trim().email(),
    role: z.enum([
      'client_owner',
      'client_recruiter',
      'agency_owner',
      'agency_member',
    ]),
  })
  .strict();

export const selectWorkspaceSchema = z
  .object({
    workspaceId: z.string().trim().min(1).max(120),
  })
  .strict();

export const acceptOrganizationInvitationSchema = z
  .object({
    setActive: z.boolean().optional().default(true),
  })
  .strict();

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type CreateOrganizationInvitationDto = z.infer<
  typeof createOrganizationInvitationSchema
>;
export type SelectWorkspaceDto = z.infer<typeof selectWorkspaceSchema>;
export type AcceptOrganizationInvitationDto = z.infer<
  typeof acceptOrganizationInvitationSchema
>;
