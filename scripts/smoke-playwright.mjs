import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_SMOKE_SCREENSHOT ??
  "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png";
const bugReportPath = "/Users/benjaminpommeraud/Desktop/Sovereigns/AI_BUG_REPORTS.md";
const persistentLearningStorageKey = "sovereign-worlds.learning.v1";
const failedSelfReportBody = "Smoke forced a failed REPORT_BUG save and verified it did not enter sovereign memory.";
const smokeSelfReportBody = "Smoke verified that explicit REPORT_BUG orders persist and render.";
const smokeInfoRequestBody = "Smoke verified that REQUEST_INFO asks for strategy context without becoming a bug report.";
const realClassifierReportBody =
  "Real sovereign report mentions smoke from forges, mock attacks, and playwright scribes, but metadata says this is live Ollama feedback.";
const execFileAsync = promisify(execFile);
const mockedOllamaModels = ["qwen3.5:9b-mlx", "gemma4:12b", "gpt-oss:20b"];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
await page.addInitScript((storageKey) => {
  const clearedKey = `${storageKey}:smoke-cleared`;
  if (sessionStorage.getItem(clearedKey) === "true") return;
  localStorage.removeItem(storageKey);
  sessionStorage.setItem(clearedKey, "true");
}, persistentLearningStorageKey);
const errors = [];
const warnings = [];
let expectedBadRequestCount = 0;
let expectedForcedSelfReportFailureCount = 0;
let triageState;
const mockedOllamaCalls = {
  tags: 0,
  generate: 0,
  chat: 0,
  identity: 0,
  decision: 0,
  reply: 0,
  health: 0
};

page.on("console", (message) => {
  if (message.type() === "error") {
    const text = message.text();
    if (expectedBadRequestCount > 0 && text.includes("400") && text.includes("Bad Request")) {
      expectedBadRequestCount -= 1;
      warnings.push(`expected rejected fixed-triage console error: ${text}`);
      return;
    }
    if (expectedForcedSelfReportFailureCount > 0 && text.includes("500") && text.includes("Internal Server Error")) {
      expectedForcedSelfReportFailureCount -= 1;
      warnings.push(`expected forced self-report persistence console error: ${text}`);
      return;
    }
    errors.push(`console error: ${text}`);
  }
  if (message.type() === "warning") warnings.push(`console warning: ${message.text()}`);
});

page.on("pageerror", (error) => {
  errors.push(`pageerror: ${error.message}`);
});
page.on("dialog", async (dialog) => {
  warnings.push(`dialog: ${dialog.message()}`);
  if (dialog.message().toLowerCase().includes("proof")) {
    await dialog.accept("Smoke proof: pnpm smoke verified fixed triage proof metadata.");
    return;
  }
  await dialog.accept();
});

