// app/routes/webRoutes/missions/typeUrl/id/completions/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

const listMissionCompletions = require('./list');
const updateCompletionStatus = require('./updateStatus');

// GET /web/missions/type-url/:id/completions
router.get('/', listMissionCompletions);

// PATCH /web/missions/type-url/:id/completions/:completionId/status
router.patch('/:completionId/status', updateCompletionStatus);

module.exports = router;
