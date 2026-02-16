#!/usr/bin/env node
/**
 * Generate JWT access (and optionally refresh) token using .env secrets.
 * Usage:
 *   node scripts/generate-jwt.js <userId>     # access + refresh for existing user
 *   node scripts/generate-jwt.js             # access token with placeholder userId (for testing)
 *
 * Get a real userId from: MongoDB, or POST /api/v1/auth/register (ADMIN) then use returned user id.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const accessSecret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!accessSecret || !refreshSecret) {
  console.error('Missing JWT_ACCESS_SECRET or JWT_REFRESH_SECRET in .env');
  process.exit(1);
}

const userId = process.argv[2] || '000000000000000000000001';
if (userId.length !== 24 && userId !== '000000000000000000000001') {
  console.warn('Warning: userId should be a 24-char MongoDB ObjectId for real API use.');
}

const accessToken = jwt.sign(
  { userId },
  accessSecret,
  { expiresIn: accessExpiresIn }
);

const refreshToken = jwt.sign(
  { userId, type: 'refresh' },
  refreshSecret,
  { expiresIn: refreshExpiresIn }
);

console.log('Access token (use in Authorization: Bearer <token>):');
console.log(accessToken);
console.log('\nRefresh token (use only for POST /api/v1/auth/refresh):');
console.log(refreshToken);
console.log('\nExpires: access', accessExpiresIn, '| refresh', refreshExpiresIn);
