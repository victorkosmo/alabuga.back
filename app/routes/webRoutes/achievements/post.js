// app/routes/webRoutes/achievements/post.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements:
 *   post:
 *     tags:
 *       - Achievements
 *     summary: Create a new achievement
 *     description: Creates a new achievement and associates it with a campaign.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaign_id, name]
 *             properties:
 *               campaign_id:
 *                 type: string
 *                 format: uuid
 *                 description: The UUID of the campaign to associate the achievement with.
 *               name:
 *                 type: string
 *                 description: The name of the achievement.
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: A description for the achievement.
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 description: URL for the achievement's badge image.
 *               mana_reward:
 *                 type: integer
 *                 description: Mana points awarded upon completion. Defaults to 0.
 *                 example: 100
 *               unlock_conditions:
 *                 type: object
 *                 description: Conditions to unlock the achievement.
 *                 properties:
 *                   required_missions:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: uuid
 *                     description: An array of mission UUIDs that must be completed.
 *                 example:
 *                   required_missions: ["d290f1ee-6c54-4b01-90e6-d701748f0851"]
 *     responses:
 *       201:
 *         description: Achievement created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Achievement'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - An achievement with this name already exists in this campaign.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createAchievement = async (req, res, next) => {
    try {
        const { campaign_id: campaignId, name, description, image_url, mana_reward = 0, unlock_conditions = {} } = req.body;

        if (!campaignId || !isUUID(campaignId)) {
            const err = new Error('A valid campaign_id is required in the request body.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (typeof mana_reward !== 'number' || !Number.isInteger(mana_reward) || mana_reward < 0) {
            const err = new Error('mana_reward must be a non-negative integer.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (typeof unlock_conditions !== 'object' || unlock_conditions === null || Array.isArray(unlock_conditions)) {
            const err = new Error('unlock_conditions must be an object.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (unlock_conditions.required_missions && (!Array.isArray(unlock_conditions.required_missions) || !unlock_conditions.required_missions.every(id => isUUID(id)))) {
            const err = new Error('unlock_conditions.required_missions must be an array of valid UUIDs.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const campaignCheck = await pool.query('SELECT 1 FROM campaigns WHERE id = $1 AND deleted_at IS NULL', [campaignId]);
        if (campaignCheck.rowCount === 0) {
            const err = new Error(`Campaign with ID ${campaignId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const { rows } = await pool.query(
            `INSERT INTO achievements (campaign_id, name, description, image_url, mana_reward, unlock_conditions)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [campaignId, name.trim(), description, image_url, mana_reward, JSON.stringify(unlock_conditions)]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Achievement created successfully.';
        next();

    } catch (err) {
        if (err.code === '23505') { // unique_violation on (campaign_id, name)
            const conflictError = new Error('An achievement with this name already exists in this campaign.');
            conflictError.statusCode = 409;
            conflictError.code = 'ACHIEVEMENT_NAME_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = createAchievement;
