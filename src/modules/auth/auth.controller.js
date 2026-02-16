const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');
const env = require('../../config/env');

const isProduction = env.nodeEnv === 'production';
const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
  path: '/',
};
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 70 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth/refresh',
};

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie('accessToken', result.token, ACCESS_COOKIE_OPTS);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTS);
    return res.status(200).json({
      success: true,
      user: result.user,
    });
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
    const refreshToken = req.cookies.refreshToken;
    const result = await authService.refresh(refreshToken);
    res.cookie('accessToken', result.token, ACCESS_COOKIE_OPTS);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTS);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
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
