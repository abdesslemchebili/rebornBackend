const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return successResponse(res, 201, user);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.body.refreshToken || req.headers['x-refresh-token'];
    const result = await authService.refresh(token);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.body.refreshToken || req.headers['x-refresh-token'];
    await authService.logout(token);
    return successResponse(res, 200, {});
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await authService.getMe(req.user._id);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, refresh, logout, getMe };
