// app/routes/boilerplate_entity/post.js
const pool = require('@db');

/**
 * @swagger
 * /boilerplate_entity:
 *   post:
 *     tags:
 *       - boilerplate_entity
 *     summary: Create a new boilerplate_entity
 *     description: Create a new boilerplate_entity. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name for the new entity.
 *                 example: "New Example Entity"
 *               description:
 *                 type: string
 *                 description: An optional description for the entity.
 *                 example: "Description for the new entity"
 *     responses:
 *       201:
 *         description: Boilerplate entity created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BoilerplateEntity' # <-- Reference the schema defined in index.js
 *                 message:
 *                   type: string
 *                   example: "Entity created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError' # Reference global bad request response
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError' # Reference global unauthorized response
 *       # Example of a specific business logic error (if applicable)
 *       # 409:
 *       #   description: Conflict - An entity with this name already exists.
 *       #   content:
 *       #     application/json:
 *       #       schema:
 *       #         $ref: '#/components/schemas/ErrorResponse' # Reference global error schema
 *       #       examples:
 *       #         EntityNameConflict:
 *       #           value:
 *       #             success: false
 *       #             error:
 *       #               code: "ENTITY_NAME_CONFLICT"
 *       #               message: "An entity with the provided name already exists."
 *       #             data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError' # Reference global server error response
 */

const createEntity = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            const err = new Error('Name is required');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR'; // Ensure consistent error code usage
            return next(err);
        }

        // Consider adding validation for name length, format etc. here or in middleware

        // Example for unique constraint handling
        const { rows } = await pool.query(
            `INSERT INTO boilerplate_entities (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name, description]
        );

    } catch (err) {
        if (err.code === '23505') {
            const conflictError = new Error('Unique constraint violation');
            conflictError.statusCode = 409;
            conflictError.code = 'UNIQUE_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = createEntity;
