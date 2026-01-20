import { z } from 'zod';

// Resource schema
const resourceSchema = z.object({
  type: z.enum(['video', 'document']),
  title: z.string().min(1, 'Title is required'),
  youtubeUrl: z.string().url().optional(),
  content: z.string().max(50000).optional(),
}).refine((data) => {
  if (data.type === 'video' && !data.youtubeUrl) {
    return false;
  }
  if (data.type === 'document' && !data.content) {
    return false;
  }
  return true;
}, {
  message: 'Video requires youtubeUrl, document requires content',
});

// Module schema
const moduleSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
  order: z.number().int().min(0),
  resources: z.array(resourceSchema).optional().default([]),
  assignmentId: z.string().optional(),
});

// Create course request
export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional().default(''),
  thumbnailUrl: z.string().url().optional(),
  modules: z.array(moduleSchema).optional().default([]),
});

// Update course request
export const updateCourseSchema = createCourseSchema.partial();

// Query params for listing
export const listCoursesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  coachId: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;