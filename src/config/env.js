/**
 * Environment configuration loader and validator.
 * Loads .env and exposes typed config; fails fast on missing required vars.
 */
require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/reborn',
  jwt: {
    // JWT_SECRET (contract) or JWT_ACCESS_SECRET for access token
    accessSecret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
};

// Validate required vars in production
if (env.nodeEnv === 'production') {
  if (!env.jwt.accessSecret || !env.jwt.refreshSecret) {
    throw new Error('JWT_SECRET (or JWT_ACCESS_SECRET) and JWT_REFRESH_SECRET are required in production');
  }
}

module.exports = env;
