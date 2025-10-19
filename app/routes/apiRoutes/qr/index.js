// app/routes/apiRoutes/qr/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const getByCode = require('./getByCode');

// Define routes
router.get('/:completion_code', getByCode);

module.exports = router;
