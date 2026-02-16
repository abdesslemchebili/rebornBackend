/**
 * Product service – business logic only. ADMIN create/delete; COMMERCIAL/DELIVERY read.
 */
const Product = require('./product.model');
const { NotFoundError, ConflictError, BadRequestError } = require('../../utils/errors');

function toContractProduct(doc) {
  if (!doc) return null;
  return {
    id: (doc._id || doc.id || '').toString(),
    name: doc.name ?? '',
    sku: doc.sku ?? doc.code ?? '',
    category: doc.category ?? '',
    price: doc.price ?? 0,
    unit: doc.unit ?? 'unit',
    stock: doc.stock ?? 0,
    picture: doc.picture ?? '',
  };
}

async function getProductById(id) {
  const product = await Product.findById(id).lean();
  if (!product) throw new NotFoundError('Product not found');
  return toContractProduct(product);
}

async function getProducts(query = {}) {
  const { page = 1, limit = 20, search, active, category } = query;
  const filter = {};
  if (category !== undefined && category !== '') filter.category = category;
  if (typeof active === 'boolean') filter.active = active;
  if (search && search.trim()) {
    const term = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: term }, { code: term }, { description: term }];
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const limitNum = Math.min(100, Math.max(1, limit));
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);
  return {
    results: items.map(toContractProduct),
    page: Math.max(1, page),
    limit: limitNum,
    total,
  };
}

async function createProduct(data) {
  if (data.code) {
    const existing = await Product.findOne({ code: data.code });
    if (existing) throw new ConflictError('Product with this code already exists');
  }
  const allowed = ['name', 'code', 'sku', 'category', 'description', 'unit', 'price', 'stock', 'picture', 'active'];
  const payload = {};
  allowed.forEach((k) => { if (data[k] !== undefined) payload[k] = data[k]; });
  if (payload.sku === undefined && payload.code !== undefined) payload.sku = payload.code;
  const product = await Product.create(payload);
  return toContractProduct(product.toObject());
}

async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  const allowed = ['name', 'code', 'sku', 'category', 'description', 'unit', 'price', 'stock', 'picture', 'active'];
  allowed.forEach((key) => { if (data[key] !== undefined) product[key] = data[key]; });
  await product.save();
  return toContractProduct(product.toObject());
}

async function updateStock(id, quantity) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  const newStock = Number(quantity);
  if (newStock < 0) throw new BadRequestError('Stock cannot be negative');
  product.stock = newStock;
  await product.save();
  return toContractProduct(product.toObject());
}

async function deactivateProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  product.active = false;
  await product.save();
  return toContractProduct(product.toObject());
}

async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new NotFoundError('Product not found');
  return { deleted: true };
}

module.exports = {
  getProductById,
  getProducts,
  createProduct,
  updateProduct,
  updateStock,
  deactivateProduct,
  deleteProduct,
};
