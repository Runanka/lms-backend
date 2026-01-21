# Contributing Guide

Thank you for considering contributing to the Skillwise LMS Backend! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Adding a New Feature](#adding-a-new-feature)
- [Creating a New Module](#creating-a-new-module)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MongoDB (local or Atlas)
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Zitadel** (authentication server)
   ```bash
   cd scripts
   docker compose up -d
   ```

4. **Configure Zitadel** (see [README.md](./README.md) for detailed instructions)

5. **Create environment file**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Entry point
├── config/             # Configuration
├── middleware/         # Express middleware
├── shared/             # Shared utilities
│   ├── database/       # DB connection
│   ├── errors/         # Custom errors
│   └── types/          # Type definitions
└── modules/            # Feature modules
    ├── users/
    ├── courses/
    ├── assignments/
    ├── progress/
    ├── paths/
    └── comments/
```

Each module follows this structure:
```
module-name/
├── index.ts            # Barrel export
├── module.model.ts     # Mongoose model
├── module.schema.ts    # Zod validation schemas
└── module.routes.ts    # Express routes
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types on functions
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// ✅ Good
interface CreateCourseInput {
  title: string;
  description?: string;
}

async function createCourse(input: CreateCourseInput): Promise<ICourse> {
  // ...
}

// ❌ Avoid
const createCourse = async (input: any) => {
  // ...
}
```

### Express Routes

- Use async/await with proper error handling
- Pass errors to `next()` for centralized handling
- Use validation middleware for request bodies

```typescript
// ✅ Good
router.post('/', authenticate, validate(createSchema), async (req, res, next) => {
  try {
    const result = await Model.create(req.body);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// ❌ Avoid
router.post('/', async (req, res) => {
  const result = await Model.create(req.body);  // No validation, no error handling
  res.json(result);
});
```

### Mongoose Models

- Define interfaces for documents
- Use TypeScript generics with `Schema` and `model`
- Add indexes for frequently queried fields

```typescript
interface ICourse extends Document {
  title: string;
  coachId: string;
  // ...
}

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true, index: true },
  coachId: { type: String, required: true, index: true },
});

export const Course = model<ICourse>('Course', courseSchema);
```

### Zod Schemas

- Define reusable sub-schemas
- Use `.refine()` for complex validation
- Export input types derived from schemas

```typescript
const resourceSchema = z.object({
  type: z.enum(['video', 'document']),
  title: z.string().min(1, 'Title is required'),
  // ...
});

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  modules: z.array(moduleSchema).min(1),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
```

## Adding a New Feature

### To an Existing Module

1. **Update the model** (if needed)
   - Add new fields to the schema
   - Update TypeScript interface

2. **Add validation schema** (if needed)
   - Create Zod schema in `module.schema.ts`

3. **Add route handler**
   - Add route in `module.routes.ts`
   - Apply appropriate middleware

4. **Test the endpoint**
   - Use Postman, curl, or similar

### Example: Adding a "featured" flag to courses

```typescript
// 1. Update model
const courseSchema = new Schema<ICourse>({
  // ... existing fields
  isFeatured: { type: Boolean, default: false },
});

// 2. Update schema
export const updateCourseSchema = z.object({
  // ... existing fields
  isFeatured: z.boolean().optional(),
});

// 3. Route is already there (PUT /courses/:id)
```

## Creating a New Module

1. **Create module directory**
   ```bash
   mkdir -p src/modules/new-module
   ```

2. **Create model file** (`new-module.model.ts`)
   ```typescript
   import { Schema, model, Document } from 'mongoose';

   export interface INewModule extends Document {
     name: string;
     // ... other fields
   }

   const newModuleSchema = new Schema<INewModule>({
     name: { type: String, required: true },
   }, { timestamps: true });

   export const NewModule = model<INewModule>('NewModule', newModuleSchema);
   ```

3. **Create schema file** (`new-module.schema.ts`)
   ```typescript
   import { z } from 'zod';

   export const createNewModuleSchema = z.object({
     name: z.string().min(1),
   });

   export type CreateNewModuleInput = z.infer<typeof createNewModuleSchema>;
   ```

4. **Create routes file** (`new-module.routes.ts`)
   ```typescript
   import { Router } from 'express';
   import { NewModule } from './new-module.model.js';
   import { createNewModuleSchema } from './new-module.schema.js';
   import { authenticate, validate } from '../../middleware/index.js';

   const router = Router();

   // GET /api/new-module
   router.get('/', async (req, res, next) => {
     try {
       const items = await NewModule.find();
       res.json({ items });
     } catch (error) {
       next(error);
     }
   });

   // POST /api/new-module
   router.post('/', authenticate, validate(createNewModuleSchema), async (req, res, next) => {
     try {
       const item = await NewModule.create(req.body);
       res.status(201).json({ item });
     } catch (error) {
       next(error);
     }
   });

   export { router as newModuleRoutes };
   ```

5. **Create barrel export** (`index.ts`)
   ```typescript
   export * from './new-module.model.js';
   export * from './new-module.routes.js';
   ```

6. **Register routes** in `app.ts`
   ```typescript
   import { newModuleRoutes } from './modules/new-module/index.js';

   // In route registration section:
   app.use('/api/new-module', newModuleRoutes);
   ```

## Testing

Currently, the project doesn't have automated tests. When adding tests:

### Unit Tests

- Test Zod schemas with valid and invalid inputs
- Test utility functions

### Integration Tests

- Test API endpoints with supertest
- Use an in-memory MongoDB for isolation

### Example Test Structure

```typescript
// __tests__/courses.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('Courses API', () => {
  describe('GET /api/courses', () => {
    it('should return a list of courses', async () => {
      const response = await request(app).get('/api/courses');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('courses');
    });
  });
});
```

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Build, dependencies, etc. |

### Examples

```
feat(courses): add featured flag to courses
fix(auth): handle expired JWT tokens gracefully
docs(readme): update setup instructions
refactor(progress): extract progress calculation logic
```

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add necessary validation
   - Update documentation if needed

3. **Test your changes**
   - Test manually with Postman/curl
   - Run `npm run lint` to check for issues

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(module): description of change"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/my-feature
   ```

6. **Fill out PR template**
   - Describe what the PR does
   - Link related issues
   - List any breaking changes

7. **Address review feedback**
   - Make requested changes
   - Push additional commits

8. **Merge**
   - Once approved, squash and merge

## Questions?

If you have questions or need help:

1. Check existing documentation
2. Look at similar code in the codebase
3. Open an issue for discussion

Thank you for contributing! 🎉

