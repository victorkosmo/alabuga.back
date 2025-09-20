// app/middleware/responseFormatter.js
/**
 * Middleware to format successful responses into a standard envelope.
 * It expects route handlers to set `res.locals.data`, `res.locals.meta` (optional),
 * `res.locals.message` (optional), and `res.locals.statusCode` (optional).
 *
 * This formatter enforces a strict contract: to prevent silent 404 errors,
 * any handler intending a successful response MUST set `res.locals.data`.
 */
const formatSuccessResponse = (req, res, next) => {
    // If headers have already been sent by a handler that bypassed this middleware, do nothing.
    if (res.headersSent) {
        return next();
    }

    // Handle explicit 204 No Content responses. This is a valid success case.
    if (res.locals.statusCode === 204) {
        return res.status(204).send();
    }

    // If `res.locals.data` is set, the contract is fulfilled. Format the successful response.
    if (res.locals.data !== undefined) {
        const responsePayload = {
            success: true,
            data: res.locals.data,
            // Conditionally add optional keys to the payload
            ...(res.locals.message && { message: res.locals.message }),
            ...(res.locals.meta && { meta: res.locals.meta }),
        };
        const statusCode = res.locals.statusCode || 200;
        return res.status(statusCode).json(responsePayload);
    }

    // --- ARCHITECTURAL ENFORCEMENT ---
    // If a handler set a message, status, or meta but forgot `res.locals.data`,
    // it's a developer error. We must fail loudly instead of falling through to a 404.
    if (res.locals.message !== undefined || res.locals.statusCode !== undefined || res.locals.meta !== undefined) {
        const err = new Error(
            'Handler Contract Violation: A success property (`message`, `statusCode`, `meta`) was set on `res.locals`, ' +
            'but the required `res.locals.data` was left undefined. To fix, set `res.locals.data` (e.g., `res.locals.data = {}` for empty responses) ' +
            'or configure a 204 No Content response via `res.locals.statusCode = 204`.'
        );
        err.code = 'HANDLER_CONTRACT_VIOLATION';
        err.statusCode = 500; // This is a server-side developer error.
        return next(err); // Pass to the central errorHandler.
    }

    // If `res.locals` was not touched, this is a legitimate pass-through.
    // Let the next middleware in line (likely the 404 handler) take care of it.
    next();
};

module.exports = formatSuccessResponse;