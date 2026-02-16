/**
 * Planning service. Contract: id, circuitId, title, date, time, status, stops: [{ clientId, order, action }].
 */
const Planning = require('./planning.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

function toStartOfDay(d) {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function toContractEvent(doc) {
  if (!doc) return null;
  const dateStr = doc.date ? (doc.date instanceof Date ? doc.date.toISOString().slice(0, 10) : String(doc.date).slice(0, 10)) : '';
  const stops = (doc.stops || []).map((s) => ({
    clientId: (s.clientId?._id || s.clientId || '').toString(),
    order: s.order ?? 0,
    action: (s.action || 'task').toLowerCase(),
  }));
  return {
    id: (doc._id || doc.id || '').toString(),
    circuitId: (doc.circuitId?._id || doc.circuitId || '').toString(),
    title: doc.title ?? '',
    date: dateStr,
    time: doc.time ?? null,
    status: (doc.status || 'scheduled').toLowerCase(),
    stops,
  };
}

async function getPlanningById(id) {
  const plan = await Planning.findById(id)
    .populate('commercial', 'firstName lastName email')
    .populate('circuitId', 'name')
    .populate('clients', 'name code address')
    .populate('stops.clientId', 'name')
    .lean();
  if (!plan) throw new NotFoundError('Planning not found');
  return toContractEvent(plan);
}

async function getPlanningByDate(date) {
  const start = toStartOfDay(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const items = await Planning.find({
    date: { $gte: start, $lt: end },
  })
    .populate('circuitId', 'name')
    .populate('stops.clientId', 'name')
    .sort({ date: 1 })
    .lean();
  return items.map(toContractEvent);
}

async function createPlanning(data) {
  const date = data.date ? toStartOfDay(data.date) : toStartOfDay(new Date());
  if (data.commercial) {
    const existing = await Planning.findOne({ date, commercial: data.commercial });
    if (existing) throw new ConflictError('Planning already exists for this commercial and date');
  }
  const payload = {
    circuitId: data.circuitId,
    title: data.title,
    date,
    time: data.time,
    status: data.status || 'scheduled',
    stops: (data.stops || []).map((s) => ({ clientId: s.clientId, order: s.order ?? 0, action: (s.action || 'task').toLowerCase() })),
    commercial: data.commercial,
    clients: data.clients || [],
    notes: data.notes,
    createdBy: data.createdBy,
  };
  const plan = await Planning.create(payload);
  return toContractEvent(await Planning.findById(plan._id).populate('stops.clientId', 'name').lean());
}

async function updatePlanning(id, data) {
  const plan = await Planning.findById(id);
  if (!plan) throw new NotFoundError('Planning not found');
  const allowed = ['circuitId', 'title', 'date', 'time', 'status', 'stops', 'commercial', 'clients', 'notes'];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      if (key === 'date') plan[key] = toStartOfDay(data[key]);
      else if (key === 'stops') plan[key] = (data[key] || []).map((s) => ({ clientId: s.clientId, order: s.order ?? 0, action: (s.action || 'task').toLowerCase() }));
      else plan[key] = data[key];
    }
  });
  await plan.save();
  return toContractEvent(await Planning.findById(id).populate('stops.clientId', 'name').lean());
}

async function getPaginated(query = {}) {
  const { page = 1, limit = 20, commercial, fromDate, toDate } = query;
  const filter = {};
  if (commercial) filter.commercial = commercial;
  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = toStartOfDay(fromDate);
    if (toDate) {
      const end = toStartOfDay(toDate);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.date.$lt = end;
    }
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    Planning.find(filter)
      .populate('circuitId', 'name')
      .populate('stops.clientId', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Planning.countDocuments(filter),
  ]);
  return { results: items.map(toContractEvent), page: Math.max(1, page), limit: limitNum, total };
}

async function deletePlanning(id) {
  const plan = await Planning.findByIdAndDelete(id);
  if (!plan) throw new NotFoundError('Planning not found');
  return { deleted: true };
}

module.exports = {
  getPlanningById,
  getPlanningByDate,
  getPaginated,
  createPlanning,
  updatePlanning,
  deletePlanning,
};
