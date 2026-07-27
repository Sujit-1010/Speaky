'use strict';

// ---------------------------------------------------------------------------
// Shared in-process concurrency limiter for AI analysis pipelines.
//
// All three pipeline types (GD analysis, extempore, interview) share the same
// external resource bottlenecks: AssemblyAI per-account concurrency limits and
// Groq per-minute token limits. A combined cap therefore more accurately
// reflects the actual constraint than three separate per-type caps (which would
// allow 3× the intended concurrency).
//
// Design choices
// --------------
// Cap:    8 concurrent pipelines.
//         AssemblyAI's free/growth tier allows ~5-10 concurrent transcriptions;
//         8 is a safe headroom value that avoids rate-limit failures while
//         still accepting meaningful concurrency during a busy session end.
//
// Policy: REJECT (HTTP 503) when at cap, not queue.
//         An in-memory queue would need memory bounding, starvation prevention,
//         and a retry/timeout mechanism — none of which belong in a thin limiter.
//         A clear 503 lets the frontend retry (e.g., after a brief delay) and
//         gives the user an honest message instead of silent delay.
//
// Known limitation
// ----------------
// This is an in-process counter. In a multi-instance deployment each instance
// enforces its own cap independently — the effective cluster-wide limit is
// MAX_CONCURRENT × number_of_instances. A Redis-backed counter would be needed
// to enforce a true global cap, but that is out of scope for this pass.
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 8;
let _running = 0;

/**
 * Attempt to acquire a pipeline slot.
 *
 * Returns true if a slot was acquired (caller must release() when done).
 * Returns false if the cap is already reached (caller should return 503).
 */
function acquire() {
    if (_running >= MAX_CONCURRENT) return false;
    _running++;
    return true;
}

/**
 * Release a previously acquired slot.
 * Safe to call even if acquire() returned false — it is a no-op in that case
 * (the counter would go negative, so we guard with Math.max).
 */
function release() {
    _running = Math.max(0, _running - 1);
}

/** Current number of running pipelines. Used for health/debug endpoints. */
function running() {
    return _running;
}

module.exports = { acquire, release, running, MAX_CONCURRENT };
