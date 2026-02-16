/**
 * Work Session service. Business logic for start/end session and totals.
 */
const mongoose = require('mongoose');
const WorkSession = require('./workSession.model');
const Payment = require('../payments/payment.model');
const Delivery = require('../deliveries/delivery.model');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('../../utils/errors');

function isValidObjectId(v) {
  return v && mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);
}

function toISODate(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/**
 * Build contract-shaped session object for API responses (id, totalCash, cashPayments, etc.).
 */
async function toContractSession(sessionDoc) {
  if (!sessionDoc) return null;
  const t = sessionDoc.totals || {};
  const totalCash = t.totalCashCollected ?? 0;
  const totalCreditCollected = t.totalCreditCollected ?? 0;
  const totalCreditSales = t.totalCreditSales ?? 0;
  const totalExpenses = t.totalExpenses ?? 0;
  const totalRevenue = (t.totalRevenue ?? 0) || (totalCash + totalCreditCollected + totalCreditSales);

  const paymentIds = (sessionDoc.payments || []).map((p) => p.paymentId).filter(Boolean);
  const paymentDocs = paymentIds.length
    ? await Payment.find({ _id: { $in: paymentIds } }).populate('client', 'name').lean()
    : [];
  const paymentMap = new Map(paymentDocs.map((p) => [p._id.toString(), p]));

  const cashPayments = [];
  const creditPayments = [];
  for (const p of sessionDoc.payments || []) {
    const pay = p.paymentId ? paymentMap.get(p.paymentId.toString()) : null;
    const clientId = pay?.client?._id?.toString() || pay?.client?.toString() || '';
    const clientName = pay?.client?.name ?? '';
    const entry = {
      id: (p.paymentId || p._id || '').toString(),
      clientId,
      clientName,
      amount: p.amount ?? 0,
      time: toISODate(p.createdAt),
    };
    if (p.method === 'CASH') cashPayments.push(entry);
    else creditPayments.push(entry);
  }

  const deliveryIds = (sessionDoc.deliveries || []).map((d) => d.deliveryId).filter(Boolean);
  const deliveryDocs = deliveryIds.length
    ? await Delivery.find({ _id: { $in: deliveryIds } }).populate('client', 'name').lean()
    : [];
  const deliveryMap = new Map(deliveryDocs.map((d) => [d._id.toString(), d]));

  const deliveriesCompleted = (sessionDoc.deliveries || []).map((d) => {
    const del = d.deliveryId ? deliveryMap.get(d.deliveryId.toString()) : null;
    const clientId = del?.client?._id?.toString() || del?.client?.toString() || '';
    const clientName = del?.client?.name ?? '';
    const total = del?.totalAmount ?? d.amount ?? 0;
    return {
      id: (d.deliveryId || d._id || '').toString(),
      deliveryId: (d.deliveryId || '').toString(),
      clientId,
      clientName,
      total,
      time: toISODate(d.createdAt),
    };
  });

  const expenses = (sessionDoc.expenses || []).map((e) => ({
    id: (e._id || e.createdAt?.getTime?.() || '').toString(),
    label: e.label ?? '',
    amount: e.amount ?? 0,
    time: toISODate(e.createdAt),
  }));

  return {
    id: (sessionDoc._id || sessionDoc.id || '').toString(),
    startTime: toISODate(sessionDoc.startTime),
    endTime: toISODate(sessionDoc.endTime),
    status: sessionDoc.status || 'ACTIVE',
    totalCash,
    totalCreditCollected,
    totalCreditSales,
    totalExpenses,
    totalRevenue,
    cashPayments,
    creditPayments,
    creditSales: [], // not stored per-entry in current model
    expenses,
    deliveriesCompleted,
  };
}

/**
 * Start a new work session for the agent. Only one ACTIVE session per agent.
 * @param {string} agentId - User ID of the agent (from JWT).
 * @param {string} [startTimeISO] - Optional ISO 8601 start time (e.g. from request body).
 * @returns {Promise<Object>} Created session in contract shape (data.session).
 * @throws {ConflictError} 409 ACTIVE_SESSION_ALREADY_EXISTS if agent already has an ACTIVE session.
 */
async function startSession(agentId, startTimeISO = null) {
  const existing = await WorkSession.findOne({ agent: agentId, status: 'ACTIVE' }).lean();
  if (existing) {
    const err = new ConflictError('Active session already exists');
    err.code = 'ACTIVE_SESSION_ALREADY_EXISTS';
    throw err;
  }
  const startTime = startTimeISO ? new Date(startTimeISO) : new Date();
  const session = await WorkSession.create({
    agent: agentId,
    startTime,
    status: 'ACTIVE',
    totals: {
      totalCashCollected: 0,
      totalCreditCollected: 0,
      totalCreditSales: 0,
      totalExpenses: 0,
      totalRevenue: 0,
    },
    deliveries: [],
    payments: [],
    expenses: [],
  });
  const doc = session.toObject ? session.toObject() : session;
  return toContractSession(doc);
}

/**
 * End the active work session for the agent.
 * @param {string} agentId - User ID of the agent (from JWT).
 * @param {string} [sessionId] - Optional session id (from body); if provided, must match active session.
 * @param {string} [endTimeISO] - Optional ISO 8601 end time (from body).
 * @returns {Promise<Object>} { endTime, session } in contract shape.
 * @throws {NotFoundError} 404 NO_ACTIVE_SESSION if agent has no ACTIVE session or sessionId mismatch.
 */
async function endSession(agentId, sessionId = null, endTimeISO = null) {
  const session = await WorkSession.findOne({ agent: agentId, status: 'ACTIVE' });
  if (!session) {
    const err = new NotFoundError('No active session');
    err.code = 'NO_ACTIVE_SESSION';
    throw err;
  }
  if (sessionId && session._id.toString() !== sessionId) {
    const err = new NotFoundError('No active session for this sessionId');
    err.code = 'NO_ACTIVE_SESSION';
    throw err;
  }
  const endTime = endTimeISO ? new Date(endTimeISO) : new Date();
  session.endTime = endTime;
  session.status = 'ENDED';
  session.totals.totalRevenue =
    (session.totals.totalCashCollected || 0) + (session.totals.totalCreditCollected || 0) + (session.totals.totalCreditSales || 0);
  await session.save();

  const doc = session.toObject ? session.toObject() : session;
  const contract = await toContractSession(doc);
  return { endTime: contract.endTime, session: contract };
}

/**
 * Get active session for agent in contract shape. Used by frontend to restore session.
 * @param {string} agentId - User ID of the agent (from JWT).
 * @returns {Promise<Object>} { session: contractSession | null }.
 */
async function getActiveSession(agentId) {
  const session = await WorkSession.findOne({ agent: agentId, status: 'ACTIVE' }).lean();
  const contract = session ? await toContractSession(session) : null;
  return { session: contract };
}

/** Internal: get raw active session doc (for addExpense etc). */
async function getActiveSessionDoc(agentId) {
  return WorkSession.findOne({ agent: agentId, status: 'ACTIVE' }).lean();
}

/**
 * Get full session recap by id. Only owner (agent) can access.
 * @param {string} sessionId - WorkSession _id.
 * @param {string} agentId - User ID of the requesting agent (from JWT).
 * @returns {Promise<Object>} Full recap: session info, totals, deliveries, payments, expenses, duration.
 * @throws {NotFoundError} 404 if session not found.
 * @throws {ForbiddenError} 403 if session does not belong to agent.
 */
async function getSessionRecap(sessionId, agentId) {
  if (!isValidObjectId(sessionId)) {
    const err = new NotFoundError('Session not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const session = await WorkSession.findById(sessionId).lean();
  if (!session) {
    const err = new NotFoundError('Session not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const ownerId = session.agent && session.agent.toString ? session.agent.toString() : String(session.agent);
  const requesterId = agentId && agentId.toString ? agentId.toString() : String(agentId);
  if (ownerId !== requesterId) throw new ForbiddenError('You do not have access to this session');

  const contract = await toContractSession(session);
  return { session: contract };
}

/**
 * Get paginated session history for agent. Owner only; sorted by startTime DESC.
 * @param {string} agentId - User ID of the agent (from JWT).
 * @param {Object} query - { page, limit, fromDate, toDate }.
 * @returns {Promise<Object>} { results, page, limit, total } (contract pagination).
 */
async function getSessionHistory(agentId, query = {}) {
  const { page = 1, limit = 20, fromDate, toDate } = query;
  const filter = { agent: agentId };
  if (fromDate || toDate) {
    filter.startTime = {};
    if (fromDate) filter.startTime.$gte = new Date(fromDate);
    if (toDate) filter.startTime.$lte = new Date(toDate);
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    WorkSession.find(filter).sort({ startTime: -1 }).skip(skip).limit(limitNum).lean(),
    WorkSession.countDocuments(filter),
  ]);
  const results = await Promise.all(items.map((doc) => toContractSession(doc)));
  return {
    results,
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

/** Throws if session not found or not ACTIVE. */
function assertActiveSession(result) {
  if (!result) {
    const err = new BadRequestError('Session not found or not active');
    err.code = 'SESSION_NOT_ACTIVE';
    throw err;
  }
}

function assertPositiveAmount(amount) {
  const n = Number(amount);
  if (Number.isNaN(n) || n < 0) {
    throw new BadRequestError('Amount must be a non-negative number');
  }
  return n;
}

/**
 * Add cash payment to active session. Atomic $inc + $push.
 * @param {string} sessionId - WorkSession _id.
 * @param {number} amount - Amount collected.
 * @param {string} [paymentId] - Optional Payment _id (for Phase 10 integration).
 */
async function addCashPayment(sessionId, amount, paymentId = null) {
  const amt = assertPositiveAmount(amount);
  const now = new Date();
  const result = await WorkSession.findOneAndUpdate(
    { _id: sessionId, status: 'ACTIVE' },
    {
      $inc: { 'totals.totalCashCollected': amt },
      $push: {
        payments: {
          paymentId: paymentId || undefined,
          amount: amt,
          method: 'CASH',
          createdAt: now,
        },
      },
    },
    { new: true }
  ).lean();
  assertActiveSession(result);
  return result;
}

/**
 * Add credit payment to active session. Atomic $inc + $push.
 * @param {string} sessionId - WorkSession _id.
 * @param {number} amount - Amount collected.
 * @param {string} [paymentId] - Optional Payment _id.
 * @param {string} [method] - CASH | TRANSFER | CHEQUE; default TRANSFER.
 */
async function addCreditPayment(sessionId, amount, paymentId = null, method = 'TRANSFER') {
  const amt = assertPositiveAmount(amount);
  const now = new Date();
  const result = await WorkSession.findOneAndUpdate(
    { _id: sessionId, status: 'ACTIVE' },
    {
      $inc: { 'totals.totalCreditCollected': amt },
      $push: {
        payments: {
          paymentId: paymentId || undefined,
          amount: amt,
          method,
          createdAt: now,
        },
      },
    },
    { new: true }
  ).lean();
  assertActiveSession(result);
  return result;
}

/**
 * Add credit sale to active session. Atomic $inc only (no array in schema).
 * @param {string} sessionId - WorkSession _id.
 * @param {number} amount - Sale amount on credit.
 */
async function addCreditSale(sessionId, amount) {
  const amt = assertPositiveAmount(amount);
  const result = await WorkSession.findOneAndUpdate(
    { _id: sessionId, status: 'ACTIVE' },
    { $inc: { 'totals.totalCreditSales': amt } },
    { new: true }
  ).lean();
  assertActiveSession(result);
  return result;
}

/**
 * Add expense to active session. Atomic $inc + $push.
 * @param {string} sessionId - WorkSession _id.
 * @param {number} amount - Expense amount.
 * @param {string} label - Expense description.
 */
async function addExpense(sessionId, amount, label) {
  const amt = assertPositiveAmount(amount);
  const trimmedLabel = String(label || '').trim();
  if (!trimmedLabel) throw new BadRequestError('Expense label is required');
  const now = new Date();
  const result = await WorkSession.findOneAndUpdate(
    { _id: sessionId, status: 'ACTIVE' },
    {
      $inc: { 'totals.totalExpenses': amt },
      $push: {
        expenses: {
          label: trimmedLabel,
          amount: amt,
          createdAt: now,
        },
      },
    },
    { new: true }
  ).lean();
  assertActiveSession(result);
  return result;
}

/**
 * Add delivery to active session. Atomic $inc (by type) + $push to deliveries.
 * @param {string} sessionId - WorkSession _id.
 * @param {Object} deliveryData - { deliveryId, amount, type: 'CASH' | 'CREDIT' }.
 */
async function addDelivery(sessionId, deliveryData) {
  const { deliveryId, amount, type } = deliveryData || {};
  if (!deliveryId || (type !== 'CASH' && type !== 'CREDIT')) {
    throw new BadRequestError('deliveryData must include deliveryId and type (CASH or CREDIT)');
  }
  const amt = assertPositiveAmount(amount);
  const now = new Date();
  const inc = type === 'CASH'
    ? { 'totals.totalCashCollected': amt }
    : { 'totals.totalCreditSales': amt };
  const result = await WorkSession.findOneAndUpdate(
    { _id: sessionId, status: 'ACTIVE' },
    {
      $inc: inc,
      $push: {
        deliveries: {
          deliveryId,
          amount: amt,
          type,
          createdAt: now,
        },
      },
    },
    { new: true }
  ).lean();
  assertActiveSession(result);
  return result;
}

module.exports = {
  startSession,
  endSession,
  getActiveSession,
  getActiveSessionDoc,
  getSessionRecap,
  getSessionHistory,
  toContractSession,
  addCashPayment,
  addCreditPayment,
  addCreditSale,
  addExpense,
  addDelivery,
};
