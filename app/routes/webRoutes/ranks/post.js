// app/routes/webRoutes/ranks/post.js
const pool = require('@db');
const { uploadFileToMinio } = require('@features/useMinioBucket');

/**
 * @swagger
 * /web/ranks:
 *   post:
 *     tags:
 *       - Ranks
 *     summary: Create a new rank
 *     description: Creates a new rank. Requires authentication. `unlock_conditions` must be a valid JSON string.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, priority, unlock_conditions]
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title for the new rank.
 *                 example: "Новый ранг"
 *               description:
 *                 type: string
 *                 description: An optional description for the rank.
 *               priority:
 *                 type: integer
 *                 description: The priority of the rank for ordering.
 *                 example: 10
 *               unlock_conditions:
 *                 type: string
 *                 description: A JSON string defining the conditions to unlock this rank.
 *                 example: '{"required_experience": 100}'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: An optional image file for the rank.
 *     responses:
 *       201:
 *         description: Rank created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Rank'
 *                 message:
 *                   type: string
 *                   example: "Rank created successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Conflict - A rank with this title already exists.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createRank = async (req, res, next) => {
    try {
        const { title, description, priority, unlock_conditions } = req.body;

        if (!title || !priority || !unlock_conditions) {
            const err = new Error('title, priority, and unlock_conditions are required fields.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        let parsedUnlockConditions;
        try {
            parsedUnlockConditions = JSON.parse(unlock_conditions);
        } catch (e) {
            const err = new Error('unlock_conditions must be a valid JSON string.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        let imageUrl = null;
        if (req.file) {
            const originalName = `ranks/image_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
            const result = await uploadFileToMinio(req.file.buffer, originalName, req.file.mimetype);
            imageUrl = result.url;
        }

        const { rows } = await pool.query(
            `INSERT INTO ranks (title, description, priority, unlock_conditions, image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title.trim(), description, parseInt(priority, 10), parsedUnlockConditions, imageUrl]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Rank created successfully.';
        next();

    } catch (err) {
        if (err.code === '23505' && err.constraint === 'ranks_title_key') {
            const conflictError = new Error(`A rank with the title '${req.body.title.trim()}' already exists.`);
            conflictError.statusCode = 409;
            conflictError.code = 'RANK_TITLE_CONFLICT';
            return next(conflictError);
        }
        next(err);
    }
};

module.exports = createRank;
