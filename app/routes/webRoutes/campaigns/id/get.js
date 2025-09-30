// app/routes/webRoutes/campaigns/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/campaigns/{id}:
 *   get:
 *     tags:
 *       - Campaigns
 *     summary: Get a campaign by ID with its missions
 *     description: Retrieve a single campaign by its unique ID, including its associated missions. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the campaign to retrieve.
 *     responses:
 *       200:
 *         description: The requested campaign details, including an array of its missions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Campaign'
 *                     - type: object
 *                       properties:
 *                         current_participants:
 *                           type: integer
 *                           description: The number of users who have joined the campaign.
 *                           example: 25
 *                         stats:
 *                           type: object
 *                           description: Statistics for the campaign.
 *                           properties:
 *                             participants_joined:
 *                               type: integer
 *                               description: The total number of participants who have joined the campaign.
 *                               example: 25
 *                             participants_completed_one_mission:
 *                               type: integer
 *                               description: The number of participants who have completed at least one mission.
 *                               example: 15
 *                             participants_completed_all_missions:
 *                               type: integer
 *                               description: The number of participants who have completed all available missions.
 *                               example: 5
 *                         joining_link:
 *                           type: string
 *                           nullable: true
 *                           description: "The Telegram deep link for users to join the campaign. Null if BOT_USERNAME is not configured."
 *                           example: "https://t.me/my_awesome_tg_bot?start=join_123456"
 *                         missions:
 *                           type: array
 *                           description: A list of missions associated with the campaign, ordered by creation date.
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                               category:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                                 enum: [MANUAL_URL, QUIZ, QR_CODE, AI_CHECK]
 *                               experience_reward:
 *                                 type: integer
 *                               mana_reward:
 *                                 type: integer
 *                               required_achievement_name:
 *                                 type: string
 *                                 nullable: true
 *                                 description: "Name of the achievement required to unlock this mission."
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                               updated_at:
 *                                 type: string
 *                                 format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const campaignPromise = pool.query(
            'SELECT * FROM campaigns WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        const missionsPromise = pool.query(
            `SELECT
                m.id,
                m.title,
                m.description,
                m.category,
                m.type,
                m.experience_reward,
                m.mana_reward,
                m.created_at,
                m.updated_at,
                a.name as required_achievement_name
            FROM
                missions m
            LEFT JOIN
                achievements a ON m.required_achievement_id = a.id
            WHERE
                m.campaign_id = $1 AND m.deleted_at IS NULL
            ORDER BY
                m.created_at ASC`,
            [id]
        );

        const statsPromise = pool.query(
            `SELECT
                (SELECT COUNT(*)::INTEGER FROM user_campaigns uc WHERE uc.campaign_id = $1 AND uc.is_active = true) as participants_joined,
                (
                    SELECT COUNT(DISTINCT mc.user_id)::INTEGER
                    FROM mission_completions mc
                    JOIN missions m ON mc.mission_id = m.id
                    WHERE m.campaign_id = $1 AND mc.status = 'APPROVED' AND m.deleted_at IS NULL
                ) as participants_completed_one_mission,
                (
                    CASE
                        WHEN (SELECT COUNT(*) FROM missions m WHERE m.campaign_id = $1 AND m.deleted_at IS NULL) > 0
                        THEN (
                            WITH campaign_missions_count AS (
                                SELECT COUNT(*) as total FROM missions WHERE campaign_id = $1 AND deleted_at IS NULL
                            )
                            SELECT COUNT(*)::INTEGER
                            FROM (
                                SELECT 1
                                FROM mission_completions mc
                                JOIN missions m ON mc.mission_id = m.id
                                WHERE m.campaign_id = $1 AND mc.status = 'APPROVED' AND m.deleted_at IS NULL
                                GROUP BY mc.user_id
                                HAVING COUNT(DISTINCT mc.mission_id) = (SELECT total FROM campaign_missions_count)
                            ) as completed_all_users
                        )
                        ELSE 0
                    END
                ) as participants_completed_all_missions
            `,
            [id]
        );

        const [campaignResult, missionsResult, statsResult] = await Promise.all([
            campaignPromise,
            missionsPromise,
            statsPromise
        ]);

        if (campaignResult.rows.length === 0) {
            const err = new Error(`Campaign with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const campaign = campaignResult.rows[0];
        campaign.missions = missionsResult.rows;
        campaign.stats = statsResult.rows[0];
        campaign.current_participants = statsResult.rows[0].participants_joined;

        // Construct the joining link
        const botUsername = process.env.BOT_USERNAME;
        if (botUsername && campaign.activation_code) {
            campaign.joining_link = `https://t.me/${botUsername}?start=join_${campaign.activation_code}`;
        } else {
            campaign.joining_link = null;
            if (!botUsername) {
                // Log an error for the server admin, but don't fail the request
                console.error("Missing BOT_USERNAME in .env file. Cannot generate campaign join link.");
            }
        }

        res.locals.data = campaign;
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getCampaign;
