/**
 * Centralized error handling middleware.
 * Catches all errors, logs them, and returns consistent JSON responses.
 */
const logger = require('../utils/logger');
const { AppError, errorResponse } = require('../utils/errors');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Operational (known) errors (use err.code if set; default NOT_FOUND for 404, UNAUTHORIZED for 401)
  if (err.isOperational && err instanceof AppError) {
    let code = err.code;
    if (!code) {
      if (err.statusCode === 404) code = 'NOT_FOUND';
      else if (err.statusCode === 401) code = 'UNAUTHORIZED';
      else code = 'APP_ERROR';
    }
    return errorResponse(res, err.statusCode, err.message, err.details, code);
  }

  // Joi validation errors
  if (err.isJoi) {
    const details = err.details?.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return errorResponse(res, 422, 'Validation failed', details, 'VALIDATION_ERROR');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.entries(err.errors).map(([k, v]) => ({ field: k, message: v.message }));
    return errorResponse(res, 422, 'Validation failed', details, 'VALIDATION_ERROR');
  }

  // Mongoose duplicate key (11000)
  if (err.code === 11000) {
    return errorResponse(res, 409, 'Resource already exists with this value', null, 'DUPLICATE_KEY');
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return errorResponse(res, 400, 'Invalid identifier', null, 'INVALID_ID');
  }

  // JWT errors (contract: INVALID_TOKEN for invalid/expired)
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, err.message || 'Invalid token', null, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired', null, 'INVALID_TOKEN');
  }

  logger.error('Unhandled error:', err);

  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  return errorResponse(res, 500, message, null, 'INTERNAL_ERROR');
}

module.exports = errorHandler;
