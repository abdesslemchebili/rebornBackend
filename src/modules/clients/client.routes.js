const express = require('express');
const clientController = require('./client.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const { createSchema, updateSchema, listQuerySchema, nearQuerySchema } = require('./client.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(listQuerySchema, 'query'), clientController.list);
router.get('/near', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(nearQuerySchema, 'query'), clientController.near);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), clientController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(createSchema), clientController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(updateSchema), clientController.update);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(updateSchema), clientController.update);
router.delete('/:id', requireRole(ROLES.ADMIN), clientController.remove);

module.exports = router;
