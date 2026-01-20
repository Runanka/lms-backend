import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Progress } from './progress.model.js';
import { Course } from '../courses/course.model.js';
import { Assignment } from '../assignments/assignment.model.js';
import { authenticate } from '../../middleware/auth.js';
import { studentOnly, coachOnly } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import {
  enrollCourseSchema,
  markResourceCompleteSchema,
  submitMCQSchema,
  submitSubjectiveSchema,
  gradeSubmissionSchema,
} from './progress.schema.js';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/progress/enroll - Enroll in a course (Student)
router.post(
  '/enroll',
  authenticate,
  studentOnly,
  validate(enrollCourseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.body;
    const userId = req.user!.dbUser!._id;

    // Check course exists
    const course = await Course.findById(courseId);
    if (!course) throw new NotFoundError('Course');

    // Check if already enrolled
    const existing = await Progress.findOne({ userId, courseId });
    if (existing) {
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }

    const progress = await Progress.create({
      userId,
      courseId: new Types.ObjectId(courseId),
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      progressId: progress._id,
    });
  })
);

// GET /api/progress/my-courses - Get enrolled courses with progress (Student)
router.get(
  '/my-courses',
  authenticate,
  studentOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.dbUser!._id;

    const enrollments = await Progress.find({ userId })
      .populate('courseId', 'title description thumbnailUrl modules')
      .sort({ enrolledAt: -1 });

    const coursesWithProgress = enrollments.map((p) => {
      const course = p.courseId as any;
      const totalResources = course.modules?.reduce(
        (acc: number, m: any) => acc + (m.resources?.length || 0),
        0
      ) || 0;
      const completedResources = p.completedVideos.length + p.completedDocuments.length;

      return {
        course: {
          _id: course._id,
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
          totalModules: course.modules?.length || 0,
        },
        enrolledAt: p.enrolledAt,
        completedAt: p.completedAt,
        progress: totalResources > 0 
          ? Math.round((completedResources / totalResources) * 100)
          : 0,
        completedVideos: p.completedVideos.length,
        completedDocuments: p.completedDocuments.length,
        submissionsCount: p.submissions.length,
      };
    });

    res.json({ courses: coursesWithProgress });
  })
);

// GET /api/progress/:courseId - Get detailed progress for a course (Student)
router.get(
  '/:courseId',
  authenticate,
  studentOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.dbUser!._id;
    const { courseId } = req.params;

    const progress = await Progress.findOne({
      userId,
      courseId: new Types.ObjectId(courseId as string),
    });

    if (!progress) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    res.json({ progress });
  })
);

// POST /api/progress/complete-resource - Mark video/document as complete (Student)
router.post(
  '/complete-resource',
  authenticate,
  studentOnly,
  validate(markResourceCompleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, resourceId, resourceType } = req.body;
    const userId = req.user!.dbUser!._id;

    const progress = await Progress.findOne({
      userId,
      courseId: new Types.ObjectId(courseId),
    });

    if (!progress) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    const resourceObjectId = new Types.ObjectId(resourceId);
    const field = resourceType === 'video' ? 'completedVideos' : 'completedDocuments';

    // Add if not already completed
    if (!progress[field].some((id) => id.equals(resourceObjectId))) {
      progress[field].push(resourceObjectId);
      await progress.save();
    }

    res.json({ message: `${resourceType} marked as complete` });
  })
);

// POST /api/progress/submit-mcq - Submit MCQ assignment (Student)
router.post(
  '/submit-mcq',
  authenticate,
  studentOnly,
  validate(submitMCQSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, assignmentId, answers } = req.body;
    const userId = req.user!.dbUser!._id;

    const progress = await Progress.findOne({
      userId,
      courseId: new Types.ObjectId(courseId),
    });

    if (!progress) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    // Get assignment to auto-grade
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || assignment.type !== 'mcq') {
      throw new NotFoundError('MCQ Assignment');
    }

    // Auto-grade MCQ
    let correctCount = 0;
    const questions = assignment.mcqQuestions || [];
    
    questions.forEach((q, idx) => {
      const selectedIdx = answers[idx];
      if (selectedIdx !== undefined && q.options[selectedIdx]?.isCorrect) {
        correctCount++;
      }
    });

    const score = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100)
      : 0;

    // Add submission
    progress.submissions.push({
      assignmentId: new Types.ObjectId(assignmentId),
      submittedAt: new Date(),
      mcqAnswers: answers,
      score,
    });

    await progress.save();

    res.json({
      message: 'MCQ submitted successfully',
      score,
      correctCount,
      totalQuestions: questions.length,
    });
  })
);

// POST /api/progress/submit-subjective - Submit subjective assignment (Student)
router.post(
  '/submit-subjective',
  authenticate,
  studentOnly,
  validate(submitSubjectiveSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, assignmentId, answers } = req.body;
    const userId = req.user!.dbUser!._id;

    const progress = await Progress.findOne({
      userId,
      courseId: new Types.ObjectId(courseId),
    });

    if (!progress) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || assignment.type !== 'subjective') {
      throw new NotFoundError('Subjective Assignment');
    }

    progress.submissions.push({
      assignmentId: new Types.ObjectId(assignmentId),
      submittedAt: new Date(),
      subjectiveAnswers: answers,
    });

    await progress.save();

    res.json({ message: 'Subjective assignment submitted successfully' });
  })
);

// GET /api/progress/course/:courseId/submissions - Get all submissions for a course (Coach)
router.get(
  '/course/:courseId/submissions',
  authenticate,
  coachOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;

    // Verify coach owns the course
    const course = await Course.findById(courseId);
    if (!course) throw new NotFoundError('Course');
    
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only view submissions for your own courses');
    }

    const progresses = await Progress.find({ courseId: course._id })
      .populate('userId', 'name email')
      .select('userId submissions');

    const submissions = progresses.flatMap((p) =>
      p.submissions.map((s) => ({
        ...(typeof s === 'object' && s !== null && typeof (s as any).toObject === 'function'
          ? (s as any).toObject()
          : { ...s }),
        student: p.userId,
        progressId: p._id,
      }))
    );

    res.json({ submissions });
  })
);

// PATCH /api/progress/:progressId/submissions/:submissionId/grade - Grade a submission (Coach)
router.patch(
  '/:progressId/submissions/:submissionId/grade',
  authenticate,
  coachOnly,
  validate(gradeSubmissionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { progressId, submissionId } = req.params;
    const { score, feedback } = req.body;

    const progress = await Progress.findById(progressId).populate('courseId');
    if (!progress) throw new NotFoundError('Progress');

    // Verify coach owns the course
    const course = progress.courseId as any;
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only grade your own course submissions');
    }

    const submission = progress.submissions.find(
      (s) => (s as any)._id.toString() === submissionId
    );

    if (!submission) throw new NotFoundError('Submission');

    if (score !== undefined) submission.score = score;
    if (feedback !== undefined) submission.feedback = feedback;
    submission.gradedAt = new Date();

    await progress.save();

    res.json({ message: 'Submission graded', submission });
  })
);

export default router;