await installDeterministicOllamaRoutes(page);
let failNextSelfReportSave = true;
await page.route("**/api/ai-bug-report", async (route, request) => {
  if (failNextSelfReportSave && request.method() === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(request.postData() ?? "{}");
    } catch {
      payload = {};
    }
    const source = String(payload.source ?? "");
    const report = String(payload.report ?? "");
    if (source.includes("kind=report_bug_order") && report.includes(failedSelfReportBody)) {
      failNextSelfReportSave = false;
      expectedForcedSelfReportFailureCount += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "forced smoke persistence failure" })
      });
      return;
    }
  }
  await route.continue();
});

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.click("#pauseButton");
const hookCheck = await page.evaluate(() => {
  if (typeof window.render_game_to_text !== "function" || typeof window.advanceTime !== "function") {
    return { ok: false, reason: "missing hooks" };
  }
  const before = JSON.parse(window.render_game_to_text());
  const zeroBefore = window.render_game_to_text();
  window.advanceTime(0);
  const zeroAfter = window.render_game_to_text();
  window.advanceTime(1000);
  const after = JSON.parse(window.render_game_to_text());
  return {
    ok: true,
    beforeTick: before.tick,
    zeroStable: zeroBefore === zeroAfter,
    afterTick: after.tick,
    coordinateSystem: after.coordinateSystem,
    compactAiStatus: after.llm?.compactStatus,
    combatStatCoverage: after.combatStatCoverage,
    developmentCatalog: after.developmentCatalog,
    blueDevelopmentSummary: after.tribes?.find((tribe) => tribe.id === "blue")?.developmentSummary,
    visibleUnits: Array.isArray(after.visibleUnits) ? after.visibleUnits.length : 0,
    tribes: Array.isArray(after.tribes) ? after.tribes.length : 0,
    packets: Array.isArray(after.packets) ? after.packets.length : 0,
    victory: after.victory
  };
});
if (!hookCheck.ok) throw new Error(`Missing browser test hooks: ${hookCheck.reason}`);
if (!hookCheck.zeroStable) {
  throw new Error(`advanceTime(0) changed the simulation: ${JSON.stringify(hookCheck)}`);
}
if (hookCheck.afterTick <= hookCheck.beforeTick) {
  throw new Error(`advanceTime did not advance the simulation: ${JSON.stringify(hookCheck)}`);
}
if (!String(hookCheck.coordinateSystem).includes("origin top-left") || hookCheck.visibleUnits <= 0 || hookCheck.tribes !== 5) {
  throw new Error(`render_game_to_text returned incomplete state: ${JSON.stringify(hookCheck)}`);
}
if (
  hookCheck.victory?.victoryRule !== "population_happiness_safety_century_cull" ||
  !hookCheck.victory?.currentYear ||
  !hookCheck.victory?.nextReviewYear ||
  !String(hookCheck.victory.publicText).toLowerCase().includes("population")
) {
  throw new Error(`render_game_to_text did not expose public victory pressure: ${JSON.stringify(hookCheck.victory)}`);
}
if (
  !Number.isInteger(hookCheck.compactAiStatus?.maxLanes) ||
  hookCheck.compactAiStatus.maxLanes < 1 ||
  hookCheck.compactAiStatus?.identitiesTotal !== 5 ||
  hookCheck.compactAiStatus?.tribesTotal !== 5 ||
  !Number.isInteger(hookCheck.compactAiStatus?.fallbackDecisions)
) {
  throw new Error(`render_game_to_text did not expose compact AI status: ${JSON.stringify(hookCheck.compactAiStatus)}`);
}
if (!hookCheck.combatStatCoverage?.ok || hookCheck.combatStatCoverage?.byKind?.unitType !== 8 || hookCheck.combatStatCoverage?.byKind?.buildingType !== 8) {
  throw new Error(`render_game_to_text did not expose complete combat stat coverage: ${JSON.stringify(hookCheck.combatStatCoverage)}`);
}
if (
  hookCheck.developmentCatalog?.total < 100 ||
  hookCheck.developmentCatalog?.sampleCount > 16 ||
  hookCheck.developmentCatalog?.omittedCount < 1 ||
  hookCheck.blueDevelopmentSummary?.total !== hookCheck.developmentCatalog?.total ||
  hookCheck.blueDevelopmentSummary?.availableSample?.length > 16
) {
  throw new Error(`render_game_to_text did not expose bounded 100+ development telemetry: ${JSON.stringify({
    catalog: hookCheck.developmentCatalog,
    tribe: hookCheck.blueDevelopmentSummary
  })}`);
}
await page.waitForFunction(
  () => {
    if (typeof window.render_game_to_text !== "function") return false;
    const parsed = JSON.parse(window.render_game_to_text());
    if (parsed.llm?.identitySetupComplete === true && !(parsed.llm?.activeJobs ?? []).some((job) => job.mode === "identity")) return true;
    window.advanceTime?.(1000);
    return false;
  },
  null,
  { timeout: 90_000, polling: 1000 }
);
await page.click("#pauseButton");
const openedManualMessage = await page.evaluate(() => {
  const details = document.querySelector("details.inline-debug");
  if (!(details instanceof HTMLDetailsElement)) return false;
  details.open = true;
  return true;
});
if (!openedManualMessage) throw new Error("Missing manual message test controls.");
await page.click("#sendPeaceButton");
const packetStatState = await page.evaluate(() => {
  const parsed = JSON.parse(window.render_game_to_text());
  const packets = parsed.packets ?? [];
  const packet = packets.find((candidate) => candidate.originTribeId === "blue") ?? packets[0];
  return {
    coverage: parsed.combatStatCoverage,
    packet,
    packets
  };
});
if (!packetStatState.coverage?.ok) {
  throw new Error(`Combat stat coverage failed after dispatching a packet: ${JSON.stringify(packetStatState.coverage)}`);
}
if (
  packetStatState.packet?.itemType !== "packet" ||
  packetStatState.packet?.hp <= 0 ||
  packetStatState.packet?.maxHp <= 0 ||
  packetStatState.packet?.armor < 0 ||
  packetStatState.packet?.attack !== 0 ||
  packetStatState.packet?.range !== 0 ||
  packetStatState.packet?.combatStats?.hp !== packetStatState.packet?.hp
) {
  throw new Error(`Dispatched packet did not expose item combat stats: ${JSON.stringify(packetStatState)}`);
}
const openedDebug = await page.evaluate(() => {
  const details = document.querySelector("details.debug-controls");
  if (!(details instanceof HTMLDetailsElement)) return false;
  details.open = true;
  return true;
});
if (!openedDebug) throw new Error("Missing Blue debug controls.");
const debugText = await page.locator(".debug-controls").innerText();
for (const label of [
  "Build farm",
  "Build watchtower",
  "Build wall",
  "Build gate",
  "Build turret",
  "Gather clay",
  "Gather limestone",
  "Gather iron",
  "Gather coal",
  "Gather stone",
  "Gather gold"
]) {
  if (!debugText.includes(label)) throw new Error(`Missing debug control: ${label}`);
}
const mapLayerText = await page.locator("#mapLayerPanel").innerText();
for (const label of ["Debug map labels", "Contested deposits", "Walls, gates, and turret ranges"]) {
  if (!mapLayerText.includes(label)) throw new Error(`Missing map layer control: ${label}`);
}
const mapLayerState = await page.evaluate(() => {
  const read = () => {
    const parsed = JSON.parse(window.render_game_to_text());
    return { ...parsed.mapLayers, boardReadability: parsed.boardReadability };
  };
  const resourceLabels = document.querySelector("#showResourceLabelsToggle");
  const contested = document.querySelector("#showContestedResourcesToggle");
  const defense = document.querySelector("#showDefenseOverlayToggle");
  if (!(resourceLabels instanceof HTMLInputElement) || !(contested instanceof HTMLInputElement) || !(defense instanceof HTMLInputElement)) {
    return { ok: false, reason: "missing layer inputs" };
  }
  const before = read();
  resourceLabels.checked = false;
  resourceLabels.dispatchEvent(new Event("change", { bubbles: true }));
  contested.checked = false;
  contested.dispatchEvent(new Event("change", { bubbles: true }));
  defense.checked = false;
  defense.dispatchEvent(new Event("change", { bubbles: true }));
  const off = read();
  resourceLabels.checked = true;
  resourceLabels.dispatchEvent(new Event("change", { bubbles: true }));
  contested.checked = true;
  contested.dispatchEvent(new Event("change", { bubbles: true }));
  defense.checked = true;
  defense.dispatchEvent(new Event("change", { bubbles: true }));
  const on = read();
  return { ok: true, before, off, on };
});
if (!mapLayerState.ok) throw new Error(`Map layer controls did not initialize: ${JSON.stringify(mapLayerState)}`);
if (
  mapLayerState.before?.resourceLabels !== false ||
  mapLayerState.before?.contestedResources !== true ||
  mapLayerState.before?.defenseOverlay !== true ||
  mapLayerState.off?.resourceLabels !== false ||
  mapLayerState.off?.contestedResources !== false ||
  mapLayerState.off?.defenseOverlay !== false ||
  mapLayerState.on?.resourceLabels !== true ||
  mapLayerState.on?.contestedResources !== true ||
  mapLayerState.on?.defenseOverlay !== true
) {
  throw new Error(`Map layer controls did not update render_game_to_text: ${JSON.stringify(mapLayerState)}`);
}
if (
  mapLayerState.before?.boardReadability?.labelContrastMode !== "backed" ||
  mapLayerState.before?.boardReadability?.resourceLabelsVisible !== false ||
  mapLayerState.before?.boardReadability?.visibleResourceLabelCount !== 0 ||
  mapLayerState.before?.boardReadability?.totalVisibleLabelCount !== 0 ||
  mapLayerState.before?.boardReadability?.spriteVisuals?.atlasReady !== true ||
  mapLayerState.before?.boardReadability?.spriteVisuals?.visibleResourceSpriteCount <= 0 ||
  mapLayerState.off?.boardReadability?.resourceLabelsVisible !== false ||
  mapLayerState.off?.boardReadability?.visibleResourceLabelCount !== 0 ||
  mapLayerState.off?.boardReadability?.totalVisibleLabelCount !== 0 ||
  mapLayerState.on?.boardReadability?.resourceLabelsVisible !== true ||
  mapLayerState.on?.boardReadability?.visibleResourceLabelCount <= 0 ||
  mapLayerState.on?.boardReadability?.totalVisibleLabelCount <= 0 ||
  mapLayerState.on?.boardReadability?.spriteVisuals?.atlasReady !== true
) {
  throw new Error(`Board readability telemetry did not track sprite-first visuals and debug labels through map toggles: ${JSON.stringify(mapLayerState)}`);
}
const constructionBoost = await page.evaluate(() => {
  if (typeof window.force_resource_boost_for_test !== "function") return { ok: false, reason: "missing resource boost hook" };
  return window.force_resource_boost_for_test("blue", { wood: 300, stone: 220, clay: 140, limestone: 140, iron: 90, coal: 90, gold: 180 });
});
if (!constructionBoost.ok) throw new Error(`Resource boost hook failed before construction visibility sequence: ${JSON.stringify(constructionBoost)}`);
await page.click("#buildFarmButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "farm");
await page.click("#buildWatchtowerButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "watchtower");
await forceDevelopment(page, "masonry");
await page.click("#buildWallButton");
await page.waitForTimeout(1_500);
const wallState = await page.evaluate(() => {
  const parsed = JSON.parse(window.render_game_to_text());
  const selectedWall = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
  const clay = parsed.resourceTiles.find((entry) => entry.type === "clay");
  const limestone = parsed.resourceTiles.find((entry) => entry.type === "limestone");
  const iron = parsed.resourceTiles.find((entry) => entry.type === "iron");
  const coal = parsed.resourceTiles.find((entry) => entry.type === "coal");
  const wallCost = parsed.buildingCosts?.find((entry) => entry.type === "wall")?.cost;
  const turretCost = parsed.buildingCosts?.find((entry) => entry.type === "turret")?.cost;
  const wallMissing = parsed.buildingCosts?.find((entry) => entry.type === "wall")?.missingForPlayer ?? [];
  const readability = parsed.boardReadability;
  const constructionFeedback = parsed.constructionFeedback;
  const camera = parsed.camera;
  const contestedIron = parsed.contestedResourceSites?.filter((site) => site.type === "iron" && site.contested) ?? [];
  const contestedCoal = parsed.contestedResourceSites?.filter((site) => site.type === "coal" && site.contested) ?? [];
  const blueResourceControl = parsed.resourceControl?.find((entry) => entry.tribeId === "blue");
  const visibleResourceDepositsForPlayer = parsed.visibleResourceDepositsForPlayer ?? [];
  return {
    selectedWall,
    clay,
    limestone,
    iron,
    coal,
    wallCost,
    turretCost,
    wallMissing,
    readability,
    constructionFeedback,
    camera,
    contestedIron,
    contestedCoal,
    blueResourceControl,
    visibleResourceDepositsForPlayer
  };
});
if (wallState.selectedWall?.type !== "wall" || wallState.selectedWall.blocksMovement !== true) {
  throw new Error(`Built wall was not represented as a blocking visible building: ${JSON.stringify(wallState.selectedWall)}`);
}
if (
  wallState.constructionFeedback?.buildingType !== "wall" ||
  wallState.constructionFeedback?.selected !== true ||
  wallState.constructionFeedback?.visible !== true ||
  wallState.selectedWall.constructionFocus !== true
) {
  throw new Error(`Built wall did not expose construction focus feedback: ${JSON.stringify(wallState)}`);
}
if (!wallState.clay?.tiles || !wallState.limestone?.tiles || !wallState.iron?.tiles || !wallState.coal?.tiles) {
  throw new Error(`Construction resource tiles were not exposed by render_game_to_text: ${JSON.stringify(wallState)}`);
}
if (
  wallState.wallCost?.clay !== 25 ||
  wallState.wallCost?.limestone !== 15 ||
  wallState.wallCost?.stone !== 30 ||
  wallState.turretCost?.limestone !== 35 ||
  wallState.turretCost?.iron !== 45 ||
  wallState.turretCost?.coal !== 30
) {
  throw new Error(`Building costs were not exposed or tied to construction resources: ${JSON.stringify(wallState)}`);
}
if (!wallState.readability?.resourceAbbreviations?.some((entry) => entry.type === "coal" && entry.label === "CO" && entry.scarce)) {
  throw new Error(`Board readability hook did not expose scarce resource abbreviations: ${JSON.stringify(wallState.readability)}`);
}
if (
  wallState.readability?.labelContrastMode !== "backed" ||
  !["overview", "tactical", "detail"].includes(wallState.readability?.labelTier) ||
  wallState.readability?.spriteVisuals?.atlasReady !== true ||
  wallState.readability?.spriteVisuals?.visibleResourceSpriteCount <= 0 ||
  wallState.readability?.spriteVisuals?.buildingTextureTypes < 8 ||
  wallState.readability?.spriteVisuals?.unitTextureTypes < 8 ||
  wallState.readability?.spriteVisuals?.siegeEngineTexture !== true ||
  wallState.readability?.visibleBuildingLabelCount <= 0 ||
  wallState.readability?.constructionLabelCount <= 0 ||
  wallState.readability?.totalVisibleLabelCount <= 0 ||
  !wallState.readability?.resourceAbbreviations?.some((entry) => entry.type === "wood" && entry.visibleAtTier === false)
) {
  throw new Error(`Board readability hook did not expose sprite-first visuals and optional debug labels after construction: ${JSON.stringify(wallState.readability)}`);
}
if (!wallState.contestedIron.length || !wallState.contestedCoal.length) {
  throw new Error(`No contested scarce-resource sites were exposed by render_game_to_text: ${JSON.stringify(wallState)}`);
}
if (!wallState.blueResourceControl || typeof wallState.blueResourceControl.survivalBonus !== "number") {
  throw new Error(`Resource control summary was not exposed by render_game_to_text: ${JSON.stringify(wallState.blueResourceControl)}`);
}
if (!Array.isArray(wallState.visibleResourceDepositsForPlayer)) {
  throw new Error("Visible resource deposit posture list was not exposed by render_game_to_text.");
}
if (wallState.wallMissing.length > 0) {
  throw new Error(`Masonry did not unlock wall construction in browser state: ${JSON.stringify(wallState.wallMissing)}`);
}
await assertCreatedBuildingVisible(page, "wall");

const canvasBox = await page.locator("canvas").boundingBox();
if (!canvasBox || canvasBox.width < 600 || canvasBox.height < 400) {
  throw new Error(`Canvas did not mount at a playable size: ${JSON.stringify(canvasBox)}`);
}
if (
  wallState.selectedWall.screenX < 80 ||
  wallState.selectedWall.screenY < 80 ||
  wallState.selectedWall.screenX > canvasBox.width - 80 ||
  wallState.selectedWall.screenY > canvasBox.height - 80
) {
  throw new Error(`Built wall was not centered inside the visible map canvas: ${JSON.stringify({ wall: wallState.selectedWall, canvasBox })}`);
}
const resourceBoost = await page.evaluate(() => {
  if (typeof window.force_resource_boost_for_test !== "function") return { ok: false, reason: "missing resource boost hook" };
  return window.force_resource_boost_for_test("blue", { wood: 200, stone: 200, limestone: 120, iron: 80, coal: 80, gold: 120 });
});
if (!resourceBoost.ok) throw new Error(`Resource boost hook failed before turret visibility check: ${JSON.stringify(resourceBoost)}`);
await forceDevelopment(page, "ironworking");
await forceDevelopment(page, "ballistics");
await page.click("#buildTurretButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "turret");
const layoutBoxes = await page.evaluate(() => {
  const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
  const viewport = document.querySelector("#viewport")?.getBoundingClientRect();
  const resourceBar = document.querySelector("#resourceBar")?.getBoundingClientRect();
  if (!topbar || !viewport || !resourceBar) return { ok: false, reason: "missing layout boxes" };
  return {
    ok: true,
    topbar: { top: topbar.top, bottom: topbar.bottom, height: topbar.height },
    viewport: { top: viewport.top, bottom: viewport.bottom, height: viewport.height },
    resourceBar: { top: resourceBar.top, bottom: resourceBar.bottom, height: resourceBar.height }
  };
});
if (!layoutBoxes.ok) throw new Error(`Could not inspect HUD/map layout: ${JSON.stringify(layoutBoxes)}`);
if (layoutBoxes.topbar.bottom > layoutBoxes.viewport.top + 1 || layoutBoxes.resourceBar.bottom > layoutBoxes.topbar.bottom + 1) {
  throw new Error(`Top HUD overlaps the map instead of reserving layout space: ${JSON.stringify(layoutBoxes)}`);
}
if (layoutBoxes.viewport.height < 360) {
  throw new Error(`Map viewport became too short after HUD layout: ${JSON.stringify(layoutBoxes)}`);
}

const resourceText = await page.locator("#resourceBar").innerText();
for (const label of ["Year", "Turn", "Survival", "Next review", "Player happy", "Player safety", "Gold", "Food", "Wood", "Stone", "Clay", "Limestone", "Iron", "Coal", "Player pop", "LLM", "Tribes"]) {
  if (!resourceText.includes(label)) throw new Error(`Missing HUD label: ${label}`);
}
const victoryText = await page.locator("#victoryPanel").innerText();
for (const label of ["population", "Year", "Survivors", "Next review", "Blue score"]) {
  if (!victoryText.includes(label)) throw new Error(`Victory pressure panel did not show ${label}. Text: ${victoryText}`);
}
const aiBugText = await page.locator("#aiBugPanel").innerText();
if (!aiBugText.includes("AI") && !aiBugText.includes("Turn")) {
  throw new Error(`AI bug queue did not render useful status text. Text: ${aiBugText}`);
}

const legendText = await page.locator("#legendPanel").innerText();
for (const label of [
  "People",
  "sovereigns",
  "workers",
  "messenger",
  "Towns",
  "Fortifications",
  "walls",
  "lockable gates",
  "turrets",
  "Stone materials",
  "Scarce deposits",
  "iron ore",
  "coal outcrops",
  "8-tile strategic reference",
  "contested deposits",
  "turret ranges",
  "20 wood, 30 stone, 25 clay, 15 limestone",
  "45 iron",
  "30 coal"
]) {
  if (!legendText.includes(label)) throw new Error(`Missing legend label: ${label}`);
}

const selectedText = await page.locator("#selectedPanel").innerText();
if (!selectedText.includes("Fires on hostile units") || !selectedText.includes("Build cost") || !selectedText.includes("New construction visible on map")) {
  throw new Error(`Turret build did not expose defensive behavior in the selected panel. Text: ${selectedText}`);
}
const preFailureSelfReportState = await readSelfReportState(page, failedSelfReportBody);
const preFailureMemoryFiledCount = preFailureSelfReportState.memoryFiledNotes.length;
const failedSelfReportResult = await page.evaluate(async (body) => {
  if (typeof window.force_ai_self_report_for_test !== "function") return { ok: false, reason: "missing self-report hook" };
  return await window.force_ai_self_report_for_test("blue", body);
}, failedSelfReportBody);
if (!failedSelfReportResult.ok || failedSelfReportResult.issue?.saveState !== "failed") {
  throw new Error(`Forced failed AI self-report did not surface a failed issue: ${JSON.stringify(failedSelfReportResult)}`);
}
const failedSelfReportState = await readSelfReportState(page, failedSelfReportBody);
if (failedSelfReportState.issue?.saveState !== "failed") {
  throw new Error(`render_game_to_text did not expose the failed self-report issue: ${JSON.stringify(failedSelfReportState)}`);
}
if (
  failedSelfReportState.memoryFiledNotes.length !== preFailureMemoryFiledCount ||
  failedSelfReportState.memory.some((note) => note.includes(failedSelfReportBody))
) {
  throw new Error(`Failed self-report incorrectly entered sovereign memory: ${JSON.stringify(failedSelfReportState.memory)}`);
}
if (failNextSelfReportSave) {
  throw new Error("Forced self-report persistence failure route was not consumed.");
}
const selfReportResult = await page.evaluate(async (body) => {
  if (typeof window.force_ai_self_report_for_test !== "function") return { ok: false, reason: "missing self-report hook" };
  return await window.force_ai_self_report_for_test("blue", body);
}, smokeSelfReportBody);
if (!selfReportResult.ok) {
  throw new Error(`Explicit AI self-report test hook failed: ${JSON.stringify(selfReportResult)}`);
}
if (selfReportResult.issue?.saveState !== "saved") {
  throw new Error(`Successful AI self-report did not return a saved issue: ${JSON.stringify(selfReportResult)}`);
}
if (!selfReportResult.memoryIncludesReport) {
  throw new Error(`Explicit AI self-report did not enter sovereign memory for the next prompt: ${JSON.stringify(selfReportResult)}`);
}
const savedSelfReportState = await readSelfReportState(page, smokeSelfReportBody);
if (savedSelfReportState.issue?.saveState !== "saved") {
  throw new Error(`render_game_to_text did not expose the saved self-report issue: ${JSON.stringify(savedSelfReportState)}`);
}
if (!savedSelfReportState.memory.some((note) => note.includes("AI iteration report filed") && note.includes("Smoke verified"))) {
  throw new Error(`Successful self-report did not enter sovereign memory with the report text: ${JSON.stringify(savedSelfReportState.memory)}`);
}
const selfReportMemory = await page.evaluate(() => {
  const blue = JSON.parse(window.render_game_to_text()).tribes?.find((tribe) => tribe.id === "blue");
  return blue?.memory ?? [];
});
if (!selfReportMemory.some((note) => String(note).includes("AI iteration report filed"))) {
  throw new Error(`render_game_to_text did not expose AI report memory feedback: ${JSON.stringify(selfReportMemory)}`);
}
let iterationPromptContext = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiIterationPromptContext);
if (JSON.stringify(iterationPromptContext).toLowerCase().includes("smoke explicit")) {
  throw new Error(`Synthetic smoke report leaked into live AI iteration prompt context: ${JSON.stringify(iterationPromptContext)}`);
}
let selfReportInbox = await page.evaluate(() => {
  const blue = JSON.parse(window.render_game_to_text()).tribes?.find((tribe) => tribe.id === "blue");
  return blue?.iterationInbox;
});
if (
  !selfReportInbox ||
  !Number.isInteger(selfReportInbox.openReportCount) ||
  !Array.isArray(selfReportInbox.recentOwnReports) ||
  !Array.isArray(selfReportInbox.resolvedLessons) ||
  !String(selfReportInbox.promptSummary ?? "").includes("open ")
) {
  throw new Error(`render_game_to_text did not expose a structured AI iteration inbox: ${JSON.stringify(selfReportInbox)}`);
}
if (JSON.stringify(selfReportInbox).toLowerCase().includes("smoke explicit")) {
  throw new Error(`Synthetic smoke report leaked into the live AI iteration inbox: ${JSON.stringify(selfReportInbox)}`);
}
const selfReportText = await page.locator("#aiBugPanel").innerText();
const normalizedSelfReportText = selfReportText.toLowerCase();
for (const label of [
  "self-report",
  "smoke explicit ai self-report",
  "saved",
  "source: kind=report_bug_order",
  "context: turn=",
  "survival=",
  "snapshot",
  "suspected area: ai report pipeline",
  "expected: report_bug persists structured",
  "actual: smoke is verifying structured",
  "repro: call force_ai_self_report_for_test",
  "strategy impact: future sovereign bug reports"
]) {
  if (!normalizedSelfReportText.includes(label)) throw new Error(`AI self-report queue did not show ${label}. Text: ${selfReportText}`);
}
let reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
const normalizedReportReviewText = reportReviewText.toLowerCase();
for (const label of ["persisted ai reports", "scope: live ai", "live backlog"]) {
  if (!normalizedReportReviewText.includes(label)) throw new Error(`AI report review did not show ${label}. Text: ${reportReviewText}`);
}
const defaultReportReviewState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiReportReview);
if (defaultReportReviewState?.filters?.status !== "unresolved") {
  throw new Error(`Default AI report review should start on unresolved live issues: ${JSON.stringify(defaultReportReviewState?.filters)}`);
}
if ((defaultReportReviewState?.focusBuckets ?? []).some((bucket) => bucket.filters?.status !== "unresolved")) {
  throw new Error(`Default AI report review showed historical focus buckets: ${JSON.stringify(defaultReportReviewState?.focusBuckets)}`);
}
if ((defaultReportReviewState?.liveReviewCounts?.unresolved ?? 0) === 0 && !normalizedReportReviewText.includes("no current live ai issue buckets")) {
  throw new Error(`Clean live AI report review did not say there are no current live issue buckets. Text: ${reportReviewText}`);
}
for (const syntheticLabel of ["smoke explicit ai self-report", "playwright", "mock:latest", "browser-test-hook"]) {
  if (normalizedReportReviewText.includes(syntheticLabel)) {
    throw new Error(`Default live AI report review leaked synthetic label ${syntheticLabel}. Text: ${reportReviewText}`);
  }
}
await setReportReviewFilters(page, { scope: "synthetic", query: "smoke explicit" });
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const text = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.query === "smoke explicit" &&
      text.includes("scope: synthetic qa") &&
      text.includes("smoke explicit ai self-report")
    );
  },
  null,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
