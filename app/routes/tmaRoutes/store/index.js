const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const listAvailableStoreItems = require('./listAvailable');

// This route corresponds to GET /telegram/store/available
router.get('/available', authenticateTmaJWT, listAvailableStoreItems);

module.exports = router;
