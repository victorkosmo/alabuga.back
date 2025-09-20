// app/index.js
require('module-alias/register');
require('dotenv').config();
const express = require('express');

const setupCoreMiddleware = require('./config/middleware');
const responseFormatter = require('./middleware/responseFormatter');
const errorHandler = require('./middleware/errorHandler');
const setupRoutes = require('./routes');
const setupSwagger = require('./swagger/setup');

// Init
const app = express();
const port = process.env.PORT || 3000;

// 1. Core middleware
setupCoreMiddleware(app);

// 2. Swagger UI
setupSwagger(app);

// 3. API Routes
setupRoutes(app);

// 4. Success Response Formatter
app.use(responseFormatter);

// 5. 404 handler
app.use((req, res, next) => {
    const err = new Error('Not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    next(err);
});

// 6. Centralized Error Handler
app.use(errorHandler);

// Start server
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
