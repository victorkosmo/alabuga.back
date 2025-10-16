# Database Migrations with Knex (Our Standard)

This document defines our standard practices for managing database schema evolution using Knex.js. Adhering to these standards ensures clarity, consistency in version control, and simplifies collaboration when making database changes. The core focus is on the **naming, structure, and content** of migration files, reflecting the business logic behind each modification.

## Core Principles

*   **Configuration:** Knex is configured via `knexfile.js` in the project root. This file dictates the database connection (through the `PG_STRING` environment variable) and specifies the migration file directory: `./db/migrations/`.
*   **Migration File Standard:**
    *   **Path:** All migration files **must** reside in the `./db/migrations/` directory.
    *   **Filename (Initial Creation):** Developers must name migration files descriptively using `snake_case.js`. The name should clearly articulate the business purpose or the specific schema alteration. **No timestamp or numerical prefix should be added by the developer during initial file creation.**
        *   Example: `db/migrations/enable_multi_region_inventory_support.js`
    *   **Filename (Final State for Execution):** Before execution by Knex (typically via CI/CD or a lead developer), these descriptive filenames will be prefixed (e.g., `YYYYMMDDHHMMSS_` or `001_`) to ensure deterministic execution order. Developers authoring the migration focus on the descriptive part.
*   **Content:** Each migration file must export:
    *   `exports.up`: An `async function` containing Knex code to apply the schema changes.
    *   `exports.down`: An `async function` containing Knex code to reliably revert the `up` function's changes.
*   **Database-Level Comments:** We mandate the use of `.comment()` on **column definitions only** within migrations to provide in-database documentation about their purpose. **Do not use `.comment()` on table creation** as this is not supported by Knex and will cause migration failures.
*   **PostgreSQL Types and Enums:** When creating custom PostgreSQL types or enums, all values **must be in UPPERCASE** to maintain consistency and follow PostgreSQL conventions.

## Critical Error Scenarios to Avoid

**❌ Table Comments (Not Supported):** 
```javascript
// This will cause: "knex.schema.createTable(...).comment is not a function"
exports.up = async function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('name');
  }).comment('Stores user information'); // ❌ This will fail
};
```

**✅ Correct Approach (Column Comments Only):**
```javascript
exports.up = async function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().comment('Primary identifier for user records');
    table.string('name').comment('Full name of the user');
  });
};
```

**❌ Lowercase Enum Values:**
```javascript
// Inconsistent with PostgreSQL conventions
await knex.raw(`
  CREATE TYPE status AS ENUM ('active', 'inactive', 'pending')
`);
```

**✅ Correct Enum Values (Uppercase):**
```javascript
await knex.raw(`
  CREATE TYPE status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING')
`);
```

## Structuring a Migration File

Every new migration file should follow this structural template:

```javascript
// ./db/migrations/your_descriptive_filename.js

/**
 * Applies the schema modifications.
 * This migration implements [briefly describe the business reason or feature].
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Knex schema builder commands to apply changes.
  // Remember to include .comment() for columns only (not tables).
  // Use UPPERCASE values for custom PostgreSQL types and enums.
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Knex schema builder commands to revert changes.
};
```

## Production-Grade Migration Examples

The following examples illustrate our standards for more complex, real-world schema changes.

**Scenario 1: Implementing User Account Tiers with Feature Flags**

**Business Need:** Introduce different user account tiers (e.g., 'free', 'premium', 'enterprise') and associate specific feature flags with these tiers.

**Migration 1.1: Create Account Tiers Table**

*   **File Path:** `db/migrations/create_account_tiers_table.js`
*   **Content:**

```javascript
// ./db/migrations/create_account_tiers_table.js

exports.up = async function(knex) {
  return knex.schema.createTable('account_tiers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('tier_name', 50).unique().notNullable().comment('Unique identifier for the account tier (e.g., FREE, PREMIUM, ENTERPRISE).');
    table.text('description').nullable().comment('User-friendly description of the tier and its benefits.');
    table.decimal('monthly_price', 10, 2).notNullable().defaultTo(0.00).comment('Monthly subscription price for this tier.');
    table.integer('max_projects').unsigned().nullable().comment('Maximum number of projects allowed for this tier, null for unlimited.');
    table.boolean('is_active').defaultTo(true).notNullable().comment('Indicates if this tier is currently available for new signups or assignments.');
    table.jsonb('metadata').nullable().comment('Additional arbitrary properties associated with the tier.');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  }); // Note: No .comment() on table creation
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('account_tiers');
};
```

**Migration 1.2: Link Users to Account Tiers**

