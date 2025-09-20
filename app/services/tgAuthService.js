const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generates a JWT Access Token for a TMA user.
 * @param {object} user - User object from the database.
 * @returns {string} - The generated JWT Access Token.
 */
function generateAccessToken(user) {
    return jwt.sign({
        userId: user.id, // Our internal UUID
        tgId: user.tg_id,
        username: user.username,
    }, JWT_SECRET, { expiresIn: '30m' });
}

/**
 * Generates a JWT Refresh Token for a TMA user.
 * @param {object} user - User object from the database.
 * @returns {string} - The generated JWT Refresh Token.
 */
function generateRefreshToken(user) {
    // For refresh tokens, we might want a smaller payload
    return jwt.sign({
        userId: user.id,
        tgId: user.tg_id,
    }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
