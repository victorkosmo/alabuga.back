// app/routes/webRoutes/competencies/id/index.js
const express = require('express');
// `mergeParams: true` is MANDATORY to grant this router access to
// the `:id` parameter from its parent.
const router = express.Router({ mergeParams: true });

// Import handlers
const getCompetency = require('./get');
const updateCompetency = require('./update');
const deleteCompetency = require('./delete');

// Define routes for /competencies/:id
router.get('/', getCompetency);
router.put('/', updateCompetency);
router.delete('/', deleteCompetency);

module.exports = router;
