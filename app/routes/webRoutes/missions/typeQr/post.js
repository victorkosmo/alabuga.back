// app/routes/webRoutes/missions/typeQr/post.js
const pool = require('@db');
const { isUUID } = require('validator');
const crypto = require('crypto');
const { generateMissionQRCode } = require('@features/useMinioBucket');

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
 *     description: Creates a new mission of type 'QR_CODE'. This involves creating a record in the `missions` table and generating a unique completion code.
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
 *                   $ref: '#/components/schemas/Mission'
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

        const completionCode = generateCompletionCode();

        // Generate and upload the QR code, then get its public URL
        const { url: qrUrl } = await generateMissionQRCode(completionCode);

        const missionQuery = `
            INSERT INTO missions (
                campaign_id, title, description, category, required_rank_id, 
                required_achievement_id, experience_reward, mana_reward, type, created_by, completion_code, qr_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QR_CODE', $9, $10, $11)
            RETURNING *;
        `;
        const missionParams = [
            campaign_id, title, description, category, defaultRankId,
            required_achievement_id, experience_reward, mana_reward, created_by, completionCode, qrUrl
        ];
        const missionResult = await client.query(missionQuery, missionParams);
        const newMission = missionResult.rows[0];

        await client.query('COMMIT');

        res.locals.data = newMission;
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
