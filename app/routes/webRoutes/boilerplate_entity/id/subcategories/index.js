// app/routes/boilerplate_entity/id/subcategories/index.js
const express = require('express');
// `mergeParams: true` is essential for this router to access `:id` from its parent.
const router = express.Router({ mergeParams: true });

const listSubcategories = require('./list');

// This route will correspond to GET /boilerplate_entity/:id/subcategories
router.get('/', listSubcategories);

module.exports = router;
