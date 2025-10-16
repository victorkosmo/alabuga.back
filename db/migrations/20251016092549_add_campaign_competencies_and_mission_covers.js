// ./db/migrations/add_campaign_competencies_and_mission_covers.js

/**
 * Applies schema modifications to support campaign-specific competencies and mission cover images.
 * 
 * This migration implements:
 * 1. Campaign-scoped competencies alongside global competencies
 * 2. Mission cover image URLs for visual presentation
 * 
 * Business Context:
 * - Competencies can now be global (cross-campaign) or specific to individual campaigns
 * - Missions can have cover images to enhance user engagement
 * 
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Step 1: Add campaign_id and is_global columns to competencies table
  await knex.schema.alterTable('competencies', (table) => {
    table.uuid('campaign_id')
      .nullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .comment('NULL for global competencies, campaign ID for campaign-specific competencies.');
    
    table.boolean('is_global')
      .notNullable()
      .defaultTo(true)
      .comment('True for global competencies available across all campaigns, false for campaign-specific competencies.');
  });

  // Step 2: Update existing competencies to be global (backward compatibility)
  await knex('competencies').update({
    is_global: true,
    campaign_id: null
  });

  // Step 3: Add indexes for efficient querying
  await knex.schema.alterTable('competencies', (table) => {
    table.index('campaign_id');
    table.index('is_global');
  });

  // Step 4: Add partial unique index for global competencies
  // This ensures global competency names are unique
  await knex.raw(`
    CREATE UNIQUE INDEX idx_competencies_global_name 
    ON competencies (name) 
    WHERE is_global = true AND deleted_at IS NULL
  `);

  // Step 5: Add partial unique index for campaign-specific competencies
  // This ensures competency names are unique within each campaign
  await knex.raw(`
    CREATE UNIQUE INDEX idx_competencies_campaign_name 
    ON competencies (campaign_id, name) 
    WHERE is_global = false AND campaign_id IS NOT NULL AND deleted_at IS NULL
  `);

  // Step 6: Add check constraint to ensure data integrity
  // Either (is_global = true AND campaign_id IS NULL) OR (is_global = false AND campaign_id IS NOT NULL)
  await knex.raw(`
    ALTER TABLE competencies 
    ADD CONSTRAINT chk_competencies_scope 
    CHECK (
      (is_global = true AND campaign_id IS NULL) OR 
      (is_global = false AND campaign_id IS NOT NULL)
    )
  `);

  // Step 7: Add cover_url column to missions table
  await knex.schema.alterTable('missions', (table) => {
    table.text('cover_url')
      .nullable()
      .comment('URL to the mission cover image displayed in the user interface.');
  });
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * 
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Step 1: Remove cover_url from missions
  await knex.schema.alterTable('missions', (table) => {
    table.dropColumn('cover_url');
  });

  // Step 2: Drop check constraint
  await knex.raw(`
    ALTER TABLE competencies 
    DROP CONSTRAINT IF EXISTS chk_competencies_scope
  `);

  // Step 3: Drop partial unique indexes
  await knex.raw('DROP INDEX IF EXISTS idx_competencies_campaign_name');
  await knex.raw('DROP INDEX IF EXISTS idx_competencies_global_name');

  // Step 4: Drop regular indexes
  await knex.schema.alterTable('competencies', (table) => {
    table.dropIndex('is_global');
    table.dropIndex('campaign_id');
  });

  // Step 5: Remove campaign_id and is_global columns from competencies
  await knex.schema.alterTable('competencies', (table) => {
    table.dropForeign(['campaign_id']);
    table.dropColumn('campaign_id');
    table.dropColumn('is_global');
  });
};