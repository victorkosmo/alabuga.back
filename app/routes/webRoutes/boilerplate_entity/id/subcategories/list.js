// app/routes/boilerplate_entity/id/subcategories/list.js

/**
 * @swagger
 * /boilerplate_entity/{id}/subcategories:
 *   get:
 *     tags:
 *       - boilerplate_entity
 *     summary: List subcategories for a boilerplate_entity
 *     description: Retrieve a list of all subcategories associated with a specific boilerplate_entity. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the parent boilerplate_entity.
 *     responses:
 *       200:
 *         description: A list of subcategories.
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listSubcategories = async (req, res, next) => {
    try {
        // This demonstrates accessing the parent router's param `id`
        // thanks to `mergeParams: true` in the sub-routers.
        const { id: entityId } = req.params;

        // In a real application, you would query the database for subcategories
        // related to the entityId. This is placeholder data.
        const placeholderSubcategories = [
            { id: 1, name: `Subcategory A for entity ${entityId}` },
            { id: 2, name: `Subcategory B for entity ${entityId}` }
        ];

        res.locals.data = placeholderSubcategories;
        res.locals.message = `Subcategories for entity ${entityId} retrieved successfully.`;
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listSubcategories;
