# Achievement Checker Feature

This feature provides a centralized function to check for and award achievements to users upon the completion of a mission.

## Core Logic

The main exported function, `checkAndAwardAchievements`, is designed to be called from within a database transaction after a mission completion has been approved.

It performs the following steps:

1.  **Identify Relevant Achievements:** It finds all achievements within the same campaign as the completed mission that include this mission in their `unlock_conditions.required_missions`. It filters out achievements the user has already earned.

2.  **Check All Conditions:** For each potentially unlocked achievement, it verifies if the user has successfully completed *all* missions listed in `required_missions`.

3.  **Award Achievement:** If all conditions are met, the feature will:
    *   Create a record in the `user_achievements` table.
    *   Add any `experience_reward` and `mana_reward` from the achievement to the user's profile.
    *   Grant any `awarded_artifact_id` to the user.
    *   Trigger a Telegram notification to the user informing them of their new achievement.

## Usage

The function should be awaited and passed the active database `client`, the `userId` of the user who completed the mission, and the `missionId` of the completed mission.

```javascript
const { checkAndAwardAchievements } = require('@features/achievementChecker');

// Inside a route handler with an active DB transaction (client)
await checkAndAwardAchievements(client, userId, completedMissionId);
```
