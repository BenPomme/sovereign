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
const seedState = await assertBrowserSeedTelemetry(page, url);
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
const gateOperationState = await assertGateOperation(page);
const gateRansomState = await assertGateRansomRelease(page);
const gateAccessSabotageState = await assertGateAccessSabotage(page);

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
      healthPct: building.healthPct,
      armor: building.armor,
      attack: building.attack,
      range: building.range,
      condition: building.condition,
      damageState: building.damageState,
      repairState: building.repairState,
      selected: building.selected,
      constructionFocus: building.constructionFocus,
      gateOperation: building.gateOperation
    }));
  const owned = parsed.visibleBuildings.filter((building) => building.tribeId === "blue");
  const blueTribe = parsed.tribes.find((tribe) => tribe.id === "blue");
  return {
    selected: parsed.selected,
    combatStatCoverage: parsed.combatStatCoverage,
    boardReadability: parsed.boardReadability,
    populationOutlook: blueTribe?.populationOutlook,
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
if (!buildingState.combatStatCoverage?.ok) {
  throw new Error(`Combat stat coverage failed after building setup: ${JSON.stringify(buildingState.combatStatCoverage)}`);
}
if (
  buildingState.populationOutlook?.populationCap < 28 ||
  buildingState.populationOutlook?.houseCount < 1 ||
  !String(buildingState.populationOutlook?.rule ?? "").includes("no hidden AI-only population cap")
) {
  throw new Error(`Population outlook telemetry failed after building setup: ${JSON.stringify(buildingState.populationOutlook)}`);
}
if (
  buildingState.boardReadability?.labelContrastMode !== "backed" ||
  buildingState.boardReadability?.resourceLabelsVisible !== false ||
  buildingState.boardReadability?.totalVisibleLabelCount !== 0 ||
  buildingState.boardReadability?.spriteVisuals?.atlasReady !== true ||
  buildingState.boardReadability?.spriteVisuals?.visibleResourceSpriteCount <= 0 ||
  buildingState.boardReadability?.spriteVisuals?.buildingTextureTypes < 8 ||
  buildingState.boardReadability?.spriteVisuals?.unitTextureTypes < 8 ||
  buildingState.boardReadability?.spriteVisuals?.siegeEngineTexture !== true ||
  buildingState.boardReadability?.spriteVisuals?.batteringRamTexture !== true ||
  buildingState.boardReadability?.spriteVisuals?.catapultTexture !== true ||
  !buildingState.boardReadability?.resourcePressureOverlay ||
  buildingState.boardReadability.resourcePressureOverlay.enabled !== true ||
  buildingState.boardReadability.resourcePressureOverlay.routeMarkers < 1 ||
  buildingState.boardReadability.resourcePressureOverlay.pressureSites?.length < 1 ||
  !buildingState.boardReadability?.fortificationOverlay ||
  buildingState.boardReadability.fortificationOverlay.visibleCounts?.wall < 1 ||
  buildingState.boardReadability.fortificationOverlay.visibleCounts?.gate < 1 ||
  buildingState.boardReadability.fortificationOverlay.visibleCounts?.turret < 1 ||
  buildingState.boardReadability.fortificationOverlay.visualOverlayMarkers?.blockedRouteMarkers < 1
) {
  throw new Error(`Sprite-first board readability telemetry failed after building setup: ${JSON.stringify(buildingState.boardReadability)}`);
}
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
const perimeterState = await assertPerimeterBuild(page);
const siegeStates = [];
for (const type of ["wall", "gate", "turret"]) {
  siegeStates.push(await assertExplicitSiegeOrder(page, type));
}
const siegeEngineState = await assertSiegeEngineOrder(page);
const artilleryState = await assertArtilleryOrder(page);
const retreatState = await assertRetreatOrder(page);
const coordinatedFeintState = await assertCoordinatedFeintOrder(page);
const resourceRaidState = await assertResourceRaidOrder(page);
const resourceDepletionState = await assertResourceDepletion(page);
const civilizationMergerState = await assertCivilizationMerger(page);
const damageState = await assertDamageVisualization(page);
const repairState = await assertRepairOrder(page);
const repairUnderFireState = await assertRepairUnderFire(page);
const finalCombatStatCoverage = await page.evaluate(() => JSON.parse(window.render_game_to_text()).combatStatCoverage);
if (!finalCombatStatCoverage?.ok) {
  throw new Error(`Combat stat coverage failed after siege/raid/repair flow: ${JSON.stringify(finalCombatStatCoverage)}`);
}

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
      seedState,
      buildingState,
      gateOperationState,
      gateRansomState,
      gateAccessSabotageState,
      perimeterState,
      siegeStates,
      siegeEngineState,
      artilleryState,
      retreatState,
      coordinatedFeintState,
      resourceRaidState,
      resourceDepletionState,
      civilizationMergerState,
      damageState,
      repairState,
      repairUnderFireState,
      finalCombatStatCoverage
    },
    null,
    2
  )
);

