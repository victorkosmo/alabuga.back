// ./db/migrations/modify_ranks_to_titles_system.js

/**
 * Transforms the rank system from linear progression to dynamic titles/specializations.
 * This migration decouples mission access from ranks and makes ranks function as earned titles.
 * Also adds icon_url to campaigns for visual representation.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Modify the 'ranks' table for its new role as "Titles"
  await knex.schema.alterTable('ranks', (table) => {
    // Add new columns
    table.text('description').nullable().comment('Detailed description of what this title represents and how it is earned');
    table.text('image_url').nullable().comment('URL to the title badge/icon image displayed in the user interface');
  });

  // Rename sequence_order to priority
  await knex.schema.alterTable('ranks', (table) => {
    table.renameColumn('sequence_order', 'priority');
  });

  // Update column properties and defaults
  await knex.schema.alterTable('ranks', (table) => {
    table.integer('priority').defaultTo(0).alter();
  });

  // Update column comments to reflect new semantics
  await knex.raw(`
    COMMENT ON COLUMN ranks.title IS 'Display name of the Title/Specialization, e.g., "Пилот-испытатель", "Ветеран двух сезонов"'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN ranks.priority IS 'Priority level for display. If a user qualifies for multiple titles, the one with the highest priority is shown.'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN ranks.unlock_conditions IS 'JSON object describing the conditions to earn this title. Example: {"required_achievements": {"operator": "AND", "ids": ["ach_uuid_1", "ach_uuid_2"]}, "required_competencies": [{"id": "comp_uuid_1", "level": 3}]}'
  `);

  // Clear out old, now invalid, unlock conditions
  await knex('ranks').update({ unlock_conditions: {} });

  // 2. Modify the 'missions' table to decouple access logic from ranks
  await knex.schema.alterTable('missions', (table) => {
    // Make required_rank_id nullable
    table.uuid('required_rank_id').nullable().alter();
  });

  // Set all existing required ranks to NULL
  await knex('missions').update({ required_rank_id: null });

  // Update column comment to mark as deprecated
  await knex.raw(`
    COMMENT ON COLUMN missions.required_rank_id IS '[DEPRECATED] Access is now controlled by required_achievement_id. This field is kept for potential future use or legacy data but is not actively used for locking missions.'
  `);

  // 3. Modify the 'users' table to allow users to have no rank initially
  await knex.schema.alterTable('users', (table) => {
    // Make rank_id nullable
    table.uuid('rank_id').nullable().alter();
  });

  // 4. Add icon_url to campaigns table for visual representation
  await knex.schema.alterTable('campaigns', (table) => {
    table.text('icon_url').nullable().comment('URL to the campaign icon/logo image for visual identification');
  });

  // Update table comment to reflect new purpose
  await knex.raw(`
    COMMENT ON TABLE ranks IS 'Stores dynamic Titles/Specializations that users can earn. The user is assigned the title with the highest priority for which they meet the conditions.'
  `);
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Revert campaigns table changes
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('icon_url');
  });

  // Revert users table changes
  // Note: We cannot safely make rank_id NOT NULL without ensuring all users have a valid rank
  // This would require application logic to assign default ranks first
  
  // Revert missions table changes
  // Note: We cannot safely make required_rank_id NOT NULL without ensuring all missions have valid ranks
  // Setting a default rank would require knowing the appropriate rank for each mission
  
  await knex.raw(`
    COMMENT ON COLUMN missions.required_rank_id IS 'The minimum rank required to access this mission.'
  `);

  // Revert ranks table changes
  await knex.schema.alterTable('ranks', (table) => {
    table.renameColumn('priority', 'sequence_order');
  });

  await knex.schema.alterTable('ranks', (table) => {
    table.dropColumn('description');
    table.dropColumn('image_url');
  });

  // Restore original column comments
  await knex.raw(`
    COMMENT ON COLUMN ranks.title IS 'Name of the rank, e.g., "Искатель", "Пилот-кандидат".'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN ranks.sequence_order IS 'Defines the linear progression of ranks.'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN ranks.unlock_conditions IS 'JSON object with conditions to unlock this rank. E.g., {"required_experience": 500, "required_missions": ["uuid1", "uuid2"], "required_competencies": [{"id": "uuid", "level": 1}] }'
  `);

  await knex.raw(`
    COMMENT ON TABLE ranks IS NULL
  `);
};