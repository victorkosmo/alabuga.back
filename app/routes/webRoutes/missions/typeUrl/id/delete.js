// app/routes/webRoutes/missions/typeUrl/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/missions/type-url/{id}:
 *   delete:
 *     tags:
 *       - Missions
 *     summary: Delete a URL-based mission
 *     description: |
 *       Soft-deletes a mission of type 'MANUAL_URL'.
 *       The mission can only be deleted if there are no existing completions for it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the mission to delete.
 *     responses:
 *       204:
 *         description: Mission deleted successfully. No content.
 *       400:
 *         description: Bad request, e.g., mission has completions and cannot be deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Cannot delete mission because it has existing completions."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteUrlMission = async (req, res, next) => {
    const { id } = req.params;

    if (!isUUID(id)) {
        const err = new Error('Invalid ID format');
        err.statusCode = 400;
        err.code = 'INVALID_ID';
        return next(err);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Check if the mission exists and is of the correct type.
        const missionCheck = await client.query("SELECT id FROM missions WHERE id = $1 AND type = 'MANUAL_URL' AND deleted_at IS NULL", [id]);
        if (missionCheck.rowCount === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a URL-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }

        // Step 2: Check for existing completions for this mission.
        const completionCheck = await client.query('SELECT id FROM mission_completions WHERE mission_id = $1 LIMIT 1', [id]);
        if (completionCheck.rowCount > 0) {
            const err = new Error('Cannot delete mission because it has existing completions.');
            err.statusCode = 400;
            err.code = 'DELETION_BLOCKED';
            throw err;
        }

        // Step 3: Soft-delete the mission.
        const deleteQuery = 'UPDATE missions SET deleted_at = NOW() WHERE id = $1';
        await client.query(deleteQuery, [id]);

        await client.query('COMMIT');

        res.locals.statusCode = 204;
        next();

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = deleteUrlMission;
