// ./db/migrations/add_achievements_global_store_items_and_ai_mission_type.js

/**
 * Applies schema modifications for achievements, global store items, and AI mission checking.
 * This migration implements:
 * 1. Achievements system tied to campaigns
 * 2. Global store items with campaign attachment
 * 3. AI-powered mission verification type
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // First, add the new AI_CHECK value to mission_type enum
  await knex.raw(`
    ALTER TYPE mission_type ADD VALUE IF NOT EXISTS 'AI_CHECK'
  `);

  // Create achievements table
  await knex.schema.createTable('achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .comment('Campaign this achievement belongs to');
    table
      .string('name', 255)
      .notNullable()
      .comment('Display name of the achievement (e.g., Блогер, Знаток завода)');
    table
      .text('description')
      .nullable()
      .comment('Detailed description of the achievement');
    table
      .text('image_url')
      .nullable()
      .comment('URL to the achievement badge image');
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When the achievement was created');
    
    // Add indexes for efficient querying
    table.index('campaign_id');
    table.index(['campaign_id', 'name']);
  });

  // Create user_achievements junction table
  await knex.schema.createTable('user_achievements', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('User who earned the achievement');
    table
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('achievements')
      .onDelete('CASCADE')
      .comment('Achievement that was earned');
    table
      .timestamp('awarded_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When the achievement was awarded to the user');
    
    // Composite primary key ensures a user can only have each achievement once
    table.primary(['user_id', 'achievement_id'], {constraintName: 'pk_user_achievements'});
    
    // Additional indexes for efficient querying
    table.index('user_id');
    table.index('achievement_id');
    table.index('awarded_at');
  });

  // Modify store_items table to add campaign_id and is_global
  await knex.schema.alterTable('store_items', (table) => {
    table
      .uuid('campaign_id')
      .nullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .comment('Campaign this store item belongs to. NULL for global items');
    table
      .boolean('is_global')
      .notNullable()
      .defaultTo(false)
      .comment('Whether this item is available across all campaigns');
    
    // Add index for efficient querying
    table.index('campaign_id');
    table.index('is_global');
    table.index(['campaign_id', 'is_active']);
  });

  // Create table for AI mission check details
  await knex.schema.createTable('mission_ai_check_details', (table) => {
    table
      .uuid('mission_id')
      .primary()
      .references('id')
      .inTable('missions')
      .onDelete('CASCADE')
      .comment('Foreign key linking to the specific mission');
    table
      .text('prompt_template')
      .notNullable()
      .comment('AI prompt template for evaluating user submission');
    table
      .jsonb('evaluation_criteria')
      .notNullable()
      .comment('JSON object defining specific criteria for AI evaluation');
    table
      .float('confidence_threshold')
      .notNullable()
      .defaultTo(0.8)
      .comment('Minimum confidence score required for automatic approval (0-1)');
    table
      .text('user_instruction')
      .notNullable()
      .comment('Instructions shown to users for this AI-checked mission');
  });
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop AI mission check details table
  await knex.schema.dropTableIfExists('mission_ai_check_details');

  // Remove campaign_id and is_global from store_items
  await knex.schema.alterTable('store_items', (table) => {
    table.dropColumn('is_global');
    table.dropColumn('campaign_id');
  });

  // Drop user_achievements table
  await knex.schema.dropTableIfExists('user_achievements');

  // Drop achievements table
  await knex.schema.dropTableIfExists('achievements');

  // Note: We cannot remove the AI_CHECK value from the enum type in PostgreSQL
};