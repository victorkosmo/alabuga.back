// app/services/authService.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Password hashing configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 128; // 128 bytes
const PBKDF2_DIGEST = 'sha256';
const SALT_LENGTH = 32; // 32 bytes

/**
 * Hashes a password using PBKDF2.
 * @param {string} password - The plain text password.
 * @returns {{salt: Buffer, hash: Buffer}} - The generated salt and hash.
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(
        password,
        salt,
        PBKDF2_ITERATIONS,
        PBKDF2_KEY_LENGTH,
        PBKDF2_DIGEST
    );
    return { salt, hash };
}

/**
 * Verifies a password against a stored hash and salt.
 * @param {string} password - The plain text password to verify.
 * @param {Buffer} storedHash - The hash stored in the database.
 * @param {Buffer} storedSalt - The salt stored in the database.
 * @returns {boolean} - True if the password matches, false otherwise.
 */
function verifyPassword(password, storedHash, storedSalt) {
    const hash = crypto.pbkdf2Sync(
        password,
        storedSalt,
        PBKDF2_ITERATIONS,
        PBKDF2_KEY_LENGTH,
        PBKDF2_DIGEST
    );
    return Buffer.compare(hash, storedHash) === 0;
}

/**
 * Generates a JWT Access Token.
 * @param {object} manager - Manager object from the database.
 * @returns {string} - The generated JWT Access Token.
 */
function generateAccessToken(manager) {
    return jwt.sign({
        userId: manager.id,
        email: manager.email,
        fullName: manager.full_name,
        role: manager.role
    }, JWT_SECRET, { expiresIn: '30m' });
}

/**
 * Generates a JWT Refresh Token.
 * @param {object} manager - Manager object from the database.
 * @returns {string} - The generated JWT Refresh Token.
 */
function generateRefreshToken(manager) {
    return jwt.sign({
        userId: manager.id,
        email: manager.email,
        fullName: manager.full_name,
        role: manager.role
    }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
};
