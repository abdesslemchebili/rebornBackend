/**
 * Circuit controller – HTTP only; delegates to circuit.service.
 */
const circuitService = require('./circuit.service');
const { successResponse } = require('../../utils/response');

async function getById(req, res, next) {
  try {
    const circuit = await circuitService.getCircuitById(req.params.id);
    return successResponse(res, 200, circuit);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await circuitService.getCircuits(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
}

async function getClients(req, res, next) {
  try {
    const clients = await circuitService.getClientsByCircuit(req.params.id);
    return successResponse(res, 200, clients);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const circuit = await circuitService.createCircuit(req.body);
    return successResponse(res, 201, circuit);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const circuit = await circuitService.updateCircuit(req.params.id, req.body);
    return successResponse(res, 200, circuit);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await circuitService.deleteCircuit(req.params.id);
    return successResponse(res, 200, { message: 'Circuit deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, getClients, create, update, remove };
