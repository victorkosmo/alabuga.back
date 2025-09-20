const pool = require('@db');

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth (Web)
 *     summary: Get current manager details
 *     description: Retrieve the currently authenticated manager's details from their JWT.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     full_name:
 *                       type: string
 *                       example: "John Doe"
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *                 message:
 *                   type: string
 *                   example: "Manager details retrieved"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const getCurrentUser = async (req, res, next) => {
    try {
        const user = req.user;

        const { rows } = await pool.query(
            'SELECT id, email, full_name, role FROM managers WHERE id = $1 AND deleted_at IS NULL',
            [user.userId]
        );

        if (rows.length === 0) {
            const err = new Error('Manager not found');
            err.statusCode = 404;
            err.code = 'MANAGER_NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Manager details retrieved';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getCurrentUser;
