// app/routes/apiRoutes/bot/ping.js
/**
 * @swagger
 * /api/bot/ping:
 *   get:
 *     tags:
 *       - API - Bot
 *     summary: Check API connectivity from the bot
 *     description: A simple endpoint for the Telegram bot to verify that it can communicate with the API.
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successful connection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "pong"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
const ping = async (req, res, next) => {
    try {
        res.locals.message = 'pong';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = ping;
