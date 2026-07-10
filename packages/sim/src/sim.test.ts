import { describe, expect, it } from "vitest";
import { MAP_SIZE, TICKS_PER_GAME_YEAR, TICK_RATE, advanceGame, advanceGameTicks, appendSovereignMemory, applyTribeIdentity, assignGathering, attachReplyToPacket, buildStructure, buildingTypes, createGame, createResourceDeposit, damageBuilding, damageResourceDeposit, developmentCatalog, developmentIds, estimateBreachTicks, formAlliance, getBuildingCombatStats, getBuildingTypeCombatStats, getCombatStatCoverageReport, getCurrentYear, getBuildingCost, getBuildingRepairCost, getDevelopment, getEffectiveBuildingCost, getPacketItemCombatStats, getPacketItemTypeCombatStats, getPopulationCap, getProjectileTypeCombatStats, getRecentResourceDepletions, getRecentVisibleEvents, getResourceControlSummary, getResourceDepositCombatStats, getResourceDepositPosturesForTribe, getResourceTypeCombatStats, getTownHall, getTribeBuildingRepairCost, getUnitCombatStats, getUnitTypeCombatStats, getVictoryPressure, getVisibleBuildings, getVisibleUnits, isTileWalkable, isTribeActive, issueSovereignOrder, previewFortificationBuild, projectileTypes, recordAiDecision, renameUnits, resourceScarcityPolicy, resourceTypes, scarceMapResourceTypes, sendPlayerMessage, setAllControllers, setGateState, summarizeDiplomaticIntel, summarizeSovereignMemory, tileIndex, unitTypes, worldSignature } from "./index";

