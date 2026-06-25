import { test, expect } from "@playwright/test"

/**
 * Smoke test: the public health endpoint responds without auth.
 * Run with a dev server up: `pnpm dev` then `pnpm test:e2e`.
 */
test("health endpoint is public and ok", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.ok()).toBeTruthy()
  expect(await res.json()).toMatchObject({ status: "ok", service: "torch" })
})

test("unauthenticated visit to /chat redirects to sign-in", async ({ page }) => {
  await page.goto("/chat")
  await expect(page).toHaveURL(/sign-in/)
})
