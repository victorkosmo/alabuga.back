const pool = require('@db');

/**
 * @swagger
 * /telegram/progress/global-competencies:
 *   get:
 *     tags:
 *       - Progress (TMA)
 *     summary: Get user's global competency ratings
 *     description: Retrieves a list of all global competencies and the authenticated user's progress in each.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of global competencies with user progress.
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
 *                         description: Competency ID.
 *                       name:
 *                         type: string
 *                         description: Name of the competency.
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: Description of the competency.
 *                       level:
 *                         type: integer
 *                         description: The user's current level in this competency. Defaults to 0 if not started.
 *                       progress_points:
 *                         type: integer
 *                         description: Points accumulated towards the next level. Defaults to 0 if not started.
 *                 message:
 *                   type: string
 *                   example: "Global competencies retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getGlobalCompetencies = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const query = `
            SELECT
                c.id,
                c.name,
                c.description,
                COALESCE(uc.level, 0) as level,
                COALESCE(uc.progress_points, 0) as progress_points
            FROM
                competencies c
            LEFT JOIN
                user_competencies uc ON c.id = uc.competency_id AND uc.user_id = $1
            WHERE
                c.is_global = true AND c.deleted_at IS NULL
            ORDER BY
                c.created_at ASC;
        `;

        const { rows } = await pool.query(query, [userId]);

        res.locals.data = rows;
        res.locals.message = 'Global competencies retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getGlobalCompetencies;
