// app/routes/webRoutes/missions/typeQr/id/uploadCover.js
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
 * /web/missions/type-qr/{id}/cover:
 *   post:
 *     tags:
 *       - Missions
 *     summary: Upload a cover image for a QR code-based mission
 *     description: Uploads a cover image for a specific mission of type 'QR_CODE' and updates the `cover_url`. Requires authentication. The file should be sent as `multipart/form-data`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the mission.
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
 *                   $ref: '#/components/schemas/Mission'
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
const uploadQrMissionCover = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid mission ID format');
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

        // Check if mission exists and is of the correct type
        const missionExists = await pool.query("SELECT id FROM missions WHERE id = $1 AND type = 'QR_CODE' AND deleted_at IS NULL", [id]);
        if (missionExists.rows.length === 0) {
            const err = new Error(`Mission with ID ${id} not found or is not a QR-type mission.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const file = req.file;
        const fileName = `mission-covers/${id}${path.extname(file.originalname)}`;

        const { url } = await uploadFileToMinio(file.buffer, fileName, file.mimetype);

        const { rows } = await pool.query(
            'UPDATE missions SET cover_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [url, id]
        );

        res.locals.data = rows[0];
        res.locals.message = 'Cover image uploaded successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = [upload.single('cover'), uploadQrMissionCover];
