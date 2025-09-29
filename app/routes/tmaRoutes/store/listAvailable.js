const pool = require('@db');

/**
 * @swagger
 * /telegram/store/available:
 *   get:
 *     tags:
 *       - Store (TMA)
 *     summary: List all available store items for the user
 *     description: |
 *       Retrieves all available store items for the authenticated user.
 *       This includes all global items and items from any active campaigns the user has joined.
 *       Inactive items or items from campaigns the user hasn't joined (or that are not active) are excluded.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of available store items.
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
 *                     $ref: '#/components/schemas/StoreItem'
 *                 message:
 *                   type: string
 *                   example: "Available store items retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listAvailableStoreItems = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                si.id,
                si.name,
                si.description,
                si.image_url,
                si.cost,
                si.quantity,
                si.is_active,
                si.campaign_id,
                si.is_global
            FROM
                store_items si
            WHERE
                si.deleted_at IS NULL
                AND si.is_active = true
                AND (
                    si.is_global = true
                    OR si.campaign_id IN (
                        SELECT uc.campaign_id
                        FROM user_campaigns uc
                        JOIN campaigns c ON uc.campaign_id = c.id
                        WHERE uc.user_id = $1 AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
                    )
                )
            ORDER BY
                si.is_global DESC, si.created_at ASC
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'Available store items retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listAvailableStoreItems;
