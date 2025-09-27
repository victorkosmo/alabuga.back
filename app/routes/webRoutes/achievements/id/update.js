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
 *               mana_reward:
 *                 type: integer
 *                 description: Mana points awarded upon completion.
 *                 example: 150
 *               unlock_conditions:
 *                 type: object
 *                 nullable: true
 *                 description: Conditions to unlock the achievement. Set to null to clear.
 *                 properties:
 *                   required_missions:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: uuid
 *                     description: An array of mission UUIDs that must be completed.
 *                 example:
 *                   required_missions: ["d290f1ee-6c54-4b01-90e6-d701748f0851"]
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
        const { name, description, image_url, mana_reward, unlock_conditions } = req.body;

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

        if (mana_reward !== undefined) {
            if (typeof mana_reward !== 'number' || !Number.isInteger(mana_reward) || mana_reward < 0) {
                const err = new Error('mana_reward must be a non-negative integer.');
                err.statusCode = 400;
                err.code = 'VALIDATION_ERROR';
                return next(err);
            }
            updateFields.push(`mana_reward = $${paramIndex++}`);
            queryParams.push(mana_reward);
        }

        if (unlock_conditions !== undefined) {
            if (unlock_conditions !== null && (typeof unlock_conditions !== 'object' || Array.isArray(unlock_conditions))) {
                const err = new Error('unlock_conditions must be an object or null.');
                err.statusCode = 400;
                err.code = 'VALIDATION_ERROR';
                return next(err);
            }
            if (unlock_conditions && unlock_conditions.required_missions && (!Array.isArray(unlock_conditions.required_missions) || !unlock_conditions.required_missions.every(mId => isUUID(mId)))) {
                const err = new Error('unlock_conditions.required_missions must be an array of valid UUIDs.');
                err.statusCode = 400;
                err.code = 'VALIDATION_ERROR';
                return next(err);
            }
            updateFields.push(`unlock_conditions = $${paramIndex++}`);
            queryParams.push(JSON.stringify(unlock_conditions));
        }

        if (updateFields.length === 0) {
            const err = new Error('At least one field to update must be provided.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // The 'updated_at' column does not exist in the 'achievements' table based on the DBML schema.
        // Removing the attempt to update it.
        // updateFields.push(`updated_at = NOW()`); 
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
