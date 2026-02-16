const express = require('express');
const deliveryController = require('./delivery.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const {
  createSchema,
  updateSchema,
  updateStatusSchema,
  listQuerySchema,
  byDateQuerySchema,
  byClientParamsSchema,
} = require('./delivery.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(listQuerySchema, 'query'), deliveryController.list);
router.get('/by-date', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(byDateQuerySchema, 'query'), deliveryController.byDate);
router.get('/by-client/:clientId', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(byClientParamsSchema, 'params'), deliveryController.byClient);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), deliveryController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.DELIVERY), validate(createSchema), deliveryController.create);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.DELIVERY), validate(updateSchema), deliveryController.update);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.DELIVERY), validate(updateStatusSchema), deliveryController.updateStatus);
router.delete('/:id', requireRole(ROLES.ADMIN), deliveryController.remove);

module.exports = router;
