# Rank Manager Feature

This feature provides a centralized function to check and update a user's rank.

## Core Logic

The main exported function, `updateUserRank`, is designed to be called from within a database transaction after an event that could potentially change a user's rank, such as joining a campaign or earning an achievement.

It performs the following steps:

1.  **Fetch All Ranks:** It retrieves all available ranks from the database, ordered by priority. The lowest priority rank is considered the default.

2.  **Fetch User Data:** It gets the set of all campaigns the user has joined and all achievements they have earned.

3.  **Evaluate Eligibility:** It iterates through all ranks from highest priority to lowest. For each rank, it checks the `unlock_conditions`:
    *   `required_campaigns`: Checks if the user has joined the required campaigns (supports `AND`/`OR` operators).
    *   `required_achievements`: Checks if the user has earned the required achievements (supports `AND`/`OR` operators).
    *   A rank is considered unlocked if its campaign conditions *or* its achievement conditions are met.

4.  **Select Best Rank:** The first rank the user qualifies for (iterating from highest priority) is selected as their new rank. If they qualify for no special ranks, the default rank is used.

5.  **Update User:** It compares the selected rank with the user's current rank. If they are different, it updates the `users.rank_id`.

## Usage

The function should be awaited and passed the active database `client` and the `userId`.

```javascript
const { updateUserRank } = require('@features/rankManager');

// Inside a route handler with an active DB transaction (client)
// after a user joins a campaign or earns an achievement.
await updateUserRank(client, userId);
```
