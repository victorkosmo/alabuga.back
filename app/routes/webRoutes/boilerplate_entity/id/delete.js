// app/routes/boilerplate_entity/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /boilerplate_entity/{id}:
 *   delete:
 *     tags:
 *       - boilerplate_entity
 *     summary: Delete a boilerplate_entity by ID
 *     description: Delete a boilerplate_entity by its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the boilerplate_entity to delete.
 *     responses:
 *       204:
 *         description: Boilerplate_entity deleted successfully.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const deleteEntity = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE boilerplate_entities 
             SET deleted_at = NOW() 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (rowCount === 0) {
            const err = new Error('Boilerplate_entity not found');
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

module.exports = deleteEntity;
