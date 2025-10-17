const pool = require('@db');
const { isUUID } = require('validator');
const { checkAndAwardAchievements } = require('@features/achievementChecker');
const { sendTelegramMessage } = require('@features/sendTelegramMsg');

/**
 * @swagger
 * /telegram/completions/submit-quiz:
 *   post:
 *     tags:
 *       - Mission Completions (TMA)
 *     summary: Submit answers for a quiz mission
 *     description: |
 *       Submits answers for a mission of type `QUIZ`.
 *       The submission is graded instantly. If the user's score meets or exceeds the `pass_threshold`, the mission is marked as `APPROVED` and rewards are granted.
 *       If the user fails, no record is created, and they can try again.
 *       A user cannot re-submit if they have already passed the quiz.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mission_id
 *               - answers
 *             properties:
 *               mission_id:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the `QUIZ` mission being completed.
 *               answers:
 *                 type: array
 *                 description: An array of the user's selected answers. The order must match the order of questions returned by the get mission endpoint.
 *                 items:
 *                   type: object
 *                   required:
 *                     - question_index
 *                     - answer_index
 *                   properties:
 *                     question_index:
 *                       type: integer
 *                       description: The 0-based index of the question.
 *                     answer_index:
 *                       type: integer
 *                       description: The 0-based index of the chosen answer for that question.
 *     responses:
 *       200:
 *         description: Quiz submission processed. The `passed` field in the response indicates the outcome.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 passed:
 *                   type: boolean
 *                 score:
 *                   type: number
 *                 rewards:
 *                   type: object
 *                   description: Included only if the quiz was passed.
 *                   properties:
 *                     experience:
 *                       type: integer
 *                     mana:
 *                       type: integer
 *       400:
 *         description: Bad request (e.g., invalid input, mission not correct type).
 *       403:
 *         description: Forbidden (e.g., user not in campaign, rank too low).
 *       404:
 *         description: Mission not found.
 *       409:
 *         description: A submission for this mission has already been approved.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const validateSubmission = (answers) => {
    if (!Array.isArray(answers)) return false;
    for (const ans of answers) {
        if (typeof ans.question_index !== 'number' || typeof ans.answer_index !== 'number') {
            return false;
        }
    }
    return true;
};

const submitQuizMission = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { mission_id, answers } = req.body;
        const userId = req.user.userId;

        if (!isUUID(mission_id) || !validateSubmission(answers)) {
            const err = new Error('Invalid mission ID or answers format.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        await client.query('BEGIN');

        const validationQuery = `
            WITH mission_data AS (
                SELECT 
                    m.id, m.title, m.campaign_id, m.type, m.experience_reward, m.mana_reward, m.competency_rewards,
                    r.priority as required_rank,
                    mqd.questions, mqd.pass_threshold
                FROM missions m
                JOIN ranks r ON m.required_rank_id = r.id
                JOIN mission_quiz_details mqd ON m.id = mqd.mission_id
                WHERE m.id = $1 AND m.deleted_at IS NULL
            ),
            user_data AS (
                SELECT 
                    u.tg_id,
                    COALESCE(r.priority, -1) as user_rank,
                    EXISTS(
                        SELECT 1 FROM user_campaigns uc 
                        WHERE uc.user_id = $2 AND uc.campaign_id = (SELECT campaign_id FROM mission_data)
                    ) as is_campaign_participant,
                    EXISTS(
                        SELECT 1 FROM mission_completions
                        WHERE user_id = $2 AND mission_id = $1 AND status = 'APPROVED'
                    ) as is_already_completed
                FROM users u
                LEFT JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $2
            )
            SELECT * FROM mission_data, user_data;
        `;

        const { rows: validationRows } = await client.query(validationQuery, [mission_id, userId]);

        if (validationRows.length === 0) {
            const err = new Error('Mission not found, is not a quiz, or user not found.');
            err.statusCode = 404;
            err.code = 'MISSION_NOT_FOUND';
            throw err;
        }

        const check = validationRows[0];

        if (check.type !== 'QUIZ') {
            const err = new Error('This mission is not a quiz.');
            err.statusCode = 400;
            err.code = 'INVALID_MISSION_TYPE';
            throw err;
        }

        if (!check.is_campaign_participant) {
            const err = new Error('You are not a participant in the campaign for this mission.');
            err.statusCode = 403;
            err.code = 'CAMPAIGN_NOT_JOINED';
            throw err;
        }

        if (check.user_rank < check.required_rank) {
            const err = new Error('Your rank is too low to attempt this mission.');
            err.statusCode = 403;
            err.code = 'RANK_INSUFFICIENT';
            throw err;
        }

        if (check.is_already_completed) {
            const err = new Error('You have already successfully completed this mission.');
            err.statusCode = 409;
            err.code = 'SUBMISSION_EXISTS';
            throw err;
        }

        const dbQuestions = check.questions;
        if (answers.length !== dbQuestions.length) {
            const err = new Error(`Submission must contain answers for all ${dbQuestions.length} questions.`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        let correctAnswers = 0;
        for (const userAnswer of answers) {
            const qIndex = userAnswer.question_index;
            const aIndex = userAnswer.answer_index;

            if (dbQuestions[qIndex]?.answers[aIndex]?.is_correct) {
                correctAnswers++;
            }
        }

        const score = correctAnswers / dbQuestions.length;
        const passed = score >= check.pass_threshold;

        if (passed) {
            const resultData = { score, answers };
            await client.query(
                `INSERT INTO mission_completions (user_id, mission_id, status, result_data) VALUES ($1, $2, 'APPROVED', $3)`,
                [userId, mission_id, JSON.stringify(resultData)]
            );

            await client.query(
                `UPDATE users SET experience_points = experience_points + $1, mana_points = mana_points + $2, updated_at = NOW() WHERE id = $3`,
                [check.experience_reward, check.mana_reward, userId]
            );
            // TODO: Handle competency_rewards and rank-up logic in the future.

            // Check for and award any achievements this completion might unlock
            await checkAndAwardAchievements(client, userId, mission_id);

            await client.query('COMMIT');

            // Send notification to user
            const notifyMessage = `✅ Квиз «${check.title}» пройден.`;
            sendTelegramMessage(check.tg_id, notifyMessage);

            res.locals.data = {
                passed: true,
                score: score,
                total_questions: dbQuestions.length,
                correct_answers: correctAnswers,
                rewards: {
                    mana: check.mana_reward
                }
            };
            res.locals.message = 'Квиз успешно пройден!';
            next();
        } else {
            await client.query('ROLLBACK');
            
            res.locals.data = {
                passed: false,
                score: score,
                total_questions: dbQuestions.length,
                correct_answers: correctAnswers,
                required_score: check.pass_threshold
            };
            res.locals.message = 'Квиз не пройден. Пожалуйста, попробуйте еще раз.';
            next();
        }
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = submitQuizMission;
