/**
 * Client controller – HTTP only; delegates to client.service.
 */
const clientService = require('./client.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const opts = { userId: req.user?._id?.toString(), isAdmin: req.user?.role === 'ADMIN' };
    const client = await clientService.getClientById(req.params.id, opts);
    return successResponse(res, 200, client);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const opts = { userId: req.user?._id?.toString(), isAdmin: req.user?.role === 'ADMIN' };
    const result = await clientService.getClients(req.query, opts);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function near(req, res, next) {
  try {
    const { lng, lat, maxDistance } = req.query;
    const clients = await clientService.getNear(lng, lat, maxDistance ? Number(maxDistance) : 50);
    return successResponse(res, 200, clients);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = { ...req.body, createdBy: req.user?._id };
    const client = await clientService.createClient(payload);
    return successResponse(res, 201, client);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const opts = { userId: req.user?._id?.toString(), isAdmin: req.user?.role === 'ADMIN' };
    const client = await clientService.updateClient(req.params.id, req.body, opts);
    return successResponse(res, 200, client);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const opts = { userId: req.user?._id?.toString(), isAdmin: req.user?.role === 'ADMIN' };
    await clientService.deleteClient(req.params.id, opts);
    return successResponse(res, 200, { message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, near, create, update, remove };