describe("Sovereign Worlds vertical slice simulation", () => {
  it("is deterministic for the same seed and elapsed time", () => {
    const a = createGame(42);
    const b = createGame(42);
    advanceGame(a, 60);
    advanceGame(b, 60);
    expect(worldSignature(a)).toEqual(worldSignature(b));
  });

  it("uses fresh random starts by default while preserving seeded resource replays", () => {
    const freshStarts = Array.from({ length: 4 }, () => createGame());
    expect(new Set(freshStarts.map((state) => state.seed)).size).toBeGreaterThan(1);
    expect(new Set(freshStarts.map((state) => resourcePlacementSignature(state))).size).toBeGreaterThan(1);

    const firstSeeded = createGame(2026070801);
    const secondSeeded = createGame(2026070801);
    expect(resourcePlacementSignature(firstSeeded)).toEqual(resourcePlacementSignature(secondSeeded));
  });

  it("exposes a full metadata-driven development tree with valid functional effects", () => {
    expect(developmentIds.length).toBeGreaterThanOrEqual(100);
    expect(new Set(developmentIds).size).toBe(developmentIds.length);

    for (const developmentId of developmentIds) {
      const development = getDevelopment(developmentId);
      expect(developmentCatalog[developmentId]).toBeTruthy();
      expect(development.id).toBe(developmentId);
      expect(development.name.length).toBeGreaterThan(0);
      expect(development.category).toBeTruthy();
      expect(development.phase).toBeTruthy();
      expect(development.aliases.length).toBeGreaterThan(0);
      expect(development.tradeoffs.length).toBeGreaterThan(0);
      expect(development.synergies.length).toBeGreaterThan(0);
      expect(development.socialCosts.length).toBeGreaterThan(0);
      expect(Object.values(development.cost).every((amount) => Number.isFinite(amount) && amount >= 0)).toBe(true);
      expect(development.effects.length).toBeGreaterThan(0);
      for (const effect of development.effects) {
        expect(effect.description.length).toBeGreaterThan(0);
        expect(Number.isFinite(effect.amount)).toBe(true);
      }
      for (const prerequisite of development.prerequisites) {
        expect(developmentCatalog[prerequisite], `${developmentId} prerequisite ${prerequisite}`).toBeTruthy();
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (developmentId: string): void => {
      if (visited.has(developmentId)) return;
      expect(visiting.has(developmentId), `cycle at ${developmentId}`).toBe(false);
      visiting.add(developmentId);
      for (const prerequisite of developmentCatalog[developmentId].prerequisites) visit(prerequisite);
      visiting.delete(developmentId);
      visited.add(developmentId);
    };
    for (const developmentId of developmentIds) visit(developmentId);

    expect(developmentIds.some((id) => id.startsWith("sw_042_"))).toBe(true);
    expect(developmentIds.some((id) => id.startsWith("sw_098_"))).toBe(true);
    expect(developmentIds.some((id) => id.startsWith("sw_129_"))).toBe(true);
    expect(getDevelopment("forced_labor").socialCosts.join(" ")).toMatch(/legitimacy|coercion|happiness/i);
    expect(getDevelopment("taxation").tradeoffs.join(" ")).toMatch(/burdens|wealth|gold|resentment/i);
    expect(getDevelopment("military_architecture").synergies.join(" ")).toMatch(/fortification|wall|turret|military/i);

    const cloned = getDevelopment("masonry");
    const originalAmount = getDevelopment("masonry").effects[0].amount;
    cloned.effects[0].amount = 9999;
    expect(getDevelopment("masonry").effects[0].amount).toBe(originalAmount);
    cloned.aliases[0] = "mutated alias";
    cloned.tradeoffs[0] = "mutated tradeoff";
    cloned.synergies[0] = "mutated synergy";
    cloned.socialCosts[0] = "mutated social cost";
    expect(getDevelopment("masonry").aliases[0]).not.toBe("mutated alias");
    expect(getDevelopment("masonry").tradeoffs[0]).not.toBe("mutated tradeoff");
    expect(getDevelopment("masonry").synergies[0]).not.toBe("mutated synergy");
    expect(getDevelopment("masonry").socialCosts[0]).not.toBe("mutated social cost");
  });

  it("specializes generated roadmap effects by institution semantics", () => {
    const signature = (developmentId: string) =>
      getDevelopment(developmentId)
        .effects.map((effect) => `${effect.kind}:${effect.target ?? "all"}:${effect.amount}:${effect.description}`)
        .sort();

    const fixedTaxation = getDevelopment("sw_042_fixed_taxation");
    const tradeCorridor = getDevelopment("sw_045_trade_tariff_corridor");
    const slaveryRegistration = getDevelopment("sw_059_slavery_registration");

    expect(signature(fixedTaxation.id)).not.toEqual(signature(tradeCorridor.id));
    expect(signature(fixedTaxation.id)).not.toEqual(signature(slaveryRegistration.id));
    expect(fixedTaxation.effects.some((effect) => effect.kind === "yearly_gold_per_population" && /Tax design/.test(effect.description))).toBe(true);
    expect(tradeCorridor.effects.some((effect) => effect.kind === "unit_speed" && effect.target === "courier")).toBe(true);
    expect(tradeCorridor.effects.some((effect) => effect.kind === "resource_control")).toBe(true);
    expect(slaveryRegistration.effects.some((effect) => effect.kind === "construction_cost_multiplier" && effect.amount < 0)).toBe(true);
    expect(slaveryRegistration.effects.some((effect) => effect.kind === "yearly_happiness" && effect.amount < 0)).toBe(true);
  });

  it("keeps distant enemy units out of the player visibility projection", () => {
    const state = createGame(7);
    const visible = getVisibleUnits(state, "blue");
    expect(visible.some((unit) => unit.tribeId === "red")).toBe(false);
  });

  it("lets housing raise population capacity and unlock recruitment beyond the base cap", () => {
    const state = createGame(701);
    setAllControllers(state, "human");
    state.tribes.blue.resources = { gold: 5000, food: 5000, wood: 5000, stone: 5000, clay: 5000, limestone: 5000, iron: 5000, coal: 5000 };
    const baseCap = state.tribes.blue.populationCap;
    expect(getPopulationCap(state, "blue")).toBe(baseCap + 8);

    while (Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.hp > 0).length < getPopulationCap(state, "blue")) {
      const result = issueSovereignOrder(state, "blue", { type: "RECRUIT", priority: 1, unitType: "peon", reason: "Fill current housing capacity." });
      expect(result.ok).toBe(true);
    }

    const capped = issueSovereignOrder(state, "blue", { type: "RECRUIT", priority: 1, unitType: "peon", reason: "Try to grow past housing." });
    if (capped.ok) throw new Error("Expected recruitment to fail at population capacity");
    expect(capped.reason).toContain("Population cap reached");

    const townHall = getTownHall(state, "blue");
    const house = buildStructure(state, "blue", "house", townHall);
    expect(house.ok).toBe(true);
    expect(getPopulationCap(state, "blue")).toBe(baseCap + 16);

    const recruited = issueSovereignOrder(state, "blue", { type: "RECRUIT", priority: 1, unitType: "peon", reason: "Use the new housing capacity." });
    expect(recruited.ok).toBe(true);
  });

  it("grows population yearly when food, happiness, safety, and capacity allow it", () => {
    const state = createGame(702);
    setAllControllers(state, "human");
    state.tribes.blue.resources.food = 1000;
    state.tribes.blue.happiness = 82;
    const before = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.hp > 0).length;

    advanceGameTicks(state, TICKS_PER_GAME_YEAR);

    const after = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.hp > 0).length;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(getPopulationCap(state, "blue"));
    expect(state.events.some((event) => event.type === "POPULATION_GROWTH" && event.title.includes(state.tribes.blue.name))).toBe(true);
  });

  it("keeps zero-health buildings out of visibility projections", () => {
    const state = createGame(14);
    const townHall = getTownHall(state, "blue");
    expect(getVisibleBuildings(state, "blue").some((building) => building.id === townHall.id)).toBe(true);
    townHall.hp = 0;
    expect(getVisibleBuildings(state, "blue").some((building) => building.id === townHall.id)).toBe(false);
  });

  it("records visible foreign unit and building changes per sovereign", () => {
    const state = createGame(9);
    setAllControllers(state, "human");
    expect(state.foreignObservations.blue).toHaveLength(0);

    const blueTownHall = getTownHall(state, "blue");
    const redPeon = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "peon");
    if (!redPeon) throw new Error("Expected Red peon");

    redPeon.x = blueTownHall.x + 2;
    redPeon.y = blueTownHall.y;
    redPeon.task = { kind: "idle" };
    advanceGameTicks(state, 5);

    expect(
      state.foreignObservations.blue.some(
        (observation) => observation.kind === "unit_seen" && observation.subjectTribeId === "red" && observation.subjectId === redPeon.id
      )
    ).toBe(true);

    redPeon.x = 120;
    redPeon.y = 120;
    redPeon.task = { kind: "idle" };
    advanceGameTicks(state, 5);

    expect(
      state.foreignObservations.blue.some(
        (observation) => observation.kind === "unit_lost" && observation.subjectTribeId === "red" && observation.subjectId === redPeon.id
      )
    ).toBe(true);

    const built = buildStructure(state, "red", "watchtower", { x: blueTownHall.x + 3, y: blueTownHall.y });
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Expected Red watchtower to be built");

    expect(
      state.foreignObservations.blue.some(
        (observation) => observation.kind === "building_seen" && observation.subjectTribeId === "red" && observation.subjectId === built.buildingId
      )
    ).toBe(true);

    const destroyed = damageBuilding(state, built.buildingId, 999, "blue");
    expect(destroyed.ok).toBe(true);

    expect(
      state.foreignObservations.blue.some(
        (observation) => observation.kind === "building_lost" && observation.subjectTribeId === "red" && observation.subjectId === built.buildingId
      )
    ).toBe(true);
  });

  it("starts units with neutral ids so AI names come from identity generation", () => {
    const state = createGame(8);
    const startingUnits = Object.values(state.units);
    expect(startingUnits.length).toBeGreaterThan(0);
    expect(startingUnits.every((unit) => unit.name === unit.id)).toBe(true);
  });

  it("exposes health, armor, attack, and range stats on all units, buildings, map items, and carried packets", () => {
    const state = createGame(10);
    state.tribes.blue.resources = { gold: 800, food: 800, wood: 800, stone: 800, clay: 800, limestone: 800, iron: 800, coal: 800 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock durability-test walls." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock durability-test gates." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ballistics", reason: "Unlock durability-test turrets." }).ok).toBe(true);
    const townHall = getTownHall(state, "blue");
    for (const buildingType of ["wall", "gate", "turret"] as const) {
      const built = buildStructure(state, "blue", buildingType, townHall);
      expect(built.ok).toBe(true);
    }
    for (const unitType of unitTypes) {
      const stats = getUnitTypeCombatStats(unitType);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBe(stats.maxHp);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.range).toBeGreaterThanOrEqual(0);
      expect(stats.attackCooldown).toBeGreaterThanOrEqual(0);
      if (stats.attack > 0) expect(stats.range).toBeGreaterThan(0);
    }
    for (const buildingType of buildingTypes) {
      const stats = getBuildingTypeCombatStats(buildingType);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBe(stats.maxHp);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.range).toBeGreaterThanOrEqual(0);
      expect(stats.attackCooldown).toBeGreaterThanOrEqual(0);
      if (stats.attack > 0) expect(stats.range).toBeGreaterThan(0);
    }
    for (const resourceType of resourceTypes) {
      const stats = getResourceTypeCombatStats(resourceType, 12);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBe(stats.maxHp);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBe(0);
      expect(stats.range).toBe(0);
      expect(stats.attackCooldown).toBe(0);
    }
    const packetTypeStats = getPacketItemTypeCombatStats();
    expect(packetTypeStats.maxHp).toBeGreaterThan(0);
    expect(packetTypeStats.hp).toBe(packetTypeStats.maxHp);
    expect(packetTypeStats.armor).toBeGreaterThanOrEqual(0);
    expect(packetTypeStats.attack).toBe(0);
    expect(packetTypeStats.range).toBe(0);
    expect(packetTypeStats.attackCooldown).toBe(0);
    for (const projectileType of projectileTypes) {
      const stats = getProjectileTypeCombatStats(projectileType);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBe(stats.maxHp);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.range).toBeGreaterThanOrEqual(0);
      expect(stats.attackCooldown).toBeGreaterThanOrEqual(0);
      if (stats.attack > 0) expect(stats.range).toBeGreaterThan(0);
    }
    for (const unit of Object.values(state.units)) {
      const stats = getUnitCombatStats(unit);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.range).toBeGreaterThanOrEqual(0);
      expect(stats.attackCooldown).toBeGreaterThanOrEqual(0);
    }
    for (const building of Object.values(state.buildings)) {
      const stats = getBuildingCombatStats(building);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.range).toBeGreaterThanOrEqual(0);
      expect(stats.attackCooldown).toBeGreaterThanOrEqual(0);
    }
    const deposits = state.map.flatMap((tile) => (tile.resource ? [tile.resource] : []));
    expect(deposits.length).toBeGreaterThan(0);
    for (const deposit of deposits) {
      const stats = getResourceDepositCombatStats(deposit);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
      expect(stats.attack).toBe(0);
      expect(stats.range).toBe(0);
      expect(stats.attackCooldown).toBe(0);
    }
    const sent = sendPlayerMessage(state, "green", "peace");
    expect(sent.ok).toBe(true);
    if (!sent.ok) throw new Error("Expected packet dispatch");
    const packet = state.packets[sent.packetId];
    expect(packet.itemType).toBe("packet");
    const packetStats = getPacketItemCombatStats(packet);
    expect(packetStats.maxHp).toBeGreaterThan(0);
    expect(packetStats.hp).toBe(packetStats.maxHp);
    expect(packetStats.armor).toBeGreaterThanOrEqual(0);
    expect(packetStats.attack).toBe(0);
    expect(packetStats.range).toBe(0);
    expect(packetStats.attackCooldown).toBe(0);
    const coverage = getCombatStatCoverageReport(state);
    expect(coverage.ok).toBe(true);
    expect(coverage.byKind.unitType).toBe(unitTypes.length);
    expect(coverage.byKind.buildingType).toBe(buildingTypes.length);
    expect(coverage.byKind.resourceType).toBe(resourceTypes.length);
    expect(coverage.byKind.projectileType).toBe(projectileTypes.length);
    expect(coverage.byKind.packet).toBeGreaterThanOrEqual(2);
    const defensiveTypes = new Set(Object.values(state.buildings).filter((building) => building.tribeId === "blue").map((building) => building.type));
    expect(defensiveTypes.has("wall")).toBe(true);
    expect(defensiveTypes.has("gate")).toBe(true);
    expect(defensiveTypes.has("turret")).toBe(true);
  });

  it("moves a player message through delivery, reply, and return", () => {
    const state = createGame(11);
    const result = sendPlayerMessage(state, "green", "peace");
    expect(result.ok).toBe(true);
    advanceGame(state, 260);
    const completed = Object.values(state.packets).some((packet) => packet.originTribeId === "blue" && packet.recipientTribeId === "green" && packet.state === "COMPLETED");
    const replyRead = Object.values(state.messages).some((message) => message.originTribeId === "green" && message.recipientTribeId === "blue" && message.readTick !== undefined);
    expect(completed).toBe(true);
    expect(replyRead).toBe(true);
  });

  it("keeps a per-sovereign diplomatic intelligence ledger without exposing sealed replies early", () => {
    const state = createGame(13);
    setAllControllers(state, "llm");
    const sent = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "LETTER",
      diplomacyIntent: "PEACE_OFFER",
      subject: "South road question",
      body: "Can Green report whether the south road is safe enough for grain trade?",
      reason: "Ask a concrete question for the diplomatic ledger."
    });
    expect(sent.ok).toBe(true);
    expect(summarizeDiplomaticIntel(state, "blue")).toContain("you to Green Vale question PEACE_OFFER");
    expect(summarizeDiplomaticIntel(state, "green")).toBe("none");

    advanceGame(state, 220);
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
    if (!packet) throw new Error("Expected Blue to Green packet");
    expect(packet.state).toBe("AWAITING_REPLY");
    expect(summarizeDiplomaticIntel(state, "green")).toContain("Blue Crown to you question PEACE_OFFER");

    const replyBody = "Green claims the south road is calm but asks Blue to reveal grain reserves first.";
    const reply = attachReplyToPacket(state, packet.id, {
      subject: "Re: South road question",
      body: replyBody,
      diplomacyIntent: "PEACE_OFFER"
    });
    expect(reply.ok).toBe(true);
    expect(summarizeDiplomaticIntel(state, "green")).toContain("you to Blue Crown question PEACE_OFFER");
    expect(summarizeDiplomaticIntel(state, "blue")).not.toContain(replyBody);

    advanceGame(state, 220);
    expect(state.packets[packet.id].state).toBe("COMPLETED");
    const blueIntel = summarizeDiplomaticIntel(state, "blue");
    expect(blueIntel).toContain(replyBody);
    expect(blueIntel).toContain("unverified, may be false");
  });

  it("protects packet-carrying messengers so hostile borders can still host diplomacy", () => {
    const state = createGame(12);
    const result = sendPlayerMessage(state, "red", "peace");
    expect(result.ok).toBe(true);
    advanceGame(state, 320);
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "red");
    expect(packet?.state).toBe("COMPLETED");
    expect(Object.values(state.messages).some((message) => message.originTribeId === "red" && message.recipientTribeId === "blue" && message.readTick !== undefined)).toBe(true);
  });

  it("can run five scripted tribes unattended for ten simulated minutes", () => {
    const state = createGame(2026);
    advanceGame(state, 600);
    const livingUnits = Object.values(state.units).filter((unit) => unit.hp > 0);
    const dispatchedPackets = Object.values(state.packets).length;
    expect(state.tick).toBe(6000);
    expect(livingUnits.length).toBeGreaterThan(20);
    expect(dispatchedPackets).toBeGreaterThan(0);
  });

  it("validates and records sovereign AI orders", () => {
    const state = createGame(81);
    const result = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "red",
      messageType: "TREATY_PROPOSAL",
      subject: "Road peace",
      body: "Blue Crown proposes safe messenger passage.",
      reason: "Test physical diplomacy."
    });
    expect(result.ok).toBe(true);
    const stored = recordAiDecision(state, {
      tribeId: "blue",
      provider: "ollama",
      model: "test-model",
      strategySummary: "Open diplomacy while scouting.",
      orders: [],
      accepted: [result.ok ? result.summary : ""],
      rejected: []
    });
    expect(stored.provider).toBe("ollama");
    expect(Object.values(state.packets).some((packet) => packet.originTribeId === "blue" && packet.recipientTribeId === "red")).toBe(true);
  });

  it("rejects messenger orders to eliminated populations", () => {
    const state = createGame(83);
    state.tribes.red.eliminated = true;
    state.tribes.red.eliminatedYear = 100;
    const result = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "red",
      messageType: "LETTER",
      subject: "Are you alive?",
      body: "Blue Crown looks for a surviving court.",
      reason: "Do not create dead-end diplomacy with an eliminated population."
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("has been eliminated");
    expect(Object.values(state.packets).some((packet) => packet.recipientTribeId === "red")).toBe(false);
  });

  it("normalizes empty AI decision summaries before storing them", () => {
    const state = createGame(82);
    const stored = recordAiDecision(state, {
      tribeId: "green",
      provider: "ollama",
      model: "gpt-oss:20b",
      strategySummary: "",
      memoryNote: "",
      freeformStrategy: "",
      orders: [],
      accepted: ["DEVELOP: developed Masonry"],
      rejected: []
    });

    expect(stored.strategySummary).toBe("DEVELOP: developed Masonry");
    expect(state.aiDecisions.at(-1)?.strategySummary).toBe("DEVELOP: developed Masonry");
  });

  it("keeps per-sovereign decision cursors after the bounded global decision log rotates", () => {
    const state = createGame(84);
    const blueMove = recordAiDecision(state, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      strategySummary: "Blue old road doctrine.",
      memoryNote: "Blue should remember this after the public log rotates.",
      freeformStrategy: "Hold the western road.",
      orders: [],
      accepted: ["SET_POLICY: hold road"],
      rejected: []
    });

    for (let index = 0; index < 45; index += 1) {
      advanceGameTicks(state, 1);
      recordAiDecision(state, {
        tribeId: "red",
        provider: "ollama",
        model: "qwen3.5:9b-mlx",
        strategySummary: `Red rotation filler ${index}.`,
        memoryNote: "",
        freeformStrategy: "Fill the bounded global decision log.",
        orders: [],
        accepted: ["SET_POLICY: rotate"],
        rejected: []
      });
    }

    expect(state.aiDecisions).toHaveLength(40);
    expect(state.aiDecisions.some((decision) => decision.id === blueMove.id)).toBe(false);
    expect(state.sovereignDecisionCursors.blue.lastMove?.id).toBe(blueMove.id);
    expect(state.sovereignDecisionCursors.blue.lastStrategy?.id).toBe(blueMove.id);
  });

  it("keeps bounded private sovereign strategy memory", () => {
    const state = createGame(82);
    recordAiDecision(state, {
      tribeId: "blue",
      provider: "ollama",
      model: "test-model",
      strategySummary: "Promise peace while preparing walls.",
      memoryNote: "Privately distrust Red Banner; promise peace while building walls.",
      orders: [],
      accepted: [],
      rejected: []
    });
    expect(state.sovereignMemories.blue.notes).toEqual(["Privately distrust Red Banner; promise peace while building walls."]);
    expect(summarizeSovereignMemory(state, "blue")).toContain("Privately distrust Red Banner");

    appendSovereignMemory(state, "blue", "Privately distrust Red Banner; promise peace while building walls.");
    expect(state.sovereignMemories.blue.notes).toHaveLength(1);

    for (let index = 0; index < 10; index += 1) {
      appendSovereignMemory(state, "blue", `Long term plan ${index}: keep a private grudge and build leverage.`);
    }
    expect(state.sovereignMemories.blue.notes).toHaveLength(8);
    expect(state.sovereignMemories.blue.notes[0]).toContain("Long term plan 2");
    expect(state.sovereignMemories.blue.notes.at(-1)).toContain("Long term plan 9");
  });

  it("lets an AI choose a sovereign identity and rename only its own units", () => {
    const state = createGame(88);
    const identity = applyTribeIdentity(state, "green", {
      realmName: "Avalon Green March",
      sovereignName: "Morgaine of the March",
      namingStyle: "Arthurian forest court names",
      inspiration: "Arthurian romance and medieval chronicles"
    });
    expect(identity.ok).toBe(true);
    expect(state.tribes.green.name).toBe("Avalon Green March");
    expect(state.tribes.green.sovereignName).toBe("Morgaine of the March");
    expect(state.tribes.green.identityChosen).toBe(true);
    const greenUnit = Object.values(state.units).find((unit) => unit.tribeId === "green" && unit.type === "peon");
    const redUnit = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "peon");
    if (!greenUnit || !redUnit) throw new Error("Expected starting units");
    const renamed = renameUnits(state, "green", [
      { unitId: greenUnit.id, name: "Rowan of Fernbank" },
      { unitId: redUnit.id, name: "Stolen Name" }
    ]);
    expect(renamed.accepted).toHaveLength(1);
    expect(renamed.rejected).toHaveLength(1);
    expect(state.units[greenUnit.id].name).toBe("Rowan of Fernbank");
    expect(state.units[redUnit.id].name).not.toBe("Stolen Name");
  });

  it("rejects duplicate AI realm and sovereign identities", () => {
    const state = createGame(89);
    const first = applyTribeIdentity(state, "green", {
      realmName: "Oakhaven",
      sovereignName: "Thorgar the Unyielding",
      namingStyle: "forest court names",
      inspiration: "old chronicles"
    });
    expect(first.ok).toBe(true);

    const duplicateRealm = applyTribeIdentity(state, "yellow", {
      realmName: "Oakhaven",
      sovereignName: "Varian the Iron-Grip",
      namingStyle: "frontier ridge names",
      inspiration: "border epics"
    });
    expect(duplicateRealm.ok).toBe(false);
    if (!duplicateRealm.ok) expect(duplicateRealm.reason).toContain("duplicates");
    expect(state.tribes.yellow.identityChosen).toBe(false);

    const duplicateSovereign = applyTribeIdentity(state, "yellow", {
      realmName: "Ocher Ridge",
      sovereignName: "Thorgar the Unyielding",
      namingStyle: "frontier ridge names",
      inspiration: "border epics"
    });
    expect(duplicateSovereign.ok).toBe(false);
    if (!duplicateSovereign.ok) expect(duplicateSovereign.reason).toContain("duplicates");
    expect(state.tribes.yellow.identityChosen).toBe(false);
  });

  it("rejects default placeholder identities as AI choices", () => {
    const state = createGame(90);

    const defaultRealm = applyTribeIdentity(state, "green", {
      realmName: "Green Vale",
      sovereignName: "Kaelen the Verdant",
      namingStyle: "nature",
      inspiration: "forest epics"
    });

    expect(defaultRealm.ok).toBe(false);
    if (!defaultRealm.ok) expect(defaultRealm.reason).toContain("reserved placeholder");
    expect(state.tribes.green.name).toBe("Green Vale");
    expect(state.tribes.green.identityChosen).toBe(false);

    const defaultSovereign = applyTribeIdentity(state, "green", {
      realmName: "Verdant Canopy",
      sovereignName: "Green Vale Sovereign",
      namingStyle: "nature",
      inspiration: "forest epics"
    });

    expect(defaultSovereign.ok).toBe(false);
    if (!defaultSovereign.ok) expect(defaultSovereign.reason).toContain("reserved placeholder");
    expect(state.tribes.green.identityChosen).toBe(false);
  });

  it("limits each sovereign AI to one alliance partner", () => {
    const state = createGame(91);
    const first = formAlliance(state, "blue", "red");
    expect(first.ok).toBe(true);
    expect(state.alliances.blue).toBe("red");
    expect(state.alliances.red).toBe("blue");

    const repeat = formAlliance(state, "blue", "red");
    expect(repeat.ok).toBe(true);

    const second = issueSovereignOrder(state, "blue", {
      type: "PROPOSE_ALLIANCE",
      priority: 1,
      recipientTribeId: "green",
      subject: "Second pact",
      body: "Blue Crown asks for another alliance.",
      reason: "Test alliance cap."
    });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("Second alliance unexpectedly accepted");
    expect(second.reason).toContain("already has an alliance");
    expect(state.alliances.green).toBeUndefined();
  });

  it("makes walls block movement until they are destroyed", () => {
    const state = createGame(93);
    const townHall = getTownHall(state, "blue");
    const locked = buildStructure(state, "blue", "wall", townHall);
    expect(locked.ok).toBe(false);
    if (locked.ok) throw new Error("Wall unexpectedly built before Masonry");
    expect(locked.reason).toContain("Masonry");
    const developed = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "masonry",
      reason: "Unlock wall construction."
    });
    expect(developed.ok).toBe(true);
    const before = { ...state.tribes.blue.resources };
    const built = buildStructure(state, "blue", "wall", townHall);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    expect(state.tribes.blue.resources.wood).toBe(before.wood - 20);
    expect(state.tribes.blue.resources.stone).toBe(before.stone - 30);
    expect(state.tribes.blue.resources.clay).toBe(before.clay - 25);
    expect(state.tribes.blue.resources.limestone).toBe(before.limestone - 15);
    expect(isTileWalkable(state, wall.x, wall.y)).toBe(false);
    expect(wall.armor).toBe(6);
    const scratched = damageBuilding(state, wall.id, 7, "red");
    expect(scratched.ok).toBe(true);
    expect(scratched.ok && scratched.destroyed).toBe(false);
    expect(state.buildings[wall.id].hp).toBe(wall.maxHp - 1);

    const damaged = damageBuilding(state, wall.id, 999, "red");
    expect(damaged.ok).toBe(true);
    expect(damaged.ok && damaged.destroyed).toBe(true);
    expect(isTileWalkable(state, wall.x, wall.y)).toBe(true);
  });

  it("lets hostile units destroy walls through normal combat", () => {
    const state = createGame(936);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    const developed = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "masonry",
      reason: "Unlock wall construction."
    });
    expect(developed.ok).toBe(true);
    const built = buildStructure(state, "blue", "wall", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    wall.x = 50;
    wall.y = 50;
    wall.hp = 2;
    state.map[tileIndex(wall.x, wall.y)].terrain = "grass";
    const attacker = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!attacker) throw new Error("Expected Red militia");
    attacker.x = wall.x + 1;
    attacker.y = wall.y;
    attacker.task = { kind: "idle" };

    advanceGameTicks(state, 30);

    expect(state.buildings[wall.id]).toBeUndefined();
    expect(isTileWalkable(state, wall.x, wall.y)).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_DESTROYED" && event.title.includes("wall"))).toBe(true);
  });

  it("lets a sovereign repair a damaged owned wall with idle peons", () => {
    const state = createGame(937);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock wall repair test structure." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "wall", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    wall.hp = wall.maxHp - 40;
    const beforeHp = wall.hp;
    const cost = getBuildingRepairCost(wall);
    const beforeResources = { ...state.tribes.blue.resources };
    const repairers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "peon").slice(0, 2);
    for (const [index, peon] of repairers.entries()) {
      peon.x = wall.x + 1;
      peon.y = wall.y + index;
      peon.task = { kind: "idle" };
    }

    const repaired = issueSovereignOrder(state, "blue", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: wall.id,
      siegeIntent: "repair under fire preparation",
      repairPlan: "Assign two peons to restore the wall before militia move through the exposed road.",
      reason: "Restore the damaged wall before a breach."
    });

    expect(repaired.ok).toBe(true);
    expect(state.tribes.blue.resources.stone).toBe(beforeResources.stone - (cost.stone ?? 0));
    expect(state.tribes.blue.resources.clay).toBe(beforeResources.clay - (cost.clay ?? 0));
    expect(state.tribes.blue.resources.limestone).toBe(beforeResources.limestone - (cost.limestone ?? 0));
    const repairPlan = state.siegePlans.at(-1);
    expect(repairPlan).toMatchObject({
      tribeId: "blue",
      kind: "repair",
      targetBuildingId: wall.id,
      siegeIntent: "repair under fire preparation",
      repairPlan: "Assign two peons to restore the wall before militia move through the exposed road."
    });
    expect(repairers.some((unit) => unit.task.kind === "repair" && unit.task.targetBuildingId === wall.id && unit.task.siegePlanId === repairPlan?.id)).toBe(true);

    advanceGameTicks(state, 30);

    expect(state.buildings[wall.id].hp).toBe(wall.maxHp);
    expect(state.buildings[wall.id].hp).toBeGreaterThan(beforeHp);
    expect(repairers.every((unit) => unit.task.kind === "idle")).toBe(true);
    expect(state.events.some((event) => event.type === "AI_REPAIR_ORDER" && event.body.includes(wall.id))).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_REPAIRED" && event.body.includes(wall.id))).toBe(true);
  });

  it("interrupts repair crews while hostile units pressure the work site", () => {
    const state = createGame(938);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock wall repair test structure." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "wall", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    wall.x = 50;
    wall.y = 50;
    wall.hp = wall.maxHp - 80;
    for (const pos of [
      { x: 49, y: 50 },
      { x: 50, y: 50 },
      { x: 51, y: 50 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const repairers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "peon").slice(0, 2);
    expect(repairers.length).toBe(2);
    for (const [index, peon] of repairers.entries()) {
      peon.x = 49;
      peon.y = 50 + index;
      peon.task = { kind: "idle" };
    }
    const hostile = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!hostile) throw new Error("Expected red militia");
    hostile.x = 51;
    hostile.y = 50;
    hostile.task = { kind: "idle" };
    state.wars.blue.red = true;
    state.wars.red.blue = true;
    const beforeHp = wall.hp;

    const repaired = issueSovereignOrder(state, "blue", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: wall.id,
      siegeIntent: "repair under hostile pressure",
      repairPlan: "Try to hold repairs until militia can clear the work site.",
      reason: "Attempt repair while enemies are at the breach."
    });

    expect(repaired.ok).toBe(true);
    const repairPlan = state.siegePlans.at(-1);
    expect(repairPlan).toMatchObject({
      tribeId: "blue",
      kind: "repair",
      targetBuildingId: wall.id,
      siegeIntent: "repair under hostile pressure",
      repairPlan: "Try to hold repairs until militia can clear the work site."
    });

    advanceGameTicks(state, 2);

    expect(state.buildings[wall.id].hp).toBeLessThanOrEqual(beforeHp);
    expect(repairers.some((unit) => unit.task.kind === "repair" && unit.task.lastInterruptedTick !== undefined)).toBe(true);
    expect(state.events.some((event) => event.type === "REPAIR_UNDER_FIRE_INTERRUPTED" && event.body.includes(wall.id))).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_REPAIRED" && event.body.includes(wall.id))).toBe(false);

    hostile.hp = 0;
    const interruptedHp = state.buildings[wall.id].hp;
    advanceGameTicks(state, 3);
    expect(state.buildings[wall.id].hp).toBeGreaterThan(interruptedHp);
  });

  it("lets an authored siege interdict hostile repair crews on the exact target", () => {
    const state = createGame(2026070902);
    state.tribes.red.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "red", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock wall repair test structure." }).ok).toBe(true);
    const built = buildStructure(state, "red", "wall", getTownHall(state, "red"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    wall.x = 70;
    wall.y = 70;
    wall.hp = wall.maxHp - 100;
    for (const pos of [
      { x: 68, y: 70 },
      { x: 69, y: 70 },
      { x: 69, y: 71 },
      { x: 70, y: 70 },
      { x: 70, y: 71 },
      { x: 71, y: 70 },
      { x: 71, y: 71 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const repairers = Object.values(state.units).filter((unit) => unit.tribeId === "red" && unit.type === "peon").slice(0, 2);
    expect(repairers.length).toBe(2);
    for (const [index, peon] of repairers.entries()) {
      peon.x = 70;
      peon.y = 71 + index * 0.2;
      peon.hp = peon.maxHp;
      peon.task = { kind: "idle" };
    }
    const repairOrder = issueSovereignOrder(state, "red", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: wall.id,
      repairPlan: "Keep workers on the breach until Blue is forced away.",
      reason: "Test contested repair target."
    });
    expect(repairOrder.ok).toBe(true);
    const firstRepairer = repairers[0];
    const beforeRepairerHp = firstRepairer.hp;
    const blueMilitia = Object.values(state.units)
      .filter((unit) => unit.tribeId === "blue" && unit.type === "militia")
      .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!blueMilitia) throw new Error("Expected a blue militia");
    blueMilitia.x = 69;
    blueMilitia.y = 71;
    blueMilitia.hp = blueMilitia.maxHp;
    blueMilitia.attackCooldown = 0;
    blueMilitia.task = { kind: "idle" };

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      recipientTribeId: "red",
      targetBuildingId: wall.id,
      interdictRepairs: true,
      repairInterdictionRadius: 4,
      repairInterdictionPlan: "Stop the repair crew at the breach before returning to the wall.",
      siegeIntent: "counter Red's emergency repairs at the exact breach.",
      reason: "Test authored repair interdiction."
    });

    expect(attack.ok).toBe(true);
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      tribeId: "blue",
      kind: "attack",
      targetBuildingId: wall.id,
      interdictRepairs: true,
      repairInterdictionRadius: 4,
      repairInterdictionPlan: "Stop the repair crew at the breach before returning to the wall."
    });
    expect(blueMilitia.task).toMatchObject({
      kind: "attackBuilding",
      targetBuildingId: wall.id,
      interdictRepairs: true,
      repairInterdictionPlan: "Stop the repair crew at the breach before returning to the wall."
    });
    expect(state.events.some((event) => event.type === "SIEGE_REPAIR_INTERDICTION_ORDERED" && event.body.includes(siegePlan?.id ?? ""))).toBe(true);

    advanceGameTicks(state, 2);

    expect(firstRepairer.hp).toBeLessThan(beforeRepairerHp);
    expect(state.events.some((event) => event.type === "REPAIR_UNDER_FIRE_INTERRUPTED" && event.body.includes(wall.id))).toBe(true);
  });

  it("applies development effects as capabilities instead of scripted strategy", () => {
    const state = createGame(2026070601);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock stonework." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "wall", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Wall unexpectedly failed to build");
    const wall = state.buildings[built.buildingId];
    const baseWall = { maxHp: wall.maxHp, armor: wall.armor };

    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "brick_kilns", reason: "Adopt stronger fired brickwork." }).ok).toBe(true);
    expect(state.buildings[wall.id].maxHp).toBeGreaterThan(baseWall.maxHp);
    expect(state.buildings[wall.id].armor).toBeGreaterThan(baseWall.armor);

    state.buildings[wall.id].hp = state.buildings[wall.id].maxHp - 180;
    const baseRepair = getBuildingRepairCost(state.buildings[wall.id]);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "public_works", reason: "Create repair crews." }).ok).toBe(true);
    const publicRepair = getTribeBuildingRepairCost(state, "blue", state.buildings[wall.id]);
    expect(publicRepair.stone ?? 0).toBeLessThan(baseRepair.stone ?? 0);

    const farmCostBefore = getEffectiveBuildingCost(state, "blue", "farm");
    const happinessBeforeForcedLabor = state.tribes.blue.happiness;
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "taxation", reason: "Raise treasury capacity." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "forced_labor", reason: "Coerce labor for rapid works." }).ok).toBe(true);
    const farmCostAfter = getEffectiveBuildingCost(state, "blue", "farm");
    expect(farmCostAfter.wood ?? 0).toBeLessThan(farmCostBefore.wood ?? 0);
    expect(state.tribes.blue.happiness).toBeLessThan(happinessBeforeForcedLabor);
  });

  it("makes generated roadmap developments mechanically active", () => {
    const state = createGame(2026070603);
    state.tribes.blue.resources = { gold: 5000, food: 5000, wood: 5000, stone: 5000, clay: 5000, limestone: 5000, iron: 5000, coal: 5000 };

    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "taxation", reason: "Open tax institutions." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "sw_042_fixed_taxation", reason: "Adopt fixed taxation." }).ok).toBe(true);
    const goldBeforeYear = state.tribes.blue.resources.gold;
    advanceGameTicks(state, TICKS_PER_GAME_YEAR);
    expect(state.tribes.blue.resources.gold).toBeGreaterThan(goldBeforeYear);

    for (const developmentId of ["masonry", "ironworking", "ballistics", "military_architecture", "sw_127_fortress_walls"] as const) {
      const result = issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId, reason: `Adopt ${developmentId}.` });
      expect(result.ok).toBe(true);
    }
    const built = buildStructure(state, "blue", "wall", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Expected generated fortress-wall development to allow wall construction");
    expect(state.buildings[built.buildingId].maxHp).toBeGreaterThan(getBuildingTypeCombatStats("wall").maxHp + 100);

    const safetyBefore = getVictoryPressure(state).scoreByTribe.find((entry) => entry.tribeId === "blue")?.safety ?? 0;
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "council_governance", reason: "Open civic institutions." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "sw_123_code_of_criminal_law", reason: "Codify criminal law." }).ok).toBe(true);
    const safetyAfter = getVictoryPressure(state).scoreByTribe.find((entry) => entry.tribeId === "blue")?.safety ?? 0;
    expect(safetyAfter).toBeGreaterThanOrEqual(safetyBefore);
  });

  it("applies generated roadmap effects to narrow deterministic target buckets", () => {
    const state = createGame(2026070902);
    state.tribes.blue.resources = { gold: 5000, food: 5000, wood: 5000, stone: 5000, clay: 5000, limestone: 5000, iron: 5000, coal: 5000 };
    const messenger = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "messenger");
    const sentinel = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "sentinel");
    expect(messenger).toBeTruthy();
    expect(sentinel).toBeTruthy();
    if (!messenger || !sentinel) throw new Error("Expected starting messenger and sentinel");
    const messengerSpeedBefore = messenger.speed;
    const sentinelSpeedBefore = sentinel.speed;

    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "taxation", reason: "Open trade institutions." }).ok).toBe(true);
    expect(
      issueSovereignOrder(state, "blue", {
        type: "DEVELOP",
        priority: 1,
        developmentId: "sw_045_trade_tariff_corridor",
        reason: "Adopt a commercial corridor without choosing any strategy for the sovereign."
      }).ok
    ).toBe(true);

    expect(state.units[messenger.id].speed).toBeGreaterThan(messengerSpeedBefore);
    expect(state.units[sentinel.id].speed).toBe(sentinelSpeedBefore);
  });

  it("rejects repair orders for missing, foreign, destroyed, and full-health buildings", () => {
    const state = createGame(938);
    const ownTownHall = getTownHall(state, "blue");
    const redTownHall = getTownHall(state, "red");

    const missing = issueSovereignOrder(state, "blue", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: "missing_building",
      reason: "Repair a missing building."
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error("Missing repair unexpectedly accepted");
    expect(missing.reason).toContain("missing or destroyed");

    const foreign = issueSovereignOrder(state, "blue", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: redTownHall.id,
      reason: "Repair an enemy building."
    });
    expect(foreign.ok).toBe(false);
    if (foreign.ok) throw new Error("Foreign repair unexpectedly accepted");
    expect(foreign.reason).toContain("another tribe");

    ownTownHall.hp = 0;
    const destroyed = issueSovereignOrder(state, "blue", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: ownTownHall.id,
      reason: "Resurrect a destroyed building."
    });
    expect(destroyed.ok).toBe(false);
    if (destroyed.ok) throw new Error("Destroyed repair unexpectedly accepted");
    expect(destroyed.reason).toContain("missing or destroyed");

    redTownHall.hp = redTownHall.maxHp;
    const full = issueSovereignOrder(state, "red", {
      type: "REPAIR",
      priority: 1,
      targetBuildingId: redTownHall.id,
      reason: "Repair a full-health building."
    });
    expect(full.ok).toBe(false);
    if (full.ok) throw new Error("Full-health repair unexpectedly accepted");
    expect(full.reason).toContain("fully repaired");
  });

  it("makes gates passable only while open and lockable by their owner", () => {
    const state = createGame(934);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    const townHall = getTownHall(state, "blue");
    expect(buildStructure(state, "blue", "gate", townHall).ok).toBe(false);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock stone gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hinges and locks." }).ok).toBe(true);

    const before = { ...state.tribes.blue.resources };
    const built = buildStructure(state, "blue", "gate", townHall);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Gate unexpectedly failed to build");
    const gate = state.buildings[built.buildingId];
    expect(gate.type).toBe("gate");
    expect(gate.gateState).toBe("open");
    expect(gate.gateAccessPolicy).toBe("owner_allies");
    expect(state.tribes.blue.resources.wood).toBe(before.wood - 35);
    expect(state.tribes.blue.resources.stone).toBe(before.stone - 45);
    expect(state.tribes.blue.resources.clay).toBe(before.clay - 20);
    expect(state.tribes.blue.resources.limestone).toBe(before.limestone - 25);
    expect(state.tribes.blue.resources.iron).toBe(before.iron - 20);
    expect(isTileWalkable(state, gate.x, gate.y)).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "blue")).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "red")).toBe(false);

    expect(formAlliance(state, "blue", "red").ok).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "red")).toBe(true);

    const ownerOnly = setGateState(state, "blue", "open", gate.id, "owner_only");
    expect(ownerOnly.ok).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "blue")).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "red")).toBe(false);

    const allAccess = setGateState(state, "blue", "open", gate.id, "all");
    expect(allAccess.ok).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "yellow")).toBe(true);

    const closed = setGateState(state, "blue", "closed", gate.id);
    expect(closed.ok).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y)).toBe(false);
    expect(isTileWalkable(state, gate.x, gate.y, "blue")).toBe(false);

    const opened = issueSovereignOrder(state, "blue", {
      type: "SET_GATE",
      priority: 1,
      buildingId: gate.id,
      gateState: "open",
      gateAccessPolicy: "owner_allies",
      reason: "Open the controlled passage."
    });
    expect(opened.ok).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y, "red")).toBe(true);

    const locked = issueSovereignOrder(state, "blue", {
      type: "SET_GATE",
      priority: 1,
      buildingId: gate.id,
      gateState: "locked",
      reason: "Lock the gate during danger."
    });
    expect(locked.ok).toBe(true);
    expect(state.buildings[gate.id].gateState).toBe("locked");
    expect(isTileWalkable(state, gate.x, gate.y)).toBe(false);

    const damaged = damageBuilding(state, gate.id, 999, "red");
    expect(damaged.ok).toBe(true);
    expect(damaged.ok && damaged.destroyed).toBe(true);
    expect(isTileWalkable(state, gate.x, gate.y)).toBe(true);
  });

  it("idles a moving unit cleanly when a gate becomes forbidden mid-route", () => {
    const state = createGame(935);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Gate unexpectedly failed to build");
    const gate = state.buildings[built.buildingId];
    const peon = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "peon");
    if (!peon) throw new Error("Expected Blue peon");
    peon.task = { kind: "move", target: { x: gate.x, y: gate.y }, path: [{ x: gate.x, y: gate.y }] };

    const locked = setGateState(state, "blue", "locked", gate.id);
    expect(locked.ok).toBe(true);
    advanceGameTicks(state, 1);

    expect(peon.task.kind).toBe("idle");
  });

  it("places AI-built walls near requested build coordinates", () => {
    const state = createGame(932);
    const townHall = getTownHall(state, "blue");
    const developed = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "masonry",
      reason: "Unlock placed wall construction."
    });
    expect(developed.ok).toBe(true);
    const target = { x: townHall.x + 12, y: townHall.y + 5 };

    const built = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      targetX: target.x,
      targetY: target.y,
      reason: "Place the first wall on the eastern perimeter."
    });

    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Placed wall unexpectedly failed to build");
    const wall = Object.values(state.buildings).find((building) => building.type === "wall" && building.tribeId === "blue");
    expect(wall).toBeDefined();
    if (!wall) throw new Error("Placed wall missing from state");
    expect(Math.max(Math.abs(wall.x - target.x), Math.abs(wall.y - target.y))).toBeLessThanOrEqual(5);
    expect(Math.hypot(wall.x - target.x, wall.y - target.y)).toBeLessThan(Math.hypot(wall.x - townHall.x, wall.y - townHall.y));
    expect(isTileWalkable(state, wall.x, wall.y)).toBe(false);
  });

  it("records LLM-authored fortification placement intent without overriding chosen coordinates", () => {
    const state = createGame(728);
    const target = { x: 30, y: 28 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock perimeter walls." }).ok).toBe(true);

    const built = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      targetX: target.x,
      targetY: target.y,
      fortificationIntent: "eastern choke-point screen",
      perimeterShape: "two-segment crescent around the road",
      perimeterStrategy: "Leave the south road visibly open while making the east approach expensive to breach.",
      reason: "Create an authored perimeter plan without relying on default placement."
    });

    expect(built.ok).toBe(true);
    const wall = Object.values(state.buildings).find((building) => building.type === "wall" && building.tribeId === "blue");
    if (!wall) throw new Error("Placed wall missing from state");
    expect(Math.max(Math.abs(wall.x - target.x), Math.abs(wall.y - target.y))).toBeLessThanOrEqual(5);
    expect(state.fortificationPlans.at(-1)).toMatchObject({
      tribeId: "blue",
      buildingId: wall.id,
      buildingType: "wall",
      fortificationIntent: "eastern choke-point screen",
      perimeterShape: "two-segment crescent around the road",
      perimeterStrategy: "Leave the south road visibly open while making the east approach expensive to breach."
    });
    const preview = state.fortificationPlans.at(-1)?.placementPreview;
    expect(preview?.resolvedTiles).toEqual([{ buildingId: wall.id, buildingType: "wall", x: wall.x, y: wall.y }]);
    expect(preview?.blockingTileCount).toBe(1);
    expect(preview?.blockingBuildingIds).toContain(wall.id);
    expect(preview?.routeChecks.some((check) => check.label === "owner_to_fortification")).toBe(true);
    expect(preview?.summary).toContain("1 blocking");
  });

  it("previews fortification placement before spending resources or creating buildings", () => {
    const state = createGame(2026070904);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 14, y: townHall.y + 2 };
    for (let x = target.x - 2; x <= target.x + 2; x += 1) {
      state.map[tileIndex(x, target.y)].terrain = "grass";
      delete state.map[tileIndex(x, target.y)].resource;
    }
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock perimeter walls." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock perimeter gates." }).ok).toBe(true);

    const resourcesBefore = { ...state.tribes.blue.resources };
    const buildingIdsBefore = new Set(Object.keys(state.buildings));
    const planCountBefore = state.fortificationPlans.length;
    const preview = previewFortificationBuild(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      targetX: target.x,
      targetY: target.y,
      perimeterPattern: "gate_line",
      perimeterDirection: "east_west",
      perimeterLength: 5,
      perimeterGateIndex: 3,
      fortificationIntent: "eastern customs wall",
      perimeterShape: "straight wall line with a central gate",
      perimeterStrategy: "Preview a visible gate-controlled boundary before committing resources.",
      reason: "Preview a five-segment controlled perimeter."
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Pre-build preview unexpectedly failed");
    expect(state.tribes.blue.resources).toEqual(resourcesBefore);
    expect(new Set(Object.keys(state.buildings))).toEqual(buildingIdsBefore);
    expect(state.fortificationPlans).toHaveLength(planCountBefore);
    expect(preview.preview.planKind).toBe("perimeter");
    expect(preview.preview.affordable).toBe(true);
    expect(preview.preview.wouldBuildCount).toBe(5);
    expect(preview.preview.wouldBuildTypes.wall).toBe(4);
    expect(preview.preview.wouldBuildTypes.gate).toBe(1);
    expect(preview.preview.cost.stone).toBeGreaterThan(0);
    expect(preview.preview.cost.iron).toBeGreaterThan(0);
    expect(preview.preview.placementPreview.resolvedTiles).toHaveLength(5);
    expect(preview.preview.placementPreview.blockingTileCount).toBe(4);
    expect(preview.preview.placementPreview.gateCount).toBe(1);
    expect(preview.preview.placementPreview.ownerGatePassableCount).toBe(1);
    expect(preview.preview.placementPreview.routeChecks.length).toBeGreaterThanOrEqual(2);
    expect(preview.preview.placementPreview.summary).toContain("4 blocking");
    expect(preview.preview.summary).toContain("pre-build perimeter preview");
  });

  it("builds explicit multi-tile perimeter lines with a commanded gate segment", () => {
    const state = createGame(735);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 14, y: townHall.y + 2 };
    for (let x = target.x - 2; x <= target.x + 2; x += 1) {
      state.map[tileIndex(x, target.y)].terrain = "grass";
      delete state.map[tileIndex(x, target.y)].resource;
    }
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock perimeter walls." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock perimeter gates." }).ok).toBe(true);

    const built = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      targetX: target.x,
      targetY: target.y,
      perimeterPattern: "gate_line",
      perimeterDirection: "east_west",
      perimeterLength: 5,
      perimeterGateIndex: 3,
      fortificationIntent: "eastern customs wall",
      perimeterShape: "straight wall line with a central gate",
      perimeterStrategy: "Create a visible gate-controlled boundary while keeping one passage available.",
      reason: "Build a five-segment controlled perimeter."
    });

    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Perimeter build unexpectedly failed");
    const segmentBuildings = Object.values(state.buildings).filter(
      (building) => building.tribeId === "blue" && building.y === target.y && building.x >= target.x - 2 && building.x <= target.x + 2
    );
    expect(segmentBuildings).toHaveLength(5);
    expect(segmentBuildings.filter((building) => building.type === "wall")).toHaveLength(4);
    const gate = segmentBuildings.find((building) => building.type === "gate");
    expect(gate).toBeDefined();
    expect(gate?.x).toBe(target.x);
    for (const wall of segmentBuildings.filter((building) => building.type === "wall")) {
      expect(isTileWalkable(state, wall.x, wall.y, "blue")).toBe(false);
    }
    if (gate) expect(isTileWalkable(state, gate.x, gate.y, "blue")).toBe(true);
    const plans = state.fortificationPlans.slice(-5);
    expect(plans).toHaveLength(5);
    const groupIds = new Set(plans.map((plan) => plan.perimeterGroupId));
    expect(groupIds.size).toBe(1);
    expect(plans.every((plan) => plan.perimeterPattern === "gate_line" && plan.perimeterDirection === "east_west" && plan.perimeterLength === 5)).toBe(true);
    expect(plans.every((plan) => plan.perimeterGateIndex === 3)).toBe(true);
    expect(plans.map((plan) => plan.perimeterSegmentIndex).sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual([0, 1, 2, 3, 4]);
    expect(plans.every((plan) => plan.placementPreview)).toBe(true);
    const preview = plans[0].placementPreview;
    expect(preview?.resolvedTiles).toHaveLength(5);
    expect(preview?.blockingTileCount).toBe(4);
    expect(preview?.gateCount).toBe(1);
    expect(preview?.ownerGatePassableCount).toBe(1);
    expect(preview?.gatePassageBuildingIds).toContain(gate?.id);
    expect(preview?.nearestForeignTribeId).toBeDefined();
    expect(preview?.routeChecks.length).toBeGreaterThanOrEqual(2);
    expect(preview?.summary).toContain("4 blocking");
    expect(state.events.some((event) => event.type === "FORTIFICATION_PERIMETER_BUILT" && event.body.includes("5 structures"))).toBe(true);
  });

  it("previews and builds explicit corner wall-gate perimeters without parsing prose", () => {
    const state = createGame(2026070911);
    state.tribes.blue.resources = { gold: 1200, food: 1200, wood: 1200, stone: 1200, clay: 1200, limestone: 1200, iron: 1200, coal: 1200 };
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 15, y: townHall.y + 7 };
    for (let y = target.y - 1; y <= target.y + 3; y += 1) {
      for (let x = target.x - 1; x <= target.x + 4; x += 1) {
        state.map[tileIndex(x, y)].terrain = "grass";
        delete state.map[tileIndex(x, y)].resource;
      }
    }
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock perimeter walls." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock perimeter gates." }).ok).toBe(true);

    const order = {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      targetX: target.x,
      targetY: target.y,
      perimeterPattern: "gate_corner",
      perimeterDirection: "east_west",
      perimeterLength: 5,
      perimeterGateIndex: 3,
      fortificationIntent: "bent customs wall",
      perimeterShape: "L-shaped corner wall with the bend gate at the road elbow",
      perimeterStrategy: "Use a bend to watch two approaches while preserving one controlled passage.",
      reason: "Build a five-segment explicit corner perimeter."
    } as const;
    const resourcesBefore = { ...state.tribes.blue.resources };
    const buildingIdsBefore = new Set(Object.keys(state.buildings));
    const planCountBefore = state.fortificationPlans.length;
    const preview = previewFortificationBuild(state, "blue", order);

    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Corner pre-build preview unexpectedly failed");
    expect(state.tribes.blue.resources).toEqual(resourcesBefore);
    expect(new Set(Object.keys(state.buildings))).toEqual(buildingIdsBefore);
    expect(state.fortificationPlans).toHaveLength(planCountBefore);
    expect(preview.preview.planKind).toBe("perimeter");
    expect(preview.preview.perimeterPattern).toBe("gate_corner");
    expect(preview.preview.perimeterDirection).toBe("east_west");
    expect(preview.preview.perimeterLength).toBe(5);
    expect(preview.preview.perimeterGateIndex).toBe(3);
    expect(preview.preview.wouldBuildCount).toBe(5);
    expect(preview.preview.wouldBuildTypes.wall).toBe(4);
    expect(preview.preview.wouldBuildTypes.gate).toBe(1);
    const previewTiles = preview.preview.placementPreview.resolvedTiles;
    expect(previewTiles).toHaveLength(5);
    expect(new Set(previewTiles.map((tile) => tile.x)).size).toBeGreaterThan(1);
    expect(new Set(previewTiles.map((tile) => tile.y)).size).toBeGreaterThan(1);
    expect(preview.preview.placementPreview.blockingTileCount).toBe(4);
    expect(preview.preview.placementPreview.gateCount).toBe(1);
    expect(preview.preview.placementPreview.ownerGatePassableCount).toBe(1);
    expect(preview.preview.placementPreview.routeChecks.length).toBeGreaterThanOrEqual(2);

    const built = issueSovereignOrder(state, "blue", order);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Corner perimeter build unexpectedly failed");
    const plans = state.fortificationPlans.slice(-5);
    expect(plans).toHaveLength(5);
    expect(new Set(plans.map((plan) => plan.perimeterGroupId)).size).toBe(1);
    expect(plans.every((plan) => plan.perimeterPattern === "gate_corner" && plan.perimeterDirection === "east_west" && plan.perimeterLength === 5)).toBe(true);
    expect(plans.every((plan) => plan.perimeterGateIndex === 3)).toBe(true);
    expect(plans.map((plan) => plan.perimeterSegmentIndex).sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual([0, 1, 2, 3, 4]);
    const builtSegments = plans.flatMap((plan) => {
      const building = state.buildings[plan.buildingId];
      return building ? [building] : [];
    });
    expect(builtSegments).toHaveLength(5);
    expect(builtSegments.filter((building) => building.type === "wall")).toHaveLength(4);
    const gate = builtSegments.find((building) => building.type === "gate");
    expect(gate).toBeDefined();
    expect(gate?.x).toBe(target.x);
    expect(gate?.y).toBe(target.y);
    expect(new Set(builtSegments.map((building) => building.x)).size).toBeGreaterThan(1);
    expect(new Set(builtSegments.map((building) => building.y)).size).toBeGreaterThan(1);
    for (const wall of builtSegments.filter((building) => building.type === "wall")) expect(isTileWalkable(state, wall.x, wall.y, "blue")).toBe(false);
    if (gate) expect(isTileWalkable(state, gate.x, gate.y, "blue")).toBe(true);
    expect(plans.every((plan) => plan.perimeterShape === "L-shaped corner wall with the bend gate at the road elbow")).toBe(true);
    expect(plans[0].placementPreview?.resolvedTiles).toHaveLength(5);
    expect(plans[0].placementPreview?.blockingTileCount).toBe(4);
    expect(plans[0].placementPreview?.ownerGatePassableCount).toBe(1);
    expect(state.events.some((event) => event.type === "FORTIFICATION_PERIMETER_BUILT" && event.body.includes("gate_corner"))).toBe(true);
  });

  it("does not silently insert gates into plain line perimeters", () => {
    const state = createGame(736);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock wall foundations." }).ok).toBe(
      true
    );
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hardware." }).ok).toBe(
      true
    );

    const result = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "gate",
      targetX: 35,
      targetY: 28,
      perimeterPattern: "line",
      perimeterDirection: "east_west",
      perimeterLength: 5,
      perimeterGateIndex: 3,
      reason: "This should not be silently converted into a gate line."
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("gate_line");

    const cornerResult = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "gate",
      targetX: 35,
      targetY: 32,
      perimeterPattern: "corner",
      perimeterDirection: "east_west",
      perimeterLength: 5,
      perimeterGateIndex: 3,
      perimeterShape: "L-shaped gate barrier",
      reason: "This should not parse prose or silently convert into a gate corner."
    });

    expect(cornerResult.ok).toBe(false);
    if (!cornerResult.ok) expect(cornerResult.reason).toContain("gate_corner");
  });

  it("builds authored turret and watchtower line perimeters without inserting gates", () => {
    const state = createGame(2026070910);
    state.tribes.blue.resources = { gold: 1500, food: 1500, wood: 1500, stone: 1500, clay: 1500, limestone: 1500, iron: 1500, coal: 1500 };
    const townHall = getTownHall(state, "blue");
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock turret metalwork." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ballistics", reason: "Unlock turret mechanisms." }).ok).toBe(true);
    const turretTarget = { x: townHall.x + 16, y: townHall.y + 6 };
    const towerTarget = { x: townHall.x + 16, y: townHall.y + 10 };
    for (const target of [turretTarget, towerTarget]) {
      for (let x = target.x - 2; x <= target.x + 2; x += 1) {
        state.map[tileIndex(x, target.y)].terrain = "grass";
        delete state.map[tileIndex(x, target.y)].resource;
      }
    }

    const turretLine = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "turret",
      targetX: turretTarget.x,
      targetY: turretTarget.y,
      perimeterPattern: "line",
      perimeterDirection: "east_west",
      perimeterLength: 3,
      fortificationIntent: "overlapping anti-raid battery",
      perimeterShape: "three turret line",
      perimeterStrategy: "Create three separate fields of fire along the eastern road.",
      reason: "Build a turret line chosen by the sovereign."
    });
    expect(turretLine.ok).toBe(true);
    if (!turretLine.ok) throw new Error("Turret perimeter unexpectedly failed");
    const turretPlans = state.fortificationPlans.slice(-3);
    expect(turretPlans).toHaveLength(3);
    expect(turretPlans.every((plan) => plan.buildingType === "turret" && plan.perimeterPattern === "line" && plan.perimeterLength === 3)).toBe(true);
    expect(new Set(turretPlans.map((plan) => plan.perimeterGroupId)).size).toBe(1);
    expect(turretPlans[0].placementPreview?.resolvedTiles).toHaveLength(3);
    expect(turretPlans[0].placementPreview?.blockingTileCount).toBe(0);
    const turrets = turretPlans.map((plan) => state.buildings[plan.buildingId]);
    expect(turrets.every((building) => building?.type === "turret" && building.attack > 0 && building.range > 0)).toBe(true);

    const watchtowerLine = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "watchtower",
      targetX: towerTarget.x,
      targetY: towerTarget.y,
      perimeterPattern: "line",
      perimeterDirection: "east_west",
      perimeterLength: 3,
      fortificationIntent: "lookout chain",
      perimeterShape: "three watchtower line",
      perimeterStrategy: "Extend sight along the same frontier without blocking passage.",
      reason: "Build a watchtower line chosen by the sovereign."
    });
    expect(watchtowerLine.ok).toBe(true);
    if (!watchtowerLine.ok) throw new Error("Watchtower perimeter unexpectedly failed");
    const watchtowerPlans = state.fortificationPlans.slice(-3);
    expect(watchtowerPlans).toHaveLength(3);
    expect(watchtowerPlans.every((plan) => plan.buildingType === "watchtower" && plan.perimeterPattern === "line" && plan.perimeterLength === 3)).toBe(true);
    expect(new Set(watchtowerPlans.map((plan) => plan.perimeterGroupId)).size).toBe(1);
    expect(watchtowerPlans[0].placementPreview?.resolvedTiles).toHaveLength(3);
    expect(watchtowerPlans[0].placementPreview?.blockingTileCount).toBe(0);

    const invalid = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "turret",
      targetX: towerTarget.x,
      targetY: towerTarget.y + 4,
      perimeterPattern: "gate_line",
      perimeterDirection: "east_west",
      perimeterLength: 3,
      reason: "This should not create a hidden gate-line turret doctrine."
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.reason).toContain("line or corner for turret or watchtower");
    expect(state.events.some((event) => event.type === "FORTIFICATION_PERIMETER_BUILT" && event.body.includes("3 structures"))).toBe(true);
  });

  it("records flexible gate operations and expires active gate commands", () => {
    const state = createGame(729);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hardware." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!built.ok) throw new Error("Gate build failed");

    const operation = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: built.buildingId,
      recipientTribeId: "red",
      gateState: "open",
      gateAccessPolicy: "all",
      gateOperationIntent: "charge a visible road toll while lying that the road is freely open",
      gateTerms: "Red envoys may pass after paying 7 gold; if they refuse, keep them waiting outside.",
      gatePublicNotice: "The road gate is open to accredited merchants.",
      gateEntryAction: "delay",
      gateTollMode: "required",
      gateUnpaidAction: "refuse",
      gateTollGold: 7,
      gateOperationDurationTicks: 2,
      reason: "Test that gate operations carry freeform terms."
    });

    expect(operation.ok).toBe(true);
    const gate = state.buildings[built.buildingId];
    expect(gate.gateOperation).toMatchObject({
      gateOperationIntent: "charge a visible road toll while lying that the road is freely open",
      gateTerms: "Red envoys may pass after paying 7 gold; if they refuse, keep them waiting outside.",
      gatePublicNotice: "The road gate is open to accredited merchants.",
      entryAction: "delay",
      tollMode: "required",
      unpaidAction: "refuse",
      tollGold: 7,
      targetTribeId: "red"
    });
    expect(state.gateOperations.at(-1)?.buildingId).toBe(gate.id);
    const redVisibleEvents = getRecentVisibleEvents(state, "red", 8).map((event) => event.body).join(" ");
    expect(redVisibleEvents).toContain("The road gate is open to accredited merchants.");
    expect(redVisibleEvents).not.toContain("keep them waiting outside");
    const blueVisibleEvents = getRecentVisibleEvents(state, "blue", 8).map((event) => event.body).join(" ");
    expect(blueVisibleEvents).toContain("Private terms: Red envoys may pass after paying 7 gold");

    advanceGameTicks(state, 3);
    expect(state.buildings[built.buildingId].gateOperation).toBeUndefined();
  });

  it("requires explicit gate terms and public notice fields", () => {
    const state = createGame(737);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hardware." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!built.ok) throw new Error("Gate build failed");

    const operation = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: built.buildingId,
      recipientTribeId: "red",
      gateState: "open",
      gateAccessPolicy: "all",
      gateEntryAction: "delay",
      subject: "Generic subject must not become a public notice",
      body: "Generic body must not become private gate terms",
      reason: "Only gateTerms and gatePublicNotice should populate those fields."
    });

    expect(operation.ok).toBe(true);
    const gate = state.buildings[built.buildingId];
    expect(gate.gateOperation?.gateTerms).toBeUndefined();
    expect(gate.gateOperation?.gatePublicNotice).toBeUndefined();
    expect(
      state.events.some((event) => event.type === "GATE_PUBLIC_NOTICE" && event.body.includes("Generic subject must not become a public notice"))
    ).toBe(false);
  });

  it("does not let a remote operated gate control unrelated messenger arrivals", () => {
    const state = createGame(738);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hardware." }).ok).toBe(true);
    const remoteGate = buildStructure(state, "blue", "gate", { x: 110, y: 110 });
    if (!remoteGate.ok) throw new Error("Remote gate build failed");
    expect(
      issueSovereignOrder(state, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: remoteGate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "detain envoys at the far southern gate",
        gateTerms: "Only messengers who actually use this gate should be detained.",
        gateEntryAction: "detain",
        reason: "Gate operations should be local to their route."
      }).ok
    ).toBe(true);
    const sent = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Ordinary envoy",
      body: "We request audience at the town hall.",
      reason: "The route does not use the remote gate."
    });
    expect(sent.ok).toBe(true);
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
    if (!packet) throw new Error("Expected Red packet to Blue");
    expect(packet.outboundGateBuildingIds ?? []).not.toContain(remoteGate.buildingId);
    const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!messenger) throw new Error("Expected Red messenger");
    messenger.x = packet.destination.x;
    messenger.y = packet.destination.y;
    advanceGameTicks(state, 1);

    expect(state.packets[packet.id].state).toBe("AWAITING_REPLY");
    expect(state.events.some((event) => event.type === "MESSENGER_DETAINED_AT_GATE")).toBe(false);
  });

  it("uses explicit gate actions for detain instead of parsing freeform terms", () => {
    const state = createGame(730);
    state.tribes.red.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "red", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "red", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const built = buildStructure(state, "red", "gate", getTownHall(state, "red"));
    if (!built.ok) throw new Error("Red gate build failed");

    const operation = issueSovereignOrder(state, "red", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: built.buildingId,
      recipientTribeId: "blue",
      gateState: "open",
      gateAccessPolicy: "all",
      gateOperationIntent: "detain blue messengers at the gatehouse",
      gateTerms: "Hold Blue couriers as leverage until they reveal whether they are rich enough to survive.",
      gateEntryAction: "allow",
      reason: "Use gate diplomacy as bargaining leverage."
    });
    expect(operation.ok).toBe(true);

    const sent = sendPlayerMessage(state, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = state.packets[sent.packetId];
    const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!messenger) throw new Error("Messenger missing");
    messenger.x = packet.destination.x;
    messenger.y = packet.destination.y;
    advanceGameTicks(state, 1);

    expect(state.packets[sent.packetId].state).toBe("AWAITING_REPLY");
    expect(state.events.some((event) => event.type === "MESSENGER_DETAINED_AT_GATE")).toBe(false);

    const detainedState = createGame(731);
    detainedState.tribes.red.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(detainedState, "red", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(detainedState, "red", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const detainedGate = buildStructure(detainedState, "red", "gate", getTownHall(detainedState, "red"));
    if (!detainedGate.ok) throw new Error("Red gate build failed");
    expect(
      issueSovereignOrder(detainedState, "red", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: detainedGate.buildingId,
        recipientTribeId: "blue",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "custom checkpoint leverage",
        gateTerms: "Ask questions first; the written command decides what happens.",
        gateEntryAction: "detain",
        reason: "Use explicit gate action for detention."
      }).ok
    ).toBe(true);
    const detainedSent = sendPlayerMessage(detainedState, "red", "peace");
    if (!detainedSent.ok) throw new Error(detainedSent.reason);
    const detainedPacket = detainedState.packets[detainedSent.packetId];
    const detainedMessenger = detainedPacket.carrierUnitId ? detainedState.units[detainedPacket.carrierUnitId] : undefined;
    if (!detainedMessenger) throw new Error("Messenger missing");
    detainedMessenger.x = detainedPacket.destination.x;
    detainedMessenger.y = detainedPacket.destination.y;
    advanceGameTicks(detainedState, 1);

    expect(detainedState.packets[detainedSent.packetId].state).toBe("DETAINED");
    expect(detainedState.events.some((event) => event.type === "MESSENGER_DETAINED_AT_GATE")).toBe(true);
  });

  it("lets explicit gate operations ransom and release detained messenger packets", () => {
    const state = createGame(733);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    state.tribes.red.resources = { gold: 25, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(
      issueSovereignOrder(state, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: gate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "detain red couriers for leverage",
        gateTerms: "Hold Red couriers until I decide whether to sell their return.",
        gateEntryAction: "detain",
        reason: "Create a hostage negotiation tool."
      }).ok
    ).toBe(true);

    const sent = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Audience request",
      body: "I ask for safe entry to discuss the road.",
      reason: "Test detained packet release."
    });
    expect(sent.ok).toBe(true);
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
    if (!packet) throw new Error("Expected Red packet to Blue");
    const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!messenger) throw new Error("Expected Red messenger");
    messenger.x = packet.destination.x;
    messenger.y = packet.destination.y;
    advanceGameTicks(state, 1);
    expect(state.packets[packet.id].state).toBe("DETAINED");

    const blueGoldBefore = state.tribes.blue.resources.gold;
    const redGoldBefore = state.tribes.red.resources.gold;
    const release = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateState: "open",
      gateAccessPolicy: "all",
      gateOperationIntent: "sell the messenger's return",
      gateTerms: "Red pays a ransom and receives a written warning.",
      gateDetainedPacketAction: "ransom",
      gateDetainedPacketId: packet.id,
      gateRansomGold: 10,
      gateReleaseSubject: "Ransom paid",
      gateReleaseMessage: "Your courier is released because the ransom was paid; next time I may ask for more.",
      reason: "Use explicit hostage diplomacy."
    });
    expect(release.ok).toBe(true);

    const releasedPacket = state.packets[packet.id];
    const releasedMessenger = releasedPacket.carrierUnitId ? state.units[releasedPacket.carrierUnitId] : undefined;
    expect(state.tribes.blue.resources.gold).toBe(blueGoldBefore + 10);
    expect(state.tribes.red.resources.gold).toBe(redGoldBefore - 10);
    expect(releasedPacket.state).toBe("IN_TRANSIT_RETURN");
    expect(releasedPacket.messageIds.length).toBe(2);
    expect(state.messages[releasedPacket.messageIds[1]].body).toContain("ransom was paid");
    expect(releasedMessenger?.task.kind).toBe("deliver");
    if (releasedMessenger?.task.kind === "deliver") expect(releasedMessenger.task.phase).toBe("returning");
    expect(state.events.some((event) => event.type === "GATE_RANSOM_PAID")).toBe(true);
    expect(state.events.some((event) => event.type === "MESSENGER_RELEASED_AT_GATE")).toBe(true);
  });

  it("keeps a detained packet held when an explicit gate ransom cannot be paid", () => {
    const state = createGame(734);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    state.tribes.red.resources = { gold: 3, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(
      issueSovereignOrder(state, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: gate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "detain red couriers",
        gateTerms: "Hold them until payment clears.",
        gateEntryAction: "detain",
        reason: "Create a hostage negotiation tool."
      }).ok
    ).toBe(true);
    const sent = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Poor envoy",
      body: "I come with little gold.",
      reason: "Test unpaid ransom."
    });
    expect(sent.ok).toBe(true);
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
    if (!packet) throw new Error("Expected Red packet to Blue");
    const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!messenger) throw new Error("Expected Red messenger");
    messenger.x = packet.destination.x;
    messenger.y = packet.destination.y;
    advanceGameTicks(state, 1);
    expect(state.packets[packet.id].state).toBe("DETAINED");

    const blueGoldBefore = state.tribes.blue.resources.gold;
    const redGoldBefore = state.tribes.red.resources.gold;
    const ransom = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateDetainedPacketAction: "ransom",
      gateDetainedPacketId: packet.id,
      gateRansomGold: 10,
      reason: "Demand more than Red can pay."
    });
    expect(ransom.ok).toBe(true);
    expect(state.packets[packet.id].state).toBe("DETAINED");
    expect(state.tribes.blue.resources.gold).toBe(blueGoldBefore);
    expect(state.tribes.red.resources.gold).toBe(redGoldBefore);
    expect(state.events.some((event) => event.type === "GATE_RANSOM_UNPAID")).toBe(true);
  });

  it("grants, revokes, and expires explicit gate access treaties without changing chat automatically", () => {
    const state = createGame(735);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(setGateState(state, "blue", "open", gate.buildingId, "owner_only").ok).toBe(true);
    const gateBuilding = state.buildings[gate.buildingId];

    const chatOnly = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "red",
      messageType: "TREATY_PROPOSAL",
      diplomacyIntent: "PEACE_OFFER",
      subject: "Safe passage proposal",
      body: "I may open my gate to you if we agree later.",
      reason: "Chat should not itself mutate gate passage."
    });
    expect(chatOnly.ok).toBe(true);
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(false);

    const grant = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateOperationIntent: "grant Red controlled passage through my gate",
      gateTerms: "Red may cross this gate while the treaty is active.",
      gateAccessTreatyAction: "grant",
      gateAccessTreatyName: "Red road writ",
      gateAccessTreatyTerms: "Passage only through this gate; other gates remain closed.",
      gateAccessTreatyDurationTicks: 3,
      reason: "Use explicit access treaty fields."
    });
    expect(grant.ok).toBe(true);
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(true);
    expect(state.gateAccessTreaties.at(-1)?.action).toBe("grant");
    expect(state.events.some((event) => event.type === "GATE_ACCESS_TREATY_GRANTED")).toBe(true);

    advanceGameTicks(state, 4);
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(false);
    expect(state.events.some((event) => event.type === "GATE_ACCESS_TREATY_EXPIRED")).toBe(true);

    const renewed = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateAccessTreatyAction: "grant",
      reason: "Renew passage so revoke can be tested."
    });
    expect(renewed.ok).toBe(true);
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(true);
    const revoked = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateAccessTreatyAction: "revoke",
      reason: "End Red passage explicitly."
    });
    expect(revoked.ok).toBe(true);
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(false);
    expect(state.gateAccessTreaties.at(-1)?.action).toBe("revoke");
    expect(state.events.some((event) => event.type === "GATE_ACCESS_TREATY_REVOKED")).toBe(true);
  });

  it("records named safe-passage treaty evidence on real courier routes", () => {
    const state = createGame(737);
    setAllControllers(state, "human");
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    state.tribes.red.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    const hall = getTownHall(state, "blue");
    const gateStats = getBuildingTypeCombatStats("gate");
    const wallStats = getBuildingTypeCombatStats("wall");
    const gateId = "blue_safe_passage_gate";
    const routeGateId = "blue_safe_passage_route_gate";
    const gatePosition = { x: hall.x - 1, y: hall.y };
    const routeGatePosition = { x: hall.x - 2, y: hall.y + 1 };
    for (const position of [
      gatePosition,
      routeGatePosition,
      { x: hall.x + 1, y: hall.y },
      { x: hall.x, y: hall.y - 1 },
      { x: hall.x, y: hall.y + 1 }
    ]) {
      state.map[tileIndex(position.x, position.y)].terrain = "grass";
      delete state.map[tileIndex(position.x, position.y)].resource;
    }
    state.buildings[gateId] = {
      id: gateId,
      type: "gate",
      tribeId: "blue",
      x: gatePosition.x,
      y: gatePosition.y,
      ...gateStats,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    };
    state.buildings[routeGateId] = {
      id: routeGateId,
      type: "gate",
      tribeId: "blue",
      x: routeGatePosition.x,
      y: routeGatePosition.y,
      ...gateStats,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    };
    for (const [index, position] of [
      { x: hall.x + 1, y: hall.y },
      { x: hall.x, y: hall.y - 1 },
      { x: hall.x, y: hall.y + 1 }
    ].entries()) {
      state.buildings[`blue_safe_passage_wall_${index}`] = {
        id: `blue_safe_passage_wall_${index}`,
        type: "wall",
        tribeId: "blue",
        x: position.x,
        y: position.y,
        ...wallStats
      };
    }

    const blocked = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Blocked audience",
      body: "We ask for entry before any writ exists.",
      reason: "Owner-only gate should block Red before a treaty grant."
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("Courier unexpectedly routed through owner-only gate before treaty");
    expect(blocked.reason).toContain("No passable messenger route");
    expect(isTileWalkable(state, gatePosition.x, gatePosition.y, "red")).toBe(false);
    expect(isTileWalkable(state, routeGatePosition.x, routeGatePosition.y, "red")).toBe(false);

    const grant = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gateId,
      recipientTribeId: "red",
      gateOperationIntent: "grant Red a named safe-passage route",
      gateTerms: "Red couriers may pass only through this gate while the writ is active.",
      gateAccessTreatyAction: "grant",
      gateAccessTreatyName: "Red road writ",
      gateAccessTreatyTerms: "Named passage for Red couriers through the western gate.",
      gateRouteName: "Red two-gate road",
      gateRouteGateIds: [gateId, routeGateId],
      gateRouteTerms: "Red couriers may use the western and lower route gates; other gates remain closed.",
      gateAccessTreatyDurationTicks: 200,
      reason: "Create negotiated safe passage without changing alliances."
    });
    expect(grant.ok).toBe(true);
    const routeTreaties = state.gateAccessTreaties.filter((treaty) => treaty.routeName === "Red two-gate road" && treaty.targetTribeId === "red");
    expect(routeTreaties).toHaveLength(2);
    const routeIds = new Set(routeTreaties.map((treaty) => treaty.routeId));
    expect(routeIds.size).toBe(1);
    const routeId = routeTreaties[0]?.routeId;
    expect(routeId).toBeTruthy();
    expect(new Set(routeTreaties.map((treaty) => treaty.buildingId))).toEqual(new Set([gateId, routeGateId]));
    expect(routeTreaties.every((treaty) => treaty.routeTerms === "Red couriers may use the western and lower route gates; other gates remain closed.")).toBe(true);
    expect(routeTreaties.every((treaty) => JSON.stringify(treaty.routeGateIds) === JSON.stringify([gateId, routeGateId]))).toBe(true);
    expect(isTileWalkable(state, gatePosition.x, gatePosition.y, "red")).toBe(true);
    expect(isTileWalkable(state, routeGatePosition.x, routeGatePosition.y, "red")).toBe(true);
    const treaty = routeTreaties.find((candidate) => candidate.buildingId === gateId);
    expect(treaty?.treatyName).toBe("Red road writ");

    const existingPacketIds = new Set(Object.keys(state.packets));
    const sent = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Treaty route audience",
      body: "We enter under the Red road writ.",
      reason: "Use the explicit safe-passage treaty."
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) throw new Error("Expected treaty courier dispatch");
    const packet = Object.values(state.packets).find(
      (candidate) => !existingPacketIds.has(candidate.id) && candidate.originTribeId === "red" && candidate.recipientTribeId === "blue"
    );
    if (!packet) throw new Error("Expected treaty courier packet");
    const courier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!courier || courier.task.kind !== "deliver") throw new Error("Expected Red courier delivery task");
    expect(packet.outboundGateBuildingIds).toContain(gateId);
    expect(courier.task.path.some((step) => step.x === gatePosition.x && step.y === gatePosition.y)).toBe(true);
    expect(
      packet.routeMemory.some(
        (entry) =>
          entry.includes(`Safe-passage route ${routeId}`) &&
          entry.includes("Red two-gate road") &&
          entry.includes("Red road writ") &&
          entry.includes(gateId) &&
          entry.includes(routeGateId) &&
          entry.includes("western and lower route gates")
      )
    ).toBe(true);
    courier.x = packet.destination.x;
    courier.y = packet.destination.y;
    advanceGameTicks(state, 1);
    expect(state.packets[packet.id].state).toBe("AWAITING_REPLY");

    const revoke = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gateId,
      recipientTribeId: "red",
      gateAccessTreatyAction: "revoke",
      gateRouteName: "Red two-gate road",
      gateRouteGateIds: [gateId, routeGateId],
      gateRouteTerms: "The named two-gate road is closed to Red.",
      reason: "Close the negotiated route."
    });
    expect(revoke.ok).toBe(true);
    const revokeRouteTreaties = state.gateAccessTreaties.filter((treaty) => treaty.routeName === "Red two-gate road" && treaty.action === "revoke");
    expect(revokeRouteTreaties).toHaveLength(2);
    expect(new Set(revokeRouteTreaties.map((treaty) => treaty.routeId)).size).toBe(1);
    expect(isTileWalkable(state, gatePosition.x, gatePosition.y, "red")).toBe(false);
    expect(isTileWalkable(state, routeGatePosition.x, routeGatePosition.y, "red")).toBe(false);
    const recruited = issueSovereignOrder(state, "red", { type: "RECRUIT", priority: 1, unitType: "messenger", reason: "Send a fresh courier after revocation." });
    expect(recruited.ok).toBe(true);
    const blockedAfterRevoke = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Revoked route",
      body: "We test whether the road writ still opens the gate.",
      reason: "Revoked passage should no longer route."
    });
    expect(blockedAfterRevoke.ok).toBe(false);
    if (blockedAfterRevoke.ok) throw new Error("Courier unexpectedly routed after treaty revocation");
    expect(blockedAfterRevoke.reason).toContain("No passable messenger route");
  });

  it("rejects multi-gate access routes that list non-owned or destroyed gates", () => {
    const state = createGame(739);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    const hall = getTownHall(state, "blue");
    const gateStats = getBuildingTypeCombatStats("gate");
    const blueGateId = "blue_route_gate_primary";
    const blueDestroyedGateId = "blue_route_gate_destroyed";
    const redGateId = "red_route_gate_foreign";
    for (const position of [
      { x: hall.x - 1, y: hall.y },
      { x: hall.x - 2, y: hall.y },
      { x: hall.x - 3, y: hall.y }
    ]) {
      state.map[tileIndex(position.x, position.y)].terrain = "grass";
      delete state.map[tileIndex(position.x, position.y)].resource;
    }
    state.buildings[blueGateId] = {
      id: blueGateId,
      type: "gate",
      tribeId: "blue",
      x: hall.x - 1,
      y: hall.y,
      ...gateStats,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    };
    state.buildings[blueDestroyedGateId] = {
      id: blueDestroyedGateId,
      type: "gate",
      tribeId: "blue",
      x: hall.x - 2,
      y: hall.y,
      ...gateStats,
      hp: 0,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    };
    state.buildings[redGateId] = {
      id: redGateId,
      type: "gate",
      tribeId: "red",
      x: hall.x - 3,
      y: hall.y,
      ...gateStats,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    };

    const foreignGate = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: blueGateId,
      recipientTribeId: "red",
      gateAccessTreatyAction: "grant",
      gateRouteName: "Invalid foreign gate route",
      gateRouteGateIds: [blueGateId, redGateId],
      reason: "Do not let a sovereign grant passage over another tribe's gate."
    });
    expect(foreignGate.ok).toBe(false);
    if (!foreignGate.ok) expect(foreignGate.reason).toContain("not owned");

    const destroyedGate = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: blueGateId,
      recipientTribeId: "red",
      gateAccessTreatyAction: "grant",
      gateRouteName: "Invalid destroyed gate route",
      gateRouteGateIds: [blueGateId, blueDestroyedGateId],
      reason: "Do not let a route grant passage over a destroyed gate."
    });
    expect(destroyedGate.ok).toBe(false);
    if (!destroyedGate.ok) expect(destroyedGate.reason).toContain("missing or destroyed");
    expect(state.gateAccessTreaties).toHaveLength(0);
  });

  it("records factual treaty incident evidence without hardcoding consequences", () => {
    const state = createGame(738);
    setAllControllers(state, "human");
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    state.tribes.red.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(setGateState(state, "blue", "open", gate.buildingId, "owner_only").ok).toBe(true);
    const gateBuilding = state.buildings[gate.buildingId];
    const greenWitness = Object.values(state.units).find((unit) => unit.tribeId === "green" && unit.type === "sentinel");
    if (!greenWitness) throw new Error("Expected Green sentinel witness");
    greenWitness.x = gateBuilding.x + 2;
    greenWitness.y = gateBuilding.y;

    const grant = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateOperationIntent: "grant Red passage under a named writ",
      gateAccessTreatyAction: "grant",
      gateAccessTreatyName: "Broken road writ",
      gateAccessTreatyTerms: "Red couriers may cross this named gate.",
      gateAccessTreatyDurationTicks: 200,
      reason: "Create a formal gate access treaty."
    });
    expect(grant.ok).toBe(true);
    const treaty = state.gateAccessTreaties.at(-1);
    if (!treaty) throw new Error("Expected active gate treaty");

    const detain = issueSovereignOrder(state, "blue", {
      type: "GATE_OPERATION",
      priority: 1,
      buildingId: gate.buildingId,
      recipientTribeId: "red",
      gateOperationIntent: "detain Red courier despite the writ",
      gateTerms: "Hold the courier as leverage while the writ remains active.",
      gateEntryAction: "detain",
      reason: "Create treaty incident evidence."
    });
    expect(detain.ok).toBe(true);

    const sent = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Travel under writ",
      body: "We enter under the Broken road writ.",
      reason: "Use the treaty route."
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) throw new Error("Expected treaty courier dispatch");
    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
    if (!packet) throw new Error("Expected treaty courier packet");
    const courier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!courier) throw new Error("Expected treaty courier carrier");
    courier.x = packet.destination.x;
    courier.y = packet.destination.y;
    advanceGameTicks(state, 1);

    expect(state.packets[packet.id].state).toBe("DETAINED");
    const incident = state.gateTreatyIncidents.at(-1);
    expect(incident).toMatchObject({
      treatyId: treaty.id,
      treatyName: "Broken road writ",
      buildingId: gate.buildingId,
      gateOwnerTribeId: "blue",
      affectedTribeId: "red",
      packetId: packet.id,
      action: "detain"
    });
    expect(incident?.participantTribeIds).toEqual(["blue", "red"]);
    expect(incident?.witnessTribeIds).toContain("green");
    expect(incident?.witnessTribeIds).not.toContain("yellow");
	    expect(incident?.summary).toContain("Broken road writ");
	    expect(state.packets[packet.id].routeMemory.some((entry) => entry.includes(incident?.id ?? "") && entry.includes("detain"))).toBe(true);
	    expect(state.events.some((event) => event.type === "GATE_TREATY_INCIDENT_RECORDED")).toBe(true);
	    const firstWitnessObservation = state.foreignObservations.green.find((observation) => observation.gateTreatyIncidentId === incident?.id);
	    expect(firstWitnessObservation).toMatchObject({
	      kind: "gate_treaty_incident_witnessed",
	      observerTribeId: "green",
	      subjectKind: "building",
	      subjectTribeId: "blue",
	      subjectId: gate.buildingId,
	      subjectType: "gate",
	      gateOwnerTribeId: "blue",
	      affectedTribeId: "red",
	      packetId: packet.id,
	      gateIncidentAction: "detain"
	    });
	    expect(state.foreignObservations.blue.some((observation) => observation.kind === "gate_treaty_incident_witnessed")).toBe(false);
	    expect(state.foreignObservations.red.some((observation) => observation.kind === "gate_treaty_incident_witnessed")).toBe(false);

	    expect(issueSovereignOrder(state, "red", { type: "RECRUIT", priority: 1, unitType: "messenger", reason: "Send a second courier under the same writ." }).ok).toBe(true);
	    const existingPacketIds = new Set(Object.keys(state.packets));
	    const secondSent = issueSovereignOrder(state, "red", {
	      type: "SEND_MESSENGER",
	      priority: 1,
	      recipientTribeId: "blue",
	      messageType: "LETTER",
	      diplomacyIntent: "NONE",
	      subject: "Second travel under writ",
	      body: "We again enter under the Broken road writ.",
	      reason: "Use the treaty route again."
	    });
	    expect(secondSent.ok).toBe(true);
	    const secondPacket = Object.values(state.packets).find((candidate) => !existingPacketIds.has(candidate.id) && candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
	    if (!secondPacket) throw new Error("Expected second treaty courier packet");
	    const secondCourier = secondPacket.carrierUnitId ? state.units[secondPacket.carrierUnitId] : undefined;
	    if (!secondCourier) throw new Error("Expected second treaty courier carrier");
	    secondCourier.x = secondPacket.destination.x;
	    secondCourier.y = secondPacket.destination.y;
	    advanceGameTicks(state, 1);

	    const secondIncident = state.gateTreatyIncidents.at(-1);
	    expect(secondIncident?.id).not.toBe(incident?.id);
	    expect(secondIncident).toMatchObject({
	      treatyId: treaty.id,
	      buildingId: gate.buildingId,
	      affectedTribeId: "red",
	      packetId: secondPacket.id,
	      action: "detain"
	    });
	    const witnessIncidentObservations = state.foreignObservations.green.filter((observation) => observation.kind === "gate_treaty_incident_witnessed");
	    expect(witnessIncidentObservations.map((observation) => observation.gateTreatyIncidentId)).toEqual([incident?.id, secondIncident?.id]);
	    expect(state.wars.blue.red).not.toBe(true);
    expect(state.wars.red.blue).not.toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    expect(state.alliances.red).toBeUndefined();
  });

  it("requires proximity for foreign gate sabotage and makes forced gate control affect passage", () => {
    const state = createGame(736);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(setGateState(state, "blue", "locked", gate.buildingId, "owner_only").ok).toBe(true);
    const gateBuilding = state.buildings[gate.buildingId];

    const remote = issueSovereignOrder(state, "red", {
      type: "GATE_OPERATION",
      priority: 1,
      targetBuildingId: gate.buildingId,
      gateSabotageAction: "force_open",
      reason: "Try remote sabotage."
    });
    expect(remote.ok).toBe(false);
    if (remote.ok) throw new Error("Remote sabotage unexpectedly succeeded");
    expect(remote.reason).toContain("nearby");

    const saboteur = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!saboteur) throw new Error("Expected Red militia");
    saboteur.x = gateBuilding.x + 1;
    saboteur.y = gateBuilding.y;
    const forced = issueSovereignOrder(state, "red", {
      type: "GATE_OPERATION",
      priority: 1,
      targetBuildingId: gate.buildingId,
      gateOperationIntent: "force open Blue's locked gate",
      gateSabotageAction: "force_open",
      gateSabotageDurationTicks: 3,
      reason: "Use explicit adjacent sabotage to breach controlled passage."
    });
    expect(forced.ok).toBe(true);
    expect(state.buildings[gate.buildingId].gateSabotage?.action).toBe("force_open");
    expect(state.buildings[gate.buildingId].gateSabotage?.saboteurUnitId).toBe(saboteur.id);
    expect(state.buildings[gate.buildingId].gateSabotage?.targetTribeId).toBe("blue");
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(true);
    expect(state.events.some((event) => event.type === "GATE_SABOTAGED_OPEN")).toBe(true);
    const forcedRecord = state.gateSabotageHistory.at(-1);
    expect(forcedRecord?.saboteurUnitId).toBe(saboteur.id);
    expect(forcedRecord?.gateOperationId).toBe(state.gateOperations.at(-1)?.id);
    expect(forcedRecord?.targetTribeId).toBe("blue");
    const forcedObservation = state.foreignObservations.blue.find(
      (observation) =>
        observation.kind === "gate_sabotage_witnessed" &&
        observation.gateSabotageId === forcedRecord?.id &&
        observation.subjectId === saboteur.id &&
        observation.gateBuildingId === gate.buildingId
    );
    expect(forcedObservation).toMatchObject({
      subjectKind: "unit",
      subjectTribeId: "red",
      subjectType: "militia",
      gateOwnerTribeId: "blue",
      affectedTribeId: "blue",
      gateSabotageAction: "force_open"
    });

    advanceGameTicks(state, 4);
    expect(state.buildings[gate.buildingId].gateSabotage).toBeUndefined();
    expect(isTileWalkable(state, gateBuilding.x, gateBuilding.y, "red")).toBe(false);
    expect(state.events.some((event) => event.type === "GATE_SABOTAGE_EXPIRED")).toBe(true);

    const beforeHp = state.buildings[gate.buildingId].hp;
    const damaged = issueSovereignOrder(state, "red", {
      type: "GATE_OPERATION",
      priority: 1,
      targetBuildingId: gate.buildingId,
      gateSabotageAction: "damage",
      gateSabotageDamage: 25,
      reason: "Damage the gate mechanism explicitly."
    });
    expect(damaged.ok).toBe(true);
    expect(state.buildings[gate.buildingId].hp).toBeLessThan(beforeHp);
    expect(state.gateSabotageHistory.at(-1)?.action).toBe("damage");
    expect(state.gateSabotageHistory.at(-1)?.saboteurUnitId).toBe(saboteur.id);
    expect(
      state.foreignObservations.blue.some(
        (observation) =>
          observation.kind === "gate_sabotage_witnessed" &&
          observation.gateSabotageAction === "damage" &&
          observation.subjectId === saboteur.id &&
          observation.gateBuildingId === gate.buildingId
      )
    ).toBe(true);
    expect(state.events.some((event) => event.type === "GATE_SABOTAGE_DAMAGED")).toBe(true);
    expect(state.wars.blue.red).not.toBe(true);
    expect(state.wars.red.blue).not.toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    expect(state.alliances.red).toBeUndefined();
  });

  it("applies gate toll modes, unpaid actions, and ambush commands explicitly", () => {
    const state = createGame(732);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    state.tribes.red.resources = { gold: 25, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const gate = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!gate.ok) throw new Error("Blue gate build failed");
    expect(
      issueSovereignOrder(state, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: gate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "sell passage to red envoys",
        gateTerms: "Take money, slow the messenger, then answer politely.",
        gateEntryAction: "delay",
        gateTollMode: "required",
        gateUnpaidAction: "refuse",
        gateTollGold: 7,
        reason: "Charge a required toll."
      }).ok
    ).toBe(true);
    const redGoldBeforeToll = state.tribes.red.resources.gold;
    const blueGoldBeforeToll = state.tribes.blue.resources.gold;
    const redToBlue = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Road passage",
      body: "We request passage.",
      reason: "Test required toll payment."
    });
    expect(redToBlue.ok).toBe(true);
    const paidPacket = Object.values(state.packets).find((packet) => packet.originTribeId === "red" && packet.recipientTribeId === "blue");
    if (!paidPacket) throw new Error("Expected Red packet to Blue");
    const paidMessenger = paidPacket.carrierUnitId ? state.units[paidPacket.carrierUnitId] : undefined;
    if (!paidMessenger) throw new Error("Expected Red messenger");
    paidMessenger.x = paidPacket.destination.x;
    paidMessenger.y = paidPacket.destination.y;
    advanceGameTicks(state, 1);
    expect(state.packets[paidPacket.id].state).toBe("AWAITING_REPLY");
    expect(state.tribes.red.resources.gold).toBe(redGoldBeforeToll - 7);
    expect(state.tribes.blue.resources.gold).toBe(blueGoldBeforeToll + 7);
    expect(state.events.some((event) => event.type === "GATE_TOLL_PAID")).toBe(true);

    const unpaidState = createGame(733);
    unpaidState.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    unpaidState.tribes.red.resources = { gold: 0, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(unpaidState, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(unpaidState, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const unpaidGate = buildStructure(unpaidState, "blue", "gate", getTownHall(unpaidState, "blue"));
    if (!unpaidGate.ok) throw new Error("Blue gate build failed");
    expect(
      issueSovereignOrder(unpaidState, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: unpaidGate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "cash-only entry",
        gateTerms: "Do not admit envoys who cannot pay.",
        gateEntryAction: "delay",
        gateTollMode: "required",
        gateUnpaidAction: "refuse",
        gateTollGold: 7,
        reason: "Refuse unpaid required tolls."
      }).ok
    ).toBe(true);
    expect(
      issueSovereignOrder(unpaidState, "red", {
        type: "SEND_MESSENGER",
        priority: 1,
        recipientTribeId: "blue",
        messageType: "LETTER",
        diplomacyIntent: "NONE",
        subject: "Unpaid road passage",
        body: "We request passage without funds.",
        reason: "Test unpaid required toll."
      }).ok
    ).toBe(true);
    const unpaidPacket = Object.values(unpaidState.packets).find((packet) => packet.originTribeId === "red" && packet.recipientTribeId === "blue");
    if (!unpaidPacket) throw new Error("Expected unpaid Red packet to Blue");
    const unpaidMessenger = unpaidPacket.carrierUnitId ? unpaidState.units[unpaidPacket.carrierUnitId] : undefined;
    if (!unpaidMessenger) throw new Error("Expected unpaid Red messenger");
    unpaidMessenger.x = unpaidPacket.destination.x;
    unpaidMessenger.y = unpaidPacket.destination.y;
    advanceGameTicks(unpaidState, 1);
    expect(unpaidState.packets[unpaidPacket.id].state).toBe("REFUSED_AT_GATE");
    expect(unpaidState.events.some((event) => event.type === "MESSENGER_REFUSED_AT_GATE")).toBe(true);

    const ambushState = createGame(734);
    ambushState.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(ambushState, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock gate foundations." }).ok).toBe(true);
    expect(issueSovereignOrder(ambushState, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate locks." }).ok).toBe(true);
    const ambushGate = buildStructure(ambushState, "blue", "gate", getTownHall(ambushState, "blue"));
    if (!ambushGate.ok) throw new Error("Blue gate build failed");
    expect(
      issueSovereignOrder(ambushState, "blue", {
        type: "GATE_OPERATION",
        priority: 1,
        buildingId: ambushGate.buildingId,
        recipientTribeId: "red",
        gateState: "open",
        gateAccessPolicy: "all",
        gateOperationIntent: "spring a border ambush",
        gateTerms: "The ambush is private and should not be announced.",
        gateEntryAction: "ambush",
        reason: "Use explicit gate action for ambush."
      }).ok
    ).toBe(true);
    expect(
      issueSovereignOrder(ambushState, "red", {
        type: "SEND_MESSENGER",
        priority: 1,
        recipientTribeId: "blue",
        messageType: "LETTER",
        diplomacyIntent: "NONE",
        subject: "Border envoy",
        body: "We request entry.",
        reason: "Test explicit ambush."
      }).ok
    ).toBe(true);
    const ambushPacket = Object.values(ambushState.packets).find((packet) => packet.originTribeId === "red" && packet.recipientTribeId === "blue");
    if (!ambushPacket) throw new Error("Expected ambush Red packet to Blue");
    const ambushMessenger = ambushPacket.carrierUnitId ? ambushState.units[ambushPacket.carrierUnitId] : undefined;
    if (!ambushMessenger) throw new Error("Expected ambush Red messenger");
    ambushMessenger.x = ambushPacket.destination.x;
    ambushMessenger.y = ambushPacket.destination.y;
    advanceGameTicks(ambushState, 1);
    expect(ambushState.packets[ambushPacket.id].state).toBe("KILLED_WITH_PACKET");
    expect(ambushState.units[ambushMessenger.id].hp).toBe(0);
    expect(ambushState.events.some((event) => event.type === "MESSENGER_AMBUSHED_AT_GATE")).toBe(true);
  });

  it("rejects construction without scarce building resources", () => {
    const state = createGame(931);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 94, coal: 500 };
    const iron = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "ironworking",
      reason: "Unlock metalwork for turrets."
    });
    expect(iron.ok).toBe(true);
    const ballistics = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "ballistics",
      reason: "Unlock turret construction."
    });
    expect(ballistics.ok).toBe(true);
    const before = { ...state.tribes.blue.resources };

    const turret = buildStructure(state, "blue", "turret", getTownHall(state, "blue"));

    expect(turret.ok).toBe(false);
    if (turret.ok) throw new Error("Turret unexpectedly built without enough iron");
    expect(turret.reason).toContain("iron");
    expect(state.tribes.blue.resources).toEqual(before);
  });

  it("also rejects turret construction without coal", () => {
    const state = createGame(9301);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 44 };
    const iron = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "ironworking",
      reason: "Unlock metalwork for turrets."
    });
    expect(iron.ok).toBe(true);
    const ballistics = issueSovereignOrder(state, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "ballistics",
      reason: "Unlock turret construction."
    });
    expect(ballistics.ok).toBe(true);
    const before = { ...state.tribes.blue.resources };

    const turret = buildStructure(state, "blue", "turret", getTownHall(state, "blue"));

    expect(turret.ok).toBe(false);
    if (turret.ok) throw new Error("Turret unexpectedly built without enough coal");
    expect(turret.reason).toContain("coal");
    expect(state.tribes.blue.resources).toEqual(before);
  });

  it("seeds construction deposits and keeps coal/iron scarce for contested building strategy", () => {
    const state = createGame(932);
    const counts = state.map.reduce(
      (acc, tile) => {
        if (tile.resource?.type === "clay" && tile.resource.amount > 0) acc.clay += 1;
        if (tile.resource?.type === "limestone" && tile.resource.amount > 0) acc.limestone += 1;
        if (tile.resource?.type === "iron" && tile.resource.amount > 0) acc.iron += 1;
        if (tile.resource?.type === "coal" && tile.resource.amount > 0) acc.coal += 1;
        if (tile.resource?.type === "food" && tile.resource.amount > 0) acc.food += 1;
        return acc;
      },
      { clay: 0, limestone: 0, iron: 0, coal: 0, food: 0 }
    );

    expect(counts.clay).toBeGreaterThan(0);
    expect(counts.limestone).toBeGreaterThan(0);
    expect(counts.iron).toBeGreaterThan(0);
    expect(counts.coal).toBeGreaterThan(0);
    expect(counts.iron).toBeLessThan(counts.food);
    expect(counts.coal).toBeLessThan(counts.food);
  });

  it("keeps scarce map resources bounded, centralized, and absent from starter patches", () => {
    expect(scarceMapResourceTypes).toEqual(["iron", "coal"]);
    for (const type of resourceTypes) {
      expect(resourceScarcityPolicy[type].wildWeight).toBeGreaterThanOrEqual(0);
    }
    for (const type of scarceMapResourceTypes) {
      expect(resourceScarcityPolicy[type].localStarterPatch).toBe(false);
      expect(resourceScarcityPolicy[type].centralConflictPatch).toBe(true);
    }

    const state = createGame(2026070802);
    const counts = resourceTileCounts(state);
    expect(counts.iron).toBeGreaterThan(0);
    expect(counts.coal).toBeGreaterThan(0);
    expect(counts.iron).toBeLessThan(counts.food);
    expect(counts.coal).toBeLessThan(counts.food);
    expect(counts.coal).toBeLessThan(counts.stone);
    expect(counts.coal).toBeLessThan(counts.clay);

    const contested = contestedResourceSignature(state);
    expect(contested.some((site) => site.startsWith("iron:"))).toBe(true);
    expect(contested.some((site) => site.startsWith("coal:"))).toBe(true);
  });

  it("keeps turret coal and iron scarce and jitters central contested deposits by seed", () => {
    const first = createGame(936);
    const second = createGame(937);
    const turretIronCost = getBuildingCost("turret").iron ?? 0;
    const turretCoalCost = getBuildingCost("turret").coal ?? 0;
    expect(first.tribes.blue.resources.iron).toBeLessThan(turretIronCost);
    expect(first.tribes.blue.resources.coal).toBeLessThan(turretCoalCost);

    const firstSites = contestedResourceSignature(first);
    const secondSites = contestedResourceSignature(second);

    expect(firstSites).not.toEqual(secondSites);
    expect(firstSites.some((site) => site.startsWith("iron:"))).toBe(true);
    expect(firstSites.some((site) => site.startsWith("coal:"))).toBe(true);
    expect(firstSites.some((site) => site.startsWith("limestone:"))).toBe(true);
    expect(firstSites.length).toBeGreaterThan(5);
  });

  it("lets peons gather construction resources into the tribe stockpile", () => {
    const state = createGame(933);
    const peons = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "peon");
    const clayPeon = peons[0];
    const ironPeon = peons[1];
    const limestonePeon = peons[2];
    const coalPeon = peons[3];
    if (!clayPeon || !ironPeon || !limestonePeon || !coalPeon) throw new Error("Expected blue peons");

    const clayStart = state.tribes.blue.resources.clay;
    const ironStart = state.tribes.blue.resources.iron;
    const limestoneStart = state.tribes.blue.resources.limestone;
    const coalStart = state.tribes.blue.resources.coal;
    const townHall = getTownHall(state, "blue");
    const clayTile = { x: townHall.x + 2, y: townHall.y };
    const ironTile = { x: townHall.x + 3, y: townHall.y };
    const limestoneTile = { x: townHall.x + 2, y: townHall.y + 1 };
    const coalTile = { x: townHall.x + 3, y: townHall.y + 1 };
    state.map[tileIndex(clayTile.x, clayTile.y)] = { terrain: "grass", resource: createResourceDeposit("clay", 50) };
    state.map[tileIndex(ironTile.x, ironTile.y)] = { terrain: "hill", resource: createResourceDeposit("iron", 50) };
    state.map[tileIndex(limestoneTile.x, limestoneTile.y)] = { terrain: "hill", resource: createResourceDeposit("limestone", 50) };
    state.map[tileIndex(coalTile.x, coalTile.y)] = { terrain: "hill", resource: createResourceDeposit("coal", 50) };
    const clayDepositHp = state.map[tileIndex(clayTile.x, clayTile.y)].resource?.hp ?? 0;
    const ironDepositHp = state.map[tileIndex(ironTile.x, ironTile.y)].resource?.hp ?? 0;
    clayPeon.x = townHall.x + 1;
    clayPeon.y = townHall.y;
    ironPeon.x = townHall.x + 1;
    ironPeon.y = townHall.y + 1;
    limestonePeon.x = townHall.x + 1;
    limestonePeon.y = townHall.y + 2;
    coalPeon.x = townHall.x + 1;
    coalPeon.y = townHall.y + 3;
    expect(assignGathering(state, clayPeon.id, "clay").ok).toBe(true);
    expect(assignGathering(state, ironPeon.id, "iron").ok).toBe(true);
    expect(assignGathering(state, limestonePeon.id, "limestone").ok).toBe(true);
    expect(assignGathering(state, coalPeon.id, "coal").ok).toBe(true);
    advanceGame(state, 40);

    expect(state.tribes.blue.resources.clay).toBeGreaterThan(clayStart);
    expect(state.tribes.blue.resources.iron).toBeGreaterThan(ironStart);
    expect(state.tribes.blue.resources.limestone).toBeGreaterThan(limestoneStart);
    expect(state.tribes.blue.resources.coal).toBeGreaterThan(coalStart);
    expect(state.map[tileIndex(clayTile.x, clayTile.y)].resource?.hp ?? 0).toBeLessThan(clayDepositHp);
    expect(state.map[tileIndex(ironTile.x, ironTile.y)].resource?.hp ?? 0).toBeLessThan(ironDepositHp);
  });

  it("depletes finite deposits through normal harvesting and records exhausted evidence", () => {
    const state = createGame(9341);
    for (let y = 0; y < MAP_SIZE; y += 1) {
      for (let x = 0; x < MAP_SIZE; x += 1) {
        const tile = state.map[tileIndex(x, y)];
        if (tile.resource?.type === "clay") delete tile.resource;
      }
    }
    const peon = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "peon");
    if (!peon) throw new Error("Expected a blue peon");
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 2, y: townHall.y };
    state.map[tileIndex(target.x, target.y)] = { terrain: "grass", resource: createResourceDeposit("clay", 3) };
    peon.x = target.x;
    peon.y = target.y;
    peon.task = { kind: "idle" };
    const clayStart = state.tribes.blue.resources.clay;

    expect(assignGathering(state, peon.id, "clay").ok).toBe(true);
    advanceGameTicks(state, 80);

    expect(state.map[tileIndex(target.x, target.y)].resource).toBeUndefined();
    expect(state.tribes.blue.resources.clay).toBeGreaterThanOrEqual(clayStart + 3);
    expect(state.map.some((tile) => tile.resource?.type === "clay")).toBe(false);
    const clayAfterDepletion = state.tribes.blue.resources.clay;
    advanceGameTicks(state, 30);
    expect(state.tribes.blue.resources.clay).toBe(clayAfterDepletion);
    expect(getRecentResourceDepletions(state).at(-1)).toMatchObject({
      type: "clay",
      x: target.x,
      y: target.y,
      amount: 1,
      depletedByTribeId: "blue"
    });
    expect(state.events.some((event) => event.type === "RESOURCE_DEPOSIT_DEPLETED" && event.body.includes(`${target.x},${target.y}`))).toBe(true);
    expect(worldSignature(state)).toContain("resource_depletion");
  });

  it("publishes a survival mandate calendar without public rival wealth", () => {
    const state = createGame(934);
    const pressure = getVictoryPressure(state);

    expect(pressure.status).toBe("surviving");
    expect(pressure.victoryRule).toBe("population_happiness_safety_century_cull");
    expect(pressure.currentYear).toBe(1);
    expect(pressure.nextReviewYear).toBe(100);
    expect(pressure.finalYear).toBe(400);
    expect(TICKS_PER_GAME_YEAR / TICK_RATE).toBe(20);
    expect(pressure.publicText).toContain("Exact rival wealth is not public");
    expect(pressure.publicText).toContain("wiped out and dies");
    expect(pressure.publicText).toContain("opposite of safety");
    expect(pressure.publicText).not.toContain(String(pressure.leaderWealth));
  });

  it("advances game-years and updates happiness from yearly wealth growth", () => {
    const state = createGame(935);
    const before = state.tribes.blue.happiness;
    state.tribes.blue.lastYearWealth = 99999;

    advanceGame(state, TICKS_PER_GAME_YEAR / TICK_RATE);

    expect(getCurrentYear(state)).toBe(2);
    expect(state.tribes.blue.happiness).toBeLessThan(before);
  });

  it("eliminates the lowest-total-wealth survivor at a century review", () => {
    const state = createGame(9351);
    const sent = sendPlayerMessage(state, "green", "peace");
    expect(sent.ok).toBe(true);
    if (!sent.ok) throw new Error("Expected in-flight packet before century review");
    const packet = state.packets[sent.packetId];
    expect(packet.itemType).toBe("packet");
    expect(packet.hp).toBeGreaterThan(0);
    state.victoryPressure.nextReviewYear = 1;
    state.tribes.blue.resources = { gold: 0, food: 0, wood: 0, stone: 0, clay: 0, limestone: 0, iron: 0, coal: 0 };
    state.tribes.blue.happiness = 0;
    state.tribes.blue.lastYearWealth = 0;

    advanceGame(state, 0.2);

    expect(state.tribes.blue.eliminated).toBe(true);
    expect(state.tribes.blue.eliminatedYear).toBe(1);
    expect(packet.state).toBe("KILLED_WITH_PACKET");
    expect(packet.hp).toBe(0);
    expect(getPacketItemCombatStats(packet).hp).toBe(0);
    expect(getCombatStatCoverageReport(state).ok).toBe(true);
    const pressure = getVictoryPressure(state);
    expect(pressure.survivingTribes).toBe(4);
    expect(state.postGameLearnings).toHaveLength(5);
    expect(state.postGameLearnings.some((learning) => learning.tribeId === "blue" && learning.outcome === "eliminated")).toBe(true);
    expect(summarizeSovereignMemory(state, "blue")).toContain("wiped out in year 1");
    expect(summarizeSovereignMemory(state, "blue")).toContain("total safety failure");
    expect(state.events.some((event) => event.type === "AI_LEARNING_APPLIED")).toBe(true);
    expect(state.events.some((event) => event.type === "CENTURY_POPULATION_ELIMINATED")).toBe(true);
  });

  it("uses lowest total wealth, not wealth per person, for century elimination", () => {
    const state = createGame(9352);
    state.victoryPressure.nextReviewYear = 1;
    for (const tribeId of ["red", "green", "yellow", "purple"] as const) {
      state.tribes[tribeId].resources = { gold: 9000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
      state.tribes[tribeId].happiness = 5;
    }
    state.tribes.blue.resources = { gold: 700, food: 200, wood: 200, stone: 200, clay: 200, limestone: 200, iron: 200, coal: 200 };
    state.tribes.blue.happiness = 100;
    for (const unit of Object.values(state.units).filter((candidate) => candidate.tribeId === "blue").slice(1)) {
      unit.hp = 0;
    }
    const before = getVictoryPressure(state);
    expect(before.scoreByTribe.at(-1)?.tribeId).toBe("blue");
    expect(before.scoreByTribe.at(-1)?.wealth).toBeLessThan(before.scoreByTribe[0].wealth);
    expect((before.scoreByTribe.find((score) => score.tribeId === "blue")?.wealthPerCapita ?? 0)).toBeGreaterThan(0);

    advanceGame(state, 0.2);

    expect(state.tribes.blue.eliminated).toBe(true);
    expect(state.events.find((event) => event.type === "CENTURY_POPULATION_ELIMINATED")?.body).toContain("lowest total wealth");
  });

  it("rejects peer-directed questions through private REQUEST_INFO", () => {
    const state = createGame(9353);
    const result = issueSovereignOrder(state, "blue", {
      type: "REQUEST_INFO",
      priority: 1,
      recipientTribeId: "red",
      subject: "Gold reserves inquiry",
      body: "Please reveal your current gold reserves and total troop count.",
      reason: "Assess alliance viability."
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected peer-directed REQUEST_INFO to be rejected");
    expect(result.reason).toContain("SEND_MESSENGER");
    expect(state.aiInformationRequests).toHaveLength(0);
  });

  it("marks an in-flight messenger packet blocked when walls cut off the route", () => {
    const state = createGame(96);
    const sent = sendPlayerMessage(state, "green", "peace");
    expect(sent.ok).toBe(true);
    if (!sent.ok) throw new Error("Messenger unexpectedly failed to dispatch");
    const packet = state.packets[sent.packetId];
    const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (!messenger) throw new Error("Expected carrier messenger");

    blockCardinalNeighbors(state, Math.round(messenger.x), Math.round(messenger.y));
    advanceGame(state, 1);

    expect(packet.state).toBe("OVERDUE");
    expect(packet.carrierUnitId).toBeUndefined();
    expect(messenger.carriedPacketId).toBeUndefined();
    expect(messenger.task.kind).toBe("idle");
  });

  it("lets turrets defend against hostile units", () => {
    const state = createGame(94);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock turret metalwork." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ballistics", reason: "Unlock turret engines." }).ok).toBe(true);
    const built = buildStructure(state, "blue", "turret", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Turret unexpectedly failed to build");
    const turret = state.buildings[built.buildingId];
    const invader = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!invader) throw new Error("Expected red militia");
    invader.x = turret.x + 1;
    invader.y = turret.y;
    const before = invader.hp;

    advanceGame(state, 2);

    expect(invader.hp).toBeLessThan(before);
  });

  it("does not let turrets attack allied units", () => {
    const state = createGame(95);
    state.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock turret metalwork." }).ok).toBe(true);
    expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId: "ballistics", reason: "Unlock turret engines." }).ok).toBe(true);
    const alliance = formAlliance(state, "blue", "red");
    expect(alliance.ok).toBe(true);
    const built = buildStructure(state, "blue", "turret", getTownHall(state, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Turret unexpectedly failed to build");
    const turret = state.buildings[built.buildingId];
    const visitor = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!visitor) throw new Error("Expected red militia");
    visitor.x = turret.x + 1;
    visitor.y = turret.y;
    visitor.task = { kind: "idle" };
    const before = visitor.hp;

    advanceGame(state, 2);

    expect(visitor.hp).toBe(before);
  });

  it("lets an AI attack order break an alliance and declare war", () => {
    const state = createGame(98);
    const allied = formAlliance(state, "blue", "red");
    expect(allied.ok).toBe(true);
    expect(state.alliances.blue).toBe("red");

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      recipientTribeId: "red",
      reason: "Betray the ally before they outgrow us."
    });

    expect(attack.ok).toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    expect(state.alliances.red).toBeUndefined();
    expect(state.wars.blue.red).toBe(true);
    expect(state.wars.red.blue).toBe(true);
    expect(Object.values(state.units).some((unit) => unit.tribeId === "blue" && (unit.task.kind === "move" || unit.task.kind === "attack"))).toBe(true);
  });

  it("lets an AI siege order target and destroy a specific hostile wall", () => {
    const state = createGame(986);
    expect(formAlliance(state, "blue", "red").ok).toBe(true);
    state.buildings.test_red_wall = {
      id: "test_red_wall",
      type: "wall",
      tribeId: "red",
      x: 50,
      y: 50,
      hp: 2,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    state.map[tileIndex(49, 50)].terrain = "grass";
    state.map[tileIndex(50, 50)].terrain = "grass";
    const attackers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "militia");
    expect(attackers.length).toBeGreaterThan(0);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = 48;
      attacker.y = 50 + index;
      attacker.task = { kind: "idle" };
    }

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "test_red_wall",
      siegeIntent: "feint north while breaching the weak red wall",
      assaultPlan: "Send militia to the visible wall, then retreat if the gate opens behind them.",
      retreatCondition: "Withdraw if more than one attacker drops below half health.",
      reason: "Breach the red wall blocking future routes."
    });

    expect(attack.ok).toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    expect(state.alliances.red).toBeUndefined();
    expect(state.wars.blue.red).toBe(true);
    expect(attack.ok && attack.summary).toContain("test_red_wall");
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      tribeId: "blue",
      kind: "attack",
      targetBuildingId: "test_red_wall",
      siegeIntent: "feint north while breaching the weak red wall",
      assaultPlan: "Send militia to the visible wall, then retreat if the gate opens behind them.",
      retreatCondition: "Withdraw if more than one attacker drops below half health."
    });
    expect(attackers.some((unit) => unit.task.kind === "attackBuilding" && unit.task.targetBuildingId === "test_red_wall" && unit.task.siegePlanId === siegePlan?.id)).toBe(true);

    advanceGameTicks(state, 40);

    expect(state.buildings.test_red_wall).toBeUndefined();
    expect(isTileWalkable(state, 50, 50)).toBe(true);
    expect(state.events.some((event) => event.type === "WAR_SIEGE_ORDER" && event.body.includes("test_red_wall"))).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_DESTROYED" && event.body.includes("50,50"))).toBe(true);
  });

  it("lets a sovereign split one siege order across multiple authored building targets", () => {
    const state = createGame(2026070803);
    const townHall = getTownHall(state, "blue");
    const targetA = { id: "test_multi_wall_a", x: townHall.x + 5, y: townHall.y };
    const targetB = { id: "test_multi_wall_b", x: townHall.x + 5, y: townHall.y + 2 };
    for (const target of [targetA, targetB]) {
      state.buildings[target.id] = {
        id: target.id,
        type: "wall",
        tribeId: "red",
        x: target.x,
        y: target.y,
        hp: 2,
        maxHp: 240,
        armor: 0,
        attack: 0,
        range: 0,
        attackCooldown: 0
      };
      for (const pos of [
        { x: target.x - 2, y: target.y },
        { x: target.x - 1, y: target.y },
        { x: target.x, y: target.y }
      ]) {
        state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
        delete state.map[tileIndex(pos.x, pos.y)].resource;
      }
    }
    const attackers = Object.values(state.units)
      .filter((unit) => unit.tribeId === "blue" && unit.type === "militia")
      .slice(0, 4);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    while (attackers.length < 4) {
      const recruited = issueSovereignOrder(state, "blue", { type: "RECRUIT", priority: 1, unitType: "militia", reason: "Create enough units to test breach, cover, and escort roles." });
      expect(recruited.ok).toBe(true);
      const fresh = Object.values(state.units)
        .filter((unit) => unit.tribeId === "blue" && unit.type === "militia" && !attackers.some((existing) => existing.id === unit.id))
        .sort((left, right) => left.id.localeCompare(right.id))[0];
      if (fresh) attackers.push(fresh);
    }
    expect(attackers.length).toBeGreaterThanOrEqual(4);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = targetA.x - 2;
      attacker.y = targetA.y + index;
      attacker.attackCooldown = 0;
      attacker.task = { kind: "idle" };
    }
    const [coverUnit, escortUnit] = attackers;
    const redGuard = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia");
    if (!redGuard) throw new Error("Expected a red guard militia");
    redGuard.x = targetA.x - 1;
    redGuard.y = targetA.y;
    redGuard.hp = 30;

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      recipientTribeId: "red",
      targetBuildingIds: [targetA.id, targetB.id],
      coverUnitIds: [coverUnit.id],
      escortUnitIds: [escortUnit.id],
      coverX: targetA.x - 1,
      coverY: targetA.y,
      coverRadius: 4,
      coverPlan: "Screen hostile troops near the first breach point.",
      escortX: targetB.x - 1,
      escortY: targetB.y,
      escortRadius: 5,
      escortPlan: "Escort the second breach team and intercept nearby defenders.",
      siegeIntent: "split the breach team across two visible weak wall points",
      assaultPlan: "Pressure both wall segments at once so Red cannot infer a single breach point.",
      reason: "Test authored multi-target siege execution."
    });

    expect(attack.ok).toBe(true);
    expect(attack.ok && attack.summary).toContain("2 targets");
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      tribeId: "blue",
      kind: "attack",
      targetBuildingId: targetA.id,
      targetBuildingIds: [targetA.id, targetB.id],
      coverUnitIds: [coverUnit.id],
      escortUnitIds: [escortUnit.id],
      coverPlan: "Screen hostile troops near the first breach point.",
      escortPlan: "Escort the second breach team and intercept nearby defenders.",
      siegeIntent: "split the breach team across two visible weak wall points",
      assaultPlan: "Pressure both wall segments at once so Red cannot infer a single breach point."
    });
    const assigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
    expect(new Set(assigned.map((unit) => (unit.task.kind === "attackBuilding" ? unit.task.targetBuildingId : "")))).toEqual(new Set([targetA.id, targetB.id]));
    expect(assigned.some((unit) => unit.id === coverUnit.id || unit.id === escortUnit.id)).toBe(false);
    expect(coverUnit.task).toMatchObject({ kind: "guardSiege", siegePlanId: siegePlan?.id, guardRole: "cover" });
    expect(escortUnit.task).toMatchObject({ kind: "guardSiege", siegePlanId: siegePlan?.id, guardRole: "escort" });
    expect(
      state.events.some(
        (event) => event.type === "WAR_SIEGE_ORDER" && event.body.includes("Multi-target siege group") && event.body.includes(targetA.id) && event.body.includes(targetB.id)
      )
    ).toBe(true);
    expect(state.events.some((event) => event.type === "SIEGE_COVER_ASSIGNED" && event.body.includes(coverUnit.id))).toBe(true);
    expect(state.events.some((event) => event.type === "SIEGE_ESCORT_ASSIGNED" && event.body.includes(escortUnit.id))).toBe(true);

    advanceGameTicks(state, 2);
    expect(redGuard.hp).toBeLessThan(30);

    advanceGameTicks(state, 40);

    expect(state.buildings[targetA.id]).toBeUndefined();
    expect(state.buildings[targetB.id]).toBeUndefined();
  });

  it("rejects multi-target siege groups with own, missing, or cross-tribe buildings", () => {
    const state = createGame(2026070804);
    const blueTownHall = getTownHall(state, "blue");
    const redTownHall = getTownHall(state, "red");
    const greenTownHall = getTownHall(state, "green");
    const addWall = (id: string, tribeId: "blue" | "red" | "green", x: number, y: number): void => {
      state.buildings[id] = {
        id,
        type: "wall",
        tribeId,
        x,
        y,
        hp: 20,
        maxHp: 240,
        armor: 0,
        attack: 0,
        range: 0,
        attackCooldown: 0
      };
    };
    addWall("own_multi_wall", "blue", blueTownHall.x + 3, blueTownHall.y);
    addWall("red_multi_wall", "red", redTownHall.x - 3, redTownHall.y);
    addWall("green_multi_wall", "green", greenTownHall.x - 3, greenTownHall.y);

    const ownTarget = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingIds: ["red_multi_wall", "own_multi_wall"],
      reason: "Invalidly include our own wall."
    });
    expect(ownTarget.ok).toBe(false);
    expect(ownTarget.ok ? ownTarget.summary : ownTarget.reason).toContain("own building");

    const crossTribe = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      recipientTribeId: "red",
      targetBuildingIds: ["red_multi_wall", "green_multi_wall"],
      reason: "Invalidly mix target tribes."
    });
    expect(crossTribe.ok).toBe(false);
    expect(crossTribe.ok ? crossTribe.summary : crossTribe.reason).toContain("different tribes");

    const missing = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingIds: ["red_multi_wall", "missing_multi_wall"],
      reason: "Invalidly include a missing target."
    });
    expect(missing.ok).toBe(false);
    expect(missing.ok ? missing.summary : missing.reason).toContain("missing_multi_wall");

    const overlappingRoles = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingIds: ["red_multi_wall"],
      coverUnitIds: ["militia_0001"],
      escortUnitIds: ["militia_0001"],
      reason: "Invalidly assign the same unit to cover and escort."
    });
    expect(overlappingRoles.ok).toBe(false);
    expect(overlappingRoles.ok ? overlappingRoles.summary : overlappingRoles.reason).toContain("must not overlap");
  });

  it("lets a sovereign attach an executable retreat threshold to a siege order", () => {
    const state = createGame(987);
    state.buildings.test_retreat_wall = {
      id: "test_retreat_wall",
      type: "wall",
      tribeId: "red",
      x: 52,
      y: 52,
      hp: 240,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    for (const pos of [
      { x: 47, y: 51 },
      { x: 47, y: 52 },
      { x: 47, y: 53 },
      { x: 52, y: 52 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const attackers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "militia").slice(0, 2);
    expect(attackers.length).toBe(2);
    Object.assign(attackers[0], { ...getUnitTypeCombatStats("catapult"), type: "catapult" as const });
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = 47;
      attacker.y = 51 + index;
      attacker.hp = Math.floor(attacker.maxHp * 0.35);
      attacker.task = { kind: "idle" };
    }

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "test_retreat_wall",
      siegeIntent: "probe the wall without losing wounded troops",
      assaultPlan: "If the breach looks costly, pull back survivors to the rally tile.",
      retreatCondition: "Any attacker below half health withdraws.",
      retreatHealthPct: 50,
      retreatX: 42,
      retreatY: 51,
      reason: "Test executable siege withdrawal."
    });

    expect(attack.ok).toBe(true);
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      targetBuildingId: "test_retreat_wall",
      retreatCondition: "Any attacker below half health withdraws.",
      retreatHealthPct: 50,
      retreatX: 42,
      retreatY: 51
    });
    expect(attackers.every((unit) => unit.task.kind === "attackBuilding" && unit.task.retreatHealthPct === 50)).toBe(true);

    advanceGameTicks(state, 1);

    expect(attackers.every((unit) => unit.task.kind === "move" && unit.task.target.x === 42 && unit.task.target.y === 51)).toBe(true);
    expect(state.buildings.test_retreat_wall).toBeDefined();
    expect(state.events.some((event) => event.type === "SIEGE_RETREAT_TRIGGERED" && event.body.includes("42,51"))).toBe(true);
    expect(Object.values(state.projectiles).some((projectile) => projectile.targetBuildingId === "test_retreat_wall")).toBe(false);
  });

  it("lets a sovereign coordinate a siege by assembling attackers before the assault", () => {
    const state = createGame(988);
    state.buildings.test_coordinated_wall = {
      id: "test_coordinated_wall",
      type: "wall",
      tribeId: "red",
      x: 54,
      y: 52,
      hp: 240,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    for (const pos of [
      { x: 47, y: 52 },
      { x: 48, y: 52 },
      { x: 53, y: 52 },
      { x: 54, y: 52 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const attackers = Object.values(state.units)
      .filter((unit) => unit.tribeId === "blue" && unit.type === "militia")
      .slice(0, 3);
    expect(attackers.length).toBeGreaterThan(0);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = 44;
      attacker.y = 51 + index;
      attacker.task = { kind: "idle" };
    }

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "test_coordinated_wall",
      siegeIntent: "assemble the breach team before exposing anyone",
      assaultPlan: "Wait at the rally tile until all assigned attackers are ready, then move together.",
      assaultMode: "coordinated",
      assemblyX: 47,
      assemblyY: 52,
      assaultDelayTicks: 30,
      reason: "Test explicit coordinated assault execution."
    });

    expect(attack.ok).toBe(true);
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      targetBuildingId: "test_coordinated_wall",
      assaultMode: "coordinated",
      assemblyX: 47,
      assemblyY: 52,
      assaultDelayTicks: 30
    });
    const assigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
    expect(assigned.length).toBeGreaterThan(0);
    expect(assigned.every((unit) => unit.task.kind === "attackBuilding" && unit.task.assaultPhase === "assembling")).toBe(true);
    for (const unit of assigned) {
      unit.x = 47;
      unit.y = 52;
    }

    advanceGameTicks(state, 1);

    expect(siegePlan?.assaultStartedTick).toBeDefined();
    expect(assigned.every((unit) => unit.task.kind === "attackBuilding" && unit.task.assaultPhase === "attacking")).toBe(true);
    expect(state.events.some((event) => event.type === "COORDINATED_ASSAULT_STARTED" && event.body.includes("test_coordinated_wall"))).toBe(true);
  });

  it("lets a sovereign stagger siege attackers into explicit timed waves", () => {
    const state = createGame(990);
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 8, y: townHall.y };
    state.buildings.test_wave_wall = {
      id: "test_wave_wall",
      type: "wall",
      tribeId: "red",
      x: target.x,
      y: target.y,
      hp: 240,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    for (const pos of [
      { x: townHall.x + 2, y: townHall.y },
      { x: target.x - 1, y: target.y },
      target
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const attackers = Object.values(state.units)
      .filter((unit) => unit.tribeId === "blue" && unit.type === "militia")
      .slice(0, 2);
    expect(attackers).toHaveLength(2);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = townHall.x + 1;
      attacker.y = townHall.y + index;
      attacker.task = { kind: "idle" };
    }

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "test_wave_wall",
      siegeIntent: "commit one wave first and hold the second in reserve",
      assaultPlan: "Send one attacker, wait, then release the second attacker as a timed wave.",
      assaultMode: "direct",
      assemblyX: townHall.x + 2,
      assemblyY: townHall.y,
      assaultWaveSize: 1,
      assaultWaveIntervalTicks: 5,
      reason: "Test explicit timed siege waves."
    });

    expect(attack.ok).toBe(true);
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      targetBuildingId: "test_wave_wall",
      assaultWaveSize: 1,
      assaultWaveIntervalTicks: 5
    });
    const assigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
    expect(assigned).toHaveLength(2);
    expect(assigned[0].task).toMatchObject({ kind: "attackBuilding", assaultPhase: "attacking", assaultWaveIndex: 0 });
    expect(assigned[1].task).toMatchObject({ kind: "attackBuilding", assaultPhase: "waiting_wave", assaultWaveIndex: 1, assaultWaveReleaseTick: state.tick + 5 });

    advanceGameTicks(state, 4);
    expect(assigned[1].task).toMatchObject({ kind: "attackBuilding", assaultPhase: "waiting_wave" });

    advanceGameTicks(state, 2);
    expect(assigned[1].task).toMatchObject({ kind: "attackBuilding", assaultPhase: "attacking" });
    expect(siegePlan?.releasedWaveIndexes).toContain(1);
    expect(state.events.some((event) => event.type === "SIEGE_WAVE_RELEASED" && event.body.includes("Wave 2"))).toBe(true);
  });

  it("lets a sovereign run a timed feint or probe and withdraw by command", () => {
    const state = createGame(989);
    state.buildings.test_feint_wall = {
      id: "test_feint_wall",
      type: "wall",
      tribeId: "red",
      x: 53,
      y: 53,
      hp: 240,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    for (const pos of [
      { x: 49, y: 53 },
      { x: 50, y: 53 },
      { x: 53, y: 53 },
      { x: 44, y: 53 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    const attackers = Object.values(state.units)
      .filter((unit) => unit.tribeId === "blue" && unit.type === "militia")
      .slice(0, 2);
    expect(attackers.length).toBeGreaterThan(0);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = 49;
      attacker.y = 53 + index;
      attacker.task = { kind: "idle" };
    }

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "test_feint_wall",
      siegeIntent: "draw defenders toward the wall and leave before committing",
      assaultPlan: "Show pressure briefly, then return to the west rally tile.",
      assaultMode: "feint",
      feintDurationTicks: 2,
      retreatX: 44,
      retreatY: 53,
      reason: "Test explicit timed feint withdrawal."
    });

    expect(attack.ok).toBe(true);
    const siegePlan = state.siegePlans.at(-1);
    expect(siegePlan).toMatchObject({
      targetBuildingId: "test_feint_wall",
      assaultMode: "feint",
      feintDurationTicks: 2,
      retreatX: 44,
      retreatY: 53
    });
    const assigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
    expect(assigned.length).toBeGreaterThan(0);
    expect(assigned.every((unit) => unit.task.kind === "attackBuilding" && unit.task.assaultMode === "feint")).toBe(true);

    advanceGameTicks(state, 3);

    expect(assigned.every((unit) => unit.task.kind === "move" && unit.task.target.x === 44 && unit.task.target.y === 53)).toBe(true);
    expect(state.buildings.test_feint_wall).toBeDefined();
    expect(state.events.some((event) => event.type === "SIEGE_FEINT_WITHDRAWAL" && event.body.includes("44,53"))).toBe(true);
  });

  it("lets a sovereign unlock, recruit, and use a siege engine against a fortification", () => {
    const state = createGame(2026070602);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    const rejected = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "siege_engine",
      reason: "Try to recruit a siege engine before the institution exists."
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error("Siege engine unexpectedly recruited before Siege Engineering");
    expect(rejected.reason).toContain("Siege Engineering");

    for (const developmentId of ["ironworking", "public_works", "siege_engineering"] as const) {
      expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId, reason: `Unlock ${developmentId}.` }).ok).toBe(true);
    }
    const recruited = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "siege_engine",
      reason: "Build a breach tool."
    });
    expect(recruited.ok).toBe(true);
    const siegeEngine = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "siege_engine");
    if (!siegeEngine) throw new Error("Expected a trained siege engine");

    const stats = getBuildingTypeCombatStats("wall");
    state.buildings.red_siege_wall = {
      id: "red_siege_wall",
      type: "wall",
      tribeId: "red",
      x: 50,
      y: 50,
      hp: 100,
      maxHp: stats.maxHp,
      armor: stats.armor,
      attack: stats.attack,
      range: stats.range,
      attackCooldown: 0
    };
    for (const pos of [
      { x: 48, y: 50 },
      { x: 49, y: 50 },
      { x: 50, y: 50 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    siegeEngine.x = 48;
    siegeEngine.y = 50;
    siegeEngine.task = { kind: "idle" };
    const breachEstimate = estimateBreachTicks(state, "blue", "red_siege_wall");
    expect(breachEstimate).toBeDefined();
    expect(breachEstimate).toBeLessThanOrEqual(60);

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "red_siege_wall",
      reason: "Use the siege engine to breach the visible wall."
    });
    expect(attack.ok).toBe(true);
    expect(siegeEngine.task.kind).toBe("attackBuilding");
    advanceGameTicks(state, 80);
    expect(state.buildings.red_siege_wall).toBeUndefined();
    expect(state.events.some((event) => event.type === "WAR_SIEGE_ORDER" && event.body.includes("red_siege_wall"))).toBe(true);
  });

  it("lets a sovereign unlock, recruit, and use a battering ram against a gate", () => {
    const state = createGame(2026070605);
    state.tribes.blue.resources = { gold: 1000, food: 1000, wood: 1000, stone: 1000, clay: 1000, limestone: 1000, iron: 1000, coal: 1000 };
    const rejected = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "battering_ram",
      reason: "Try to recruit a ram before the institutions exist."
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error("Battering ram unexpectedly recruited before requirements");
    expect(rejected.reason).toContain("Public Works");
    expect(rejected.reason).toContain("Siege Engineering");

    for (const developmentId of ["ironworking", "public_works", "siege_engineering"] as const) {
      expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId, reason: `Unlock ${developmentId}.` }).ok).toBe(true);
    }
    const recruited = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "battering_ram",
      reason: "Build a close-range gate breaker."
    });
    expect(recruited.ok).toBe(true);
    const ram = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "battering_ram");
    if (!ram) throw new Error("Expected a trained battering ram");

    const stats = getBuildingTypeCombatStats("gate");
    state.buildings.red_ram_gate = {
      id: "red_ram_gate",
      type: "gate",
      tribeId: "red",
      x: 50,
      y: 50,
      hp: 80,
      maxHp: stats.maxHp,
      armor: stats.armor,
      attack: stats.attack,
      range: stats.range,
      attackCooldown: 0,
      gateState: "locked",
      gateAccessPolicy: "owner_only"
    };
    for (const pos of [
      { x: 49, y: 50 },
      { x: 50, y: 50 },
      { x: 49, y: 51 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    ram.x = 49;
    ram.y = 50;
    ram.attackCooldown = 0;
    ram.task = { kind: "idle" };

    const breachEstimate = estimateBreachTicks(state, "blue", "red_ram_gate");
    expect(breachEstimate).toBeDefined();
    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "red_ram_gate",
      siegeIntent: "break the locked gate with a ram",
      assaultPlan: "Push the ram into the gate while other units stay available for screening.",
      retreatCondition: "Pull back if the ram is badly damaged.",
      reason: "Use a ram against the visible gate."
    });
    expect(attack.ok).toBe(true);
    const orderedRam = state.units[ram.id];
    expect(orderedRam.task.kind).toBe("attackBuilding");
    if (orderedRam.task.kind !== "attackBuilding") throw new Error("Ram did not receive an attack-building task");
    expect(orderedRam.task.siegePlanId).toBe(state.siegePlans.at(-1)?.id);

    advanceGameTicks(state, 100);

    expect(state.buildings.red_ram_gate).toBeUndefined();
    expect(isTileWalkable(state, 50, 50, "blue")).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_DESTROYED" && event.body.includes("50,50"))).toBe(true);
  });

  it("lets a sovereign unlock catapults and fire visible projectiles at a wall", () => {
    const state = createGame(2026070606);
    state.tribes.blue.resources = { gold: 1200, food: 1200, wood: 1200, stone: 1200, clay: 1200, limestone: 1200, iron: 1200, coal: 1200 };
    const rejected = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "catapult",
      reason: "Try to recruit a catapult before the institutions exist."
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error("Catapult unexpectedly recruited before requirements");
    expect(rejected.reason).toContain("Ballistics");
    expect(rejected.reason).toContain("Siege Engineering");

    for (const developmentId of ["ironworking", "public_works", "ballistics", "siege_engineering"] as const) {
      expect(issueSovereignOrder(state, "blue", { type: "DEVELOP", priority: 1, developmentId, reason: `Unlock ${developmentId}.` }).ok).toBe(true);
    }
    const recruited = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "catapult",
      reason: "Build ranged artillery."
    });
    expect(recruited.ok).toBe(true);
    const catapult = Object.values(state.units).find((unit) => unit.tribeId === "blue" && unit.type === "catapult");
    if (!catapult) throw new Error("Expected a trained catapult");

    const stats = getBuildingTypeCombatStats("wall");
    state.buildings.red_catapult_wall = {
      id: "red_catapult_wall",
      type: "wall",
      tribeId: "red",
      x: 52,
      y: 50,
      hp: 70,
      maxHp: stats.maxHp,
      armor: stats.armor,
      attack: stats.attack,
      range: stats.range,
      attackCooldown: 0
    };
    for (const pos of [
      { x: 45, y: 50 },
      { x: 46, y: 50 },
      { x: 52, y: 50 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    catapult.x = 45;
    catapult.y = 50;
    catapult.attackCooldown = 0;
    catapult.task = { kind: "idle" };

    const breachEstimate = estimateBreachTicks(state, "blue", "red_catapult_wall");
    expect(breachEstimate).toBeDefined();
    expect(breachEstimate).toBeGreaterThan(Math.round(TICK_RATE * 1.2));
    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: "red_catapult_wall",
      siegeIntent: "range the wall with stone shot",
      assaultPlan: "Keep the catapult out of contact and let projectiles create the breach.",
      retreatCondition: "Move away if defenders reach the machine.",
      reason: "Use a catapult against the visible wall."
    });
    expect(attack.ok).toBe(true);
    expect(catapult.task.kind).toBe("attackBuilding");

    advanceGameTicks(state, 1);

    const projectile = Object.values(state.projectiles).find((shot) => shot.originUnitId === catapult.id && shot.targetBuildingId === "red_catapult_wall");
    expect(projectile).toBeDefined();
    const stoneShotStats = getProjectileTypeCombatStats("stone_shot");
    expect(projectile).toMatchObject({
      projectileType: "stone_shot",
      tribeId: "blue",
      targetBuildingId: "red_catapult_wall",
      hp: stoneShotStats.hp,
      maxHp: stoneShotStats.maxHp,
      armor: stoneShotStats.armor,
      attackCooldown: stoneShotStats.attackCooldown
    });
    expect(projectile?.attack).toBe(catapult.attack + 12);
    expect(projectile?.range).toBe(catapult.range);
    const coverage = getCombatStatCoverageReport(state);
    expect(coverage.ok).toBe(true);
    expect(coverage.byKind.projectileType).toBe(projectileTypes.length);
    expect(coverage.byKind.projectile).toBeGreaterThan(0);
    const launchEvent = state.events.find((event) => event.type === "SIEGE_PROJECTILE_LAUNCHED" && event.body.includes("red_catapult_wall"));
    expect(launchEvent).toBeDefined();
    expect(launchEvent?.context).toMatchObject({
      x: 52,
      y: 50,
      actorTribeId: "blue",
      targetTribeId: "red",
      subjectId: projectile?.id,
      targetId: "red_catapult_wall",
      projectileType: "stone_shot",
      severity: "skirmish"
    });

    advanceGameTicks(state, 120);

    expect(state.buildings.red_catapult_wall).toBeUndefined();
    expect(Object.values(state.projectiles).every((shot) => shot.targetBuildingId !== "red_catapult_wall")).toBe(true);
    const impactEvent = state.events.find((event) => event.type === "SIEGE_PROJECTILE_IMPACT" && event.body.includes("red_catapult_wall"));
    expect(impactEvent?.context).toMatchObject({
      x: 52,
      y: 50,
      actorTribeId: "blue",
      targetTribeId: "red",
      subjectId: projectile?.id,
      targetId: "red_catapult_wall",
      projectileType: "stone_shot",
      severity: "impact"
    });
    const destroyedEvent = state.events.find((event) => event.type === "STRUCTURE_DESTROYED" && event.body.includes("52,50"));
    expect(destroyedEvent?.context).toMatchObject({
      x: 52,
      y: 50,
      actorTribeId: "blue",
      targetTribeId: "red",
      targetId: "red_catapult_wall",
      severity: "destroyed"
    });
  });

  it("renders archer arrows and turret bolts as statted combat projectiles", () => {
    const state = createGame(2026070905);
    state.wars.blue.red = true;
    state.wars.red.blue = true;
    const archerStats = getUnitTypeCombatStats("archer");
    const militiaStats = getUnitTypeCombatStats("militia");
    const turretStats = getBuildingTypeCombatStats("turret");
    for (const pos of [
      { x: 40, y: 53 },
      { x: 43, y: 53 },
      { x: 50, y: 55 },
      { x: 56, y: 55 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
    state.units.blue_visual_archer = {
      id: "blue_visual_archer",
      name: "Blue Visual Archer",
      type: "archer",
      tribeId: "blue",
      x: 40,
      y: 53,
      speed: 1.0,
      visionRadius: 6,
      hp: archerStats.hp,
      maxHp: archerStats.maxHp,
      armor: archerStats.armor,
      attack: archerStats.attack,
      range: archerStats.range,
      attackCooldown: 0,
      task: { kind: "idle" }
    };
    state.units.red_arrow_target = {
      id: "red_arrow_target",
      name: "Red Arrow Target",
      type: "militia",
      tribeId: "red",
      x: 43,
      y: 53,
      speed: 1.05,
      visionRadius: 5,
      hp: militiaStats.hp,
      maxHp: militiaStats.maxHp,
      armor: militiaStats.armor,
      attack: militiaStats.attack,
      range: militiaStats.range,
      attackCooldown: 0,
      task: { kind: "idle" }
    };
    state.units.red_bolt_target = {
      ...state.units.red_arrow_target,
      id: "red_bolt_target",
      name: "Red Bolt Target",
      x: 56,
      y: 55,
      hp: militiaStats.hp,
      maxHp: militiaStats.maxHp,
      task: { kind: "idle" }
    };
    state.buildings.blue_visual_turret = {
      id: "blue_visual_turret",
      type: "turret",
      tribeId: "blue",
      x: 50,
      y: 55,
      hp: turretStats.maxHp,
      maxHp: turretStats.maxHp,
      armor: turretStats.armor,
      attack: turretStats.attack,
      range: turretStats.range,
      attackCooldown: 0
    };

    advanceGameTicks(state, 1);

    const arrow = Object.values(state.projectiles).find((projectile) => projectile.projectileType === "arrow" && projectile.targetUnitId === "red_arrow_target");
    const bolt = Object.values(state.projectiles).find((projectile) => projectile.projectileType === "turret_bolt" && projectile.targetUnitId === "red_bolt_target");
    if (!arrow || !bolt) throw new Error("Expected arrow and turret-bolt projectiles");
    expect(arrow).toMatchObject({
      projectileType: "arrow",
      tribeId: "blue",
      originUnitId: "blue_visual_archer",
      targetKind: "unit",
      targetUnitId: "red_arrow_target",
      appliesDamageOnImpact: false,
      hp: 1,
      maxHp: 1,
      armor: 0,
      attack: archerStats.attack,
      range: archerStats.range,
      attackCooldown: 0
    });
    expect(bolt).toMatchObject({
      projectileType: "turret_bolt",
      tribeId: "blue",
      originBuildingId: "blue_visual_turret",
      targetKind: "unit",
      targetUnitId: "red_bolt_target",
      appliesDamageOnImpact: false,
      hp: 1,
      maxHp: 1,
      armor: 0,
      attack: turretStats.attack,
      range: turretStats.range,
      attackCooldown: 0
    });
    expect(state.units.red_arrow_target.hp).toBeLessThan(militiaStats.hp);
    expect(state.units.red_bolt_target.hp).toBeLessThan(militiaStats.hp);
    const coverage = getCombatStatCoverageReport(state);
    expect(coverage.ok).toBe(true);
    expect(coverage.byKind.projectileType).toBe(projectileTypes.length);
    expect(coverage.byKind.projectile).toBeGreaterThanOrEqual(2);
    expect(state.events.filter((event) => event.type === "COMBAT_PROJECTILE_LAUNCHED")).toHaveLength(2);
    expect(
      state.events.find((event) => event.type === "COMBAT_PROJECTILE_LAUNCHED" && event.context?.projectileType === "arrow")?.context
    ).toMatchObject({
      x: 43,
      y: 53,
      actorTribeId: "blue",
      targetTribeId: "red",
      subjectId: arrow.id,
      targetId: "red_arrow_target",
      severity: "skirmish"
    });
    expect(
      state.events.find((event) => event.type === "COMBAT_PROJECTILE_LAUNCHED" && event.context?.projectileType === "turret_bolt")?.context
    ).toMatchObject({
      x: 56,
      y: 55,
      actorTribeId: "blue",
      targetTribeId: "red",
      subjectId: bolt.id,
      targetId: "red_bolt_target",
      severity: "skirmish"
    });

    state.units.blue_visual_archer.attack = 0;
    state.buildings.blue_visual_turret.attack = 0;
    advanceGameTicks(state, 20);

    expect(state.projectiles[arrow.id]).toBeUndefined();
    expect(state.projectiles[bolt.id]).toBeUndefined();
  });

  it("lets targeted siege orders destroy gates and turrets through normal combat", () => {
    for (const buildingType of ["gate", "turret"] as const) {
      const state = createGame(buildingType === "gate" ? 988 : 989);
      const targetBuildingId = `test_red_${buildingType}`;
      const stats = getBuildingTypeCombatStats(buildingType);
      state.buildings[targetBuildingId] = {
        id: targetBuildingId,
        type: buildingType,
        tribeId: "red",
        x: 50,
        y: 50,
        hp: 2,
        maxHp: stats.maxHp,
        armor: stats.armor,
        attack: stats.attack,
        range: stats.range,
        attackCooldown: 0,
        ...(buildingType === "gate" ? { gateState: "locked" as const, gateAccessPolicy: "owner_only" as const } : {})
      };
      for (const pos of [
        { x: 48, y: 50 },
        { x: 49, y: 50 },
        { x: 50, y: 50 },
        { x: 48, y: 51 }
      ]) {
        state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
        delete state.map[tileIndex(pos.x, pos.y)].resource;
      }
      const attackers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "militia");
      expect(attackers.length).toBeGreaterThan(0);
      for (const [index, attacker] of attackers.entries()) {
        attacker.x = 48;
        attacker.y = 50 + index;
        attacker.attackCooldown = 0;
        attacker.task = { kind: "idle" };
      }
      if (buildingType === "gate") expect(isTileWalkable(state, 50, 50, "blue")).toBe(false);

      const attack = issueSovereignOrder(state, "blue", {
        type: "ATTACK",
        priority: 1,
        targetBuildingId,
        reason: `Breach the red ${buildingType} with ordinary combat.`
      });

      expect(attack.ok).toBe(true);
      expect(attack.ok && attack.summary).toContain(`${buildingType} ${targetBuildingId}`);
      expect(attackers.some((unit) => unit.task.kind === "attackBuilding" && unit.task.targetBuildingId === targetBuildingId)).toBe(true);
      advanceGameTicks(state, 40);

      expect(state.buildings[targetBuildingId]).toBeUndefined();
      expect(isTileWalkable(state, 50, 50, "blue")).toBe(true);
      expect(state.events.some((event) => event.type === "STRUCTURE_DESTROYED" && event.body.includes(buildingType))).toBe(true);
    }
  });

  it("applies armor-reduced damage to resource deposits and removes destroyed deposits", () => {
    const state = createGame(984);
    state.map[tileIndex(20, 22)] = { terrain: "hill", resource: createResourceDeposit("coal", 3) };

    const first = damageResourceDeposit(state, { x: 20, y: 22 }, 3, "blue");
    expect(first.ok).toBe(true);
    expect(first.ok && first.destroyed).toBe(false);
    expect(state.map[tileIndex(20, 22)].resource?.hp).toBe(2);
    expect(state.map[tileIndex(20, 22)].resource?.amount).toBe(2);

    const second = damageResourceDeposit(state, { x: 20, y: 22 }, 20, "blue");
    expect(second.ok).toBe(true);
    expect(second.ok && second.destroyed).toBe(true);
    expect(state.map[tileIndex(20, 22)].resource).toBeUndefined();
    expect(state.events.some((event) => event.type === "RESOURCE_DEPOSIT_DESTROYED" && event.body.includes("20,22"))).toBe(true);
    expect(state.resourceDenials.at(-1)).toMatchObject({ type: "coal", x: 20, y: 22, attackerTribeId: "blue" });
  });

  it("classifies controlled resource deposits as defended strategic assets", () => {
    const state = createGame(986);
    const townHall = getTownHall(state, "blue");
    const target = { x: townHall.x + 3, y: townHall.y };
    state.map[tileIndex(target.x, target.y)] = { terrain: "hill", resource: createResourceDeposit("iron", 10) };
    advanceGameTicks(state, 5);

    const posture = getResourceDepositPosturesForTribe(state, "blue", { visibleOnly: true }).find((deposit) => deposit.x === target.x && deposit.y === target.y);
    const summary = getResourceControlSummary(state, "blue");

    expect(posture).toMatchObject({
      type: "iron",
      control: "controlled",
      defended: true,
      raided: false
    });
    expect(summary.controlledDeposits).toBeGreaterThan(0);
    expect(summary.defendedDeposits).toBeGreaterThan(0);
    expect(summary.survivalBonus).toBeGreaterThanOrEqual(0);
  });

  it("lets an AI attack order raid and destroy a visible resource deposit by coordinate", () => {
    const state = createGame(985);
    setAllControllers(state, "human");
    const target = { x: 21, y: 20 };
    state.map[tileIndex(target.x, target.y)] = { terrain: "hill", resource: createResourceDeposit("iron", 6) };
    const attackers = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "militia");
    expect(attackers.length).toBeGreaterThan(0);
    for (const [index, attacker] of attackers.entries()) {
      attacker.x = 20;
      attacker.y = 20 + index;
      attacker.task = { kind: "idle" };
    }
    advanceGameTicks(state, 5);

    const attack = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetX: target.x,
      targetY: target.y,
      targetResourceType: "iron",
      reason: "Deny the visible iron deposit before rivals can use it."
    });

    expect(attack.ok).toBe(true);
    expect(attack.ok && attack.summary).toContain("iron deposit 21,20");
    expect(attackers.some((unit) => unit.task.kind === "attackResource" && unit.task.resource === "iron")).toBe(true);
    const activePosture = getResourceDepositPosturesForTribe(state, "blue", { visibleOnly: true }).find((deposit) => deposit.x === target.x && deposit.y === target.y);
    expect(activePosture?.underAttack).toBe(true);
    expect(activePosture?.raiders).toContain("blue");
    advanceGameTicks(state, 30);

    expect(state.map[tileIndex(target.x, target.y)].resource).toBeUndefined();
    expect(state.events.some((event) => event.type === "RESOURCE_RAID_ORDER" && event.body.includes("21,20"))).toBe(true);
    expect(state.events.some((event) => event.type === "RESOURCE_DEPOSIT_DESTROYED" && event.body.includes("21,20"))).toBe(true);
    expect(state.resourceDenials.at(-1)).toMatchObject({ type: "iron", x: 21, y: 20, attackerTribeId: "blue" });
    expect(getResourceControlSummary(state, "blue").recentDeniedDeposits).toBeGreaterThan(0);
    expect(getRecentVisibleEvents(state, "blue", 12).some((event) => event.type === "RESOURCE_DEPOSIT_DESTROYED" && event.body.includes("21,20"))).toBe(true);
    expect(getRecentVisibleEvents(state, "red", 12).some((event) => event.body.includes("21,20"))).toBe(false);
  });

  it("rejects invalid explicit siege targets", () => {
    const state = createGame(987);
    const ownTownHall = getTownHall(state, "blue");

    const missing = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      recipientTribeId: "red",
      targetBuildingId: "missing_building",
      reason: "Attack a building that does not exist."
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error("Missing target unexpectedly accepted");
    expect(missing.reason).toContain("missing or destroyed");

    const own = issueSovereignOrder(state, "blue", {
      type: "ATTACK",
      priority: 1,
      targetBuildingId: ownTownHall.id,
      reason: "Try to attack our own town hall."
    });
    expect(own.ok).toBe(false);
    if (own.ok) throw new Error("Own target unexpectedly accepted");
    expect(own.reason).toContain("invalid attack target");
  });

  it("lets AI sovereigns file explicit issue-report orders", () => {
    const state = createGame(981);
    const report = issueSovereignOrder(state, "blue", {
      type: "REPORT_BUG",
      priority: 1,
      subject: "Missing resource visibility",
      body: "I cannot tell which contested resource deposits are worth fighting over.",
      suspectedArea: "map intelligence",
      expectedBehavior: "The sovereign should see contested resource value when deciding whether to fight.",
      actualBehavior: "The sovereign can see a conflict risk but not which deposit is worth the risk.",
      reproductionSteps: "Ask for a strategy turn near the central resource corridor and inspect the resource summary.",
      strategyImpact: "The sovereign may choose a bad war or miss a needed alliance.",
      bugSeverity: "medium",
      reason: "The AI needs better map intelligence to iterate strategy."
    });

    expect(report.ok).toBe(true);
    expect(report.ok && report.summary).toBe("Missing resource visibility");
    const event = state.events.at(-1);
    expect(event?.type).toBe("AI_SELF_REPORT");
    expect(event?.body).toContain("Missing resource visibility");
    expect(event?.body).toContain("Area: map intelligence");
    expect(event?.body).toContain("Expected: The sovereign should see contested resource value");
    expect(event?.body).toContain("Actual: The sovereign can see a conflict risk");
    expect(event?.body).toContain("Repro: Ask for a strategy turn");
    expect(event?.body).toContain("Impact: The sovereign may choose a bad war");
  });

  it("lets AI sovereigns request information without filing a bug", () => {
    const state = createGame(982);
    const request = issueSovereignOrder(state, "blue", {
      type: "REQUEST_INFO",
      priority: 1,
      subject: "Iron route intelligence",
      body: "Which visible routes lead to contested iron deposits near the center?",
      reason: "The sovereign wants better map intelligence before deciding whether to attack or negotiate."
    });

    expect(request.ok).toBe(true);
    expect(request.ok && request.summary).toBe("Iron route intelligence");
    expect(state.aiInformationRequests).toHaveLength(1);
    expect(state.aiInformationRequests[0].body).toContain("contested iron");
    expect(state.aiInformationRequests[0].answerStatus).toBe("answered");
    expect(state.aiInformationRequests[0].answer).toContain("Survival mandate");
    expect(state.aiInformationRequests[0].answer).toContain("Visible resource answer");
    expect(state.aiInformationRequests[0].answerSummary).toContain("answered");
    expect(state.events.some((event) => event.type === "AI_INFO_REQUEST" && event.body.includes("Iron route intelligence"))).toBe(true);
    expect(state.events.some((event) => event.type === "AI_INFO_ANSWER" && event.body.includes("answered"))).toBe(true);
    expect(state.events.some((candidate) => candidate.type === "AI_SELF_REPORT")).toBe(false);
  });

  it("marks hidden rival intelligence answers as partial instead of leaking private state", () => {
    const state = createGame(983);
    const request = issueSovereignOrder(state, "blue", {
      type: "REQUEST_INFO",
      priority: 1,
      subject: "Enemy private treasury",
      body: "Tell me Red Banner's hidden wealth, resources, secret plan, and unseen army.",
      reason: "The sovereign wants to decide whether to betray Red Banner."
    });

    expect(request.ok).toBe(true);
    const stored = state.aiInformationRequests[0];
    expect(stored.answerStatus).toBe("partial");
    expect(stored.answer).toContain("not directly observable");
    expect(stored.answer).toContain("scout");
    expect(stored.answer).not.toContain("Red Banner has resources");
    expect(stored.answer).not.toMatch(/Red Banner.*(gold|iron|coal|wealth)\s+\d+/);
  });

  it("handles destroyed town halls without throwing later commands", () => {
    const state = createGame(97);
    const townHall = getTownHall(state, "blue");
    const destroyed = damageBuilding(state, townHall.id, 999, "red");
    expect(destroyed.ok).toBe(true);
    expect(destroyed.ok && destroyed.destroyed).toBe(true);

    const build = issueSovereignOrder(state, "blue", {
      type: "BUILD",
      priority: 1,
      buildingType: "wall",
      reason: "Try to rebuild after town hall loss."
    });
    expect(build.ok).toBe(false);
    const train = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "messenger",
      reason: "Try to train after town hall loss."
    });
    expect(train.ok).toBe(false);
    const message = sendPlayerMessage(state, "green", "peace");
    expect(message.ok).toBe(false);
    expect(() => advanceGame(state, 30)).not.toThrow();
  });

  it("keeps LLM replies explicit and forms alliances only through accepted messages", () => {
    const state = createGame(111);
    setAllControllers(state, "llm");
    const offer = issueSovereignOrder(state, "blue", {
      type: "PROPOSE_ALLIANCE",
      priority: 1,
      recipientTribeId: "green",
      subject: "Exclusive road pact",
      body: "Blue Crown proposes an exclusive alliance with Green Vale if your council accepts.",
      reason: "Test discussion-driven alliance."
    });
    expect(offer.ok).toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    advanceGame(state, 220);

    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
    expect(packet?.state).toBe("AWAITING_REPLY");
    expect(packet?.messageIds.length).toBe(1);
    const original = packet ? state.messages[packet.messageIds[0]] : undefined;
    expect(original?.readTick).toBeDefined();

    if (!packet) throw new Error("Missing alliance offer packet");
    const reply = attachReplyToPacket(state, packet.id, {
      subject: "Re: Exclusive road pact",
      body: "Green Vale accepts this exclusive alliance. We will keep messengers safe and share warnings from the southern road.",
      diplomacyIntent: "ALLIANCE_ACCEPT"
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) throw new Error("Expected alliance reply to attach");
    const replyMessage = state.messages[reply.messageId];
    expect(replyMessage.deliveredTick).toBeUndefined();
    expect(replyMessage.readTick).toBeUndefined();
    expect(state.packets[packet.id].state).toBe("IN_TRANSIT_RETURN");
    expect(state.alliances.blue).toBe("green");
    expect(state.alliances.green).toBe("blue");
    advanceGame(state, 220);
    expect(state.packets[packet.id].state).toBe("COMPLETED");
    expect(replyMessage.deliveredTick).toBeDefined();
    expect(replyMessage.readTick).toBeDefined();
  });

  it("requires matching explicit leadership before executing a civilization merger", () => {
    const state = createGame(113);
    setAllControllers(state, "llm");
    const offer = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "MERGER_PROPOSAL",
      diplomacyIntent: "MERGER_OFFER",
      mergerLeaderTribeId: "blue",
      mergerTerms: "Blue would hold the single crown while Green keeps its village names.",
      subject: "One crown proposal",
      body: "Blue proposes that our peoples merge into one civilization under Blue leadership.",
      reason: "Test negotiated merger safety."
    });
    expect(offer.ok).toBe(true);
    advanceGame(state, 220);

    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
    if (!packet) throw new Error("Missing merger offer packet");
    expect(packet.state).toBe("AWAITING_REPLY");

    const reply = attachReplyToPacket(state, packet.id, {
      subject: "Re: One crown proposal",
      body: "Green accepts only if Red holds the crown instead.",
      diplomacyIntent: "MERGER_ACCEPT",
      mergerLeaderTribeId: "red",
      mergerTerms: "Counteroffer: Red holds the single crown."
    });

    expect(reply.ok).toBe(true);
    if (!reply.ok) throw new Error("Expected reply to attach");
    expect(reply.mergerExecuted).toBe(false);
    expect(reply.mergerRecordId).toBeUndefined();
    expect(state.civilizationMergers).toHaveLength(0);
    expect(isTribeActive(state, "blue")).toBe(true);
    expect(isTribeActive(state, "green")).toBe(true);
    expect(state.tribes.green.mergedIntoTribeId).toBeUndefined();
  });

  it("merges civilizations only through accepted messenger terms under one leader", () => {
    const state = createGame(114);
    setAllControllers(state, "llm");
    state.tribes.green.developments.push("masonry");
    state.tribes.green.resources.gold = 77;
    state.tribes.green.resources.iron = 31;
    const allyResult = formAlliance(state, "green", "purple");
    expect(allyResult.ok).toBe(true);
    state.wars.green.red = true;
    state.wars.red.green = true;

    const offer = issueSovereignOrder(state, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "MERGER_PROPOSAL",
      diplomacyIntent: "MERGER_OFFER",
      mergerLeaderTribeId: "blue",
      mergerTerms: "Green keeps its households; Blue takes one crown and one survival fate for both peoples.",
      subject: "One survival compact",
      body: "Blue proposes a full merger into one civilization. Blue will be the sole leader and protect both populations from the century cull.",
      reason: "Test full merger transfer."
    });
    expect(offer.ok).toBe(true);
    advanceGame(state, 220);

    const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
    if (!packet) throw new Error("Missing accepted merger packet");
    expect(packet.state).toBe("AWAITING_REPLY");
    const original = state.messages[packet.messageIds[0]];
    expect(original.diplomacyIntent).toBe("MERGER_OFFER");
    expect(original.mergerLeaderTribeId).toBe("blue");
    const blueResourcesBefore = { ...state.tribes.blue.resources };
    const greenResourcesBefore = { ...state.tribes.green.resources };
    const blueUnitsBefore = Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.hp > 0).length;
    const greenUnitsBefore = Object.values(state.units).filter((unit) => unit.tribeId === "green" && unit.hp > 0).length;
    const blueBuildingsBefore = Object.values(state.buildings).filter((building) => building.tribeId === "blue" && building.hp > 0).length;
    const greenBuildingsBefore = Object.values(state.buildings).filter((building) => building.tribeId === "green" && building.hp > 0).length;

    const reply = attachReplyToPacket(state, packet.id, {
      subject: "Re: One survival compact",
      body: "Green accepts the merger under Blue as sole leader. Our people will share one treasury, one defense, and one fate.",
      diplomacyIntent: "MERGER_ACCEPT",
      mergerLeaderTribeId: "blue",
      mergerTerms: "Green keeps its households; Blue takes one crown and one survival fate for both peoples."
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) throw new Error("Expected merger reply to attach");
    expect(reply.mergerExecuted).toBe(true);
    expect(reply.mergerRecordId).toBeDefined();

    const record = state.civilizationMergers.at(-1);
    expect(record).toMatchObject({
      id: reply.mergerRecordId,
      leaderTribeId: "blue",
      mergedTribeId: "green",
      proposerTribeId: "blue",
      accepterTribeId: "green",
      proposalMessageId: original.id,
      acceptanceMessageId: reply.messageId,
      transferredUnits: greenUnitsBefore,
      transferredBuildings: greenBuildingsBefore
    });
    expect(record?.terms).toContain("Blue takes one crown");
    expect(record?.transferredResources.gold).toBe(greenResourcesBefore.gold);
    expect(record?.transferredResources.iron).toBe(greenResourcesBefore.iron);

    expect(state.tribes.green.eliminated).toBe(false);
    expect(state.tribes.green.mergedIntoTribeId).toBe("blue");
    expect(state.tribes.green.mergedLeaderTribeId).toBe("blue");
    expect(isTribeActive(state, "green")).toBe(false);
    expect(isTribeActive(state, "blue")).toBe(true);
    for (const type of resourceTypes) {
      expect(state.tribes.blue.resources[type]).toBe(blueResourcesBefore[type] + greenResourcesBefore[type]);
      expect(state.tribes.green.resources[type]).toBe(0);
    }
    expect(state.tribes.blue.developments).toContain("masonry");
    expect(Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.hp > 0)).toHaveLength(blueUnitsBefore + greenUnitsBefore);
    expect(Object.values(state.units).filter((unit) => unit.tribeId === "green" && unit.hp > 0)).toHaveLength(0);
    expect(Object.values(state.units).filter((unit) => unit.tribeId === "blue" && unit.type === "sovereign" && unit.hp > 0)).toHaveLength(1);
    expect(Object.values(state.units).some((unit) => unit.id === record?.retiredSovereignUnitId && unit.type === "sentinel" && unit.tribeId === "blue")).toBe(true);
    expect(Object.values(state.buildings).filter((building) => building.tribeId === "blue" && building.hp > 0)).toHaveLength(blueBuildingsBefore + greenBuildingsBefore);
    expect(Object.values(state.buildings).filter((building) => building.tribeId === "green" && building.hp > 0)).toHaveLength(0);
    expect(state.alliances.blue).toBe("purple");
    expect(state.alliances.purple).toBe("blue");
    expect(state.alliances.green).toBeUndefined();
    expect(state.wars.blue.red).toBe(true);
    expect(state.wars.red.blue).toBe(true);
    expect(state.wars.green.red).toBeUndefined();

    const victory = getVictoryPressure(state);
    expect(victory.survivingTribes).toBe(4);
    expect(victory.mergedTribes).toBe(1);
    expect(victory.eliminatedTribes).toBe(0);
    expect(victory.scoreByTribe.find((entry) => entry.tribeId === "green")?.mergedIntoTribeId).toBe("blue");
    expect(state.events.some((event) => event.type === "CIVILIZATION_MERGED" && event.body.includes("Terms:"))).toBe(true);
    expect(summarizeSovereignMemory(state, "blue")).toContain("Merger executed");
    expect(summarizeSovereignMemory(state, "green")).toContain("Merger executed");
  });

  it("rejects late LLM replies for packets that are no longer awaiting a reply", () => {
    for (const staleState of ["KILLED_WITH_PACKET", "OVERDUE"] as const) {
      const state = createGame(112);
      setAllControllers(state, "llm");
      const offer = issueSovereignOrder(state, "blue", {
        type: "PROPOSE_ALLIANCE",
        priority: 1,
        recipientTribeId: "green",
        subject: "Late road pact",
        body: "Blue Crown proposes an alliance, if this packet still exists when your council replies.",
        reason: "Test stale packet reply handling."
      });
      expect(offer.ok).toBe(true);
      advanceGame(state, 220);

      const packet = Object.values(state.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
      if (!packet) throw new Error("Missing stale reply packet");
      expect(packet.state).toBe("AWAITING_REPLY");
      const originalMessageCount = Object.keys(state.messages).length;
      const originalPacketMessageIds = [...packet.messageIds];

      packet.state = staleState;
      packet.carrierUnitId = undefined;
      packet.lastStateChangeTick = state.tick;

      const lateReply = attachReplyToPacket(state, packet.id, {
        subject: "Re: Late road pact",
        body: "Green Vale accepts this alliance, but the messenger state has already changed.",
        diplomacyIntent: "ALLIANCE_ACCEPT"
      });

      expect(lateReply.ok).toBe(false);
      if (lateReply.ok) throw new Error("Late reply unexpectedly attached");
      expect(lateReply.reason).toContain(staleState.toLowerCase().replaceAll("_", " "));
      expect(packet.messageIds).toEqual(originalPacketMessageIds);
      expect(Object.keys(state.messages)).toHaveLength(originalMessageCount);
      expect(state.alliances.blue).toBeUndefined();
      expect(state.alliances.green).toBeUndefined();
    }
  });
});

