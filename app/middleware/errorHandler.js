// app/middleware/errorHandler.js
/**
 * Centralized error handler. Formats errors into a standard envelope.
 * Tries to determine appropriate HTTP status code from the error object.
 */
const errorHandler = (err, req, res, next) => {
    // Simple log format
    console.error(`[${new Date().toISOString()}] ${err.code || 'ERROR'} - ${err.message}`);

    // Determine status code: Use err.statusCode if set, or default based on err.name, else 500
    let statusCode = err.statusCode || err.status || 500; // Check common properties

    // Simple mapping for common error names (add more if needed)
    if (!err.statusCode && !err.status) {
        switch (err.name) {
            case 'SyntaxError': // Often from bad JSON parsing
                statusCode = 400;
                break;
            case 'ValidationError': // If a validation library throws errors with this name
                statusCode = 400;
                break;
            // Add other specific error names you might encounter
        }
    }

    const errorResponse = {
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || 'An unexpected error occurred.'
        },
        data: null,
    };

    res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
