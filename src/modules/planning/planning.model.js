/**
 * Planning model. Contract: circuitId, title, date, time, status (scheduled|completed), stops: [{ clientId, order, action }].
 */
const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    order: { type: Number, required: true, min: 0 },
    action: { type: String, enum: ['delivery', 'payment', 'task'], default: 'task' },
  },
  { _id: false }
);

const planningSchema = new mongoose.Schema(
  {
    circuitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circuit' },
    title: { type: String, trim: true },
    date: { type: Date, required: true },
    time: { type: String, trim: true },
    status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' },
    stops: { type: [stopSchema], default: [] },
    commercial: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

planningSchema.index({ date: 1 });
planningSchema.index({ commercial: 1 });
planningSchema.index({ circuitId: 1 });
planningSchema.index({ date: 1, commercial: 1 });

module.exports = mongoose.model('Planning', planningSchema);
