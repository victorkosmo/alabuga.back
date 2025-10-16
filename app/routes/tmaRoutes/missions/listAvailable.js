const pool = require('@db');

/**
 * @swagger
 * /telegram/missions/available:
 *   get:
 *     tags:
 *       - Missions (TMA)
 *     summary: List available and locked missions grouped by campaign
 *     description: |
 *       Retrieves all non-completed missions for the authenticated user, grouped by the campaigns they have joined.
 *       Campaigns are ordered by the most recently joined. Only campaigns with at least one non-completed mission are returned.
 *       Each mission includes an `is_locked` flag indicating if it's accessible.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of campaigns with their respective available and locked missions.
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
 *                             required_achievement_id:
 *                               type: string
 *                               format: uuid
 *                               nullable: true
 *                             required_achievement_name:
 *                               type: string
 *                               nullable: true
 *                             is_locked:
 *                               type: boolean
 *                             completion_stats:
 *                               type: object
 *                               properties:
 *                                 total_completions:
 *                                   type: integer
 *                                   description: Total number of users who have completed this mission.
 *                                 completed_by:
 *                                   type: array
 *                                   description: A list of up to 5 users who have completed the mission, prioritized by avatar availability.
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                         format: uuid
 *                                       avatar_url:
 *                                         type: string
 *                                         format: uri
 *                                         nullable: true
 *                                       first_name:
 *                                         type: string
 *                                       last_name:
 *                                         type: string
 *                                         nullable: true
 *                 message:
 *                   type: string
 *                   example: "Available missions by campaign retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listAvailableMissions = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            WITH user_info AS (
                SELECT
                    u.id as user_id,
                    r.sequence_order as user_rank_order
                FROM users u
                JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $1
            ),
            user_campaigns_ordered AS (
                SELECT
                    uc.campaign_id,
                    c.title as campaign_title,
                    c.cover_url as campaign_cover_url,
                    uc.joined_at
                FROM user_campaigns uc
                JOIN campaigns c ON uc.campaign_id = c.id
                WHERE uc.user_id = $1 AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
            ),
            mission_completers_ranked AS (
                SELECT
                    mc.mission_id,
                    u.id as user_id,
                    u.avatar_url,
                    u.first_name,
                    u.last_name,
                    ROW_NUMBER() OVER(PARTITION BY mc.mission_id ORDER BY (u.avatar_url IS NOT NULL) DESC, mc.created_at DESC) as rn
                FROM mission_completions mc
                JOIN users u ON mc.user_id = u.id
                WHERE mc.status = 'APPROVED' AND u.deleted_at IS NULL
            ),
            mission_completion_stats AS (
                SELECT
                    mission_id,
                    COUNT(*) as total_completions,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', user_id,
                                'avatar_url', avatar_url,
                                'first_name', first_name,
                                'last_name', last_name
                            )
                        ) FILTER (WHERE rn <= 5),
                        '[]'::json
                    ) as completed_by
                FROM mission_completers_ranked
                GROUP BY mission_id
            ),
            campaign_missions AS (
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
                    m.required_achievement_id,
                    ach.name as required_achievement_name,
                    r_req.sequence_order as required_rank_order,
                    COALESCE(mcs.total_completions, 0)::INTEGER as total_completions,
                    COALESCE(mcs.completed_by, '[]'::json) as completed_by,
                    CASE
                        WHEN r_req.sequence_order > (SELECT user_rank_order FROM user_info) THEN true
                        WHEN m.required_achievement_id IS NOT NULL AND ua.user_id IS NULL THEN true
                        ELSE false
                    END as is_locked
                FROM
                    missions m
                JOIN
                    ranks r_req ON m.required_rank_id = r_req.id
                LEFT JOIN
                    achievements ach ON m.required_achievement_id = ach.id
                LEFT JOIN
                    user_achievements ua ON m.required_achievement_id = ua.achievement_id AND ua.user_id = $1
                LEFT JOIN
                    mission_completion_stats mcs ON m.id = mcs.mission_id
                WHERE
                    m.campaign_id IN (SELECT campaign_id FROM user_campaigns_ordered)
                    AND m.deleted_at IS NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM mission_completions mc
                        WHERE mc.mission_id = m.id AND mc.user_id = $1 AND mc.status = 'APPROVED'
                    )
            )
            SELECT
                uco.campaign_id,
                uco.campaign_title,
                uco.campaign_cover_url,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', cm.id,
                                'title', cm.title,
                                'description', cm.description,
                                'category', cm.category,
                                'cover_url', cm.cover_url,
                                'experience_reward', cm.experience_reward,
                                'mana_reward', cm.mana_reward,
                                'type', cm.type,
                                'required_achievement_id', cm.required_achievement_id,
                                'required_achievement_name', cm.required_achievement_name,
                                'is_locked', cm.is_locked,
                                'completion_stats', json_build_object(
                                    'total_completions', cm.total_completions,
                                    'completed_by', cm.completed_by
                                )
                            )
                            ORDER BY cm.is_locked ASC, cm.required_rank_order ASC, cm.id ASC
                        )
                        FROM campaign_missions cm
                        WHERE cm.campaign_id = uco.campaign_id
                    ),
                    '[]'::json
                ) as missions
            FROM
                user_campaigns_ordered uco
            WHERE EXISTS (
                SELECT 1 FROM campaign_missions cm WHERE cm.campaign_id = uco.campaign_id
            )
            ORDER BY
                uco.joined_at DESC;
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'Available missions by campaign retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listAvailableMissions;
