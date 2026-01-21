import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Assignment } from './assignment.model.js';
import { Course } from '../courses/course.model.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { coachOnly } from '../../middleware/roles.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  type CreateAssignmentInput,
} from './assignment.schema.js';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/assignments/:id
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new NotFoundError('Assignment');
    
    // For students, hide correct answers
    if (req.user?.role === 'student' && assignment.mcqQuestions) {
      const sanitized = assignment.toObject();
      (sanitized as any).mcqQuestions = sanitized.mcqQuestions?.map((q: any) => ({
        ...q,
        options: q.options.map((o: any) => ({ text: o.text })), // Remove isCorrect
      }));
      return res.json({ assignment: sanitized });
    }
    
    res.json({ assignment });
  })
);

// GET /api/assignments/course/:courseId
router.get(
  '/course/:courseId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const assignments = await Assignment.find({ courseId: req.params.courseId as string });
    
    // For students, hide correct answers
    if (req.user?.role === 'student') {
      const sanitized = assignments.map((a) => {
        const obj = a.toObject();
        if (obj.mcqQuestions) {
          obj.mcqQuestions = obj.mcqQuestions.map((q: any) => ({
            ...q,
            options: q.options.map((o: any) => ({ text: o.text })),
          }));
        }
        return obj;
      });
      return res.json({ assignments: sanitized });
    }
    
    res.json({ assignments });
  })
);

// POST /api/assignments
router.post(
  '/',
  authenticate,
  coachOnly,
  validate(createAssignmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateAssignmentInput;
    
    // Verify coach owns the course
    const course = await Course.findById(data.courseId);
    if (!course) throw new NotFoundError('Course');
    
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only create assignments for your own courses');
    }
    
    const assignment = new Assignment(data);
    await assignment.save();
    
    res.status(201).json({
      message: 'Assignment created',
      assignmentId: assignment._id,
    });
  })
);

// PUT /api/assignments/:id
router.put(
  '/:id',
  authenticate,
  coachOnly,
  validate(updateAssignmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const assignment = await Assignment.findById(req.params.id).populate('courseId');
    if (!assignment) throw new NotFoundError('Assignment');
    
    // Verify coach owns the course
    const course = await Course.findById(assignment.courseId);
    if (!course) throw new NotFoundError('Course');
    
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only edit assignments for your own courses');
    }
    
    Object.assign(assignment, req.body);
    await assignment.save();
    
    res.json({ message: 'Assignment updated', assignment });
  })
);

// DELETE /api/assignments/:id
router.delete(
  '/:id',
  authenticate,
  coachOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) throw new NotFoundError('Assignment');
    
    const course = await Course.findById(assignment.courseId);
    if (!course) throw new NotFoundError('Course');
    
    if (course.coachId.toString() !== req.user!.dbUser!._id.toString()) {
      throw new ForbiddenError('You can only delete assignments for your own courses');
    }
    
    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  })
);

export default router;

