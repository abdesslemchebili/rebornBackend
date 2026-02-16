/**
 * User service - business logic for users.
 * No HTTP or request handling here.
 */
const User = require('./user.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function getById(id) {
  const user = await User.findById(id).select('-password').lean();
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function getPaginated(query = {}) {
  const { page = 1, limit = 20, role, isActive, search } = query;
  const filter = {};
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (search && search.trim()) {
    filter.$or = [
      { email: new RegExp(search.trim(), 'i') },
      { firstName: new RegExp(search.trim(), 'i') },
      { lastName: new RegExp(search.trim(), 'i') },
    ];
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);
  return { items, total, page: Math.max(1, page), limit: limitNum, totalPages: Math.ceil(total / limitNum) };
}

async function create(data) {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new ConflictError('User with this email already exists');
  const user = await User.create(data);
  return user.toJSON ? user.toJSON() : { ...user.toObject(), password: undefined };
}

async function updateById(id, data) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found');
  const allowed = ['firstName', 'lastName', 'role', 'isActive'];
  allowed.forEach((key) => { if (data[key] !== undefined) user[key] = data[key]; });
  if (data.password !== undefined && data.password) user.password = data.password;
  await user.save();
  return user.toJSON ? user.toJSON() : { ...user.toObject(), password: undefined };
}

async function deleteById(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new NotFoundError('User not found');
  return { deleted: true };
}

module.exports = { getById, getPaginated, create, updateById, deleteById };
