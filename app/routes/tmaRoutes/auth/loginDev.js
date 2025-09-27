const pool = require('@db');
const { generateAccessToken, generateRefreshToken } = require('@services/tgAuthService');


/**
 * @swagger
 * /telegram/auth/login-dev:
 *   post:
 *     tags:
 *       - Auth (TMA)
 *     summary: Authenticate as a pre-defined developer user (DEV/TESTING)
 *     description: >
 *       Provides authentication tokens for a hardcoded developer user.
 *       It bypasses Telegram `initData` validation for local development and testing.
 *       WARNING: This is an insecure endpoint and should be protected or disabled in production.
 *     responses:
 *       200:
 *         description: Developer authentication successful.
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
 *                   example: "Developer login successful"
 *       404:
 *         description: Developer user not found in the database.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const tmaDevLogin = async (req, res, next) => {
    const devUserTgId = process.env.DEV_USER_TG_ID;

    if (!devUserTgId) {
        const err = new Error('Developer user TG ID (DEV_USER_TG_ID) is not configured on the server.');
        err.statusCode = 500;
        err.code = 'DEV_LOGIN_NOT_CONFIGURED';
        return next(err);
    }

    try {
        // Find the developer user by their tg_id
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE tg_id = $1 AND deleted_at IS NULL',
            [devUserTgId]
        );

        if (users.length === 0) {
            const err = new Error(`Developer user with tg_id ${devUserTgId} not found in the database.`);
            err.statusCode = 404;
            err.code = 'DEV_USER_NOT_FOUND';
            return next(err);
        }

        const user = users[0];

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Exclude sensitive or unnecessary fields from the user object in response
        const { deleted_at, ...userResponse } = user;

        res.locals.data = {
            access: accessToken,
            refresh: refreshToken,
            user: userResponse
        };
        res.locals.message = 'Developer login successful';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = tmaDevLogin;
