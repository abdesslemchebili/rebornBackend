/**
 * Delivery service. totalAmount from products; updates client.totalDebt and product stock.
 * Contract: status pending | in_transit | completed; response id, clientId, clientName, date, items: [{ productId, qty }], total.
 */
const mongoose = require('mongoose');
const Delivery = require('./delivery.model');
const Client = require('../clients/client.model');
const Product = require('../products/product.model');
const workSessionService = require('../workSessions/workSession.service');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

function statusToContract(s) {
  if (s === 'in_progress') return 'in_transit';
  if (s === 'delivered') return 'completed';
  return s === 'cancelled' ? s : s || 'pending';
}

function statusFromContract(s) {
  if (s === 'in_transit') return 'in_progress';
  if (s === 'completed') return 'delivered';
  return s;
}

function toContractDelivery(doc) {
  if (!doc) return null;
  const clientId = doc.client?._id?.toString() || doc.client?.toString() || '';
  const clientName = doc.client?.name ?? '';
  const date = doc.plannedDate
    ? (doc.plannedDate instanceof Date ? doc.plannedDate.toISOString().slice(0, 10) : String(doc.plannedDate).slice(0, 10))
    : '';
  const items = (doc.products || []).map((p) => ({
    productId: (p.product?._id || p.product || '').toString(),
    qty: p.quantity ?? 0,
  }));
  return {
    id: (doc._id || doc.id || '').toString(),
    clientId,
    clientName,
    date,
    status: statusToContract(doc.status),
    items,
    total: doc.totalAmount ?? 0,
  };
}

function computeTotalAmount(lines) {
  return lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);
}

async function resolveProductLines(lines) {
  const resolved = [];
  for (const line of lines || []) {
    const product = await Product.findById(line.product).lean();
    if (!product) throw new BadRequestError(`Product ${line.product} not found`);
    const unitPrice = line.unitPrice != null ? line.unitPrice : product.price;
    const quantity = Math.max(0, Number(line.quantity) || 0);
    resolved.push({ product: line.product, quantity, unitPrice });
  }
  return resolved;
}

