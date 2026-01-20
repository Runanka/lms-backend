import { Schema, model, Document, Types } from 'mongoose';

export interface ISubmission {
  assignmentId: Types.ObjectId;
  submittedAt: Date;
  mcqAnswers?: number[];
  subjectiveAnswers?: string[];
  score?: number;
  feedback?: string;
  gradedAt?: Date;
}

export interface IProgress extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  enrolledAt: Date;
  completedAt?: Date;
  completedVideos: Types.ObjectId[];
  completedDocuments: Types.ObjectId[];
  submissions: ISubmission[];
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    mcqAnswers: [Number],
    subjectiveAnswers: [String],
    score: Number,
    feedback: String,
    gradedAt: Date,
  },
  { _id: true }
);

const progressSchema = new Schema<IProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    completedVideos: [{ type: Schema.Types.ObjectId }],
    completedDocuments: [{ type: Schema.Types.ObjectId }],
    submissions: [submissionSchema],
  },
  {
    timestamps: true,
  }
);

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
progressSchema.index({ courseId: 1 });

export const Progress = model<IProgress>('Progress', progressSchema);