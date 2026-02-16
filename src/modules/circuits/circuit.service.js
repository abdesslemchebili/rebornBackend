/**
 * Circuit service. Contract: id, name, region, clientIds[], stops: [{ clientId, order, lat, lng }], estimatedDuration.
 */
const Circuit = require('./circuit.model');
const Client = require('../clients/client.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

function toContractCircuit(doc) {
  if (!doc) return null;
  const clientIds = (doc.clientIds || []).map((c) => (c && c._id ? c._id.toString() : c.toString()));
  const stops = (doc.stops || []).map((s) => ({
    clientId: (s.clientId?._id || s.clientId || '').toString(),
    order: s.order ?? 0,
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
  }));
  return {
    id: (doc._id || doc.id || '').toString(),
    name: doc.name ?? '',
    region: doc.region ?? doc.zone ?? '',
    clientIds,
    stops,
    estimatedDuration: doc.estimatedDuration ?? 0,
  };
}

async function getCircuitById(id) {
  const circuit = await Circuit.findById(id).populate('assignedTo', 'firstName lastName email').lean();
  if (!circuit) {
    const err = new NotFoundError('Circuit not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return toContractCircuit(circuit);
}

async function getCircuits(query = {}) {
  const { page = 1, limit = 20, search, isActive, zone } = query;
  const filter = {};
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (zone !== undefined && zone !== '') filter.zone = zone;
  if (search && search.trim()) {
    const term = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: term },
      { code: term },
      { zone: term },
      { region: term },
    ];
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    Circuit.find(filter).populate('assignedTo', 'firstName lastName').sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    Circuit.countDocuments(filter),
  ]);
  return {
    results: items.map(toContractCircuit),
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

async function getClientsByCircuit(circuitId) {
  const circuit = await Circuit.findById(circuitId).lean();
  if (!circuit) {
    const err = new NotFoundError('Circuit not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const clients = await Client.find({ circuit: circuitId }).sort({ name: 1 }).lean();
  return clients;
}

async function createCircuit(data) {
  if (data.code) {
    const existing = await Circuit.findOne({ code: data.code });
    if (existing) throw new ConflictError('Circuit with this code already exists');
  }
  const allowed = ['name', 'code', 'zone', 'region', 'clientIds', 'stops', 'estimatedDuration', 'assignedTo', 'description', 'isActive'];
  const payload = {};
  allowed.forEach((k) => { if (data[k] !== undefined) payload[k] = data[k]; });
  if (payload.stops && Array.isArray(payload.stops)) {
    payload.stops = payload.stops.map((s) => ({
      clientId: s.clientId,
      order: s.order ?? 0,
      lat: Number(s.lat) || 0,
      lng: Number(s.lng) || 0,
    }));
  }
  const circuit = await Circuit.create(payload);
  return toContractCircuit(await Circuit.findById(circuit._id).lean());
}

async function updateCircuit(id, data) {
  const circuit = await Circuit.findById(id);
  if (!circuit) {
    const err = new NotFoundError('Circuit not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const allowed = ['name', 'code', 'zone', 'region', 'clientIds', 'stops', 'estimatedDuration', 'assignedTo', 'description', 'isActive'];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      if (key === 'stops' && Array.isArray(data[key])) {
        circuit[key] = data[key].map((s) => ({
          clientId: s.clientId,
          order: s.order ?? 0,
          lat: Number(s.lat) || 0,
          lng: Number(s.lng) || 0,
        }));
      } else {
        circuit[key] = data[key];
      }
    }
  });
  await circuit.save();
  return toContractCircuit(await Circuit.findById(id).lean());
}

async function deleteCircuit(id) {
  const circuit = await Circuit.findByIdAndDelete(id);
  if (!circuit) {
    const err = new NotFoundError('Circuit not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { deleted: true };
}

module.exports = {
  getCircuitById,
  getCircuits,
  getClientsByCircuit,
  createCircuit,
  updateCircuit,
  deleteCircuit,
};