async function createDelivery(data) {
  const clientId = data.client || data.clientId;
  const productsInput = data.products?.length ? data.products : (data.items || []).map((i) => ({ product: i.productId || i.product, quantity: i.qty ?? i.quantity }));
  const lines = await resolveProductLines(productsInput);
  const totalAmount = computeTotalAmount(lines);
  const plannedDate = data.plannedDate || data.date || new Date();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payload = {
      client: clientId,
      circuit: data.circuit || undefined,
      products: lines,
      totalAmount,
      status: data.status || 'pending',
      assignedTo: data.assignedTo || undefined,
      plannedDate,
      proofPhoto: data.proofPhoto,
      notes: data.notes,
      createdBy: data.createdBy,
    };
    const delivery = await Delivery.create([payload], { session });
    await Client.updateOne(
      { _id: clientId },
      { $inc: { totalDebt: totalAmount } },
      { session }
    );
    await session.commitTransaction();
    const agentId = data.createdBy || data.assignedTo;
    if (agentId) {
      try {
        const activeDoc = await workSessionService.getActiveSessionDoc(agentId);
        if (activeDoc) {
          await workSessionService.addDelivery(activeDoc._id, {
            deliveryId: delivery[0]._id,
            amount: totalAmount,
            type: data.paymentType || 'CASH',
          });
        }
      } catch (wsErr) {
        // Do not fail delivery create if work session update fails
      }
    }
    const doc = await Delivery.findById(delivery[0]._id)
      .populate('client', 'name code address')
      .populate('circuit', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('products.product', 'name code unit')
      .lean();
    return toContractDelivery(doc);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function updateStatus(id, status, options = {}) {
  const delivery = await Delivery.findById(id);
  if (!delivery) throw new NotFoundError('Delivery not found');
  const internalStatus = statusFromContract(status) || status;
  const previousStatus = delivery.status;
  if (previousStatus === internalStatus) {
    const doc = await Delivery.findById(id).populate('client', 'name code').populate('products.product', 'name code').lean();
    return toContractDelivery(doc);
  }

  if (internalStatus === 'delivered') {
    if (!delivery.products || delivery.products.length === 0) {
      throw new BadRequestError('Cannot mark as delivered: no products on this delivery');
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const line of delivery.products) {
        const result = await Product.findOneAndUpdate(
          { _id: line.product, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
          { session, new: true }
        );
        if (!result) {
          throw new BadRequestError(`Insufficient stock for product ${line.product}`);
        }
      }
      delivery.status = internalStatus;
      delivery.completedAt = options.completedAt || new Date();
      delivery.deliveryDate = options.deliveryDate || delivery.completedAt;
      if (options.proofPhoto !== undefined) delivery.proofPhoto = options.proofPhoto;
      await delivery.save({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    const allowed = ['pending', 'in_progress', 'cancelled'];
    if (!allowed.includes(internalStatus)) throw new BadRequestError('Invalid status');
    delivery.status = internalStatus;
    if (internalStatus === 'cancelled' && !delivery.completedAt) {
      delivery.completedAt = new Date();
    }
    await delivery.save();
  }
  const doc = await Delivery.findById(id)
    .populate('client', 'name code')
    .populate('circuit', 'name')
    .populate('assignedTo', 'firstName lastName')
    .populate('products.product', 'name code unit')
    .lean();
  return toContractDelivery(doc);
}

async function getDeliveryById(id) {
  const delivery = await Delivery.findById(id)
    .populate('client', 'name code address totalDebt')
    .populate('circuit', 'name')
    .populate('assignedTo', 'firstName lastName email')
    .populate('products.product', 'name code unit price')
    .lean();
  if (!delivery) throw new NotFoundError('Delivery not found');
  return toContractDelivery(delivery);
}

async function getDeliveriesByDate(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const items = await Delivery.find({
    plannedDate: { $gte: start, $lt: end },
  })
    .populate('client', 'name code')
    .populate('assignedTo', 'firstName lastName')
    .sort({ plannedDate: 1 })
    .lean();
  return items.map(toContractDelivery);
}

async function getDeliveriesByClient(clientId) {
  const items = await Delivery.find({ client: clientId })
    .populate('client', 'name')
    .populate('circuit', 'name')
    .populate('assignedTo', 'firstName lastName')
    .populate('products.product', 'name code unit')
    .sort({ plannedDate: -1 })
    .lean();
  return items.map(toContractDelivery);
}

async function getPaginated(query = {}) {
  const { page = 1, limit = 20, client, circuit, status, fromDate, toDate, date } = query;
  const filter = {};
  if (client) filter.client = client;
  if (circuit) filter.circuit = circuit;
  if (status) filter.status = status;
  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.plannedDate = { $gte: start, $lt: end };
  } else if (fromDate || toDate) {
    filter.plannedDate = {};
    if (fromDate) filter.plannedDate.$gte = new Date(fromDate);
    if (toDate) filter.plannedDate.$lte = new Date(toDate);
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    Delivery.find(filter)
      .populate('client', 'name code')
      .populate('circuit', 'name')
      .populate('assignedTo', 'firstName lastName')
      .sort({ plannedDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Delivery.countDocuments(filter),
  ]);
  return {
    results: items.map(toContractDelivery),
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

async function updateDelivery(id, data) {
  const delivery = await Delivery.findById(id);
  if (!delivery) throw new NotFoundError('Delivery not found');
  if (delivery.status === 'delivered') throw new BadRequestError('Cannot update a delivered delivery');
  const allowed = ['circuit', 'assignedTo', 'plannedDate', 'proofPhoto', 'notes'];
  allowed.forEach((key) => { if (data[key] !== undefined) delivery[key] = data[key]; });
  if (data.products && Array.isArray(data.products)) {
    const lines = await resolveProductLines(data.products);
    delivery.products = lines;
    delivery.totalAmount = computeTotalAmount(lines);
  }
  await delivery.save();
  const doc = await Delivery.findById(id)
    .populate('client', 'name code')
    .populate('circuit', 'name')
    .populate('assignedTo', 'firstName lastName')
    .populate('products.product', 'name code unit')
    .lean();
  return toContractDelivery(doc);
}

async function deleteDelivery(id) {
  const delivery = await Delivery.findById(id);
  if (!delivery) throw new NotFoundError('Delivery not found');
  if (delivery.status === 'delivered') throw new BadRequestError('Cannot delete a delivered delivery; consider cancelling before delivery.');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await Client.updateOne(
      { _id: delivery.client },
      { $inc: { totalDebt: -delivery.totalAmount } },
      { session }
    );
    await Delivery.findByIdAndDelete(id, { session });
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
  getDeliveryById,
  getPaginated,
  getDeliveriesByDate,
  getDeliveriesByClient,
  createDelivery,
  updateDelivery,
  updateStatus,
  deleteDelivery,
};
