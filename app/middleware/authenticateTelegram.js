const crypto = require('crypto');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Verifies the authenticity of data received from the Telegram Mini App.
 * @param {string} initData - The initData string from the Mini App.
 * @returns {boolean} - True if the data is authentic, false otherwise.
 */
function verifyTelegramWebAppData(initData) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not configured on the server.');
        return false;
    }

    if (!initData || typeof initData !== 'string') {
        return false;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
        return false;
    }

    urlParams.delete('hash');
    const dataCheckArr = [];
    for (const [key, value] of urlParams.entries()) {
        dataCheckArr.push(`${key}=${value}`);
    }

    const dataCheckString = dataCheckArr.sort().join('\n');

    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(TELEGRAM_BOT_TOKEN)
        .digest();

    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return calculatedHash === hash;
}

/**
 * Parses the user object from a valid initData string.
 * @param {string} initData - The initData string.
 * @returns {object|null} - The parsed user object or null if parsing fails.
 */
function parseUserFromInitData(initData) {
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (!userStr) return null;
        return JSON.parse(decodeURIComponent(userStr));
    } catch (e) {
        console.error('Failed to parse user data from initData:', e);
        return null;
    }
}

/**
 * Middleware to authenticate a request from a Telegram Mini App.
 * It verifies `initData` from the request body.
 * If valid, it parses the user data and attaches it to `req.tgUser`.
 */
const authenticateTelegram = (req, res, next) => {
    const { initData } = req.body;

    if (!initData) {
        const err = new Error('initData is required');
        err.statusCode = 400;
        err.code = 'MISSING_INIT_DATA';
        return next(err);
    }

    const isValid = verifyTelegramWebAppData(initData);

    if (!isValid) {
        const err = new Error('Invalid Telegram data');
        err.statusCode = 401;
        err.code = 'INVALID_TELEGRAM_DATA';
        return next(err);
    }

    const tgUser = parseUserFromInitData(initData);

    if (!tgUser || !tgUser.id) {
        const err = new Error('Could not parse user data from initData');
        err.statusCode = 400;
        err.code = 'INVALID_USER_DATA';
        return next(err);
    }

    // Attach validated user info to the request object
    req.tgUser = tgUser;

    next();
};

module.exports = { authenticateTelegram };
