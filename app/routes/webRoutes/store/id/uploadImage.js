// app/routes/webRoutes/store/id/uploadImage.js
const pool = require('@db');
const { isUUID } = require('validator');
const multer = require('multer');
const path = require('path');
const { uploadFileToMinio } = require('../../../../features/useMinioBucket');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image file.'), false);
        }
    },
});

/**
 * @swagger
 * /web/store/{id}/image:
 *   post:
 *     tags:
 *       - Store
 *     summary: Upload an image for a global store item
 *     description: Uploads an image for a specific global store item and updates its `image_url`. Requires authentication. The file should be sent as `multipart/form-data`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the global store item.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The item image file to upload.
 *     responses:
 *       200:
 *         description: Item image uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StoreItem'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const uploadStoreItemImage = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid store item ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (!req.file) {
            const err = new Error('No file uploaded. Please include a file in the "image" field.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Check if global store item exists
        const itemExists = await pool.query('SELECT id FROM store_items WHERE id = $1 AND is_global = true AND deleted_at IS NULL', [id]);
        if (itemExists.rows.length === 0) {
            const err = new Error(`Global store item with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const file = req.file;
        const fileName = `items/${id}${path.extname(file.originalname)}`;

        const { url } = await uploadFileToMinio(file.buffer, fileName, file.mimetype);

        const { rows } = await pool.query(
            'UPDATE store_items SET image_url = $1, updated_at = NOW() WHERE id = $2 AND is_global = true RETURNING *',
            [url, id]
        );

        res.locals.data = rows[0];
        res.locals.message = 'Store item image uploaded successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = [upload.single('image'), uploadStoreItemImage];
