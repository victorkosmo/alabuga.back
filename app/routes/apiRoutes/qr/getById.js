// app/routes/apiRoutes/qr/getById.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /api/qr/{id}:
 *   get:
 *     tags:
 *       - API - QR
 *     summary: Get QR mission details by mission ID
 *     description: Retrieves public details for a QR-type mission using its unique mission ID. This is useful for displaying QR code information on a public screen.
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the QR mission.
 *     responses:
 *       200:
 *         description: Successful response with QR mission details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     qr_url:
 *                       type: string
 *                       format: url
 *       400:
 *         description: Invalid mission ID format.
 *       404:
 *         description: Mission not found for the given ID.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getQrMissionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid mission ID format.');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const query = `
            SELECT id, title, qr_url
            FROM missions
            WHERE id = $1 AND type = 'QR_CODE' AND deleted_at IS NULL
        `;
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            const err = new Error('QR mission not found for the provided ID.');
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const mission = rows[0];

        res.locals.data = {
            id: mission.id,
            title: mission.title,
            qr_url: mission.qr_url,
        };
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getQrMissionById;
