/**
 * Delivery controller – HTTP only; delegates to delivery.service.
 */
const deliveryService = require('./delivery.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params.id);
    return successResponse(res, 200, delivery);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await deliveryService.getPaginated(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function byDate(req, res, next) {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const items = await deliveryService.getDeliveriesByDate(date);
    return successResponse(res, 200, items);
  } catch (err) {
    next(err);
  }
}

async function byClient(req, res, next) {
  try {
    const clientId = req.params.clientId;
    const items = await deliveryService.getDeliveriesByClient(clientId);
    return successResponse(res, 200, items);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const delivery = await deliveryService.createDelivery(payload);
    return successResponse(res, 201, delivery);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const delivery = await deliveryService.updateDelivery(req.params.id, req.body);
    return successResponse(res, 200, delivery);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, proofPhoto, deliveryDate } = req.body;
    const delivery = await deliveryService.updateStatus(req.params.id, status, { proofPhoto, deliveryDate });
    return successResponse(res, 200, delivery);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await deliveryService.deleteDelivery(req.params.id);
    return successResponse(res, 200, { message: 'Delivery deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getById,
  list,
  byDate,
  byClient,
  create,
  update,
  updateStatus,
  remove,
};
