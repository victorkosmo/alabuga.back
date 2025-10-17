const pool = require('@db');
const { isUUID, isURL } = require('validator');

/**
 * @swagger
 * /telegram/completions/submit-url:
 *   post:
 *     tags:
 *       - Mission Completions (TMA)
 *     summary: Submit a URL for a manual review mission
 *     description: |
 *       Submits a URL for a mission of type `MANUAL_URL`.
 *       The submission will be set to `PENDING_REVIEW`.
 *       The user must be a participant in the mission's campaign and meet all rank requirements.
 *       A user cannot submit a new completion if they already have one that is `APPROVED` or `PENDING_REVIEW`.
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
 *               - submission_url
 *             properties:
 *               mission_id:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the `MANUAL_URL` mission being completed.
 *               submission_url:
 *                 type: string
 *                 format: url
 *                 description: The URL being submitted for review.
 *     responses:
 *       202:
 *         description: Submission accepted for review.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   description: The ID of the new mission completion record.
 *                 status:
 *                   type: string
 *                   example: PENDING_REVIEW
 *       400:
 *         description: Bad request (e.g., invalid input, mission not correct type, user rank too low).
 *       404:
 *         description: Mission not found or user is not a participant in the campaign.
 *       409:
 *         description: A submission for this mission already exists and is pending or approved.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const submitUrlMission = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { mission_id, submission_url } = req.body;
        const userId = req.user.userId;

        if (!isUUID(mission_id) || !isURL(submission_url)) {
            const err = new Error('Invalid mission ID or URL format.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        await client.query('BEGIN');

        // 1. Fetch mission, user rank, and campaign participation in one go
        const validationQuery = `
            WITH mission_details AS (
                SELECT m.id, m.campaign_id, m.type, COALESCE(r.priority, -1) as required_rank
                FROM missions m
                LEFT JOIN ranks r ON m.required_rank_id = r.id
                WHERE m.id = $1 AND m.deleted_at IS NULL
            ),
            user_details AS (
                SELECT COALESCE(r.priority, -1) as user_rank
                FROM users u
                LEFT JOIN ranks r ON u.rank_id = r.id
                WHERE u.id = $2
            )
            SELECT 
                md.id as mission_id,
                md.type as mission_type,
                (SELECT user_rank FROM user_details) as user_current_rank,
                md.required_rank,
                EXISTS(
                    SELECT 1 FROM user_campaigns uc 
                    WHERE uc.user_id = $2 AND uc.campaign_id = md.campaign_id
                ) as is_campaign_participant,
                (
                    SELECT status FROM mission_completions 
                    WHERE user_id = $2 AND mission_id = $1
                    ORDER BY created_at DESC LIMIT 1
                ) as last_completion_status
            FROM mission_details md;
        `;

        const { rows: validationRows } = await client.query(validationQuery, [mission_id, userId]);

        if (validationRows.length === 0) {
            const err = new Error('Mission not found.');
            err.statusCode = 404;
            err.code = 'MISSION_NOT_FOUND';
            await client.query('ROLLBACK');
            return next(err);
        }

        const check = validationRows[0];

        if (check.mission_type !== 'MANUAL_URL') {
            const err = new Error('This mission does not accept URL submissions.');
            err.statusCode = 400;
            err.code = 'INVALID_MISSION_TYPE';
            await client.query('ROLLBACK');
            return next(err);
        }

        if (!check.is_campaign_participant) {
            const err = new Error('You are not a participant in the campaign for this mission.');
            err.statusCode = 404;
            err.code = 'CAMPAIGN_NOT_JOINED';
            await client.query('ROLLBACK');
            return next(err);
        }

        // Check if required_rank is set (not -1) and user's rank is lower
        if (check.required_rank > -1 && check.user_current_rank < check.required_rank) {
            const err = new Error('Your rank is too low to submit this mission.');
            err.statusCode = 400;
            err.code = 'RANK_INSUFFICIENT';
            await client.query('ROLLBACK');
            return next(err);
        }

        if (check.last_completion_status === 'APPROVED' || check.last_completion_status === 'PENDING_REVIEW') {
            const err = new Error(`You already have an ${check.last_completion_status.toLowerCase()} submission for this mission.`);
            err.statusCode = 409;
            err.code = 'SUBMISSION_EXISTS';
            await client.query('ROLLBACK');
            return next(err);
        }

        // 2. Insert the new completion record
        const insertQuery = `
            INSERT INTO mission_completions (user_id, mission_id, status, result_data)
            VALUES ($1, $2, 'PENDING_REVIEW', $3)
            RETURNING id, status;
        `;
        const { rows: insertRows } = await client.query(insertQuery, [userId, mission_id, submission_url]);

        await client.query('COMMIT');

        res.locals.statusCode = 202;
        res.locals.data = insertRows[0];
        res.locals.message = 'Submission accepted for review.';
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = submitUrlMission;
