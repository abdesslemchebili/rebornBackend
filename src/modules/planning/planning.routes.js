const express = require('express');
const planningController = require('./planning.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const { createSchema, updateSchema, listQuerySchema, byDateQuerySchema } = require('./planning.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(listQuerySchema, 'query'), planningController.list);
router.get('/by-date', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(byDateQuerySchema, 'query'), planningController.byDate);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), planningController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(createSchema), planningController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(updateSchema), planningController.update);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(updateSchema), planningController.update);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), planningController.remove);

module.exports = router;
