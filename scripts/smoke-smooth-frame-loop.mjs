import { chromium } from "playwright";
import { stat } from "node:fs/promises";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_SMOOTH_SCREENSHOT ?? "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-frame-loop.png";
const cadenceSampleMs = Number(process.env.SOVEREIGNS_SMOOTH_SAMPLE_MS ?? 1600);
const llmMockDelayMs = Number(process.env.SOVEREIGNS_SMOOTH_LLM_DELAY_MS ?? 2400);

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
  await new Promise((resolve) => setTimeout(resolve, llmMockDelayMs));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: JSON.stringify(responseForSchema(body?.format)) })
  });
});

await page.route("**/ollama/api/chat", async (route) => {
  const body = route.request().postDataJSON();
  await new Promise((resolve) => setTimeout(resolve, llmMockDelayMs));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ message: { role: "assistant", content: JSON.stringify(responseForSchema(body?.format)) } })
  });
});

await page.goto(`${url}${url.includes("?") ? "&" : "?"}smoothFrameSmoke=${Date.now()}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(
  () =>
    typeof window.render_game_to_text === "function" &&
    typeof window.render_motion_probe_for_test === "function" &&
    typeof window.reset_motion_probe_for_test === "function" &&
    typeof window.force_visual_motion_for_test === "function",
  null,
  { timeout: 15_000 }
);

const motion = await page.evaluate(() => window.force_visual_motion_for_test?.());
if (!motion?.ok || !motion.unitId) {
  throw new Error(`Could not force a visible moving unit: ${JSON.stringify(motion)}`);
}

const warmFrameHandle = await page.waitForFunction(
  (unitId) => {
    const parsed = window.render_motion_probe_for_test(unitId);
    const unit = parsed?.unit;
    const visualDelta = unit ? Math.hypot((unit.visualX ?? unit.x) - unit.x, (unit.visualY ?? unit.y) - unit.y) : 0;
    return parsed?.clock?.measuredFps >= 25 && parsed.clock?.renderAlpha > 0 && visualDelta >= 0.005
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
const warmState = await warmFrameHandle.jsonValue();
const probeReset = await page.evaluate((unitId) => window.reset_motion_probe_for_test(unitId), motion.unitId);
if (!probeReset) {
  throw new Error(`Could not reset motion cadence probe for ${motion.unitId}`);
}
const activeLlmHandle = await page.waitForFunction(
  (unitId) => {
    const parsed = window.render_motion_probe_for_test(unitId);
    return parsed?.llm?.activeJobCount > 0
      ? {
          tick: parsed.tick,
          clock: parsed.clock,
          llm: parsed.llm,
          cadence: parsed.cadence
        }
      : null;
  },
  motion.unitId,
  { timeout: 10_000, polling: "raf" }
);
const activeLlmState = await activeLlmHandle.jsonValue();
await page.waitForTimeout(cadenceSampleMs);
const cadence = await page.evaluate((unitId) => window.render_motion_probe_for_test(unitId)?.cadence ?? null, motion.unitId);
if (!cadence) {
  throw new Error("Motion cadence probe did not return a sample.");
}
await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshotInfo = await stat(screenshotPath);

if (errors.length > 0) {
  throw new Error(`Smooth frame smoke saw browser errors: ${JSON.stringify(errors.slice(0, 5))}`);
}
if (warmState.clock.measuredFps < 25 || cadence.minMeasuredFps < 25) {
  throw new Error(`Measured FPS below smoothness floor: ${JSON.stringify({ warmState, cadence })}`);
}
if (!warmState.unit || Math.hypot((warmState.unit.visualX ?? warmState.unit.x) - warmState.unit.x, (warmState.unit.visualY ?? warmState.unit.y) - warmState.unit.y) < 0.005) {
  throw new Error(`Moving unit was not visually interpolated between simulation ticks: ${JSON.stringify(warmState)}`);
}
if (cadence.frameCount < Math.floor((cadenceSampleMs / 1000) * 22)) {
  throw new Error(`Browser did not present enough animation frames during the cadence sample: ${JSON.stringify(cadence)}`);
}
if (cadence.sameTickMotionFrames < 2 || cadence.maxFramesPerTick < 2) {
  throw new Error(`Visible motion collapsed to simulation ticks instead of sub-tick frames: ${JSON.stringify(cadence)}`);
}
if (cadence.maxTickerDeltaMs > 160) {
  throw new Error(`Animation frame gap exceeded the smoothness ceiling: ${JSON.stringify(cadence)}`);
}
if (cadence.tickChanges > 3 && cadence.snapTickChanges > Math.ceil(cadence.tickChanges * 0.5)) {
  throw new Error(`Movement appears to snap on tick boundaries: ${JSON.stringify(cadence)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      screenshotPath,
      screenshotBytes: screenshotInfo.size,
      warmState,
      activeLlmState,
      cadence,
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