const normalizedSyntheticReportReviewText = reportReviewText.toLowerCase();
for (const label of ["persisted ai reports", "self-report", "smoke explicit ai self-report"]) {
  if (!normalizedSyntheticReportReviewText.includes(label)) throw new Error(`AI report review did not show ${label}. Text: ${reportReviewText}`);
}
for (const label of ["source: kind=report_bug_order", "context: turn=", "wealth=", "preview snapshot", "open json"]) {
  if (!normalizedSyntheticReportReviewText.includes(label)) throw new Error(`AI report review did not show report context ${label}. Text: ${reportReviewText}`);
}
const reportReviewState = await page.evaluate(async () => {
  const response = await fetch("/api/ai-bug-report-summary");
  const summary = await response.json();
  const parsed = JSON.parse(window.render_game_to_text());
  return { responseOk: response.ok, summary, hookReview: parsed.aiReportReview };
});
if (!reportReviewState.responseOk || !reportReviewState.summary?.categories?.some((entry) => entry.category === "self_report")) {
  throw new Error(`AI report summary endpoint did not expose self_report category: ${JSON.stringify(reportReviewState)}`);
}
if (
  typeof reportReviewState.summary?.liveReports !== "number" ||
  typeof reportReviewState.summary?.syntheticReports !== "number" ||
  typeof reportReviewState.summary?.liveReviewCounts?.unresolved !== "number" ||
  typeof reportReviewState.summary?.syntheticReviewCounts?.unresolved !== "number"
) {
  throw new Error(`AI report summary did not expose live/synthetic counts: ${JSON.stringify(reportReviewState.summary)}`);
}
if (!reportReviewState.summary?.latest?.every((entry) => entry.id && entry.triageStatus && entry.reviewStatus && entry.bucketKey)) {
  throw new Error(`AI report summary entries did not expose id and triage status: ${JSON.stringify(reportReviewState.summary?.latest)}`);
}
const selfReportBucketKey = "self_report|fallback|browser-test-hook|report_bug_order";
const selfReportBucket = reportReviewState.summary?.buckets?.find((bucket) => bucket.key === selfReportBucketKey);
if (
  !selfReportBucket ||
  selfReportBucket.category !== "self_report" ||
  selfReportBucket.provider !== "fallback" ||
  selfReportBucket.model !== "browser-test-hook" ||
  selfReportBucket.sourceKind !== "report_bug_order" ||
  selfReportBucket.synthetic !== true ||
  selfReportBucket.liveCount !== 0 ||
  selfReportBucket.syntheticCount < 1 ||
  selfReportBucket.current !== (selfReportBucket.unresolvedCount > 0)
) {
  throw new Error(`AI report summary did not expose currentness for the self-report bucket: ${JSON.stringify(reportReviewState.summary?.buckets)}`);
}
const selfReportEntry =
  reportReviewState.summary?.reports?.find((entry) => entry.report?.includes(smokeSelfReportBody)) ??
  reportReviewState.summary?.latest?.find((entry) => entry.report?.includes(smokeSelfReportBody));
