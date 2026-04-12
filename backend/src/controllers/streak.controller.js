const UserProfile = require('../models/UserProfile');

const updateStreak = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ user_id: userId });
    if (!profile) return { streak: 0, changed: false };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: "2026-03-23"

    const lastActive = profile.lastActiveDate;
    const lastActiveStr = lastActive
      ? new Date(lastActive).toISOString().split('T')[0]
      : null;

    // Already logged in today - no change
    if (lastActiveStr === todayStr) {
      return {
        streak: profile.streak || 0,
        changed: false
      };
    }

    // Calculate yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak;
    let changed = true;

    if (!lastActiveStr) {
      // First time login
      newStreak = 1;
    } else if (lastActiveStr === yesterdayStr) {
      // Logged in yesterday → increase streak
      newStreak = (profile.streak || 0) + 1;
    } else {
      // Missed days → reset to 1
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, profile.longestStreak || 0);

    await UserProfile.findOneAndUpdate(
      { user_id: userId },
      {
        streak: newStreak,
        lastActiveDate: now,
        longestStreak
      }
    );

    console.log('Streak updated:', {
      userId,
      oldStreak: profile.streak,
      newStreak,
      lastActiveStr,
      todayStr
    });

    return {
      streak: newStreak,
      previousStreak: profile.streak || 0,
      changed,
      increased: newStreak > (profile.streak || 0),
      reset: newStreak === 1 && (profile.streak || 0) > 1,
      isFirstLogin: !lastActiveStr
    };
  } catch (err) {
    console.error('Streak update error:', err);
    return { streak: 0, changed: false };
  }
};

module.exports = { updateStreak };
