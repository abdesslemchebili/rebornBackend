/**
 * JWT authentication middleware.
 * Verifies access token and attaches user to req; supports optional auth.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');
const User = require('../modules/users/user.model');

/**
 * Require valid JWT access token. Sets req.user (populated from DB).
 */
async function authenticate(req, res, next) {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      throw new UnauthorizedError('Access token required');
    }
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const e = new UnauthorizedError('Token expired');
      e.code = 'INVALID_TOKEN';
      return next(e);
    }
    if (err.name === 'JsonWebTokenError') {
      const e = new UnauthorizedError('Invalid token');
      e.code = 'INVALID_TOKEN';
      return next(e);
    }
    if (err instanceof UnauthorizedError && !err.code) err.code = 'UNAUTHORIZED';
    next(err);
  }
}

/**
 * Optional auth: if token present and valid, sets req.user; otherwise continues without user.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.accessToken;
    if (!token) return next();
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = { authenticate, optionalAuth };
