import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Comment } from './comment.model.js';
import { Course } from '../courses/course.model.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError } from '../../shared/errors/index.js';
import { createCommentSchema } from './comment.schema.js';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/courses/:courseId/comments
router.get(
  '/:courseId/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before as string;

    const filter: Record<string, unknown> = {
      courseId: new Types.ObjectId(courseId as string),
    };

    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const comments = await Comment.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ comments: comments.reverse() });
  })
);

// POST /api/courses/:courseId/comments
router.post(
  '/:courseId/comments',
  authenticate,
  validate(createCommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { content } = req.body;
    const userId = req.user!.dbUser!._id;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) throw new NotFoundError('Course');

    const comment = await Comment.create({
      courseId: new Types.ObjectId(courseId as string),
      userId,
      content,
    });

    await comment.populate('userId', 'name email role');

    res.status(201).json({ comment });
  })
);

export default router;