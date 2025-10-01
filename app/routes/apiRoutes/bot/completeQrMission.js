// app/routes/apiRoutes/bot/completeQrMission.js
const pool = require('@db');
const { checkAndAwardAchievements } = require('@features/achievementChecker');
const { sendTelegramMessage } = require('@features/sendTelegramMsg');

/**
 * @swagger
 * /api/bot/complete-qr-mission:
 *   post:
 *     tags:
 *       - API - Bot
 *     summary: Complete a QR code mission
 *     description: Finds or creates a user by Telegram ID, validates a completion code for a QR-type mission, and marks it as completed. This is intended to be called by the Telegram bot service after a user scans a QR code.
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tg_user
 *               - completion_code
 *             properties:
 *               tg_user:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Telegram user ID.
 *                   username:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                 example:
 *                   id: 123456789
 *                   username: "testuser"
 *                   first_name: "Test"
 *                   last_name: "User"
 *               completion_code:
 *                 type: string
 *                 description: The secret code from the QR mission.
 *                 example: "A1B3C2"
 *     responses:
 *       200:
 *         description: Successfully completed the mission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Congratulations! You have completed the mission 'Find the Hidden Artifact'!"
 *       400:
 *         description: Bad request (e.g., invalid code, missing data).
 *       404:
 *         description: Mission not found for the given code.
 *       409:
 *         description: User has already completed this mission.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const completeQrMission = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { tg_user, completion_code } = req.body;

        if (!tg_user || !tg_user.id || !completion_code) {
            const err = new Error('Missing required fields: tg_user and completion_code.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        await client.query('BEGIN');

        // 1. Find or create user (logic adapted from joinCampaign)
        let user;
        const userQuery = 'SELECT id FROM users WHERE tg_id = $1';
        const { rows: userRows } = await client.query(userQuery, [tg_user.id]);

        if (userRows.length > 0) {
            user = userRows[0];
        } else {
            const defaultRankQuery = 'SELECT id FROM ranks WHERE sequence_order = (SELECT MIN(sequence_order) FROM ranks WHERE deleted_at IS NULL) AND deleted_at IS NULL LIMIT 1';
            const { rows: rankRows } = await client.query(defaultRankQuery);
            if (rankRows.length === 0) {
                throw new Error('Initial rank not configured. Cannot create new user.');
            }
            const insertUserQuery = `
                INSERT INTO users (tg_id, username, first_name, last_name, rank_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const { rows: newUserRows } = await client.query(insertUserQuery, [
                tg_user.id, tg_user.username, tg_user.first_name, tg_user.last_name, rankRows[0].id
            ]);
            user = newUserRows[0];
        }
        const userId = user.id;

        // 2. Find the mission by completion code
        const missionQuery = `
            SELECT id, title, experience_reward, mana_reward
            FROM missions
            WHERE completion_code = $1 AND type = 'QR_CODE' AND deleted_at IS NULL
        `;
        const { rows: missionRows } = await client.query(missionQuery, [completion_code.toUpperCase()]);

        if (missionRows.length === 0) {
            const err = new Error('Invalid or expired completion code.');
            err.statusCode = 404;
            err.code = 'INVALID_CODE';
            await client.query('ROLLBACK');
            return next(err);
        }
        const mission = missionRows[0];
        const missionId = mission.id;

        // 3. Check if user has already completed this mission
        const existingCompletionQuery = 'SELECT 1 FROM mission_completions WHERE user_id = $1 AND mission_id = $2';
        const { rows: existingCompletionRows } = await client.query(existingCompletionQuery, [userId, missionId]);

        if (existingCompletionRows.length > 0) {
            const err = new Error('You have already completed this mission.');
            err.statusCode = 409;
            err.code = 'ALREADY_COMPLETED';
            await client.query('ROLLBACK');
            return next(err);
        }

        // 4. Award mission completion and rewards
        // 4a. Insert into mission_completions as APPROVED
        await client.query(
            `INSERT INTO mission_completions (user_id, mission_id, status, result_data) VALUES ($1, $2, 'APPROVED', $3)`,
            [userId, missionId, completion_code]
        );

        // 4b. Update user points from the mission itself
        if (mission.experience_reward > 0 || mission.mana_reward > 0) {
            await client.query(
                `UPDATE users SET experience_points = experience_points + $1, mana_points = mana_points + $2, updated_at = NOW() WHERE id = $3;`,
                [mission.experience_reward, mission.mana_reward, userId]
            );
        }

        // 4c. Check for and award any achievements this completion might unlock
        await checkAndAwardAchievements(client, userId, missionId);

        await client.query('COMMIT');

        // 5. Send notification (fire-and-forget after commit)
        const notifyMessage = `✅ Задание «${mission.title}» выполнено.`;
        sendTelegramMessage(tg_user.id, notifyMessage);
        
        res.locals.data = {};
        next();

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Error during transaction rollback:', rollbackErr);
        }
        next(err);
    } finally {
        client.release();
    }
};

module.exports = completeQrMission;
