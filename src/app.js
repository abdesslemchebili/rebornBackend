/**
 * Express application setup.
 * Middleware order: security, body parsing, routes, then error handler.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
// Support multiple origins (comma-separated) and allow requests with no Origin (native mobile apps)
const allowedOrigins = env.corsOrigin ? env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean) : [];
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      // Native mobile (React Native, Expo, etc.) often sends no Origin
      return env.corsAllowNoOrigin ? callback(null, true) : callback(new Error('Origin not allowed'));
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Swagger UI (optional)
if (env.swaggerEnabled) {
  const { swaggerMiddleware } = require('./config/swagger');
  app.use('/api-docs', ...swaggerMiddleware());
}

// Uploaded files: GET /uploads/:filename (public)
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Root: friendly response when someone opens the service URL
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'REBORN API',
    api: env.apiPrefix,
    docs: env.swaggerEnabled ? `${req.protocol}://${req.get('host')}/api-docs` : null,
  });
});

app.use(env.apiPrefix, routes);

// 404 (contract: success: false, error: { code, message })
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use(errorHandler);

module.exports = app;
