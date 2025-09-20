const express = require('express');
const router = express.Router();

// Import routers for the tma group
const authRouter = require('./auth/index');

router.use('/auth', authRouter);

module.exports = router;
