// app/routes/webRoutes/index.js
const express = require('express');
const router = express.Router();

// Import routers for the web group
const authRouter = require('./auth/index');
const boilerplateRouter = require('./boilerplate_entity/index');

router.use('/auth', authRouter);
router.use('/boilerplate_entity', boilerplateRouter);

module.exports = router;
