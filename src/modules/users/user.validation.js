const Joi = require('joi');
const { ALL_ROLES } = require('../../constants/roles');

const createSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().trim().allow(''),
  lastName: Joi.string().trim().allow(''),
  role: Joi.string().valid(...ALL_ROLES).default('COMMERCIAL'),
  isActive: Joi.boolean().default(true),
}).unknown(false);

const updateSchema = Joi.object({
  firstName: Joi.string().trim().allow(''),
  lastName: Joi.string().trim().allow(''),
  role: Joi.string().valid(...ALL_ROLES),
  isActive: Joi.boolean(),
  password: Joi.string().min(6).allow(''),
}).min(1).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid(...ALL_ROLES),
  isActive: Joi.boolean(),
  search: Joi.string().trim().allow(''),
}).unknown(false);

module.exports = { createSchema, updateSchema, listQuerySchema };
