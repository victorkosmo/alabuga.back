const pool = require('@db');

/**
 * @swagger
 * /telegram/campaigns:
 *   get:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: List user's campaigns
 *     description: Retrieves a list of all campaigns the authenticated user has joined.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of campaigns.
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
 *                     $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "User's campaigns retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listUserCampaigns = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                c.*
            FROM
                campaigns c
            JOIN
                user_campaigns uc ON c.id = uc.campaign_id
            WHERE
                uc.user_id = $1 AND c.deleted_at IS NULL
            ORDER BY
                uc.joined_at DESC
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = "User's campaigns retrieved successfully.";
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listUserCampaigns;
