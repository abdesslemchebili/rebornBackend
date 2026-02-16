/**
 * Client segment enum for classification.
 */
const SEGMENTS = {
  PREMIUM: 'PREMIUM',
  STANDARD: 'STANDARD',
  WHOLESALE: 'WHOLESALE',
  RETAIL: 'RETAIL',
};

const ALL_SEGMENTS = Object.values(SEGMENTS);

module.exports = { SEGMENTS, ALL_SEGMENTS };
