import { z } from 'zod';

export const startSchema = z.object({
  email: z.string().email().max(254),
});

export const verifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(24),
});

export const shariahSchema = z.object({
  shariah: z.boolean(),
});

export type StartDto = z.infer<typeof startSchema>;
export type VerifyDto = z.infer<typeof verifySchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type ShariahDto = z.infer<typeof shariahSchema>;
