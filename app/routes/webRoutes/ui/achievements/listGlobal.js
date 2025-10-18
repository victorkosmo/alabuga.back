// app/routes/webRoutes/ui/achievements/listGlobal.js
const pool = require('@db');

/**
 * @swagger
 * /web/ui/achievements/list-global:
 *   get:
 *     tags:
 *       - UI Helpers
 *     summary: List all achievements globally in a minimal format (UI helper)
 *     description: Retrieve a minimal list of all achievements across all campaigns, including achievement ID, name, and campaign title. Suitable for UI selectors where a global view is needed.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A minimal list of all achievements.
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
 *                       name:
 *                         type: string
 *                       campaign_title:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
const listGlobalAchievements = async (req, res, next) => {
    try {
        const query = `
            SELECT
                a.id,
                a.name,
                c.title as campaign_title
            FROM
                achievements a
            JOIN
                campaigns c ON a.campaign_id = c.id
            WHERE
                c.deleted_at IS NULL
            ORDER BY
                c.title ASC, a.name ASC
        `;

        const { rows } = await pool.query(query);

        res.locals.data = rows;
        res.locals.message = 'Global minimal achievement list retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listGlobalAchievements;
