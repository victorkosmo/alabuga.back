const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const getCurrentUser = require('./me');

router.get('/me', authenticateTmaJWT, getCurrentUser);

module.exports = router;
