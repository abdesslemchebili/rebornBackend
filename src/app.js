/**
 * Express application setup.
 * Middleware order: security, body parsing, routes, then error handler.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Swagger UI (optional)
if (env.swaggerEnabled) {
  const { swaggerMiddleware } = require('./config/swagger');
  app.use('/api-docs', ...swaggerMiddleware());
}

app.use(env.apiPrefix, routes);

// 404 (contract: success: false, error: { code, message })
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use(errorHandler);

module.exports = app;
