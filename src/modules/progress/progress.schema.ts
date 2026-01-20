import { z } from 'zod';

export const enrollCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
});

export const markResourceCompleteSchema = z.object({
  courseId: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.enum(['video', 'document']),
});

export const submitMCQSchema = z.object({
  courseId: z.string().min(1),
  assignmentId: z.string().min(1),
  answers: z.array(z.number()).min(1, 'Answers required'),
});

export const submitSubjectiveSchema = z.object({
  courseId: z.string().min(1),
  assignmentId: z.string().min(1),
  answers: z.array(z.string()).min(1, 'Answers required'),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
});

export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>;
export type MarkResourceCompleteInput = z.infer<typeof markResourceCompleteSchema>;
export type SubmitMCQInput = z.infer<typeof submitMCQSchema>;
export type SubmitSubjectiveInput = z.infer<typeof submitSubjectiveSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;