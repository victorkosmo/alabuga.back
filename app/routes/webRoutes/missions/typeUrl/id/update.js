// app/routes/webRoutes/missions/typeUrl/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

const validateCompetencyRewards = (rewards) => {
    if (rewards === undefined || rewards === null) return null; // Optional, can be null to clear
    if (!Array.isArray(rewards)) {
        return 'competency_rewards must be an array.';
    }
    for (const reward of rewards) {
        if (typeof reward !== 'object' || reward === null) {
            return 'Each item in competency_rewards must be an object.';
        }
        if (!reward.competency_id || !isUUID(reward.competency_id)) {
            return `Invalid or missing competency_id in competency_rewards. It must be a UUID.`;
        }
        if (typeof reward.points !== 'number' || !Number.isInteger(reward.points) || reward.points <= 0) {
            return `Invalid or missing points for competency ${reward.competency_id}. It must be a positive integer.`;
        }
    }
    return null; // All good
};

/**
 * @swagger
 * /web/missions/type-url/{id}:
 *   put:
 *     tags:
 *       - Missions
 *     summary: Update a URL-based mission
 *     description: Updates a mission of type 'MANUAL_URL' and its associated details. Only include the fields you want to change. All fields are optional.
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
 *               cover_url:
 *                 type: string
 *                 nullable: true
 *               required_achievement_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               experience_reward:
 *                 type: integer
 *               mana_reward:
 *                 type: integer
 *               submission_prompt:
 *                 type: string
 *               placeholder_text:
 *                 type: string
 *                 nullable: true
 *               competency_rewards:
 *                 type: array
 *                 nullable: true
 *                 description: "Array of competency points to award upon completion. Can be set to null to clear."
 *                 items:
 *                   type: object
 *                   properties:
 *                     competency_id:
 *                       type: string
 *                       format: uuid
 *                     points:
 *                       type: integer
 *                 example:
 *                   - competency_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *                     points: 10
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
 *                   example: "Mission updated successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateUrlMission = async (req, res, next) => {
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

    if (body.competency_rewards !== undefined) {
        const competencyRewardsError = validateCompetencyRewards(body.competency_rewards);
        if (competencyRewardsError) {
            const err = new Error(competencyRewardsError);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
    }

    const missionFields = ['title', 'description', 'category', 'required_achievement_id', 'experience_reward', 'mana_reward', 'cover_url', 'competency_rewards'];
    const detailFields = ['submission_prompt', 'placeholder_text'];

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

        // Update missions table
        if (Object.keys(missionUpdates).length > 0) {
            if (missionUpdates.competency_rewards !== undefined) {
                missionUpdates.competency_rewards = JSON.stringify(missionUpdates.competency_rewards);
            }
            const setClauses = Object.keys(missionUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const queryParams = [...Object.values(missionUpdates), id];
            const updateMissionQuery = `
                UPDATE missions 
                SET ${setClauses}, updated_at = NOW() 
                WHERE id = $${queryParams.length} AND type = 'MANUAL_URL'
                RETURNING *;
            `;
            const result = await client.query(updateMissionQuery, queryParams);
            if (result.rowCount === 0) {
                const err = new Error(`Mission with ID ${id} not found or is not a URL-type mission.`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                throw err;
            }
            updatedMission = result.rows[0];
        } else {
            // If only details are updated, we still need to fetch the mission data
            const result = await client.query("SELECT * FROM missions WHERE id = $1 AND type = 'MANUAL_URL'", [id]);
            if (result.rowCount === 0) {
                const err = new Error(`Mission with ID ${id} not found or is not a URL-type mission.`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                throw err;
            }
            updatedMission = result.rows[0];
        }

        // Update mission_manual_details table
        let updatedDetails;
        if (Object.keys(detailUpdates).length > 0) {
            const setClauses = Object.keys(detailUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const queryParams = [...Object.values(detailUpdates), id];
            const updateDetailsQuery = `
                UPDATE mission_manual_details 
                SET ${setClauses} 
                WHERE mission_id = $${queryParams.length}
                RETURNING *;
            `;
            const result = await client.query(updateDetailsQuery, queryParams);
            updatedDetails = result.rows[0];
        } else {
            const result = await client.query('SELECT * FROM mission_manual_details WHERE mission_id = $1', [id]);
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
                submission_prompt: updatedDetails.submission_prompt,
                placeholder_text: updatedDetails.placeholder_text
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

module.exports = updateUrlMission;
