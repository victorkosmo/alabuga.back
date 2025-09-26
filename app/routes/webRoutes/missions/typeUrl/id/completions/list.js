// app/routes/webRoutes/missions/typeUrl/id/completions/list.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-url/{missionId}/completions:
 *   get:
 *     tags:
 *       - Missions Completions
 *     summary: List completions for a URL-based mission
 *     description: Retrieves a paginated list of user submissions for a specific mission of type 'MANUAL_URL'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *     responses:
 *       200:
 *         description: A paginated list of mission completions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       username:
 *                         type: string
 *                       status:
 *                         $ref: '#/components/schemas/MissionCompletionStatus'
 *                       result_data:
 *                         type: string
 *                         description: The URL submitted by the user.
 *                       moderator_comment:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listMissionCompletions = async (req, res, next) => {
    try {
        const { id: missionId } = req.params; // Renaming for clarity
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        if (!isUUID(missionId)) {
            const err = new Error('Invalid mission ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION';
            return next(err);
        }

        const countQuery = 'SELECT COUNT(id)::INTEGER FROM mission_completions WHERE mission_id = $1';
        const listQuery = `
            SELECT
                mc.id,
                mc.user_id,
                u.first_name,
                u.last_name,
                u.username,
                mc.status,
                mc.result_data,
                mc.moderator_comment,
                mc.created_at,
                mc.updated_at
            FROM
                mission_completions mc
            JOIN
                users u ON mc.user_id = u.id
            WHERE
                mc.mission_id = $1
            ORDER BY
                mc.created_at DESC
            LIMIT $2 OFFSET $3;
        `;

        const countResult = await pool.query(countQuery, [missionId]);
        const totalItems = countResult.rows[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        const listResult = await pool.query(listQuery, [missionId, limit, offset]);

        res.locals.data = listResult.rows;
        res.locals.pagination = {
            totalItems,
            totalPages,
            currentPage: page,
            pageSize: limit
        };
        res.locals.message = 'Mission completions retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listMissionCompletions;
