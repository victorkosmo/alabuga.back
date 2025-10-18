const express = require('express');
const router = express.Router();

// Import routers for the tma group
const authRouter = require('./auth/index');
const usersRouter = require('./users/index');
const campaignsRouter = require('./campaigns/index');
const completionsRouter = require('./completions/index');
const missionsRouter = require('./missions/index');
const storeRouter = require('./store/index');
const progressRouter = require('./progress/index');

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/campaigns', campaignsRouter);
router.use('/completions', completionsRouter);
router.use('/missions', missionsRouter);
router.use('/store', storeRouter);
router.use('/progress', progressRouter);

module.exports = router;