async function assertBrowserSeedTelemetry(page, currentUrl) {
  const first = await readBrowserSeedTelemetry(page);
  if (!Number.isFinite(first.seed) || first.seed <= 0) {
    throw new Error(`render_game_to_text did not expose a useful initial seed: ${first.seed}`);
  }
  assertBrowserScarcityTelemetry(first);
  const explicitSeed = new URL(currentUrl).searchParams.get("seed");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function", null, { timeout: 15_000 });
  const second = await readBrowserSeedTelemetry(page);
  if (!Number.isFinite(second.seed) || second.seed <= 0) {
    throw new Error(`render_game_to_text did not expose a useful seed after reload: ${second.seed}`);
  }
  assertBrowserScarcityTelemetry(second);
  if (explicitSeed) {
    const expected = Number(explicitSeed) >>> 0;
    if (first.seed !== expected || second.seed !== expected) {
      throw new Error(`Explicit seed URL did not replay deterministically: ${JSON.stringify({ first, second, expected })}`);
    }
    if (first.resourceLayoutFingerprint !== second.resourceLayoutFingerprint) {
      throw new Error(`Explicit seed URL did not replay resource layout: ${JSON.stringify({ first, second })}`);
    }
    return { mode: "explicit", first: first.seed, second: second.seed, resourceLayoutFingerprint: first.resourceLayoutFingerprint };
  }
  if (first.seed === second.seed) {
    throw new Error(`Normal browser reload reused the same map seed: ${JSON.stringify({ first, second })}`);
  }
  if (first.resourceLayoutFingerprint === second.resourceLayoutFingerprint) {
    throw new Error(`Normal browser reload reused the same resource layout: ${JSON.stringify({ first, second })}`);
  }
  return {
    mode: "fresh_random",
    first: first.seed,
    second: second.seed,
    firstResourceLayoutFingerprint: first.resourceLayoutFingerprint,
    secondResourceLayoutFingerprint: second.resourceLayoutFingerprint
  };
}

async function readBrowserSeedTelemetry(page) {
  return await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    return {
      seed: parsed.seed,
      resourceLayoutFingerprint: String(parsed.resourceLayoutFingerprint ?? ""),
      resourceTiles: Array.isArray(parsed.resourceTiles) ? parsed.resourceTiles : [],
      contestedResourceSites: Array.isArray(parsed.contestedResourceSites) ? parsed.contestedResourceSites : []
    };
  });
}

