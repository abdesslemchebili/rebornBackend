/**
 * Mock seed script. Creates admin user, sample clients, products, circuits.
 * Run: node scripts/seed.js (ensure MONGODB_URI is set)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Client = require('../src/modules/clients/client.model');
const Product = require('../src/modules/products/product.model');
const Circuit = require('../src/modules/circuits/circuit.model');
const { ROLES } = require('../src/constants/roles');
const { SEGMENTS } = require('../src/constants/segments');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reborn';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const existingAdmin = await User.findOne({ email: 'admin@reborn.tn' });
  if (existingAdmin) {
    console.log('Admin user already exists. Skipping user seed.');
  } else {
    await User.create({
      email: 'admin@reborn.tn',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'REBORN',
      role: ROLES.ADMIN,
      isActive: true,
    });
    console.log('Created admin@reborn.tn / Admin123!');
  }

  let circuitIds = {};
  if ((await Circuit.countDocuments()) === 0) {
    const circuits = await Circuit.insertMany([
      { name: 'Circuit Tunis North', code: 'TN', region: 'Tunis', isActive: true },
      { name: 'Circuit Sfax', code: 'SF', region: 'Sfax', isActive: true },
    ]);
    circuitIds = { tunis: circuits[0]._id, sfax: circuits[1]._id };
    console.log('Created 2 sample circuits.');
  } else {
    const circuits = await Circuit.find().lean();
    if (circuits.length) circuitIds = { tunis: circuits[0]._id, sfax: circuits[1]?._id || circuits[0]._id };
  }

  if ((await Client.countDocuments()) === 0) {
    await Client.insertMany([
      { name: 'Client Tunis Nord', shopName: 'Shop TN', code: 'CTN001', email: 'contact@client1.tn', phone: '+216 70 000 001', address: { city: 'Tunis', governorate: 'Tunis' }, segment: SEGMENTS.PREMIUM, circuit: circuitIds.tunis, isActive: true },
      { name: 'Client Sfax Sud', shopName: 'Shop SF', code: 'CSS001', email: 'info@client2.tn', phone: '+216 74 000 002', address: { city: 'Sfax', governorate: 'Sfax' }, segment: SEGMENTS.STANDARD, circuit: circuitIds.sfax, isActive: true },
      { name: 'Client Sousse', code: 'CSO001', phone: '+216 73 000 003', address: { city: 'Sousse', governorate: 'Sousse' }, segment: SEGMENTS.RETAIL, isActive: true },
    ]);
    console.log('Created 3 sample clients.');
  }

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      { name: 'Product A', code: 'PA001', category: 'Industrial', unit: 'unit', price: 100, stock: 50, active: true },
      { name: 'Product B', code: 'PB001', category: 'Industrial', unit: 'kg', price: 25.5, stock: 100, active: true },
      { name: 'Product C', code: 'PC001', category: 'Retail', unit: 'box', price: 50, stock: 30, active: true },
    ]);
    console.log('Created 3 sample products.');
  }

  await mongoose.disconnect();
  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
