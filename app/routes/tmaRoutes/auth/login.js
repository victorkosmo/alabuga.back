const pool = require('@db');
const { generateAccessToken, generateRefreshToken } = require('@services/tgAuthService');

/**
 * @swagger
 * /telegram/auth/login:
 *   post:
 *     tags:
 *       - Auth (TMA)
 *     summary: Authenticate a Telegram Mini App user
 *     description: >
 *       Validates `initData` from the Telegram client. If the user exists, it returns auth tokens.
 *       If the user does not exist, it creates a new user record and then returns auth tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initData
 *             properties:
 *               initData:
 *                 type: string
 *                 description: The `initData` string from `window.Telegram.WebApp.initData`.
 *     responses:
 *       200:
 *         description: Authentication successful, user created if they were new.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     access:
 *                       type: string
 *                     refresh:
 *                       type: string
 *                     user:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: "Authentication successful"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const tmaLogin = async (req, res, next) => {
    try {
        const tgUser = req.tgUser;

        // Check if user exists
        const { rows: existingUsers } = await pool.query(
            'SELECT * FROM users WHERE tg_id = $1 AND deleted_at IS NULL',
            [tgUser.id]
        );

        let user;

        if (existingUsers.length > 0) {
            // User exists, use their record
            user = existingUsers[0];
        } else {
            // User does not exist, create a new one
            // First, get the initial rank
            const { rows: initialRankRows } = await pool.query(
                'SELECT id FROM ranks WHERE deleted_at IS NULL ORDER BY priority ASC LIMIT 1'
            );

            const initialRankId = initialRankRows.length > 0 ? initialRankRows[0].id : null;

            // Create new user
            const { rows: newUsers } = await pool.query(
                `INSERT INTO users (tg_id, first_name, last_name, username, avatar_url, rank_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    tgUser.id,
                    tgUser.first_name,
                    tgUser.last_name || null,
                    tgUser.username || null,
                    tgUser.photo_url || null,
                    initialRankId,
                ]
            );
            user = newUsers[0];
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Exclude sensitive or unnecessary fields from the user object in response
        const { deleted_at, ...userResponse } = user;

        res.locals.data = {
            access: accessToken,
            refresh: refreshToken,
            user: userResponse
        };
        res.locals.message = 'Authentication successful';
        next();

    } catch (err) {
        // As requested, log the incoming telegram user data on DB error
        console.error('Error during TMA login. Telegram user data:', req.tgUser);
        next(err);
    }
};

module.exports = tmaLogin;
