// app/routes/webRoutes/ui/campaigns/listMinimal.js
const pool = require('@db');

/**
 * @swagger
 * /web/ui/campaigns/list-minimal:
 *   get:
 *     tags:
 *       - UI Helpers
 *     summary: List campaigns in a minimal format (UI helper)
 *     description: Retrieve a minimal list of all campaigns (ID and title), suitable for UI selectors.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A minimal list of campaigns.
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
const listMinimalCampaigns = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, title FROM campaigns WHERE deleted_at IS NULL ORDER BY title ASC`
        );

        res.locals.data = rows;
        res.locals.message = 'Minimal campaign list retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalCampaigns;
