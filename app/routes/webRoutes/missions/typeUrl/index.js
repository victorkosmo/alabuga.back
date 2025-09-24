// app/routes/webRoutes/missions/typeUrl/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createUrlMission = require('./post');
const idRouter = require('./id'); // Import the new sub-router

// Authentication middleware for all mission routes
// This was previously in missions/index.js, but for typeUrl specific routes,
// it's better to apply it here if typeUrl routes have different auth requirements
// or if missions/index.js is not guaranteed to apply it.
// Assuming authenticateJWT is applied at a higher level (missions/index.js),
// no need to re-apply here unless specific override is needed.

// Define routes for /missions/type-url
router.post('/', createUrlMission);

// Mount the dedicated sub-router for all /:id paths
router.use('/:id', idRouter);

module.exports = router;
