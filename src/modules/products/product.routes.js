const express = require('express');
const productController = require('./product.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const { createSchema, updateSchema, updateStockSchema, listQuerySchema } = require('./product.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

// COMMERCIAL and DELIVERY can read; ADMIN can create/update/delete
router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(listQuerySchema, 'query'), productController.list);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), productController.getById);
router.post('/', requireRole(ROLES.ADMIN), validate(createSchema), productController.create);
router.put('/:id', requireRole(ROLES.ADMIN), validate(updateSchema), productController.update);
router.patch('/:id', requireRole(ROLES.ADMIN), validate(updateSchema), productController.update);
router.patch('/:id/stock', requireRole(ROLES.ADMIN), validate(updateStockSchema), productController.updateStock);
router.patch('/:id/deactivate', requireRole(ROLES.ADMIN), productController.deactivate);
router.delete('/:id', requireRole(ROLES.ADMIN), productController.remove);

module.exports = router;
