import { Schema, model, Document, Types } from 'mongoose';

export interface IResource {
  type: 'video' | 'document';
  title: string;
  youtubeUrl?: string;
  content?: string;
}

export interface IModule {
  _id: Types.ObjectId;
  title: string;
  order: number;
  resources: IResource[];
  assignmentId?: Types.ObjectId;
}

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnailUrl?: string;
  coachId: Types.ObjectId;
  modules: IModule[];
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    type: {
      type: String,
      enum: ['video', 'document'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    youtubeUrl: String,
    content: {
      type: String,
      maxlength: 50000,
    },
  },
  { _id: true }
);

const moduleSchema = new Schema<IModule>({
  title: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  resources: [resourceSchema],
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
  },
});

const courseSchema = new Schema<ICourse>(
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
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modules: [moduleSchema],
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ coachId: 1 });

export const Course = model<ICourse>('Course', courseSchema);