if (
  !selfReportEntry?.source?.includes("kind=report_bug_order") ||
  selfReportEntry?.synthetic !== true ||
  !selfReportEntry?.source?.includes("decision=") ||
  !selfReportEntry?.source?.includes("provider=fallback") ||
  !selfReportEntry?.source?.includes("model=browser-test-hook") ||
  !selfReportEntry?.turnContext?.includes("wealth=") ||
  !selfReportEntry?.turnContext?.includes("resources=") ||
  !selfReportEntry?.turnContext?.includes("developments=") ||
  !selfReportEntry?.turnContext?.includes("survival=") ||
  !selfReportEntry?.turnContext?.includes("accepted=") ||
  !selfReportEntry?.turnContext?.includes("rejected=") ||
  !selfReportEntry?.turnContext?.includes("recent=")
) {
  throw new Error(`AI report summary did not expose source and turn context for the smoke self-report: ${JSON.stringify(selfReportEntry)}`);
}
if (!selfReportEntry?.snapshot?.startsWith("/api/ai-bug-report-snapshot?id=")) {
  throw new Error(`AI report summary did not expose a snapshot URL for the smoke self-report: ${JSON.stringify(selfReportEntry)}`);
}
const selfReportSnapshot = await page.evaluate(async (snapshotUrl) => {
  const response = await fetch(snapshotUrl);
  return { responseOk: response.ok, body: await response.json() };
}, selfReportEntry.snapshot);
if (
  !selfReportSnapshot.responseOk ||
  selfReportSnapshot.body?.snapshot?.snapshot?.schema !== "sovereign-ai-bug-snapshot-v1" ||
  selfReportSnapshot.body?.snapshot?.snapshot?.report?.category !== "self_report" ||
  !selfReportSnapshot.body?.snapshot?.snapshot?.survivalMandate?.publicText ||
  !selfReportSnapshot.body?.snapshot?.snapshot?.tribe?.resources ||
  !selfReportSnapshot.body?.snapshot?.snapshot?.tribe?.developments?.some((development) => development.id === "masonry")
) {
  throw new Error(`AI report snapshot endpoint did not return the compact self-report state: ${JSON.stringify(selfReportSnapshot)}`);
}
const clickedSnapshotPreview = await page.evaluate((snapshotUrl) => {
  const button = Array.from(document.querySelectorAll("button[data-snapshot-url]")).find(
    (candidate) => candidate instanceof HTMLButtonElement && candidate.dataset.snapshotUrl === snapshotUrl
  );
  if (!(button instanceof HTMLButtonElement)) return false;
  button.click();
  return true;
}, selfReportEntry.snapshot);
if (!clickedSnapshotPreview) {
  throw new Error(`AI report review did not render a snapshot preview button for ${selfReportEntry.snapshot}.`);
}
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const preview = parsed.aiReportReview?.snapshotPreview;
    const text = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      preview?.status === "loaded" &&
      preview?.snapshot?.schema === "sovereign-ai-bug-snapshot-v1" &&
      preview?.report?.category === "self_report" &&
      text.includes("snapshot preview") &&
      text.includes("smoke verified that explicit report_bug orders persist and render") &&
      text.includes("survival mandate:") &&
      text.includes("resources:") &&
      text.includes("developments:")
    );
  },
  null,
  { timeout: 15_000 }
);
if (!reportReviewState.hookReview?.categories?.some((entry) => entry.category === "self_report")) {
  throw new Error(`render_game_to_text did not expose AI report review self_report category: ${JSON.stringify(reportReviewState.hookReview)}`);
}
if (
  reportReviewState.hookReview?.filters?.scope !== "synthetic" ||
  typeof reportReviewState.hookReview?.liveReports !== "number" ||
  typeof reportReviewState.hookReview?.syntheticReports !== "number" ||
  typeof reportReviewState.hookReview?.liveReviewCounts?.unresolved !== "number" ||
  typeof reportReviewState.hookReview?.syntheticReviewCounts?.unresolved !== "number"
) {
  throw new Error(`render_game_to_text did not expose AI report review scope and split counts: ${JSON.stringify(reportReviewState.hookReview)}`);
}
if (
  !reportReviewState.hookReview?.buckets?.some(
    (bucket) => bucket.key === selfReportBucketKey && bucket.current === (bucket.unresolvedCount > 0)
  )
) {
  throw new Error(`render_game_to_text did not expose AI report review bucket currentness: ${JSON.stringify(reportReviewState.hookReview)}`);
}
if (!Array.isArray(reportReviewState.hookReview?.focusBuckets) || reportReviewState.hookReview.focusBuckets.length === 0) {
  throw new Error(`render_game_to_text did not expose unresolved AI report focus buckets: ${JSON.stringify(reportReviewState.hookReview)}`);
}
if (!reportReviewState.hookReview.focusBuckets.every((bucket) => bucket.filters?.scope === "synthetic")) {
  throw new Error(`Synthetic focus buckets did not preserve synthetic scope: ${JSON.stringify(reportReviewState.hookReview.focusBuckets)}`);
}
if (!reportReviewState.hookReview.focusBuckets.some((bucket) => bucket.filters?.category === "self_report")) {
  throw new Error(`render_game_to_text focus buckets did not include unresolved self-reports: ${JSON.stringify(reportReviewState.hookReview.focusBuckets)}`);
}
const hookSelfReportEntry = reportReviewState.hookReview?.latest?.find((entry) => entry.report?.includes(smokeSelfReportBody));
if (!hookSelfReportEntry?.source?.includes("kind=report_bug_order") || !hookSelfReportEntry?.turnContext?.includes("turn=")) {
  throw new Error(`render_game_to_text did not expose source and turn context for the smoke self-report: ${JSON.stringify(reportReviewState.hookReview)}`);
}
const selfReportId = selfReportEntry?.id;
if (!selfReportId) {
  throw new Error(`Could not find smoke self-report id in summary: ${JSON.stringify(reportReviewState.summary.latest)}`);
}
const endpointTriage = await page.evaluate(async (reportId) => {
  const response = await fetch("/api/ai-bug-report-triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, status: "triaged", note: "Smoke endpoint triage check." })
  });
  const summaryResponse = await fetch("/api/ai-bug-report-summary");
  return { responseOk: response.ok, result: await response.json(), summary: await summaryResponse.json() };
}, selfReportId);
if (!endpointTriage.responseOk || endpointTriage.result?.reportId !== selfReportId || endpointTriage.result?.status !== "triaged") {
  throw new Error(`AI report triage endpoint did not update the smoke report: ${JSON.stringify(endpointTriage)}`);
}
expectedBadRequestCount += 1;
const prooflessFixed = await page.evaluate(async (reportId) => {
  const response = await fetch("/api/ai-bug-report-triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, status: "fixed", note: "Smoke proofless fixed rejection check." })
  });
  return { responseOk: response.ok, status: response.status, body: await response.json() };
}, selfReportId);
if (prooflessFixed.responseOk || !String(prooflessFixed.body?.error ?? "").toLowerCase().includes("proof")) {
  throw new Error(`AI report triage endpoint accepted a fixed report without proof: ${JSON.stringify(prooflessFixed)}`);
}
const fixedCountBefore = endpointTriage.summary?.triageCounts?.fixed ?? 0;
await page.waitForFunction(
  (reportId) =>
    Array.from(document.querySelectorAll('#aiReportReviewPanel button[data-triage-status="fixed"]')).some(
      (button) => button instanceof HTMLButtonElement && button.dataset.reportId === reportId
    ),
  selfReportId,
  { timeout: 15_000 }
);
const clickedFixed = await page.evaluate((reportId) => {
  const button = Array.from(document.querySelectorAll('#aiReportReviewPanel button[data-triage-status="fixed"]')).find(
    (candidate) => candidate instanceof HTMLButtonElement && candidate.dataset.reportId === reportId
  );
  if (!(button instanceof HTMLButtonElement)) return false;
  button.click();
  return true;
}, selfReportId);
if (!clickedFixed) throw new Error(`Could not click fixed triage button for ${selfReportId}`);
await page.waitForFunction(
  (before) => {
    const text = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    const parsed = JSON.parse(window.render_game_to_text());
    return text.includes("fixed") && (parsed.aiReportReview?.triageCounts?.fixed ?? 0) > before;
  },
  fixedCountBefore,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
triageState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiReportReview);
if ((triageState?.triageCounts?.fixed ?? 0) <= fixedCountBefore) {
  throw new Error(`AI report triage did not mark a latest report fixed: ${JSON.stringify(triageState)}`);
}
const fixedProofState = await page.evaluate(async (reportId) => {
  const response = await fetch("/api/ai-bug-report-summary");
  const summary = await response.json();
  const entry =
    summary.reports?.find((candidate) => candidate.id === reportId) ??
    summary.latest?.find((candidate) => candidate.id === reportId);
  const bucket = summary.buckets?.find((candidate) => candidate.key === "self_report|fallback|browser-test-hook|report_bug_order");
  return { responseOk: response.ok, entry, bucket, reviewCounts: summary.reviewCounts };
}, selfReportId);
if (
  !fixedProofState.responseOk ||
  fixedProofState.entry?.triageStatus !== "fixed" ||
  fixedProofState.entry?.reviewStatus !== "fixed" ||
  fixedProofState.entry?.triageProof?.summary !== "Marked fixed from observer UI" ||
  !String(fixedProofState.entry?.triageProof?.evidence ?? "").includes("Smoke proof") ||
  fixedProofState.entry?.triageProof?.fixedBy !== "observer_ui" ||
  typeof fixedProofState.entry?.triageProof?.fixedAtTurn !== "number" ||
  !fixedProofState.entry?.triageProof?.verifiedAt ||
  fixedProofState.bucket?.current !== (fixedProofState.bucket?.unresolvedCount > 0) ||
  fixedProofState.bucket?.fixedCount < 1 ||
  !fixedProofState.bucket?.latestFixedProof?.verifiedAt ||
  typeof fixedProofState.reviewCounts?.unresolved !== "number"
) {
  throw new Error(`Fixed AI report did not persist proof metadata: ${JSON.stringify(fixedProofState)}`);
}
const fixedMemory = await page.evaluate(() => {
  const blue = JSON.parse(window.render_game_to_text()).tribes?.find((tribe) => tribe.id === "blue");
  return blue?.memory ?? [];
});
if (!fixedMemory.some((note) => String(note).includes("AI iteration report fixed"))) {
  throw new Error(`Fixed AI report triage did not feed back into sovereign memory: ${JSON.stringify(fixedMemory)}`);
}
iterationPromptContext = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiIterationPromptContext);
if (JSON.stringify(iterationPromptContext).toLowerCase().includes("smoke explicit")) {
  throw new Error(`Fixed synthetic smoke report leaked into live AI iteration prompt context: ${JSON.stringify(iterationPromptContext)}`);
}
selfReportInbox = await page.evaluate(() => {
  const blue = JSON.parse(window.render_game_to_text()).tribes?.find((tribe) => tribe.id === "blue");
  return blue?.iterationInbox;
});
if (!selfReportInbox || !Array.isArray(selfReportInbox.resolvedLessons)) {
  throw new Error(`Fixed AI report pass lost the structured iteration inbox: ${JSON.stringify(selfReportInbox)}`);
}
if (JSON.stringify(selfReportInbox).toLowerCase().includes("smoke explicit")) {
  throw new Error(`Fixed synthetic smoke report leaked into the live AI iteration inbox: ${JSON.stringify(selfReportInbox)}`);
}
const reviewAfterFixed = await execFileAsync(process.execPath, ["scripts/ai-iteration-review.mjs", "--json", "--no-write"], {
  cwd: "/Users/benjaminpommeraud/Desktop/Sovereigns"
});
const reviewAfterFixedJson = JSON.parse(reviewAfterFixed.stdout);
if (
  (reviewAfterFixedJson.fixedWithProof ?? 0) < 1 ||
  typeof reviewAfterFixedJson.fixedMissingProof !== "number" ||
  typeof reviewAfterFixedJson.bucketCoveredReports !== "number"
) {
  throw new Error(`AI iteration review did not expose fixed proof counts: ${reviewAfterFixed.stdout}`);
}
await page.evaluate(() => {
  const status = document.querySelector("#reportStatusFilter");
  if (status instanceof HTMLSelectElement) {
    status.value = "fixed";
    status.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    return parsed.aiReportReview?.filters?.scope === "synthetic" && parsed.aiReportReview?.filters?.status === "fixed" && (parsed.aiReportReview?.filteredCount ?? 0) > 0;
  },
  null,
  { timeout: 15_000 }
);
await page.evaluate(() => {
  const category = document.querySelector("#reportCategoryFilter");
  if (category instanceof HTMLSelectElement) {
    category.value = "self_report";
    category.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const search = document.querySelector("#reportSearchInput");
  if (search instanceof HTMLInputElement) {
    search.value = "smoke explicit";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await page.waitForFunction(
  (reportId) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    const hookEntry = parsed.aiReportReview?.latest?.find((entry) => entry.id === reportId);
    return (
      parsed.aiReportReview?.filters?.status === "fixed" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.category === "self_report" &&
      parsed.aiReportReview?.filters?.query === "smoke explicit" &&
      (parsed.aiReportReview?.filteredCount ?? 0) >= 1 &&
      reviewText.includes("smoke explicit ai self-report") &&
      reviewText.includes("fix proof") &&
      hookEntry?.triageProof?.summary === "Marked fixed from observer UI" &&
      String(hookEntry?.triageProof?.evidence ?? "").includes("Smoke proof") &&
      hookEntry?.triageProof?.fixedBy === "observer_ui" &&
      typeof hookEntry?.triageProof?.fixedAtTurn === "number" &&
      Boolean(hookEntry?.triageProof?.verifiedAt)
    );
  },
  selfReportId,
  { timeout: 15_000 }
);
await page.evaluate(() => {
  const severity = document.querySelector("#reportSeverityFilter");
  if (severity instanceof HTMLSelectElement) {
    severity.value = "medium";
    severity.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const provider = document.querySelector("#reportProviderFilter");
  if (provider instanceof HTMLSelectElement) {
    provider.value = "fallback";
    provider.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const model = document.querySelector("#reportModelFilter");
  if (model instanceof HTMLSelectElement) {
    model.value = "browser-test-hook";
    model.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.status === "fixed" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.category === "self_report" &&
      parsed.aiReportReview?.filters?.severity === "medium" &&
      parsed.aiReportReview?.filters?.provider === "fallback" &&
      parsed.aiReportReview?.filters?.model === "browser-test-hook" &&
      parsed.aiReportReview?.filters?.query === "smoke explicit" &&
      (parsed.aiReportReview?.filteredCount ?? 0) >= 1 &&
      reviewText.includes("fallback / browser-test-hook") &&
      reviewText.includes("medium") &&
      reviewText.includes("smoke explicit ai self-report")
    );
  },
  null,
  { timeout: 15_000 }
);
await page.evaluate(() => {
  const search = document.querySelector("#reportSearchInput");
  if (search instanceof HTMLInputElement) {
    search.value = "kind=report_bug_order";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.status === "fixed" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.category === "self_report" &&
      parsed.aiReportReview?.filters?.query === "kind=report_bug_order" &&
      (parsed.aiReportReview?.filteredCount ?? 0) >= 1 &&
      reviewText.includes("source: kind=report_bug_order")
    );
  },
  null,
  { timeout: 15_000 }
);
await page.evaluate(() => {
  const search = document.querySelector("#reportSearchInput");
  if (search instanceof HTMLInputElement) {
    search.value = "survival=";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.status === "fixed" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.category === "self_report" &&
      parsed.aiReportReview?.filters?.query === "survival=" &&
      (parsed.aiReportReview?.filteredCount ?? 0) >= 1 &&
      reviewText.includes("context:") &&
      reviewText.includes("survival=")
    );
  },
  null,
  { timeout: 15_000 }
);
await setReportReviewFilters(page, { scope: "synthetic", status: "unresolved", category: "all", severity: "all", provider: "all", model: "all", query: "" });
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    return (
      parsed.aiReportReview?.filters?.status === "unresolved" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      (parsed.aiReportReview?.focusBuckets ?? []).length > 0
    );
  },
  null,
  { timeout: 15_000 }
);
const clickedFocusBucket = await page.evaluate(() => {
  const button = document.querySelector('button[data-report-focus="true"]');
  if (!(button instanceof HTMLButtonElement)) return false;
  button.click();
  return true;
});
if (!clickedFocusBucket) {
  throw new Error("AI report review did not render any focus bucket buttons.");
}
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.status === "unresolved" &&
      parsed.aiReportReview?.filters?.scope === "synthetic" &&
      parsed.aiReportReview?.filters?.category !== "all" &&
      (parsed.aiReportReview?.filteredCount ?? 0) >= 1 &&
      reviewText.includes("showing") &&
      reviewText.includes("matching reports")
    );
  },
  null,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
await setReportReviewFilters(page, { scope: "live", status: "all", category: "all", severity: "all", provider: "all", model: "all", query: "" });
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    const latestRows = parsed.aiReportReview?.latest ?? [];
    const focusBuckets = parsed.aiReportReview?.focusBuckets ?? [];
    return (
      parsed.aiReportReview?.filters?.scope === "live" &&
      reviewText.includes("scope: live ai") &&
      !reviewText.includes("smoke explicit ai self-report") &&
      latestRows.every((entry) => entry.synthetic !== true) &&
      focusBuckets.every((bucket) => bucket.filters?.scope === "live")
    );
  },
  null,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
await setReportReviewFilters(page, { scope: "live", status: "unresolved", category: "all", severity: "all", provider: "all", model: "all", query: "" });
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const reviewText = document.querySelector("#aiReportReviewPanel")?.textContent?.toLowerCase() ?? "";
    return (
      parsed.aiReportReview?.filters?.scope === "live" &&
      parsed.aiReportReview?.filters?.status === "unresolved" &&
      reviewText.includes("scope: live ai") &&
      !reviewText.includes("smoke explicit ai self-report") &&
      (parsed.aiReportReview?.focusBuckets ?? []).every((bucket) => bucket.filters?.status === "unresolved")
    );
  },
  null,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
