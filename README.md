# Express.js Boilerplate Backend

This repository provides a robust and well-structured boilerplate for building Node.js backend applications using Express.js. It comes pre-configured with a common set of tools and practices to accelerate development.

## Core Stack

*   **Framework:** Express.js
*   **Database:** PostgreSQL (with Knex.js for query building and migrations)
*   **Authentication:** JWT (JSON Web Tokens)
*   **API Documentation:** Swagger (OpenAPI) integrated with `swagger-ui-express`
*   **Middleware:** Includes `cors`, `body-parser`, `morgan`, `cookie-parser`
*   **Environment Management:** `dotenv`
*   **Password Hashing:** `bcryptjs`
*   **Path Aliasing:** `module-alias` (e.g., `@db`, `@middleware`, `@features`)

## Key Features

*   **Standardized Response Formatting:** Consistent success and error response structures.
*   **Centralized Error Handling:** Middleware to manage and format error responses.
*   **JWT Authentication:** Secure endpoints with token-based authentication.
*   **Database Migrations:** `knexfile.js` setup for managing database schema changes.
*   **Structured Routing:** Organized routes with a clear pattern for adding new entities.
*   **Feature Modules:** Guidance for separating complex business logic (`app/features`).
*   **Swagger API Documentation:** Auto-generated and browsable API docs.
*   **Basic Security:** Includes `cors` and example API key authentication.

This boilerplate aims to provide a solid foundation for building scalable and maintainable APIs. Refer to the `app/docs` directory for more detailed setup and usage guides.
