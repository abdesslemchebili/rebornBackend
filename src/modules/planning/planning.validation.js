const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId');

const stopSchema = Joi.object({
  clientId: objectId.required(),
  order: Joi.number().integer().min(0).required(),
  action: Joi.string().valid('delivery', 'payment', 'task').default('task'),
}).unknown(false);

const createSchema = Joi.object({
  circuitId: objectId.allow('', null),
  title: Joi.string().trim().allow(''),
  date: Joi.date().required(),
  time: Joi.string().trim().allow(''),
  status: Joi.string().valid('scheduled', 'completed').default('scheduled'),
  stops: Joi.array().items(stopSchema).default([]),
  commercial: objectId.allow('', null),
  clients: Joi.array().items(objectId).default([]),
  notes: Joi.string().trim().allow(''),
}).unknown(false);

const updateSchema = Joi.object({
  circuitId: objectId.allow('', null),
  title: Joi.string().trim().allow(''),
  date: Joi.date(),
  time: Joi.string().trim().allow(''),
  status: Joi.string().valid('scheduled', 'completed'),
  stops: Joi.array().items(stopSchema),
  commercial: objectId.allow('', null),
  clients: Joi.array().items(objectId),
  notes: Joi.string().trim().allow(''),
}).min(1).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  commercial: objectId,
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
}).unknown(false);

const byDateQuerySchema = Joi.object({
  date: Joi.date().required(),
}).unknown(false);

module.exports = { createSchema, updateSchema, listQuerySchema, byDateQuerySchema };
