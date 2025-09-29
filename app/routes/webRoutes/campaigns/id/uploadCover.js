// app/routes/webRoutes/campaigns/id/uploadCover.js
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
 * /web/campaigns/{id}/cover:
 *   post:
 *     tags:
 *       - Campaigns
 *     summary: Upload a cover image for a campaign
 *     description: Uploads a cover image for a specific campaign and updates the `cover_url`. Requires authentication. The file should be sent as `multipart/form-data`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the campaign.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: The cover image file to upload.
 *     responses:
 *       200:
 *         description: Cover image uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
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
const uploadCampaignCover = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (!req.file) {
            const err = new Error('No file uploaded. Please include a file in the "cover" field.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Check if campaign exists
        const campaignExists = await pool.query('SELECT id FROM campaigns WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (campaignExists.rows.length === 0) {
            const err = new Error(`Campaign with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const file = req.file;
        const fileName = `covers/${id}${path.extname(file.originalname)}`;

        const { url } = await uploadFileToMinio(file.buffer, fileName, file.mimetype);

        const { rows } = await pool.query(
            'UPDATE campaigns SET cover_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [url, id]
        );

        res.locals.data = rows[0];
        res.locals.message = 'Cover image uploaded successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = [upload.single('cover'), uploadCampaignCover];
