const Joi = require('joi');
const mongoose = require('mongoose');
const { STATUS, STATUS_CONTRACT } = require('./delivery.model');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId');

const deliveryLineSchema = Joi.object({
  product: objectId.optional(),
  productId: objectId.optional(),
  quantity: Joi.number().min(0).optional(),
  qty: Joi.number().min(0).optional(),
  unitPrice: Joi.number().min(0).optional(),
}).unknown(false);

const deliveryLineContractSchema = Joi.object({
  productId: objectId.required(),
  qty: Joi.number().min(0).required(),
}).unknown(false);

const createSchema = Joi.object({
  client: objectId.optional(),
  clientId: objectId.optional(),
  clientName: Joi.string().trim().allow(''),
  circuit: objectId.allow('', null),
  products: Joi.array().items(deliveryLineSchema).min(0).default([]),
  items: Joi.array().items(deliveryLineContractSchema).min(0).default([]),
  status: Joi.string().valid(...STATUS, ...STATUS_CONTRACT).default('pending'),
  assignedTo: objectId.allow('', null),
  plannedDate: Joi.date().optional(),
  date: Joi.date().optional(),
  proofPhoto: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
  paymentType: Joi.string().valid('CASH', 'CREDIT').default('CASH'),
}).unknown(false);

const updateSchema = Joi.object({
  circuit: objectId.allow('', null),
  assignedTo: objectId.allow('', null),
  plannedDate: Joi.date(),
  proofPhoto: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
  products: Joi.array().items(deliveryLineSchema).min(0),
}).min(1).unknown(false);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...STATUS, ...STATUS_CONTRACT).required(),
  proofPhoto: Joi.string().trim().allow(''),
  deliveryDate: Joi.date().allow(null),
}).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  client: objectId,
  clientId: objectId,
  circuit: objectId,
  status: Joi.string().valid(...STATUS, ...STATUS_CONTRACT),
  date: Joi.date().iso(),
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
}).unknown(false);

const byDateQuerySchema = Joi.object({
  date: Joi.date().required(),
}).unknown(false);

const byClientParamsSchema = Joi.object({
  clientId: Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId').required(),
}).unknown(false);

module.exports = {
  createSchema,
  updateSchema,
  updateStatusSchema,
  listQuerySchema,
  byDateQuerySchema,
  byClientParamsSchema,
};