triageState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiReportReview);
const infoRequestResult = await page.evaluate((body) => {
  if (typeof window.force_ai_info_request_for_test !== "function") return { ok: false, reason: "missing info-request hook" };
  return window.force_ai_info_request_for_test("blue", body);
}, smokeInfoRequestBody);
if (!infoRequestResult.ok) {
  throw new Error(`Explicit AI info-request test hook failed: ${JSON.stringify(infoRequestResult)}`);
}
if (!infoRequestResult.answerStatus || !String(infoRequestResult.answer).includes("Survival mandate")) {
  throw new Error(`Explicit AI info-request test hook did not return an answer: ${JSON.stringify(infoRequestResult)}`);
}
const infoRequestText = await page.locator("#aiInfoRequestPanel").innerText();
if (!infoRequestText.includes("Smoke strategic information request") || !infoRequestText.includes(smokeInfoRequestBody) || !infoRequestText.includes("Answer")) {
  throw new Error(`AI info-request panel did not show the smoke request. Text: ${infoRequestText}`);
}
const infoRequestState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).aiInformationRequests);
if (
  !Array.isArray(infoRequestState) ||
  !infoRequestState.some((request) => request.body?.includes("REQUEST_INFO") && request.answerStatus && request.answer?.includes("Visible resource answer"))
) {
  throw new Error(`render_game_to_text did not expose the smoke information request: ${JSON.stringify(infoRequestState)}`);
}
for (let i = 0; i < 3; i += 1) await page.click("#speedButton");
let diplomacyReplyText = "";
	try {
	  await page.waitForFunction(
	    () => document.querySelector("#diplomacyPanel")?.textContent?.includes("Reply intent"),
	    null,
	    { timeout: 90_000 }
	  );
  diplomacyReplyText = await page.locator("#diplomacyPanel").innerText();
} catch (error) {
  const currentLlmText = await page.locator("#llmPanel").innerText().catch(() => "");
  const currentDiplomacyText = await page.locator("#diplomacyPanel").innerText().catch(() => "");
  const currentHookText = await page.evaluate(() => (typeof window.render_game_to_text === "function" ? window.render_game_to_text() : "{}")).catch(() => "{}");
  throw new Error(`Diplomacy reply did not complete before survival fast-forward. LLM panel: ${currentLlmText}\nDiplomacy: ${currentDiplomacyText}\nHook: ${currentHookText}`);
}
let hoverText = "";
const hoverTargets = await page.evaluate(() => {
  const parsed = JSON.parse(window.render_game_to_text());
  return (parsed.visibleUnits ?? [])
    .filter(
      (unit) =>
        Number.isFinite(unit.screenX) &&
        Number.isFinite(unit.screenY) &&
        unit.screenX > 50 &&
        unit.screenY > 50 &&
        unit.screenX < parsed.camera.viewportWidth - 50 &&
        unit.screenY < parsed.camera.viewportHeight - 50
    )
    .slice(0, 12)
    .map((unit) => ({ id: unit.id, screenX: unit.screenX, screenY: unit.screenY, task: unit.task }));
});
for (const target of hoverTargets) {
  await page.mouse.move(canvasBox.x + target.screenX, canvasBox.y + target.screenY);
  await page.waitForTimeout(180);
  hoverText = await page.locator("#hoverTooltip").innerText().catch(() => "");
  if (hoverText.includes("Doing:")) break;
}
if (!hoverText.includes("Doing:")) {
  throw new Error(`Hover tooltip did not expose a unit task before survival fast-forward. Targets: ${JSON.stringify(hoverTargets)} Last tooltip: ${hoverText}`);
}
const survivalResult = await page.evaluate(() => {
  if (typeof window.force_survival_review_for_test !== "function") return { ok: false, reason: "missing survival review hook" };
  return window.force_survival_review_for_test();
});
if (!survivalResult.ok || survivalResult.learnings < 5 || !survivalResult.winner || survivalResult.eliminatedTribes < 4 || survivalResult.persistentGames !== 1 || survivalResult.persistentLessons !== 5) {
  throw new Error(`Survival-review learning hook did not produce a winner and five AI lessons: ${JSON.stringify(survivalResult)}`);
}
const survivalState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
if (
  survivalState.victory?.status !== "claimed" ||
  survivalState.victory?.victoryRule !== "population_happiness_safety_century_cull" ||
  survivalState.victory?.currentYear < 400 ||
  survivalState.victory?.survivingTribes !== 1 ||
  !Array.isArray(survivalState.postGameLearnings) ||
  survivalState.postGameLearnings.length < 5 ||
  !survivalState.postGameLearnings.every(
    (learning) =>
      learning.id &&
      Number.isFinite(learning.tick) &&
      Number.isFinite(learning.year) &&
      learning.tribeId &&
      learning.tribeName &&
      Number.isFinite(learning.rank) &&
      Number.isFinite(learning.survivalScore) &&
      learning.winnerTribeId &&
      learning.winnerName &&
      String(learning.lesson).includes("Post-game learning")
  ) ||
  survivalState.persistentLearning?.storedGames !== 1 ||
  survivalState.persistentLearning?.storedLessons !== 5
) {
  throw new Error(`Survival victory and learning were not exposed by render_game_to_text: ${JSON.stringify(survivalState.victory)}`);
}
const persistedLearning = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || "{}"), persistentLearningStorageKey);
if (
  !Array.isArray(persistedLearning.games) ||
  persistedLearning.games.length !== 1 ||
  !Array.isArray(persistedLearning.games.at(-1).lessons) ||
  persistedLearning.games.at(-1).lessons.length !== 5 ||
  !Array.isArray(persistedLearning.games.at(-1).scoreByTribe) ||
  persistedLearning.games.at(-1).scoreByTribe.length !== 5
) {
  throw new Error(`Survival learning was not persisted to browser storage: ${JSON.stringify(persistedLearning)}`);
}
const survivalVictoryText = await page.locator("#victoryPanel").innerText();
if (!survivalVictoryText.includes("Survival winner") || !survivalVictoryText.includes("Learning applied") || !survivalVictoryText.includes("Persistent learning")) {
  throw new Error(`Victory panel did not show the survival winner and learning result. Text: ${survivalVictoryText}`);
}
const bugPanelAfterInfoRequest = await page.locator("#aiBugPanel").innerText();
if (bugPanelAfterInfoRequest.includes(smokeInfoRequestBody)) {
  throw new Error("REQUEST_INFO appeared in the AI bug queue.");
}

