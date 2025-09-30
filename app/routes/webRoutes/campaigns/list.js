// app/routes/webRoutes/campaigns/list.js
const pool = require('@db');

/**
 * @swagger
 * /web/campaigns:
 *   get:
 *     tags:
 *       - Campaigns
 *     summary: List all campaigns
 *     description: Retrieve a paginated list of all campaigns. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: The number of items per page (max 100).
 *     responses:
 *       200:
 *         description: A paginated list of campaigns.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listCampaigns = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters. Query parameters "page" (integer, >=1) and "limit" (integer, 1-100) are required.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION';
            return next(err);
        }

        const offset = (page - 1) * limit;

        const countPromise = pool.query(
            'SELECT COUNT(*) FROM campaigns WHERE deleted_at IS NULL'
        );
        const dataPromise = pool.query(
            `SELECT
                c.id,
                c.title,
                c.description,
                c.activation_code,
                c.status,
                c.start_date,
                c.end_date,
                c.max_participants,
                c.created_by,
                c.metadata,
                c.qr_url,
                c.cover_url,
                c.created_at,
                c.updated_at,
                json_build_object(
                    'participants_joined', (SELECT COUNT(*)::INTEGER FROM user_campaigns uc WHERE uc.campaign_id = c.id AND uc.is_active = true),
                    'participants_completed_one_mission', (
                        SELECT COUNT(DISTINCT mc.user_id)::INTEGER
                        FROM mission_completions mc
                        JOIN missions m ON mc.mission_id = m.id
                        WHERE m.campaign_id = c.id AND mc.status = 'APPROVED' AND m.deleted_at IS NULL
                    ),
                    'participants_completed_all_missions', (
                        CASE
                            WHEN (SELECT COUNT(*) FROM missions m WHERE m.campaign_id = c.id AND m.deleted_at IS NULL) > 0
                            THEN (
                                WITH campaign_missions_count AS (
                                    SELECT COUNT(*) as total FROM missions WHERE campaign_id = c.id AND deleted_at IS NULL
                                )
                                SELECT COUNT(*)::INTEGER
                                FROM (
                                    SELECT 1
                                    FROM mission_completions mc
                                    JOIN missions m ON mc.mission_id = m.id
                                    WHERE m.campaign_id = c.id AND mc.status = 'APPROVED' AND m.deleted_at IS NULL
                                    GROUP BY mc.user_id
                                    HAVING COUNT(DISTINCT mc.mission_id) = (SELECT total FROM campaign_missions_count)
                                ) as completed_all_users
                            )
                            ELSE 0
                        END
                    )
                ) as stats,
                COALESCE(
                    (SELECT json_agg(json_build_object('title', a.name, 'image_url', a.image_url))
                     FROM achievements a
                     WHERE a.campaign_id = c.id),
                    '[]'::jsonb
                ) as achievements,
                COALESCE(
                    (SELECT json_agg(json_build_object('title', si.name, 'image_url', si.image_url))
                     FROM store_items si
                     WHERE si.campaign_id = c.id AND si.deleted_at IS NULL),
                    '[]'::jsonb
                ) as store_items
            FROM
                campaigns c
            WHERE
                c.deleted_at IS NULL
            ORDER BY
                c.created_at DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

        const total = parseInt(countResult.rows[0].count, 10);
        const rows = dataResult.rows;
        const pages = Math.ceil(total / limit);

        res.locals.data = rows;
        res.locals.meta = {
            pagination: {
                page,
                limit,
                total,
                pages
            }
        };
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listCampaigns;
