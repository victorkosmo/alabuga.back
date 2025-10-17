const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const getGlobalCompetencies = require('./globalCompetencies');

// This route corresponds to GET /telegram/progress/global-competencies
router.get('/global-competencies', authenticateTmaJWT, getGlobalCompetencies);

module.exports = router;
