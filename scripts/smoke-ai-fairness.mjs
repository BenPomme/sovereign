import { chromium } from "playwright";
import { stat } from "node:fs/promises";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_AI_FAIRNESS_SCREENSHOT ??
  "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png";
const models = ["qwen3.5:9b-mlx", "gemma4:12b", "gemma4:latest", "qwen3.5:27b-q4_K_M", "gpt-oss:20b"];
const expectedFirstTurns = ["blue", "red", "green", "yellow", "purple"];
const expectedAssignments = {
  blue: "qwen3.5:9b-mlx",
  red: "gpt-oss:20b",
  green: "qwen3.5:9b-mlx",
  yellow: "gpt-oss:20b",
  purple: "qwen3.5:9b-mlx"
};
const expectedIdentityModels = {
  "Blue Crown": "qwen3.5:9b-mlx",
  "Red Banner": "gpt-oss:20b",
  "Green Vale": "qwen3.5:9b-mlx",
  "Yellow Knives": "gpt-oss:20b",
  "Purple Seal": "qwen3.5:9b-mlx"
};
const expectedFirstDoctrineModels = {
  blue: "qwen3.5:9b-mlx",
  red: "gpt-oss:20b",
  green: "qwen3.5:9b-mlx",
  yellow: "gpt-oss:20b",
  purple: "qwen3.5:9b-mlx"
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
const warnings = [];
const calls = {
  generate: 0,
  chat: 0,
  identity: 0,
  decision: 0,
  reply: 0,
  health: 0
};
const identityModels = {};

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console error: ${message.text()}`);
  if (message.type() === "warning") warnings.push(`console warning: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("dialog", async (dialog) => {
  warnings.push(`dialog: ${dialog.message()}`);
  await dialog.dismiss();
});

await page.route("**/ollama/api/tags", async (route) => {
  await delay(250);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: models.map((name) => ({ name, model: name })) })
  });
});

await page.route("**/ollama/api/generate", async (route) => {
  calls.generate += 1;
  const body = JSON.parse(route.request().postData() ?? "{}");
  if (body.think !== false) {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: `generate schema calls must disable thinking, got ${JSON.stringify(body.think)}` })
    });
    return;
  }
  if (isIdentityRequest(body)) {
    await delay(250);
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: responseForSchema(body, "generate") })
  });
});

await page.route("**/ollama/api/chat", async (route) => {
  calls.chat += 1;
  const body = JSON.parse(route.request().postData() ?? "{}");
	  if (body.model !== "gpt-oss:20b" || body.stream !== false || body.think !== "low" || !Array.isArray(body.messages) || body.prompt) {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: `bad gpt-oss chat body ${JSON.stringify(body)}` })
    });
	    return;
	  }
  if (isIdentityRequest(body)) {
    await delay(250);
  }
	  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      message: {
        role: "assistant",
        thinking: "private mocked gpt-oss reasoning",
        content: `<think>hidden mocked reasoning</think>${responseForSchema(body, "chat")}`
      },
      done: true
    })
  });
});

