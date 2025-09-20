const jwt = require('jsonwebtoken');
const pool = require('@db');
const { generateAccessToken, generateRefreshToken } = require('@services/authService');

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth (Web)
 *     summary: Refresh manager tokens
 *     description: Refresh access and refresh tokens using a valid refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh
 *             properties:
 *               refresh:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
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
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refresh:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Tokens refreshed successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const refreshTokens = async (req, res, next) => {
    try {
        const { refresh } = req.body;

        if (!refresh) {
            const err = new Error('Refresh token is required');
            err.statusCode = 400;
            err.code = 'MISSING_TOKEN';
            return next(err);
        }

        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(refresh, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    const error = new Error('Invalid or expired refresh token');
                    error.statusCode = 401;
                    error.code = 'INVALID_TOKEN';
                    return reject(error);
                }
                resolve(decoded);
            });
        });

        const { rows } = await pool.query(
            'SELECT id, email, full_name, role FROM managers WHERE id = $1 AND deleted_at IS NULL',
            [decoded.userId]
        );

        if (rows.length === 0) {
            const err = new Error('Manager not found');
            err.statusCode = 404;
            err.code = 'MANAGER_NOT_FOUND';
            return next(err);
        }

        const manager = rows[0];
        const accessToken = generateAccessToken(manager);
        const refreshToken = generateRefreshToken(manager);

        res.locals.data = {
            access: accessToken,
            refresh: refreshToken
        };
        res.locals.message = 'Tokens refreshed successfully';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = refreshTokens;
