// app/routes/webRoutes/missions/typeUrl/post.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-url:
 *   post:
 *     tags:
 *       - Missions
 *     summary: Create a new URL-based mission
 *     description: Creates a new mission of type 'MANUAL_URL'. This involves creating a record in both the `missions` and `mission_manual_details` tables within a single transaction.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_id
 *               - title
 *               - category
 *               - required_rank_id
 *               - submission_prompt
 *             properties:
 *               campaign_id:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the campaign this mission belongs to.
 *               title:
 *                 type: string
 *                 example: "Submit Your GitHub Profile"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Campaign for new hires in 2024."
 *               category:
 *                 type: string
 *                 example: "Portfolio"
 *               required_rank_id:
 *                 type: string
 *                 format: uuid
 *                 description: The minimum rank required to access this mission.
 *               experience_reward:
 *                 type: integer
 *                 default: 0
 *               mana_reward:
 *                 type: integer
 *                 default: 0
 *               submission_prompt:
 *                 type: string
 *                 description: The prompt displayed to the user for the submission.
 *                 example: "Please provide the full URL to your public GitHub profile."
 *               placeholder_text:
 *                 type: string
 *                 nullable: true
 *                 example: "https://github.com/username"
 *     responses:
 *       201:
 *         description: Mission created successfully.
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
 *                     - $ref: '#/components/schemas/Mission'
 *                     - type: object
 *                       properties:
 *                         details:
 *                           type: object
 *                           properties:
 *                             submission_prompt:
 *                               type: string
 *                             placeholder_text:
 *                               type: string
 *                 message:
 *                   type: string
 *                   example: "Mission created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createUrlMission = async (req, res, next) => {
    const {
        campaign_id,
        title,
        description,
        category,
        required_rank_id,
        experience_reward = 0,
        mana_reward = 0,
        submission_prompt,
        placeholder_text
    } = req.body;
    const created_by = req.user.userId;

    // Basic validation
    if (!title || !category || !submission_prompt || !campaign_id || !required_rank_id) {
        const err = new Error('Missing required fields: campaign_id, title, category, required_rank_id, submission_prompt.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }
    if (!isUUID(campaign_id) || !isUUID(required_rank_id)) {
        const err = new Error('Invalid UUID format for campaign_id or required_rank_id.');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const missionQuery = `
            INSERT INTO missions (
                campaign_id, title, description, category, required_rank_id, 
                experience_reward, mana_reward, type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'MANUAL_URL', $8)
            RETURNING *;
        `;
        const missionParams = [
            campaign_id, title, description, category, required_rank_id,
            experience_reward, mana_reward, created_by
        ];
        const missionResult = await client.query(missionQuery, missionParams);
        const newMission = missionResult.rows[0];

        const detailsQuery = `
            INSERT INTO mission_manual_details (mission_id, submission_prompt, placeholder_text)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const detailsParams = [newMission.id, submission_prompt, placeholder_text];
        const detailsResult = await client.query(detailsQuery, detailsParams);
        const newDetails = detailsResult.rows[0];

        await client.query('COMMIT');

        res.locals.data = {
            ...newMission,
            details: {
                submission_prompt: newDetails.submission_prompt,
                placeholder_text: newDetails.placeholder_text
            }
        };
        res.locals.statusCode = 201;
        res.locals.message = 'Mission created successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = createUrlMission;
