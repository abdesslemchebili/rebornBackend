#!/usr/bin/env node
/**
 * JWT token verification CLI for development and testing.
 * Verifies using JWT_ACCESS_SECRET from .env only.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

function main() {
  const token = process.argv[2];
  if (!token || typeof token !== 'string') {
    console.error('Usage: node scripts/verify-token.js <token>');
    console.error('Example: node scripts/verify-token.js eyJhbGciOiJIUzI1NiIs...');
    process.exit(1);
  }

  if (!ACCESS_SECRET) {
    console.error('Error: JWT_ACCESS_SECRET must be set in .env');
    process.exit(1);
  }

  try {
    const decoded = jwt.verify(token.trim(), ACCESS_SECRET);
    console.log('Valid token.');
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.error('Error: Token has expired.');
    } else if (err.name === 'JsonWebTokenError') {
      console.error('Error: Invalid token.', err.message);
    } else {
      console.error('Error:', err.message || err);
    }
    process.exit(1);
  }
}

main();
