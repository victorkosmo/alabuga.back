// app/routes/webRoutes/index.js
const express = require('express');
const router = express.Router();

// Import routers for the web group
const authRouter = require('./auth/index');
const competenciesRouter = require('./competencies/index');

router.use('/auth', authRouter);
router.use('/competencies', competenciesRouter);

module.exports = router;
