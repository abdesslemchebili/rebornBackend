/**
 * Centralized logger utility.
 * Uses simple stdout/stderr; can be replaced with pino/winston later.
 */
const env = require('../config/env');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[env.logLevel] ?? levels.info;

function log(level, ...args) {
  if (levels[level] <= currentLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const out = level === 'error' ? process.stderr : process.stdout;
    out.write(prefix + ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
  }
}

module.exports = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  debug: (...args) => log('debug', ...args),
};
