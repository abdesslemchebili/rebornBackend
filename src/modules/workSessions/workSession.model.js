/**
 * Work Session model. One active session per agent; lifecycle NOT_STARTED → ACTIVE → ENDED.
 */
const mongoose = require('mongoose');

const DELIVERY_TYPE = ['CASH', 'CREDIT'];
const PAYMENT_METHOD = ['CASH', 'TRANSFER', 'CHEQUE'];

const deliveryEntrySchema = new mongoose.Schema(
  {
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: DELIVERY_TYPE, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentEntrySchema = new mongoose.Schema(
  {
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHOD, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const expenseEntrySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const workSessionSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED'],
      required: true,
    },
    totals: {
      totalCashCollected: { type: Number, default: 0 },
      totalCreditCollected: { type: Number, default: 0 },
      totalCreditSales: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
    deliveries: { type: [deliveryEntrySchema], default: [] },
    payments: { type: [paymentEntrySchema], default: [] },
    expenses: { type: [expenseEntrySchema], default: [] },
    metadata: {
      device: { type: String, trim: true },
      version: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

workSessionSchema.index({ agent: 1, status: 1 });
workSessionSchema.index({ agent: 1, startTime: -1 });

module.exports = mongoose.model('WorkSession', workSessionSchema);
module.exports.DELIVERY_TYPE = DELIVERY_TYPE;
module.exports.PAYMENT_METHOD = PAYMENT_METHOD;
