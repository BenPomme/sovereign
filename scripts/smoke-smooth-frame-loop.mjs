import { chromium } from "playwright";
import { stat } from "node:fs/promises";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_SMOOTH_SCREENSHOT ?? "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-frame-loop.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
const errors = [];
const warnings = [];
let identityCounter = 0;
let decisionCounter = 0;

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console error: ${message.text()}`);
  if (message.type() === "warning") warnings.push(`console warning: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.route("**/ollama/api/tags", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      models: [
        { name: "qwen3.5:9b-mlx", model: "qwen3.5:9b-mlx" },
        { name: "gpt-oss:20b", model: "gpt-oss:20b" }
      ]
    })
  });
});

await page.route("**/ollama/api/generate", async (route) => {
  const body = route.request().postDataJSON();
  await new Promise((resolve) => setTimeout(resolve, 900));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: JSON.stringify(responseForSchema(body?.format)) })
  });
});

await page.route("**/ollama/api/chat", async (route) => {
  const body = route.request().postDataJSON();
  await new Promise((resolve) => setTimeout(resolve, 900));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ message: { role: "assistant", content: JSON.stringify(responseForSchema(body?.format)) } })
  });
});

await page.goto(`${url}${url.includes("?") ? "&" : "?"}smoothFrameSmoke=${Date.now()}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(
  () => typeof window.render_game_to_text === "function" && typeof window.force_visual_motion_for_test === "function",
  null,
  { timeout: 15_000 }
);

const motion = await page.evaluate(() => window.force_visual_motion_for_test?.());
if (!motion?.ok || !motion.unitId) {
  throw new Error(`Could not force a visible moving unit: ${JSON.stringify(motion)}`);
}

const interpolatedHandle = await page.waitForFunction(
  (unitId) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const unit = (parsed.visibleUnits ?? []).find((candidate) => candidate.id === unitId);
    const visualDelta = unit ? Math.hypot((unit.visualX ?? unit.x) - unit.x, (unit.visualY ?? unit.y) - unit.y) : 0;
    return parsed.clock?.measuredFps >= 24 && parsed.clock?.renderAlpha > 0 && visualDelta >= 0.005
      ? {
          tick: parsed.tick,
          clock: parsed.clock,
          unit,
          visualDelta,
          llm: {
            activeJobCount: parsed.llm?.activeJobCount,
            maxConcurrentJobs: parsed.llm?.maxConcurrentJobs,
            frameBudget: parsed.llm?.frameBudget
          }
        }
      : null;
  },
  motion.unitId,
  { timeout: 15_000, polling: "raf" }
);
const state = await interpolatedHandle.jsonValue();
await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshotInfo = await stat(screenshotPath);

if (errors.length > 0) {
  throw new Error(`Smooth frame smoke saw browser errors: ${JSON.stringify(errors.slice(0, 5))}`);
}
if (state.clock.measuredFps < 24) {
  throw new Error(`Measured FPS below smoothness floor: ${JSON.stringify(state)}`);
}
if (!state.unit || Math.hypot((state.unit.visualX ?? state.unit.x) - state.unit.x, (state.unit.visualY ?? state.unit.y) - state.unit.y) < 0.005) {
  throw new Error(`Moving unit was not visually interpolated between simulation ticks: ${JSON.stringify(state)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      screenshotPath,
      screenshotBytes: screenshotInfo.size,
      state,
      warnings: warnings.slice(0, 8)
    },
    null,
    2
  )
);

await browser.close();

function responseForSchema(format) {
  const properties = format?.properties ?? {};
  if (properties.realmName) {
    identityCounter += 1;
    return {
      realmName: `Smooth Realm ${identityCounter}`,
      sovereignName: `Smooth Sovereign ${identityCounter}`,
      namingStyle: `cadenced test names ${identityCounter}`,
      inspiration: `frame-rate chronicle ${identityCounter}`,
      unitNames: []
    };
  }
  if (properties.freeformStrategy) {
    decisionCounter += 1;
    return {
      freeformStrategy: `Keep the realm moving while background councils think, doctrine ${decisionCounter}.`,
      strategySummary: `Smooth doctrine ${decisionCounter}.`,
      memoryNote: `Frame cadence preserved during doctrine ${decisionCounter}.`,
      orders: [],
      unitNames: [],
      bugReport: "",
      bugSeverity: "low"
    };
  }
  if (properties.strategyNote) {
    return {
      strategyNote: "Reply without blocking the visible world.",
      memoryNote: "Replies should not block frames.",
      subject: "Roads remain open",
      body: "We read your message and will answer while our people continue their work.",
      diplomacyIntent: "PEACE_OFFER",
      bugReport: "",
      bugSeverity: "low"
    };
  }
  return { ok: true };
}
