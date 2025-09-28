// app/routes/webRoutes/missions/typeQr/post.js
const pool = require('@db');
const { isUUID } = require('validator');
const crypto = require('crypto');

const generateCompletionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return result;
};

/**
 * @swagger
 * /web/missions/type-qr:
 *   post:
 *     tags:
 *       - Missions
 *     summary: Create a new QR code-based mission
 *     description: Creates a new mission of type 'QR_CODE'. This involves creating a record in the `missions` table and generating a unique completion code stored in `mission_qr_details`.
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
 *             properties:
 *               campaign_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *               required_achievement_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               experience_reward:
 *                 type: integer
 *                 default: 0
 *               mana_reward:
 *                 type: integer
 *                 default: 0
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
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Mission'
 *                     - type: object
 *                       properties:
 *                         details:
 *                           type: object
 *                           properties:
 *                             completion_code:
 *                               type: string
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createQrMission = async (req, res, next) => {
    const {
        campaign_id,
        title,
        description,
        category,
        required_achievement_id,
        experience_reward = 0,
        mana_reward = 0
    } = req.body;
    const created_by = req.user.userId;

    // Basic validation
    if (!title || !category || !campaign_id) {
        const err = new Error('Missing required fields: campaign_id, title, category.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }
    if (!isUUID(campaign_id) || (required_achievement_id && !isUUID(required_achievement_id))) {
        const err = new Error('Invalid UUID format for campaign_id or required_achievement_id.');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const rankQuery = 'SELECT id FROM ranks WHERE deleted_at IS NULL ORDER BY sequence_order ASC LIMIT 1';
        const rankResult = await client.query(rankQuery);

        if (rankResult.rowCount === 0) {
            const err = new Error('No ranks found in the system. Cannot create a mission.');
            err.statusCode = 400;
            err.code = 'NO_RANKS_FOUND';
            throw err;
        }
        const defaultRankId = rankResult.rows[0].id;

        const missionQuery = `
            INSERT INTO missions (
                campaign_id, title, description, category, required_rank_id, 
                required_achievement_id, experience_reward, mana_reward, type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QR_CODE', $9)
            RETURNING *;
        `;
        const missionParams = [
            campaign_id, title, description, category, defaultRankId,
            required_achievement_id, experience_reward, mana_reward, created_by
        ];
        const missionResult = await client.query(missionQuery, missionParams);
        const newMission = missionResult.rows[0];

        const completionCode = generateCompletionCode();

        // NOTE: This assumes a `mission_qr_details` table exists with `mission_id` and `completion_code` columns.
        const detailsQuery = `
            INSERT INTO mission_qr_details (mission_id, completion_code)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const detailsParams = [newMission.id, completionCode];
        const detailsResult = await client.query(detailsQuery, detailsParams);
        const newDetails = detailsResult.rows[0];

        await client.query('COMMIT');

        res.locals.data = {
            ...newMission,
            details: {
                completion_code: newDetails.completion_code
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

module.exports = createQrMission;
