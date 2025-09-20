// swagger/setup.js
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const basicAuth = require('express-basic-auth');

const openapiConfig = require('./openapi.json');

module.exports = function setupSwagger(app) {
  const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD;
  const SWAGGER_USERNAME = process.env.SWAGGER_USERNAME || 'admin';
  
  const isAuthRequired = SWAGGER_PASSWORD && SWAGGER_PASSWORD.trim() !== '';

  const swaggerSpec = swaggerJsdoc({
    definition: {
      ...openapiConfig,
      components: openapiConfig.components,
    },
    apis: ['./app/routes/**/*.js']
  });

  // Basic Auth middleware configuration
  const basicAuthMiddleware = (req, res, next) => {
    if (!isAuthRequired) {
      return next();
    }
    
    return basicAuth({
      users: { [SWAGGER_USERNAME]: SWAGGER_PASSWORD },
      challenge: true,
      realm: 'Swagger Docs',
    })(req, res, next);
  };

  // Serve swagger.json with auth
  app.get('/swagger.json', basicAuthMiddleware, (req, res) => {
    res.json(swaggerSpec);
  });

  // Setup Swagger UI with auth
  app.use(
    '/docs',
    basicAuthMiddleware,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
};