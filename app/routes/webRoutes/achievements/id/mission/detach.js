// app/routes/webRoutes/achievements/id/mission/detach.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/{id}/mission/detach:
 *   post:
 *     tags:
 *       - Achievements
 *     summary: Detach an achievement from a mission
 *     description: Removes the `required_achievement_id` from a mission, if it matches the provided achievement ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the achievement to detach.
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
 *                 description: The UUID of the mission to detach the achievement from.
 *     responses:
 *       200:
 *         description: Achievement detached from mission successfully.
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
 *                   example: "Achievement detached from mission successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         description: Not Found - The specified mission does not exist or the achievement is not attached to it.
 */
const detachFromMission = async (req, res, next) => {
    try {
        const { id: achievementId } = req.params;
        const { mission_id: missionId } = req.body;

        if (!isUUID(achievementId) || !isUUID(missionId)) {
            const err = new Error('Invalid UUID format for achievement or mission ID.');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE missions 
             SET required_achievement_id = NULL, updated_at = NOW() 
             WHERE id = $1 AND required_achievement_id = $2 AND deleted_at IS NULL`,
            [missionId, achievementId]
        );

        if (rowCount === 0) {
            // This could be because the mission doesn't exist, or the achievement wasn't attached to it.
            // For simplicity and security, we return a generic 404.
            const err = new Error(`Mission with ID ${missionId} not found or it does not require achievement with ID ${achievementId}.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND_OR_MISMATCH';
            return next(err);
        }

        res.locals.data = {};
        res.locals.message = 'Achievement detached from mission successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = detachFromMission;