function assertBrowserScarcityTelemetry(snapshot) {
  if (!snapshot.resourceLayoutFingerprint) {
    throw new Error(`Resource layout fingerprint was not exposed: ${JSON.stringify(snapshot)}`);
  }
  const byType = new Map(snapshot.resourceTiles.map((entry) => [String(entry.type), Number(entry.tiles ?? 0)]));
  const iron = byType.get("iron") ?? 0;
  const coal = byType.get("coal") ?? 0;
  const food = byType.get("food") ?? 0;
  const stone = byType.get("stone") ?? 0;
  const clay = byType.get("clay") ?? 0;
  if (!iron || !coal || !food || !stone || !clay) {
    throw new Error(`Seeded map did not expose required resource tiles: ${JSON.stringify(snapshot)}`);
  }
  if (iron >= food || coal >= food || coal >= stone || coal >= clay) {
    throw new Error(`Scarce resources were not bounded relative to common resources: ${JSON.stringify(snapshot)}`);
  }
  if (!snapshot.contestedResourceSites.some((site) => site.type === "iron" && site.scarce === true && site.contested === true)) {
    throw new Error(`No contested scarce iron site was exposed: ${JSON.stringify(snapshot)}`);
  }
  if (!snapshot.contestedResourceSites.some((site) => site.type === "coal" && site.scarce === true && site.contested === true)) {
    throw new Error(`No contested scarce coal site was exposed: ${JSON.stringify(snapshot)}`);
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
    typeof state.selected.hp !== "number" ||
    typeof state.selected.maxHp !== "number" ||
    typeof state.selected.armor !== "number" ||
    typeof state.selected.attack !== "number" ||
    typeof state.selected.range !== "number" ||
    typeof state.selected.healthPct !== "number" ||
    state.selected.condition !== "intact" ||
    state.selected.damageState !== "intact" ||
    state.selected.repairState !== "none"
  ) {
    throw new Error(`Created ${type} did not expose intact health/armor/attack durability stats: ${JSON.stringify(state)}`);
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
  if (!state.panel.includes("Health:") || !state.panel.includes("Armor:") || !state.panel.includes("Attack:") || !state.panel.includes("Condition: intact")) {
    throw new Error(`Created ${type} selected panel did not expose combat stats and condition: ${JSON.stringify(state)}`);
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

async function assertGateOperation(page) {
  const result = await page.evaluate(() => {
    if (typeof window.force_gate_operation_for_test !== "function") return { ok: false, reason: "missing gate operation hook" };
    return window.force_gate_operation_for_test(
      "blue",
      undefined,
	      "toll passage with detention threat",
	      "Visitors may pass after paying a toll; suspicious messengers can be detained.",
	      "open",
	      "all",
	      "delay",
	      "optional",
	      "refuse",
	      "Public notice: passage is open under toll inspection."
	    );
	  });
  if (!result.ok) throw new Error(`Gate operation hook failed: ${JSON.stringify(result)}`);
  const state = await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const latest = parsed.recentGateOperations?.at(-1);
    const overlay = parsed.boardReadability?.fortificationOverlay;
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { selected, latest, overlay, panel, recentGateOperations: parsed.recentGateOperations };
  });
  if (state.selected?.type !== "gate" || !state.selected.gateOperation) {
    throw new Error(`Gate operation was not exposed on the selected gate: ${JSON.stringify({ result, state })}`);
  }
  if (state.selected.gateOperation.gateOperationIntent !== "toll passage with detention threat") {
    throw new Error(`Selected gate operation intent was not preserved: ${JSON.stringify({ result, state })}`);
  }
  if (
    state.latest?.buildingId !== state.selected.id ||
    state.latest?.tollGold !== 3 ||
    state.latest?.entryAction !== "delay" ||
    state.latest?.tollMode !== "optional" ||
    state.latest?.unpaidAction !== "refuse" ||
    state.latest?.gatePublicNotice !== "Public notice: passage is open under toll inspection."
  ) {
    throw new Error(`Recent gate operation history was not exposed: ${JSON.stringify({ result, state })}`);
  }
  if (!state.panel.includes("Operation: toll passage with detention threat")) {
    throw new Error(`Selected gate panel did not expose gate operation terms: ${JSON.stringify({ result, state })}`);
  }
  if (!state.panel.includes("action delay") || !state.panel.includes("toll 3 optional") || !state.panel.includes("unpaid refuse")) {
    throw new Error(`Selected gate panel did not expose explicit gate mechanics: ${JSON.stringify({ result, state })}`);
  }
  if (
    state.overlay?.operatedGateCount < 1 ||
    !state.overlay?.operatedGateIds?.includes(state.selected.id) ||
    state.overlay?.visualOverlayMarkers?.operatedGateMarkers < 1 ||
    !state.overlay?.visualOverlayMarkers?.operatedGateIds?.includes(state.selected.id) ||
    state.overlay?.visualOverlayMarkers?.safePassageMarkers < 1 ||
    !state.overlay?.visualOverlayMarkers?.safePassageGateIds?.includes(state.selected.id)
  ) {
    throw new Error(`Fortification overlay did not expose the operated gate: ${JSON.stringify({ result, state })}`);
  }
  return { hook: result, selected: state.selected, latest: state.latest };
}

async function assertGateRansomRelease(page) {
  const result = await page.evaluate(() => {
    if (typeof window.force_gate_ransom_for_test !== "function") return { ok: false, reason: "missing gate ransom hook" };
    return window.force_gate_ransom_for_test();
  });
  if (!result.ok) throw new Error(`Gate ransom hook failed: ${JSON.stringify(result)}`);
  if (
    result.packetState !== "IN_TRANSIT_RETURN" ||
    result.gateDetainedPacketAction !== "ransom" ||
    result.messageCount !== 2 ||
    result.blueGoldAfter !== result.blueGoldBefore + 10 ||
    result.redGoldAfter !== result.redGoldBefore - 10 ||
    !result.releaseMessage?.includes("ransom was paid") ||
    !result.eventTypes?.includes("GATE_RANSOM_PAID") ||
    !result.eventTypes?.includes("MESSENGER_RELEASED_AT_GATE")
  ) {
    throw new Error(`Gate ransom release did not expose packet, gold, message, and event evidence: ${JSON.stringify(result)}`);
  }
  const state = await page.evaluate(({ buildingId, packetId }) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const latest = parsed.recentGateOperations?.at(-1);
    const packet = parsed.packets?.find((item) => item.id === packetId);
    const selected = parsed.visibleBuildings.find((building) => building.id === buildingId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { latest, packet, selected, panel };
  }, result);
  if (state.latest?.detainedPacketAction !== "ransom" || state.latest?.detainedPacketId !== result.packetId || state.latest?.ransomGold !== 10) {
    throw new Error(`Recent gate operation did not expose ransom release controls: ${JSON.stringify({ result, state })}`);
  }
  if (state.packet?.state !== "IN_TRANSIT_RETURN" || state.packet?.messages !== 2) {
    throw new Error(`render_game_to_text did not expose released packet state: ${JSON.stringify({ result, state })}`);
  }
  if (!state.selected?.gateOperation || !state.panel.includes("Operation: release Red courier after ransom")) {
    throw new Error(`Selected gate panel did not expose ransom gate operation: ${JSON.stringify({ result, state })}`);
  }
  return { hook: result, latest: state.latest, packet: state.packet, selected: state.selected };
}

async function assertGateAccessSabotage(page) {
  const result = await page.evaluate(() => {
    if (typeof window.force_gate_access_sabotage_for_test !== "function") return { ok: false, reason: "missing gate access/sabotage hook" };
    return window.force_gate_access_sabotage_for_test();
  });
  if (!result.ok) throw new Error(`Gate access/sabotage hook failed: ${JSON.stringify(result)}`);
  if (
    result.redPassableBefore !== false ||
    result.redPassableAfterGrant !== true ||
    result.redPassableAfterRevoke !== false ||
    !result.treatyPacketGateIds?.includes(result.buildingId) ||
    !result.treatyPacketRouteMemory?.some((entry) => entry.includes(result.grantTreatyId) && entry.includes("Smoke road writ")) ||
    !result.treatyPacketRouteMemory?.some((entry) => entry.includes(result.treatyIncidentId) && entry.includes("detain")) ||
    result.treatyIncidentAction !== "detain" ||
    !result.treatyIncidentParticipants?.includes("blue") ||
    !result.treatyIncidentParticipants?.includes("red") ||
    !result.treatyIncidentWitnesses?.includes("green") ||
    result.redPassableAfterSabotage !== true ||
    result.redPassableAfterSabotageExpires !== false ||
    result.sabotageAction !== "force_open" ||
    !(result.damageAfter < result.damageBefore) ||
    !result.eventTypes?.includes("GATE_ACCESS_TREATY_GRANTED") ||
    !result.eventTypes?.includes("GATE_TREATY_INCIDENT_RECORDED") ||
    !result.eventTypes?.includes("GATE_ACCESS_TREATY_REVOKED") ||
    !result.eventTypes?.includes("GATE_SABOTAGED_OPEN") ||
    !result.eventTypes?.includes("GATE_SABOTAGE_EXPIRED") ||
    !result.eventTypes?.includes("GATE_SABOTAGE_DAMAGED")
  ) {
    throw new Error(`Gate access treaty/sabotage transitions were not proven: ${JSON.stringify(result)}`);
  }
  const state = await page.evaluate(({ buildingId, grantTreatyId, revokeTreatyId, treatyPacketId, treatyIncidentId }) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === buildingId);
    const grant = parsed.recentGateAccessTreaties?.find((treaty) => treaty.id === grantTreatyId);
    const revoke = parsed.recentGateAccessTreaties?.find((treaty) => treaty.id === revokeTreatyId);
    const incident = parsed.recentGateTreatyIncidents?.find((entry) => entry.id === treatyIncidentId);
    const treatyPacket = parsed.packets?.find((packet) => packet.id === treatyPacketId);
    const sabotage = parsed.recentGateSabotageHistory?.at(-1);
    const latest = parsed.recentGateOperations?.at(-1);
    const overlay = parsed.boardReadability?.fortificationOverlay;
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { selected, grant, revoke, incident, treatyPacket, sabotage, latest, overlay, panel };
  }, result);
  if (state.grant?.action !== "grant" || state.revoke?.action !== "revoke") {
    throw new Error(`render_game_to_text did not expose grant/revoke treaty records: ${JSON.stringify({ result, state })}`);
  }
  if (!state.treatyPacket?.routeMemory?.some((entry) => entry.includes(result.grantTreatyId) && entry.includes("Smoke road writ"))) {
    throw new Error(`render_game_to_text did not expose safe-passage treaty route evidence: ${JSON.stringify({ result, state })}`);
  }
  if (
    state.incident?.action !== "detain" ||
    state.incident?.treatyId !== result.grantTreatyId ||
    state.incident?.packetId !== result.treatyPacketId ||
    !state.incident?.participantTribeIds?.includes("blue") ||
    !state.incident?.participantTribeIds?.includes("red") ||
    !state.incident?.witnessTribeIds?.includes("green")
  ) {
    throw new Error(`render_game_to_text did not expose treaty incident evidence: ${JSON.stringify({ result, state })}`);
  }
  if (state.sabotage?.action !== "damage" || state.latest?.sabotageAction !== "damage") {
    throw new Error(`render_game_to_text did not expose sabotage history/operation: ${JSON.stringify({ result, state })}`);
  }
  if (!state.selected?.gateOperation || !state.panel.includes("sabotage damage")) {
    throw new Error(`Selected gate panel did not expose sabotage operation: ${JSON.stringify({ result, state })}`);
  }
  if (
    state.overlay?.operatedGateCount < 1 ||
    !state.overlay?.operatedGateIds?.includes(result.buildingId) ||
    state.overlay?.recentSabotageHistoryCount < result.sabotageHistoryCount ||
    !state.overlay?.sabotageHistoryGateIds?.includes(result.buildingId)
  ) {
    throw new Error(`Fortification overlay did not expose gate operation/sabotage history: ${JSON.stringify({ result, state })}`);
  }
  return { hook: result, grant: state.grant, revoke: state.revoke, sabotage: state.sabotage, selected: state.selected };
}

