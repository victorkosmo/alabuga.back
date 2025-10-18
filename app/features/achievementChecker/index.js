// app/features/achievementChecker/index.js
const { sendTelegramMessage } = require('@features/sendTelegramMsg');
const { updateUserRank } = require('@features/rankManager');

/**
 * Checks for and awards achievements to a user after a mission completion.
 * This function is designed to be called within an existing database transaction.
 *
 * @param {object} client - The active database client from a transaction.
 * @param {string} userId - The UUID of the user.
 * @param {string} completedMissionId - The UUID of the mission that was just completed.
 * @returns {Promise<void>}
 */
const checkAndAwardAchievements = async (client, userId, completedMissionId) => {
    try {
        // Step 1: Get the campaign_id for the completed mission.
        const missionCampaignQuery = 'SELECT campaign_id FROM missions WHERE id = $1';
        const missionCampaignResult = await client.query(missionCampaignQuery, [completedMissionId]);

        if (missionCampaignResult.rowCount === 0) {
            console.warn(`[AchievementChecker] Mission ${completedMissionId} not found. Cannot check for achievements.`);
            return;
        }
        const { campaign_id: campaignId } = missionCampaignResult.rows[0];

        // Step 2: Find all achievements in the same campaign that require this mission
        // and which the user has NOT yet earned.
        const relevantAchievementsQuery = `
            SELECT
                a.id,
                a.name,
                a.unlock_conditions,
                a.experience_reward,
                a.mana_reward,
                a.awarded_artifact_id
            FROM
                achievements a
            LEFT JOIN
                user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
            WHERE
                a.campaign_id = $2
                AND a.unlock_conditions -> 'required_missions' ? $3
                AND ua.user_id IS NULL;
        `;
        const achievementsResult = await client.query(relevantAchievementsQuery, [userId, campaignId, completedMissionId]);

        if (achievementsResult.rowCount === 0) {
            // No potential achievements to unlock for this user from this mission, which is a common case.
            return;
        }

        let achievementAwarded = false;

        // Step 3: For each relevant achievement, check if all conditions are now met.
        for (const achievement of achievementsResult.rows) {
            const requiredMissions = achievement.unlock_conditions?.required_missions;

            // Safety check: if required_missions is not a valid array, skip.
            if (!Array.isArray(requiredMissions) || requiredMissions.length === 0) {
                continue;
            }

            // Check how many of the required missions the user has completed.
            const completedCountQuery = `
                SELECT COUNT(DISTINCT mission_id)::INTEGER as count
                FROM mission_completions
                WHERE
                    user_id = $1
                    AND status = 'APPROVED'
                    AND mission_id = ANY($2::uuid[]);
            `;
            const completedCountResult = await client.query(completedCountQuery, [userId, requiredMissions]);
            const completedCount = completedCountResult.rows[0].count;

            // Step 4: If all required missions are completed, award the achievement.
            if (completedCount === requiredMissions.length) {
                achievementAwarded = true;
                console.log(`[AchievementChecker] Awarding achievement "${achievement.name}" (ID: ${achievement.id}) to user ${userId}`);

                // 4a: Insert into user_achievements
                await client.query(
                    'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
                    [userId, achievement.id]
                );

                // 4b: Update user points
                if (achievement.experience_reward > 0 || achievement.mana_reward > 0) {
                    await client.query(
                        `UPDATE users SET experience_points = experience_points + $1, mana_points = mana_points + $2, updated_at = NOW() WHERE id = $3;`,
                        [achievement.experience_reward, achievement.mana_reward, userId]
                    );
                }

                // 4c: Award artifact if any
                if (achievement.awarded_artifact_id) {
                    await client.query(
                        'INSERT INTO user_artifacts (user_id, artifact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
                        [userId, achievement.awarded_artifact_id]
                    );
                }

                // 4d: Send notification (do not await, don't let it fail the transaction)
                notifyUserOfAchievement(client, userId, achievement);
            }
        }

        // After the loop, if any achievement was awarded, check for a rank update.
        if (achievementAwarded) {
            await updateUserRank(client, userId);
        }
    } catch (error) {
        // Log the error but do not re-throw. The achievement checker should not
        // cause the parent transaction to fail. The primary action (e.g., mission completion)
        // is more important.
        console.error(`[AchievementChecker] Error while checking/awarding achievements for user ${userId} and mission ${completedMissionId}:`, error);
    }
};

/**
 * Helper function to send a notification about a new achievement.
 * Runs asynchronously and does not block the main flow.
 * @param {object} client - The active database client.
 * @param {string} userId - The user's UUID.
 * @param {object} achievement - The achievement that was awarded.
 */
const notifyUserOfAchievement = async (client, userId, achievement) => {
    try {
        const userQuery = 'SELECT tg_id FROM users WHERE id = $1;';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rowCount > 0) {
            const { tg_id: tgId } = userResult.rows[0];
            let message = `🎉 Поздравляем! Вы получили достижение «${achievement.name}»!`;
            
            if (achievement.mana_reward > 0) {
                message += `\n\nВам начислено: ${achievement.mana_reward} маны.`;
            }

            // This is fire-and-forget
            sendTelegramMessage(tgId, message);
        }
    } catch (error) {
        console.error(`[AchievementChecker] Failed to send notification for achievement ${achievement.id} to user ${userId}:`, error);
    }
};

module.exports = {
    checkAndAwardAchievements,
};
