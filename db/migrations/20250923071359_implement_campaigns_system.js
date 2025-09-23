// ./db/migrations/implement_campaigns_system.js

/**
 * Implements the campaigns system for event-driven, invite-only mission funnels.
 * This migration adds campaigns as a core entity to contain missions and control user access.
 * Business driver: Enable HR to quickly launch, segment, and analyze distinct events
 * (e.g., university hackathons, employee onboarding) without manual tracking.
 */

exports.up = async function(knex) {
  // Step 1: Create campaign status enum
  await knex.raw(`
    CREATE TYPE campaign_status AS ENUM (
      'DRAFT',
      'ACTIVE', 
      'PAUSED',
      'COMPLETED',
      'ARCHIVED'
    )
  `);

  // Step 2: Create campaigns table
  await knex.schema.createTable('campaigns', (table) => {
    table
      .uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for the campaign.');

    table
      .string('title', 255)
      .notNullable()
      .comment('Display name of the campaign visible to admins and users.');

    table
      .text('description')
      .nullable()
      .comment('Detailed description of the campaign purpose and goals.');

    table
      .string('activation_code', 50)
      .unique()
      .notNullable()
      .comment('Unique code that users enter to join this campaign. Serves as entry point.');

    table
      .specificType('status', 'campaign_status')
      .notNullable()
      .defaultTo('DRAFT')
      .comment('Current status of the campaign lifecycle.');

    table
      .timestamp('start_date')
      .nullable()
      .comment('When the campaign becomes active and users can join.');

    table
      .timestamp('end_date')
      .nullable()
      .comment('When the campaign closes and no new participants can join.');

    table
      .integer('max_participants')
      .unsigned()
      .nullable()
      .comment('Maximum number of users who can join this campaign. NULL for unlimited.');

    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('managers')
      .onDelete('RESTRICT')
      .comment('The manager who created this campaign.');

    table
      .jsonb('metadata')
      .nullable()
      .comment('Additional campaign-specific settings and configuration data.');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the campaign was created.');

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the campaign was last modified.');

    table
      .timestamp('deleted_at')
      .nullable()
      .comment('Timestamp for soft deletion of campaigns.');

    // Indexes for performance
    table.index('activation_code');
    table.index('status');
    table.index(['start_date', 'end_date']);
    table.index('created_by');
  });

  // Step 3: Create user_campaigns join table
  await knex.schema.createTable('user_campaigns', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('The user who joined the campaign.');

    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .comment('The campaign the user has joined.');

    table
      .timestamp('joined_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When the user joined this campaign.');

    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true)
      .comment('Whether the user is still active in this campaign.');

    table
      .jsonb('join_metadata')
      .nullable()
      .comment('Additional data captured when user joined (referral source, etc.).');

    // Composite primary key - a user can only join a campaign once
    table.primary(['user_id', 'campaign_id'], {
      constraintName: 'pk_user_campaigns'
    });

    // Indexes for efficient querying
    table.index('campaign_id');
    table.index('joined_at');
    table.index(['campaign_id', 'is_active']);
  });

  // Step 4: Create campaign_templates table (for future template functionality)
  await knex.schema.createTable('campaign_templates', (table) => {
    table
      .uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for the campaign template.');

    table
      .string('name', 255)
      .notNullable()
      .comment('Name of the template for admin identification.');

    table
      .text('description')
      .nullable()
      .comment('Description of what this template is designed for.');

    table
      .jsonb('template_data')
      .notNullable()
      .comment('JSON structure containing the campaign configuration and mission definitions.');

    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('managers')
      .onDelete('RESTRICT')
      .comment('The manager who created this template.');

    table
      .boolean('is_public')
      .notNullable()
      .defaultTo(false)
      .comment('Whether this template can be used by other managers.');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When the template was created.');

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When the template was last modified.');

    table
      .timestamp('deleted_at')
      .nullable()
      .comment('Timestamp for soft deletion of templates.');

    // Indexes
    table.index('created_by');
    table.index('is_public');
  });

  // Step 5: Add campaign_id to missions table (making it required)
  await knex.schema.alterTable('missions', (table) => {
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .comment('The campaign this mission belongs to. Every mission must be part of a campaign.')
      .index();
  });

  // Step 6: Update QR triggers to support campaign-specific activation codes
  await knex.schema.alterTable('qr_triggers', (table) => {
    table
      .uuid('campaign_id')
      .nullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .comment('Optional campaign association for QR codes that auto-join users to campaigns.')
      .index();
  });
};

exports.down = async function(knex) {
  // Remove foreign key constraints and columns in reverse order
  await knex.schema.alterTable('qr_triggers', (table) => {
    table.dropForeign(['campaign_id']);
    table.dropColumn('campaign_id');
  });

  await knex.schema.alterTable('missions', (table) => {
    table.dropForeign(['campaign_id']);
    table.dropColumn('campaign_id');
  });

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('campaign_templates');
  await knex.schema.dropTableIfExists('user_campaigns');
  await knex.schema.dropTableIfExists('campaigns');

  // Drop the enum type
  await knex.raw('DROP TYPE IF EXISTS campaign_status');
};