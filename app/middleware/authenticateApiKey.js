// app/middleware/authenticateApiKey.js

/**
 * Middleware for API key authentication
 * Validates the API key from the request header against the environment variable
 * Follows the same error handling pattern as authenticateJWT middleware
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    const err = new Error('API key not configured on server');
    err.statusCode = 500;
    err.code = 'API_KEY_NOT_CONFIGURED';
    return next(err);
  }

  if (!apiKey) {
    const err = new Error('API key is missing in request headers');
    err.statusCode = 401;
    err.code = 'MISSING_API_KEY';
    return next(err);
  }

  if (apiKey !== validApiKey) {
    const err = new Error('Invalid API key');
    err.statusCode = 403;
    err.code = 'INVALID_API_KEY';
    return next(err);
  }

  // Set a flag to indicate API key authentication was used
  req.apiKeyAuth = true;
  next();
};

module.exports = {
  authenticateApiKey
};
