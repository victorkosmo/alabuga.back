const pool = require('@db');

/**
 * @swagger
 * /telegram/campaigns/join:
 *   post:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: Join a campaign
 *     description: Allows an authenticated user to join a campaign by providing a valid activation code.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activation_code
 *             properties:
 *               activation_code:
 *                 type: string
 *                 description: The 6-digit activation code for the campaign.
 *                 example: "700697"
 *     responses:
 *       200:
 *         description: Successfully joined the campaign.
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
 *                   example: "Successfully joined campaign."
 *       400:
 *         description: Bad request (e.g., invalid code format, missing code).
 *       404:
 *         description: Campaign not found or not active.
 *       409:
 *         description: User has already joined this campaign.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const joinCampaign = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { activation_code } = req.body;
        const userId = req.user.userId;

        if (!activation_code || typeof activation_code !== 'string' || !/^\d{6}$/.test(activation_code)) {
            const err = new Error('A valid 6-digit activation code is required.');
            err.statusCode = 400;
            err.code = 'INVALID_ACTIVATION_CODE';
            return next(err);
        }

        await client.query('BEGIN');

        // Find the campaign
        const campaignQuery = `
            SELECT id, status, start_date, end_date, max_participants
            FROM campaigns
            WHERE activation_code = $1 AND deleted_at IS NULL
            FOR UPDATE
        `;
        const { rows: campaignRows } = await client.query(campaignQuery, [activation_code]);

        if (campaignRows.length === 0) {
            const err = new Error('Campaign not found or activation code is invalid.');
            err.statusCode = 404;
            err.code = 'CAMPAIGN_NOT_FOUND';
            await client.query('ROLLBACK');
            return next(err);
        }

        const campaign = campaignRows[0];

        // Validate campaign status and dates
        if (campaign.status !== 'ACTIVE') {
            const err = new Error('This campaign is not currently active.');
            err.statusCode = 400;
            err.code = 'CAMPAIGN_NOT_ACTIVE';
            await client.query('ROLLBACK');
            return next(err);
        }

        const now = new Date();
        if (campaign.start_date && new Date(campaign.start_date) > now) {
            const err = new Error('This campaign has not started yet.');
            err.statusCode = 400;
            err.code = 'CAMPAIGN_NOT_STARTED';
            await client.query('ROLLBACK');
            return next(err);
        }

        if (campaign.end_date && new Date(campaign.end_date) < now) {
            const err = new Error('This campaign has already ended.');
            err.statusCode = 400;
            err.code = 'CAMPAIGN_ENDED';
            await client.query('ROLLBACK');
            return next(err);
        }

        // Check if user has already joined
        const existingJoinQuery = 'SELECT 1 FROM user_campaigns WHERE user_id = $1 AND campaign_id = $2';
        const { rows: existingJoinRows } = await client.query(existingJoinQuery, [userId, campaign.id]);

        if (existingJoinRows.length > 0) {
            const err = new Error('You have already joined this campaign.');
            err.statusCode = 409;
            err.code = 'ALREADY_JOINED';
            await client.query('ROLLBACK');
            return next(err);
        }

        // Check participant limit
        if (campaign.max_participants !== null) {
            const participantCountQuery = 'SELECT COUNT(*) as count FROM user_campaigns WHERE campaign_id = $1';
            const { rows: countRows } = await client.query(participantCountQuery, [campaign.id]);
            const participantCount = parseInt(countRows[0].count, 10);

            if (participantCount >= campaign.max_participants) {
                const err = new Error('This campaign has reached its maximum number of participants.');
                err.statusCode = 400;
                err.code = 'CAMPAIGN_FULL';
                await client.query('ROLLBACK');
                return next(err);
            }
        }

        // Add user to campaign
        await client.query(
            'INSERT INTO user_campaigns (user_id, campaign_id) VALUES ($1, $2)',
            [userId, campaign.id]
        );

        // Fetch the full campaign details to return
        const { rows: finalCampaignRows } = await client.query(
            'SELECT * FROM campaigns WHERE id = $1',
            [campaign.id]
        );

        await client.query('COMMIT');

        res.locals.data = finalCampaignRows[0];
        res.locals.message = 'Successfully joined campaign.';
        next();

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            // If rollback fails, log it, but don't shadow the original error
            console.error('Error during transaction rollback:', rollbackErr);
        }
        next(err);
    } finally {
        client.release();
    }
};

module.exports = joinCampaign;
