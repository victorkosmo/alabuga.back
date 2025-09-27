// app/routes/webRoutes/missions/typeUrl/id/completions/updateStatus.js
const pool = require('@db');
const { isUUID } = require('validator');
const { sendTelegramMessage } = require('@features/sendTelegramMsg');
const { checkAndAwardAchievements } = require('@features/achievementChecker');

/**
 * @swagger
 * /web/missions/type-url/{missionId}/completions/{completionId}/status:
 *   patch:
 *     tags:
 *       - Missions Completions
 *     summary: Update the status of a mission completion
 *     description: |
 *       Updates the status of a specific mission completion (e.g., to approve or reject it). When rejecting, a comment is required. Approving a mission should trigger reward distribution (Note: reward logic is a separate concern to be implemented).
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Fetch the current completion status and user ID to check for idempotency. Lock the row.
        const completionCheckQuery = `
            SELECT user_id, status FROM mission_completions WHERE id = $1 AND mission_id = $2 FOR UPDATE;
        `;
        const completionCheckResult = await client.query(completionCheckQuery, [completionId, missionId]);

        if (completionCheckResult.rowCount === 0) {
            const err = new Error(`Completion with ID ${completionId} for mission ${missionId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err; // This will be caught and rolled back
        }

        const { user_id: userId, status: currentStatus } = completionCheckResult.rows[0];

        // Idempotency check: If already approved and we're trying to approve again, do nothing further.
        if (currentStatus === 'APPROVED' && status === 'APPROVED') {
            await client.query('ROLLBACK'); // No changes needed.
            const finalState = await pool.query('SELECT * FROM mission_completions WHERE id = $1', [completionId]);
            res.locals.data = finalState.rows[0];
            res.locals.message = 'Mission completion was already approved.';
            return next();
        }

        // Step 2: If approving for the first time, fetch mission rewards, update user points, and send notification.
        if (status === 'APPROVED' && currentStatus !== 'APPROVED') {
            // Fetch mission details
            const missionQuery = 'SELECT title, experience_reward, mana_reward FROM missions WHERE id = $1;';
            const missionResult = await client.query(missionQuery, [missionId]);
            
            if (missionResult.rowCount === 0) {
                const err = new Error(`Mission with ID ${missionId} not found.`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                throw err;
            }
            
            const { title: missionTitle, experience_reward, mana_reward } = missionResult.rows[0];

            // Update user points
            if (experience_reward > 0 || mana_reward > 0) {
                const updateUserQuery = `
                    UPDATE users
                    SET
                        experience_points = experience_points + $1,
                        mana_points = mana_points + $2,
                        updated_at = NOW()
                    WHERE id = $3;
                `;
                await client.query(updateUserQuery, [experience_reward, mana_reward, userId]);
            }

            // Check for and award any achievements this completion might unlock
            await checkAndAwardAchievements(client, userId, missionId);

            // Fetch user's tg_id for notification
            const userQuery = 'SELECT tg_id FROM users WHERE id = $1;';
            const userResult = await client.query(userQuery, [userId]);

            if (userResult.rowCount > 0) {
                const { tg_id: tgId } = userResult.rows[0];
                const message = `Поздравляем! Ваше задание «${missionTitle}» было одобрено.\n\nВы получили:\n- ${experience_reward} опыта\n- ${mana_reward} маны`;
                
                // Send notification, but don't let it fail the transaction
                await sendTelegramMessage(tgId, message);
            } else {
                // Log if user not found, but don't fail the transaction
                console.warn(`User with ID ${userId} not found when trying to send completion notification.`);
            }
        }

        // Step 3: Update the completion status itself.
        const updateCompletionQuery = `
            UPDATE mission_completions
            SET
                status = $1,
                moderator_id = $2,
                moderator_comment = $3,
                updated_at = NOW()
            WHERE
                id = $4
            RETURNING *;
        `;
        // Clear comment if not rejecting
        const finalComment = status === 'REJECTED' ? moderator_comment : null;
        const updateResult = await client.query(updateCompletionQuery, [status, moderatorId, finalComment, completionId]);

        await client.query('COMMIT');

        res.locals.data = updateResult.rows[0];
        res.locals.message = 'Mission completion status updated successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = updateCompletionStatus;
