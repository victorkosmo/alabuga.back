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
        const supportedTypes = [
            {
                "value": "MANUAL_URL",
                "label": "Отправка ссылки (ручная проверка)",
                "description": "Участник пришлёт вам ссылку — например, на резюме, пост в VK или профиль в LinkedIn. Система НЕ проверит это сама: вам придётся лично посмотреть и нажать «зачтено» или «отклонить». Выбирайте этот тип, если нужно оценить что-то субъективное — например, творческое задание или личный профиль."
            },
            {
                "value": "QR_CODE",
                "label": "Сканирование QR-кода (автоматически)",
                "description": "Участник сканирует QR-код — и всё! Система сразу засчитывает миссию без вашего участия. Идеально для офлайн-событий: отметка на входе, бонус за посещение стенда или подтверждение, что слушатель досидел до конца доклада. Просто распечатайте код — и готово!"
            },
            {
                "value": "QUIZ",
                "label": "Квиз / викторина (автоматически)",
                "description": "Создаёте вопросы — система сама проверяет ответы и засчитывает миссию. Подходит для викторин, тестов на знание темы, сбора обратной связи или просто для развлечения. Вы задаёте правила один раз — дальше всё работает без вас."
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
