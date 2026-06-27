import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright"
import { chromium } from "@playwright/test"

const dir = "C:/Users/isaia/AppData/Local/Temp/claude/A--Work-spark-torch/e816a684-ac3f-4293-8023-003975737e0b/scratchpad"
const WEB = "https://torch-web-production-8e00.up.railway.app"
const ADMIN = "https://torch-admin-production.up.railway.app"
const EMAIL = "torchtester+clerk_test@example.com"
const PW = "TorchTest!2026xyz"

await clerkSetup({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } })
const page = await ctx.newPage()
const fails = []
page.on("response", (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url()}`) })

async function signIn(base) {
  await setupClerkTestingToken({ page })
  await page.goto(`${base}/sign-in`, { waitUntil: "networkidle", timeout: 60000 })
  await page.locator('input[name="identifier"]').fill(EMAIL)
  await page.getByRole("button", { name: /continue/i }).first().click()
  await page.waitForTimeout(2500)
  await page.locator('input[name="password"]').fill(PW)
  await page.getByRole("button", { name: /continue/i }).first().click()
  await page.waitForTimeout(3000)
  if (/client-trust|verify|factor/.test(page.url())) {
    const otp = page.locator('input[autocomplete="one-time-code"], input[name="code"], input[inputmode="numeric"]').first()
    await otp.click({ timeout: 8000 }); await page.keyboard.type("424242", { delay: 80 }); await page.waitForTimeout(4000)
  }
}

try {
  // 1) Persistence on web
  await signIn(WEB)
  await page.goto(`${WEB}/chat`, { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(1500)
  const ta = page.getByPlaceholder("Ask a theological or biblical question", { exact: false })
  await ta.click({ timeout: 20000 }); await ta.fill("Can women be pastors or elders?"); await ta.press("Enter")
  let last = 0, stable = 0
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(2000)
    const len = (await page.locator("body").innerText()).length
    if (len > last + 20) { last = len; stable = 0 } else { stable++ }
    if (stable >= 3 && len > 600) break
  }
  const urlAfter = page.url()
  console.log("PERSIST: url moved to /chat/{id}:", /\/chat\/[0-9a-f-]{8,}/.test(urlAfter), urlAfter.slice(-40))
  await page.goto(`${WEB}/history`, { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(1500)
  const historyText = await page.locator("body").innerText()
  console.log("HISTORY shows the saved conversation:", /women|pastor|elder/i.test(historyText))

  // 2) Admin pages render (test user is temporarily admin)
  await signIn(ADMIN)
  for (const p of ["/admin", "/admin/requests", "/admin/embeddings", "/admin/retrieval", "/admin/sessions", "/admin/graph"]) {
    const resp = await page.goto(`${ADMIN}${p}`, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ err: e.message }))
    await page.waitForTimeout(1200)
    const body = await page.locator("body").innerText()
    const gated = body.includes("Admin access required")
    const status = typeof resp?.status === "function" ? resp.status() : resp?.err
    console.log(`ADMIN ${p.padEnd(20)} status=${status} gated=${gated} len=${body.length}`)
  }
  await page.goto(`${ADMIN}/admin/requests`, { waitUntil: "networkidle", timeout: 60000 })
  await page.screenshot({ path: `${dir}/live-admin-requests.png`, fullPage: true })

  console.log("5xx errors:", fails.length ? fails.join("; ") : "none")
} catch (e) {
  console.log("ERROR:", e.message?.slice(0, 250))
} finally { await browser.close() }
