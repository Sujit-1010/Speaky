/**
 * Utility functions for token extraction and expiration checks.
 */

function isExpired(date) {
    if (!date) return false;
    try {
        return new Date(date).getTime() < Date.now();
    } catch (err) {
        console.error('[tokenHelpers] Error parsing date in isExpired:', err);
        return true;
    }
}

/**
 * Consolidated access token getter from request.
 * Accepts:
 *   1. x-access-token header
 *   2. Authorization header (Bearer token)
 *   3. token or accessToken query parameter
 *   4. accessToken or token body property
 */
function getAccessTokenFromReq(req) {
    if (!req) return '';
    const header = req.headers ? req.headers['x-access-token'] || '' : '';
    const authorization = req.headers ? req.headers['authorization'] || '' : '';
    const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const queryToken = req.query ? (req.query.token || req.query.accessToken || '') : '';
    const bodyToken = req.body ? (req.body.accessToken || req.body.token || '') : '';

    return (header || bearer || queryToken || bodyToken).toString().trim();
}

module.exports = {
    isExpired,
    getAccessTokenFromReq,
};
