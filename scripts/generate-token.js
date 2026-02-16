#!/usr/bin/env node
/**
 * JWT token generator CLI for development and testing.
 * Uses secrets from .env only. Never hardcodes secrets.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/** Parse CLI args like --id=123 --role=admin into an object. */
function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--') || !arg.includes('=')) continue;
    const [key, ...v] = arg.slice(2).split('=');
    const value = v.join('=').trim();
    if (key && value !== undefined) out[key] = value;
  }
  return out;
}

/** Sanitize string for payload (avoid injection / huge values). */
function sanitize(str, maxLen = 256) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen).trim();
}

function main() {
  try {
    if (!ACCESS_SECRET || !REFRESH_SECRET) {
      console.error('Error: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');
      process.exit(1);
    }

    const args = parseArgs();
    const id = sanitize(args.id) || 'test-user-id';
    const email = sanitize(args.email) || 'test@reborn.com';
    const role = sanitize(args.role) || 'agent';

    const accessPayload = {
      userId: id,
      id,
      email,
      role,
      type: 'access',
    };

    const refreshPayload = {
      userId: id,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

    console.log('\nACCESS TOKEN:');
    console.log(accessToken);
    console.log('\nREFRESH TOKEN:');
    console.log(refreshToken);
    console.log('');
  } catch (err) {
    console.error('Error generating tokens:', err.message || err);
    process.exit(1);
  }
}

main();
