/**
 * Product controller – HTTP only; delegates to product.service.
 */
const productService = require('./product.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, 200, product);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await productService.getProducts(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, 201, product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, 200, product);
  } catch (err) {
    next(err);
  }
}

async function updateStock(req, res, next) {
  try {
    const product = await productService.updateStock(req.params.id, req.body.quantity);
    return successResponse(res, 200, product);
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const product = await productService.deactivateProduct(req.params.id);
    return successResponse(res, 200, product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    return successResponse(res, 200, { message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, create, update, updateStock, deactivate, remove };
