// app/routes/publicRoutes/index.js
const express = require('express');
const router = express.Router();

// Import public route handlers
const qrRoutes = require('./qr');

/**
 * @swagger
 * tags:
 *   name: Public - QR
 *   description: Publicly accessible endpoints for retrieving QR code information.
 */

// Define public routes
router.use('/qr', qrRoutes);

module.exports = router;
