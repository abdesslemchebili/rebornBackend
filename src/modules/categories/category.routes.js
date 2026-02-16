/**
 * Categories route. Contract §7.3 Option A: GET /api/v1/categories returns { results: [ { id, label } ] }.
 */
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { successResponse } = require('../../utils/response');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { id: 'degreasing', label: 'Degreasing' },
  { id: 'oil_remover', label: 'Oil remover' },
  { id: 'engine', label: 'Engine' },
  { id: 'car_wash', label: 'Car wash' },
];

router.get('/', authenticate, (req, res) => {
  return successResponse(res, 200, { results: DEFAULT_CATEGORIES });
});

module.exports = router;
