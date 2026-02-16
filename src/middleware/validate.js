/**
 * Validation middleware using Joi.
 * Validates req.body, req.query, or req.params and passes to next or throws.
 */
const { ValidationError } = require('../utils/errors');

/**
 * @param {import('joi').Schema} schema - Joi schema
 * @param {'body'|'query'|'params'} source - where to read data from
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new ValidationError(error.message, error.details));
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate };
