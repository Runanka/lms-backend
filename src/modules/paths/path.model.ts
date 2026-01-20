import { Schema, model, Document, Types } from 'mongoose';

export interface IPath extends Document {
  title: string;
  description: string;
  thumbnailUrl?: string;
  createdBy: Types.ObjectId;
  courses: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const pathSchema = new Schema<IPath>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    thumbnailUrl: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courses: [{
      type: Schema.Types.ObjectId,
      ref: 'Course',
    }],
  },
  {
    timestamps: true,
  }
);

pathSchema.index({ createdBy: 1 });

export const Path = model<IPath>('Path', pathSchema);