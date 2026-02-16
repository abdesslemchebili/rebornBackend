const Joi = require('joi');
const mongoose = require('mongoose');
const { ALL_SEGMENTS } = require('../../constants/segments');
const { CLIENT_TYPES } = require('./client.model');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v) || 'Invalid ID', 'objectId');

const geoLocationSchema = Joi.object({
  type: Joi.string().valid('Point').default('Point'),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
}).unknown(false);

const addressSchema = Joi.object({
  street: Joi.string().trim().allow(''),
  city: Joi.string().trim().allow(''),
  governorate: Joi.string().trim().allow(''),
  postalCode: Joi.string().trim().allow(''),
}).unknown(false);

const createSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string().valid(...CLIENT_TYPES).default('mechanic'),
  shopName: Joi.string().trim().allow(''),
  code: Joi.string().trim().allow(''),
  email: Joi.string().email().trim().allow(''),
  phone: Joi.string().trim().allow(''),
  address: addressSchema,
  geoLocation: geoLocationSchema.allow(null),
  segment: Joi.string().valid(...ALL_SEGMENTS).default('STANDARD'),
  circuit: objectId.allow('', null),
  isActive: Joi.boolean().default(true),
  archived: Joi.boolean().default(false),
  totalOrders: Joi.number().min(0),
  lastVisit: Joi.date().allow(null),
  matriculeFiscale: Joi.string().trim().allow(''),
  ownerName: Joi.string().trim().allow(''),
  ownerPicture: Joi.string().trim().allow(''),
  shopPicture: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
}).unknown(false);

const updateSchema = Joi.object({
  name: Joi.string().trim(),
  type: Joi.string().valid(...CLIENT_TYPES),
  shopName: Joi.string().trim().allow(''),
  code: Joi.string().trim().allow(''),
  email: Joi.string().email().trim().allow(''),
  phone: Joi.string().trim().allow(''),
  address: addressSchema,
  geoLocation: geoLocationSchema.allow(null),
  segment: Joi.string().valid(...ALL_SEGMENTS),
  circuit: objectId.allow('', null),
  isActive: Joi.boolean(),
  archived: Joi.boolean(),
  totalOrders: Joi.number().min(0),
  lastVisit: Joi.date().allow(null),
  matriculeFiscale: Joi.string().trim().allow(''),
  ownerName: Joi.string().trim().allow(''),
  ownerPicture: Joi.string().trim().allow(''),
  shopPicture: Joi.string().trim().allow(''),
  notes: Joi.string().trim().allow(''),
}).min(1).unknown(false);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('name', 'shopName', 'createdAt', 'totalDebt', '-name', '-shopName', '-createdAt', '-totalDebt').default('name'),
  type: Joi.string().valid(...CLIENT_TYPES),
  segment: Joi.string().valid(...ALL_SEGMENTS),
  circuit: objectId,
  search: Joi.string().trim().allow(''),
  q: Joi.string().trim().allow(''),
  archived: Joi.boolean(),
  isActive: Joi.boolean(),
}).unknown(false);

const nearQuerySchema = Joi.object({
  lng: Joi.number().required(),
  lat: Joi.number().required(),
  maxDistance: Joi.number().min(0).max(500).default(50),
}).unknown(false);

module.exports = { createSchema, updateSchema, listQuerySchema, nearQuerySchema };
