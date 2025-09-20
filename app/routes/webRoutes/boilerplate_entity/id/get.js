// app/routes/boilerplate_entity/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /boilerplate_entity/{id}:
 *   get:
 *     tags:
 *       - boilerplate_entity
 *     summary: Get a boilerplate_entity by ID
 *     description: Retrieve a single boilerplate_entity by its unique ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the boilerplate_entity to retrieve.
 *         example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *     responses:
 *       200:
 *         description: The requested boilerplate_entity details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   # Reference the schema defined in index.js
 *                   $ref: '#/components/schemas/BoilerplateEntity'
 *                 # No 'message' typically needed for a successful GET by ID
 *       401:
 *         # Reference the global Unauthorized response
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         # Reference the global Not Found response (covers entity not existing)
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         # Reference the global Internal Server Error response
 *         $ref: '#/components/responses/InternalServerError'
 */

const getEntity = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validate UUID format using validator library
        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM boilerplate_entities WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (rows.length === 0) {
            const err = new Error(`Boilerplate entity with ID ${id} not found.`); // Specific message
            err.statusCode = 404;
            err.code = 'NOT_FOUND'; // Consistent code
            return next(err);
        }

        // Set response data for the formatter
        res.locals.data = rows[0];
        next();

    } catch (err) {
        // Pass database or other errors to central handler
        next(err);
    }
};

module.exports = getEntity;
