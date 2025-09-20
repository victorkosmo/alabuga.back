# API Routing Architecture & Best Practices

## 1. Guiding Philosophy

Our routing architecture is designed for three core goals: **predictability, scalability, and maintainability.** The primary objective is to eliminate "invisible wall" bugs where requests are silently routed to the wrong handler.

We achieve this with a single, non-negotiable principle: **Route ambiguity is forbidden.** We enforce this by structuring our URLs and file system in a way that makes ambiguity impossible.

---

## 2. The Forbidden Pattern: Ambiguous Sibling Routes

To understand our architecture, you must first understand the pattern we have banned and why it consistently fails.

An **ambiguous sibling route** occurs when a static path segment (like `/active`) exists at the same level as a dynamic, parameterized path segment (like `/:id`).

#### ⛔️ FORBIDDEN File Structure & Code:

**File Structure:**
```
/routes/users/
├── active.js     <-- Handles GET /users/active
├── get.js        <-- Handles GET /users/:id
└── index.js      <-- The ambiguous router
```

**Router Code (`/routes/users/index.js`):**

```javascript
// ⛔️ ANTI-PATTERN: DO NOT DO THIS.
const router = require('express').Router();
const getActiveUsers = require('./active');
const getUserById = require('./get');

// This code creates a routing conflict.
// The order might seem to fix it, but it's a fragile illusion.
router.get('/active', getActiveUsers);
router.get('/:id', getUserById);

module.exports = router;
```

### Technical Deep Dive: Why This Fails

This pattern creates a race condition in the Express routing engine. Here is what happens from a technical standpoint when a request for `GET /users/active` arrives:

1.  **Path Matching:** Express begins walking its internal list of registered routes to find a match. It sees two potentially matching patterns for the `users` router: `.../active` and `.../:id`.

2.  **Greedy Parameter Extraction:** The `/:id` pattern is "greedy." It is designed to match *any* string at that path segment. When the router sees the incoming segment `active`, it eagerly matches the `/:id` pattern and immediately performs a destructive action: **it sets `req.params.id = 'active'`**.

3.  **Incorrect Handler Invocation:** The router has now locked onto the `getUserById` handler. It will never consider the `getActiveUsers` handler, even if it was defined first.

4.  **Downstream Chaos:** The `getUserById` handler now executes with `req.params.id` holding the string `"active"`. This will inevitably cause an error. A database query will fail because `"active"` is not a valid UUID, leading to `400 Bad Request` or `500 Internal Server Error` responses.

This failure mode is catastrophic because it's not obvious. The developer sees a simple request for `/active` and gets a confusing error about an invalid ID, leading to hours of wasted debugging time. This pattern is fundamentally broken, and no amount of reordering can make it safe.

---

## 3. The Golden Rule: The "Sub-Resource First" Pattern

To permanently solve this, we enforce a structure that eliminates the ambiguity. Everything that comes after a resource ID is considered a distinct **sub-resource**, which is handled by a mandatory **sub-router**.

### 3.1. Handling Parameterized Routes

All parameterized routes (`/:id`, `/:vacancyId`, etc.) **must** be handled by a dedicated sub-router in a nested `id/` directory.

#### ✅ CORRECT File Structure & Code:

**File Structure:**
```
/routes/users/
├── id/               <-- MANDATORY directory for the /:id sub-router
│   ├── index.js      <-- The sub-router itself, using mergeParams
│   └── get.js
└── index.js          <-- The main group router, now clean
```

**Main Group Router (`/routes/users/index.js`):**
```javascript
const express = require('express');
const router = express.Router();
const idRouter = require('./id');

// This file is now ONLY responsible for non-parameterized routes
// and mounting the sub-router.
// e.g., router.get('/', listAllUsers);
//       router.post('/', createUser);

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);

module.exports = router;
```

**Sub-Router (`/routes/users/id/index.js`):**
```javascript
const express = require('express');
// `mergeParams: true` is MANDATORY to grant this router access to
// the `:id` parameter from its parent.
const router = express.Router({ mergeParams: true });

const getUserById = require('./get');

// This handler will be invoked for GET /users/:id
router.get('/', getUserById);

// You can add other verb handlers here:
// router.put('/', updateUser);
// router.delete('/', deleteUser);

module.exports = router;
```

### 3.2. Handling Static Collections & Commands

The forbidden `/users/active` route must be replaced with an unambiguous URL. The correct RESTful pattern is to use **query parameters** for filtering a collection.

| ⛔️ Forbidden Path | ✅ Correct Pattern & URL |
| :--- | :--- |
| `GET /users/active` | Use a query parameter: `GET /users?status=active` |
| `GET /users/all` | Same query parameter for a different view: `GET /users?view=all` or a different resource: `GET /meta/users` |

This logic belongs in the handler for the root path (`GET /users`), which inspects `req.query` to alter its behavior.

---

## 4. Scaling the Pattern: Deeply Nested Routes

This architecture scales perfectly to any depth. The rules are recursive.

Consider the path: `/vacancies/:vacancyId/hypotheses/:hypothesisId`

#### ✅ CORRECT Nested File Structure:
```
/routes/
└── vacancies/
    ├── id/  <----------------------------- Handles /:vacancyId
    │   ├── hypotheses/ <----------------- Handles the 'hypotheses' sub-resource
    │   │   ├── id/ <--------------------- Handles /:hypothesisId
    │   │   │   ├── index.js <------------ Innermost sub-router, with mergeParams
    │   │   │   └── get.js
    │   │   └── index.js <---------------- Hypotheses group router
    │   └── index.js <-------------------- Vacancy ID sub-router, with mergeParams
    └── index.js <------------------------ Top-level vacancies router
```

Each `index.js` in this chain is responsible for mounting the next segment. The `id/index.js` routers are responsible for everything related to that specific instance, including mounting further sub-resources. The `mergeParams: true` flag ensures that the innermost handler (e.g., `get.js`) has access to all parameters in the chain (`req.params.vacancyId` and `req.params.hypothesisId`).

By adhering strictly to this "Sub-Resource First" pattern, we build a routing system that is self-documenting, impossible to misconfigure, and completely free of "invisible wall" bugs.