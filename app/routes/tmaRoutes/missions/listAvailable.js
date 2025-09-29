const pool = require('@db');

/**
 * @swagger
 * /telegram/missions/available:
 *   get:
 *     tags:
 *       - Missions (TMA)
 *     summary: List all available and locked missions for the user
 *     description: |
 *       Retrieves all missions for the authenticated user from all active campaigns they have joined.
 *       It separates missions into two lists: 'available_missions' (which the user can currently attempt)
 *       and 'locked_missions' (which are not yet accessible due to rank or achievement requirements).
 *       Completed missions are excluded from both lists.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of available and locked missions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available_missions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MissionTMA'
 *                     locked_missions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MissionTMA'
 *                 message:
 *                   type: string
 *                   example: "Available missions retrieved successfully."
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
            user_campaigns_active AS (
                SELECT uc.campaign_id
                FROM user_campaigns uc
                JOIN campaigns c ON uc.campaign_id = c.id
                WHERE uc.user_id = $1 AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
            )
            SELECT
                m.id,
                m.title,
                m.description,
                m.category,
                m.experience_reward,
                m.mana_reward,
                m.type,
                m.required_achievement_id,
                c.id as campaign_id,
                c.title as campaign_title,
                ach.name as required_achievement_name,
                CASE
                    WHEN r_req.sequence_order > (SELECT user_rank_order FROM user_info) THEN true
                    WHEN m.required_achievement_id IS NOT NULL AND ua.user_id IS NULL THEN true
                    ELSE false
                END as is_locked
            FROM
                missions m
            JOIN
                campaigns c ON m.campaign_id = c.id
            JOIN
                ranks r_req ON m.required_rank_id = r_req.id
            LEFT JOIN
                achievements ach ON m.required_achievement_id = ach.id
            LEFT JOIN
                user_achievements ua ON m.required_achievement_id = ua.achievement_id AND ua.user_id = $1
            WHERE
                m.campaign_id IN (SELECT campaign_id FROM user_campaigns_active)
                AND m.deleted_at IS NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM mission_completions mc
                    WHERE mc.mission_id = m.id AND mc.user_id = $1 AND mc.status = 'APPROVED'
                )
            ORDER BY
                is_locked ASC, c.title ASC, r_req.sequence_order ASC, m.created_at ASC;
        `;

        const { rows } = await pool.query(query, [userId]);

        const available_missions = [];
        const locked_missions = [];

        rows.forEach(mission => {
            const { is_locked, ...missionData } = mission;
            if (is_locked) {
                locked_missions.push(missionData);
            } else {
                available_missions.push(missionData);
            }
        });

        res.locals.data = { available_missions, locked_missions };
        res.locals.message = 'Available missions retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listAvailableMissions;
