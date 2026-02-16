const Joi = require('joi');
const { ALL_ROLES } = require('../../constants/roles');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).unknown(false);

const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional(),
}).unknown(true);

/** Used for POST /auth/register (ADMIN only). */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().trim().allow(''),
  lastName: Joi.string().trim().allow(''),
  role: Joi.string().valid(...ALL_ROLES).default('COMMERCIAL'),
  isActive: Joi.boolean().default(true),
}).unknown(false);

module.exports = { loginSchema, refreshSchema, registerSchema };
