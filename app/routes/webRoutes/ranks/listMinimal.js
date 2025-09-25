// app/routes/webRoutes/ranks/listMinimal.js
const pool = require('@db');

/**
 * @swagger
 * /web/ranks/minimal:
 *   get:
 *     tags:
 *       - Ranks
 *     summary: List all ranks in a minimal format
 *     description: Retrieves a non-paginated list of all ranks with only their ID and title, ordered by sequence. This is useful for populating dropdowns in a UI. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A minimal list of ranks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                 message:
 *                   type: string
 *                   example: "Minimal rank list retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listMinimalRanks = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, title FROM ranks WHERE deleted_at IS NULL ORDER BY sequence_order ASC'
        );

        res.locals.data = rows;
        res.locals.message = 'Minimal rank list retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalRanks;
