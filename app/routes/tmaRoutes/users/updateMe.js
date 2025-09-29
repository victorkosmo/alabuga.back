const pool = require('@db');

/**
 * @swagger
 * /telegram/users/me:
 *   put:
 *     tags:
 *       - Users (TMA)
 *     summary: Update current user profile
 *     description: Updates the profile for the authenticated Telegram Mini App user. Allows changing first_name and last_name.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 description: "User's new first name."
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 description: "User's new last name. Can be null or empty."
 *                 example: "Doe"
 *             required:
 *               - first_name
 *     responses:
 *       200:
 *         description: User profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfileTMA'
 *                 message:
 *                   type: string
 *                   example: "User profile updated successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { first_name, last_name } = req.body;

        if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
            const err = new Error('first_name is required and must be a non-empty string.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (last_name !== undefined && last_name !== null && typeof last_name !== 'string') {
            const err = new Error('If provided, last_name must be a string.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const query = `
            WITH updated_user AS (
                UPDATE users
                SET
                    first_name = $2,
                    last_name = $3,
                    updated_at = now()
                WHERE id = $1 AND deleted_at IS NULL
                RETURNING *
            )
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
                updated_user u
            JOIN
                ranks r ON u.rank_id = r.id;
        `;

        const { rows } = await pool.query(query, [userId, first_name.trim(), last_name ? last_name.trim() : null]);

        if (rows.length === 0) {
            const err = new Error('User not found or could not be updated.');
            err.statusCode = 404;
            err.code = 'USER_NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'User profile updated successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = updateCurrentUser;
