/**
 * Circuit model. Contract: name, region, clientIds[], stops: [{ clientId, order, lat, lng }], estimatedDuration.
 */
const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    order: { type: Number, required: true, min: 0 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const circuitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, sparse: true },
    zone: { type: String, trim: true },
    region: { type: String, trim: true },
    clientIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Client', default: [] },
    stops: { type: [stopSchema], default: [] },
    estimatedDuration: { type: Number, min: 0, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

circuitSchema.index({ name: 1 });
circuitSchema.index({ zone: 1 });
circuitSchema.index({ assignedTo: 1 });
circuitSchema.index({ isActive: 1 });

module.exports = mongoose.model('Circuit', circuitSchema);
