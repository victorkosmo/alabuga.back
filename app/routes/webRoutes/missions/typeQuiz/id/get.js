// app/routes/webRoutes/missions/typeQuiz/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-quiz/{id}:
 *   get:
 *     tags:
 *       - Missions
 *     summary: Get a quiz-based mission by ID
 *     description: Retrieves a single mission of type 'QUIZ' and its associated details by its unique ID.
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
 *                         details:
 *                           type: object
 *                           properties:
 *                             questions:
 *                               type: array
 *                             pass_threshold:
 *                               type: number
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
const getQuizMission = async (req, res, next) => {
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
                mqd.questions,
                mqd.pass_threshold,
                a.name AS required_achievement_name
            FROM
                missions m
            JOIN
                mission_quiz_details mqd ON m.id = mqd.mission_id
            LEFT JOIN
                achievements a ON m.required_achievement_id = a.id
            WHERE
                m.id = $1 AND m.type = 'QUIZ' AND m.deleted_at IS NULL;
        `;

        const { rows, rowCount } = await pool.query(query, [id]);

        if (rowCount === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a Quiz-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const { questions, pass_threshold, ...missionData } = rows[0];

        const responseData = {
            ...missionData,
            details: {
                questions,
                pass_threshold
            }
        };

        res.locals.data = responseData;
        res.locals.message = 'Mission retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getQuizMission;
