// app/routes/webRoutes/missions/typeQr/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-qr/{id}:
 *   get:
 *     tags:
 *       - Missions
 *     summary: Get a QR code-based mission by ID
 *     description: Retrieves a single mission of type 'QR_CODE' by its unique ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission to retrieve.
 *     responses:
 *       200:
 *         description: The requested mission details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Mission'
 *                     - type: object
 *                       properties:
 *                         required_achievement_name:
 *                           type: string
 *                           nullable: true
 *                           description: "The name of the required achievement, if any."
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getQrMission = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const query = `
            SELECT
                m.id,
                m.campaign_id,
                m.title,
                m.description,
                m.category,
                m.required_rank_id,
                m.required_achievement_id,
                m.experience_reward,
                m.mana_reward,
                m.completion_code,
                m.qr_url,
                m.type,
                m.created_by,
                m.created_at,
                m.updated_at,
                m.awarded_artifact_id,
                a.name AS required_achievement_name
            FROM
                missions m
            LEFT JOIN
                achievements a ON m.required_achievement_id = a.id
            WHERE
                m.id = $1 AND m.type = 'QR_CODE' AND m.deleted_at IS NULL;
        `;

        const { rows, rowCount } = await pool.query(query, [id]);

        if (rowCount === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a QR-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Mission retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getQrMission;
