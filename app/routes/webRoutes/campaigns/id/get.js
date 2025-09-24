// app/routes/webRoutes/campaigns/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/campaigns/{id}:
 *   get:
 *     tags:
 *       - Campaigns
 *     summary: Get a campaign by ID with its missions
 *     description: Retrieve a single campaign by its unique ID, including its associated missions. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the campaign to retrieve.
 *     responses:
 *       200:
 *         description: The requested campaign details, including an array of its missions.
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
 *                     - $ref: '#/components/schemas/Campaign'
 *                     - type: object
 *                       properties:
 *                         missions:
 *                           type: array
 *                           description: A list of missions associated with the campaign, ordered by creation date.
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                               category:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                                 enum: [MANUAL_URL, QUIZ, QR_CODE]
 *                               experience_reward:
 *                                 type: integer
 *                               mana_reward:
 *                                 type: integer
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                               updated_at:
 *                                 type: string
 *                                 format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const campaignPromise = pool.query(
            'SELECT * FROM campaigns WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        const missionsPromise = pool.query(
            'SELECT * FROM missions WHERE campaign_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
            [id]
        );

        const [campaignResult, missionsResult] = await Promise.all([campaignPromise, missionsPromise]);

        if (campaignResult.rows.length === 0) {
            const err = new Error(`Campaign with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const campaign = campaignResult.rows[0];
        campaign.missions = missionsResult.rows;

        res.locals.data = campaign;
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getCampaign;
