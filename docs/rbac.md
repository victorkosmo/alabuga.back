# Role-Based Access Control (RBAC) Implementation Guide (Universal)

**Goal:** To establish a consistent, maintainable, and understandable approach for implementing Role-Based Access Control (RBAC) across various Express.js projects. This guide promotes modularity and clear separation of concerns.

---

## Core Principles

1.  **Principle of Least Privilege:** Grant users only the minimum level of access required to perform their tasks.
2.  **Centralized Role Definitions:** Define roles (e.g., `ADMIN`, `EDITOR`, `VIEWER`) in a single, authoritative location within your project. This ensures consistency in role names and values.
3.  **Route-Specific RBAC Middleware:** Implement RBAC checks as dedicated middleware functions. Ideally, these are co-located with the route groups or features they protect.
4.  **Standardized Error Handling:** Use consistent error responses for authorization failures (typically HTTP 403 Forbidden), adhering to your project's overall API error handling strategy.
5.  **Clear API Documentation:** Explicitly document RBAC requirements for each protected endpoint in your API documentation (e.g., Swagger/OpenAPI).

---

## 1. Defining Roles

Roles should be defined as constants in a central, easily accessible location within your project. This is often part of your authentication setup or a dedicated configuration file.

*   **Location Example:** `your_project/config/roles.js` or `your_project/middleware/auth_setup.js`
*   **Purpose:** Ensures that role names are consistent throughout the application, preventing typos and making roles easy to reference.

```javascript
// Example: your_project/config/roles.js
const USER_ROLES = {
    ADMIN: 'ADMIN',
    EDITOR: 'EDITOR',
    VIEWER: 'VIEWER',
    // Add other application-specific roles here
};

module.exports = { USER_ROLES };
```

When a user authenticates (e.g., via JWT), their role should be decoded and made available on the `req` object (e.g., `req.user.role` or `req.auth.role`).

## 2. Implementing RBAC Middleware

RBAC middleware functions are responsible for checking if the authenticated user has the necessary role(s) to access a particular resource or perform an action.

*   **Location:** Create a dedicated `rbac.js` (or similarly named) file within each feature's route directory (e.g., `your_project/routes/feature_x/rbac.js`). This keeps RBAC logic modular and close to the routes it protects.
*   **Functionality:**
    *   Each middleware should perform a specific permission check.
    *   Access user information (including their role) from the `req` object.
    *   If the permission check fails:
        *   Create a standard `Error` object (e.g., `new Error('Insufficient permissions.')`).
        *   Set an appropriate HTTP status code on the error (e.g., `err.statusCode = 403`).
        *   Optionally, set a specific error code (e.g., `err.code = 'FORBIDDEN'` or `err.code = 'INSUFFICIENT_ROLE'`).
        *   Pass the error to the next middleware: `return next(err);`.
    *   If the permission check passes, call `next()` to proceed.

```javascript
// Example: your_project/routes/articles/rbac.js
const { USER_ROLES } = require('../../config/roles'); // Adjust path as needed

/**
 * Middleware to allow access only to users with the 'ADMIN' role.
 */
const adminOnly = (req, res, next) => {
    // Assuming user role is available on req.user.role after authentication
    if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
        const err = new Error('Insufficient permissions. Administrator access required.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN'; // Or a more specific code
        return next(err);
    }
    next();
};

/**
 * Middleware to allow access to 'ADMIN' or 'EDITOR' roles.
 */
const adminOrEditor = (req, res, next) => {
    if (!req.user || ![USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(req.user.role)) {
        const err = new Error('Insufficient permissions. Administrator or Editor access required.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        return next(err);
    }
    next();
};

module.exports = {
    adminOnly,
    adminOrEditor,
};
```

## 3. Applying RBAC Middleware to Routes

Import and apply your RBAC middleware functions to specific routes or routers. This is typically done in the main router file for a feature (e.g., `your_project/routes/feature_x/index.js`).

*   **Order Matters:** Ensure that your primary authentication middleware (which populates `req.user` or similar) runs *before* any RBAC middleware.

```javascript
// Example: your_project/routes/articles/index.js
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth_middleware'); // Your auth middleware
const { adminOnly, adminOrEditor } = require('./rbac');
const articleController = require('./articleController');

// Apply authentication middleware to all routes in this group
router.use(ensureAuthenticated);

// Public route (accessible to any authenticated user)
router.get('/', articleController.listArticles);

// Route requiring 'ADMIN' or 'EDITOR' role
router.post('/', adminOrEditor, articleController.createArticle);

// Route requiring 'ADMIN' role only
router.delete('/:id', adminOnly, articleController.deleteArticle);

module.exports = router;
```

## 4. Documenting RBAC with Swagger/OpenAPI

Clearly document RBAC requirements in your API documentation.

### 4.1. Security Scheme
Ensure your API documentation defines the authentication mechanism used (e.g., Bearer token).

```yaml
# In your main OpenAPI definition file
components:
  securitySchemes:
    bearerAuth: # Or your chosen scheme name
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 4.2. Documenting 403 Forbidden Responses
For each route protected by RBAC, document the standard 403 Forbidden error response.

*   Reference your project's global error response schema if you have one.
*   Provide a clear description and an example of the 403 error.

```yaml
# Example Swagger/OpenAPI annotation for a protected route
# paths:
#   /articles/{id}:
#     delete:
#       summary: Delete an article (Admin only)
#       security:
#         - bearerAuth: [] # Indicates this endpoint uses bearerAuth
#       parameters:
#         # ...
#       responses:
#         '204':
#           description: Article deleted successfully.
#         '401':
#           $ref: '#/components/responses/UnauthorizedError' # If you have global responses
#         '403':
#           description: Forbidden - Insufficient permissions. User does not have the required role.
#           content:
#             application/json:
#               schema:
#                 $ref: '#/components/schemas/ErrorResponse' # Reference your global error schema
#               examples:
#                 ForbiddenAccess:
#                   value:
#                     success: false
#                     error:
#                       code: "FORBIDDEN" # Or "INSUFFICIENT_ROLE"
#                       message: "Insufficient permissions. Administrator access required."
#         '404':
#           $ref: '#/components/responses/NotFoundError'
```

## 5. Best Practices

*   **Keep RBAC Logic Simple:** Middleware should focus solely on role checks. Avoid embedding complex business logic.
*   **Consistent Error Responses:** Use standardized error codes (e.g., `FORBIDDEN`, `INSUFFICIENT_ROLE`) and messages for 403 errors.
*   **Granular Permissions (If Needed):** For more complex scenarios, consider evolving from simple roles to a permission-based system, though role-based access is often sufficient.
*   **Thorough Testing:** Test RBAC implementations rigorously with users assigned different roles to ensure correct access control.
*   **Regular Review:** Periodically review RBAC policies and role definitions as your application evolves.

---

By following these generalized guidelines, different Express projects can implement a robust and maintainable RBAC system that aligns with common architectural best practices.
