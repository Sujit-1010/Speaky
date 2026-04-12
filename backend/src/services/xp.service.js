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

async function awardXP(userId, overallScore) {
  const xpEarned = calculateXP(overallScore);
  if (xpEarned === 0) return { xpEarned: 0 };

  const profile = await UserProfile.findOne({ 
    user_id: userId 
  });
  
  const currentXP = profile?.xp || 0;
  const currentTotalXP = profile?.totalXP || 0;
  
  const newTotalXP = currentTotalXP + xpEarned;
  const newLevel = calculateLevel(newTotalXP);
  const oldLevel = calculateLevel(currentTotalXP);
  
  await UserProfile.findOneAndUpdate(
    { user_id: userId },
    { 
      xp: currentXP + xpEarned,
      totalXP: newTotalXP,
      level: newLevel
    }
  );

  return { 
    xpEarned,
    newTotalXP,
    newLevel,
    leveledUp: newLevel > oldLevel,
    oldLevel
  };
}

module.exports = { calculateXP, awardXP, calculateLevel };
