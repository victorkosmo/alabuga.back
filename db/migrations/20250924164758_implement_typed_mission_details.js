// ./db/migrations/implement_typed_mission_details.js

/**
 * Applies schema modifications for typed mission details.
 * This migration transitions from a generic mission structure to a typed system
 * with dedicated tables for different mission completion logic (Quiz, Manual URL).
 * It introduces a new mission_type enum, alters the core missions table, and
 * creates two new tables for mission-specific configuration data.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Step 1: Create the new enum type for different mission types with UPPERCASE values.
  await knex.raw(`
    CREATE TYPE mission_type AS ENUM (
      'MANUAL_URL',
      'QUIZ',
      'QR_CODE'
    )
  `);

  // Step 2: Alter the 'missions' table to use the new typed system.
  await knex.schema.alterTable('missions', (table) => {
    // Add the new 'type' column that uses the enum created above.
    table
      .specificType('type', 'mission_type')
      .notNullable()
      .comment('Defines the completion logic for the mission (e.g., QUIZ, MANUAL_URL).');

    // Drop the old columns that are now replaced by the new system.
    // The 'needs_moderation' logic is now implicit in the 'MANUAL_URL' type.
    table.dropColumn('needs_moderation');
    table.dropColumn('completion_type');
  });

  // Step 3: Create a dedicated table for Quiz mission details.
  await knex.schema.createTable('mission_quiz_details', (table) => {
    table
      .uuid('mission_id')
      .primary()
      .references('id')
      .inTable('missions')
      .onDelete('CASCADE')
      .comment('Foreign key linking to the specific mission.');

    table
      .jsonb('questions')
      .notNullable()
      .comment('JSON array defining the quiz questions, answers, and correct answer IDs.');

    table
      .float('pass_threshold')
      .notNullable()
      .defaultTo(1.0)
      .comment('Fraction of correct answers required to pass the quiz (e.g., 0.8 for 80%).');
  }); // Note: No .comment() on table creation, as per the guide.

  // Step 4: Create a dedicated table for Manual URL submission mission details.
  return knex.schema.createTable('mission_manual_details', (table) => {
    table
      .uuid('mission_id')
      .primary()
      .references('id')
      .inTable('missions')
      .onDelete('CASCADE')
      .comment('Foreign key linking to the specific mission.');

    table
      .text('submission_prompt')
      .notNullable()
      .comment('The specific instructions or prompt displayed to the user for the submission.');

    table
      .string('placeholder_text', 255)
      .nullable()
      .comment('Placeholder text for the URL input field (e.g., "https://github.com/...").');
  });
};

/**
 * Reverts the schema modifications applied by the 'up' function.
 * This function drops the new tables, reverts the 'missions' table to its
 * previous state, and removes the new enum type.
 * @param { import("knex").Knex } knex - The Knex.js instance.
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Step 1: Drop the new detail tables in reverse order of creation.
  await knex.schema.dropTableIfExists('mission_manual_details');
  await knex.schema.dropTableIfExists('mission_quiz_details');

  // Step 2: Revert the 'missions' table to its original structure.
  await knex.schema.alterTable('missions', (table) => {
    // Re-add the original columns that were dropped.
    table
      .boolean('needs_moderation')
      .notNullable()
      .defaultTo(false)
      .comment('If true, a manager must approve the completion.');

    // Note: 'mission_completion_type' is the original enum from your schema.
    table
      .specificType('completion_type', 'mission_completion_type')
      .notNullable()
      .defaultTo('DEFAULT')
      .comment('Specifies how the mission is completed.');

    // Drop the new 'type' column.
    table.dropColumn('type');
  });

  // Step 3: Drop the new enum type.
  return knex.raw('DROP TYPE IF EXISTS mission_type');
};