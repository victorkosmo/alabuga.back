**API Response Standardization**

**Goal:** To ensure all API endpoints in this repository return responses in a consistent format for predictable frontend integration and easier debugging.

**Implementation:** Centralized middleware (`app/middleware/responseFormatter.js` and `app/middleware/errorHandler.js`) handles the final JSON structure. **Your route handlers MUST follow the patterns below.**

**1. Successful Responses (2xx Status Codes):**

*   **NEVER** call `res.json()`, `res.send()`, or `res.status().json()` directly for success cases.
*   **ALWAYS** set the response data/metadata on `res.locals`:
    *   `res.locals.data`: The main payload (object or array). **Required.**
    *   `res.locals.meta`: Optional metadata object (e.g., `{ pagination: { ... } }`).
    *   `res.locals.message`: Optional success message string (e.g., "Resource updated.").
    *   `res.locals.statusCode`: Optional status code (defaults to 200). Use `201` for creations, `204` for successful deletions with no content.
*   **ALWAYS** call `next()` at the end of your successful logic path.

*   **Example (Success):**
    ```javascript
    // Inside async route handler
    const user = await findUser(userId);
    if (!user) { /* handle not found error - see below */ }

    res.locals.data = user;       // Set the user data
    // res.locals.statusCode = 200; // Optional, defaults to 200
    next();                       // Pass to responseFormatter
    ```
*   **Resulting JSON Structure:**
    ```json
    {
      "success": true,
      "data": { ... } || [ ... ],
      "message"?: "Optional success message",
      "meta"?: { ... }
    } // Or empty 204 response if res.locals.statusCode = 204
    ```

**2. Error Responses (4xx, 5xx Status Codes):**

*   **NEVER** call `res.status().json()` or `res.status().send()` directly for errors.
*   **ALWAYS** create a standard `Error` object.
*   **ALWAYS** set the desired HTTP status code on the error object using `err.statusCode`.
*   **ALWAYS** call `next(err)` with the error object.

*   **Example (Error):**
    ```javascript
    // Inside async route handler
    if (!req.body.name) {
      const err = new Error('Name is required');
      err.statusCode = 400; // Set HTTP status for Bad Request
      return next(err);       // Pass error to errorHandler
    }

    try {
        await someOperationThatMightFail();
        // ... success logic using res.locals and next() ...
    } catch (dbError) {
        // For unexpected errors, just pass them along
        next(dbError); // errorHandler will default to 500 if statusCode isn't set
    }
    ```
*   **Resulting JSON Structure:**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR" || "SPECIFIC_CODE", // Usually generic unless set on err.code
        "message": "Error message from new Error()",
        "stack"?: "..." // Development only
      },
      "data": null
    }
    ```

## 3. The `HANDLER_CONTRACT_VIOLATION` Error

Our `responseFormatter` is strict to prevent silent bugs. If you set any `res.locals` property (`message`, `statusCode`, `meta`) but forget `res.locals.data`, the system will throw a **`500 Handler Contract Violation`** error.

**Cause:** You intended a successful response but forgot the `data` payload.
**Fix:** Ensure you always set `res.locals.data` for any non-204 successful response. If there is no data, use `res.locals.data = {};`.


**Key Takeaway:** Your handlers prepare the data/error (`res.locals` or `Error` object) and pass control (`next()` or `next(err)`). The middleware does the rest. Adhere strictly to this pattern for all new and modified endpoints. Update Swagger definitions accordingly to reflect the standard envelopes.