/**
 * Planning controller – HTTP only; delegates to planning.service.
 */
const planningService = require('./planning.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const plan = await planningService.getPlanningById(req.params.id);
    return successResponse(res, 200, plan);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await planningService.getPaginated(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function byDate(req, res, next) {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const items = await planningService.getPlanningByDate(date);
    return successResponse(res, 200, items);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const plan = await planningService.createPlanning(payload);
    return successResponse(res, 201, plan);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const plan = await planningService.updatePlanning(req.params.id, req.body);
    return successResponse(res, 200, plan);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await planningService.deletePlanning(req.params.id);
    return successResponse(res, 200, { message: 'Planning deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, byDate, create, update, remove };
