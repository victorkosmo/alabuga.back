// app/routes/webRoutes/achievements/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/{id}:
 *   delete:
 *     tags:
 *       - Achievements
 *     summary: Delete an achievement by ID
 *     description: Soft-deletes an achievement. It cannot be deleted if it has been awarded to any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the achievement to delete.
 *     responses:
 *       204:
 *         description: Achievement deleted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - The achievement is in use and cannot be deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               RelationExists:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "RELATION_EXISTS"
 *                     message: "Cannot delete achievement. It has been awarded to one or more users."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteAchievement = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check if the achievement has been awarded to any user
        const relationCheck = await pool.query(
            'SELECT 1 FROM user_achievements WHERE achievement_id = $1 LIMIT 1',
            [id]
        );

        if (relationCheck.rowCount > 0) {
            const err = new Error('Cannot delete achievement. It has been awarded to one or more users.');
            err.statusCode = 409; // Conflict
            err.code = 'RELATION_EXISTS';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE achievements 
             SET deleted_at = NOW() 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (rowCount === 0) {
            const err = new Error(`Achievement with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.statusCode = 204;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = deleteAchievement;