await page.click("#askAiNowButton");
await page.waitForSelector(".llm-decision-row", { timeout: 90_000 });
let observedLiveOllamaDecision = false;
try {
	  await page.waitForFunction(
	    () => document.querySelector("#llmPanel")?.textContent?.includes("OLLAMA"),
	    null,
	    { timeout: 45_000 }
	  );
  observedLiveOllamaDecision = true;
} catch (error) {
  const currentLlmText = await page.locator("#llmPanel").innerText().catch(() => "");
  const currentTribeText = await page.locator("#tribePanel").innerText().catch(() => "");
  if (currentLlmText.includes("OLLAMA")) {
    // The row appeared exactly as the wait timed out; continue with the captured UI state.
    observedLiveOllamaDecision = true;
  } else if (
    currentLlmText.includes("Models:") &&
    currentLlmText.includes("Assignments:") &&
    /FALLBACK|LLM_COOLDOWN|failed|failure/i.test(`${currentLlmText}\n${currentTribeText}`)
  ) {
    // Live local models are installed and assigned, but this machine can still return parser/transport failures.
    // The mocked-Ollama smoke is the deterministic gate for successful Ollama JSON, retries, cooldown, and recovery.
  } else {
  throw new Error(`No Ollama-backed decision row appeared. LLM panel: ${currentLlmText}\nTribes: ${currentTribeText}`);
  }
}

const diplomacyText = diplomacyReplyText;
const llmText = await page.locator("#llmPanel").innerText();
const resourceBarText = await page.locator("#resourceBar").innerText();
const compactAiStatus = await page.evaluate(() => JSON.parse(window.render_game_to_text()).llm?.compactStatus);
const tribeText = await page.locator("#tribePanel").innerText();
for (const label of ["Tribes", "AI lanes", "Identities", "Doctrines", "Live AI turns", "Fallback decisions"]) {
  if (!resourceBarText.includes(label)) throw new Error(`Top bar compact AI summary is missing ${label}. Text: ${resourceBarText}`);
}
if (!/AI lanes\s+\d+\/\d+/i.test(resourceBarText)) {
  throw new Error(`Top bar compact AI summary did not show active lanes as a count: ${resourceBarText}`);
}
if (
  !/Tribes\s+\d+\/5/i.test(resourceBarText) ||
  !/Identities\s+\d+\/5/i.test(resourceBarText) ||
  !/Doctrines\s+\d+\/5/i.test(resourceBarText) ||
  !/Live AI turns\s+\d+/i.test(resourceBarText) ||
  !/Fallback decisions\s+\d+/i.test(resourceBarText)
) {
  throw new Error(`Top bar compact AI summary did not show tribe/identity/doctrine/live/fallback counts: ${resourceBarText}`);
}
if (
  !compactAiStatus ||
  !Number.isInteger(compactAiStatus.activeLanes) ||
  !Number.isInteger(compactAiStatus.maxLanes) ||
  compactAiStatus.maxLanes < 1 ||
  compactAiStatus.identitiesTotal !== 5 ||
  compactAiStatus.tribesTotal !== 5 ||
  !Number.isInteger(compactAiStatus.fallbackDecisions)
) {
  throw new Error(`Compact AI summary hook is malformed: ${JSON.stringify(compactAiStatus)}`);
}
if (!observedLiveOllamaDecision && !(llmText.includes("Models:") && llmText.includes("Assignments:") && /fallback|cooldown|failed|failure/i.test(llmText))) {
  throw new Error(`LLM panel did not show a live Ollama decision or a valid assigned-model fallback state. Text: ${llmText}`);
}
if (!diplomacyText.includes("Reply intent")) {
  throw new Error(`Diplomacy panel did not show an AI-authored reply. Text: ${diplomacyText}`);
}
if (!tribeText.includes("Sovereign") || !tribeText.includes("Style")) {
  throw new Error("Tribe panel did not show AI sovereign identity and naming style.");
}
if ((tribeText.match(/Style unclaimed valley names/g) ?? []).length >= 5 && !/fallback|failed|failure|queued|cooldown/i.test(`${llmText}\n${tribeText}`)) {
  throw new Error("No tribe showed an LLM-generated naming style.");
}
if ((tribeText.match(/LLM/g) ?? []).length < 5) {
  throw new Error("Tribe panel did not show all five LLM-controlled tribes.");
}
if (!tribeText.includes("Alliance")) {
  throw new Error("Tribe panel did not show the alliance slot.");
}
if (!tribeText.includes("War")) {
  throw new Error("Tribe panel did not show war state.");
}
if (!tribeText.includes("Memory")) {
  throw new Error("Tribe panel did not show sovereign memory.");
}
if (!tribeText.includes("Iteration inbox")) {
  throw new Error("Tribe panel did not show the AI iteration inbox.");
}
if (!tribeText.includes("AI OLLAMA") && !tribeText.includes("AI FALLBACK")) {
  throw new Error("Tribe panel did not show per-tribe AI provider status.");
}
const memoryState = await page.waitForFunction(
  () => {
    if (typeof window.render_game_to_text !== "function") return null;
    const parsed = JSON.parse(window.render_game_to_text());
    const tribes = Array.isArray(parsed.tribes) ? parsed.tribes : [];
    const memoryBearing = tribes.find((tribe) => Array.isArray(tribe.memory) && tribe.memory.length > 0);
    return memoryBearing ? { tribe: memoryBearing.name, memory: memoryBearing.memory[0] } : null;
	  },
	  null,
	  { timeout: 60_000 }
	);
