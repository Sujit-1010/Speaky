const Parser = require('rss-parser');
const parser = new Parser();
const { generateTopicsFromNews } = require('./groq.service');
const GeneratedTopic = require('../models/GeneratedTopic');
const { getRedisClient } = require('../redisAdapter');

// Google News RSS for Top Stories (India or Global)
const RSS_URL = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';

// Default fallback topics — written to DB on first boot if the collection is empty.
const DEFAULT_TOPICS = [
    'The impact of artificial intelligence on employment',
    'Social media regulation and freedom of speech',
    'Climate change and individual responsibility',
    'Remote work vs office culture',
    'Is social media doing more harm than good?',
    'The future of online education',
    'Data privacy in a connected world',
];

// ---------------------------------------------------------------------------
// Short-lived in-process cache for getRandomTopic().
// Topics are refreshed every 12 hours by the cron job; paying a DB round-trip
// on every GD matchmaking event for data that changes at most twice a day is
// unnecessary. A 5-minute TTL keeps the hot path fast while ensuring stale
// data is detected within minutes of a cron refresh.
// ---------------------------------------------------------------------------
const TOPIC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _topicCache = null;       // string[] | null
let _topicCacheAt = 0;        // timestamp of last DB fetch

async function _loadTopics() {
    const now = Date.now();
    if (_topicCache && (now - _topicCacheAt) < TOPIC_CACHE_TTL_MS) {
        return _topicCache;
    }
    const docs = await GeneratedTopic.find({}).select('text').lean();
    if (docs.length > 0) {
        _topicCache = docs.map(d => d.text);
        _topicCacheAt = now;
        return _topicCache;
    }
    // DB is empty (first boot before cron fires) — seed with defaults
    await _seedDefaults();
    _topicCache = [...DEFAULT_TOPICS];
    _topicCacheAt = now;
    return _topicCache;
}

async function _seedDefaults() {
    await GeneratedTopic.insertMany(DEFAULT_TOPICS.map(text => ({ text })));
    console.log('[TopicGenerator] Seeded default GD topics into DB.');
}

// ---------------------------------------------------------------------------
// Distributed lock helper — Redis SET NX EX pattern.
//
// TTL: 90 seconds. Rationale: RSS fetch + Groq call takes ~5–15 s in practice
// (confirmed from boot logs). 90 s is 6× the observed p99, giving comfortable
// headroom for slow networks or Groq latency spikes, while still being far
// below the 12-hour cron interval.
//
// Redis-down behaviour: if getRedisClient() returns null, fall through and run
// fn() without a lock. This matches Phase 4a's graceful-degradation decision —
// all instances run independently rather than silently skipping the refresh,
// because stale topics for 12 h is a worse user outcome than a brief API
// cost overrun during a Redis outage (which should be rare and short-lived).
// ---------------------------------------------------------------------------
const LOCK_KEY = 'lock:topic-refresh';
const LOCK_TTL_SEC = 90;

async function _withCronLock(fn) {
    const redis = getRedisClient();

    if (!redis) {
        console.warn('[TopicGenerator] Redis unavailable — running refresh without distributed lock (all instances will run independently).');
        return fn();
    }

    // SET lock:topic-refresh <unique-value> NX EX 90
    // NX = only set if key does not exist (atomic test-and-set)
    const lockValue = `${process.pid}-${Date.now()}`;
    const acquired = await redis.set(LOCK_KEY, lockValue, { NX: true, EX: LOCK_TTL_SEC });

    if (!acquired) {
        console.log('[TopicGenerator] Skipping cron refresh — another instance is already running it (lock held).');
        return;
    }

    console.log('[TopicGenerator] Acquired cron lock — running topic refresh.');
    try {
        await fn();
    } finally {
        // Explicit release: only delete the key if we still own it.
        // Guards against the edge case where our TTL expired and another
        // instance has since acquired the lock before we got here.
        const current = await redis.get(LOCK_KEY);
        if (current === lockValue) {
            await redis.del(LOCK_KEY);
            console.log('[TopicGenerator] Cron lock released.');
        }
    }
}

async function refreshTopics() {
    await _withCronLock(_doRefresh);
}

async function _doRefresh() {
    try {
        console.log('Fetching latest news for GD topics...');
        const feed = await parser.parseURL(RSS_URL);

        // Extract top 15 headlines
        const headlines = feed.items.slice(0, 15).map(item => item.title);

        if (headlines.length === 0) {
            console.warn('No headlines found in RSS feed.');
            return;
        }

        console.log(`Sending ${headlines.length} headlines to Groq...`);
        const newTopics = await generateTopicsFromNews(headlines);

        if (newTopics && Array.isArray(newTopics) && newTopics.length > 0) {
            // Replace the entire collection atomically: delete old, insert new.
            await GeneratedTopic.deleteMany({});
            await GeneratedTopic.insertMany(newTopics.map(text => ({ text })));

            // Invalidate in-process cache so next call re-reads from DB.
            _topicCache = null;
            _topicCacheAt = 0;

            console.log('Successfully updated GD topics cache with current affairs:', newTopics);
        } else {
            console.warn('Groq failed to generate topics, keeping existing DB topics.');
        }
    } catch (err) {
        console.error('Error refreshing topics from news:', err.message);
    }
}

async function getRandomTopic() {
    const topics = await _loadTopics();
    return topics[Math.floor(Math.random() * topics.length)];
}

module.exports = { refreshTopics, getRandomTopic };
