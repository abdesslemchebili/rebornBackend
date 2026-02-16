/**
 * Client service – all business logic. No HTTP here.
 */
const Client = require('./client.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

const ALLOWED_SORT = ['name', 'shopName', 'createdAt', 'totalDebt', '-name', '-shopName', '-createdAt', '-totalDebt'];

function addressToString(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const parts = [addr.street, addr.city, addr.governorate, addr.postalCode].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Contract shape: id, name, type, address, phone, email, totalOrders, lastVisit, archived, latitude, longitude, matriculeFiscale, ownerName, ownerPicture, shopPicture. */
function toContractClient(doc) {
  if (!doc) return null;
  const coords = doc.geoLocation?.coordinates;
  return {
    id: (doc._id || doc.id || '').toString(),
    name: doc.name ?? '',
    type: doc.type ?? 'mechanic',
    address: addressToString(doc.address) ?? null,
    phone: doc.phone ?? null,
    email: doc.email ?? null,
    totalOrders: doc.totalOrders ?? 0,
    lastVisit: doc.lastVisit ? (doc.lastVisit instanceof Date ? doc.lastVisit.toISOString().slice(0, 10) : String(doc.lastVisit).slice(0, 10)) : null,
    archived: doc.archived ?? !doc.isActive,
    latitude: coords && coords[1] != null ? coords[1] : null,
    longitude: coords && coords[0] != null ? coords[0] : null,
    matriculeFiscale: doc.matriculeFiscale ?? null,
    ownerName: doc.ownerName ?? null,
    ownerPicture: doc.ownerPicture ?? null,
    shopPicture: doc.shopPicture ?? null,
  };
}

function buildListFilter(query, userId = null, isAdmin = false) {
  const { segment, circuit, search, q, type, archived, isActive } = query;
  const filter = {};
  if (userId && !isAdmin) filter.createdBy = userId;
  if (segment) filter.segment = segment;
  if (circuit) filter.circuit = circuit;
  if (type) filter.type = type;
  if (typeof archived === 'boolean') filter.archived = archived;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  const searchTerm = search?.trim() || q?.trim();
  if (searchTerm) {
    const term = new RegExp(searchTerm, 'i');
    filter.$or = [
      { name: term },
      { shopName: term },
      { code: term },
      { email: term },
      { phone: term },
      { address: term },
    ];
  }
  return filter;
}

function parseSort(sortStr) {
  if (!sortStr || !ALLOWED_SORT.includes(sortStr)) return { name: 1 };
  if (sortStr.startsWith('-')) return { [sortStr.slice(1)]: -1 };
  return { [sortStr]: 1 };
}

async function getClientById(id, options = {}) {
  const { userId, isAdmin } = options;
  const q = Client.findById(id).populate('circuit', 'name code');
  if (userId && !isAdmin) q.where('createdBy').equals(userId);
  const client = await q.lean();
  if (!client) throw new NotFoundError('Client not found');
  return toContractClient(client);
}

async function getClients(query = {}, options = {}) {
  const { page = 1, limit = 20, sort } = query;
  const { userId, isAdmin } = options;
  const filter = buildListFilter(query, userId, isAdmin);
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const sortObj = parseSort(sort);
  const [items, total] = await Promise.all([
    Client.find(filter).populate('circuit', 'name code').sort(sortObj).skip(skip).limit(limitNum).lean(),
    Client.countDocuments(filter),
  ]);
  return {
    results: items.map(toContractClient),
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

async function createClient(data) {
  if (data.code) {
    const existing = await Client.findOne({ code: data.code });
    if (existing) throw new ConflictError('Client with this code already exists');
  }
  const allowed = ['name', 'shopName', 'code', 'email', 'phone', 'address', 'geoLocation', 'type', 'segment', 'circuit', 'isActive', 'archived', 'totalOrders', 'lastVisit', 'matriculeFiscale', 'ownerName', 'ownerPicture', 'shopPicture', 'notes', 'createdBy'];
  const payload = {};
  allowed.forEach((k) => { if (data[k] !== undefined) payload[k] = data[k]; });
  if (payload.geoLocation?.coordinates?.length === 2) {
    payload.geoLocation = { type: 'Point', coordinates: payload.geoLocation.coordinates };
  } else {
    delete payload.geoLocation;
  }
  const client = await Client.create(payload);
  return toContractClient(await Client.findById(client._id).lean());
}

async function updateClient(id, data, options = {}) {
  const { userId, isAdmin } = options;
  const client = await Client.findById(id);
  if (!client) throw new NotFoundError('Client not found');
  if (userId && !isAdmin && String(client.createdBy) !== String(userId)) throw new NotFoundError('Client not found');
  const allowed = ['name', 'shopName', 'code', 'email', 'phone', 'address', 'geoLocation', 'type', 'segment', 'circuit', 'isActive', 'archived', 'totalOrders', 'lastVisit', 'matriculeFiscale', 'ownerName', 'ownerPicture', 'shopPicture', 'notes'];
  allowed.forEach((key) => { if (data[key] !== undefined) client[key] = data[key]; });
  if (data.geoLocation?.coordinates?.length === 2) {
    client.geoLocation = { type: 'Point', coordinates: data.geoLocation.coordinates };
  } else if (data.geoLocation === null || data.geoLocation === undefined && 'geoLocation' in data) {
    client.geoLocation = undefined;
  }
  await client.save();
  return toContractClient(await Client.findById(client._id).lean());
}

async function deleteClient(id, options = {}) {
  const { userId, isAdmin } = options;
  const client = await Client.findById(id);
  if (!client) throw new NotFoundError('Client not found');
  if (userId && !isAdmin && String(client.createdBy) !== String(userId)) throw new NotFoundError('Client not found');
  await Client.findByIdAndDelete(id);
  return { deleted: true };
}

async function getNear(longitude, latitude, maxDistanceKm = 50) {
  const items = await Client.find({
    isActive: true,
    archived: { $ne: true },
    geoLocation: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
  }).limit(100).lean();
  return items.map(toContractClient);
}

module.exports = {
  getClientById,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getNear,
};