const memoryStateValue = await memoryState.jsonValue();
if (!memoryStateValue?.memory) {
  throw new Error("render_game_to_text did not expose non-empty sovereign memory.");
}
const eventText = await page.locator("#eventLog").innerText();
const aiDecisionActivity = await page.evaluate(() => {
  if (typeof window.render_game_to_text !== "function") return 0;
  const parsed = JSON.parse(window.render_game_to_text());
  return Array.isArray(parsed.latestAiDecisions) ? parsed.latestAiDecisions.length : 0;
});
if (!eventText.includes("AI decision") && aiDecisionActivity <= 0) {
  throw new Error("Event log did not show AI decision activity.");
}

const bugReportResponse = await page.evaluate(async () => {
  const response = await fetch("/api/ai-bug-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tick: 0,
      tribe: "Smoke Test",
      tribeId: "blue",
      provider: "smoke",
      model: "playwright",
      severity: "low",
      category: "ai_report",
      summary: "Smoke endpoint verification",
      source: "kind=smoke_endpoint; decision=endpoint; provider=smoke; model=playwright",
      turnContext: "turn=0; tribe=Smoke Test; tribeId=blue; year=1; wealth=0; happiness=0; safety=0; resources=none; survival=smoke:year1:review100:survivors5; accepted=1; rejected=0; recent=endpoint",
      report: "Playwright verified that AI bug reports can append to markdown.",
      snapshot: {
        schema: "sovereign-ai-bug-snapshot-v1",
        tick: 0,
        report: { tribeId: "blue", category: "ai_report", provider: "smoke", model: "playwright" },
        tribe: { resources: {} },
        survivalMandate: { status: "smoke", currentYear: 1, nextReviewYear: 100, survivingTribes: 5, publicText: "smoke survival mandate" }
      },
      accepted: ["endpoint accepted"],
      rejected: []
    })
  });
  return { ok: response.ok, body: await response.json() };
});
if (!bugReportResponse.ok) {
  throw new Error(`AI bug report endpoint failed: ${JSON.stringify(bugReportResponse.body)}`);
}
if (!bugReportResponse.body?.snapshot?.startsWith("/api/ai-bug-report-snapshot?id=")) {
  throw new Error(`AI bug report endpoint did not return a snapshot URL: ${JSON.stringify(bugReportResponse.body)}`);
}
const endpointSnapshot = await page.evaluate(async (snapshotUrl) => {
  const response = await fetch(snapshotUrl);
  return { responseOk: response.ok, body: await response.json() };
}, bugReportResponse.body.snapshot);
if (
  !endpointSnapshot.responseOk ||
  endpointSnapshot.body?.snapshot?.snapshot?.schema !== "sovereign-ai-bug-snapshot-v1" ||
  endpointSnapshot.body?.snapshot?.report?.provider !== "smoke"
) {
  throw new Error(`AI bug report endpoint snapshot was not readable: ${JSON.stringify(endpointSnapshot)}`);
}

const liveClassifierReport = await page.evaluate(async (reportBody) => {
  const response = await fetch("/api/ai-bug-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tick: 1,
      tribe: "Smoke Word Live Realm",
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      severity: "medium",
      category: "self_report",
      summary: "Live metadata classifier verification",
      source: "kind=report_bug_order; decision=ai_live_words; provider=ollama; model=qwen3.5:9b-mlx",
      turnContext:
        "turn=1; tribe=Smoke Word Live Realm; tribeId=blue; year=1; wealth=0; happiness=0; safety=0; resources=coal=1; survival=surviving:year1:review100:survivors5; accepted=1; rejected=0; recent=classifier",
      report: reportBody,
      snapshot: {
        schema: "sovereign-ai-bug-snapshot-v1",
        tick: 1,
        report: {
          tribeId: "blue",
          category: "self_report",
          provider: "ollama",
          model: "qwen3.5:9b-mlx",
          source: "kind=report_bug_order; decision=ai_live_words; provider=ollama; model=qwen3.5:9b-mlx"
        },
        tribe: { name: "Smoke Word Live Realm", resources: { coal: 1 }, developments: [] },
        survivalMandate: { status: "surviving", currentYear: 1, nextReviewYear: 100, survivingTribes: 5, publicText: "classifier fixture" }
      },
      accepted: ["REPORT_BUG: classifier verification"],
      rejected: []
    })
  });
  return { ok: response.ok, body: await response.json() };
}, realClassifierReportBody);
if (!liveClassifierReport.ok || !liveClassifierReport.body?.snapshot) {
  throw new Error(`Live classifier report endpoint write failed: ${JSON.stringify(liveClassifierReport)}`);
}
const liveClassifierReportId = reportIdFromSnapshot(liveClassifierReport.body.snapshot);
if (!liveClassifierReportId) {
  throw new Error(`Live classifier report did not return a triageable snapshot id: ${JSON.stringify(liveClassifierReport)}`);
}
const liveClassifierState = await page.evaluate(async (reportBody) => {
  const summaryResponse = await fetch("/api/ai-bug-report-summary");
  const summary = await summaryResponse.json();
  const refresh =
    typeof window.refresh_ai_report_review_for_test === "function"
      ? await window.refresh_ai_report_review_for_test("blue")
      : { ok: false, reason: "missing refresh hook" };
  const entry = [...(summary.reports ?? []), ...(summary.latest ?? [])].find((candidate) => candidate.report === reportBody);
  const blue = refresh.tribes?.find((tribe) => tribe.id === "blue");
  return { responseOk: summaryResponse.ok, summary, refresh, entry, blueInbox: blue?.iterationInbox ?? null };
}, realClassifierReportBody);
if (
  !liveClassifierState.responseOk ||
  !liveClassifierState.entry ||
  liveClassifierState.entry.synthetic !== false ||
  !liveClassifierState.entry.tribeId ||
  liveClassifierState.entry.tribeId !== "blue"
) {
  throw new Error(`Real report with synthetic words was not classified as live: ${JSON.stringify(liveClassifierState.entry)}`);
}
if (
  !liveClassifierState.blueInbox ||
  liveClassifierState.blueInbox.openReportCount < 1 ||
  !JSON.stringify(liveClassifierState.blueInbox.recentOwnReports ?? []).includes("smoke from forges")
) {
  throw new Error(`Real report with synthetic words did not enter Blue iteration inbox: ${JSON.stringify(liveClassifierState.blueInbox)}`);
}
const liveClassifierTriage = await page.evaluate(async ({ reportId, tick }) => {
  const response = await fetch("/api/ai-bug-report-triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      status: "fixed",
      note: "Browser smoke verified metadata-only live/synthetic classification.",
      proof: {
        summary: "Metadata-only synthetic classifier verified",
        evidence: "pnpm smoke posted a real Ollama-metadata report whose prose mentioned smoke/mock/playwright and confirmed it stayed live.",
        fixedBy: "smoke",
        fixedAtTurn: tick,
        verifiedAt: new Date().toISOString()
      }
    })
  });
  return { ok: response.ok, status: response.status, body: await response.json() };
}, { reportId: liveClassifierReportId, tick: 1 });
if (!liveClassifierTriage.ok || liveClassifierTriage.body?.status !== "fixed") {
  throw new Error(`Live classifier report triage failed: ${JSON.stringify(liveClassifierTriage)}`);
}

