// app/routes/webRoutes/competencies/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/competencies/{id}:
 *   put:
 *     tags:
 *       - Competencies
 *     summary: Update a competency by ID
 *     description: Updates an existing competency. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the competency to update.
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
 *                 description: The updated name for the competency. Cannot be empty.
 *                 example: "Продвинутая Аналитика"
 *               description:
 *                 type: string
 *                 description: The updated description for the competency (optional).
 *     responses:
 *       200:
 *         description: Competency updated successfully.
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
 *                   example: "Competency updated successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
const updateCompetency = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const { rows } = await pool.query(
            `UPDATE competencies
             SET name = $1, description = $2, updated_at = NOW()
             WHERE id = $3 AND deleted_at IS NULL
             RETURNING *`,
            [name.trim(), description, id]
        );

        if (rows.length === 0) {
            const err = new Error(`Competency with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Competency updated successfully.';
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

module.exports = updateCompetency;
