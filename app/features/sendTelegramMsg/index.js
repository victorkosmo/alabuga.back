const axios = require('axios');

const BOT_URL = process.env.BOT_URL;
const API_KEY = process.env.API_KEY;

/**
 * Sends a message to a user via the Telegram bot.
 * @param {string|number} chatId - The Telegram chat ID of the recipient.
 * @param {string} message - The message content to send.
 * @returns {Promise<void>}
 */
const sendTelegramMessage = async (chatId, message) => {
    if (!BOT_URL || !API_KEY) {
        console.error('BOT_URL or API_KEY is not configured in environment variables. Cannot send Telegram message.');
        // We don't throw here to avoid breaking the main flow, just log the error and return.
        return;
    }

    const url = `${BOT_URL}/send-message`;
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
    };
    const data = {
        chat_id: chatId,
        message: message,
    };

    try {
        await axios.post(url, data, { headers });
        console.log(`Successfully sent Telegram message to chat ID: ${chatId}`);
    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Failed to send Telegram message to chat ID ${chatId}:`, errorMsg);
        // Do not re-throw to prevent transaction rollback for a notification failure.
    }
};

module.exports = {
    sendTelegramMessage,
};
