// app/routes/webRoutes/achievements/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/{id}:
 *   get:
 *     tags:
 *       - Achievements
 *     summary: Get an achievement by ID
 *     description: Retrieve a single achievement by its unique ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the achievement to retrieve.
 *     responses:
 *       200:
 *         description: The requested achievement details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Achievement'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getAchievement = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM achievements WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            const err = new Error(`Achievement with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Achievement retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getAchievement;
