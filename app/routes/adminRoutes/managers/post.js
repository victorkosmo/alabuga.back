const pool = require('@db');
const { hashPassword } = require('@services/authService');

/**
 * @swagger
 * /admin/managers:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new manager
 *     description: Creates a new manager account (e.g., HR, Organizer, Admin). Requires admin-level API key.
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - full_name
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "new.manager@example.com"
 *               full_name:
 *                 type: string
 *                 example: "Jane Doe"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Str0ngP@ssw0rd!"
 *               role:
 *                 type: string
 *                 enum: [HR, ORGANIZER, ADMIN]
 *                 example: "HR"
 *     responses:
 *       201:
 *         description: Manager created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Manager' }
 *                 message: { type: string, example: "Manager created successfully." }
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Conflict - A manager with this email already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ManagerEmailConflict:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "MANAGER_EMAIL_CONFLICT"
 *                     message: "A manager with this email already exists."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createManager = async (req, res, next) => {
    try {
        const { email, full_name, password, role } = req.body;

        // Validation
        if (!email || !full_name || !password || !role) {
            const err = new Error('Missing required fields: email, full_name, password, role');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const validRoles = ['HR', 'ORGANIZER', 'ADMIN'];
        if (!validRoles.includes(role)) {
            const err = new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Hash password
        const { salt, hash } = hashPassword(password);

        // Insert into database
        const { rows } = await pool.query(
            `INSERT INTO managers (email, full_name, password, password_salt, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, full_name, role, created_at`,
            [email, full_name, hash, salt, role]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Manager created successfully.';
        next();
    } catch (err) {
        // Handle unique constraint violation for email
        if (err.code === '23505' && err.constraint === 'managers_email_key') {
            const conflictErr = new Error('A manager with this email already exists.');
            conflictErr.statusCode = 409;
            conflictErr.code = 'MANAGER_EMAIL_CONFLICT';
            return next(conflictErr);
        }
        next(err);
    }
};

module.exports = createManager;
