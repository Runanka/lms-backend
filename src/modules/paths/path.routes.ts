import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Path } from './path.model.js';
import { PathEnrollment } from './pathEnrollment.model.js';
import { Course } from '../courses/course.model.js';
import { Progress } from '../progress/progress.model.js';
import { authenticate } from '../../middleware/auth.js';
import { coachOnly, studentOnly } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import {
  createPathSchema,
  updatePathSchema,
  startPathSchema,
} from './path.schema.js';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/paths - List all paths
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const [paths, total] = await Promise.all([
      Path.find()
        .populate('createdBy', 'name email')
        .populate('courses', 'title description thumbnailUrl')
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Path.countDocuments(),
    ]);

    res.json({ paths, total, limit, offset });
  })
);

// GET /api/paths/:id - Get path details with courses in order
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const path = await Path.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate({
        path: 'courses',
        select: 'title description thumbnailUrl modules coachId',
        populate: { path: 'coachId', select: 'name' },
      });

    if (!path) throw new NotFoundError('Path');

    res.json({ path });
  })
);

// POST /api/paths - Create a path
router.post(
  '/',
  authenticate,
  coachOnly,
  validate(createPathSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, thumbnailUrl, courseIds } = req.body;
    const userId = req.user!.dbUser!._id;

    // Verify all courses belong to this coach
    const courses = await Course.find({
      _id: { $in: courseIds.map((id: string) => new Types.ObjectId(id)) },
    });

    if (courses.length !== courseIds.length) {
      return res.status(400).json({ message: 'Some courses not found' });
    }

    const notOwned = courses.filter(
      (c) => c.coachId.toString() !== userId.toString()
    );

    if (notOwned.length > 0) {
      return res.status(403).json({
        message: 'You can only add your own courses to a path',
        invalidCourses: notOwned.map((c) => c._id),
      });
    }

    const path = await Path.create({
      title,
      description,
      thumbnailUrl,
      createdBy: userId,
      courses: courseIds.map((id: string) => new Types.ObjectId(id)),
    });

    res.status(201).json({ message: 'Path created', pathId: path._id });
  })
);

// PUT /api/paths/:id - Update path
router.put(
  '/:id',
  authenticate,
  coachOnly,
  validate(updatePathSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, thumbnailUrl, courseIds } = req.body;
    const userId = req.user!.dbUser!._id;

    const path = await Path.findById(req.params.id);
    if (!path) throw new NotFoundError('Path');

    if (path.createdBy.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only edit your own paths');
    }

    // If updating courses, verify ownership
    if (courseIds) {
      const courses = await Course.find({
        _id: { $in: courseIds.map((id: string) => new Types.ObjectId(id)) },
      });

      const notOwned = courses.filter(
        (c) => c.coachId.toString() !== userId.toString()
      );

      if (notOwned.length > 0) {
        return res.status(403).json({
          message: 'You can only add your own courses',
        });
      }

      path.courses = courseIds.map((id: string) => new Types.ObjectId(id));
    }

    if (title) path.title = title;
    if (description !== undefined) path.description = description;
    if (thumbnailUrl !== undefined) path.thumbnailUrl = thumbnailUrl;

    await path.save();

    res.json({ message: 'Path updated', path });
  })
);

// DELETE /api/paths/:id - Delete path (Coach owner only)
router.delete(
  '/:id',
  authenticate,
  coachOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.dbUser!._id;

    const path = await Path.findById(req.params.id);
    if (!path) throw new NotFoundError('Path');

    if (path.createdBy.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only delete your own paths');
    }

    // Delete path and all enrollments
    await Promise.all([
      path.deleteOne(),
      PathEnrollment.deleteMany({ pathId: path._id }),
    ]);

    res.json({ message: 'Path deleted' });
  })
);

