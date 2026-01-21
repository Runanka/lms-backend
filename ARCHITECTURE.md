# Architecture Guide

This document describes the architecture and design decisions of the Skillwise LMS Backend.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Layered Architecture](#layered-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Database Design](#database-design)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [API Design](#api-design)

## Overview

The backend follows a **modular, layered architecture** inspired by clean architecture principles. Each feature is encapsulated in its own module with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express Server                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Middleware                         │   │
│  │  • CORS • Auth • Validation • Error Handler         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Routes                                │
│  /api/users • /api/courses • /api/paths • /api/progress    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Route Handlers                           │
│           (Business logic in route files)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Mongoose Models                           │
│   User • Course • Assignment • Progress • Path • Comment   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB                                │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app.ts                 # Express app setup, middleware, routes
├── server.ts              # Server entry point, DB connection
├── config/
│   └── index.ts           # Environment configuration
├── middleware/
│   ├── index.ts           # Barrel export
│   ├── auth.ts            # JWT authentication
│   ├── roles.ts           # Role-based access control
│   ├── validate.ts        # Zod validation middleware
│   └── errorHandler.ts    # Global error handler
├── shared/
│   ├── database/
│   │   └── mongodb.ts     # Mongoose connection
│   ├── errors/
│   │   └── index.ts       # Custom error classes
│   └── types/
│       └── express.d.ts   # Express type extensions
└── modules/
    ├── users/
    │   ├── index.ts       # Barrel export
    │   ├── user.model.ts  # Mongoose model
    │   └── user.routes.ts # API routes
    ├── courses/
    │   ├── index.ts
    │   ├── course.model.ts
    │   ├── course.schema.ts  # Zod validation
    │   └── course.routes.ts
    ├── assignments/
    │   ├── index.ts
    │   ├── assignment.model.ts
    │   ├── assignment.schema.ts
    │   └── assignment.routes.ts
    ├── progress/
    │   ├── index.ts
    │   ├── progress.model.ts
    │   ├── progress.schema.ts
    │   └── progress.routes.ts
    ├── paths/
    │   ├── index.ts
    │   ├── path.model.ts
    │   ├── pathEnrollment.model.ts
    │   ├── path.schema.ts
    │   └── path.routes.ts
    └── comments/
        ├── index.ts
        ├── comment.model.ts
        ├── comment.schema.ts
        └── comment.routes.ts
```

## Layered Architecture

### 1. Routes Layer

Routes define API endpoints and wire up middleware. Each module exports a router:

```typescript
// courses/course.routes.ts
const router = Router();

router.get('/', listCourses);
router.get('/:id', getCourse);
router.post('/', authenticate, coachOnly, validate(createCourseSchema), createCourse);
router.put('/:id', authenticate, coachOnly, validate(updateCourseSchema), updateCourse);
router.delete('/:id', authenticate, coachOnly, deleteCourse);

export { router as courseRoutes };
```

### 2. Middleware Layer

Middleware handles cross-cutting concerns:

| Middleware | Purpose |
|------------|---------|
| `authenticate` | Validates JWT, attaches user to request |
| `coachOnly` / `studentOnly` | Role-based access control |
| `validate(schema)` | Validates request body against Zod schema |
| `errorHandler` | Catches errors, returns consistent responses |

### 3. Model Layer

Mongoose models define the data schema and provide data access:

```typescript
// courses/course.model.ts
const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  coachId: { type: String, required: true },
  modules: [moduleSchema],
  // ...
});

export const Course = model<ICourse>('Course', courseSchema);
```

## Authentication & Authorization

### Authentication Flow

1. Client authenticates with Zitadel (OAuth2/OIDC)
2. Client receives JWT access token
3. Client sends token in `Authorization: Bearer <token>` header
4. Backend verifies token using Zitadel's JWKS endpoint

```typescript
// middleware/auth.ts
const client = jwksClient({
  jwksUri: `${config.zitadel.issuer}/.well-known/jwks.json`,
  cache: true,
});

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  const decoded = jwt.verify(token, getKey, {
    issuer: config.zitadel.issuer,
    algorithms: ['RS256'],
  });
  
  // Find or create user in database
  let user = await User.findOne({ zitadelId: decoded.sub });
  if (!user) {
    user = await User.create({
      zitadelId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    });
  }
  
  req.user = user;
  next();
};
```

### Role-Based Access Control

Two roles exist: `student` and `coach`. Middleware enforces access:

```typescript
// middleware/roles.ts
export const coachOnly = (req, res, next) => {
  if (req.user?.role !== 'coach') {
    throw new ForbiddenError('Coach access required');
  }
  next();
};