async function assertPerimeterBuild(page) {
  const result = await page.evaluate(() => {
    if (typeof window.force_perimeter_for_test !== "function") return { ok: false, reason: "missing perimeter hook" };
    return window.force_perimeter_for_test();
  });
  if (
    !result.ok ||
    result.wallCount !== 4 ||
    result.gateCount !== 1 ||
    result.planCount !== 5 ||
    result.pattern !== "gate_line" ||
    result.direction !== "east_west" ||
    result.length !== 5 ||
    result.gateIndex !== 3 ||
    result.wallBlocks !== true ||
    result.gatePassable !== true ||
    result.placementPreview?.blockingTileCount !== 4 ||
    result.placementPreview?.ownerGatePassableCount !== 1 ||
    result.placementPreview?.routeChecks?.length < 2
  ) {
    throw new Error(`Perimeter hook did not build a visible blocking wall/gate line: ${JSON.stringify(result)}`);
  }
  if (!result.recentEvents?.some((event) => event.includes("FORTIFICATION_PERIMETER_BUILT") && event.includes("5 structures"))) {
    throw new Error(`Perimeter hook did not emit perimeter build evidence: ${JSON.stringify(result)}`);
  }
  const state = await page.evaluate(({ buildingIds, groupId }) => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selected = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const plans = parsed.recentFortificationPlans?.filter((plan) => plan.perimeterGroupId === groupId);
    const overlay = parsed.boardReadability?.fortificationOverlay;
    const group = overlay?.perimeterGroups?.find((candidate) => candidate.groupId === groupId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return {
      selected,
      overlay,
      group,
      panel,
      planCount: plans?.length ?? 0,
      planPlacementPreview: plans?.[0]?.placementPreview,
      matchingVisibleBuildings: parsed.visibleBuildings.filter((building) => buildingIds.includes(building.id)).length
    };
  }, { buildingIds: result.buildingIds ?? [], groupId: result.groupId });
  if (state.selected?.type !== "gate" || state.selected.gateState !== "open" || state.selected.blocksMovement !== false) {
    throw new Error(`Perimeter gate was not selected and passable in browser telemetry: ${JSON.stringify({ result, state })}`);
  }
  if (state.matchingVisibleBuildings !== 5 || state.planCount !== 5) {
    throw new Error(`Perimeter buildings/plans were not visible in browser telemetry: ${JSON.stringify({ result, state })}`);
  }
  if (
    state.overlay?.perimeterGroupCount < 1 ||
    state.group?.segmentCount !== 5 ||
    state.group?.visibleSegmentCount !== 5 ||
    state.group?.counts?.wall !== 4 ||
    state.group?.counts?.gate !== 1 ||
	    state.group?.blockedWallSegments !== 4 ||
	    state.group?.passableGateSegments !== 1 ||
	    state.group?.pattern !== "gate_line" ||
	    state.group?.direction !== "east_west" ||
	    !state.group?.latestStrategy?.includes("preserving one gate-controlled passage") ||
	    state.overlay?.visualOverlayMarkers?.perimeterCenterMarkers < 1 ||
	    !state.overlay?.visualOverlayMarkers?.perimeterGroupIds?.includes(result.groupId) ||
	    state.overlay?.visualOverlayMarkers?.blockedRouteMarkers < 4 ||
	    state.overlay?.visualOverlayMarkers?.safePassageMarkers < 1 ||
	    state.group?.placementPreview?.blockingTileCount !== 4 ||
	    state.group?.placementPreview?.ownerGatePassableCount !== 1 ||
	    state.group?.placementPreview?.routeChecks?.length < 2 ||
	    state.planPlacementPreview?.blockingTileCount !== 4
	  ) {
    throw new Error(`Fortification overlay did not expose the authored perimeter group: ${JSON.stringify({ result, state })}`);
  }
  if (!state.panel.includes("Gate: open") || !state.panel.includes("Open gates follow their access policy")) {
    throw new Error(`Perimeter gate selected panel did not expose gate behavior: ${JSON.stringify({ result, state })}`);
  }
  return { hook: result, selected: state.selected, planCount: state.planCount, overlayGroup: state.group };
}

