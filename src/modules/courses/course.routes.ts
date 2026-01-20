import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Course } from './course.model.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError } from '../../shared/errors/index.js';
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
  type CreateCourseInput,
  type ListCoursesQuery,
} from './course.schema.js';

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
  validate(createCourseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateCourseInput;

    // TODO: Get coachId from authenticated user
    // For now, require it in headers or use a placeholder
    const coachId = req.headers['x-coach-id'] as string;
    if (!coachId) {
      return res.status(400).json({ message: 'x-coach-id header required' });
    }

    const course = new Course({
      ...data,
      coachId: new Types.ObjectId(coachId),
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
  validate(updateCourseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) throw new NotFoundError('Course');
    res.json({ message: 'Course updated', course });
  })
);

// DELETE /api/courses/:id
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) throw new NotFoundError('Course');
    res.json({ message: 'Course deleted' });
  })
);

export default router;