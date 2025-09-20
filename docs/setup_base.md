# Adding a New Entity Route Group

This guide explains how to create the routes, handlers, and Swagger documentation for a new data entity (e.g., "Products", "Users", "Orders") in this project.

**Core Principle:** Follow the established structure and documentation patterns. Use the `app/routes/boilerplate_entity` directory **as a reference example only**. Do not modify the boilerplate directly for your new feature.

---

## Steps to Add a New Entity (e.g., "products")

1.  **Create Folder Structure:**
    *   Create a new directory under `app/routes/` named after your entity (plural noun recommended):
        ```bash
        mkdir app/routes/products
        mkdir app/routes/products/id # For routes accepting an ID parameter
        ```
    *   Create the necessary route handler files, mirroring the structure of `boilerplate_entity`:
        ```bash
        touch app/routes/products/index.js    # Main router & Schema Definition
        touch app/routes/products/list.js     # GET /products (List)
        touch app/routes/products/post.js     # POST /products (Create)
        touch app/routes/products/id/get.js   # GET /products/:id (Read one)
        touch app/routes/products/id/update.js # PUT /products/:id (Update one)
        touch app/routes/products/id/delete.js # DELETE /products/:id (Delete one)
        ```
        *(Adjust based on the actual CRUD operations needed for your entity).*

2.  **Define Main Router & Schema (`app/routes/products/index.js`):**
    *   Set up the basic Express router (`express.Router()`).
    *   Apply required middleware (e.g., `authenticateJWT`).
    *   **Crucially: Define the Swagger Schema for your entity (`Product`) here** within a `@swagger` block using `components: schemas: Product: ...`. See `boilerplate_entity/index.js` for the exact format. **This is the single source of truth for your entity's data structure in Swagger.**
    *   Import the route handlers you created (e.g., `require('./list')`, `require('./id/get')`).
    *   Define the routes using the imported handlers (e.g., `router.get('/', listProducts);`).
    *   Export the configured router.

3.  **Implement Route Handlers (e.g., `post.js`, `list.js`, `id/get.js`...):**
    *   Write the core logic for each endpoint (input validation, database interaction, preparing response data on `res.locals`, error handling).
    *   **Add `@swagger` annotations specific to each endpoint:**
        *   Define `tags`, `summary`, `description`, `security`, `parameters`, `requestBody` as needed.
        *   **Document Responses using `$ref`:**
            *   **Success Data:** Reference your locally defined schema:
                *   Single Entity: `data: { $ref: '#/components/schemas/Product' }`
                *   List of Entities: `data: { type: array, items: { $ref: '#/components/schemas/Product' } }`
            *   **Pagination Meta:** Reference the global schema: `meta: { properties: { pagination: { $ref: '#/components/schemas/Pagination' } } }`
            *   **Standard Errors (400, 401, 404, 500):** Reference global *responses*: `$ref: '#/components/responses/BadRequestError'`, etc.
            *   **Specific Errors (e.g., 409 Conflict):** Define the response, reference the global error *schema*: `schema: { $ref: '#/components/schemas/ErrorResponse' }`, and provide specific `examples`.
    *   Refer to `app/docs/swagger.md` and the `boilerplate_entity` handlers for detailed examples of response definitions.

4.  **Register New Routes:**
    *   Open the main route aggregation file (likely `app/routes/index.js` or where `boilerplate_entity` is registered in `app.js`).
    *   Import your new entity router: `const productRoutes = require('./products');`
    *   Mount it under its designated path: `router.use('/products', productRoutes);`

5.  **Database & Services (Beyond Routes):**
    *   Remember to create the necessary database table(s)/migrations for your `products` entity.
    *   Consider if complex business logic should be abstracted into a separate service layer (`app/services/`).

---

## Quick Checklist & Key Reminders

*   ✅ Did you create a new folder (`app/routes/your_entity`)?
*   ✅ Did you define the primary entity schema (`YourEntity`) **only** in `app/routes/your_entity/index.js`?
*   ✅ Are your individual route handlers (`post.js`, `list.js`, etc.) correctly referencing schemas using `$ref`?
    *   `#/components/schemas/YourEntity` for success data.
    *   `#/components/schemas/Pagination` for pagination meta.
    *   `#/components/responses/...` for standard errors.
    *   `#/components/schemas/ErrorResponse` (with examples) for specific errors.
*   ✅ Did you register the new router in the main application?
*   ✅ Consult `app/routes/boilerplate_entity` and `app/docs/swagger.md` frequently.

By following these steps and referencing the boilerplate, you can consistently add new features while maintaining the project's architectural and documentation standards.
```