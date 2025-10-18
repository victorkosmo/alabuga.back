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
 *                       campaign_title:
 *                         type: string
 *                         description: Title of the campaign this achievement belongs to.
 *                       campaign_icon_url:
 *                         type: string
 *                         nullable: true
 *                         description: Icon URL of the campaign this achievement belongs to.
 *                       required_mission_titles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: A list of mission titles required to unlock this achievement.
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
            WITH achievement_missions AS (
                SELECT
                    a.id AS achievement_id,
                    jsonb_agg(m.title) AS required_mission_titles
                FROM
                    achievements a
                CROSS JOIN LATERAL
                    jsonb_array_elements_text(a.unlock_conditions -> 'required_missions') AS mission_id
                JOIN
                    missions m ON m.id = mission_id::uuid
                WHERE
                    a.unlock_conditions ? 'required_missions'
                    AND jsonb_typeof(a.unlock_conditions -> 'required_missions') = 'array'
                GROUP BY
                    a.id
            )
            SELECT
                a.id,
                a.name,
                a.description,
                a.image_url,
                a.mana_reward,
                c.title AS campaign_title,
                c.icon_url as campaign_icon_url,
                COALESCE(am.required_mission_titles, '[]'::jsonb) AS required_mission_titles,
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
            LEFT JOIN
                achievement_missions am ON a.id = am.achievement_id
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
