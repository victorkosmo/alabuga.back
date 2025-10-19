// app/routes/apiRoutes/qr/getByCode.js
const pool = require('@db');

/**
 * @swagger
 * /api/qr/{completion_code}:
 *   get:
 *     tags:
 *       - API - QR
 *     summary: Get QR mission details by completion code
 *     description: Retrieves public details for a QR-type mission using its unique completion code. This is useful for displaying QR code information on a public screen.
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: completion_code
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique completion code associated with the QR mission.
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
 *       404:
 *         description: Mission not found for the given code.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getQrMissionByCode = async (req, res, next) => {
    try {
        const { completion_code } = req.params;

        if (!completion_code) {
            const err = new Error('Completion code is required.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const query = `
            SELECT id, title, qr_url
            FROM missions
            WHERE completion_code = $1 AND type = 'QR_CODE' AND deleted_at IS NULL
        `;
        const { rows } = await pool.query(query, [completion_code.toUpperCase()]);

        if (rows.length === 0) {
            const err = new Error('QR mission not found for the provided code.');
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

module.exports = getQrMissionByCode;
