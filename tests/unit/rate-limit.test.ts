import { describe, expect, it } from "vitest"

import { checkRateLimit } from "@/lib/rate-limit"

/**
 * All tests use synthetic `now` timestamps so no test needs to sleep.
 * Each test uses a unique key to avoid state leakage between cases.
 */

describe("checkRateLimit", () => {
  it("allows up to N requests in a window", () => {
    const limit = 3
    const key = "test:allows-up-to-n"
    const now = 1_000_000

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, limit, now + i)
      expect(result.ok).toBe(true)
    }
  })

  it("blocks the N+1 request within the same window", () => {
    const limit = 3
    const key = "test:blocks-n-plus-one"
    const now = 2_000_000

    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, now + i)
    }

    const blocked = checkRateLimit(key, limit, now + limit)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it("resets after the 60-second window expires", () => {
    const limit = 2
    const key = "test:resets-after-window"
    const now = 3_000_000

    // Fill the window.
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, now + i)
    }
    // Confirm blocked within the window.
    expect(checkRateLimit(key, limit, now + limit).ok).toBe(false)

    // Advance past the 60-second boundary.
    const afterWindow = now + 60_001
    const result = checkRateLimit(key, limit, afterWindow)
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(limit - 1)
  })

  it("decrements remaining count with each allowed request", () => {
    const limit = 5
    const key = "test:remaining-count"
    const now = 4_000_000

    const first = checkRateLimit(key, limit, now)
    expect(first.remaining).toBe(limit - 1)

    const second = checkRateLimit(key, limit, now + 1)
    expect(second.remaining).toBe(limit - 2)

    const third = checkRateLimit(key, limit, now + 2)
    expect(third.remaining).toBe(limit - 3)
  })

  it("retryAfterSec is 0 for allowed requests", () => {
    const key = "test:retry-after-ok"
    const now = 5_000_000

    const result = checkRateLimit(key, 10, now)
    expect(result.retryAfterSec).toBe(0)
  })

  it("retryAfterSec reflects remaining window time when blocked", () => {
    const limit = 1
    const key = "test:retry-after-blocked"
    const now = 6_000_000

    checkRateLimit(key, limit, now) // fills the single-request window

    // 10 seconds into the window — 50 s remain.
    const blocked = checkRateLimit(key, limit, now + 10_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBe(50)
  })
})
