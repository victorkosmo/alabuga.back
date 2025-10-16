// app/routes/webRoutes/missions/typeQr/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-qr/{id}:
 *   put:
 *     tags:
 *       - Missions
 *     summary: Update a QR code-based mission
 *     description: Updates a mission of type 'QR_CODE'. Only include the fields you want to change. The completion code cannot be changed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *               cover_url:
 *                 type: string
 *                 nullable: true
 *               required_achievement_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               experience_reward:
 *                 type: integer
 *               mana_reward:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Mission updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Mission'
 *                     - type: object
 *                       properties:
 *                         required_achievement_name:
 *                           type: string
 *                           nullable: true
 *                           description: "The name of the required achievement, if any."
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateQrMission = async (req, res, next) => {
    const { id } = req.params;
    const body = req.body;

    if (!isUUID(id)) {
        const err = new Error('Invalid ID format');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    if (body.required_achievement_id !== undefined && body.required_achievement_id !== null && !isUUID(body.required_achievement_id)) {
        const err = new Error('Invalid UUID format for required_achievement_id.');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    const missionFields = ['title', 'description', 'category', 'required_achievement_id', 'experience_reward', 'mana_reward', 'cover_url'];
    const missionUpdates = {};

    for (const key in body) {
        if (missionFields.includes(key)) missionUpdates[key] = body[key];
    }

    if (Object.keys(missionUpdates).length === 0) {
        const err = new Error('At least one field to update must be provided.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const setClauses = Object.keys(missionUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const queryParams = [...Object.values(missionUpdates), id];
        const updateMissionQuery = `
            UPDATE missions 
            SET ${setClauses}, updated_at = NOW() 
            WHERE id = $${queryParams.length} AND type = 'QR_CODE'
            RETURNING *;
        `;
        const result = await client.query(updateMissionQuery, queryParams);
        if (result.rowCount === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a QR-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }
        const updatedMission = result.rows[0];

        let required_achievement_name = null;
        if (updatedMission.required_achievement_id) {
            const achievementResult = await client.query(
                'SELECT name FROM achievements WHERE id = $1',
                [updatedMission.required_achievement_id]
            );
            if (achievementResult.rowCount > 0) {
                required_achievement_name = achievementResult.rows[0].name;
            }
        }

        await client.query('COMMIT');

        res.locals.data = {
            ...updatedMission,
            required_achievement_name,
        };
        res.locals.message = 'Mission updated successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = updateQrMission;
