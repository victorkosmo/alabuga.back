// app/routes/webRoutes/competencies/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/competencies/{id}:
 *   delete:
 *     tags:
 *       - Competencies
 *     summary: Delete a competency by ID
 *     description: Soft-deletes a competency by its ID. The competency cannot be deleted if it is assigned to any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the competency to delete.
 *     responses:
 *       204:
 *         description: Competency deleted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - The competency is in use and cannot be deleted.
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
 *                     message: "Cannot delete competency. It is currently assigned to one or more users."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteCompetency = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check for relations in user_competencies table
        const relationCheck = await pool.query(
            'SELECT 1 FROM user_competencies WHERE competency_id = $1 LIMIT 1',
            [id]
        );

        if (relationCheck.rowCount > 0) {
            const err = new Error('Cannot delete competency. It is currently assigned to one or more users.');
            err.statusCode = 409; // Conflict
            err.code = 'RELATION_EXISTS';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE competencies 
             SET deleted_at = NOW() 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (rowCount === 0) {
            const err = new Error(`Competency with ID ${id} not found.`);
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

module.exports = deleteCompetency;