export const studentOnly = (req, res, next) => {
  if (req.user?.role !== 'student') {
    throw new ForbiddenError('Student access required');
  }
  next();
};
```

### Ownership Checks

Some routes require ownership verification (e.g., only course owner can edit):

```typescript
// In route handler
const course = await Course.findById(id);
if (course.coachId !== req.user.id) {
  throw new ForbiddenError('Not authorized to modify this course');
}
```

## Database Design

### Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Course    │       │    Path     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ _id         │──┐    │ _id         │◄──┐   │ _id         │
│ zitadelId   │  │    │ coachId ────│───┘   │ createdBy ──│───┐
│ email       │  │    │ title       │       │ title       │   │
│ name        │  │    │ modules[]   │◄──────│ courses[]   │   │
│ role        │  │    │ description │       │ description │   │
└─────────────┘  │    └─────────────┘       └─────────────┘   │
                 │                                             │
                 │    ┌─────────────┐       ┌───────────────┐  │
                 │    │ Assignment  │       │PathEnrollment │  │
                 │    ├─────────────┤       ├───────────────┤  │
                 │    │ _id         │       │ _id           │  │
                 │    │ courseId    │       │ userId ───────│──┤
                 │    │ coachId ────│───────│ pathId        │  │
                 │    │ type        │       │ startedAt     │  │
                 │    │ questions[] │       └───────────────┘  │
                 │    └─────────────┘                          │
                 │                                             │
                 │    ┌─────────────┐       ┌─────────────┐    │
                 │    │  Progress   │       │   Comment   │    │
                 │    ├─────────────┤       ├─────────────┤    │
                 │    │ _id         │       │ _id         │    │
                 └────│ userId      │       │ userId ─────│────┘
                      │ courseId    │       │ courseId    │
                      │ completed[] │       │ content     │
                      │ submissions │       │ createdAt   │
                      └─────────────┘       └─────────────┘
```

### Embedded vs Referenced Documents

**Embedded** (within parent document):
- `Module` → embedded in `Course`
- `Resource` → embedded in `Module`
- `Submission` → embedded in `Progress`
- `MCQQuestion` / `SubjectiveQuestion` → embedded in `Assignment`

**Referenced** (separate collections):
- `Assignment` → referenced by `Module.assignmentId`
- `User` → referenced by `userId` fields
- `Course` → referenced by `Path.courses[]`

### Key Models

#### Course (with embedded modules)

```typescript
interface ICourse {
  _id: ObjectId;
  coachId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  modules: IModule[];
  createdAt: Date;
  updatedAt: Date;
}

interface IModule {
  _id: ObjectId;
  title: string;
  order: number;
  resources: IResource[];
  assignmentId?: ObjectId;
}

interface IResource {
  _id: ObjectId;
  type: 'video' | 'document';
  title: string;
  youtubeUrl?: string;  // For videos
  content?: string;      // For documents
}
```

#### Progress (tracks student completion)

```typescript
interface IProgress {
  _id: ObjectId;
  userId: string;
  courseId: ObjectId;
  completedResources: ObjectId[];  // Resource IDs
  completedAssignments: ObjectId[]; // Assignment IDs
  submissions: ISubmission[];
  progress: number;  // 0-100 percentage
  enrolledAt: Date;
  completedAt?: Date;
}

interface ISubmission {
  _id: ObjectId;
  assignmentId: ObjectId;
  answers: IAnswer[];
  score?: number;
  gradedBy?: string;
  submittedAt: Date;
}
```

## Error Handling

### Custom Error Classes

```typescript
// shared/errors/index.ts
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}
```

### Global Error Handler

```typescript
// middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  // Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.issues,
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Unknown errors
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
  });
};
```

## Validation

### Zod Schemas

Each module defines validation schemas:

```typescript
// courses/course.schema.ts
const resourceSchema = z.object({
  type: z.enum(['video', 'document']),
  title: z.string().min(1),
  youtubeUrl: z.string().url().optional(),
  content: z.string().max(50000).optional(),
}).refine((data) => {
  if (data.type === 'video' && !data.youtubeUrl) return false;
  if (data.type === 'document' && !data.content) return false;
  return true;
}, { message: 'Video requires youtubeUrl, document requires content' });

const moduleSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(0),
  resources: z.array(resourceSchema).min(1),
  assignmentId: z.string().optional(),
});

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  modules: z.array(moduleSchema).min(1),
});
```

### Validation Middleware

```typescript
// middleware/validate.ts
export const validate = (schema: z.ZodType) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }
    req.body = result.data;
    next();
  };
};
```

## API Design

### Response Format

**Success Response:**
```json
{
  "course": { ... },
  "message": "Course created successfully"
}
```

**Error Response:**
```json
{
  "error": "Course not found"
}
```

**Validation Error Response:**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "code": "too_small",
      "minimum": 3,
      "path": ["title"],
      "message": "Title must be at least 3 characters"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Pagination (where applicable)

```json
{
  "courses": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## Security Considerations

1. **JWT Verification** - All tokens verified against Zitadel's JWKS
2. **Input Validation** - All inputs validated with Zod before processing
3. **Role Checks** - Middleware enforces role-based access
4. **Ownership Checks** - Users can only modify their own resources
5. **MongoDB Injection** - Mongoose provides built-in sanitization
6. **CORS** - Configured to allow only specific origins

## Future Improvements

- [ ] Add Redis for session caching
- [ ] Implement rate limiting
- [ ] Add request logging with correlation IDs
- [ ] Implement soft deletes
- [ ] Add database indexes for performance
- [ ] Add integration tests
- [ ] Implement WebSockets for real-time comments

