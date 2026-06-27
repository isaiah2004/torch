/**
 * Dependency-free in-memory fixed-window rate limiter.
 *
 * State is kept in a module-level Map, meaning limits are enforced per process
 * instance. This is acceptable for single-node / single-container deployments;
 * for multi-instance or serverless environments, replace `windows` with a
 * shared store (Redis `INCR`/`EXPIREAT`, or a DB-backed atomic counter) that
 * honours the same key/window contract.
 *
 * Window strategy: fixed 60-second windows anchored to the first request in
 * that window (not a sliding window). This keeps the implementation O(1) per
 * check with no background cleanup required.
 */

interface WindowState {
  count: number
  windowStart: number
}

/** Bucket store — one entry per rate-limit key. */
const windows = new Map<string, WindowState>()

const WINDOW_MS = 60_000

/**
 * Record a request against the rate-limit bucket for `key` and report whether
 * it is allowed.
 *
 * @param key         Opaque bucket identifier, e.g. `"ingest:user_abc123"`.
 * @param limitPerMin Maximum allowed requests within a 60-second window.
 * @param now         Current time in milliseconds; defaults to `Date.now()`.
 *                    Exposed so tests can simulate window expiry without
 *                    sleeping — pass a synthetic timestamp to advance time.
 */
export function checkRateLimit(
  key: string,
  limitPerMin: number,
  now = Date.now(),
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const state = windows.get(key)

  if (!state || now - state.windowStart >= WINDOW_MS) {
    // No prior state, or the previous window has expired — start a fresh one.
    windows.set(key, { count: 1, windowStart: now })
    return { ok: true, remaining: limitPerMin - 1, retryAfterSec: 0 }
  }

  if (state.count < limitPerMin) {
    state.count++
    return { ok: true, remaining: limitPerMin - state.count, retryAfterSec: 0 }
  }

  // Window is full — compute how long until it resets.
  const retryAfterSec = Math.ceil((WINDOW_MS - (now - state.windowStart)) / 1000)
  return { ok: false, remaining: 0, retryAfterSec }
}

/**
 * Build a 429 Too Many Requests `Response` with a `Retry-After` header
 * (seconds until the window resets) and a JSON body.
 */
export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "Too Many Requests", retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  )
}
