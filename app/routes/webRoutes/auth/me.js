const pool = require('@db');

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - auth
 *     summary: Get current user details
 *     description: Retrieve the currently authenticated user's details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                 message:
 *                   type: string
 *                   example: "User details retrieved"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const getCurrentUser = async (req, res, next) => {
    try {
        const user = req.user;

        const { rows } = await pool.query(
            'SELECT id, email, username FROM users WHERE id = $1 AND deleted_at IS NULL',
            [user.userId]
        );

        if (rows.length === 0) {
            const err = new Error('User not found');
            err.statusCode = 404;
            err.code = 'USER_NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'User details retrieved';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getCurrentUser;
