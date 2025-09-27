const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /telegram/campaigns/{campaignId}/achievements:
 *   get:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: List user's earned achievements for a campaign
 *     description: Retrieves a list of achievements that the authenticated user has earned for a specific campaign.
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
 *         description: A list of earned achievements for the campaign.
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
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                         format: uri
 *                       awarded_at:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: "User's campaign achievements retrieved successfully."
 *       400:
 *         description: Invalid campaign ID format.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Campaign not found or user is not a participant.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listUserCampaignAchievements = async (req, res, next) => {
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

        const achievementsQuery = `
            SELECT
                ach.id,
                ach.name,
                ach.description,
                ach.image_url,
                ua.awarded_at
            FROM
                achievements ach
            JOIN
                user_achievements ua ON ach.id = ua.achievement_id
            WHERE
                ua.user_id = $1 AND ach.campaign_id = $2
            ORDER BY
                ua.awarded_at DESC;
        `;

        const { rows } = await pool.query(achievementsQuery, [userId, campaignId]);

        res.locals.data = rows;
        res.locals.message = "User's campaign achievements retrieved successfully.";
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listUserCampaignAchievements;
