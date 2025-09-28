// app/routes/webRoutes/store/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/{id}:
 *   delete:
 *     tags:
 *       - Store
 *     summary: Delete a global store item by ID
 *     description: Soft-deletes a global store item. The item cannot be deleted if it has been ordered by any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the store item to delete.
 *     responses:
 *       204:
 *         description: Store item deleted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - The store item is in use and cannot be deleted.
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
 *                     message: "Cannot delete store item. It has been referenced in one or more orders."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteStoreItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check for relations in the orders table
        const relationCheck = await pool.query(
            'SELECT 1 FROM orders WHERE item_id = $1 LIMIT 1',
            [id]
        );

        if (relationCheck.rowCount > 0) {
            const err = new Error('Cannot delete store item. It has been referenced in one or more orders.');
            err.statusCode = 409; // Conflict
            err.code = 'RELATION_EXISTS';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE store_items 
             SET deleted_at = NOW() 
             WHERE id = $1 AND is_global = true AND deleted_at IS NULL`,
            [id]
        );

        if (rowCount === 0) {
            const err = new Error(`Global store item with ID ${id} not found.`);
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

module.exports = deleteStoreItem;
