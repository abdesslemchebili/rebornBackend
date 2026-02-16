/**
 * Payment service. Contract: id, clientId, clientName, amount, date, method, status; list includes summary (totalCollected, pending).
 */
const mongoose = require('mongoose');
const Payment = require('./payment.model');
const Client = require('../clients/client.model');
const workSessionService = require('../workSessions/workSession.service');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

function toContractPayment(doc) {
  if (!doc) return null;
  const clientId = doc.client?._id?.toString() || doc.client?.toString() || '';
  const clientName = doc.client?.name ?? '';
  const date = doc.paidAt
    ? (doc.paidAt instanceof Date ? doc.paidAt.toISOString().slice(0, 10) : String(doc.paidAt).slice(0, 10))
    : '';
  return {
    id: (doc._id || doc.id || '').toString(),
    clientId,
    clientName,
    amount: doc.amount ?? 0,
    date,
    method: (doc.method || 'cash').toLowerCase(),
    status: (doc.status || 'completed').toLowerCase(),
  };
}

async function getPaymentById(id) {
  const payment = await Payment.findById(id)
    .populate('client', 'name code totalDebt')
    .populate('delivery', 'totalAmount status')
    .populate('receivedBy', 'firstName lastName email')
    .lean();
  if (!payment) throw new NotFoundError('Payment not found');
  return toContractPayment(payment);
}

async function createPayment(data) {
  const clientId = data.client || data.clientId;
  if (!clientId) throw new BadRequestError('clientId is required');
  if (data.amount <= 0) throw new BadRequestError('Amount must be greater than zero');
  const client = await Client.findById(clientId).lean();
  if (!client) throw new NotFoundError('Client not found');
  const currentDebt = Number(client.totalDebt) || 0;
  if (data.amount > currentDebt) {
    throw new BadRequestError(`Amount (${data.amount}) exceeds client debt (${currentDebt})`);
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payload = {
      client: clientId,
      delivery: data.delivery || undefined,
      amount: data.amount,
      currency: data.currency || 'TND',
      method: data.method || 'cash',
      status: data.status || 'completed',
      paidAt: data.date ? new Date(data.date) : (data.paidAt || new Date()),
      receivedBy: data.receivedBy || data.createdBy,
      notes: data.notes,
      createdBy: data.createdBy,
    };
    const [payment] = await Payment.create([payload], { session });
    await Client.updateOne(
      { _id: clientId },
      { $inc: { totalDebt: -data.amount } },
      { session }
    );
    await session.commitTransaction();
    const agentId = payload.receivedBy || payload.createdBy;
    if (agentId) {
      try {
        const activeDoc = await workSessionService.getActiveSessionDoc(agentId);
        if (activeDoc) {
          const method = (payload.method || 'cash').toLowerCase();
          if (method === 'cash') {
            await workSessionService.addCashPayment(activeDoc._id, payload.amount, payment._id);
          } else {
            const wsMethod = method === 'check' ? 'CHEQUE' : method === 'transfer' ? 'TRANSFER' : 'TRANSFER';
            await workSessionService.addCreditPayment(activeDoc._id, payload.amount, payment._id, wsMethod);
          }
        }
      } catch (wsErr) {
        // Do not fail payment create if work session update fails
      }
    }
    const doc = await Payment.findById(payment._id)
      .populate('client', 'name code totalDebt')
      .populate('receivedBy', 'firstName lastName')
      .lean();
    return toContractPayment(doc);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function getPaymentsByClient(clientId) {
  const items = await Payment.find({ client: clientId })
    .populate('client', 'name')
    .populate('delivery', 'totalAmount plannedDate status')
    .populate('receivedBy', 'firstName lastName')
    .sort({ paidAt: -1 })
    .lean();
  return items.map(toContractPayment);
}

async function getPaymentsByDateRange(fromDate, toDate) {
  const filter = {};
  if (fromDate || toDate) {
    filter.paidAt = {};
    if (fromDate) filter.paidAt.$gte = new Date(fromDate);
    if (toDate) filter.paidAt.$lte = new Date(toDate);
  }
  const items = await Payment.find(filter)
    .populate('client', 'name code')
    .populate('receivedBy', 'firstName lastName')
    .sort({ paidAt: -1 })
    .lean();
  return items.map(toContractPayment);
}

async function getPaginated(query = {}) {
  const { page = 1, limit = 20, client, status, fromDate, toDate } = query;
  const filter = {};
  if (client) filter.client = client;
  if (status) filter.status = status;
  if (fromDate || toDate) {
    filter.paidAt = {};
    if (fromDate) filter.paidAt.$gte = new Date(fromDate);
    if (toDate) filter.paidAt.$lte = new Date(toDate);
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total, summaryResult] = await Promise.all([
    Payment.find(filter).populate('client', 'name code').populate('receivedBy', 'firstName lastName').sort({ paidAt: -1 }).skip(skip).limit(limitNum).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalCollected: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } } } },
    ]),
  ]);
  const summary = summaryResult[0] ? { totalCollected: summaryResult[0].totalCollected ?? 0, pending: summaryResult[0].pending ?? 0 } : { totalCollected: 0, pending: 0 };
  return {
    results: items.map(toContractPayment),
    summary,
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

async function updatePayment(id, data) {
  const payment = await Payment.findById(id);
  if (!payment) throw new NotFoundError('Payment not found');
  const allowed = ['delivery', 'currency', 'method', 'status', 'paidAt', 'notes'];
  allowed.forEach((key) => { if (data[key] !== undefined) payment[key] = data[key]; });
  await payment.save();
  const doc = await Payment.findById(id).populate('client', 'name code').populate('receivedBy', 'firstName lastName').lean();
  return toContractPayment(doc);
}

async function deletePayment(id) {
  const payment = await Payment.findById(id);
  if (!payment) throw new NotFoundError('Payment not found');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await Client.updateOne(
      { _id: payment.client },
      { $inc: { totalDebt: payment.amount } },
      { session }
    );
    await Payment.findByIdAndDelete(id, { session });
    await session.commitTransaction();
    return { deleted: true };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  getPaymentById,
  getPaginated,
  getPaymentsByClient,
  getPaymentsByDateRange,
  createPayment,
  updatePayment,
  deletePayment,
};
