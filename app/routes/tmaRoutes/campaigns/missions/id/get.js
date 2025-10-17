const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /telegram/campaigns/{campaignId}/missions/{missionId}:
 *   get:
 *     tags:
 *       - Campaigns (TMA)
 *     summary: Get detailed information for a specific mission
 *     description: |
 *       Retrieves the full details for a single mission within a campaign, provided the user is a participant.
 *       The response includes mission-type-specific details under a `details` object.
 *       For QUIZ missions, the questions are returned sanitized (without correct answer information).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the campaign.
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the mission to retrieve.
 *     responses:
 *       200:
 *         description: Mission details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionDetailedTMA'
 *       400:
 *         description: Invalid ID format for campaign or mission.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Campaign/mission not found or user is not a participant.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getMissionById = async (req, res, next) => {
    try {
        const { campaignId, missionId } = req.params;
        const userId = req.user.userId;

        if (!isUUID(campaignId) || !isUUID(missionId)) {
            const err = new Error('Invalid campaign or mission ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const query = `
            WITH user_data AS (
                SELECT
                    u.id as user_id,
                    COALESCE(r.priority, -1) as user_rank_priority
                FROM users u
                LEFT JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $1
            ),
            campaign_check AS (
                SELECT 1 FROM user_campaigns 
                WHERE user_id = $1 AND campaign_id = $3
            )
            SELECT
                m.id, m.title, m.description, m.category, m.experience_reward, m.mana_reward, m.competency_rewards, m.type, m.required_achievement_id,
                ach.name as required_achievement_name,
                CASE WHEN mc.id IS NOT NULL THEN true ELSE false END as is_completed,
                CASE
                    WHEN COALESCE(r_req.priority, -1) > (SELECT user_rank_priority FROM user_data) AND r_req.id IS NOT NULL THEN true
                    WHEN m.required_achievement_id IS NOT NULL AND ua.user_id IS NULL THEN true
                    ELSE false
                END as is_locked,
                mmd.submission_prompt, mmd.placeholder_text,
                mqd.questions, mqd.pass_threshold
            FROM missions m
            LEFT JOIN ranks r_req ON m.required_rank_id = r_req.id
            LEFT JOIN mission_completions mc ON m.id = mc.mission_id AND mc.user_id = $1 AND mc.status = 'APPROVED'
            LEFT JOIN mission_manual_details mmd ON m.id = mmd.mission_id AND m.type = 'MANUAL_URL'
            LEFT JOIN mission_quiz_details mqd ON m.id = mqd.mission_id AND m.type = 'QUIZ'
            LEFT JOIN user_achievements ua ON m.required_achievement_id = ua.achievement_id AND ua.user_id = $1
            LEFT JOIN achievements ach ON m.required_achievement_id = ach.id
            WHERE
                m.id = $2
                AND m.campaign_id = $3
                AND m.deleted_at IS NULL
                AND EXISTS (SELECT 1 FROM campaign_check);
        `;

        const { rows } = await pool.query(query, [userId, missionId, campaignId]);

        if (rows.length === 0) {
            const err = new Error('Mission not found or you are not a participant of this campaign.');
            err.statusCode = 404;
            err.code = 'MISSION_NOT_FOUND_OR_NOT_JOINED';
            return next(err);
        }

        const missionData = rows[0];
        const missionResponse = {
            id: missionData.id,
            title: missionData.title,
            description: missionData.description,
            category: missionData.category,
            experience_reward: missionData.experience_reward,
            mana_reward: missionData.mana_reward,
            competency_rewards: missionData.competency_rewards,
            required_achievement_id: missionData.required_achievement_id,
            required_achievement_name: missionData.required_achievement_name,
            type: missionData.type,
            is_completed: missionData.is_completed,
            is_locked: missionData.is_locked,
            details: {}
        };

        switch (missionData.type) {
            case 'MANUAL_URL':
                missionResponse.details = {
                    submission_prompt: missionData.submission_prompt,
                    placeholder_text: missionData.placeholder_text
                };
                break;
            case 'QUIZ':
                // Sanitize questions: remove correct answer information before sending to client
                const sanitizedQuestions = missionData.questions.map(q => {
                    const sanitizedAnswers = q.answers.map(({ is_correct, ...rest }) => rest);
                    return { ...q, answers: sanitizedAnswers };
                });
                missionResponse.details = {
                    questions: sanitizedQuestions,
                    pass_threshold: missionData.pass_threshold
                };
                break;
            // Add other cases for QR_CODE etc. if they have details
            default:
                missionResponse.details = null;
                break;
        }

        res.locals.data = missionResponse;
        res.locals.message = 'Mission details retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getMissionById;
