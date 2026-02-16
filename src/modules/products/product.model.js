/**
 * Product model. category and active indexed for filtering.
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, sparse: true },
    sku: { type: String, trim: true, sparse: true },
    category: { type: String, trim: true, default: '' },
    description: { type: String, trim: true },
    unit: { type: String, trim: true, default: 'unit' },
    price: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    picture: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ active: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.model('Product', productSchema);
