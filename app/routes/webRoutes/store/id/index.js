// app/routes/webRoutes/store/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import handlers
const getStoreItem = require('./get');
const updateStoreItem = require('./update');
const deleteStoreItem = require('./delete');
const uploadImageHandler = require('./uploadImage');

// Define routes for /store/:id
router.get('/', getStoreItem);
router.put('/', updateStoreItem);
router.delete('/', deleteStoreItem);
router.post('/image', uploadImageHandler);

module.exports = router;
