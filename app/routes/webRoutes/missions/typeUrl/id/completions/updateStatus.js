// app/routes/webRoutes/missions/typeUrl/id/completions/updateStatus.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-url/{missionId}/completions/{completionId}/status:
 *   patch:
 *     tags:
 *       - Missions Completions
 *     summary: Update the status of a mission completion
 *     description: Updates the status of a specific mission completion (e.g., to approve or reject it). When rejecting, a comment is required. Approving a mission should trigger reward distribution (Note: reward logic is a separate concern to be implemented).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission.
 *       - in: path
 *         name: completionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission completion to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/MissionCompletionStatus'
 *               moderator_comment:
 *                 type: string
 *                 nullable: true
 *                 description: "Required when status is 'REJECTED'."
 *     responses:
 *       200:
 *         description: Mission completion status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MissionCompletion'
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
const updateCompletionStatus = async (req, res, next) => {
    const { id: missionId, completionId } = req.params;
    const { status, moderator_comment } = req.body;
    const moderatorId = req.user.userId;

    if (!isUUID(missionId) || !isUUID(completionId)) {
        const err = new Error('Invalid mission or completion ID format');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
        const err = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }

    if (status === 'REJECTED' && (!moderator_comment || moderator_comment.trim() === '')) {
        const err = new Error('A moderator comment is required when rejecting a submission.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }

    // TODO: Implement transaction to award points/artifacts when status is 'APPROVED'.
    // This is a critical step for gamification logic. For now, we just update the status.

    try {
        const query = `
            UPDATE mission_completions
            SET
                status = $1,
                moderator_id = $2,
                moderator_comment = $3,
                updated_at = NOW()
            WHERE
                id = $4 AND mission_id = $5
            RETURNING *;
        `;

        const { rows, rowCount } = await pool.query(query, [status, moderatorId, moderator_comment, completionId, missionId]);

        if (rowCount === 0) {
            const err = new Error(`Completion with ID ${completionId} for mission ${missionId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Mission completion status updated successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = updateCompletionStatus;
