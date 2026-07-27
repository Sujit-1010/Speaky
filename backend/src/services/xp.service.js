const UserProfile = require('../models/UserProfile');

function calculateXP(overallScore) {
  if (overallScore === 0) return 0;
  if (overallScore >= 1 && overallScore < 30) return 2;
  if (overallScore >= 30 && overallScore < 60) return 5;
  if (overallScore >= 60 && overallScore < 90) return 8;
  if (overallScore >= 90) return 10;
  return 0;
}

function calculateLevel(totalXP) {
  if (totalXP < 100) return 1;
  if (totalXP < 300) return 2;
  if (totalXP < 600) return 3;
  if (totalXP < 1000) return 4;
  if (totalXP < 1500) return 5;
  return Math.floor(totalXP / 500) + 1;
}

// ---------------------------------------------------------------------------
// M3 FIX: Atomic XP award using MongoDB $inc.
//
// The previous implementation read the profile, computed new totals in JS,
// then wrote the absolute new value back — losing one XP award if two events
// raced. $inc is atomic: two concurrent $inc operations both persist, so no
// XP is silently dropped.
//
// Level derivation requires knowing the new totalXP, so we use { new: true }
// to get the post-increment document, compute level from it, and only write
// level back if it has changed. This results in at most two DB round-trips
// (instead of the previous read + write).
// ---------------------------------------------------------------------------
async function awardXP(userId, overallScore) {
  const xpEarned = calculateXP(overallScore);
  if (xpEarned === 0) return { xpEarned: 0 };

  // Step 1: Atomically increment both xp and totalXP.
  const updated = await UserProfile.findOneAndUpdate(
    { user_id: userId },
    { $inc: { xp: xpEarned, totalXP: xpEarned } },
    { new: true }
  );

  // If no profile exists yet (e.g., profile not created yet), bail out gracefully.
  if (!updated) return { xpEarned };

  const newTotalXP = updated.totalXP || 0;
  const oldLevel = updated.level || 1;
  const newLevel = calculateLevel(newTotalXP);

  // Step 2: Sync level only when it has changed (avoids an extra write on
  // the common case where no level-up occurred).
  if (newLevel !== oldLevel) {
    await UserProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: { level: newLevel } }
    );
  }

  return {
    xpEarned,
    newTotalXP,
    newLevel,
    leveledUp: newLevel > oldLevel,
    oldLevel,
  };
}

module.exports = { calculateXP, awardXP, calculateLevel };