async function assertExplicitSiegeOrder(page, type) {
  const state = await page.evaluate((targetType) => {
    if (typeof window.force_siege_for_test !== "function") return { ok: false, reason: "missing siege hook" };
    return window.force_siege_for_test(targetType);
  }, type);
  if (!state.ok || state.destroyed !== true || state.afterHp !== null) {
    throw new Error(`Explicit siege order did not destroy the target ${type}: ${JSON.stringify(state)}`);
  }
  if (state.buildingType !== type || state.targetBuildingId !== `test_siege_${type}`) {
    throw new Error(`Explicit siege order targeted the wrong ${type}: ${JSON.stringify(state)}`);
  }
  if (!state.attackerTasks?.some((task) => task.includes(`Attacking ${type} test_siege_${type}`))) {
    throw new Error(`Explicit ${type} siege order did not expose attack-building task text: ${JSON.stringify(state)}`);
  }
  if ((type === "wall" || type === "gate") && (state.beforeWalkable !== false || state.afterWalkable !== true)) {
    throw new Error(`Explicit ${type} siege order did not restore walkability after destruction: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("WAR_SIEGE_ORDER") && event.includes(`test_siege_${type}`))) {
    throw new Error(`Explicit ${type} siege order did not emit order evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("STRUCTURE_DESTROYED") && event.includes(type))) {
    throw new Error(`Explicit ${type} siege order did not emit destruction evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertSiegeEngineOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_siege_engine_for_test !== "function") return { ok: false, reason: "missing siege engine hook" };
    return window.force_siege_engine_for_test();
  });
  if (!state.ok || state.unitType !== "siege_engine" || state.destroyed !== true || !state.targetBuildingId) {
    throw new Error(`Siege engine order did not train and destroy a hostile wall: ${JSON.stringify(state)}`);
  }
  if (typeof state.breachEstimateBefore !== "number" || state.breachEstimateBefore <= 0) {
    throw new Error(`Siege engine order did not expose a useful breach estimate: ${JSON.stringify(state)}`);
  }
  if (!state.attackerTasks?.some((task) => task.includes(`Attacking wall ${state.targetBuildingId}`))) {
    throw new Error(`Siege engine attack did not expose attack-building task text: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("WAR_SIEGE_ORDER") && event.includes(state.targetBuildingId))) {
    throw new Error(`Siege engine attack did not emit siege order evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("STRUCTURE_DESTROYED") && event.includes("wall"))) {
    throw new Error(`Siege engine attack did not emit wall destruction evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertArtilleryOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_artillery_for_test !== "function") return { ok: false, reason: "missing artillery hook" };
    return window.force_artillery_for_test();
  });
  if (!state.ok || state.unitType !== "catapult" || state.projectileSeen !== true || state.impactSeen !== true || state.destroyed !== true) {
    throw new Error(`Artillery order did not train, fire, impact, and destroy a hostile wall: ${JSON.stringify(state)}`);
  }
  if (!Array.isArray(state.projectileSnapshots) || state.projectileSnapshots.length < 1) {
    throw new Error(`Artillery order did not expose an in-flight projectile snapshot: ${JSON.stringify(state)}`);
  }
  if (!state.projectileSnapshots.some((projectile) => projectile.targetBuildingId === state.targetBuildingId)) {
    throw new Error(`Artillery projectile snapshot targeted the wrong building: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("SIEGE_PROJECTILE_LAUNCHED") && event.includes(state.targetBuildingId))) {
    throw new Error(`Artillery order did not emit projectile launch evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("SIEGE_PROJECTILE_IMPACT") && event.includes(state.targetBuildingId))) {
    throw new Error(`Artillery order did not emit projectile impact evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("STRUCTURE_DESTROYED") && event.includes("wall"))) {
    throw new Error(`Artillery order did not emit wall destruction evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertRetreatOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_retreat_for_test !== "function") return { ok: false, reason: "missing retreat hook" };
    return window.force_retreat_for_test();
  });
  if (!state.ok || !state.retreatTarget || !Array.isArray(state.retreatedUnits) || state.retreatedUnits.length < 1) {
    throw new Error(`Retreat hook did not pull damaged siege units back: ${JSON.stringify(state)}`);
  }
  if (!state.attackTasksBefore?.every((task) => task.includes("Attacking wall test_retreat_wall"))) {
    throw new Error(`Retreat hook did not start from attack-building tasks: ${JSON.stringify(state)}`);
  }
  if (!state.moveTasksAfter?.every((task) => task.includes(`Moving to ${state.retreatTarget.x},${state.retreatTarget.y}`))) {
    throw new Error(`Retreat hook did not convert attackers to retreat movement tasks: ${JSON.stringify(state)}`);
  }
  if (state.siegePlan?.retreatHealthPct !== 50 || state.siegePlan?.retreatX !== state.retreatTarget.x || state.siegePlan?.retreatY !== state.retreatTarget.y) {
    throw new Error(`Retreat hook did not preserve executable retreat plan fields: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("SIEGE_RETREAT_TRIGGERED") && event.includes(`${state.retreatTarget.x},${state.retreatTarget.y}`))) {
    throw new Error(`Retreat hook did not emit retreat event evidence: ${JSON.stringify(state)}`);
  }
  if (state.recentEvents?.some((event) => event.includes("SIEGE_PROJECTILE_LAUNCHED") && event.includes("test_retreat_wall"))) {
    throw new Error(`Retreating artillery still fired at the retreat test wall: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertCoordinatedFeintOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_coordinated_feint_for_test !== "function") return { ok: false, reason: "missing coordinated/feint hook" };
    return window.force_coordinated_feint_for_test();
  });
  if (!state.ok || !state.coordinated?.ok || !state.feint?.ok || !state.wave?.ok) {
    throw new Error(`Coordinated/feint hook failed: ${JSON.stringify(state)}`);
  }
  if (state.coordinated.siegePlan?.assaultMode !== "coordinated") {
    throw new Error(`Coordinated siege plan did not preserve assaultMode: ${JSON.stringify(state)}`);
  }
  if (
    state.coordinated.siegePlan?.assemblyX !== state.coordinated.assemblyTarget.x ||
    state.coordinated.siegePlan?.assemblyY !== state.coordinated.assemblyTarget.y
  ) {
    throw new Error(`Coordinated siege plan did not preserve assembly target: ${JSON.stringify(state)}`);
  }
  if (!state.coordinated.assembleTasksBefore?.every((task) => task.includes("Assembling for coordinated assault"))) {
    throw new Error(`Coordinated siege did not expose assembly tasks before release: ${JSON.stringify(state)}`);
  }
  if (!state.coordinated.attackTasksAfter?.every((task) => task.includes("Attacking wall test_coordinated_wall"))) {
    throw new Error(`Coordinated siege did not release attackers into attack tasks: ${JSON.stringify(state)}`);
  }
  if (!state.coordinated.recentEvents?.some((event) => event.includes("COORDINATED_ASSAULT_STARTED") && event.includes("test_coordinated_wall"))) {
    throw new Error(`Coordinated siege did not emit start event evidence: ${JSON.stringify(state)}`);
  }
  if (state.feint.siegePlan?.assaultMode !== "feint" || state.feint.siegePlan?.feintDurationTicks !== 2) {
    throw new Error(`Feint siege plan did not preserve explicit timing: ${JSON.stringify(state)}`);
  }
  if (!state.feint.attackTasksBefore?.every((task) => task.includes("Attacking wall test_feint_wall") && task.includes("(feint)"))) {
    throw new Error(`Feint siege did not expose feint attack tasks before withdrawal: ${JSON.stringify(state)}`);
  }
  if (!state.feint.moveTasksAfter?.every((task) => task.includes(`Moving to ${state.feint.retreatTarget.x},${state.feint.retreatTarget.y}`))) {
    throw new Error(`Feint siege did not withdraw to the commanded retreat target: ${JSON.stringify(state)}`);
  }
  if (!state.feint.recentEvents?.some((event) => event.includes("SIEGE_FEINT_WITHDRAWAL") && event.includes(`${state.feint.retreatTarget.x},${state.feint.retreatTarget.y}`))) {
    throw new Error(`Feint siege did not emit withdrawal event evidence: ${JSON.stringify(state)}`);
  }
  if (state.wave.siegePlan?.assaultWaveSize !== 1 || state.wave.siegePlan?.assaultWaveIntervalTicks !== 3) {
    throw new Error(`Wave siege plan did not preserve explicit wave controls: ${JSON.stringify(state)}`);
  }
  if (!state.wave.waitingTasksBefore?.some((task) => task.includes("Holding wave 2"))) {
    throw new Error(`Wave siege did not expose waiting wave task text: ${JSON.stringify(state)}`);
  }
  if (!state.wave.releaseTasksAfter?.some((task) => task.includes("Attacking wall test_wave_wall"))) {
    throw new Error(`Wave siege did not release the delayed wave into attack tasks: ${JSON.stringify(state)}`);
  }
  if (!state.wave.recentEvents?.some((event) => event.includes("SIEGE_WAVE_RELEASED") && event.includes("Wave 2"))) {
    throw new Error(`Wave siege did not emit release event evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertResourceRaidOrder(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_resource_raid_for_test !== "function") return { ok: false, reason: "missing resource raid hook" };
    return window.force_resource_raid_for_test();
  });
  if (!state.ok || state.destroyed !== true || state.afterHp !== null || state.afterAmount !== null) {
    throw new Error(`Resource raid order did not destroy the target deposit: ${JSON.stringify(state)}`);
  }
  if (!state.attackerTasks?.some((task) => task.includes("Raiding iron deposit"))) {
    throw new Error(`Resource raid order did not expose attack-resource task text: ${JSON.stringify(state)}`);
  }
  if (state.beforePosture?.type !== "iron" || state.beforePosture?.hp <= 0 || state.beforePosture?.control !== "controlled") {
    throw new Error(`Resource raid order did not expose a controlled live resource posture before attack: ${JSON.stringify(state)}`);
  }
  if (state.afterPosture !== null) {
    throw new Error(`Resource raid order did not remove the visible resource posture after destruction: ${JSON.stringify(state)}`);
  }
  if (!state.resourceDenials?.some((denial) => denial.type === "iron" && denial.x === 49 && denial.y === 52 && denial.attackerTribeId === "blue")) {
    throw new Error(`Resource raid order did not create a resource denial record: ${JSON.stringify(state)}`);
  }
  const overlay = await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    return parsed.boardReadability?.resourcePressureOverlay;
  });
  if (
    overlay?.denialMarkers < 1 ||
    !overlay?.denialSiteIds?.includes("iron@49,52") ||
    !overlay?.pressureSites?.some((site) => site.siteId === "iron@49,52" && site.deniedRecent === true && site.raided === true)
  ) {
    throw new Error(`Resource pressure overlay did not expose the destroyed iron deposit: ${JSON.stringify({ state, overlay })}`);
  }
  if ((state.resourceControlAfter?.recentDeniedDeposits ?? 0) < 1) {
    throw new Error(`Resource raid order did not affect resource-control summary: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("RESOURCE_RAID_ORDER") && event.includes("iron"))) {
    throw new Error(`Resource raid order did not emit raid-order evidence: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("RESOURCE_DEPOSIT_DESTROYED") && event.includes("49,52"))) {
    throw new Error(`Resource raid order did not emit deposit destruction evidence: ${JSON.stringify(state)}`);
  }
  return state;
}

async function assertResourceDepletion(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_resource_depletion_for_test !== "function") return { ok: false, reason: "missing resource depletion hook" };
    return window.force_resource_depletion_for_test();
  });
  if (!state.ok || state.depleted !== true || state.afterAmount !== null) {
    throw new Error(`Normal harvesting did not deplete the target deposit: ${JSON.stringify(state)}`);
  }
  if (state.stockpileAfter < state.stockpileBefore + state.beforeAmount) {
    throw new Error(`Normal depletion did not deliver harvested finite resources: ${JSON.stringify(state)}`);
  }
  if (!state.resourceDepletions?.some((record) => record.type === "clay" && record.x === state.target.x && record.y === state.target.y && record.depletedByTribeId === "blue")) {
    throw new Error(`Normal depletion did not create a resource depletion record: ${JSON.stringify(state)}`);
  }
  if (!state.recentEvents?.some((event) => event.includes("RESOURCE_DEPOSIT_DEPLETED") && event.includes(`${state.target.x},${state.target.y}`))) {
    throw new Error(`Normal depletion did not emit exhausted-deposit evidence: ${JSON.stringify(state)}`);
  }
  const rendered = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const overlay = rendered.boardReadability?.resourcePressureOverlay;
  const siteId = `clay@${state.target.x},${state.target.y}`;
  if (
    overlay?.depletionMarkers < 1 ||
    !overlay?.depletionSiteIds?.includes(siteId) ||
    !overlay?.pressureSites?.some((site) => site.siteId === siteId && site.depletedRecent === true && site.deniedRecent === false)
  ) {
    throw new Error(`Resource pressure overlay did not expose the normally exhausted clay deposit: ${JSON.stringify({ state, overlay })}`);
  }
  if (!rendered.recentResourceDepletions?.some((record) => record.type === "clay" && record.x === state.target.x && record.y === state.target.y)) {
    throw new Error(`render_game_to_text did not expose recent normal resource depletion: ${JSON.stringify({ state, recent: rendered.recentResourceDepletions })}`);
  }
  return state;
}

async function assertCivilizationMerger(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_civilization_merger_for_test !== "function") return { ok: false, reason: "missing civilization merger hook" };
    return window.force_civilization_merger_for_test();
  });
  if (!state.ok || state.leaderTribeId !== "blue" || state.mergedTribeId !== "green" || state.mergedIntoTribeId !== "blue") {
    throw new Error(`Civilization merger hook did not execute a negotiated Blue/Green merger: ${JSON.stringify(state)}`);
  }
  if (!state.mergerRecordId || !state.recentMergers?.some((record) => record.id === state.mergerRecordId && record.leaderTribeId === "blue" && record.mergedTribeId === "green")) {
    throw new Error(`Civilization merger hook did not expose a merger record: ${JSON.stringify(state)}`);
  }
  if (state.mergedPopulation !== 0 || state.leaderPopulation <= 0) {
    throw new Error(`Civilization merger did not transfer living population to the leader: ${JSON.stringify(state)}`);
  }
  const rendered = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const blue = rendered.tribes?.find((tribe) => tribe.id === "blue");
  const green = rendered.tribes?.find((tribe) => tribe.id === "green");
  if (!blue?.activeCivilization || green?.activeCivilization !== false || green?.mergedIntoTribeId !== "blue") {
    throw new Error(`render_game_to_text did not expose active/merged civilization status: ${JSON.stringify({ state, blue, green })}`);
  }
  if (!rendered.recentCivilizationMergers?.some((record) => record.id === state.mergerRecordId && record.terms?.includes("single crown"))) {
    throw new Error(`render_game_to_text did not expose negotiated merger terms: ${JSON.stringify({ state, recentCivilizationMergers: rendered.recentCivilizationMergers })}`);
  }
  if (rendered.victory?.mergedTribes < 1 || rendered.victory?.survivingTribes !== 4) {
    throw new Error(`Victory telemetry did not count merged tribes correctly: ${JSON.stringify(rendered.victory)}`);
  }
  return { ...state, renderedBlue: blue, renderedGreen: green, victory: rendered.victory };
}

async function assertDamageVisualization(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_damage_building_for_test !== "function") return { ok: false, reason: "missing damage hook" };
    return window.force_damage_building_for_test();
  });
  if (!state.ok || !state.targetBuildingId || !state.buildingType) {
    throw new Error(`Damage hook did not produce a damaged selected structure: ${JSON.stringify(state)}`);
  }
  if (state.damageState === "intact" || state.damageState === "destroyed" || state.repairState !== "none") {
    throw new Error(`Damaged structure did not expose an unrepaired damaged state: ${JSON.stringify(state)}`);
  }
  if (typeof state.healthPct !== "number" || state.healthPct >= 98 || state.healthPct <= 0) {
    throw new Error(`Damaged structure did not expose a useful health percentage: ${JSON.stringify(state)}`);
  }
  if (!state.selectedPanel?.includes(`Condition: ${state.damageState}`) || !state.selectedPanel.includes("repair none")) {
    throw new Error(`Damaged selected panel did not expose condition and repair state: ${JSON.stringify(state)}`);
  }
  await assertCreatedBuildingPainted(page, state.buildingType);
  const selected = await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    return parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
  });
  if (selected?.id !== state.targetBuildingId || selected.damageState !== state.damageState || selected.repairState !== "none") {
    throw new Error(`Damaged render hook state diverged from damage hook result: ${JSON.stringify({ state, selected })}`);
  }
  return { ...state, selected };
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
  if (
    state.damagedSnapshot?.damageState === "intact" ||
    state.repairQueuedSnapshot?.repairState !== "repairing" ||
    state.repairedSnapshot?.damageState !== "intact" ||
    state.repairedSnapshot?.repairState !== "recently_repaired" ||
    state.repairedSnapshot?.healthPct !== 100
  ) {
    throw new Error(`Repair order did not expose damaged -> repairing -> repaired durability states: ${JSON.stringify(state)}`);
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
  const selected = await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    const selectedBuilding = parsed.visibleBuildings.find((building) => building.id === parsed.selected.buildingId);
    const panel = document.querySelector("#selectedPanel")?.textContent ?? "";
    return { selectedBuilding, panel };
  });
  if (
    selected.selectedBuilding?.id !== state.targetBuildingId ||
    selected.selectedBuilding.damageState !== "intact" ||
    selected.selectedBuilding.repairState !== "recently_repaired" ||
    !selected.panel.includes("Condition: intact") ||
    !selected.panel.includes("repair recently repaired")
  ) {
    throw new Error(`Repaired selected building did not expose repaired visual state: ${JSON.stringify({ state, selected })}`);
  }
  return state;
}

async function assertRepairUnderFire(page) {
  const state = await page.evaluate(() => {
    if (typeof window.force_repair_under_fire_for_test !== "function") return { ok: false, reason: "missing repair-under-fire hook" };
    return window.force_repair_under_fire_for_test();
  });
  if (!state.ok || state.interrupted !== true || state.completed !== false || typeof state.beforeHp !== "number" || typeof state.afterHp !== "number") {
    throw new Error(`Repair-under-fire hook did not expose interrupted incomplete repair: ${JSON.stringify(state)}`);
  }
  if (state.afterHp > state.beforeHp) {
    throw new Error(`Repair-under-fire increased building health despite hostile pressure: ${JSON.stringify(state)}`);
  }
  if (!state.repairerTasks?.some((task) => task.includes("Repairing wall test_repair_fire_wall"))) {
    throw new Error(`Repair-under-fire hook did not start from repair tasks: ${JSON.stringify(state)}`);
  }
  if (!state.interruptedEvents?.some((event) => event.includes("REPAIR_UNDER_FIRE_INTERRUPTED") && event.includes("test_repair_fire_wall"))) {
    throw new Error(`Repair-under-fire hook did not emit interruption evidence: ${JSON.stringify(state)}`);
  }
  if (!state.selectedPanel?.includes("Condition:") || !state.selectedPanel.includes("Repair cost:")) {
    throw new Error(`Repair-under-fire selected panel did not expose damaged structure state: ${JSON.stringify(state)}`);
  }
  const overlayState = await page.evaluate(() => {
    const parsed = JSON.parse(window.render_game_to_text());
    return {
      markers: parsed.boardReadability?.fortificationOverlay?.visualOverlayMarkers,
      wars: parsed.tribes?.map((tribe) => ({ id: tribe.id, wars: tribe.wars }))
    };
  });
  if (overlayState.markers?.warFrontMarkers < 1 || !overlayState.markers?.warFrontPairs?.some((pair) => pair.includes("blue") && pair.includes("red"))) {
    throw new Error(`Defense overlay did not expose the repair-under-fire war front: ${JSON.stringify({ state, overlayState })}`);
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
