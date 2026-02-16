/**
 * Auth service - login, refresh tokens; no HTTP.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const env = require('../../config/env');
const { UnauthorizedError, BadRequestError, ConflictError } = require('../../utils/errors');

const tokenStore = new Map(); // In production use Redis for refresh tokens

/** Contract shape: { id, name, email } for auth responses. */
function toAuthUser(doc) {
  if (!doc) return null;
  const id = doc._id ? doc._id.toString() : doc.id;
  const name = [doc.firstName, doc.lastName].filter(Boolean).join(' ').trim() || doc.email || '';
  return { id, name, email: doc.email || '' };
}

// Access token: 15 minutes; Refresh token: 7 days (via env)
function generateAccessToken(userId) {
  return jwt.sign({ userId }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function verifyRefreshToken(token) {
  if (!token) throw new BadRequestError('Refresh token required');
  const decoded = jwt.verify(token, env.jwt.refreshSecret);
  if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');
  return decoded;
}

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    const err = new UnauthorizedError('Invalid email or password');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  if (!user.isActive) {
    const err = new UnauthorizedError('Account is disabled');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new UnauthorizedError('Invalid email or password');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  tokenStore.set(refreshToken, user._id.toString());
  const userPayload = await User.findById(user._id).select('-password').lean();
  return { user: toAuthUser(userPayload), token: accessToken, refreshToken };
}

async function refresh(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    tokenStore.delete(refreshToken);
    const e = new UnauthorizedError(err.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token');
    e.code = 'INVALID_TOKEN';
    throw e;
  }
  const userId = decoded.userId;
  const stored = tokenStore.get(refreshToken);
  if (stored !== userId) {
    const err = new UnauthorizedError('Invalid refresh token');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
  const user = await User.findById(userId).select('-password').lean();
  if (!user || !user.isActive) {
    const err = new UnauthorizedError('User not found or disabled');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
  const accessToken = generateAccessToken(userId);
  const newRefreshToken = generateRefreshToken(userId);
  tokenStore.delete(refreshToken);
  tokenStore.set(newRefreshToken, userId);
  return { token: accessToken, refreshToken: newRefreshToken };
}

/** Register new user. Caller must ensure requester is ADMIN. */
async function register(payload) {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) throw new ConflictError('User with this email already exists');
  const user = await User.create(payload);
  const safe = await User.findById(user._id).select('-password').lean();
  return safe;
}

async function logout(refreshToken) {
  if (refreshToken) tokenStore.delete(refreshToken);
  return {};
}

async function getMe(userId) {
  const user = await User.findById(userId).select('-password').lean();
  if (!user) {
    const err = new UnauthorizedError('User not found');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return { user: toAuthUser(user) };
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  getMe,
  toAuthUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
