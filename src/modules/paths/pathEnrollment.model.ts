import { Schema, model, Document, Types } from 'mongoose';

export interface IPathEnrollment extends Document {
  userId: Types.ObjectId;
  pathId: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pathEnrollmentSchema = new Schema<IPathEnrollment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pathId: {
      type: Schema.Types.ObjectId,
      ref: 'Path',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

pathEnrollmentSchema.index({ userId: 1, pathId: 1 }, { unique: true });

export const PathEnrollment = model<IPathEnrollment>('PathEnrollment', pathEnrollmentSchema);