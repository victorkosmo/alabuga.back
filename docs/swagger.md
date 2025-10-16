**Swagger Documentation Guidelines**

**Goal:** Maintain accurate, consistent, and reusable API documentation using Swagger annotations (`@swagger`). Define entity schemas locally within feature route folders and leverage reusable components defined globally (`app/swagger/openapi.json`) for standard structures and common error responses.

**Core Pattern:**

1.  **Global Definitions (`app/swagger/openapi.json`):** Defines the base OpenAPI info, security schemes, and reusable **components** like:
    *   Standard response *schemas* (`ErrorResponse`, `Pagination`).
    *   Common, predefined error *responses* (`BadRequestError`, `UnauthorizedError`, `NotFoundError`, `InternalServerError`). These responses bundle a status code, description, and reference the `ErrorResponse` schema.
    *   **DO NOT** add endpoint paths or entity-specific data schemas (like `Task`, `Product`) here.
2.  **Local Feature Definitions (`app/routes/{feature_name}/index.js`):**
    *   This file is the **single source of truth** for the data schema of the feature's main entity (e.g., `Task`, `BoilerplateEntity`).
    *   Define the entity schema under a `@swagger` block using `components: schemas: YourEntityName: ...`.
    *   This schema will be referenced by individual route handlers (`post.js`, `get.js`, etc.) within the same feature folder.
3.  **Individual Route Handlers (`app/routes/{feature_name}/post.js`, etc.):**
    *   Document the specific endpoint (path, method, tags, summary, description, security, parameters).
    *   **Reference** schemas and responses defined elsewhere using `$ref`.

**How to Document Responses in Route Files (`post.js`, `get.js`, etc.):**

1.  **Success Responses (2xx):**
    *   Define the *full success envelope* (`success: true`, `data`, `meta?`, `message?`) inline.
    *   For the `data` property containing a single entity: **Reference** the locally defined entity schema: `data: { $ref: '#/components/schemas/BoilerplateEntity' }`.
    *   For the `data` property containing a list: Use `type: array` and **reference** the local entity schema in `items`: `data: { type: array, items: { $ref: '#/components/schemas/BoilerplateEntity' } }`.
    *   For `meta.pagination`: **Reference** the global schema: `pagination: { $ref: '#/components/schemas/Pagination' }`.
    *   **Example (Create Success):**
        ```yaml
              201:
                description: Entity created successfully.
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        success: { type: boolean, example: true }
                        data: { $ref: '#/components/schemas/BoilerplateEntity' } # <-- Ref local schema
                        message: { type: string, example: "Entity created successfully." }
        ```

2.  **Common Error Responses (Standard 400, 401, 404, 500):**
    *   For generic errors where the response structure is already defined globally: **Reference** the predefined *response* from `openapi.json`.
    *   **This is the most common case for standard errors.**
    *   **Example:**
        ```yaml
              400:
                $ref: '#/components/responses/BadRequestError' # <-- Ref global RESPONSE
              401:
                $ref: '#/components/responses/UnauthorizedError' # <-- Ref global RESPONSE
              404:
                $ref: '#/components/responses/NotFoundError' # <-- Ref global RESPONSE
              500:
                $ref: '#/components/responses/InternalServerError' # <-- Ref global RESPONSE
        ```

3.  **Specific Business Logic Errors (e.g., 409 Conflict, Specific 400 Validation):**
    *   Use these when a *standard* error code needs a *more specific* description or `error.code` for this particular endpoint context.
    *   Define the specific HTTP status code (e.g., `409`).
    *   Use the `description` field to explain the *specific* business rule violation.
    *   For the response `content`: **Reference** the standard error *schema* (`ErrorResponse`) from `openapi.json`.
    *   Provide an `example` (or `examples`) within the `content` definition to show the specific `code` and `message` for *this particular business error*.
    *   **Example (Specific 409 Conflict):**
        ```yaml
              409:
                description: Conflict - An entity with this name already exists. # Specific description
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/ErrorResponse' # <-- Ref global SCHEMA
                    examples:
                      EntityNameConflict: # Example key
                        value:
                          success: false
                          error:
                            code: "ENTITY_NAME_CONFLICT" # Specific code
                            message: "An entity with the provided name already exists." # Specific message
                          data: null
        ```

**Key Distinction:**

*   Use `$ref: '#/components/responses/...'` to reuse **entire, predefined response definitions** (like standard 400, 401 errors) from `openapi.json`.
*   Use `$ref: '#/components/schemas/...'` to reference **data structures** when defining the *content* of a response. This applies to:
    *   The `data` in success responses (referencing `#/components/schemas/YourEntityName`).
    *   The `meta.pagination` in list responses (referencing `#/components/schemas/Pagination`).
    *   The `schema` within the `content` of *specific* error responses (referencing `#/components/schemas/ErrorResponse`).

**Summary:** Define entity schemas locally in `index.js`. Always reference components using `$ref`. Use global *responses* for common errors, and reference the global error *schema* when defining *specific* errors with custom examples.