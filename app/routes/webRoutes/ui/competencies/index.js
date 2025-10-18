// app/routes/webRoutes/ui/competencies/index.js
const express = require('express');
const router = express.Router();

const listMinimalCompetencies = require('./listMinimal');

router.get('/list-minimal', listMinimalCompetencies);

module.exports = router;
