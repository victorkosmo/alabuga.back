// app/features/competencyAwarder/index.js
/**
 * Awards competency points to a user after a mission completion.
 * This function is designed to be called within an existing database transaction.
 *
 * @param {object} client - The active database client from a transaction.
 * @param {string} userId - The UUID of the user.
 * @param {string} missionId - The UUID of the mission that was just completed.
 * @returns {Promise<void>}
 */
const awardCompetencyPoints = async (client, userId, missionId) => {
    try {
        // 1. Get competency_rewards for the completed mission.
        const missionQuery = 'SELECT competency_rewards FROM missions WHERE id = $1';
        const missionResult = await client.query(missionQuery, [missionId]);

        if (missionResult.rowCount === 0) {
            console.warn(`[CompetencyAwarder] Mission ${missionId} not found. Cannot award competency points.`);
            return;
        }

        const { competency_rewards: competencyRewards } = missionResult.rows[0];

        // 2. Check if there are any rewards to process.
        if (!competencyRewards || !Array.isArray(competencyRewards) || competencyRewards.length === 0) {
            return; // No competency rewards for this mission.
        }

        console.log(`[CompetencyAwarder] Awarding competency points for mission ${missionId} to user ${userId}`);

        // 3. Loop through rewards and update user_competencies.
        for (const reward of competencyRewards) {
            const { competency_id: competencyId, points } = reward;

            if (!competencyId || !points) {
                console.warn(`[CompetencyAwarder] Skipping invalid reward item in mission ${missionId}:`, reward);
                continue;
            }

            const upsertQuery = `
                INSERT INTO user_competencies (user_id, competency_id, progress_points)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, competency_id)
                DO UPDATE SET
                    progress_points = user_competencies.progress_points + EXCLUDED.progress_points;
            `;

            await client.query(upsertQuery, [userId, competencyId, points]);
            console.log(`[CompetencyAwarder] Awarded ${points} points for competency ${competencyId} to user ${userId}.`);
        }

    } catch (error) {
        // Log the error but do not re-throw. This should not fail the parent transaction.
        console.error(`[CompetencyAwarder] Error while awarding competency points for user ${userId} and mission ${missionId}:`, error);
    }
};

module.exports = {
    awardCompetencyPoints,
};
