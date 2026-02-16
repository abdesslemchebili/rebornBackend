const express = require('express');
const paymentController = require('./payment.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const {
  createSchema,
  updateSchema,
  listQuerySchema,
  dateRangeQuerySchema,
  byClientParamsSchema,
} = require('./payment.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(listQuerySchema, 'query'), paymentController.list);
router.get('/by-client/:clientId', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(byClientParamsSchema, 'params'), paymentController.byClient);
router.get('/by-date-range', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(dateRangeQuerySchema, 'query'), paymentController.byDateRange);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), paymentController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(createSchema), paymentController.create);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(updateSchema), paymentController.update);
router.delete('/:id', requireRole(ROLES.ADMIN), paymentController.remove);

module.exports = router;
