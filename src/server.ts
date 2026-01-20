import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './shared/database/mongodb.js';

async function start() {
  // Connect to MongoDB first
  await connectDatabase();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`🚀 Server running at http://localhost:${config.port}`);
  });
}

start();