const pool = require('@db');

/**
 * @swagger
 * /telegram/missions/completed:
 *   get:
 *     tags:
 *       - Missions (TMA)
 *     summary: List all completed missions for the user
 *     description: |
 *       Retrieves all missions that the authenticated user has successfully completed.
 *       The missions are returned in descending order of completion time.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of completed missions.
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       cover_url:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       experience_reward:
 *                         type: integer
 *                       mana_reward:
 *                         type: integer
 *                       type:
 *                         type: string
 *                         enum: [MANUAL_URL, QUIZ, QR_CODE, AI_CHECK]
 *                       campaign_id:
 *                         type: string
 *                         format: uuid
 *                       campaign_title:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: "Completed missions retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listCompletedMissions = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                m.id,
                m.title,
                m.description,
                m.category,
                m.cover_url,
                m.experience_reward,
                m.mana_reward,
                m.type,
                c.id as campaign_id,
                c.title as campaign_title,
                mc.updated_at as completed_at
            FROM
                missions m
            JOIN
                mission_completions mc ON m.id = mc.mission_id
            JOIN
                campaigns c ON m.campaign_id = c.id
            WHERE
                mc.user_id = $1
                AND mc.status = 'APPROVED'
                AND m.deleted_at IS NULL
                AND c.deleted_at IS NULL
            ORDER BY
                mc.updated_at DESC;
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'Completed missions retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listCompletedMissions;
