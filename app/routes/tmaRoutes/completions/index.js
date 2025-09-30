const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const submitUrlMission = require('./submitUrl');
const submitQuizMission = require('./submitQuiz');

/**
 * @swagger
 * tags:
 *   name: Mission Completions (TMA)
 *   description: Endpoints for submitting mission completions from the Telegram Mini App.
 */

// This route corresponds to POST /telegram/completions/submit-url
router.post('/submit-url', authenticateTmaJWT, submitUrlMission);

// This route corresponds to POST /telegram/completions/submit-quiz
router.post('/submit-quiz', authenticateTmaJWT, submitQuizMission);

module.exports = router;
