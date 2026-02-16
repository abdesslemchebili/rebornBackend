/**
 * Client model.
 * Contract: type (mechanic|car_wash|hardware), archived, totalOrders, lastVisit, latitude, longitude, matriculeFiscale, ownerName, ownerPicture, shopPicture.
 */
const mongoose = require('mongoose');
const { ALL_SEGMENTS } = require('../../constants/segments');

const CLIENT_TYPES = ['mechanic', 'car_wash', 'hardware'];

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shopName: { type: String, trim: true },
    code: { type: String, trim: true, sparse: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      governorate: String,
      postalCode: String,
    },
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },
    type: { type: String, enum: CLIENT_TYPES, default: 'mechanic' },
    segment: {
      type: String,
      enum: ALL_SEGMENTS,
      default: 'STANDARD',
    },
    circuit: { type: mongoose.Schema.Types.ObjectId, ref: 'Circuit' },
    totalDebt: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastVisit: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    matriculeFiscale: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    ownerPicture: { type: String, trim: true },
    shopPicture: { type: String, trim: true },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

clientSchema.index({ geoLocation: '2dsphere' });
clientSchema.index({ segment: 1 });
clientSchema.index({ type: 1 });
clientSchema.index({ circuit: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ archived: 1 });
clientSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Client', clientSchema);
module.exports.CLIENT_TYPES = CLIENT_TYPES;
