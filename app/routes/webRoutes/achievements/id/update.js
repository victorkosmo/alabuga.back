// app/routes/webRoutes/achievements/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/{id}:
 *   put:
 *     tags:
 *       - Achievements
 *     summary: Update an achievement by ID
 *     description: Updates an existing achievement.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the achievement to update.
 *     requestBody:
 *       required: true
 *       description: A JSON object containing the fields to update.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Achievement updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Achievement'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - An achievement with this name already exists in this campaign.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateAchievement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, image_url } = req.body;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            queryParams.push(name);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            queryParams.push(description);
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            queryParams.push(image_url);
        }

        if (updateFields.length === 0) {
            const err = new Error('At least one field to update must be provided.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        updateFields.push(`updated_at = NOW()`);
        queryParams.push(id);

        const updateQuery = `UPDATE achievements SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const { rows } = await pool.query(updateQuery, queryParams);

        if (rows.length === 0) {
            const err = new Error(`Achievement with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Achievement updated successfully.';
        next();

    } catch (err) {
        if (err.code === '23505') { // unique_violation on (campaign_id, name)
            const conflictError = new Error('An achievement with this name already exists in this campaign.');
            conflictError.statusCode = 409;
            conflictError.code = 'ACHIEVEMENT_NAME_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = updateAchievement;
