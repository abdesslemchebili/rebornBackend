const express = require('express');
const userController = require('./user.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const { createSchema, updateSchema, listQuerySchema } = require('./user.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(listQuerySchema, 'query'), userController.list);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), userController.getById);
router.post('/', requireRole(ROLES.ADMIN), validate(createSchema), userController.create);
router.patch('/:id', requireRole(ROLES.ADMIN), validate(updateSchema), userController.update);
router.delete('/:id', requireRole(ROLES.ADMIN), userController.remove);

module.exports = router;
