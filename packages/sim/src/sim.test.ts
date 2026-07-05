import { describe, expect, it } from "vitest";
import { TICKS_PER_GAME_YEAR, TICK_RATE, advanceGame, advanceGameTicks, appendSovereignMemory, applyTribeIdentity, assignGathering, attachReplyToPacket, buildStructure, createGame, damageBuilding, formAlliance, getCurrentYear, getBuildingCost, getTownHall, getVictoryPressure, getVisibleUnits, isTileWalkable, issueSovereignOrder, recordAiDecision, renameUnits, sendPlayerMessage, setAllControllers, setGateState, summarizeDiplomaticIntel, summarizeSovereignMemory, tileIndex, worldSignature } from "./index";

describe("Sovereign Worlds vertical slice simulation", () => {
  it("is deterministic for the same seed and elapsed time", () => {
    const a = createGame(42);
    const b = createGame(42);
    advanceGame(a, 60);
    advanceGame(b, 60);
    expect(worldSignature(a)).toEqual(worldSignature(b));
  });

  it("keeps distant enemy units out of the player visibility projection", () => {
    const state = createGame(7);
    const visible = getVisibleUnits(state, "blue");
    expect(visible.some((unit) => unit.tribeId === "red")).toBe(false);
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

  it("exposes health, armor, attack, and range stats on all units and buildings", () => {
    const state = createGame(10);
    for (const unit of Object.values(state.units)) {
      expect(unit.maxHp).toBeGreaterThan(0);
      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.armor).toBeGreaterThanOrEqual(0);
      expect(unit.attack).toBeGreaterThanOrEqual(0);
      expect(unit.range).toBeGreaterThanOrEqual(0);
    }
    for (const building of Object.values(state.buildings)) {
      expect(building.maxHp).toBeGreaterThan(0);
      expect(building.hp).toBeGreaterThan(0);
      expect(building.armor).toBeGreaterThanOrEqual(0);
      expect(building.attack).toBeGreaterThanOrEqual(0);
      expect(building.range).toBeGreaterThanOrEqual(0);
    }
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
    if (!defaultRealm.ok) expect(defaultRealm.reason).toContain("default placeholder");
    expect(state.tribes.green.name).toBe("Green Vale");
    expect(state.tribes.green.identityChosen).toBe(false);

    const defaultSovereign = applyTribeIdentity(state, "green", {
      realmName: "Verdant Canopy",
      sovereignName: "Green Vale Sovereign",
      namingStyle: "nature",
      inspiration: "forest epics"
    });

    expect(defaultSovereign.ok).toBe(false);
    if (!defaultSovereign.ok) expect(defaultSovereign.reason).toContain("default placeholder");
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
    state.map[tileIndex(clayTile.x, clayTile.y)] = { terrain: "grass", resource: { type: "clay", amount: 50 } };
    state.map[tileIndex(ironTile.x, ironTile.y)] = { terrain: "hill", resource: { type: "iron", amount: 50 } };
    state.map[tileIndex(limestoneTile.x, limestoneTile.y)] = { terrain: "hill", resource: { type: "limestone", amount: 50 } };
    state.map[tileIndex(coalTile.x, coalTile.y)] = { terrain: "hill", resource: { type: "coal", amount: 50 } };
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

  it("eliminates the poorest surviving population at a century review", () => {
    const state = createGame(9351);
    state.victoryPressure.nextReviewYear = 1;
    state.tribes.blue.resources = { gold: 0, food: 0, wood: 0, stone: 0, clay: 0, limestone: 0, iron: 0, coal: 0 };
    state.tribes.blue.happiness = 0;
    state.tribes.blue.lastYearWealth = 0;

    advanceGame(state, 0.2);

    expect(state.tribes.blue.eliminated).toBe(true);
    expect(state.tribes.blue.eliminatedYear).toBe(1);
    const pressure = getVictoryPressure(state);
    expect(pressure.survivingTribes).toBe(4);
    expect(state.postGameLearnings).toHaveLength(5);
    expect(state.postGameLearnings.some((learning) => learning.tribeId === "blue" && learning.outcome === "eliminated")).toBe(true);
    expect(summarizeSovereignMemory(state, "blue")).toContain("wiped out in year 1");
    expect(summarizeSovereignMemory(state, "blue")).toContain("total safety failure");
    expect(state.events.some((event) => event.type === "AI_LEARNING_APPLIED")).toBe(true);
    expect(state.events.some((event) => event.type === "CENTURY_POPULATION_ELIMINATED")).toBe(true);
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
      reason: "Breach the red wall blocking future routes."
    });

    expect(attack.ok).toBe(true);
    expect(state.alliances.blue).toBeUndefined();
    expect(state.alliances.red).toBeUndefined();
    expect(state.wars.blue.red).toBe(true);
    expect(attack.ok && attack.summary).toContain("test_red_wall");
    expect(attackers.some((unit) => unit.task.kind === "attackBuilding" && unit.task.targetBuildingId === "test_red_wall")).toBe(true);

    advanceGameTicks(state, 40);

    expect(state.buildings.test_red_wall).toBeUndefined();
    expect(isTileWalkable(state, 50, 50)).toBe(true);
    expect(state.events.some((event) => event.type === "WAR_SIEGE_ORDER" && event.body.includes("test_red_wall"))).toBe(true);
    expect(state.events.some((event) => event.type === "STRUCTURE_DESTROYED" && event.body.includes("50,50"))).toBe(true);
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
  const center = { x: 64, y: 64 };
  const contested = new Set(["coal", "iron", "limestone", "clay", "stone", "gold"]);
  return state.map
    .flatMap((tile, index) => {
      if (!tile.resource || !contested.has(tile.resource.type)) return [];
      const x = index % 128;
      const y = Math.floor(index / 128);
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance > 42) return [];
      return [`${tile.resource.type}:${x},${y}`];
    })
    .sort();
}