*   **File Path:** `db/migrations/add_account_tier_foreign_key_to_users.js`
*   **Prerequisite:** An `users` table must exist.
*   **Content:**

```javascript
// ./db/migrations/add_account_tier_foreign_key_to_users.js

exports.up = async function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.uuid('account_tier_id')
      .nullable()
      .references('id')
      .inTable('account_tiers')
      .onDelete('SET NULL') // If a tier is deleted, users revert to a null (or default) tier
      .onUpdate('CASCADE')
      .comment('Foreign key linking the user to their subscribed account tier.')
      .index(); // Index for efficient querying of users by tier.
  });
};

exports.down = async function(knex) {
  return knex.schema.alterTable('users', (table) => {
    // It's good practice to drop the index before the foreign key constraint if it was explicitly named.
    // Knex typically handles this, but for more complex scenarios:
    // await knex.schema.alterTable('users', t => t.dropIndex(['account_tier_id'], 'users_account_tier_id_index'));
    table.dropForeign(['account_tier_id']); // Or table.dropColumn('account_tier_id'); if FK is auto-dropped
    table.dropColumn('account_tier_id');
  });
};
```

**Migration 1.3: Create Feature Flags Table and Tier-to-Flag Mapping**

*   **File Path:** `db/migrations/create_feature_flags_and_tier_mapping_tables.js`
*   **Content:**

```javascript
// ./db/migrations/create_feature_flags_and_tier_mapping_tables.js

exports.up = async function(knex) {
  await knex.schema.createTable('feature_flags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('flag_key', 100).unique().notNullable().comment('Unique programmatic key for the feature flag (e.g., ADVANCED_REPORTING).');
    table.text('description').nullable().comment('Explanation of what this feature flag controls.');
    table.boolean('is_globally_enabled').defaultTo(false).notNullable().comment('If true, this feature is enabled for everyone, overriding tier settings.');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  }); // No .comment() on table

  await knex.schema.createTable('account_tier_feature_flags', (table) => {
    table.uuid('account_tier_id').notNullable().references('id').inTable('account_tiers').onDelete('CASCADE');
    table.uuid('feature_flag_id').notNullable().references('id').inTable('feature_flags').onDelete('CASCADE');
    table.primary(['account_tier_id', 'feature_flag_id'], {constraintName: 'pk_tier_flag_map'}); // Composite primary key
    table.boolean('is_enabled').defaultTo(true).notNullable().comment('Is this specific feature enabled for this specific tier?');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  }); // No .comment() on table
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('account_tier_feature_flags');
  await knex.schema.dropTableIfExists('feature_flags');
};
```

**Scenario 2: Creating User Preferences with Enum Types**

**Business Need:** Add user preferences including theme selection using PostgreSQL enums.

**Migration 2.1: Create User Preferences with Enum Type**

*   **File Path:** `db/migrations/create_user_preferences_table.js`
*   **Content:**

```javascript
// ./db/migrations/create_user_preferences_table.js

exports.up = async function(knex) {
  // Create theme enum first with UPPERCASE values
  await knex.raw(`
    CREATE TYPE user_preference_theme AS ENUM (
      'LIGHT',
      'DARK',
      'SYSTEM'
    )
  `);

  // Create notification frequency enum
  await knex.raw(`
    CREATE TYPE notification_frequency AS ENUM (
      'IMMEDIATE',
      'DAILY',
      'WEEKLY',
      'NEVER'
    )
  `);

  return knex.schema.createTable('user_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').comment('Foreign key to the user who owns these preferences.');
    table.specificType('theme', 'user_preference_theme').defaultTo('SYSTEM').comment('User interface theme preference.');
    table.specificType('notification_frequency', 'notification_frequency').defaultTo('DAILY').comment('How often the user wants to receive notifications.');
    table.boolean('email_notifications').defaultTo(true).comment('Whether user wants to receive email notifications.');
    table.jsonb('custom_settings').nullable().comment('Additional user-specific settings stored as JSON.');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Ensure one preference record per user
    table.unique(['user_id']);
  }); // No .comment() on table creation
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.raw('DROP TYPE IF EXISTS notification_frequency');
  await knex.raw('DROP TYPE IF EXISTS user_preference_theme');
};
```

## Key Takeaways

1. **Never use `.comment()` on table creation** - it will cause migration failures
2. **Use `.comment()` only on individual columns** for documentation
3. **Always use UPPERCASE values** for PostgreSQL enums and custom types
4. **Create custom types before referencing them** in table definitions
5. **Drop dependencies in reverse order** in the `down` function