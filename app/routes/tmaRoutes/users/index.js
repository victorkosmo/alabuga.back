const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const getCurrentUser = require('./me');
const updateCurrentUser = require('./updateMe');

router.get('/me', authenticateTmaJWT, getCurrentUser);
router.put('/me', authenticateTmaJWT, updateCurrentUser);

module.exports = router;
