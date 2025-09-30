// app/routes/webRoutes/missions/typeQuiz/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createQuizMission = require('./post');
const idRouter = require('./id');

// Define routes for /missions/type-quiz
router.post('/', createQuizMission);

// Mount the dedicated sub-router for all /:id paths
router.use('/:id', idRouter);

module.exports = router;
