// middleware/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    const err = new Error('Authorization header missing');
    err.statusCode = 401;
    err.code = 'MISSING_AUTH_HEADER';
    return next(err);
  }

  const token = authHeader.split(" ")[1];
  
  if (!token) {
    const err = new Error('No token provided');
    err.statusCode = 401;
    err.code = 'MISSING_TOKEN';
    return next(err);
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      
      if (err.name === "TokenExpiredError") {
        error.code = 'TOKEN_EXPIRED';
        error.message = 'Token expired';
      } else {
        error.code = 'INVALID_TOKEN';
        error.message = 'Invalid token';
      }
      
      return next(error);
    }
    
    req.user = decoded;
    next();
  });
};

module.exports = {
  authenticateJWT
};
