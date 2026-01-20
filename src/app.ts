import express from 'express';
import cors from 'cors';
import { courseRoutes } from './modules/courses/index.js';
import { progressRoutes } from './modules/progress/index.js';
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
  app.use('/api/courses', courseRoutes);
  app.use('/api/progress', progressRoutes);

  // Error handler
  app.use(errorHandler);
  return app;
}