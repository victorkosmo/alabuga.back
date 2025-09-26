// app/routes/webRoutes/missions/typeUrl/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-url/{id}:
 *   get:
 *     tags:
 *       - Missions
 *     summary: Get a URL-based mission by ID
 *     description: Retrieves a single mission of type 'MANUAL_URL' and its associated details by its unique ID.
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
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Mission'
 *                     - type: object
 *                       properties:
 *                         required_achievement_name:
 *                           type: string
 *                           nullable: true
 *                           description: "The name of the required achievement, if any."
 *                         details:
 *                           type: object
 *                           properties:
 *                             submission_prompt:
 *                               type: string
 *                             placeholder_text:
 *                               type: string
 *                 message:
 *                   type: string
 *                   example: "Mission retrieved successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getUrlMission = async (req, res, next) => {
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
                m.*,
                mmd.submission_prompt,
                mmd.placeholder_text,
                a.name AS required_achievement_name
            FROM
                missions m
            JOIN
                mission_manual_details mmd ON m.id = mmd.mission_id
            LEFT JOIN
                achievements a ON m.required_achievement_id = a.id
            WHERE
                m.id = $1 AND m.type = 'MANUAL_URL' AND m.deleted_at IS NULL;
        `;

        const { rows, rowCount } = await pool.query(query, [id]);

        if (rowCount === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a URL-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const { submission_prompt, placeholder_text, ...missionData } = rows[0];

        const responseData = {
            ...missionData,
            details: {
                submission_prompt,
                placeholder_text
            }
        };

        res.locals.data = responseData;
        res.locals.message = 'Mission retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getUrlMission;
