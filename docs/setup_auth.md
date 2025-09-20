# Developer Note: Authentication Token Data Model Alignment

## Overview

When setting up a new project from our Express boilerplate, **critical alignment** between JWT token payload and the project's user data model is required. Failure to properly configure this alignment will result in authentication failures, particularly during token refresh operations.

## The Problem

Our boilerplate includes a standardized authentication system with default user fields (`id`, `email`, `username`). However, each project has unique business requirements that affect the user data model:

- **Project A**: Users have `name` instead of `username` + `role` field
- **Project B**: Users have `organizationId` for multi-tenant architecture  
- **Project C**: Users have `department` and `permissions` arrays
- **Project D**: Simple model with only `id` and `email`

## Critical Files Requiring Updates

The following files **MUST** be updated to match your project's data model:

```
app/middleware/authenticateJWT.js
app/services/authService.js  
app/routes/auth/login.js
app/routes/auth/refresh.js
app/routes/auth/me.js
```

## Case Study: The Missing Field Bug

**Scenario**: Project had users with `name` and `role` fields instead of `username`.

**What Happened**:
1. Login endpoint worked (generated tokens with correct fields)
2. Token refresh **failed** because SQL query only fetched `id, email`
3. New tokens were generated with `null` values for `name` and `role`
4. Authentication middleware rejected tokens due to missing required fields

**Error**: `"INVALID_TOKEN_PAYLOAD: Malformed authentication data"`

## Step-by-Step Configuration Guide

### 1. Identify Your User Data Model

First, examine your users table and business requirements:

```sql
-- Example: Project with name and role
SELECT id, email, name, role FROM users LIMIT 1;

-- Example: Multi-tenant project  
SELECT id, email, username, organization_id FROM users LIMIT 1;
```

### 2. Update authService.js Token Functions

**Default Boilerplate**:
```js
function generateAccessToken(user) {
    return jwt.sign({
        userId: user.id,
        email: user.email,
        username: user.username  // ⚠️ Default field
    }, JWT_SECRET, { expiresIn: '15m' });
}
```

**Example Fix for name + role project**:
```js
function generateAccessToken(user) {
    return jwt.sign({
        userId: user.id,
        email: user.email,
        name: user.name,        // ✅ Project-specific field
        role: user.role         // ✅ Project-specific field  
    }, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
    return jwt.sign({
        userId: user.id,
        email: user.email,
        name: user.name,        // ✅ Must match access token
        role: user.role         // ✅ Must match access token
    }, JWT_SECRET, { expiresIn: '7d' });
}
```

### 3. Update authenticateJWT.js Middleware

**Default Boilerplate**:
```js
jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
        // ... error handling
    }
    
    req.user = decoded;  // ⚠️ No payload validation
    next();
});
```

**Example Fix**:
```js
jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
        const error = new Error('Unauthorized');
        error.statusCode = 401;
        error.code = err.name === "TokenExpiredError" ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        return next(error);
    }
    
    // ✅ Validate required fields match your data model
    if (!decoded.userId || !decoded.email || !decoded.name || !decoded.role) {
        const payloadError = new Error('Malformed authentication data');
        payloadError.statusCode = 401;
        payloadError.code = 'INVALID_TOKEN_PAYLOAD';
        return next(payloadError);
    }
    
    // ✅ Set user info matching your requirements
    req.user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
    };
    
    next();
});
```

### 4. Update Database Queries in Auth Routes

**Critical**: All auth endpoints must fetch the **same fields** used in token generation.

**login.js** - Update user fetch query:
```js
const { rows } = await pool.query(
    'SELECT id, email, name, role, password, password_salt FROM users WHERE email = $1 AND deleted_at IS NULL',
    //     ^^^^^^^^^^^^^ ✅ Include all fields needed for tokens
    [email]
);
```

**refresh.js** - Update user fetch query:
```js
const { rows } = await pool.query(
    'SELECT id, email, name, role FROM users WHERE id = $1 AND deleted_at IS NULL',
    //     ^^^^^^^^^^^^^ ✅ Must match token generation fields exactly
    [decoded.userId]
);
```

**me.js** - Update response fields:
```js
const { rows } = await pool.query(
    'SELECT id, email, name, role FROM users WHERE id = $1 AND deleted_at IS NULL',
    //     ^^^^^^^^^^^^^ ✅ Return fields that make sense for your business logic
    [user.userId]
);
```

## Common Data Model Patterns

### Multi-tenant with Organization
```js
// Token payload
{
    userId: user.id,
    email: user.email,
    organizationId: user.organization_id,
    role: user.role
}

// Validation
if (!decoded.userId || !decoded.email || !decoded.organizationId || !decoded.role) {
    // reject token
}
```

### Role-based with Permissions
```js
// Token payload  
{
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions // Array of permission strings
}
```

### Minimal Model
```js
// Token payload
{
    userId: user.id,
    email: user.email
}

// Validation
if (!decoded.userId || !decoded.email) {
    // reject token
}
```