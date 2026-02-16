/**
 * Work Session controller. HTTP layer; delegates to workSession.service.
 */
const workSessionService = require('./workSession.service');
const { successResponse } = require('../../utils/response');
const { BadRequestError } = require('../../utils/errors');

/**
 * POST /work-sessions/start — Start work day. Body: { startTime } (ISO 8601). One active session per agent.
 */
async function start(req, res, next) {
  try {
    const agentId = req.user._id;
    const startTimeISO = req.body?.startTime;
    const session = await workSessionService.startSession(agentId, startTimeISO);
    return successResponse(res, 201, { session });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /work-sessions/end — End work day. Body: { sessionId, endTime } (ISO). Returns { endTime, session }.
 */
async function end(req, res, next) {
  try {
    const agentId = req.user._id;
    const { sessionId, endTime: endTimeISO } = req.body || {};
    const recap = await workSessionService.endSession(agentId, sessionId, endTimeISO);
    return successResponse(res, 200, recap);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /work-sessions/active — Return active session for agent (for frontend restore). Data null if none.
 */
async function getActive(req, res, next) {
  try {
    const agentId = req.user._id;
    const session = await workSessionService.getActiveSession(agentId);
    return successResponse(res, 200, session);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /work-sessions/history — Paginated session history for agent. Query: page, limit, fromDate, toDate.
 */
async function history(req, res, next) {
  try {
    const agentId = req.user._id;
    const result = await workSessionService.getSessionHistory(agentId, req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /work-sessions/expenses — Add expense to active session. Body: amount, label.
 */
async function addExpense(req, res, next) {
  try {
    const agentId = req.user._id;
    const activeDoc = await workSessionService.getActiveSessionDoc(agentId);
    if (!activeDoc) {
      const err = new BadRequestError('No active session. Start a session first.');
      err.code = 'NO_ACTIVE_SESSION';
      throw err;
    }
    const { amount, label } = req.body;
    await workSessionService.addExpense(activeDoc._id, amount, label);
    const { session } = await workSessionService.getActiveSession(agentId);
    return successResponse(res, 201, { session });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /work-sessions/:id — Full session recap (session info, totals, deliveries, payments, expenses, duration). Owner only.
 */
async function getRecap(req, res, next) {
  try {
    const agentId = req.user._id;
    const sessionId = req.params.id;
    const recap = await workSessionService.getSessionRecap(sessionId, agentId);
    return successResponse(res, 200, recap);
  } catch (err) {
    next(err);
  }
}

module.exports = { start, end, getActive, history, addExpense, getRecap };
