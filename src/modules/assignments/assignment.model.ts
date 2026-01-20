import { Schema, model, Document, Types } from 'mongoose';

// MCQ Option Interface
export interface IMCQOption {
  text: string;
  isCorrect: boolean;
}

// MCQ Question Interface
export interface IMCQQuestion {
  questionText: string;
  options: IMCQOption[];
}

// Subjective Question Interface
export interface ISubjectiveQuestion {
  questionText: string;
  maxWords?: number; 
}

export interface IAssignment extends Document {
  title: string;
  type: 'mcq' | 'subjective';
  courseId: Types.ObjectId;
  moduleId?: Types.ObjectId;
  mcqQuestions?: IMCQQuestion[];
  subjectiveQuestions?: ISubjectiveQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const mcqOptionSchema = new Schema<IMCQOption>(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const mcqQuestionSchema = new Schema<IMCQQuestion>(
  {
    questionText: { type: String, required: true },
    options: [mcqOptionSchema],
  },
  { _id: true }
);

const subjectiveQuestionSchema = new Schema<ISubjectiveQuestion>(
  {
    questionText: { type: String, required: true },
    maxWords: Number,
  },
  { _id: true }
);

const assignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'subjective'],
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
    },
    mcqQuestions: [mcqQuestionSchema],
    subjectiveQuestions: [subjectiveQuestionSchema],
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ courseId: 1 });

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);