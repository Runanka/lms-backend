import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/index.js';

type Role = 'student' | 'coach';

// Require specific role
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires ${allowedRoles.join(' or ')} role`));
    }

    next();
  };
}

// Shorthand guards
export const coachOnly = requireRole('coach');
export const studentOnly = requireRole('student');
export const anyRole = requireRole('student', 'coach');