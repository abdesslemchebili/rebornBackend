/**
 * Payment model. On create: decreases client.totalDebt (validated against debt).
 */
const mongoose = require('mongoose');

const METHOD = ['cash', 'check', 'transfer', 'card', 'other'];
const STATUS = ['pending', 'completed', 'cancelled'];

const paymentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'TND', trim: true },
    method: { type: String, enum: METHOD, default: 'cash' },
    status: { type: String, enum: STATUS, default: 'completed' },
    paidAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ client: 1 });
paymentSchema.index({ delivery: 1 });
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ receivedBy: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.METHOD = METHOD;
module.exports.STATUS = STATUS;
