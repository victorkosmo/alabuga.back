// app/routes/apiRoutes/qr/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const getById = require('./getById');

// Define routes
router.get('/:id', getById);

module.exports = router;
