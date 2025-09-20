// app/index.js
require('module-alias/register');
require('dotenv').config();
const express = require('express');

const setupCoreMiddleware = require('./config/middleware');
const responseFormatter = require('./middleware/responseFormatter');
const errorHandler = require('./middleware/errorHandler');
const setupRoutes = require('./routes');
const setupSwagger = require('./swagger/setup');


const app = express();
const port = process.env.PORT || 3000;
setupCoreMiddleware(app);
setupSwagger(app);
setupRoutes(app);

app.use(responseFormatter);
app.use((req, res, next) => {
    const err = new Error('Not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    next(err);
});

app.use(errorHandler);

const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    } else {
      console.error('Server error:', error);
    }
  });
  
  return server;
};

const server = startServer();

module.exports = { app, server };
