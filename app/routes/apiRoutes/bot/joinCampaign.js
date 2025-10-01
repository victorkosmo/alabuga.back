// app/routes/apiRoutes/bot/joinCampaign.js
const pool = require('@db');

/**
 * @swagger
 * /api/bot/join-campaign:
 *   post:
 *     tags:
 *       - API - Bot
 *     summary: Join a campaign via bot deep link
 *     description: Finds or creates a user based on Telegram ID and joins them to a campaign using an activation code. This is intended to be called by the Telegram bot service.
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tg_user
 *               - activation_code
 *             properties:
 *               tg_user:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Telegram user ID.
 *                   username:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                 example:
 *                   id: 123456789
 *                   username: "testuser"
 *                   first_name: "Test"
 *                   last_name: "User"
 *               activation_code:
 *                 type: string
 *                 description: The activation code for the campaign.
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
 *                 message:
 *                   type: string
 *                   example: "You have successfully joined the campaign \"Cosmic Ascent Onboarding\"!"
 *       400:
 *         description: Bad request (e.g., invalid code, missing data, campaign full).
 *       404:
 *         description: Campaign not found.
 *       409:
 *         description: User has already joined this campaign.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const joinCampaignByCode = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { tg_user, activation_code } = req.body;

        if (!tg_user || !tg_user.id || !activation_code) {
            const err = new Error('Missing required fields: tg_user and activation_code.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        await client.query('BEGIN');

        // 1. Find or create user
        let user;
        const userQuery = 'SELECT id FROM users WHERE tg_id = $1';
        const { rows: userRows } = await client.query(userQuery, [tg_user.id]);

        if (userRows.length > 0) {
            user = userRows[0];
        } else {
            // Find the default rank (the one with the lowest sequence_order)
            const defaultRankQuery = 'SELECT id FROM ranks WHERE sequence_order = (SELECT MIN(sequence_order) FROM ranks WHERE deleted_at IS NULL) AND deleted_at IS NULL LIMIT 1';
            const { rows: rankRows } = await client.query(defaultRankQuery);

            if (rankRows.length === 0) {
                const err = new Error('Initial rank not configured in the system. Cannot create new user.');
                err.statusCode = 500;
                err.code = 'NO_INITIAL_RANK';
                await client.query('ROLLBACK');
                return next(err);
            }
            const defaultRankId = rankRows[0].id;

            const insertUserQuery = `
                INSERT INTO users (tg_id, username, first_name, last_name, rank_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            const { rows: newUserRows } = await client.query(insertUserQuery, [
                tg_user.id,
                tg_user.username,
                tg_user.first_name,
                tg_user.last_name,
                defaultRankId
            ]);
            user = newUserRows[0];
        }
        const userId = user.id;

        // 2. Find the campaign
        const campaignQuery = `
            SELECT id, title, status, start_date, end_date, max_participants, cover_url
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

        // 3. Validate campaign status and dates
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

        // 4. Check if user has already joined
        const existingJoinQuery = 'SELECT 1 FROM user_campaigns WHERE user_id = $1 AND campaign_id = $2';
        const { rows: existingJoinRows } = await client.query(existingJoinQuery, [userId, campaign.id]);

        if (existingJoinRows.length > 0) {
            const err = new Error('You have already joined this campaign.');
            err.statusCode = 409;
            err.code = 'ALREADY_JOINED';
            await client.query('ROLLBACK');
            return next(err);
        }

        // 5. Check participant limit
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

        // 6. Add user to campaign
        await client.query(
            'INSERT INTO user_campaigns (user_id, campaign_id) VALUES ($1, $2)',
            [userId, campaign.id]
        );

        await client.query('COMMIT');
        
        const tmaUrl = `${process.env.TMA_URL}/campaign/${campaign.id}`;

        res.locals.data = {
            campaign_id: campaign.id,
            title: campaign.title,
            campaign_cover_url: campaign.cover_url,
            campaign_tma_url: tmaUrl,
        };
        // Message for internal logging ONLY. The bot will ignore this on success.
        res.locals.message = `User ${tg_user.id} successfully joined campaign ${campaign.id}.`;
        next();

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Error during transaction rollback:', rollbackErr);
        }
        next(err);
    } finally {
        client.release();
    }
};

module.exports = joinCampaignByCode;
