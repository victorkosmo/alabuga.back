// app/routes/webRoutes/competencies/post.js
const pool = require('@db');

/**
 * @swagger
 * /web/competencies:
 *   post:
 *     tags:
 *       - Competencies
 *     summary: Create a new competency
 *     description: Create a new competency. Requires authentication.
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
 *                 description: The name for the new competency.
 *                 example: "Общение"
 *               description:
 *                 type: string
 *                 description: An optional description for the competency.
 *                 example: "Навыки эффективной коммуникации."
 *     responses:
 *       201:
 *         description: Competency created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Competency'
 *                 message:
 *                   type: string
 *                   example: "Competency created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Conflict - A competency with this name already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               CompetencyNameConflict:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "COMPETENCY_NAME_CONFLICT"
 *                     message: "A competency with the provided name already exists."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const createCompetency = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const { rows } = await pool.query(
            `INSERT INTO competencies (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [name.trim(), description]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Competency created successfully.';
        next();

    } catch (err) {
        if (err.code === '23505' && err.constraint === 'competencies_name_key') {
            const conflictError = new Error(`A competency with the name '${req.body.name.trim()}' already exists.`);
            conflictError.statusCode = 409;
            conflictError.code = 'COMPETENCY_NAME_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = createCompetency;
