const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId');

const stopSchema = Joi.object({
  clientId: objectId.required(),
  order: Joi.number().integer().min(0).required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
}).unknown(false);

const createSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().allow(''),
  zone: Joi.string().trim().allow(''),
  region: Joi.string().trim().allow(''),
  clientIds: Joi.array().items(objectId).default([]),
  stops: Joi.array().items(stopSchema).default([]),
  estimatedDuration: Joi.number().min(0).default(0),
  assignedTo: objectId.allow('', null),
  description: Joi.string().trim().allow(''),
  isActive: Joi.boolean().default(true),
}).unknown(false);

const updateSchema = Joi.object({
  name: Joi.string().trim(),
  code: Joi.string().trim().allow(''),
  zone: Joi.string().trim().allow(''),
  region: Joi.string().trim().allow(''),
  clientIds: Joi.array().items(objectId),
  stops: Joi.array().items(stopSchema),
  estimatedDuration: Joi.number().min(0),
  assignedTo: objectId.allow('', null),
  description: Joi.string().trim().allow(''),
  isActive: Joi.boolean(),
}).min(1).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow(''),
  zone: Joi.string().trim().allow(''),
  isActive: Joi.boolean(),
}).unknown(false);

module.exports = { createSchema, updateSchema, listQuerySchema };
