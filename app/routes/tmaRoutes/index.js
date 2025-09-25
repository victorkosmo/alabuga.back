const express = require('express');
const router = express.Router();

// Import routers for the tma group
const authRouter = require('./auth/index');
const usersRouter = require('./users/index');
const campaignsRouter = require('./campaigns/index');

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/campaigns', campaignsRouter);

module.exports = router;
