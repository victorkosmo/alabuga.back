// app/routes/webRoutes/campaigns/id/achievements/post.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/campaigns/{id}/achievements:
 *   post:
 *     tags:
 *       - Achievements
 *     summary: Create a new achievement for a campaign
 *     description: Creates a new achievement within a specific campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to add the achievement to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
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
        const { id: campaignId } = req.params;
        const { name, description, image_url } = req.body;

        if (!isUUID(campaignId)) {
            const err = new Error('Invalid Campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty');
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
            `INSERT INTO achievements (campaign_id, name, description, image_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [campaignId, name.trim(), description, image_url]
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