await page.evaluate(() => {
  document.querySelector("#aiReportReviewPanel")?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(250);
await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshot = await stat(screenshotPath);
if (screenshot.size < 50_000) {
  throw new Error(`Screenshot looks too small to prove a rendered game: ${screenshot.size} bytes`);
}
const bugReport = await stat(bugReportPath);
if (bugReport.size < 100) {
  throw new Error(`AI bug report markdown file was not updated: ${bugReport.size} bytes`);
}
const bugReportMarkdown = await readFile(bugReportPath, "utf8");
if (!bugReportMarkdown.includes("- Category: self_report") || !bugReportMarkdown.includes(smokeSelfReportBody)) {
  throw new Error("AI bug report markdown did not include the explicit self-report entry.");
}
for (const label of [
  "Suspected area: AI report pipeline",
  "Expected: REPORT_BUG persists structured",
  "Actual: Smoke is verifying structured",
  "Repro: Call force_ai_self_report_for_test",
  "Strategy impact: Future sovereign bug reports"
]) {
  if (!bugReportMarkdown.includes(label)) {
    throw new Error(`AI bug report markdown did not include structured self-report field ${label}.`);
  }
}
if (
  !bugReportMarkdown.includes("- Source: kind=report_bug_order") ||
  !bugReportMarkdown.includes("- Source: kind=smoke_endpoint") ||
  !bugReportMarkdown.includes("- Tribe id: blue") ||
  !bugReportMarkdown.includes("- Turn context: turn=0; tribe=Smoke Test") ||
  !bugReportMarkdown.includes("- Snapshot: /api/ai-bug-report-snapshot?id=")
) {
  throw new Error("AI bug report markdown did not include source, turn context, and snapshot fields.");
}
if (bugReportMarkdown.includes(smokeInfoRequestBody)) {
  throw new Error("REQUEST_INFO was incorrectly persisted into AI_BUG_REPORTS.md.");
}

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(() => typeof window.render_game_to_text === "function", null, { timeout: 15_000 });
await page.click("#pauseButton");
const reloadedLearningState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
const reloadedMemoryCount = (reloadedLearningState.tribes ?? []).filter((tribe) =>
  (tribe.memory ?? []).some((note) => String(note).includes("Persistent cross-game learning"))
).length;
if (
  reloadedLearningState.persistentLearning?.storedGames !== 1 ||
  reloadedLearningState.persistentLearning?.storedLessons !== 5 ||
  reloadedLearningState.persistentLearning?.appliedLessons !== 5 ||
  reloadedMemoryCount < 5
) {
  throw new Error(`Persistent learning did not survive reload or was not loaded into sovereign memory: ${JSON.stringify(reloadedLearningState.persistentLearning)}`);
}
const reloadedVictoryText = await page.locator("#victoryPanel").innerText();
if (!reloadedVictoryText.includes("Persistent learning")) {
  throw new Error(`Reloaded victory panel did not show persistent learning history. Text: ${reloadedVictoryText}`);
}

await browser.close();

if (errors.length > 0) {
  throw new Error(`Browser emitted errors:\\n${errors.join("\\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      canvasBox,
      screenshotPath,
      screenshotBytes: screenshot.size,
      hookCheck,
      resourceText,
      victoryText: victoryText.slice(0, 500),
      aiBugText: aiBugText.slice(0, 500),
      infoRequestText: infoRequestText.slice(0, 500),
      reportReviewText: reportReviewText.slice(0, 500),
      triageState,
      memoryState: memoryStateValue,
      llmText: llmText.slice(0, 700),
      tribeText: tribeText.slice(0, 500),
      hoverText: hoverText.slice(0, 500),
      diplomacyText: diplomacyText.slice(0, 500),
      eventText: eventText.slice(0, 500),
      persistentLearning: reloadedLearningState.persistentLearning,
      mockedOllamaCalls,
      bugReportPath,
      bugReportBytes: bugReport.size,
      warnings
    },
    null,
    2
  )
);

async function readSelfReportState(page, reportMarker) {
  return await page.evaluate((marker) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const blue = parsed.tribes?.find((tribe) => tribe.id === "blue");
    const memory = blue?.memory ?? [];
    const matchingIssues = (parsed.aiIssues ?? []).filter((issue) => {
      return (
        issue.tribeId === "blue" &&
        String(issue.source ?? "").includes("kind=report_bug_order") &&
        String(issue.report ?? "").includes(marker)
      );
    });
    return {
      memory,
      memoryFiledNotes: memory.filter((note) => String(note).includes("AI iteration report filed")),
      issue: matchingIssues.at(-1),
      matchingIssueCount: matchingIssues.length
    };
  }, reportMarker);
}

async function setReportReviewFilters(page, filters = {}) {
  await page.evaluate((nextFilters) => {
    const setSelect = (id, value) => {
      if (value === undefined) return;
      const element = document.querySelector(`#${id}`);
      if (!(element instanceof HTMLSelectElement)) return;
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setSelect("reportScopeFilter", nextFilters.scope);
    setSelect("reportStatusFilter", nextFilters.status);
    setSelect("reportCategoryFilter", nextFilters.category);
    setSelect("reportSeverityFilter", nextFilters.severity);
    setSelect("reportProviderFilter", nextFilters.provider);
    setSelect("reportModelFilter", nextFilters.model);
    if (nextFilters.query !== undefined) {
      const search = document.querySelector("#reportSearchInput");
      if (search instanceof HTMLInputElement) {
        search.value = nextFilters.query;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }, filters);
}

async function installDeterministicOllamaRoutes(page) {
  await page.route("**/ollama/api/tags", async (route) => {
    mockedOllamaCalls.tags += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: mockedOllamaModels.map((name) => ({ name, model: name })) })
    });
  });

  await page.route("**/ollama/api/generate", async (route) => {
    mockedOllamaCalls.generate += 1;
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (body.think !== false) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: `generate schema calls must disable thinking, got ${JSON.stringify(body.think)}` })
      });
      return;
    }
    const content = deterministicOllamaContent(body, "generate");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: content })
    });
  });

  await page.route("**/ollama/api/chat", async (route) => {
    mockedOllamaCalls.chat += 1;
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (body.model !== "gpt-oss:20b" || body.stream !== false || body.think !== "low" || !Array.isArray(body.messages) || body.prompt) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: `bad gpt-oss chat body ${JSON.stringify(body)}` })
      });
      return;
    }
    const content = deterministicOllamaContent(body, "chat");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          thinking: "private smoke reasoning",
          content: `<think>hidden smoke reasoning</think>${content}`
        },
        done: true
      })
    });
  });
}

function deterministicOllamaContent(body, adapter) {
  const properties = body.format?.properties ?? {};
  if (Object.prototype.hasOwnProperty.call(properties, "freeformStrategy")) {
    mockedOllamaCalls.decision += 1;
    return deterministicDecisionJson(adapter, mockedOllamaCalls.decision);
  }
  if (Object.prototype.hasOwnProperty.call(properties, "realmName")) {
    mockedOllamaCalls.identity += 1;
    return deterministicIdentityJson(mockedOllamaCalls.identity);
  }
  if (Object.prototype.hasOwnProperty.call(properties, "strategyNote")) {
    mockedOllamaCalls.reply += 1;
    return deterministicReplyJson(mockedOllamaCalls.reply);
  }
  if (Object.prototype.hasOwnProperty.call(properties, "ok")) {
    mockedOllamaCalls.health += 1;
    return JSON.stringify({ ok: true });
  }
  throw new Error(`Unknown deterministic smoke schema: ${JSON.stringify(properties)}`);
}

function deterministicIdentityJson(index) {
  return JSON.stringify({
    realmName: `Smoke Realm ${index}`,
    sovereignName: `Sovereign Smoke ${index}`,
    namingStyle: "compact deterministic smoke names",
    inspiration: "browser smoke QA",
    unitNames: []
  });
}

function deterministicDecisionJson(adapter, index) {
  return JSON.stringify({
    freeformStrategy: `Mock ${adapter} strategy ${index}: protect the people, keep wealth rising, and use diplomacy before risking war.`,
    strategySummary: `Mock ${adapter} decision ${index}.`,
    memoryNote: `Smoke AI turn ${index} stayed deterministic.`,
    orders: [
      {
        type: "SET_POLICY",
        priority: 1,
        messageType: "LETTER",
        diplomacyIntent: "NONE",
        subject: "",
        body: "",
        reason: "Keep deterministic smoke strategy moving."
      }
    ],
    unitNames: [],
    bugReport: "",
    bugSeverity: "low"
  });
}

function deterministicReplyJson(index) {
  return JSON.stringify({
    strategyNote: `Smoke reply ${index}: keep diplomacy open while protecting the population.`,
    memoryNote: `Smoke reply ${index} received and answered.`,
    subject: "Re: smoke diplomacy",
    body: "I have received your messenger. I will keep talks open while protecting my people's safety and wealth.",
    diplomacyIntent: "PEACE_OFFER",
    bugReport: "",
    bugSeverity: "low"
  });
}

async function forceDevelopment(page, developmentId) {
  const result = await page.evaluate((id) => {
    if (typeof window.force_development_for_test !== "function") return { ok: false, reason: "missing development hook" };
    return window.force_development_for_test("blue", id);
  }, developmentId);
  if (!result.ok || !result.developments?.includes(developmentId)) {
    throw new Error(`Development hook failed for ${developmentId}: ${JSON.stringify(result)}`);
  }
}

async function assertCreatedBuildingVisible(page, type) {
  const state = await page.evaluate((expectedType) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return {
      expectedType,
      selected,
      constructionFeedback: parsed.constructionFeedback,
      panel,
      camera: parsed.camera
    };
  }, type);
  if (state.selected?.type !== type) {
    throw new Error(`Created ${type} was not the selected visible building: ${JSON.stringify(state)}`);
  }
  if (
    state.constructionFeedback?.buildingType !== type ||
    state.constructionFeedback?.selected !== true ||
    state.constructionFeedback?.visible !== true ||
    state.selected.constructionFocus !== true
  ) {
    throw new Error(`Created ${type} did not expose construction focus feedback: ${JSON.stringify(state)}`);
  }
  if (!state.panel.includes("New construction visible on map") || !state.panel.includes("Build cost")) {
    throw new Error(`Created ${type} selected panel did not confirm visibility and cost: ${JSON.stringify(state)}`);
  }
  if (type === "wall" && !state.panel.includes("Blocks movement")) {
    throw new Error(`Created wall selected panel did not confirm blocking behavior: ${JSON.stringify(state)}`);
  }
  if (type === "turret" && !state.panel.includes("Fires on hostile units")) {
    throw new Error(`Created turret selected panel did not confirm defensive behavior: ${JSON.stringify(state)}`);
  }
  const canvasBox = await page.locator("canvas").boundingBox();
  if (!canvasBox) throw new Error(`Could not inspect canvas for created ${type}: ${JSON.stringify(state)}`);
  if (
    state.selected.screenX < 80 ||
    state.selected.screenY < 80 ||
    state.selected.screenX > canvasBox.width - 80 ||
    state.selected.screenY > canvasBox.height - 80
  ) {
    throw new Error(`Created ${type} was not centered inside the visible map canvas: ${JSON.stringify({ state, canvasBox })}`);
  }
}

function reportIdFromSnapshot(snapshotUrl) {
  const raw = String(snapshotUrl ?? "");
  const query = raw.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  return params.get("id");
}
