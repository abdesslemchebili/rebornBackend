/**
 * Application error classes and error response helper.
 * Ensures consistent error responses and correct HTTP status codes.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 422);
    this.details = details;
  }
}

/**
 * Standard error response shape for API consumers.
 * Format: { success: false, error: { code, message [, details] } }
 */
function errorResponse(res, statusCode, message, details = null, code = null) {
  const error = { code: code || 'ERROR', message };
  if (details) error.details = details;
  return res.status(statusCode).json({ success: false, error });
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  errorResponse,
};
