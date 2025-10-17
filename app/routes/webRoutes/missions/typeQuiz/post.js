// app/routes/webRoutes/missions/typeQuiz/post.js
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
 * /web/missions/type-quiz:
 *   post:
 *     tags:
 *       - Missions
 *     summary: Create a new quiz-based mission
 *     description: Creates a new mission of type 'QUIZ'. This involves creating a record in both the `missions` and `mission_quiz_details` tables within a single transaction.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_id
 *               - title
 *               - category
 *               - questions
 *             properties:
 *               campaign_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 example: "Submit Your GitHub Profile"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Campaign for new hires in 2024."
 *               category:
 *                 type: string
 *                 example: "Portfolio"
 *               required_achievement_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               experience_reward:
 *                 type: integer
 *                 default: 0
 *               mana_reward:
 *                 type: integer
 *                 default: 0
 *               questions:
 *                 type: array
 *                 description: An array of question objects for the quiz.
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     answers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *               pass_threshold:
 *                 type: number
 *                 format: float
 *                 description: "Fraction of correct answers required to pass (0.0 to 1.0). Defaults to 1.0."
 *                 default: 1.0
 *     responses:
 *       201:
 *         description: Mission created successfully.
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createQuizMission = async (req, res, next) => {
    const {
        campaign_id,
        title,
        description,
        category,
        required_achievement_id,
        experience_reward = 0,
        mana_reward = 0,
        questions,
        pass_threshold = 1.0
    } = req.body;
    const created_by = req.user.userId;

    // Validation
    if (!title || !category || !campaign_id || !questions) {
        const err = new Error('Missing required fields: campaign_id, title, category, questions.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }
    if (!isUUID(campaign_id) || (required_achievement_id && !isUUID(required_achievement_id))) {
        const err = new Error('Invalid UUID format for campaign_id or required_achievement_id.');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }
    const questionsError = validateQuestions(questions);
    if (questionsError) {
        const err = new Error(questionsError);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch the ID of the lowest priority rank to use as default, if any exist.
        // If no ranks exist, defaultRankId will be null, allowing missions without rank requirements.
        const rankQuery = 'SELECT id FROM ranks WHERE deleted_at IS NULL ORDER BY priority ASC LIMIT 1';
        const rankResult = await client.query(rankQuery);
        const defaultRankId = rankResult.rowCount > 0 ? rankResult.rows[0].id : null;

        const missionQuery = `
            INSERT INTO missions (
                campaign_id, title, description, category, required_rank_id, 
                required_achievement_id, experience_reward, mana_reward, type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QUIZ', $9)
            RETURNING *;
        `;
        const missionParams = [
            campaign_id, title, description, category, defaultRankId,
            required_achievement_id, experience_reward, mana_reward, created_by
        ];
        const missionResult = await client.query(missionQuery, missionParams);
        const newMission = missionResult.rows[0];

        const detailsQuery = `
            INSERT INTO mission_quiz_details (mission_id, questions, pass_threshold)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const detailsParams = [newMission.id, JSON.stringify(questions), pass_threshold];
        const detailsResult = await client.query(detailsQuery, detailsParams);
        const newDetails = detailsResult.rows[0];

        await client.query('COMMIT');

        res.locals.data = {
            ...newMission,
            details: {
                questions: newDetails.questions,
                pass_threshold: newDetails.pass_threshold
            }
        };
        res.locals.statusCode = 201;
        res.locals.message = 'Mission created successfully.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = createQuizMission;
