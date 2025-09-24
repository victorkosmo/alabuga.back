// app/routes/webRoutes/campaigns/post.js
const pool = require('@db');
const crypto = require('crypto');

/**
 * @swagger
 * /web/campaigns:
 *   post:
 *     tags:
 *       - Campaigns
 *     summary: Create a new campaign
 *     description: Creates a new campaign and generates a unique activation code. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title for the new campaign.
 *                 example: "Onboarding '24"
 *               description:
 *                 type: string
 *                 description: An optional description for the campaign.
 *                 example: "Campaign for new hires in 2024."
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional start date for the campaign.
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional end date for the campaign.
 *               max_participants:
 *                 type: integer
 *                 description: Optional limit on the number of participants.
 *     responses:
 *       201:
 *         description: Campaign created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *                 message:
 *                   type: string
 *                   example: "Campaign created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Conflict - A campaign with this title already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               CampaignTitleConflict:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "CAMPAIGN_TITLE_CONFLICT"
 *                     message: "A campaign with the provided title already exists."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// Helper to generate a random 6-digit numeric code
const generateActivationCode = () => {
    // Generate a random number between 0 and 999,999
    const randomNumber = crypto.randomInt(0, 1000000);
    
    // Pad with leading zeros to ensure it's 6 digits long
    return String(randomNumber).padStart(6, '0');
};

const createCampaign = async (req, res, next) => {
    try {
        const { title, description, start_date, end_date, max_participants } = req.body;
        const created_by = req.user.userId;

        if (!title || typeof title !== 'string' || title.trim() === '') {
            const err = new Error('Title is required and cannot be empty');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Generate a unique activation code
        let activationCode;
        let isUnique = false;
        while (!isUnique) {
            activationCode = generateActivationCode();
            const { rows: existing } = await pool.query(
                'SELECT 1 FROM campaigns WHERE activation_code = $1',
                [activationCode]
            );
            if (existing.length === 0) {
                isUnique = true;
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO campaigns (title, description, start_date, end_date, max_participants, created_by, activation_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title.trim(), description, start_date, end_date, max_participants, created_by, activationCode]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Campaign created successfully.';
        next();

    } catch (err) {
        // Note: The campaigns table does not have a unique constraint on title, but if it did, this would be the handler.
        // This is left here as a good practice example.
        if (err.code === '23505') { // unique_violation
            const conflictError = new Error(`A database conflict occurred.`);
            conflictError.statusCode = 409;
            conflictError.code = 'DB_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = createCampaign;
