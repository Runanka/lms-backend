import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Course } from './course.model.js';
import { validate } from '../../middleware/validate.js';
import { coachOnly } from '../../middleware/roles.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
  type CreateCourseInput,
  type ListCoursesQuery,
} from './course.schema.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Helper to wrap async route handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/courses
router.get(
  '/',
  validate(listCoursesQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit, offset, coachId } = req.query as unknown as ListCoursesQuery;

    const filter: Record<string, unknown> = {};
    if (coachId) {
      filter.coachId = new Types.ObjectId(coachId);
    }

    const [courses, total] = await Promise.all([
      Course.find(filter).skip(offset).limit(limit).sort({ createdAt: -1 }),
      Course.countDocuments(filter),
    ]);

    res.json({ courses, total, limit, offset });
  })
);

// GET /api/courses/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new NotFoundError('Course');
    res.json({ course });
  })
);

// POST /api/courses
router.post(
  '/',
  authenticate,
  coachOnly,
  validate(createCourseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateCourseInput;

    const course = new Course({
      ...data,
      coachId: req.user!.dbUser!._id,
      modules: data.modules?.map((m, i) => ({
        ...m,
        order: m.order ?? i,
      })),
    });

    await course.save();

    res.status(201).json({
      message: 'Course created',
      courseId: course._id,
    });
  })
);

// PUT /api/courses/:id
router.put(
  '/:id',
  authenticate,
  coachOnly,
  validate(updateCourseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new NotFoundError('Course');

    // Verify ownership
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only edit your own courses');
    }

    Object.assign(course, req.body);
    await course.save();

    res.json({ message: 'Course updated', course });
  })
);

// DELETE /api/courses/:id
router.delete(
  '/:id',
  authenticate,
  coachOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new NotFoundError('Course');

    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only delete your own courses');
    }

    await course.deleteOne();
    res.json({ message: 'Course deleted' });
  })
);

export default router;