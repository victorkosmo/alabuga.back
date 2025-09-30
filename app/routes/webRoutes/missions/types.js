// app/routes/webRoutes/missions/types.js

/**
 * @swagger
 * /web/missions/types:
 *   get:
 *     tags:
 *       - Missions
 *     summary: Get a list of supported mission types
 *     description: Retrieves a list of mission types that can be created through the web interface. This is useful for populating UI selectors.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of supported mission types.
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
 *                       value:
 *                         type: string
 *                         description: The internal enum value for the mission type.
 *                         example: "MANUAL_URL"
 *                       label:
 *                         type: string
 *                         description: A human-readable label for the mission type.
 *                         example: "URL Submission"
 *                       description:
 *                         type: string
 *                         description: A brief explanation of the mission type.
 *                         example: "A mission where the user submits a URL for manual review."
 *                 message:
 *                   type: string
 *                   example: "Supported mission types retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getMissionTypes = (req, res, next) => {
    try {
        // Currently, only MANUAL_URL is supported for creation via the web panel.
        // This can be expanded as more mission type creation routes are added.
        const supportedTypes = [
            {
                value: 'MANUAL_URL',
                label: 'URL Submission',
                description: 'A mission where the user submits a URL for manual review.'
            },
            {
                value: 'QR_CODE',
                label: 'QR Code Scan',
                description: 'A mission where the user scans a QR code to get a secret code.'
            },
            {
                value: 'QUIZ',
                label: 'Quiz',
                description: 'A mission where the user answers a series of questions.'
            }
        ];

        res.locals.data = supportedTypes;
        res.locals.message = 'Supported mission types retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = getMissionTypes;
