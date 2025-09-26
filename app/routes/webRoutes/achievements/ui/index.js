// app/routes/webRoutes/achievements/ui/index.js
const express = require('express');
const router = express.Router();

const listMinimalAchievements = require('./listMinimal');

/**
 * @swagger
 * /web/achievements/ui/list-minimal:
 *   get:
 *     tags:
 *       - Achievements
 *     summary: List achievements in a minimal format (UI helper)
 *     description: Retrieve a minimal list of achievements (ID and name) for a specific campaign, suitable for UI selectors.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to filter achievements by.
 *     responses:
 *       200:
 *         description: A minimal list of achievements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/list-minimal', listMinimalAchievements);

module.exports = router;
