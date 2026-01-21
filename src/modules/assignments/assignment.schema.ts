import { z } from 'zod';

const mcqOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
});

// MCQ question must have text and at least one correct answer
const mcqQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  options: z.array(mcqOptionSchema).min(2, 'At least 2 options required').max(6),
}).refine((data) => {
  // At least one option must be correct
  return data.options.some(opt => opt.isCorrect);
}, {
  message: 'Each question must have at least one correct answer',
});

const subjectiveQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  maxWords: z.number().int().positive().optional(),
});

// Base schema without refinement (for .partial() compatibility)
const baseAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['mcq', 'subjective']),
  courseId: z.string().min(1, 'Course ID is required'),
  moduleId: z.string().optional(),
  mcqQuestions: z.array(mcqQuestionSchema).optional(),
  subjectiveQuestions: z.array(subjectiveQuestionSchema).optional(),
});

// Create schema with refinement - must have questions
export const createAssignmentSchema = baseAssignmentSchema.refine((data) => {
  if (data.type === 'mcq') {
    return data.mcqQuestions && data.mcqQuestions.length > 0;
  }
  if (data.type === 'subjective') {
    return data.subjectiveQuestions && data.subjectiveQuestions.length > 0;
  }
  return true;
}, {
  message: 'MCQ assignments require at least one question, subjective assignments require at least one question',
});

// Update schema - partial of base without courseId (no refinement needed for updates)
export const updateAssignmentSchema = baseAssignmentSchema.omit({ courseId: true }).partial();

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
