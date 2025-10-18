// app/routes/webRoutes/ranks/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Import handlers
const getRank = require('./get');
const updateRank = require('./update');

// Define routes for /ranks/:id
router.get('/', getRank);
router.put('/', upload.single('image'), updateRank);

module.exports = router;
