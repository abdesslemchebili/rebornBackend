const express = require('express');
const circuitController = require('./circuit.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize, requireRole } = require('../../middleware/authorize');
const { createSchema, updateSchema, listQuerySchema } = require('./circuit.validation');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), validate(listQuerySchema, 'query'), circuitController.list);
router.get('/:id/clients', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), circuitController.getClients);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL, ROLES.DELIVERY), circuitController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(createSchema), circuitController.create);
router.patch('/:id', authorize(ROLES.ADMIN, ROLES.COMMERCIAL), validate(updateSchema), circuitController.update);
router.delete('/:id', requireRole(ROLES.ADMIN), circuitController.remove);

module.exports = router;
