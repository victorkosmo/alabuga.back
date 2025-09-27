const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /telegram/campaigns/{campaignId}/missions:
 *   get:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: List available missions for a campaign
 *     description: |
 *       Retrieves a list of missions for a specific campaign, tailored for the authenticated user.
 *       It includes flags indicating if a mission is completed by the user or locked due to rank requirements.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the campaign.
 *     responses:
 *       200:
 *         description: A list of missions for the campaign.
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
 *                       experience_reward:
 *                         type: integer
 *                       mana_reward:
 *                         type: integer
 *                       type:
 *                         type: string
 *                         enum: [MANUAL_URL, QUIZ, QR_CODE]
 *                       required_achievement_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                         description: The ID of the achievement required to unlock this mission.
 *                       is_completed:
 *                         type: boolean
 *                         description: True if the user has successfully completed this mission.
 *                       is_locked:
 *                         type: boolean
 *                         description: True if the user's rank is too low or they haven't earned a required achievement.
 *                 message:
 *                   type: string
 *                   example: "Campaign missions retrieved successfully."
 *       400:
 *         description: Invalid campaign ID format.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Campaign not found or user is not a participant.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listCampaignMissions = async (req, res, next) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.userId;

        if (!isUUID(campaignId)) {
            const err = new Error('Invalid campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check if campaign exists and user is part of it
        const campaignCheckQuery = `
            SELECT 1 FROM user_campaigns 
            WHERE user_id = $1 AND campaign_id = $2
        `;
        const { rows: campaignCheckRows } = await pool.query(campaignCheckQuery, [userId, campaignId]);

        if (campaignCheckRows.length === 0) {
            const err = new Error('Campaign not found or you are not a participant.');
            err.statusCode = 404;
            err.code = 'CAMPAIGN_NOT_FOUND_OR_NOT_JOINED';
            return next(err);
        }

        const missionsQuery = `
            WITH user_rank AS (
                SELECT r.sequence_order
                FROM users u
                JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $1
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
                CASE
                    WHEN mc.id IS NOT NULL THEN true
                    ELSE false
                END as is_completed,
                CASE
                    WHEN r_req.sequence_order > (SELECT sequence_order FROM user_rank) THEN true
                    WHEN m.required_achievement_id IS NOT NULL AND ua.user_id IS NULL THEN true
                    ELSE false
                END as is_locked
            FROM
                missions m
            JOIN
                ranks r_req ON m.required_rank_id = r_req.id
            LEFT JOIN
                mission_completions mc ON m.id = mc.mission_id AND mc.user_id = $1 AND mc.status = 'APPROVED'
            LEFT JOIN
                user_achievements ua ON m.required_achievement_id = ua.achievement_id AND ua.user_id = $1
            WHERE
                m.campaign_id = $2
                AND m.deleted_at IS NULL
            ORDER BY
                r_req.sequence_order ASC, m.created_at ASC;
        `;

        const { rows } = await pool.query(missionsQuery, [userId, campaignId]);

        res.locals.data = rows;
        res.locals.message = 'Campaign missions retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listCampaignMissions;
