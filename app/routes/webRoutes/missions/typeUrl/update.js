// app/routes/webRoutes/missions/typeUrl/update.js
const pool = require('@db');
const { isUUID } = require('validator');

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
 *               required_rank_id:
 *                 type: string
 *                 format: uuid
 *               experience_reward:
 *                 type: integer
 *               mana_reward:
 *                 type: integer
 *               submission_prompt:
 *                 type: string
 *               placeholder_text:
 *                 type: string
 *                 nullable: true
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

    const missionFields = ['title', 'description', 'category', 'required_rank_id', 'experience_reward', 'mana_reward'];
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

        await client.query('COMMIT');

        res.locals.data = {
            ...updatedMission,
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
