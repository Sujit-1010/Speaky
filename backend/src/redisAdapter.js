/**
 * redisAdapter.js
 *
 * Creates two Redis clients (pub + sub — required by @socket.io/redis-adapter)
 * and a shared general-purpose client, all connected via REDIS_URL.
 *
 * The pub/sub clients power the Socket.io cross-instance adapter.
 * The shared client (getRedisClient()) is reused by other modules (e.g. the
 * cron distributed lock in topicGenerator.service.js) so we only open one
 * extra connection rather than a third independent client.
 *
 * Uses the official `redis` client (v6, same API as v4+: createClient + .connect()).
 *
 * Graceful degradation: if REDIS_URL is missing or the connection fails, all
 * functions log a clear warning and return null. Callers skip Redis-dependent
 * features and continue in single-instance / degraded mode.
 *
 * To make Redis a HARD startup requirement, replace the catch blocks with
 * `throw` so the error propagates out of start() and crashes the process.
 */

const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

// Module-level singletons — set once during buildRedisAdapter(), reused
// by getRedisClient() for any other module that needs a Redis client.
let _pubClient = null;
let _subClient = null;
let _sharedClient = null;

/**
 * Returns the shared Redis client, or null if Redis is unavailable.
 * Always call buildRedisAdapter() first (done inside server.js start()).
 */
function getRedisClient() {
    return _sharedClient;
}

async function buildRedisAdapter() {
    const url = process.env.REDIS_URL;

    if (!url) {
        console.warn('[Redis] REDIS_URL not set — Socket.io will run in single-instance mode (no cross-instance event sync).');
        return null;
    }

    try {
        // pub/sub clients for Socket.io adapter
        _pubClient = createClient({ url });
        _subClient = _pubClient.duplicate();

        // Shared general-purpose client (e.g. for distributed locks).
        // Duplicate from pubClient so all clients share the same base config.
        _sharedClient = _pubClient.duplicate();

        // Attach error listeners before connecting so unhandled rejections
        // after startup don't crash the process.
        _pubClient.on('error', (err) => console.error('[Redis] pub client error:', err.message));
        _subClient.on('error', (err) => console.error('[Redis] sub client error:', err.message));
        _sharedClient.on('error', (err) => console.error('[Redis] shared client error:', err.message));

        await Promise.all([
            _pubClient.connect(),
            _subClient.connect(),
            _sharedClient.connect(),
        ]);

        console.log('[Redis] Connected — Socket.io adapter active (multi-instance sync enabled).');

        return createAdapter(_pubClient, _subClient);
    } catch (err) {
        console.error('[Redis] Connection failed — Socket.io will run in single-instance mode (no cross-instance event sync).');
        console.error('[Redis] Cause:', err.message);
        // Ensure singletons are null so getRedisClient() returns null on failure.
        _pubClient = null;
        _subClient = null;
        _sharedClient = null;
        return null;
    }
}

module.exports = { buildRedisAdapter, getRedisClient };
