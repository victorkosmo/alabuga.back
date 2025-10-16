# Using Features for Complex Business Logic

This guide explains how to create, structure, and use "features" within this project. Features are self-contained modules of business logic that are too complex, too specific, or require separate testability to be included directly within route handlers.

**Core Principle:** Keep route handlers lean and focused on HTTP request/response concerns. Encapsulate significant business logic within the `app/features` directory.

---

## What is a "Feature"?

A feature is typically a JavaScript module (or a directory of modules) located in `app/features` that exports one or more functions. These functions perform specific tasks or implement business rules.

**When to create a Feature:**

*   **Complex Logic:** The logic involves multiple steps, calculations, or transformations.
*   **Reusability:** The same logic might be needed in multiple route handlers or even other features.
*   **Separation of Concerns:** You want to decouple business logic from the routing layer.
*   **Testability:** Features can be unit-tested independently of the Express request/response cycle, leading to more robust tests.
*   **Database Interactions:** While route handlers can interact with the database for simple CRUD, features can encapsulate more complex queries, transactions, or data manipulations.
*   **Third-party Service Integrations:** Logic for interacting with external APIs (e.g., payment gateways, notification services, AI services like Pinecone) is a prime candidate for a feature.

---

## Structure of a Feature

Features reside in the `app/features` directory. The structure can vary based on complexity:

**1. Simple Feature (Single File):**

For straightforward features, a single JavaScript file exporting the necessary functions is sufficient.

```
app/
└── features/
    └── exampleFeature/
        └── index.js       // Exports processData, normalizeString
    └── anotherSimpleFeature.js // Can also be a direct file if very small
```

**Example: `app/features/exampleFeature/index.js`**
```javascript
// app/features/exampleFeature/index.js

// const pool = require('@db'); // If DB access is needed

const normalizeString = (inputString) => {
    // ... implementation ...
    if (!inputString || typeof inputString !== 'string' || String(inputString).trim() === '') {
        return null;
    }
    return String(inputString).trim().toLowerCase();
};

const processData = async (data) => {
    // ... complex logic using normalizeString ...
    // ... potentially async operations ...
    const normalizedName = normalizeString(data.name);
    if (!normalizedName) return null;
    return { normalizedName, processedValue: (data.value || 0) * 2 };
};

module.exports = {
    processData,
    normalizeString,
};
```

**2. Complex Feature (Directory with Multiple Files):**

For more intricate features, especially those involving multiple related functionalities, configurations, or helper utilities, a dedicated directory is recommended.

```
app/
└── features/
    └── advancedAnalytics/
        ├── index.js                // Main entry point, exports public functions
        ├── dataProcessor.js
        ├── reportGenerator.js
        └── utils/
            ├── formattingHelpers.js
            └── validationRules.js
    └── usePinecone/              // Example from your project structure
        ├── config/
        │   └── pineconeConfig.js
        ├── delete.js
        ├── generateEmbedding.js
        ├── info.md
        ├── search.js
        ├── upsert.js
        └── vectorStringBuilder/
            └── ...
```
The `index.js` in a feature directory (e.g., `app/features/advancedAnalytics/index.js`) should act as the public API for that feature, exporting only the functions intended for external use.

---

## Using a Feature in a Route Handler

Features are imported into route handlers using the `@features` alias, which is configured in `package.json` (`_moduleAliases`).

**Example: Importing and using `exampleFeature` in a route handler:**

```javascript
// app/routes/some_entity/post.js
const express = require('express');
const router = express.Router();
const { processData } = require('@features/exampleFeature'); // Using the alias

/**
 * @swagger
 * /some-entity:
 *   post:
 *     summary: Create a new entity using a feature
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: number
 *     responses:
 *       '201':
 *         description: Entity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse' # Assuming generic success
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, value } = req.body;

        if (!name) {
            const err = new Error('Name is required for processing.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Call the feature function
        const processedResult = await processData({ name, value });

        if (!processedResult) {
            const err = new Error('Data processing failed due to invalid inputs for the feature.');
            err.statusCode = 400;
            err.code = 'FEATURE_PROCESSING_FAILED';
            return next(err);
        }

        // Assuming the feature's output is suitable for res.locals.data
        // Or you might transform it further
        res.locals.data = processedResult;
        res.locals.statusCode = 201; // Created
        res.locals.message = 'Entity processed and created successfully.';
        next();

    } catch (error) {
        // If the feature throws an error, it will be caught here
        // Ensure feature errors are either generic Errors or have statusCode/code
        console.error('Error in POST /some-entity:', error);
        next(error); // Pass to the global error handler
    }
});

module.exports = router; // Or however your route file exports
```