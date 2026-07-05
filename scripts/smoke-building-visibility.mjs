import { chromium } from "playwright";
import { stat } from "node:fs/promises";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_BUILDING_SMOKE_SCREENSHOT ??
  "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console error: ${message.text()}`);
});
page.on("pageerror", (error) => {
  errors.push(`pageerror: ${error.message}`);
});
page.on("dialog", async (dialog) => {
  await dialog.dismiss();
});

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(() => typeof window.render_game_to_text === "function", null, { timeout: 15_000 });
await page.click("#pauseButton");

const openedDebug = await page.evaluate(() => {
  const details = document.querySelector("details.debug-controls");
  if (!(details instanceof HTMLDetailsElement)) return false;
  details.open = true;
  return true;
});
if (!openedDebug) throw new Error("Missing Blue debug controls.");

await page.click("#buildFarmButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "farm");
await assertCreatedBuildingPainted(page, "farm");
await page.click("#buildWatchtowerButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "watchtower");
await assertCreatedBuildingPainted(page, "watchtower");

await forceDevelopment(page, "masonry");
await assertBuildingRequirementState(page, "wall", []);
await forceResourceBoost(page, { wood: 80, stone: 80, clay: 50, limestone: 30 });
await page.click("#buildWallButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "wall");
await assertCreatedBuildingPainted(page, "wall");

await forceDevelopment(page, "ironworking");
await assertBuildingRequirementState(page, "gate", []);
await forceResourceBoost(page, { wood: 90, stone: 100, clay: 50, limestone: 60, iron: 80 });
await page.click("#buildGateButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "gate");
await assertCreatedBuildingPainted(page, "gate");
await assertSelectedGatePolicy(page, "owner_allies", ["blue"]);
await forceGateState(page, "open", "owner_only");
await assertSelectedGatePolicy(page, "owner_only", ["blue"]);
await forceGateState(page, "locked", "owner_only");
await assertSelectedGateState(page, "locked", "owner_only");

await forceDevelopment(page, "ballistics");
await assertBuildingRequirementState(page, "turret", []);
await forceResourceBoost(page, { wood: 220, stone: 220, limestone: 120, iron: 140, coal: 80, gold: 200 });

await page.click("#buildTurretButton");
await page.waitForTimeout(250);
await assertCreatedBuildingVisible(page, "turret");
await assertCreatedBuildingPainted(page, "turret");

const buildingState = await page.evaluate(() => {
  const parsed = JSON.parse(window.render_game_to_text());
  const focused = parsed.visibleBuildings
    .filter((building) => building.constructionFocus || building.selected)
    .map((building) => ({
      id: building.id,
      type: building.type,
      x: building.x,
      y: building.y,
      screenX: building.screenX,
      screenY: building.screenY,
      blocksMovement: building.blocksMovement,
      gateState: building.gateState,
      gateAccessPolicy: building.gateAccessPolicy,
      gatePassableBy: building.gatePassableBy,
      hp: building.hp,
      maxHp: building.maxHp,
      armor: building.armor,
      attack: building.attack,
      range: building.range,
      selected: building.selected,
      constructionFocus: building.constructionFocus
    }));
  const owned = parsed.visibleBuildings.filter((building) => building.tribeId === "blue");
  return {
    selected: parsed.selected,
    constructionFeedback: parsed.constructionFeedback,
    recentConstructionFeedback: parsed.recentConstructionFeedback,
    focused,
    ownedBuildableCounts: {
      farm: owned.filter((building) => building.type === "farm").length,
      watchtower: owned.filter((building) => building.type === "watchtower").length,
      wall: owned.filter((building) => building.type === "wall").length,
      gate: owned.filter((building) => building.type === "gate").length,
      turret: owned.filter((building) => building.type === "turret").length
    }
  };
});
for (const type of ["farm", "watchtower", "wall", "gate", "turret"]) {
  if ((buildingState.ownedBuildableCounts[type] ?? 0) < 1) {
    throw new Error(`Created ${type} was not still visible in final building state: ${JSON.stringify(buildingState)}`);
  }
}
if (!buildingState.focused.some((building) => building.type === "turret" && building.selected && building.constructionFocus)) {
  throw new Error(`Latest turret construction was not selected and visually focused in final building state: ${JSON.stringify(buildingState)}`);
}
for (const type of ["farm", "watchtower", "wall", "gate", "turret"]) {
  if (!buildingState.recentConstructionFeedback?.some((flash) => flash.buildingType === type && flash.visible)) {
    throw new Error(`Created ${type} did not keep a recent visible construction marker: ${JSON.stringify(buildingState)}`);
  }
}
const siegeState = await assertExplicitSiegeOrder(page);
const repairState = await assertRepairOrder(page);

await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshot = await stat(screenshotPath);
if (screenshot.size < 50_000) {
  throw new Error(`Building visibility screenshot looks too small: ${screenshot.size} bytes`);
}
if (errors.length > 0) {
  throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
}

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      screenshotPath,
      screenshotBytes: screenshot.size,
      buildingState,
      siegeState,
      repairState
    },
    null,
    2
  )
);

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
  if (type === "gate" && (!state.panel.includes("Gate: open") || !state.panel.includes("Open gates follow their access policy"))) {
    throw new Error(`Created gate selected panel did not confirm open gate behavior: ${JSON.stringify(state)}`);
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

async function forceDevelopment(page, developmentId) {
  const result = await page.evaluate((id) => {
    if (typeof window.force_development_for_test !== "function") return { ok: false, reason: "missing development hook" };
    return window.force_development_for_test("blue", id);
  }, developmentId);
  if (!result.ok) throw new Error(`Development hook failed for ${developmentId}: ${JSON.stringify(result)}`);
  if (!result.developments?.includes(developmentId)) {
    throw new Error(`Development hook did not unlock ${developmentId}: ${JSON.stringify(result)}`);
  }
}

async function forceResourceBoost(page, resources) {
  const result = await page.evaluate((boost) => {
    if (typeof window.force_resource_boost_for_test !== "function") return { ok: false, reason: "missing resource boost hook" };
    return window.force_resource_boost_for_test("blue", boost);
  }, resources);
  if (!result.ok) throw new Error(`Resource boost hook failed: ${JSON.stringify(result)}`);
}

async function forceGateState(page, gateState, accessPolicy) {
  const result = await page.evaluate(({ state, policy }) => {
    if (typeof window.force_gate_state_for_test !== "function") return { ok: false, reason: "missing gate state hook" };
    return window.force_gate_state_for_test("blue", state, undefined, policy);
  }, { state: gateState, policy: accessPolicy });
  if (!result.ok) throw new Error(`Gate state hook failed: ${JSON.stringify(result)}`);
}

async function assertSelectedGatePolicy(page, expectedPolicy, expectedPassableBy) {
  const state = await page.evaluate((policy) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { policy, selected, panel };
  }, expectedPolicy);
  if (state.selected?.type !== "gate" || state.selected.gateAccessPolicy !== expectedPolicy) {
    throw new Error(`Selected gate did not expose access policy ${expectedPolicy}: ${JSON.stringify(state)}`);
  }
  if (JSON.stringify(state.selected.gatePassableBy) !== JSON.stringify(expectedPassableBy)) {
    throw new Error(`Selected gate did not expose passable tribes ${JSON.stringify(expectedPassableBy)}: ${JSON.stringify(state)}`);
  }
  if (!state.panel.includes(`access ${expectedPolicy === "owner_only" ? "owner only" : "owner and allies"}`)) {
    throw new Error(`Selected gate panel did not expose access policy ${expectedPolicy}: ${JSON.stringify(state)}`);
  }
}

async function assertSelectedGateState(page, expectedState, expectedPolicy) {
  const state = await page.evaluate(({ gateState, policy }) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { gateState, policy, selected, panel };
  }, { gateState: expectedState, policy: expectedPolicy });
  if (state.selected?.type !== "gate" || state.selected.gateState !== expectedState || state.selected.gateAccessPolicy !== expectedPolicy || state.selected.blocksMovement !== true) {
    throw new Error(`Selected gate did not expose locked blocking state: ${JSON.stringify(state)}`);
  }
  if (!state.panel.includes(`Gate: ${expectedState}`)) {
    throw new Error(`Selected gate panel did not expose state ${expectedState}: ${JSON.stringify(state)}`);
  }
}

