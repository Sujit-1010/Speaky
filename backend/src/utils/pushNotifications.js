const PushToken = require('../models/PushToken');
const firebaseAdmin = require('./firebaseAdmin');

async function sendPushToUser(userId, { title, body, data, url, icon, badge, image, actions, actionUrls, requireInteraction } = {}) {
    if (!userId) return { success: false, reason: 'missing_user' };

    const tokens = await PushToken.find({ user_id: String(userId) }).select('token').lean();
    const tokenList = (tokens || []).map(t => t.token).filter(Boolean);
    if (!tokenList.length) return { success: false, reason: 'no_tokens' };

    const safeData = Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [String(k), v == null ? '' : String(v)]));

    const payload = {
        tokens: tokenList,
        notification: {
            title: title || 'SpeakUp',
            body: body || ''
        },
        data: {
            ...safeData,
            _title: String(title || 'SpeakUp'),
            _body: String(body || ''),
            url: String(url || safeData.url || safeData.link || '/'),
            icon: String(icon || safeData.icon || '/logo.png'),
            badge: String(badge || safeData.badge || '/logo.png'),
            image: String(image || safeData.image || ''),
            actions: typeof actions === 'string' ? actions : JSON.stringify(Array.isArray(actions) ? actions : []),
            actionUrls: typeof actionUrls === 'string'
                ? actionUrls
                : JSON.stringify(actionUrls && typeof actionUrls === 'object' ? actionUrls : {}),
            requireInteraction: String(requireInteraction === true || String(safeData.requireInteraction || '') === 'true'),
        }
    };

    try {
        const resp = await firebaseAdmin.messaging().sendEachForMulticast(payload);
        const invalidTokens = [];
        (resp.responses || []).forEach((r, idx) => {
            if (!r.success) {
                const code = r.error && r.error.code;
                if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                    invalidTokens.push(tokenList[idx]);
                }
            }
        });
        if (invalidTokens.length) {
            await PushToken.deleteMany({ token: { $in: invalidTokens } });
        }
        return { success: true, sent: resp.successCount || 0, failed: resp.failureCount || 0, removed: invalidTokens.length };
    } catch (e) {
        console.error('sendPushToUser error', e);
        return { success: false, reason: 'send_failed' };
    }
}

module.exports = { sendPushToUser };
