# Express.js Boilerplate Backend

This repository provides a robust and well-structured boilerplate for building Node.js backend applications using Express.js. It comes pre-configured with a common set of tools and practices to accelerate development.

## Core Stack

*   **Framework:** Express.js
*   **Database:** PostgreSQL (with Knex.js for query building and migrations)
*   **Authentication:** JWT (JSON Web Tokens)
*   **API Documentation:** Swagger (OpenAPI)
*   **Middleware:** Includes `cors`, `body-parser`, `morgan`, `cookie-parser`
*   **Environment Management:** `dotenv`
*   **Password Hashing:** Native `crypto` module (PBKDF2)
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

## API Routing Structure

The application is divided into three distinct routing groups based on the target user and authentication method:

*   **`/admin` - Admin Routes**
    *   **Authentication:** API Key (`x-api-key` header).
    *   **Purpose:** For trusted server-to-server communication or high-level administrative tasks (e.g., creating initial manager accounts).

*   **`/web` - Web Dashboard Routes**
    *   **Authentication:** JWT Bearer Token.
    *   **Purpose:** Powers the web-based dashboard for managers (HR, Organizers, Admins) to manage game content, moderate submissions, and view analytics.

*   **`/tma` - Telegram Mini App Routes**
    *   **Authentication:** (Not yet implemented) Will use a custom authentication strategy based on Telegram's validation data.
    *   **Purpose:** For end-users (players) interacting with the gamification platform via the Telegram Mini App.

This boilerplate aims to provide a solid foundation for building scalable and maintainable APIs. Refer to the `app/docs` directory for more detailed setup and usage guides.
