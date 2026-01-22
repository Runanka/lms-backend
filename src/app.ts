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

  // CORS configuration - allow specific origins with credentials
  const allowedOrigins = [
    'https://app.skillwise.fun',
    'https://identity.skillwise.fun',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  }));
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