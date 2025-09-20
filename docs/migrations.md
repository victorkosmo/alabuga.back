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

## ⚠️ FORBIDDEN OPERATIONS

The following operations are **strictly prohibited** in migrations and will be rejected:

### 🚫 1. Database Views
**FORBIDDEN:** Creating, modifying, or dropping database views is not allowed in migrations.
```javascript
// ❌ This is FORBIDDEN
exports.up = async function(knex) {
  await knex.raw(`
    CREATE VIEW user_summary AS 
    SELECT id, name, email FROM users WHERE active = true
  `);
};
```
**Reason:** Views are complex database objects that require backend team oversight for performance, security, and maintainability considerations.

### 🚫 2. Database Triggers  
**FORBIDDEN:** Creating, modifying, or dropping database triggers is absolutely prohibited.
```javascript
// ❌ This is FORBIDDEN - MOST CRITICAL RULE
exports.up = async function(knex) {
  await knex.raw(`
    CREATE TRIGGER update_modified_time 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column()
  `);
};
```
**Reason:** Triggers can have significant impact on database performance, data integrity, and application behavior. They must be managed exclusively by the backend team.

### 🚫 3. Unsupported Knex Table Types
**FORBIDDEN:** Using PostgreSQL-specific data types that are not supported by Knex's table builder.
```javascript
// ❌ This will cause migration failure
exports.up = async function(knex) {
  return knex.schema.createTable('network_logs', (table) => {
    table.uuid('id').primary();
    table.inet('ip_address'); // ❌ ERROR: table.inet is not a function
    table.macaddr('mac_address'); // ❌ ERROR: table.macaddr is not a function
  });
};
```

**✅ Correct approach - Use `specificType()` for unsupported types:**
```javascript
exports.up = async function(knex) {
  return knex.schema.createTable('network_logs', (table) => {
    table.uuid('id').primary();
    table.specificType('ip_address', 'inet').comment('IP address of the client');
    table.specificType('mac_address', 'macaddr').nullable().comment('MAC address when available');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
```

**Common unsupported types that require `specificType()`:**
- `inet` (IP addresses)
- `macaddr` (MAC addresses) 
- `cidr` (Network addresses)
- `ltree` (Label tree)
- `hstore` (Key-value pairs)
- Custom composite types
- Array types like `text[]`, `integer[]`

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

**❌ Attempting to Create Existing Enum Types:**
```javascript
// This will fail if the enum already exists
exports.up = async function(knex) {
  return knex.schema.createTable('orders', (table) => {
    table
      .enu('status', ['NEW', 'PROCESSING', 'SHIPPED'], {
        useNative: true,
        enumName: 'order_status', // ❌ Tries to create enum that may already exist
      })
      .notNullable();
  });
};
```

**✅ Using Existing Enum Types:**
```javascript
// Use specificType() to reference existing enums
exports.up = async function(knex) {
  return knex.schema.createTable('orders', (table) => {
    table
      .specificType('status', 'order_status') // ✅ Uses existing enum type
      .notNullable()
      .comment('Current status of the order');
  });
};
```

**❌ Mixing Enum Creation Methods:**
```javascript
// Don't mix raw enum creation with Knex enum helpers
exports.up = async function(knex) {
  await knex.raw(`CREATE TYPE my_status AS ENUM ('ACTIVE', 'INACTIVE')`);
  
  return knex.schema.createTable('items', (table) => {
    table.enu('status', ['ACTIVE', 'INACTIVE'], { 
      useNative: true, 
      enumName: 'my_status' // ❌ Enum already created above
    });
  });
};
```

**✅ Consistent Enum Usage Pattern:**
```javascript
// Create enum with raw SQL, use with specificType()
exports.up = async function(knex) {
  // Create the enum type first
  await knex.raw(`
    CREATE TYPE my_status AS ENUM ('ACTIVE', 'INACTIVE')
  `);
  
  // Use the enum in table creation
  return knex.schema.createTable('items', (table) => {
    table
      .specificType('status', 'my_status') // ✅ Reference the created enum
      .notNullable()
      .comment('Current status of the item');
  });
};
```

## Working with PostgreSQL Enum Types

### Creating New Enum Types
When creating new custom enum types, always use raw SQL and `specificType()`:

```javascript
exports.up = async function(knex) {
  // Step 1: Create the enum type
  await knex.raw(`
    CREATE TYPE contact_status AS ENUM (
      'NEW',
      'CONTACTED', 
      'RESPONDED',
      'QUALIFIED',
      'NOT_INTERESTED',
      'INVALID'
    )
  `);
  
  // Step 2: Use the enum in table creation
  return knex.schema.createTable('contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .specificType('status', 'contact_status')
      .defaultTo('NEW')
      .notNullable()
      .comment('Current status of the contact');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('contacts');
  await knex.raw('DROP TYPE IF EXISTS contact_status');
};
```

### Using Existing Enum Types
When referencing enum types that already exist in your database:

