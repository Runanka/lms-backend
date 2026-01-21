import express from 'express';
import cors from 'cors';
import { userRoutes } from './modules/users/index.js';
import { courseRoutes } from './modules/courses/index.js';
import { assignmentRoutes } from './modules/assignments/index.js';
import { progressRoutes } from './modules/progress/index.js';
import { commentRoutes } from './modules/comments/index.js';
import { pathRoutes } from './modules/paths/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check route
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/users', userRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/courses', commentRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/paths', pathRoutes);

  // Error handler
  app.use(errorHandler);
  return app;
}