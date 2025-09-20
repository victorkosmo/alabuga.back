const pool = require('@db');
const { verifyPassword, generateAccessToken, generateRefreshToken } = require('@services/authService');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - auth
 *     summary: Login user
 *     description: Authenticate user and return access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     access:
 *                       type: string
 *                     refresh:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            const err = new Error('Email and password are required');
            err.statusCode = 400;
            err.code = 'MISSING_FIELDS';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email]
        );

        if (rows.length === 0) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.code = 'INVALID_CREDENTIALS';
            return next(err);
        }

        const user = rows[0];

        // Verify password
        const isPasswordValid = verifyPassword(password, user.password, user.password_salt);

        if (!isPasswordValid) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.code = 'INVALID_CREDENTIALS';
            return next(err);
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.locals.data = {
            access: accessToken,
            refresh: refreshToken
        };
        res.locals.message = 'Login successful';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = loginUser;
