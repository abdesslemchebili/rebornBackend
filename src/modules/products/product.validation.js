const Joi = require('joi');

const createSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().allow(''),
  sku: Joi.string().trim().allow(''),
  category: Joi.string().trim().allow(''),
  description: Joi.string().trim().allow(''),
  unit: Joi.string().valid('L', 'unit', 'kg').default('unit'),
  price: Joi.number().min(0).default(0),
  stock: Joi.number().min(0).default(0),
  picture: Joi.string().trim().allow(''),
  active: Joi.boolean().default(true),
}).unknown(false);

const updateSchema = Joi.object({
  name: Joi.string().trim(),
  code: Joi.string().trim().allow(''),
  sku: Joi.string().trim().allow(''),
  category: Joi.string().trim().allow(''),
  description: Joi.string().trim().allow(''),
  unit: Joi.string().valid('L', 'unit', 'kg'),
  price: Joi.number().min(0),
  stock: Joi.number().min(0),
  picture: Joi.string().trim().allow(''),
  active: Joi.boolean(),
}).min(1).unknown(false);

const updateStockSchema = Joi.object({
  quantity: Joi.number().min(0).required(),
}).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow(''),
  category: Joi.string().trim().allow(''),
  active: Joi.boolean(),
}).unknown(false);

module.exports = { createSchema, updateSchema, updateStockSchema, listQuerySchema };
