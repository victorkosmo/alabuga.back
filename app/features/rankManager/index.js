// app/features/rankManager/index.js

/**
 * Checks and updates a user's rank based on their completed achievements and joined campaigns.
 * This should be called within a transaction after an event that might trigger a rank change.
 *
 * @param {object} client - The active database client from a transaction.
 * @param {string} userId - The UUID of the user whose rank needs to be checked.
 * @returns {Promise<void>}
 */
const updateUserRank = async (client, userId) => {
    try {
        // 1. Get all ranks, ordered by priority ascending to easily find the default.
        const ranksQuery = 'SELECT id, title, priority, unlock_conditions FROM ranks WHERE deleted_at IS NULL ORDER BY priority ASC';
        const { rows: allRanks } = await client.query(ranksQuery);

        if (allRanks.length === 0) {
            console.warn('[RankManager] No ranks found in the database.');
            return;
        }

        // The first rank is the default one (lowest priority)
        const defaultRank = allRanks[0];

        // 2. Get user's data for condition checking
        const userCampaignsQuery = 'SELECT campaign_id FROM user_campaigns WHERE user_id = $1';
        const { rows: userCampaigns } = await client.query(userCampaignsQuery, [userId]);
        const userCampaignIds = new Set(userCampaigns.map(c => c.campaign_id));

        const userAchievementsQuery = 'SELECT achievement_id FROM user_achievements WHERE user_id = $1';
        const { rows: userAchievements } = await client.query(userAchievementsQuery, [userId]);
        const userAchievementIds = new Set(userAchievements.map(a => a.achievement_id));

        // 3. Determine the highest-priority rank the user qualifies for.
        let bestEligibleRank = defaultRank;

        // Iterate from highest priority to lowest. The first one they qualify for is their new rank.
        for (const rank of [...allRanks].reverse()) {
            const conditions = rank.unlock_conditions;
            if (!conditions || Object.keys(conditions).length === 0) {
                continue;
            }

            let isEligible = false;

            // Check campaign requirements
            if (conditions.required_campaigns) {
                const { ids, operator } = conditions.required_campaigns;
                if (Array.isArray(ids) && ids.length > 0) {
                    if (operator === 'AND') {
                        isEligible = ids.every(id => userCampaignIds.has(id));
                    } else { // Default to OR
                        isEligible = ids.some(id => userCampaignIds.has(id));
                    }
                }
            }

            // Check achievement requirements if not already eligible from campaigns
            if (!isEligible && conditions.required_achievements) {
                const { ids, operator } = conditions.required_achievements;
                if (Array.isArray(ids) && ids.length > 0) {
                    if (operator === 'AND') {
                        isEligible = ids.every(id => userAchievementIds.has(id));
                    } else { // Default to OR
                        isEligible = ids.some(id => userAchievementIds.has(id));
                    }
                }
            }

            // TODO: Add logic for other condition types like required_competencies if needed in the future.

            if (isEligible) {
                // Since we are iterating from highest priority, the first match is the one we want.
                bestEligibleRank = rank;
                break; // Exit loop once the highest priority rank is found
            }
        }

        // 4. Get user's current rank and update if it has changed.
        const currentUserRankQuery = 'SELECT rank_id FROM users WHERE id = $1';
        const { rows: userRows } = await client.query(currentUserRankQuery, [userId]);
        const currentUserRankId = userRows[0]?.rank_id;

        if (currentUserRankId !== bestEligibleRank.id) {
            console.log(`[RankManager] Updating rank for user ${userId} to "${bestEligibleRank.title}" (ID: ${bestEligibleRank.id})`);
            const updateUserRankQuery = 'UPDATE users SET rank_id = $1, updated_at = NOW() WHERE id = $2';
            await client.query(updateUserRankQuery, [bestEligibleRank.id, userId]);
        }

    } catch (error) {
        // Log error but don't re-throw to avoid failing the parent transaction
        console.error(`[RankManager] Error updating rank for user ${userId}:`, error);
    }
};

module.exports = {
    updateUserRank,
};
