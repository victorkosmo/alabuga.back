const pool = require('@db');

/**
 * @swagger
 * /telegram/missions/completed:
 *   get:
 *     tags:
 *       - Missions (TMA)
 *     summary: List completed missions grouped by campaign
 *     description: |
 *       Retrieves all missions that the authenticated user has successfully completed, grouped by the campaigns they have joined.
 *       Campaigns are ordered by the most recently joined. Only campaigns with at least one completed mission are returned.
 *       Missions within each campaign are ordered by completion time, with the most recent first.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of campaigns with their respective completed missions.
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
 *                       campaign_id:
 *                         type: string
 *                         format: uuid
 *                       campaign_title:
 *                         type: string
 *                       campaign_cover_url:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       missions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *                             category:
 *                               type: string
 *                             cover_url:
 *                               type: string
 *                               format: uri
 *                               nullable: true
 *                             experience_reward:
 *                               type: integer
 *                             mana_reward:
 *                               type: integer
 *                             type:
 *                               type: string
 *                             completed_at:
 *                               type: string
 *                               format: date-time
 *                 message:
 *                   type: string
 *                   example: "Completed missions by campaign retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listCompletedMissions = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            WITH user_campaigns_ordered AS (
                SELECT
                    uc.campaign_id,
                    c.title as campaign_title,
                    c.cover_url as campaign_cover_url,
                    uc.joined_at
                FROM user_campaigns uc
                JOIN campaigns c ON uc.campaign_id = c.id
                WHERE uc.user_id = $1 AND c.deleted_at IS NULL
            ),
            completed_campaign_missions AS (
                SELECT
                    m.campaign_id,
                    m.id,
                    m.title,
                    m.description,
                    m.category,
                    m.cover_url,
                    m.experience_reward,
                    m.mana_reward,
                    m.type,
                    mc.updated_at as completed_at
                FROM
                    missions m
                JOIN
                    mission_completions mc ON m.id = mc.mission_id
                WHERE
                    mc.user_id = $1
                    AND mc.status = 'APPROVED'
                    AND m.deleted_at IS NULL
                    AND m.campaign_id IN (SELECT campaign_id FROM user_campaigns_ordered)
            )
            SELECT
                uco.campaign_id,
                uco.campaign_title,
                uco.campaign_cover_url,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', ccm.id,
                                'title', ccm.title,
                                'description', ccm.description,
                                'category', ccm.category,
                                'cover_url', ccm.cover_url,
                                'experience_reward', ccm.experience_reward,
                                'mana_reward', ccm.mana_reward,
                                'type', ccm.type,
                                'completed_at', ccm.completed_at
                            )
                            ORDER BY ccm.completed_at DESC
                        )
                        FROM completed_campaign_missions ccm
                        WHERE ccm.campaign_id = uco.campaign_id
                    ),
                    '[]'::json
                ) as missions
            FROM
                user_campaigns_ordered uco
            WHERE EXISTS (
                SELECT 1 FROM completed_campaign_missions ccm WHERE ccm.campaign_id = uco.campaign_id
            )
            ORDER BY
                uco.joined_at DESC;
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'Completed missions by campaign retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listCompletedMissions;
