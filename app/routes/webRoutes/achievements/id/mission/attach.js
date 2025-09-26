// app/routes/webRoutes/achievements/id/mission/attach.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/{id}/mission/attach:
 *   post:
 *     tags:
 *       - Achievements
 *     summary: Attach an achievement as a requirement to a mission
 *     description: Sets the `required_achievement_id` for a mission. Both the achievement and the mission must belong to the same campaign. The mission must not already have a required achievement.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the achievement to attach.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mission_id]
 *             properties:
 *               mission_id:
 *                 type: string
 *                 format: uuid
 *                 description: The UUID of the mission to attach the achievement to.
 *     responses:
 *       200:
 *         description: Achievement attached to mission successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Achievement attached to mission successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         description: Not Found - The specified achievement or mission does not exist.
 *       409:
 *         description: Conflict - The mission and achievement are not in the same campaign, or the mission already has a required achievement.
 */
const attachToMission = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id: achievementId } = req.params;
        const { mission_id: missionId } = req.body;

        if (!isUUID(achievementId) || !isUUID(missionId)) {
            const err = new Error('Invalid UUID format for achievement or mission ID.');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        await client.query('BEGIN');

        const achievementQuery = 'SELECT campaign_id FROM achievements WHERE id = $1 FOR UPDATE';
        const achievementResult = await client.query(achievementQuery, [achievementId]);

        if (achievementResult.rowCount === 0) {
            const err = new Error(`Achievement with ID ${achievementId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }

        const missionQuery = 'SELECT campaign_id, required_achievement_id FROM missions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE';
        const missionResult = await client.query(missionQuery, [missionId]);

        if (missionResult.rowCount === 0) {
            const err = new Error(`Mission with ID ${missionId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }

        const achievementCampaignId = achievementResult.rows[0].campaign_id;
        const mission = missionResult.rows[0];

        if (achievementCampaignId !== mission.campaign_id) {
            const err = new Error('Achievement and Mission do not belong to the same campaign.');
            err.statusCode = 409;
            err.code = 'CAMPAIGN_MISMATCH';
            throw err;
        }

        if (mission.required_achievement_id) {
            const err = new Error('This mission already has a required achievement.');
            err.statusCode = 409;
            err.code = 'RELATION_EXISTS';
            throw err;
        }

        await client.query(
            'UPDATE missions SET required_achievement_id = $1, updated_at = NOW() WHERE id = $2',
            [achievementId, missionId]
        );

        await client.query('COMMIT');

        res.locals.message = 'Achievement attached to mission successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = attachToMission;
