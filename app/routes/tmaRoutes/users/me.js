const pool = require('@db');

/**
 * @swagger
 * /tma/users/me:
 *   get:
 *     tags:
 *       - Users (TMA)
 *     summary: Get current user profile
 *     description: Retrieves the complete profile for the authenticated Telegram Mini App user, including their rank.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
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
 *                     tg_id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                     experience_points:
 *                       type: integer
 *                     mana_points:
 *                       type: integer
 *                     rank_id:
 *                       type: string
 *                       format: uuid
 *                     rank_title:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Current user profile retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                u.id,
                u.tg_id,
                u.username,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.experience_points,
                u.mana_points,
                u.rank_id,
                r.title as rank_title
            FROM
                users u
            JOIN
                ranks r ON u.rank_id = r.id
            WHERE
                u.id = $1 AND u.deleted_at IS NULL
        `;

        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            const err = new Error('User not found');
            err.statusCode = 404;
            err.code = 'USER_NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Current user profile retrieved successfully';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getCurrentUser;