await page.goto(`${url}${url.includes("?") ? "&" : "?"}aiFairness=${Date.now()}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(() => typeof window.render_game_to_text === "function", null, { timeout: 15_000 });
await page.click("#askAiNowButton");
await page.waitForTimeout(100);
const startupGateState = await page.evaluate(() => {
  const parsed = JSON.parse(window.render_game_to_text());
  return {
    decisions: parsed.latestAiDecisions ?? [],
    llm: parsed.llm,
    panelText: document.querySelector("#llmPanel")?.textContent ?? ""
  };
});
if ((startupGateState.decisions ?? []).length > 0) {
  throw new Error(`Manual AI click during startup created a premature decision: ${JSON.stringify(startupGateState)}`);
}

const stateHandle = await page.waitForFunction(
  (expected) => {
    window.advanceTime?.(1000);
    const parsed = JSON.parse(window.render_game_to_text());
    const strategyTurns = (parsed.latestAiDecisions ?? []).filter((decision) => String(decision.summary ?? "").startsWith("Mock "));
    const firstFive = strategyTurns.slice(0, 5).map((decision) => decision.tribeId);
    const allExpected = expected.every((tribeId) => firstFive.includes(tribeId));
    const quality = parsed.llm?.modelQuality ?? [];
    const gptOssQuality = quality.find((entry) => entry.model === "gpt-oss:20b");
    const qwenQuality = quality.find((entry) => entry.model === "qwen3.5:9b-mlx");
    const assignedModelsHaveTurn = (gptOssQuality?.liveDecisions ?? 0) >= 1 && (qwenQuality?.liveDecisions ?? 0) >= 1;
    return firstFive.length >= 5 && allExpected && assignedModelsHaveTurn
      ? {
          tick: parsed.tick,
          activeModel: parsed.activeModel,
          assignments: parsed.llm?.modelAssignments,
          identityBootstrapModel: parsed.llm?.identityBootstrapModel,
          strategyBootstrapModel: parsed.llm?.strategyBootstrapModel,
          firstDoctrineProgress: parsed.llm?.firstDoctrineProgress,
          assignedModelsHaveTurn,
          modelQuality: quality,
          firstFive,
          strategyTurns,
          aiIssues: parsed.aiIssues ?? [],
          panelText: document.querySelector("#llmPanel")?.textContent ?? ""
        }
      : null;
  },
  expectedFirstTurns,
  { timeout: 60_000 }
);
const state = await stateHandle.jsonValue();
await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

const screenshot = await stat(screenshotPath);
if (screenshot.size < 50_000) {
  throw new Error(`AI fairness screenshot looks too small: ${screenshot.size}`);
}
if (JSON.stringify(state.firstFive.slice().sort()) !== JSON.stringify(expectedFirstTurns.slice().sort())) {
  throw new Error(`First strategy turns were not fair: ${JSON.stringify(state.firstFive)} expected all ${JSON.stringify(expectedFirstTurns)}`);
}
if (state.activeModel !== expectedAssignments.blue) {
  throw new Error(`Default active model drifted: ${state.activeModel} expected ${expectedAssignments.blue}`);
}
if (state.identityBootstrapModel !== expectedAssignments.blue) {
  throw new Error(`Identity bootstrap model drifted: ${state.identityBootstrapModel} expected ${expectedAssignments.blue}`);
}
if (state.strategyBootstrapModel !== expectedAssignments.blue) {
  throw new Error(`Strategy bootstrap model drifted: ${state.strategyBootstrapModel} expected ${expectedAssignments.blue}`);
}
if (state.firstDoctrineProgress?.written !== expectedFirstTurns.length) {
  throw new Error(`First doctrine progress did not reach all tribes: ${JSON.stringify(state.firstDoctrineProgress)}`);
}
for (const [tribeId, model] of Object.entries(expectedAssignments)) {
  if (state.assignments?.[tribeId] !== model) {
    throw new Error(`Model assignment for ${tribeId} drifted: ${state.assignments?.[tribeId]} expected ${model}`);
  }
}
const assignedModels = new Set(Object.values(state.assignments ?? {}));
if (assignedModels.has("gemma4:12b") || assignedModels.has("gemma4:latest")) {
  throw new Error(`Slow gemma model re-entered default assignments: ${JSON.stringify(state.assignments)}`);
}
for (const [defaultTribeName, model] of Object.entries(expectedIdentityModels)) {
  if (identityModels[defaultTribeName] !== model) {
    throw new Error(`Identity for ${defaultTribeName} used ${identityModels[defaultTribeName]} instead of startup model ${model}`);
  }
}
for (const decision of state.strategyTurns.slice(0, 5)) {
  const expectedModel = expectedFirstDoctrineModels[decision.tribeId];
  if (decision.model !== expectedModel) {
    throw new Error(`First doctrine for ${decision.tribeId} used ${decision.model}, expected startup model ${expectedModel}`);
  }
}
if (!state.assignedModelsHaveTurn) {
  throw new Error(`Assigned diversity models did not receive a later live turn: ${JSON.stringify(state.modelQuality)}`);
}
if (calls.generate < 4 || calls.chat < 1) {
  throw new Error(`Expected four generate turns and one chat turn, got ${JSON.stringify(calls)}`);
}
if (state.strategyTurns.slice(0, 5).some((decision) => decision.provider !== "ollama")) {
  throw new Error(`Expected first five strategy turns to use live mocked Ollama, got ${JSON.stringify(state.strategyTurns.slice(0, 5))}`);
}
const gptOssQuality = state.modelQuality?.find((entry) => entry.model === "gpt-oss:20b");
if (!gptOssQuality || gptOssQuality.liveDecisions < 1 || gptOssQuality.status !== "clean") {
  throw new Error(`gpt-oss model quality did not record a clean live turn: ${JSON.stringify(gptOssQuality)}`);
}
const qwenQuality = state.modelQuality?.find((entry) => entry.model === "qwen3.5:9b-mlx");
if (!qwenQuality || qwenQuality.liveDecisions < 1 || qwenQuality.status !== "clean") {
  throw new Error(`qwen model quality did not record a clean live turn: ${JSON.stringify(qwenQuality)}`);
}
if (!state.panelText.includes("Chat adapters: gpt-oss:20b via /api/chat")) {
  throw new Error(`AI Observer panel did not expose gpt-oss chat adapter: ${state.panelText}`);
}
if (errors.length > 0) {
  throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      screenshotPath,
      screenshotBytes: screenshot.size,
      calls,
      identityModels,
      identityBootstrapModel: state.identityBootstrapModel,
      strategyBootstrapModel: state.strategyBootstrapModel,
      firstFive: state.firstFive,
      assignments: state.assignments,
      gptOssQuality,
      qwenQuality,
      warnings
    },
    null,
    2
  )
);

function responseForSchema(body, adapter) {
  const properties = body.format?.properties ?? {};
  if (Object.prototype.hasOwnProperty.call(properties, "freeformStrategy")) {
    calls.decision += 1;
    return validDecisionJson(adapter);
  }
  if (Object.prototype.hasOwnProperty.call(properties, "realmName")) {
    calls.identity += 1;
    const prompt = body.prompt ?? body.messages?.[0]?.content ?? "";
    const defaultTribeName = extractDefaultTribeName(prompt) ?? `unknown-${calls.identity}`;
    identityModels[defaultTribeName] = body.model;
    return JSON.stringify({
      realmName: `Fairness Realm ${calls.identity}`,
      sovereignName: `Fairness Sovereign ${calls.identity}`,
      namingStyle: "concise fairness smoke names",
      inspiration: "deterministic AI fairness smoke",
      unitNames: []
    });
  }
  if (Object.prototype.hasOwnProperty.call(properties, "strategyNote")) {
    calls.reply += 1;
    return JSON.stringify({
      strategyNote: "Mock fairness reply.",
      memoryNote: "Fairness reply path stayed open.",
      subject: "Re: fairness",
      body: "We received the fairness smoke messenger.",
      diplomacyIntent: "PEACE_OFFER",
      bugReport: "",
      bugSeverity: "low"
    });
  }
  if (Object.prototype.hasOwnProperty.call(properties, "ok")) {
    calls.health += 1;
    return JSON.stringify({ ok: true });
  }
  throw new Error(`Unknown mocked Ollama schema: ${JSON.stringify(properties)}`);
}

function isIdentityRequest(body) {
  return Boolean(body.format?.properties && Object.prototype.hasOwnProperty.call(body.format.properties, "realmName"));
}

function extractDefaultTribeName(prompt) {
  const match = String(prompt).match(/founding sovereign of the ([^.]+) people/i);
  return match?.[1]?.trim();
}

function validDecisionJson(adapter) {
  return JSON.stringify({
    freeformStrategy: `Mock ${adapter} strategy for first-turn fairness.`,
    strategySummary: `Mock ${adapter} decision.`,
    memoryNote: `Used ${adapter} during fairness smoke.`,
    orders: [
      {
        type: "SET_POLICY",
        priority: 1,
        messageType: "LETTER",
        diplomacyIntent: "NONE",
        subject: "",
        body: "",
        reason: "scheduler fairness check"
      }
    ],
    unitNames: [],
    bugReport: "",
    bugSeverity: "low"
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
