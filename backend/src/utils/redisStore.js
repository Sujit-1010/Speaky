const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../redisAdapter');

// ---------------------------------------------------------------------------
// makeLazyRedisStore(prefix) — returns an express-rate-limit compatible store
// that defers Redis client lookup until the first actual request.
//
// Why lazy? The rate limiters (rateLimit({...})) are defined at module parse
// time, BEFORE start() connects Redis. By the time any HTTP request arrives,
// buildRedisAdapter() has completed and getRedisClient() returns a live client.
//
// Fallback: if Redis is still null at request time (dev without Redis), the
// proxy silently passes through — express-rate-limit then uses its default
// in-memory counting. In production this never happens (hard startup fail).
// ---------------------------------------------------------------------------
function makeLazyRedisStore(prefix) {
    let _store = null;
    let _initialized = false;

    function getStore() {
        if (!_initialized) {
            const client = getRedisClient();
            if (client) {
                _store = new RedisStore({
                    sendCommand: (...args) => client.sendCommand(args),
                    prefix: `rl:${prefix}:`,
                });
            }
            _initialized = true;
        }
        return _store;
    }

    // express-rate-limit calls init() once when the middleware is first used.
    return {
        init(options) {
            // Attempt to build the real store if Redis is already up.
            // Re-init happens automatically on first request if not yet ready.
            const s = getStore();
            if (s && s.init) s.init(options);
            this._rlOptions = options;
        },
        async increment(key) {
            const s = getStore();
            if (!s) return { totalHits: 1, resetTime: new Date(Date.now() + (this._rlOptions?.windowMs || 60000)) };
            if (s._rlOptions === undefined && this._rlOptions && s.init) s.init(this._rlOptions);
            return s.increment(key);
        },
        async decrement(key) {
            const s = getStore();
            if (s) return s.decrement(key);
        },
        async resetKey(key) {
            const s = getStore();
            if (s) return s.resetKey(key);
        },
        async get(key) {
            const s = getStore();
            if (!s) return undefined;
            return s.get(key);
        },
    };
}

module.exports = { makeLazyRedisStore };
