// app/routes/webRoutes/campaigns/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/campaigns/{id}:
 *   put:
 *     tags:
 *       - Campaigns
 *     summary: Update a campaign by ID
 *     description: Updates an existing campaign. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the campaign to update.
 *     requestBody:
 *       required: true
 *       description: A JSON object containing the fields to update. At least one field must be provided.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The updated title for the campaign.
 *               description:
 *                 type: string
 *                 description: The updated description for the campaign.
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED]
 *                 description: The updated status of the campaign.
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               max_participants:
 *                 type: integer
 *                 nullable: true
 *               cover_url:
 *                 type: string
 *                 nullable: true
 *                 description: The updated cover image URL for the campaign. Can be set to null to remove the cover.
 *     responses:
 *       200:
 *         description: Campaign updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "Campaign updated successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, status, start_date, end_date, max_participants, cover_url } = req.body;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            queryParams.push(title);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            queryParams.push(description);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            queryParams.push(status);
        }
        if (start_date !== undefined) {
            updateFields.push(`start_date = $${paramIndex++}`);
            queryParams.push(start_date);
        }
        if (end_date !== undefined) {
            updateFields.push(`end_date = $${paramIndex++}`);
            queryParams.push(end_date);
        }
        if (max_participants !== undefined) {
            updateFields.push(`max_participants = $${paramIndex++}`);
            queryParams.push(max_participants);
        }
        if (cover_url !== undefined) {
            updateFields.push(`cover_url = $${paramIndex++}`);
            queryParams.push(cover_url);
        }

        if (updateFields.length === 0) {
            const err = new Error('At least one field to update must be provided.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        updateFields.push(`updated_at = NOW()`);
        queryParams.push(id);

        const updateQuery = `UPDATE campaigns SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`;

        const { rows } = await pool.query(updateQuery, queryParams);

        if (rows.length === 0) {
            const err = new Error(`Campaign with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Campaign updated successfully.';
        next();

    } catch (err) {
        if (err.code === '23505') {
            const conflictError = new Error(`A database conflict occurred.`);
            conflictError.statusCode = 409;
            conflictError.code = 'DB_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = updateCampaign;
