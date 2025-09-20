// app/routes/boilerplate_entity/id/index.js
const express = require('express');
// `mergeParams: true` is MANDATORY to grant this router access to
// the `:id` parameter from its parent (`/boilerplate_entity`).
const router = express.Router({ mergeParams: true });

// Import handlers for the specific entity
const getEntity = require('./get');
const updateEntity = require('./update');
const deleteEntity = require('./delete');

// Import sub-routers for nested resources
const subcategoriesRouter = require('./subcategories');

// Define routes for the specific /boilerplate_entity/:id resource
router.get('/', getEntity);
router.put('/', updateEntity);
router.delete('/', deleteEntity);

// Mount the sub-router for the 'subcategories' sub-resource
// This will handle all routes starting with /boilerplate_entity/:id/subcategories
router.use('/subcategories', subcategoriesRouter);

module.exports = router;
