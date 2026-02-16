/**
 * Delivery model. Products array with quantity/unitPrice; totalAmount auto-calculated on create.
 */
const mongoose = require('mongoose');

const STATUS = ['pending', 'in_progress', 'delivered', 'cancelled'];
const STATUS_CONTRACT = ['pending', 'in_transit', 'completed'];

const deliveryLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    circuit: { type: mongoose.Schema.Types.ObjectId, ref: 'Circuit' },
    products: {
      type: [deliveryLineSchema],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.every((l) => l.product && l.quantity >= 0 && l.unitPrice >= 0);
        },
        message: 'Each line must have product, quantity and unitPrice',
      },
    },
    totalAmount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: STATUS, default: 'pending' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    plannedDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    proofPhoto: { type: String, trim: true },
    completedAt: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

deliverySchema.index({ client: 1 });
deliverySchema.index({ circuit: 1 });
deliverySchema.index({ plannedDate: 1 });
deliverySchema.index({ deliveryDate: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ assignedTo: 1 });
deliverySchema.index({ plannedDate: 1, status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
module.exports.STATUS = STATUS;
module.exports.STATUS_CONTRACT = STATUS_CONTRACT;
