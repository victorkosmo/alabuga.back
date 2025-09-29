// app/routes/webRoutes/store/campaigns/id/items/id/uploadImage.js
const pool = require('@db');
const { isUUID } = require('validator');
const multer = require('multer');
const path = require('path');
const { uploadFileToMinio } = require('@features/useMinioBucket');

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
 * /web/store/campaigns/{campaignId}/items/{itemId}/image:
 *   post:
 *     tags:
 *       - Store
 *     summary: Upload an image for a campaign-specific store item
 *     description: Uploads an image for a store item within a specific campaign and updates its `image_url`. Requires authentication. The file should be sent as `multipart/form-data`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The UUID of the campaign.
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The UUID of the store item.
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
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/StoreItem' }
 *                 message: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const uploadCampaignStoreItemImage = async (req, res, next) => {
    try {
        const { campaignId, itemId } = req.params;

        if (!isUUID(campaignId) || !isUUID(itemId)) {
            const err = new Error('Invalid campaign or item ID format');
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

        // Check if the campaign-specific store item exists
        const itemExists = await pool.query(
            'SELECT id FROM store_items WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL',
            [itemId, campaignId]
        );
        if (itemExists.rows.length === 0) {
            const err = new Error(`Store item with ID ${itemId} not found in campaign ${campaignId}.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const file = req.file;
        const fileName = `items/${itemId}${path.extname(file.originalname)}`;

        const { url } = await uploadFileToMinio(file.buffer, fileName, file.mimetype);

        const { rows } = await pool.query(
            'UPDATE store_items SET image_url = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3 RETURNING *',
            [url, itemId, campaignId]
        );

        res.locals.data = rows[0];
        res.locals.message = 'Campaign store item image uploaded successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = [upload.single('image'), uploadCampaignStoreItemImage];
