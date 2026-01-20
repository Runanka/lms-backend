import { z } from 'zod';

export const createPathSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional().default(''),
  thumbnailUrl: z.string().url().optional(),
  courseIds: z.array(z.string()).min(1, 'At least one course required'),
});

export const updatePathSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  courseIds: z.array(z.string()).min(1).optional(),
});

export const startPathSchema = z.object({
  pathId: z.string().min(1),
});

export type CreatePathInput = z.infer<typeof createPathSchema>;
export type UpdatePathInput = z.infer<typeof updatePathSchema>;
export type StartPathInput = z.infer<typeof startPathSchema>;