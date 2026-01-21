import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User } from './user.model.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/users/set-role - Set role for current user (first time only)
router.post(
  '/set-role',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;
    
    if (role !== 'student' && role !== 'coach') {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = req.user!.dbUser!;
    
    // Only allow setting role if not already set
    if (user.role) {
      return res.status(403).json({ message: 'Role already set' });
    }

    await User.findByIdAndUpdate(user._id, { role });
    
    res.json({ message: 'Role set successfully', role });
  })
);

// GET /api/users/me - Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!.dbUser!;
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

export default router;