// POST /api/paths/start - Start a path (Student)
router.post(
  '/start',
  authenticate,
  studentOnly,
  validate(startPathSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { pathId } = req.body;
    const userId = req.user!.dbUser!._id;

    const path = await Path.findById(pathId);
    if (!path) throw new NotFoundError('Path');

    // Check if already started
    const existing = await PathEnrollment.findOne({ userId, pathId });
    if (existing) {
      return res.status(409).json({ message: 'Already started this path' });
    }

    const enrollment = await PathEnrollment.create({
      userId,
      pathId: new Types.ObjectId(pathId),
    });

    res.status(201).json({
      message: 'Path started',
      enrollmentId: enrollment._id,
    });
  })
);

// GET /api/paths/my-paths - Get started paths with progress (Student)
router.get(
  '/my-paths',
  authenticate,
  studentOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.dbUser!._id;

    const enrollments = await PathEnrollment.find({ userId })
      .populate({
        path: 'pathId',
        populate: { path: 'courses', select: 'title modules' },
      })
      .sort({ startedAt: -1 });

    // Calculate progress for each path
    const pathsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const path = enrollment.pathId as any;
        if (!path) return null;

        const courseIds = path.courses.map((c: any) => c._id);

        // Get progress for all courses in this path
        const progresses = await Progress.find({
          userId,
          courseId: { $in: courseIds },
        });

        // Calculate total resources and completed
        let totalResources = 0;
        let completedResources = 0;

        path.courses.forEach((course: any) => {
          const courseProgress = progresses.find(
            (p) => p.courseId.toString() === course._id.toString()
          );

          const resourceCount = course.modules?.reduce(
            (acc: number, m: any) => acc + (m.resources?.length || 0),
            0
          ) || 0;

          totalResources += resourceCount;

          if (courseProgress) {
            completedResources +=
              courseProgress.completedVideos.length +
              courseProgress.completedDocuments.length;
          }
        });

        const progressPercent = totalResources > 0
          ? Math.round((completedResources / totalResources) * 100)
          : 0;

        return {
          path: {
            _id: path._id,
            title: path.title,
            description: path.description,
            thumbnailUrl: path.thumbnailUrl,
            totalCourses: path.courses.length,
          },
          startedAt: enrollment.startedAt,
          completedAt: enrollment.completedAt,
          progress: progressPercent,
          coursesCompleted: progresses.filter((p) => p.completedAt).length,
        };
      })
    );

    res.json({ paths: pathsWithProgress.filter(Boolean) });
  })
);

// GET /api/paths/:id/progress - Get detailed path progress (Student)
router.get(
  '/:id/progress',
  authenticate,
  studentOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.dbUser!._id;
    const pathId = req.params.id;

    // Verify enrollment
    const enrollment = await PathEnrollment.findOne({
      userId,
      pathId: new Types.ObjectId(pathId as string),
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Not started this path' });
    }

    const path = await Path.findById(pathId).populate(
      'courses',
      'title description thumbnailUrl modules'
    );

    if (!path) throw new NotFoundError('Path');

    // Get progress for each course
    const courseIds = path.courses.map((c: any) => c._id);
    const progresses = await Progress.find({
      userId,
      courseId: { $in: courseIds },
    });

    const coursesWithProgress = path.courses.map((course: any, index: number) => {
      const courseProgress = progresses.find(
        (p) => p.courseId.toString() === course._id.toString()
      );

      const totalResources = course.modules?.reduce(
        (acc: number, m: any) => acc + (m.resources?.length || 0),
        0
      ) || 0;

      const completed = courseProgress
        ? courseProgress.completedVideos.length +
          courseProgress.completedDocuments.length
        : 0;

      return {
        order: index + 1,
        course: {
          _id: course._id,
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
        },
        enrolled: !!courseProgress,
        progress: totalResources > 0 ? Math.round((completed / totalResources) * 100) : 0,
        completedAt: courseProgress?.completedAt,
      };
    });

    res.json({
      path: {
        _id: path._id,
        title: path.title,
        description: path.description,
      },
      startedAt: enrollment.startedAt,
      courses: coursesWithProgress,
    });
  })
);

export default router;