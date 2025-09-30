// app/routes/webRoutes/missions/typeQuiz/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

const validateQuestions = (questions) => {
    if (!Array.isArray(questions) || questions.length === 0) {
        return 'Questions must be a non-empty array.';
    }
    for (const q of questions) {
        if (!q.text || typeof q.text !== 'string' || q.text.trim() === '') {
            return 'Each question must have a non-empty text.';
        }
        if (!Array.isArray(q.answers) || q.answers.length < 2) {
            return `Question "${q.text}" must have at least two answers.`;
        }
        let correctCount = 0;
        for (const a of q.answers) {
            if (!a.text || typeof a.text !== 'string' || a.text.trim() === '') {
                return `Each answer for question "${q.text}" must have non-empty text.`;
            }
            if (typeof a.is_correct !== 'boolean') {
                return `Each answer for question "${q.text}" must have an 'is_correct' boolean property.`;
            }
            if (a.is_correct) {
                correctCount++;
            }
        }
        if (correctCount !== 1) {
            return `Question "${q.text}" must have exactly one correct answer.`;
        }
    }
    return null; // All good
};

/**
 * @swagger
 * /web/missions/type-quiz/{id}:
 *   put:
 *     tags:
 *       - Missions
 *     summary: Update a quiz-based mission
 *     description: Updates a mission of type 'QUIZ' and its associated details. Only include the fields you want to change.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *               required_achievement_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               experience_reward:
 *                 type: integer
 *               mana_reward:
 *                 type: integer
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               pass_threshold:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Mission updated successfully.
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
 *                         details:
 *                           type: object
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateQuizMission = async (req, res, next) => {
    const { id } = req.params;
    const body = req.body;

    if (!isUUID(id)) {
        const err = new Error('Invalid ID format');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    if (body.required_achievement_id !== undefined && body.required_achievement_id !== null && !isUUID(body.required_achievement_id)) {
        const err = new Error('Invalid UUID format for required_achievement_id.');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    if (body.questions) {
        const questionsError = validateQuestions(body.questions);
        if (questionsError) {
            const err = new Error(questionsError);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
    }

    const missionFields = ['title', 'description', 'category', 'required_achievement_id', 'experience_reward', 'mana_reward'];
    const detailFields = ['questions', 'pass_threshold'];

    const missionUpdates = {};
    const detailUpdates = {};

    for (const key in body) {
        if (missionFields.includes(key)) missionUpdates[key] = body[key];
        if (detailFields.includes(key)) detailUpdates[key] = body[key];
    }

    if (Object.keys(missionUpdates).length === 0 && Object.keys(detailUpdates).length === 0) {
        const err = new Error('At least one field to update must be provided.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let updatedMission;

        if (Object.keys(missionUpdates).length > 0) {
            const setClauses = Object.keys(missionUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const queryParams = [...Object.values(missionUpdates), id];
            const updateMissionQuery = `
                UPDATE missions 
                SET ${setClauses}, updated_at = NOW() 
                WHERE id = $${queryParams.length} AND type = 'QUIZ'
                RETURNING *;
            `;
            const result = await client.query(updateMissionQuery, queryParams);
            if (result.rowCount === 0) {
                const err = new Error(`Mission with ID ${id} not found or is not a Quiz-type mission.`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                throw err;
            }
            updatedMission = result.rows[0];
        } else {
            const result = await client.query("SELECT * FROM missions WHERE id = $1 AND type = 'QUIZ'", [id]);
            if (result.rowCount === 0) {
                const err = new Error(`Mission with ID ${id} not found or is not a Quiz-type mission.`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                throw err;
            }
            updatedMission = result.rows[0];
        }

        let updatedDetails;
        if (Object.keys(detailUpdates).length > 0) {
            if (detailUpdates.questions) {
                detailUpdates.questions = JSON.stringify(detailUpdates.questions);
            }
            const setClauses = Object.keys(detailUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const queryParams = [...Object.values(detailUpdates), id];
            const updateDetailsQuery = `
                UPDATE mission_quiz_details 
                SET ${setClauses} 
                WHERE mission_id = $${queryParams.length}
                RETURNING *;
            `;
            const result = await client.query(updateDetailsQuery, queryParams);
            updatedDetails = result.rows[0];
        } else {
            const result = await client.query('SELECT * FROM mission_quiz_details WHERE mission_id = $1', [id]);
            updatedDetails = result.rows[0];
        }

        let required_achievement_name = null;
        if (updatedMission.required_achievement_id) {
            const achievementResult = await client.query(
                'SELECT name FROM achievements WHERE id = $1',
                [updatedMission.required_achievement_id]
            );
            if (achievementResult.rowCount > 0) {
                required_achievement_name = achievementResult.rows[0].name;
            }
        }

        await client.query('COMMIT');

        res.locals.data = {
            ...updatedMission,
            required_achievement_name,
            details: {
                questions: updatedDetails.questions,
                pass_threshold: updatedDetails.pass_threshold
            }
        };
        res.locals.message = 'Mission updated successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = updateQuizMission;
