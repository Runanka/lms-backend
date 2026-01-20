import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  courseId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ courseId: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);