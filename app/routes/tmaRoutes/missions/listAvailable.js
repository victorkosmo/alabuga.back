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
 *                       campaign_icon_url:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       achievements:
 *                         type: array
 *                         description: "List of achievements available in this campaign."
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             image_url:
 *                               type: string
 *                               format: uri
 *                               nullable: true
 *                             experience_reward:
 *                               type: integer
 *                             mana_reward:
 *                               type: integer
 *                             is_earned:
 *                               type: boolean
 *                               description: "Whether the user has earned this achievement."
 *                             awarded_at:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                             required_missions:
 *                               type: array
 *                               description: "List of missions required to unlock this achievement."
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     format: uuid
 *                                   title:
 *                                     type: string
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
 *                             required_achievement_image_url:
 *                               type: string
 *                               format: uri
 *                               nullable: true
 *                               description: The image URL of the achievement required to unlock this mission.
 *                             submission_status:
 *                               type: string
 *                               enum: [PENDING_REVIEW, APPROVED, REJECTED]
 *                               nullable: true
 *                               description: The status of the user's latest submission for this mission. Null if no submission has been made.
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
                    COALESCE(r.priority, -1) as user_rank_order
                FROM users u
                LEFT JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $1
            ),
            user_campaigns_ordered AS (
                SELECT
                    uc.campaign_id,
                    c.title as campaign_title,
                    c.cover_url as campaign_cover_url,
                    c.icon_url as campaign_icon_url,
                    uc.joined_at
                FROM user_campaigns uc
                JOIN campaigns c ON uc.campaign_id = c.id
                WHERE uc.user_id = $1 AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
            ),
            campaign_achievements AS (
                SELECT
                    a.campaign_id,
                    a.created_at,
                    json_build_object(
                        'id', a.id,
                        'name', a.name,
                        'description', a.description,
                        'image_url', a.image_url,
                        'experience_reward', a.experience_reward,
                        'mana_reward', a.mana_reward,
                        'is_earned', CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END,
                        'awarded_at', ua.awarded_at,
                        'required_missions', COALESCE(
                            (
                                SELECT json_agg(json_build_object('id', m.id, 'title', m.title))
                                FROM missions m
                                WHERE m.deleted_at IS NULL AND m.id IN (
                                    SELECT (value::uuid)
                                    FROM jsonb_array_elements_text(a.unlock_conditions -> 'required_missions')
                                )
                            ),
                            '[]'::json
                        )
                    ) as achievement_object
                FROM
                    achievements a
                LEFT JOIN
                    user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
                WHERE
                    a.campaign_id IN (SELECT campaign_id FROM user_campaigns_ordered)
            ),
            latest_user_completions AS (
                SELECT
                    mission_id,
                    status,
                    ROW_NUMBER() OVER(PARTITION BY mission_id ORDER BY created_at DESC) as rn
                FROM mission_completions
                WHERE user_id = $1
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
                    ach.image_url as required_achievement_image_url,
                    luc.status as submission_status,
                    COALESCE(r_req.priority, 9999) as required_rank_order, -- Use a high number for missions without rank requirement
                    COALESCE(mcs.total_completions, 0)::INTEGER as total_completions,
                    COALESCE(mcs.completed_by, '[]'::json) as completed_by,
                    CASE
                        WHEN r_req.id IS NOT NULL AND r_req.priority > (SELECT user_rank_order FROM user_info) THEN true
                        WHEN m.required_achievement_id IS NOT NULL AND ua.user_id IS NULL THEN true
                        ELSE false
                    END as is_locked
                FROM
                    missions m
                LEFT JOIN
                    ranks r_req ON m.required_rank_id = r_req.id
                LEFT JOIN
                    achievements ach ON m.required_achievement_id = ach.id
                LEFT JOIN
                    user_achievements ua ON m.required_achievement_id = ua.achievement_id AND ua.user_id = $1
                LEFT JOIN
                    mission_completion_stats mcs ON m.id = mcs.mission_id
                LEFT JOIN
                    latest_user_completions luc ON m.id = luc.mission_id AND luc.rn = 1
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
                uco.campaign_icon_url,
                COALESCE(
                    (
                        SELECT json_agg(ca.achievement_object ORDER BY ca.created_at ASC)
                        FROM campaign_achievements ca
                        WHERE ca.campaign_id = uco.campaign_id
                    ),
                    '[]'::json
                ) as achievements,
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
                                'required_achievement_image_url', cm.required_achievement_image_url,
                                'submission_status', cm.submission_status,
                                'is_locked', cm.is_locked,
                                'completion_stats', json_build_object(
                                    'total_completions', cm.total_completions,
                                    'completed_by', cm.completed_by
                                )
                            )
                            ORDER BY cm.is_locked ASC, COALESCE(cm.required_rank_order, 9999) ASC, cm.id ASC
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
