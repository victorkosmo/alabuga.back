// app/routes/webRoutes/ranks/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');
const { uploadFileToMinio } = require('@features/useMinioBucket');

/**
 * @swagger
 * /web/ranks/{id}:
 *   put:
 *     tags:
 *       - Ranks
 *     summary: Update a rank by ID
 *     description: Updates an existing rank. Requires authentication. `unlock_conditions` must be a valid JSON string if provided.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the rank to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: integer
 *               unlock_conditions:
 *                 type: string
 *                 description: A JSON string representing unlock conditions.
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Rank updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rank'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - A rank with this title already exists.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateRank = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, priority, unlock_conditions } = req.body;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (title === undefined && description === undefined && priority === undefined && unlock_conditions === undefined && !req.file) {
            const err = new Error('At least one field must be provided for an update.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        if (req.file) {
            const originalName = `ranks/image_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
            const result = await uploadFileToMinio(req.file.buffer, originalName, req.file.mimetype);
            updateFields.push(`image_url = $${paramIndex++}`);
            queryParams.push(result.url);
        }

        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            queryParams.push(title.trim());
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            queryParams.push(description);
        }
        if (priority !== undefined) {
            updateFields.push(`priority = $${paramIndex++}`);
            queryParams.push(parseInt(priority, 10));
        }
        if (unlock_conditions !== undefined) {
            try {
                const parsedUnlockConditions = JSON.parse(unlock_conditions);
                updateFields.push(`unlock_conditions = $${paramIndex++}`);
                queryParams.push(parsedUnlockConditions);
            } catch (e) {
                const err = new Error('unlock_conditions must be a valid JSON string.');
                err.statusCode = 400;
                err.code = 'VALIDATION_ERROR';
                return next(err);
            }
        }

        updateFields.push(`updated_at = NOW()`);
        queryParams.push(id);

        const updateQuery = `UPDATE ranks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`;

        const { rows } = await pool.query(updateQuery, queryParams);

        if (rows.length === 0) {
            const err = new Error(`Rank with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Rank updated successfully.';
        next();

    } catch (err) {
        if (err.code === '23505' && err.constraint === 'ranks_title_key') {
            const conflictError = new Error(`A rank with the provided title already exists.`);
            conflictError.statusCode = 409;
            conflictError.code = 'RANK_TITLE_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = updateRank;
