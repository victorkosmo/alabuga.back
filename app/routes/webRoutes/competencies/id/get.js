// app/routes/webRoutes/competencies/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/competencies/{id}:
 *   get:
 *     tags:
 *       - Competencies
 *     summary: Get a competency by ID
 *     description: Retrieve a single competency by its unique ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the competency to retrieve.
 *     responses:
 *       200:
 *         description: The requested competency details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Competency'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCompetency = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM competencies WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (rows.length === 0) {
            const err = new Error(`Competency with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getCompetency;
