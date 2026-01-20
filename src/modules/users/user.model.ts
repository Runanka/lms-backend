import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  zitadelId: string;
  email: string;
  name: string;
  role: 'student' | 'coach';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    zitadelId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['student', 'coach'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);