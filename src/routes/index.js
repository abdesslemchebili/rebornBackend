/**
 * Central route aggregator. Mounts all feature modules under API prefix.
 */
const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const clientRoutes = require('../modules/clients/client.routes');
const productRoutes = require('../modules/products/product.routes');
const deliveryRoutes = require('../modules/deliveries/delivery.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
const circuitRoutes = require('../modules/circuits/circuit.routes');
const planningRoutes = require('../modules/planning/planning.routes');
const workSessionRoutes = require('../modules/workSessions/workSession.routes');
const categoryRoutes = require('../modules/categories/category.routes');
const uploadRoutes = require('../modules/upload/upload.routes');
const env = require('../config/env');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/products', productRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/payments', paymentRoutes);
router.use('/circuits', circuitRoutes);
router.use('/planning', planningRoutes);
router.use('/work-sessions', workSessionRoutes);

// Health check (contract: success: true, data: {})
router.get('/health', (req, res) => res.json({ success: true, data: { timestamp: new Date().toISOString() } }));

module.exports = router;
