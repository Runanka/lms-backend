import { z } from 'zod';

// Resource schema - must have content
const resourceSchema = z.object({
  type: z.enum(['video', 'document']),
  title: z.string().min(1, 'Resource title is required'),
  youtubeUrl: z.string().url().optional(),
  content: z.string().min(1).max(50000).optional(),
}).refine((data) => {
  if (data.type === 'video') {
    return !!data.youtubeUrl && data.youtubeUrl.trim().length > 0;
  }
  if (data.type === 'document') {
    return !!data.content && data.content.trim().length > 0;
  }
  return true;
}, {
  message: 'Video requires a valid YouTube URL, document requires content',
});

// Module schema - must have either resources or an assignment
const moduleSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
  order: z.number().int().min(0),
  resources: z.array(resourceSchema).default([]),
  assignmentId: z.string().optional(),
}).refine((data) => {
  // Module must have at least one resource or an assignment
  const hasResources = data.resources && data.resources.length > 0;
  const hasAssignment = !!data.assignmentId;
  return hasResources || hasAssignment;
}, {
  message: 'Each module must have at least one resource or an assignment',
});

// Create course request - must have at least one module
export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional().default(''),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  modules: z.array(moduleSchema).min(1, 'Course must have at least one module'),
});

// Update course request - same validation
export const updateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  modules: z.array(moduleSchema).min(1, 'Course must have at least one module').optional(),
});

// Query params for listing
export const listCoursesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  coachId: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
