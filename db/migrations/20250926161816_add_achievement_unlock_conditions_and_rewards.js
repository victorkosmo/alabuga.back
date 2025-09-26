// ./db/migrations/add_achievement_unlock_conditions_and_rewards.js

/**
 * Augments the achievements table to include unlock conditions and rewards
 * (Experience, Mana, and Artifacts). This allows achievements to be earned
 * based on complex criteria (like completing multiple missions) and to reward
 * the user upon earning the badge.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Add unlock conditions and reward columns to the 'achievements' table
  await knex.schema.alterTable('achievements', (table) => {
    table
      .jsonb('unlock_conditions')
      .notNullable()
      .defaultTo('{}')
      .comment('JSON with conditions to earn this achievement. E.g., {"required_missions": ["uuid1", "uuid2"] }');
    table
      .integer('experience_reward')
      .notNullable()
      .defaultTo(0)
      .comment('Experience points awarded when this achievement is earned.');
    table
      .integer('mana_reward')
      .notNullable()
      .defaultTo(0)
      .comment('Mana points awarded when this achievement is earned.');
    
    // Add awarded_artifact_id with a foreign key constraint
    table
      .uuid('awarded_artifact_id')
      .nullable()
      .references('id')
      .inTable('artifacts')
      .onDelete('SET NULL')
      .comment('An optional artifact awarded when this achievement is earned.');
  });
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // 1. Remove the unlock conditions and reward columns from the 'achievements' table
  await knex.schema.alterTable('achievements', (table) => {
    // Drop columns in reverse order of addition
    table.dropColumn('awarded_artifact_id');
    table.dropColumn('mana_reward');
    table.dropColumn('experience_reward');
    table.dropColumn('unlock_conditions');
  });
};