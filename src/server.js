/**
 * Server entry point. Loads env, connects DB, starts HTTP server.
 */
require('dotenv').config();
const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    logger.info(`REBORN API listening on port ${env.port} (${env.nodeEnv})`);
    logger.info(`Base path: ${env.apiPrefix}`);
  });
  const shutdown = () => {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start:', err);
  process.exit(1);
});
