/**
 * User controller - HTTP layer only; delegates to user.service.
 */
const userService = require('./user.service');
const { successResponse } = require('../../utils/response');

async function getMe(req, res, next) {
  try {
    const user = await userService.getById(req.user._id);
    return successResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.getById(req.params.id);
    return successResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await userService.getPaginated(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    return successResponse(res, 201, user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateById(req.params.id, req.body);
    return successResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await userService.deleteById(req.params.id);
    return successResponse(res, 200, { message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, getById, list, create, update, remove };