async function assertExplicitSiegeOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_siege_for_test !== "function") return { ok: false, reason: "missing siege hook" };
    return window.force_siege_for_test();
  });
  if (!state.ok || state.destroyed !== true || state.afterHp !== null) {
    throw new Error(`Explicit siege order did not destroy the target wall: ${JSON.stringify(state)}`);
  }
  if (!state.attackerTasks?.some((task) => task.includes("Attacking wall test_siege_wall"))) {
    throw new Error(`Explicit siege order did not expose attack-building task text: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("WAR_SIEGE_ORDER") && event.includes("test_siege_wall"))) {
    throw new Error(`Explicit siege order did not emit order evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("STRUCTURE_DESTROYED") && event.includes("50,50"))) {
    throw new Error(`Explicit siege order did not emit destruction evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertRepairOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_repair_for_test !== "function") return { ok: false, reason: "missing repair hook" };
    return window.force_repair_for_test();
  });
  if (!state.ok || typeof state.beforeHp !== "number" || typeof state.afterHp !== "number" || state.afterHp <= state.beforeHp) {
    throw new Error(`Repair order did not increase owned structure health: ${JSON.stringify(state)}`);
  }
  if (!state.completed) {
    throw new Error(`Repair order did not complete within smoke window: ${JSON.stringify(state)}`);
  }
  if (!state.repairerTasks?.some((task) => task.includes("Repairing"))) {
    throw new Error(`Repair order did not expose repair task text: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("AI_REPAIR_ORDER"))) {
    throw new Error(`Repair order did not emit repair-order evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("STRUCTURE_REPAIRED"))) {
    throw new Error(`Repair order did not emit repaired evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertBuildingRequirementState(page, buildingType, expectedMissing) {
  const state = await page.evaluate((type) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const entry = parsed.buildingCosts?.find((item) => item.type === type);
    const tribe = parsed.tribes?.find((item) => item.id === "blue");
    return { entry, developments: tribe?.developments ?? [] };
  }, buildingType);
  const missing = state.entry?.missingForPlayer ?? [];
  if (JSON.stringify(missing) !== JSON.stringify(expectedMissing)) {
    throw new Error(`Unexpected missing requirements for ${buildingType}: ${JSON.stringify(state)}`);
  }
}

async function assertCreatedBuildingPainted(page, type) {
  const state = await page.evaluate((expectedType) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const canvas = document.querySelector("canvas");
    if (!selected || selected.type !== expectedType || !(canvas instanceof HTMLCanvasElement)) {
      return { ok: false, reason: "missing selected building or canvas", selected };
    }
    return { ok: true, selected };
  }, type);
  if (!state.ok) {
    throw new Error(`Created ${type} did not have a selected building to sample: ${JSON.stringify(state)}`);
  }
  const radius = 30;
  const viewport = page.viewportSize() ?? { width: 1440, height: 940 };
  const canvasBox = await page.locator("canvas").boundingBox();
  if (!canvasBox) throw new Error(`Could not locate canvas while sampling created ${type}: ${JSON.stringify(state)}`);
  const clip = {
    x: Math.max(0, Math.min(viewport.width - radius * 2, Math.round(canvasBox.x + state.selected.screenX - radius))),
    y: Math.max(0, Math.min(viewport.height - radius * 2, Math.round(canvasBox.y + state.selected.screenY - radius))),
    width: radius * 2,
    height: radius * 2
  };
  const screenshot = await page.screenshot({ clip });
  const sample = await page.evaluate(async (base64Png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64Png}`;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    const copy = document.createElement("canvas");
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext("2d");
    if (!context) return { ok: false, reason: "missing 2d sample context" };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    let visiblePixels = 0;
    let yellowPixels = 0;
    let darkPixels = 0;
    let unique = new Set();
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha < 32) continue;
      unique.add(`${red >> 4},${green >> 4},${blue >> 4}`);
      if (red > 210 && green > 170 && blue < 150) yellowPixels += 1;
      if (red < 45 && green < 45 && blue < 45) darkPixels += 1;
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 28) visiblePixels += 1;
    }
    return {
      ok: yellowPixels >= 12 || (visiblePixels >= 80 && unique.size >= 8 && darkPixels >= 8),
      sample: { width: copy.width, height: copy.height, visiblePixels, yellowPixels, darkPixels, uniqueColors: unique.size }
    };
  }, screenshot.toString("base64"));
  if (!sample.ok) {
    throw new Error(`Created ${type} did not produce a visible painted screenshot patch: ${JSON.stringify({ state, clip, sample })}`);
  }
}
