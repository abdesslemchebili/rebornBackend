/**
 * Payment controller – HTTP only; delegates to payment.service.
 */
const paymentService = require('./payment.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    return successResponse(res, 200, payment);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await paymentService.getPaginated(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function byClient(req, res, next) {
  try {
    const items = await paymentService.getPaymentsByClient(req.params.clientId);
    return successResponse(res, 200, items);
  } catch (err) {
    next(err);
  }
}

async function byDateRange(req, res, next) {
  try {
    const { fromDate, toDate } = req.query;
    const items = await paymentService.getPaymentsByDateRange(fromDate, toDate);
    return successResponse(res, 200, items);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const payment = await paymentService.createPayment(payload);
    return successResponse(res, 201, payment);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    return successResponse(res, 200, payment);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await paymentService.deletePayment(req.params.id);
    return successResponse(res, 200, { message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, byClient, byDateRange, create, update, remove };
