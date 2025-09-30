const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /telegram/campaigns/{campaignId}:
 *   get:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: Get a specific campaign by ID
 *     description: Retrieves the details of a single campaign, but only if the authenticated user has joined it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the campaign to retrieve.
 *     responses:
 *       200:
 *         description: Campaign details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "Campaign details retrieved successfully."
 *       400:
 *         description: Invalid campaign ID format.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Campaign not found or user is not a participant.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCampaignById = async (req, res, next) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.userId;

        if (!isUUID(campaignId)) {
            const err = new Error('Invalid campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const query = `
            SELECT
                c.id,
                c.title,
                c.description,
                c.status,
                c.start_date,
                c.end_date,
                c.cover_url,
                COALESCE(
                    (
                        SELECT json_agg(ach ORDER BY a.created_at ASC)
                        FROM (
                            SELECT
                                a.id,
                                a.name,
                                a.description,
                                a.image_url,
                                a.experience_reward,
                                a.mana_reward,
                                CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END AS is_earned,
                                ua.awarded_at
                            FROM
                                achievements a
                            LEFT JOIN
                                user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
                            WHERE
                                a.campaign_id = c.id
                        ) ach
                    ),
                    '[]'::json
                ) AS achievements
            FROM
                campaigns c
            JOIN
                user_campaigns uc ON c.id = uc.campaign_id
            WHERE
                uc.user_id = $1 AND c.id = $2 AND c.deleted_at IS NULL
        `;

        const { rows } = await pool.query(query, [userId, campaignId]);

        if (rows.length === 0) {
            const err = new Error('Campaign not found or you are not a participant.');
            err.statusCode = 404;
            err.code = 'CAMPAIGN_NOT_FOUND_OR_NOT_JOINED';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Campaign details retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getCampaignById;
