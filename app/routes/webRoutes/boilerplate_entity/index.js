// app/routes/boilerplate_entity/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware to all boilerplate_entity routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     BoilerplateEntity:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the entity.
 *           example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         name:
 *           type: string
 *           description: The name of the entity.
 *           example: "Example Entity"
 *         description:
 *           type: string
 *           description: A description for the entity.
 *           example: "Sample description"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the entity was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the entity was last updated.
 *       required:
 *         - id
 *         - name
 *         - created_at
 *         - updated_at
 */

// Import route handlers
const listEntities = require('./list');
const createEntity = require('./post');
const idRouter = require('./id'); // Import the sub-router for /:id

// Define routes
router.get('/', listEntities);          // GET /boilerplate_entity (list)
router.post('/', createEntity);         // POST /boilerplate_entity (create)

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);

/*
  API Response Format Standard:

  This API follows a consistent response envelope format for all endpoints:

  1. Success Responses:
    {
      "success": true,
      "data": ... // main response data
      "message": "Optional success message", // when applicable
      "meta": {   // for paginated or metadata
        "pagination": {
          "page": 1,
          "limit": 10,
          "total": 100,
          "pages": 10
        }
      }
    }

  2. Error Responses:
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE", // machine-readable code
        "message": "Human-readable error message",
        ... // additional error details if needed
      },
      "data": null
    }

  3. Special Cases:
    - 204 No Content: Empty response for successful DELETE operations

  Architectural Pattern Explanation:

  1. RESTful Design:
    - Resources are represented as nouns in URL paths
    - HTTP methods indicate actions (GET, POST, PUT, DELETE)
    - Status codes indicate result (200, 201, 204, 400, 404, etc.)

  2. Middleware Flow:
    - Authentication -> Route Handler -> Response Formatter
    - Errors are passed to central error handler

  3. Route Handlers:
    - Set response data on res.locals
    - Pass control to response formatter via next()
    - Throw errors with appropriate status codes and codes

  4. Database Interaction:
    - Each handler uses the shared connection pool
    - SQL queries are parameterized to prevent injection
    - Transactions are used for complex operations

  5. Documentation:
    - Swagger docs are maintained in each route file
    - Response schemas reflect the envelope format
    - Error responses are fully documented

  6. Validation:
    - Input validation happens in route handlers
    - Business logic validation happens in service layer
    - Database constraints provide final validation

  7. Error Handling:
    - All errors are passed to central error handler
    - Errors include status codes and machine-readable codes
    - Stack traces are only shown in development

  Route Structure Guidelines:

  1. Keep route files focused on HTTP concerns
  2. Move business logic to service layer
  3. Use consistent naming (singular/plural)
  4. Document all possible responses
  5. Follow REST conventions for status codes
  6. Use HTTP methods appropriately
*/

module.exports = router;
