const express = require('express');
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/authorize');
const { ROLES } = require('../../constants/roles');
const { loginSchema, refreshSchema, registerSchema } = require('./auth.validation');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/register', authenticate, requireRole(ROLES.ADMIN), validate(registerSchema), authController.register);

module.exports = router;
