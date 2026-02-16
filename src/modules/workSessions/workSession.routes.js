/**
 * Work Session routes. Mounted at /work-sessions (API prefix applied by main router).
 * Security: all routes require authenticate; agent isolation enforced in service (owner-only access).
 */
const express = require('express');
const workSessionController = require('./workSession.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { startSchema, endSchema, addExpenseSchema, historyQuerySchema, sessionIdParamSchema } = require('./workSession.validation');

const router = express.Router();

router.use(authenticate);

router.get('/active', workSessionController.getActive);
router.get('/history', validate(historyQuerySchema, 'query'), workSessionController.history);
router.get('/:id', validate(sessionIdParamSchema, 'params'), workSessionController.getRecap);
router.post('/start', validate(startSchema), workSessionController.start);
router.post('/end', validate(endSchema), workSessionController.end);
router.post('/expenses', validate(addExpenseSchema), workSessionController.addExpense);

module.exports = router;