function blockCardinalNeighbors(state: ReturnType<typeof createGame>, x: number, y: number): void {
  for (const [index, pos] of [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ].entries()) {
    state.buildings[`test_wall_${index}`] = {
      id: `test_wall_${index}`,
      type: "wall",
      tribeId: "green",
      x: pos.x,
      y: pos.y,
      hp: 240,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
  }
}

function contestedResourceSignature(state: ReturnType<typeof createGame>): string[] {
  const center = { x: Math.floor(MAP_SIZE / 2), y: Math.floor(MAP_SIZE / 2) };
  const contested = new Set(["coal", "iron", "limestone", "clay", "stone", "gold"]);
  const radius = Math.round((58 / 128) * MAP_SIZE);
  return state.map
    .flatMap((tile, index) => {
      if (!tile.resource || !contested.has(tile.resource.type)) return [];
      const x = index % MAP_SIZE;
      const y = Math.floor(index / MAP_SIZE);
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance > radius) return [];
      return [`${tile.resource.type}:${x},${y}`];
    })
    .sort();
}

function resourcePlacementSignature(state: ReturnType<typeof createGame>): string {
  return state.map
    .flatMap((tile, index) => {
      if (!tile.resource) return [];
      const x = index % MAP_SIZE;
      const y = Math.floor(index / MAP_SIZE);
      return `${tile.resource.type}:${x},${y}:${Math.round(tile.resource.amount)}`;
    })
    .sort()
    .join("|");
}

function resourceTileCounts(state: ReturnType<typeof createGame>): Record<(typeof resourceTypes)[number], number> {
  const counts = Object.fromEntries(resourceTypes.map((type) => [type, 0])) as Record<(typeof resourceTypes)[number], number>;
  for (const tile of state.map) {
    if (tile.resource && tile.resource.amount > 0) counts[tile.resource.type] += 1;
  }
  return counts;
}
