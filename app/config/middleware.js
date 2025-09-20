const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const express = require('express');

const setupCoreMiddleware = (app) => {
  app.use(cors());
  app.use(morgan('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
};

module.exports = setupCoreMiddleware;
