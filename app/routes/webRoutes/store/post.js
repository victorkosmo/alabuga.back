// app/routes/webRoutes/store/post.js
const pool = require('@db');

/**
 * @swagger
 * /web/store:
 *   post:
 *     tags:
 *       - Store
 *     summary: Create a new global store item
 *     description: Creates a new store item that is available globally (not tied to a specific campaign). Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - cost
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the store item.
 *                 example: "Branded T-Shirt"
 *               description:
 *                 type: string
 *                 description: An optional description for the item.
 *                 example: "High-quality cotton t-shirt with company logo."
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: An optional URL for the item's image.
 *               cost:
 *                 type: integer
 *                 minimum: 0
 *                 description: The price of the item in mana points.
 *                 example: 1000
 *               quantity:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 0
 *                 description: Available stock. NULL for infinite items.
 *                 example: 50
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: Toggles visibility in the store.
 *     responses:
 *       201:
 *         description: Global store item created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StoreItem'
 *                 message:
 *                   type: string
 *                   example: "Global store item created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createStoreItem = async (req, res, next) => {
    try {
        const { name, description, image_url, cost, quantity, is_active = true } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (cost === undefined || !Number.isInteger(cost) || cost < 0) {
            const err = new Error('Cost is required and must be a non-negative integer.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        if (quantity !== undefined && (quantity === null ? false : (!Number.isInteger(quantity) || quantity < 0))) {
            const err = new Error('Quantity, if provided, must be a non-negative integer.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const { rows } = await pool.query(
            `INSERT INTO store_items (name, description, image_url, cost, quantity, is_active, is_global)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING *`,
            [name.trim(), description, image_url, cost, quantity, is_active]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Global store item created successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = createStoreItem;