```javascript
exports.up = async function(knex) {
  return knex.schema.createTable('contact_status_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('contact_id').notNullable().references('id').inTable('contacts');
    
    // Use existing enum types with specificType()
    table
      .specificType('previous_status', 'contact_status')
      .nullable()
      .comment('The status before the change. NULL for initial creation.');
    
    table
      .specificType('new_status', 'contact_status')
      .notNullable()
      .comment('The status after the change.');
      
    table.timestamp('changed_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('contact_status_history');
  // Note: Don't drop the enum type if other tables are using it
};
```

### Key Rules for Enum Types

1. **Create enums with `knex.raw()`** - Use raw SQL for reliable enum creation
2. **Reference enums with `specificType()`** - Never use `table.enu()` with existing enums
3. **Use UPPERCASE values** - Follow PostgreSQL conventions
4. **Check for existence** - Use `IF NOT EXISTS` when creating, `IF EXISTS` when dropping
5. **Consider dependencies** - Don't drop enums that other tables might still be using

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
  // Use specificType() for existing enum types.
  // NEVER create views or triggers.
  // Use specificType() for PostgreSQL types not supported by Knex.
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Knex schema builder commands to revert changes.
  // Drop dependencies in reverse order.
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

**Scenario 3: Adding Table with Existing Enum Type**

**Business Need:** Create a contact status history table that uses an existing `contact_status` enum.

**Migration 3.1: Contact Status History Table**

*   **File Path:** `db/migrations/create_contact_status_history_table.js`
*   **Prerequisite:** The `contact_status` enum and related tables already exist.
*   **Content:**

```javascript
// ./db/migrations/create_contact_status_history_table.js

/**
 * Migration to create the 'contact_status_history' table for funnel analytics.
 * This migration uses an existing 'contact_status' enum type that was created
 * in a previous migration.
 */

exports.up = async function(knex) {
  return knex.schema.createTable('contact_status_history', (table) => {
    table
      .uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for the history record.');

    table
      .uuid('contact_id')
      .notNullable()
      .references('id')
      .inTable('contacts')
      .onDelete('CASCADE')
      .comment('The contact whose status changed.');

    // Use existing enum type with specificType()
    table
      .specificType('previous_status', 'contact_status')
      .nullable()
      .comment('The status before the change. NULL for initial creation.');

    table
      .specificType('new_status', 'contact_status')
      .notNullable()
      .comment('The status after the change.');

    table
      .uuid('changed_by_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('The user who initiated the change. NULL for automated system changes.');

    table
      .timestamp('changed_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('The exact timestamp when the status was changed.');

    // Indexes for performance
    table.index(['contact_id', 'changed_at']);
    table.index('new_status');
    table.index('changed_at');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('contact_status_history');
  // Note: Don't drop the contact_status enum as other tables may be using it
};
```

**Scenario 4: Working with Network Data Types**

**Business Need:** Create a table to store network connection logs with IP addresses and MAC addresses.

**Migration 4.1: Network Logs Table with PostgreSQL Network Types**

*   **File Path:** `db/migrations/create_network_logs_table.js`
*   **Content:**

```javascript
// ./db/migrations/create_network_logs_table.js

exports.up = async function(knex) {
  return knex.schema.createTable('network_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Use specificType() for PostgreSQL network types not supported by Knex
    table
      .specificType('source_ip', 'inet')
      .notNullable()
      .comment('Source IP address of the connection');
    
    table
      .specificType('destination_ip', 'inet')
      .notNullable()
      .comment('Destination IP address of the connection');
    
    table
      .specificType('mac_address', 'macaddr')
      .nullable()
      .comment('MAC address of the client device when available');
    
    table
      .specificType('network_range', 'cidr')
      .nullable()
      .comment('Network range for subnet-based operations');
    
    table.integer('port').unsigned().comment('Port number used in the connection');
    table.string('protocol', 10).comment('Network protocol (TCP, UDP, etc.)');
    table.bigInteger('bytes_transferred').unsigned().defaultTo(0).comment('Total bytes transferred in the session');
    table.timestamp('connection_start').defaultTo(knex.fn.now()).comment('When the connection was established');
    table.timestamp('connection_end').nullable().comment('When the connection was closed');
    
    // Indexes for network queries
    table.index('source_ip');
    table.index('destination_ip');
    table.index(['connection_start', 'connection_end']);
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('network_logs');
};
```

## Key Takeaways

1. **Never use `.comment()` on table creation** - it will cause migration failures
2. **Use `.comment()` only on individual columns** for documentation
3. **Always use UPPERCASE values** for PostgreSQL enums and custom types
4. **Create custom types before referencing them** in table definitions
5. **Use `specificType()` for existing enum types** - never use `table.enu()` with existing enums
6. **Create enums with raw SQL** for reliable and predictable behavior
7. **Check enum existence** when creating or dropping to avoid conflicts
8. **Drop dependencies in reverse order** in the `down` function
9. **Don't drop shared enum types** unless you're certain no other tables use them
10. **🚫 NEVER create views or triggers** - these are managed by the backend team
11. **Use `specificType()` for unsupported PostgreSQL types** like `inet`, `macaddr`, `cidr`, etc.