/**
 * Work Session validation schemas (Joi).
 */
const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((v) => mongoose.Types.ObjectId.isValid(v), 'objectId');

const startSchema = Joi.object({
  startTime: Joi.date().iso().optional(),
}).unknown(false);

const endSchema = Joi.object({
  sessionId: Joi.string().trim().optional(),
  endTime: Joi.date().iso().optional(),
}).unknown(false);

const addExpenseSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  label: Joi.string().trim().min(1).required(),
}).unknown(false);

const historyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
}).unknown(false);

const sessionIdParamSchema = Joi.object({
  id: objectId.required(),
}).unknown(true);

module.exports = {
  startSchema,
  endSchema,
  addExpenseSchema,
  historyQuerySchema,
  sessionIdParamSchema,
};
