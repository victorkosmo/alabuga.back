const pool = require('@db');

/**
 * @swagger
 * /admin/users/count:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get total number of users
 *     description: Returns the total count of active users (non-deleted accounts)
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user count
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
 *                     count:
 *                       type: integer
 *                       example: 42
 *                 message:
 *                   type: string
 *                   example: "User count retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getUserCount = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT COUNT(id)::INTEGER as count FROM users WHERE deleted_at IS NULL'
        );

        res.locals.data = rows[0];
        res.locals.message = 'User count retrieved successfully';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getUserCount;
