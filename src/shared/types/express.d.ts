import type { IUser } from '../../modules/users/user.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;          // Zitadel user ID
        email: string;
        name?: string;
        role: 'student' | 'coach';
        dbUser?: IUser;       // Local user from MongoDB
      };
    }
  }
}

export {};