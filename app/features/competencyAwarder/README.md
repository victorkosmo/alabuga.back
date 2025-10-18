# Competency Awarder Feature

This feature provides a centralized function to award competency points to users upon the completion of a mission.

## Core Logic

The main exported function, `awardCompetencyPoints`, is designed to be called from within a database transaction after a mission completion has been approved.

It performs the following steps:

1.  **Fetch Mission Rewards:** It retrieves the `competency_rewards` JSON array from the completed mission's record.

2.  **Award Points:** For each entry in the `competency_rewards` array, it performs an `UPSERT` operation on the `user_competencies` table:
    *   If the user has no record for that competency, it creates one.
    *   If a record exists, it adds the new points to the existing `progress_points`.

## Usage

The function should be awaited and passed the active database `client`, the `userId` of the user who completed the mission, and the `missionId` of the completed mission. It should be called alongside `checkAndAwardAchievements`.

```javascript
const { awardCompetencyPoints } = require('@features/competencyAwarder');

// Inside a route handler with an active DB transaction (client)
// after a mission is completed/approved.
await awardCompetencyPoints(client, userId, completedMissionId);
```
