const Joi = require('joi');
const mongoose = require('mongoose');
const { METHOD, STATUS } = require('./payment.model');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId');

const createSchema = Joi.object({
  client: objectId.optional(),
  clientId: objectId.optional(),
  clientName: Joi.string().trim().allow(''),
  delivery: objectId.allow('', null),
  amount: Joi.number().min(0.01).required(),
  currency: Joi.string().trim().default('TND'),
  method: Joi.string().valid(...METHOD).default('cash'),
  status: Joi.string().valid(...STATUS).default('completed'),
  date: Joi.date().optional(),
  paidAt: Joi.date().optional(),
  receivedBy: objectId.allow('', null),
  notes: Joi.string().trim().allow(''),
}).unknown(false);

const updateSchema = Joi.object({
  delivery: objectId.allow('', null),
  currency: Joi.string().trim(),
  method: Joi.string().valid(...METHOD),
  status: Joi.string().valid(...STATUS),
  paidAt: Joi.date(),
  notes: Joi.string().trim().allow(''),
}).min(1).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  client: objectId,
  status: Joi.string().valid(...STATUS),
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
}).unknown(false);

const dateRangeQuerySchema = Joi.object({
  fromDate: Joi.date().required(),
  toDate: Joi.date().required(),
}).unknown(false);

const byClientParamsSchema = Joi.object({
  clientId: Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId').required(),
}).unknown(false);

module.exports = {
  createSchema,
  updateSchema,
  listQuerySchema,
  dateRangeQuerySchema,
  byClientParamsSchema,
};
