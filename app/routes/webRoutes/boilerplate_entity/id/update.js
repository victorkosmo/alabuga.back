// app/routes/boilerplate_entity/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /boilerplate_entity/{id}:
 *   put:
 *     tags:
 *       - boilerplate_entity
 *     summary: Update a boilerplate_entity by ID
 *     description: Updates an existing boilerplate_entity identified by its ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the boilerplate_entity to update.
 *         example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name] # Ensure 'name' is required as per the code logic
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name for the entity. Cannot be empty.
 *                 example: "Updated Entity Name"
 *                 minLength: 1 # Example constraint
 *               description:
 *                 type: string
 *                 description: The updated description for the entity (optional).
 *                 example: "Updated entity description"
 *     responses:
 *       200:
 *         description: Boilerplate entity updated successfully.
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
 *                 message:
 *                   type: string
 *                   example: "Entity updated successfully."
 *       400:
 *         # Reference the global Bad Request response (covers validation like missing 'name')
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         # Reference the global Unauthorized response
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         # Reference the global Not Found response (covers entity with the specified ID not existing)
 *         $ref: '#/components/responses/NotFoundError'
 *       # Optional: Add specific business rule errors if applicable, like a name conflict
 *       409:
 *         description: Conflict - An entity with the updated name already exists.
 *         content:
 *           application/json:
 *             schema:
 *               # Reference the global ErrorResponse schema structure
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               EntityNameConflict: # Key for the example
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "ENTITY_NAME_CONFLICT" # Specific error code
 *                     message: "An entity with the provided name already exists." # Specific message
 *                   data: null
 *       500:
 *         # Reference the global Internal Server Error response
 *         $ref: '#/components/responses/InternalServerError'
 */

const updateEntity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Validate UUID format
        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Validate required fields (aligns with requestBody definition)
        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR'; // Consistent code
            return next(err);
        }

        // Attempt the update
        const { rows } = await pool.query(
            `UPDATE boilerplate_entities
             SET name = $1, description = $2, updated_at = NOW()
             WHERE id = $3 AND deleted_at IS NULL
             RETURNING *`,
            [name.trim(), description, id]
        );

        // Check if the entity was found and updated
        if (rows.length === 0) {
            const err = new Error(`Boilerplate entity with ID ${id} not found.`); // More specific message
            err.statusCode = 404;
            err.code = 'NOT_FOUND'; // Consistent code
            return next(err);
        }

        // Set response data for the formatter
        res.locals.data = rows[0];
        res.locals.message = 'Entity updated successfully.';
        // Status code 200 is default, no need to set it explicitly
        next();

    } catch (err) {
        // Handle potential specific database errors like unique constraints
        if (err.code === '23505') { // Example for PostgreSQL unique violation
             const conflictError = new Error(`An entity with the name '${req.body.name.trim()}' already exists.`);
             conflictError.statusCode = 409;
             conflictError.code = 'ENTITY_NAME_CONFLICT'; // Match the Swagger example
             return next(conflictError);
         }
        // Pass other errors (DB connection, syntax errors etc.) to the central handler
        next(err);
    }
};

module.exports = updateEntity;
