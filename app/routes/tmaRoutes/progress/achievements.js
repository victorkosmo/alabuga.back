const pool = require('@db');

/**
 * @swagger
 * /telegram/progress/achievements:
 *   get:
 *     tags:
 *       - Progress (TMA)
 *     summary: Get user's achievement progress across all their campaigns
 *     description: Retrieves a list of all achievements from campaigns the user is participating in, indicating which ones have been completed.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of achievements with user completion status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Achievement ID.
 *                       name:
 *                         type: string
 *                         description: Name of the achievement.
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: Description of the achievement.
 *                       image_url:
 *                         type: string
 *                         nullable: true
 *                         description: URL to the achievement badge image.
 *                       mana_reward:
 *                         type: integer
 *                         description: Mana points awarded for this achievement.
 *                       campaign_icon_url:
 *                         type: string
 *                         nullable: true
 *                         description: Icon URL of the campaign this achievement belongs to.
 *                       is_completed:
 *                         type: boolean
 *                         description: True if the user has earned this achievement.
 *                       awarded_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: Timestamp when the achievement was awarded. Null if not completed.
 *                 message:
 *                   type: string
 *                   example: "User achievement progress retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getUserAchievementsProgress = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                a.id,
                a.name,
                a.description,
                a.image_url,
                a.mana_reward,
                c.icon_url as campaign_icon_url,
                CASE
                    WHEN ua.user_id IS NOT NULL THEN true
                    ELSE false
                END as is_completed,
                ua.awarded_at
            FROM
                achievements a
            JOIN
                campaigns c ON a.campaign_id = c.id
            JOIN
                user_campaigns uc ON a.campaign_id = uc.campaign_id
            LEFT JOIN
                user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
            WHERE
                uc.user_id = $1 AND c.deleted_at IS NULL
            ORDER BY
                c.created_at, a.created_at;
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'User achievement progress retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getUserAchievementsProgress;
