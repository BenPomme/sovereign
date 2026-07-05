import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceGame, advanceGameTicks, appendSovereignMemory, attachReplyToPacket, buildStructure, createGame, createResourceDeposit, getTownHall, issueSovereignOrder, recordAiDecision, sendPlayerMessage, setAllControllers, tileIndex } from "../../../packages/sim/src";
import {
  OllamaRequestError,
  chooseDefaultModel,
  describeOllamaFailure,
  fallbackDecision,
  isChatSchemaCompatibleModel,
  isGenerateSchemaCompatibleModel,
  isSchemaTurnCompatibleModel,
  parseOllamaJsonObject,
  requestSovereignDecision,
  requestSovereignReply
} from "./llm";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Ollama JSON recovery", () => {
  it("prefers the clean qwen schema model and routes gpt-oss through chat schema turns", () => {
    const models = [
      { name: "gpt-oss:20b", model: "gpt-oss:20b" },
      { name: "gemma4:12b", model: "gemma4:12b" },
      { name: "qwen3.5:9b-mlx", model: "qwen3.5:9b-mlx" }
    ];

    expect(chooseDefaultModel(models)).toBe("qwen3.5:9b-mlx");
    expect(isSchemaTurnCompatibleModel("gpt-oss:20b")).toBe(true);
    expect(isGenerateSchemaCompatibleModel("qwen3.5:9b-mlx")).toBe(true);
    expect(isGenerateSchemaCompatibleModel("gemma4:12b")).toBe(true);
    expect(isGenerateSchemaCompatibleModel("gpt-oss:20b")).toBe(false);
    expect(isChatSchemaCompatibleModel("gpt-oss:20b")).toBe(true);
  });

  it("uses gpt-oss before gemma when qwen is unavailable", () => {
    const models = [
      { name: "gemma4:12b", model: "gemma4:12b" },
      { name: "gpt-oss:20b", model: "gpt-oss:20b" }
    ];

    expect(chooseDefaultModel(models)).toBe("gpt-oss:20b");
  });

  it("parses direct JSON objects", () => {
    const parsed = parseOllamaJsonObject<{ strategySummary: string }>('{"strategySummary":"Hold the road."}', "test");

    expect(parsed.strategySummary).toBe("Hold the road.");
  });

  it("does not issue fallback orders for eliminated tribes", () => {
    const game = createGame(20260701);
    game.tribes.blue.eliminated = true;
    game.tribes.blue.eliminatedYear = 100;

    const decision = fallbackDecision(game, "blue");

    expect(decision.orders).toEqual([]);
    expect(decision.strategySummary).toContain("no orders after elimination");
  });

  it("does not send fallback messengers to eliminated populations", () => {
    const game = createGame(20260701);
    game.tribes.red.eliminated = true;
    game.tribes.red.eliminatedYear = 100;

    const decision = fallbackDecision(game, "blue");

    expect(decision.orders[0]).toMatchObject({
      type: "SEND_MESSENGER",
      recipientTribeId: "green"
    });
  });

  it("extracts JSON from fenced output", () => {
    const parsed = parseOllamaJsonObject<{ subject: string }>('```json\n{"subject":"Road compact"}\n```', "test");

    expect(parsed.subject).toBe("Road compact");
  });

  it("extracts JSON from surrounding prose", () => {
    const parsed = parseOllamaJsonObject<{ body: string }>('Here is the response:\n{"body":"We accept safe passage."}\nEnd.', "test");

    expect(parsed.body).toBe("We accept safe passage.");
  });

  it("repairs trailing commas before closing braces", () => {
    const parsed = parseOllamaJsonObject<{ bugReport: string }>('{"bugReport":"",}', "test");

    expect(parsed.bugReport).toBe("");
  });

  it("normalizes smart quote characters", () => {
    const parsed = parseOllamaJsonObject<{ realmName: string }>("{\u201crealmName\u201d:\u201cAurelian March\u201d}", "test");

    expect(parsed.realmName).toBe("Aurelian March");
  });

  it("closes truncated strings and containers when the object is otherwise usable", () => {
    const parsed = parseOllamaJsonObject<{ strategySummary: string }>('{"strategySummary":"Secure the central iron road', "test");

    expect(parsed.strategySummary).toBe("Secure the central iron road");
  });

  it("preserves AI-authored bug report fields through safe syntax repair", () => {
    const parsed = parseOllamaJsonObject<{ bugReport: string; orders: Array<{ type: string; subject: string }> }>(
      '{"bugReport":"Wall preview is missing for mine defense.","orders":[{"type":"REPORT_BUG","subject":"Wall preview missing",}],}',
      "test"
    );

    expect(parsed.bugReport).toBe("Wall preview is missing for mine defense.");
    expect(parsed.orders[0].type).toBe("REPORT_BUG");
    expect(parsed.orders[0].subject).toBe("Wall preview missing");
  });

  it("preserves structured REPORT_BUG details from model decisions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Stop and report the broken wall feedback before planning war.",
          strategySummary: "Report missing wall visibility.",
          memoryNote: "Need wall visibility fixed before relying on perimeter defense.",
          orders: [
            {
              type: "REPORT_BUG",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Wall not visible after construction",
              body: "A new wall was accepted but I cannot see its map representation.",
              suspectedArea: "map rendering",
              expectedBehavior: "Accepted wall construction should create a visible blocking wall tile.",
              actualBehavior: "The accepted order says the wall exists but the board gives no visible barrier.",
              reproductionSteps: "Build a wall, then inspect the map and defense overlay near the town hall.",
              strategyImpact: "I cannot judge whether my people are safe behind the wall.",
              bugSeverity: "high",
              reason: "Defense planning depends on visible wall placement."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "REPORT_BUG",
      subject: "Wall not visible after construction",
      suspectedArea: "map rendering",
      expectedBehavior: "Accepted wall construction should create a visible blocking wall tile.",
      actualBehavior: "The accepted order says the wall exists but the board gives no visible barrier.",
      reproductionSteps: "Build a wall, then inspect the map and defense overlay near the town hall.",
      strategyImpact: "I cannot judge whether my people are safe behind the wall.",
      bugSeverity: "high"
    });
  });

  it("promotes structured bug-report details even when the model uses the wrong order type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "The population ledger contradiction must be reported before policy.",
          strategySummary: "Expose false population data via bug report.",
          memoryNote: "Do not plan from contradictory population records.",
          orders: [
            {
              type: "SET_POLICY",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Impossible population contradiction",
              body: "The world ledger says zero living subjects while the town hall roster shows living people.",
              suspectedArea: "world ledger generation",
              expectedBehavior: "Population records should match the visible roster.",
              actualBehavior: "The public roll reports zero subjects despite visible living units.",
              reproductionSteps: "Compare the public roll with the town hall roster.",
              strategyImpact: "False population data makes survival planning unsafe.",
              bugSeverity: "high",
              reason: "The ledger contradiction is invalid feedback, not fog of war."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "high"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "REPORT_BUG",
      subject: "Impossible population contradiction",
      suspectedArea: "world ledger generation",
      bugSeverity: "high"
    });
  });

  it("turns explicit masonry policy language into an immediate development order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "I will secure the settlement by unlocking real wall construction before diplomacy.",
          strategySummary: "Choose Masonry before wall building.",
          memoryNote: "Begin the defensive doctrine with Masonry.",
          orders: [
            {
              type: "SET_POLICY",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Develop Masonry now so my people can raise walls before the century review."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "DEVELOP",
      developmentId: "masonry"
    });
  });

  it("turns explicit wall policy language into a placed build order after Masonry", async () => {
    const game = createGame(20260702);
    const developed = issueSovereignOrder(game, "blue", {
      type: "DEVELOP",
      priority: 1,
      developmentId: "masonry",
      reason: "Unlock wall construction."
    });
    expect(developed.ok).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "I will put a northern wall segment where enemy scouts are most likely to test the border.",
          strategySummary: "Build a placed wall segment.",
          memoryNote: "First wall should protect the north approach.",
          orders: [
            {
              type: "SET_POLICY",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              targetX: 18,
              targetY: 15,
              reason: "Build a wall at 18,15 to mark the northern perimeter."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "BUILD",
      buildingType: "wall",
      targetX: 18,
      targetY: 15
    });
  });

  it("turns explicit gate policy language into a placed build order after Masonry and Ironworking", async () => {
    const game = createGame(20260703);
    game.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(
      issueSovereignOrder(game, "blue", {
        type: "DEVELOP",
        priority: 1,
        developmentId: "masonry",
        reason: "Unlock stone fortification foundations."
      }).ok
    ).toBe(true);
    expect(
      issueSovereignOrder(game, "blue", {
        type: "DEVELOP",
        priority: 1,
        developmentId: "ironworking",
        reason: "Unlock gate hinges and locks."
      }).ok
    ).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "I need a controlled passage through my wall line so my own messengers can move when it is safe.",
          strategySummary: "Build a lockable gate.",
          memoryNote: "The first gate should guard the north road.",
          orders: [
            {
              type: "SET_POLICY",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              targetX: 19,
              targetY: 16,
              reason: "Build a gatehouse at 19,16 to create a lockable passage."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "BUILD",
      buildingType: "gate",
      targetX: 19,
      targetY: 16
    });
  });

  it("preserves LLM-authored gate access policy orders for owned gates", async () => {
    const game = createGame(20260704);
    game.tribes.blue.resources = { gold: 500, food: 500, wood: 500, stone: 500, clay: 500, limestone: 500, iron: 500, coal: 500 };
    expect(issueSovereignOrder(game, "blue", { type: "DEVELOP", priority: 1, developmentId: "masonry", reason: "Unlock stone gates." }).ok).toBe(true);
    expect(issueSovereignOrder(game, "blue", { type: "DEVELOP", priority: 1, developmentId: "ironworking", reason: "Unlock gate hardware." }).ok).toBe(true);
    const built = buildStructure(game, "blue", "gate", getTownHall(game, "blue"));
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("Gate unexpectedly failed to build");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "I will stop all allied passage until the treaty terms become explicit.",
          strategySummary: "Restrict gate access.",
          memoryNote: "Gate policy is leverage in negotiations.",
          orders: [
            {
              type: "SET_GATE",
              priority: 1,
              buildingId: built.buildingId,
              gateState: "open",
              gateAccessPolicy: "owner_only",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Keep the gate open for Blue only while talks continue."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders[0]).toMatchObject({
      type: "SET_GATE",
      buildingId: built.buildingId,
      gateState: "open",
      gateAccessPolicy: "owner_only"
    });
  });

  it("includes a sovereign catch-up brief with accessible context since its last move", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Prioritize food before risky diplomacy.",
      strategySummary: "Previous food plan.",
      memoryNote: "Food first, then guarded diplomacy.",
      orders: [],
      accepted: ["SET_POLICY: food first"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const sent = issueSovereignOrder(game, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "LETTER",
      diplomacyIntent: "PEACE_OFFER",
      subject: "Share road reports",
      body: "Tell me whether the southern road is safe before we trade.",
      reason: "Ask Green for useful intelligence."
    });
    expect(sent.ok).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Use the new road question as leverage while protecting food stores.",
          strategySummary: "Wait for Green while improving internal safety.",
          memoryNote: "Green was asked about the southern road.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("Since your last move:");
    expect(body.prompt).toContain("previous move at turn 0: Previous food plan.");
    expect(body.prompt).toContain('you sent PEACE_OFFER to Green Vale: "Share road reports"');
    expect(body.prompt).toContain("Tell me whether the southern road is safe");
  });

  it("includes new visible scouting observations since the sovereign's last move", async () => {
    const game = createGame(20260702);
    setAllControllers(game, "human");
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Watch for concrete border evidence before trusting foreign claims.",
      strategySummary: "Previous border watch.",
      memoryNote: "Only act on visible scouting or delivered messages.",
      orders: [],
      accepted: ["SET_POLICY: border watch"],
      rejected: []
    });

    const blueTownHall = getTownHall(game, "blue");
    const redPeon = Object.values(game.units).find((unit) => unit.tribeId === "red" && unit.type === "peon");
    if (!redPeon) throw new Error("Expected Red peon");
    redPeon.x = blueTownHall.x + 2;
    redPeon.y = blueTownHall.y;
    redPeon.task = { kind: "idle" };
    advanceGameTicks(game, 5);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "React to the newly sighted Red worker without inventing hidden Yellow facts.",
          strategySummary: "Use visible scouting evidence only.",
          memoryNote: "A Red peon was sighted near Blue territory.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const catchUp = catchUpSection(body.prompt);
    expect(catchUp).toContain("new scouting observations");
    expect(catchUp).toContain("sighted red (Red Banner) peon");
    expect(catchUp).toContain(`${Math.round(redPeon.x)},${Math.round(redPeon.y)}`);
    expect(catchUp).not.toContain("yellow");
  });

  it("uses a reply as the catch-up cursor for the next strategy move", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Probe the southern road.",
      strategySummary: "Previous road strategy.",
      memoryNote: "Ask before committing food stores.",
      orders: [],
      accepted: ["SET_POLICY: probe road"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const sent = issueSovereignOrder(game, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "LETTER",
      diplomacyIntent: "PEACE_OFFER",
      subject: "Old road question",
      body: "This was already considered before my latest reply.",
      reason: "Older diplomacy should not be repeated as new catch-up after a later reply."
    });
    expect(sent.ok).toBe(true);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Answer Green without revealing reserves.",
      strategySummary: "Previous reply posture.",
      memoryNote: "Green was answered guardedly.",
      orders: [],
      accepted: ["REPLY: guarded answer to Green"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const recruited = issueSovereignOrder(game, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "peon",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "",
      body: "",
      reason: "Grow the labor force after the latest reply."
    });
    expect(recruited.ok).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Use the post-reply labor growth as the newest fact.",
          strategySummary: "Plan from the latest move.",
          memoryNote: "Labor growth followed the guarded reply.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const catchUp = catchUpSection(body.prompt);
    expect(body.prompt).toContain("previous move at turn 1: Previous reply posture.");
    expect(body.prompt).toContain("last strategy at turn 0: Previous road strategy.");
    expect(catchUp).toContain("trains peon");
    expect(catchUp).not.toContain("Old road question");
    expect(promptLineValue(body.prompt, "Recent diplomacy you can remember:")).toBe("none");
  });

  it("does not replay old information answers after the sovereign's last move", async () => {
    const game = createGame(20260702);
    const oldRequest = issueSovereignOrder(game, "blue", {
      type: "REQUEST_INFO",
      priority: 1,
      subject: "Old granary audit",
      body: "Tell me the old visible food route before my next doctrine.",
      reason: "Create an information answer before the cursor."
    });
    expect(oldRequest.ok).toBe(true);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Absorb the old answer and move on.",
      strategySummary: "Previous post-answer doctrine.",
      memoryNote: "Old granary answer was already considered.",
      orders: [],
      accepted: ["SET_POLICY: old answer considered"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const recruited = issueSovereignOrder(game, "blue", {
      type: "RECRUIT",
      priority: 1,
      unitType: "peon",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "",
      body: "",
      reason: "Create a new accessible event after the cursor."
    });
    expect(recruited.ok).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Use only the new post-cursor labor fact, not the old answer.",
          strategySummary: "Old answers are not replayed as recent.",
          memoryNote: "Prompt cursor kept old info out of recent answers.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const catchUp = catchUpSection(body.prompt);
    expect(catchUp).toContain("trains peon");
    expect(body.prompt).toContain("Recent information answers: none");
    expect(body.prompt).not.toContain("Old granary audit");
    expect(body.prompt).not.toContain("Tell me the old visible food route");
  });

  it("keeps rival private decision summaries out of another sovereign catch-up prompt", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Watch the north road.",
      strategySummary: "Previous Blue road watch.",
      memoryNote: "Keep Blue's northern watch private.",
      orders: [],
      accepted: ["SET_POLICY: watch north"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    recordAiDecision(game, {
      tribeId: "red",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Pretend friendship while preparing a raid.",
      strategySummary: "Red secret betrayal plan: raid Blue after the next harvest.",
      memoryNote: "Hide the attack plan from Blue.",
      orders: [],
      accepted: ["SET_POLICY: secret raid"],
      rejected: []
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Continue from Blue's own memory without omniscient rival plans.",
          strategySummary: "Blue keeps private context boundaries.",
          memoryNote: "Rival private doctrine was not visible.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("previous move at turn 0: Previous Blue road watch.");
    expect(body.prompt).not.toContain("Red secret betrayal plan");
    expect(body.prompt).not.toContain("secret raid");
  });

  it("does not expose an inbound reply to the sender before the messenger returns", async () => {
    const game = createGame(20260702);
    setAllControllers(game, "llm");
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Question Green before committing the southern road.",
      strategySummary: "Previous Blue messenger posture.",
      memoryNote: "Wait for physical messenger return before trusting Green's answer.",
      orders: [],
      accepted: ["SET_POLICY: wait for courier"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const sent = issueSovereignOrder(game, "blue", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "green",
      messageType: "LETTER",
      diplomacyIntent: "PEACE_OFFER",
      subject: "South road question",
      body: "Can Green report whether the south road is safe enough for grain trade?",
      reason: "Create a physical diplomacy packet for prompt visibility."
    });
    expect(sent.ok).toBe(true);
    advanceGame(game, 220);
    const packet = Object.values(game.packets).find((candidate) => candidate.originTribeId === "blue" && candidate.recipientTribeId === "green");
    if (!packet) throw new Error("Expected Blue to Green packet");
    expect(packet.state).toBe("AWAITING_REPLY");

    const hiddenReplyBody = "Hidden return-only reply: Green will pretend peace while taxing the south road.";
    const reply = attachReplyToPacket(game, packet.id, {
      subject: "Re: South road question",
      body: hiddenReplyBody,
      diplomacyIntent: "PEACE_OFFER"
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) throw new Error("Expected reply to attach");
    expect(game.messages[reply.messageId].deliveredTick).toBeUndefined();
    expect(game.messages[reply.messageId].readTick).toBeUndefined();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Wait for the messenger before reacting to Green's unknown answer.",
          strategySummary: "Blue does not read undelivered replies.",
          memoryNote: "Do not infer the reply before the courier returns.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");
    const beforeReturnBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(beforeReturnBody.prompt).toContain("South road question");
    expect(beforeReturnBody.prompt).toContain("Diplomatic intelligence ledger:");
    expect(beforeReturnBody.prompt).toContain("you to Green Vale question PEACE_OFFER");
    expect(beforeReturnBody.prompt).not.toContain(hiddenReplyBody);

    advanceGame(game, 220);
    expect(game.packets[packet.id].state).toBe("COMPLETED");
    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");
    const afterReturnBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(afterReturnBody.prompt).toContain(hiddenReplyBody);
    expect(afterReturnBody.prompt).toContain("unverified, may be false");
  });

  it("uses the durable per-sovereign cursor after the global decision history evicts the old move", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Hold the western road for food security.",
      strategySummary: "Blue long-lived road doctrine.",
      memoryNote: "This old Blue doctrine must survive global decision rotation.",
      orders: [],
      accepted: ["SET_POLICY: hold road"],
      rejected: []
    });
    for (let index = 0; index < 45; index += 1) {
      advanceGameTicks(game, 1);
      recordAiDecision(game, {
        tribeId: "red",
        provider: "ollama",
        model: "qwen3.5:9b-mlx",
        freeformStrategy: "Fill the bounded decision log.",
        strategySummary: `Red filler move ${index}.`,
        memoryNote: "",
        orders: [],
        accepted: ["SET_POLICY: rotate"],
        rejected: []
      });
    }
    expect(game.aiDecisions.some((decision) => decision.tribeId === "blue")).toBe(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Continue from the old Blue doctrine even after history rotation.",
          strategySummary: "Blue cursor survived rotation.",
          memoryNote: "Durable cursor preserved old doctrine.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("previous move at turn 0: Blue long-lived road doctrine.");
    expect(body.prompt).not.toContain("first strategic move");
  });

  it("keeps ordinary accessible catch-up windows complete instead of silently omitting older items", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Listen for public court events.",
      strategySummary: "Blue listens for public events.",
      memoryNote: "Track public policy changes.",
      orders: [],
      accepted: ["SET_POLICY: listen"],
      rejected: []
    });
    for (let index = 0; index < 25; index += 1) {
      advanceGameTicks(game, 1);
      const result = issueSovereignOrder(game, "red", {
        type: "SET_POLICY",
        priority: 1,
        reason: `Public policy signal ${index}.`
      });
      expect(result.ok).toBe(true);
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Read the complete ordinary public signal window before choosing a doctrine.",
          strategySummary: "Blue sees the full ordinary public context.",
          memoryNote: "Public signals were not dropped from the ordinary catch-up packet.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const catchUp = catchUpSection(body.prompt);
    expect(catchUp).toContain("complete accessible context packet");
    expect(catchUp).not.toContain("older visible events omitted");
    expect(catchUp).toContain("Public policy signal 24");
    expect(catchUp).toContain("Public policy signal 0");
  });

  it("names emergency catch-up omission only after the larger accessible packet limit is exceeded", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "blue",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Listen for an unusually large public court record.",
      strategySummary: "Blue listens for many public events.",
      memoryNote: "Track heavy public event flow.",
      orders: [],
      accepted: ["SET_POLICY: listen"],
      rejected: []
    });
    for (let index = 0; index < 90; index += 1) {
      advanceGameTicks(game, 1);
      const result = issueSovereignOrder(game, "red", {
        type: "SET_POLICY",
        priority: 1,
        reason: `Heavy public policy signal ${index}.`
      });
      expect(result.ok).toBe(true);
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Notice the emergency omission count and use the latest public signals.",
          strategySummary: "Blue sees omission counts only in a heavy window.",
          memoryNote: "Heavy windows may require REQUEST_INFO for missing detail.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const catchUp = catchUpSection(body.prompt);
    expect(catchUp).toContain("10 older visible events omitted");
    expect(catchUp).toContain("Heavy public policy signal 89");
    expect(catchUp).not.toContain("Heavy public policy signal 0");
  });

  it("includes AI iteration report lessons from sovereign memory in decision prompts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Adjust strategy after the reported wall bug.",
          strategySummary: "Use remembered iteration feedback.",
          memoryNote: "Do not rely on unseen walls until the fix is verified.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });
    const game = createGame(20260702);
    appendSovereignMemory(game, "blue", "AI iteration report filed (self_report/medium): Wall visibility blocked defense planning.");

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("AI iteration report filed (self_report/medium): Wall visibility blocked defense planning.");
  });

  it("includes explicit AI iteration context in normal decision prompts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Use the explicit iteration context to avoid repeating a bad order.",
          strategySummary: "Reacted to report context.",
          memoryNote: "",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx", {
      recentOwnReports: ["self_report/medium: wall labels were missing"],
      resolvedLessons: ["fixed self_report: wall labels now visible after smoke proof"]
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("AI iteration memory:");
    expect(body.prompt).toContain("open unresolved own reports");
    expect(body.prompt).toContain("self_report/medium: wall labels were missing");
    expect(body.prompt).toContain("resolved iteration lessons");
    expect(body.prompt).toContain("fixed self_report: wall labels now visible after smoke proof");
  });

  it("includes in-world integrity notices in decision prompts for model-authored reports", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Report the impossible ledger before making other plans.",
          strategySummary: "Filed an integrity report.",
          memoryNote: "Do not plan from contradictory population records.",
          orders: [
            {
              type: "REPORT_BUG",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Contradictory population ledger",
              body: "The public ledger says zero living subjects while my roster shows living people.",
              suspectedArea: "world records",
              expectedBehavior: "Population records should match the visible roster.",
              actualBehavior: "The ledger contradicts the visible roster.",
              reproductionSteps: "Read the public roll and compare it to the town hall roster.",
              strategyImpact: "A false population count would make survival planning unsafe.",
              bugSeverity: "high",
              reason: "Impossible world feedback blocks safe planning."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "high"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx", {
      recentOwnReports: [],
      resolvedLessons: [],
      worldIntegrityNotice: "The public roll says zero living subjects while the visible town hall roster shows living people."
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("world integrity notice");
    expect(body.prompt).toContain("file REPORT_BUG with structured details before other orders");
    expect(body.prompt).toContain("public roll says zero living subjects");
  });

  it("carries AI iteration context into compact retry prompts", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Use compact context after retry.",
            strategySummary: "Compact prompt kept report context.",
            memoryNote: "",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx", {
      recentOwnReports: ["validation/high: attack target vanished"],
      resolvedLessons: ["triaged validation: stale target now ignored"]
    });

    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("AI iteration memory:");
    expect(compactBody.prompt).toContain("open unresolved own reports");
    expect(compactBody.prompt).toContain("validation/high: attack target vanished");
    expect(compactBody.prompt).toContain("resolved iteration lessons");
    expect(compactBody.prompt).toContain("triaged validation: stale target now ignored");
  });

  it("keeps a bounded preview when recovery fails", () => {
    expect(() => parseOllamaJsonObject("not json at all", "decision")).toThrow(/decision JSON parse failed after recovery: .*preview=not json at all/);
  });

  it("classifies unrecoverable JSON as a parser failure", () => {
    try {
      parseOllamaJsonObject("not json at all", "decision");
      throw new Error("Expected parser failure");
    } catch (error) {
      const failure = describeOllamaFailure(error);
      expect(failure.kind).toBe("parser");
      expect(failure.message).toContain("decision JSON parse failed");
      expect(error).toBeInstanceOf(OllamaRequestError);
    }
  });

  it("classifies fetch failures separately from parser failures", () => {
    const failure = describeOllamaFailure(new TypeError("Failed to fetch"));

    expect(failure.kind).toBe("transport");
    expect(failure.attempts).toBe(1);
  });

  it("classifies unknown runtime errors as validation failures", () => {
    const failure = describeOllamaFailure(new ReferenceError("fetchOllamaGenerate is not defined"));

    expect(failure.kind).toBe("validation");
  });

  it("retries aborted transport calls before falling back", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Recover after a transport timeout instead of giving up immediately.",
            strategySummary: "Recovered after timeout retry.",
            memoryNote: "Transport retry succeeded after an aborted first attempt.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260630), "blue", "gemma4:latest");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decision.strategySummary).toBe("Recovered after timeout retry.");
    expect(decision.transportNote).toBe("Ollama decision transport recovered after 2 attempts");
  });

  it("retries abort-like generate response envelope failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("The user aborted a request.");
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Recover after an aborted response envelope.",
            strategySummary: "Envelope retry recovered.",
            memoryNote: "Transport envelope retry succeeded.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decision.strategySummary).toBe("Envelope retry recovered.");
    expect(decision.transportNote).toBe("Ollama decision transport recovered after 2 attempts");
  });

  it("retries abort-like chat response envelope failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("The user aborted a request.");
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: "assistant",
            content: JSON.stringify({
              freeformStrategy: "Recover the chat response envelope.",
              strategySummary: "Chat envelope retry recovered.",
              memoryNote: "Chat envelope retry succeeded.",
              orders: [],
              unitNames: [],
              bugReport: "",
              bugSeverity: "low"
            })
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "gpt-oss:20b", {
      recentOwnReports: ["ai_report/medium: chat adapter report context should survive"],
      resolvedLessons: []
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/chat");
    expect(fetchMock.mock.calls[1][0]).toBe("/ollama/api/chat");
    expect(decision.strategySummary).toBe("Chat envelope retry recovered.");
    expect(decision.transportNote).toContain("transport recovered after 2 attempts");
  });

  it("gives compact decision transport recovery a third attempt before falling back", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Recover after repeated local-model aborts.",
            strategySummary: "Compact third transport attempt recovered.",
            memoryNote: "The model needed one more compact retry before fallback.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260702), "blue", "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("answer this shorter royal brief");
    expect(decision.strategySummary).toBe("Compact third transport attempt recovered.");
    expect(decision.transportNote).toContain("transport recovered after 3 attempts");
    expect(decision.recoveryNote).toContain("decision used compact prompt after transport");
  });

  it("uses a compact decision prompt after an empty model response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Compact prompt restored an empty answer.",
            strategySummary: "Compact decision recovered.",
            memoryNote: "Empty first response recovered.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("answer this shorter royal brief");
    expect(decision.strategySummary).toBe("Compact decision recovered.");
    expect(decision.recoveryNote).toContain("decision used compact prompt after parser");
  });

  it("uses a compact reply prompt after an empty model response", async () => {
    const game = createGame(20260701);
    const sent = sendPlayerMessage(game, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            strategyNote: "Compact reply answers after an empty first response.",
            memoryNote: "Blue asked for food trade; answer cautiously.",
            subject: "Food terms considered",
            body: "We will discuss food and stone, but we will not expose our stores without a firmer promise.",
            diplomacyIntent: "PEACE_OFFER",
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const reply = await requestSovereignReply(game, packet.id, "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("answer this shorter royal brief");
    expect(reply.strategyNote).toBe("Compact reply answers after an empty first response.");
    expect(reply.recoveryNote).toContain("reply used compact prompt after parser");
  });

  it("includes AI iteration context in normal reply prompts", async () => {
    const game = createGame(20260702);
    const sent = sendPlayerMessage(game, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          strategyNote: "Use report memory before answering diplomacy.",
          memoryNote: "Avoid repeating the broken reply behavior.",
          subject: "Report-aware reply",
          body: "We can talk, but I will not repeat the broken messenger behavior.",
          diplomacyIntent: "PEACE_OFFER",
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const reply = await requestSovereignReply(game, packet.id, "qwen3.5:9b-mlx", {
      recentOwnReports: ["reply_bug_report/medium: Red reply lost its bug report context"],
      resolvedLessons: ["fixed reply_bug_report/medium: Red reply now reads resolved lessons"]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("AI iteration memory:");
    expect(body.prompt).toContain("open unresolved own reports");
    expect(body.prompt).toContain("Red reply lost its bug report context");
    expect(body.prompt).toContain("resolved iteration lessons");
    expect(body.prompt).toContain("Red reply now reads resolved lessons");
    expect(reply.strategyNote).toBe("Use report memory before answering diplomacy.");
  });

  it("includes the sovereign catch-up brief in reply prompts", async () => {
    const game = createGame(20260702);
    recordAiDecision(game, {
      tribeId: "red",
      provider: "ollama",
      model: "qwen3.5:9b-mlx",
      freeformStrategy: "Keep diplomacy guarded.",
      strategySummary: "Guarded opening.",
      memoryNote: "Do not reveal the granary count.",
      orders: [],
      accepted: ["SET_POLICY: guarded diplomacy"],
      rejected: []
    });
    advanceGameTicks(game, 1);
    const recruited = issueSovereignOrder(game, "red", {
      type: "RECRUIT",
      priority: 1,
      unitType: "peon",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "",
      body: "",
      reason: "Build labor before answering."
    });
    expect(recruited.ok).toBe(true);
    const sent = sendPlayerMessage(game, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          strategyNote: "Answer with the newest labor context in mind.",
          memoryNote: "Keep Red talking while labor expands.",
          subject: "Guarded reply",
          body: "We can talk, but my stores remain private.",
          diplomacyIntent: "PEACE_OFFER",
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignReply(game, packet.id, "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("Since your last move:");
    expect(body.prompt).toContain("previous move at turn 0: Guarded opening.");
    expect(body.prompt).toContain("trains peon");
  });

  it("includes AI iteration context in compact reply prompts", async () => {
    const game = createGame(20260702);
    const sent = sendPlayerMessage(game, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            strategyNote: "Compact reply kept report memory.",
            memoryNote: "Compact reply used the fixed lesson.",
            subject: "Compact report-aware reply",
            body: "Even in a compact reply, I remember the iteration lesson.",
            diplomacyIntent: "PEACE_OFFER",
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const reply = await requestSovereignReply(game, packet.id, "qwen3.5:9b-mlx", {
      recentOwnReports: ["reply_bug_report/high: compact reply lost unresolved report"],
      resolvedLessons: ["triaged reply_bug_report/high: compact reply should keep the fix"]
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("AI iteration memory:");
    expect(compactBody.prompt).toContain("open unresolved own reports");
    expect(compactBody.prompt).toContain("compact reply lost unresolved report");
    expect(compactBody.prompt).toContain("resolved iteration lessons");
    expect(compactBody.prompt).toContain("compact reply should keep the fix");
    expect(reply.strategyNote).toBe("Compact reply kept report memory.");
  });

  it("uses a compact reply prompt after transport failures", async () => {
    const game = createGame(20260701);
    const sent = sendPlayerMessage(game, "red", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockResolvedValueOnce({
        ok: false,
        status: 503
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            strategyNote: "Compact reply recovered after transport failures.",
            memoryNote: "Transport recovery succeeded for the messenger reply.",
            subject: "Reply after outage",
            body: "We recovered from the outage and can still answer your messenger.",
            diplomacyIntent: "PEACE_OFFER",
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const reply = await requestSovereignReply(game, packet.id, "gemma4:12b");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const compactBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(compactBody.prompt).toContain("answer this shorter royal brief");
    expect(reply.strategyNote).toBe("Compact reply recovered after transport failures.");
    expect(reply.transportNote).toContain("Ollama reply transport recovered");
    expect(reply.recoveryNote).toContain("reply used compact prompt after transport");
  });

  it("frames survival as existential death instead of a prototype game", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Keep the population alive before the review.",
          strategySummary: "Avoid being wiped out.",
          memoryNote: "The century review is existential.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(createGame(20260701), "blue", "gemma4:latest");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("This is your world, your reign, and your living population");
    expect(body.prompt).toContain("poorest surviving population is wiped out");
    expect(body.prompt).toContain("its people die");
    expect(body.prompt).toContain("opposite of safety");
    expect(body.prompt).not.toContain("You are playing a local RTS prototype");
  });

  it("marks unavailable scout orders as requiring sentinel recruitment first", async () => {
    const game = createGame(20260701);
    const sentinel = Object.values(game.units).find((unit) => unit.tribeId === "blue" && unit.type === "sentinel");
    if (!sentinel) throw new Error("Expected a starting blue sentinel");
    sentinel.task = { kind: "move", target: { x: sentinel.x + 1, y: sentinel.y }, path: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Scouting matters, but the sentinel prerequisite must be handled first.",
          strategySummary: "Recruit sentinel before scouting.",
          memoryNote: "Need an idle sentinel before scouting.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("Scout rule: only output SCOUT when Order availability says SCOUT available");
    expect(body.prompt).toContain("SCOUT unavailable: no idle sentinel; do not output SCOUT; if scouting matters output RECRUIT sentinel first");
    expect(body.prompt).toContain("RECRUIT sentinel available");
  });

  it("keeps the unavailable scout prerequisite visible in compact retry prompts", async () => {
    const game = createGame(20260701);
    const sentinel = Object.values(game.units).find((unit) => unit.tribeId === "blue" && unit.type === "sentinel");
    if (!sentinel) throw new Error("Expected a starting blue sentinel");
    sentinel.task = { kind: "move", target: { x: sentinel.x + 1, y: sentinel.y }, path: [] };
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            freeformStrategy: "Use the compact retry without issuing unavailable scout orders.",
            strategySummary: "Compact retry preserves scout prerequisite.",
            memoryNote: "Recruit sentinel before future scouting.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const compactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(compactBody.prompt).toContain("Do not output unavailable orders");
    expect(compactBody.prompt).toContain("SCOUT unavailable: no idle sentinel; do not output SCOUT; if scouting matters output RECRUIT sentinel first");
    expect(compactBody.prompt).toContain("RECRUIT sentinel available");
  });

  it("normalizes unavailable scout orders into sentinel recruitment when possible", async () => {
    const game = createGame(20260701);
    const sentinel = Object.values(game.units).find((unit) => unit.tribeId === "blue" && unit.type === "sentinel");
    if (!sentinel) throw new Error("Expected a starting blue sentinel");
    sentinel.task = { kind: "move", target: { x: sentinel.x + 1, y: sentinel.y }, path: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "The road must be scouted now.",
          strategySummary: "Scout the road.",
          memoryNote: "Need road intelligence.",
          orders: [
            {
              type: "SCOUT",
              priority: 1,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Scout",
              body: "Scout the road.",
              reason: "We need intelligence before choosing a border policy."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders).toHaveLength(1);
    expect(decision.orders[0]).toMatchObject({
      type: "RECRUIT",
      unitType: "sentinel",
      priority: 1
    });
    expect(decision.orders[0].reason).toContain("recruit a sentinel before scouting");
    expect(decision.orders.some((order) => order.type === "SCOUT")).toBe(false);
  });

  it("normalizes unavailable scout orders into policy when sentinel recruitment is impossible", async () => {
    const game = createGame(20260701);
    const sentinel = Object.values(game.units).find((unit) => unit.tribeId === "blue" && unit.type === "sentinel");
    if (!sentinel) throw new Error("Expected a starting blue sentinel");
    sentinel.task = { kind: "move", target: { x: sentinel.x + 1, y: sentinel.y }, path: [] };
    game.tribes.blue.resources.food = 0;
    game.tribes.blue.resources.gold = 0;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Scout anyway despite no idle sentinel.",
          strategySummary: "Scout despite constraints.",
          memoryNote: "Scouting is desired but blocked.",
          orders: [
            {
              type: "SCOUT",
              priority: 2,
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Scout",
              body: "Scout the road.",
              reason: "Find rival troop movements."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders).toHaveLength(1);
    expect(decision.orders[0]).toMatchObject({
      type: "SET_POLICY",
      priority: 2
    });
    expect(decision.orders[0].reason).toContain("Scouting is delayed");
    expect(decision.orders.some((order) => order.type === "SCOUT")).toBe(false);
  });

  it("normalizes messenger orders to eliminated populations into policy", async () => {
    const game = createGame(20260701);
    game.tribes.red.eliminated = true;
    game.tribes.red.eliminatedYear = 100;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "I want to ask the fallen court if any survivors remain.",
          strategySummary: "Avoid dead-end diplomacy.",
          memoryNote: "Do not send messengers to eliminated courts.",
          orders: [
            {
              type: "SEND_MESSENGER",
              priority: 1,
              recipientTribeId: "red",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "Can you answer?",
              body: "Blue Crown asks whether Red Banner still has a living court.",
              reason: "Check whether Red Banner can still negotiate."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders).toHaveLength(1);
    expect(decision.orders[0]).toMatchObject({
      type: "SET_POLICY",
      priority: 1
    });
    expect(decision.orders[0].reason).toContain("Red Banner has already been eliminated");
    expect(decision.orders.some((order) => order.type === "SEND_MESSENGER")).toBe(false);
  });

  it("normalizes attack orders against eliminated populations into policy", async () => {
    const game = createGame(20260701);
    game.tribes.red.eliminated = true;
    game.tribes.red.eliminatedYear = 100;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Punish Red Banner, but it has already died out.",
          strategySummary: "Do not attack an eliminated population.",
          memoryNote: "Eliminated populations cannot be military targets.",
          orders: [
            {
              type: "ATTACK",
              priority: 1,
              recipientTribeId: "red",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Retaliate for previous border pressure."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");

    expect(decision.orders).toHaveLength(1);
    expect(decision.orders[0]).toMatchObject({
      type: "SET_POLICY",
      priority: 1
    });
    expect(decision.orders[0].reason).toContain("Red Banner has already been eliminated");
    expect(decision.orders.some((order) => order.type === "ATTACK")).toBe(false);
  });

  it("preserves LLM-authored siege targets on attack orders", async () => {
    const game = createGame(20260705);
    game.buildings.red_test_wall = {
      id: "red_test_wall",
      type: "wall",
      tribeId: "red",
      x: 24,
      y: 20,
      hp: 50,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Red has exposed a wall on the east approach; I will breach the exact segment before it becomes a frontier line.",
          strategySummary: "Attack the visible red wall.",
          memoryNote: "Red wall red_test_wall is the first siege target.",
          orders: [
            {
              type: "ATTACK",
              priority: 1,
              recipientTribeId: "red",
              targetBuildingId: "red_test_wall",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Breach red_test_wall before Red can extend it."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(body.prompt).toContain("Visible foreign buildings:");
    expect(body.prompt).toContain("red_test_wall: red wall at 24,20 hp 50 armor 6");
    expect(body.prompt).toContain("targetBuildingId options red_test_wall:red:wall:24,20");
    expect(decision.orders[0]).toMatchObject({
      type: "ATTACK",
      recipientTribeId: "red",
      targetBuildingId: "red_test_wall"
    });
  });

  it("preserves LLM-authored resource raid targets on attack orders", async () => {
    const game = createGame(20260707);
    setAllControllers(game, "human");
    game.map[tileIndex(21, 20)] = { terrain: "hill", resource: createResourceDeposit("iron", 12) };
    advanceGameTicks(game, 5);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Iron is the hinge of future turrets; I will deny this visible deposit before a rival can bargain around it.",
          strategySummary: "Raid a visible iron deposit.",
          memoryNote: "Iron at 21,20 is a denial target.",
          orders: [
            {
              type: "ATTACK",
              priority: 1,
              targetX: 21,
              targetY: 20,
              targetResourceType: "iron",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Destroy the visible iron deposit at 21,20."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(body.prompt).toContain("Visible resource raid targets:");
    expect(body.prompt).toContain("iron at 21,20 amount 12 hp 12 armor 3");
    expect(body.prompt).toContain("targetResource options");
    expect(body.format.properties.orders.items.properties.targetResourceType.enum).toContain("iron");
    expect(decision.orders[0]).toMatchObject({
      type: "ATTACK",
      targetX: 21,
      targetY: 20,
      targetResourceType: "iron"
    });
  });

  it("preserves LLM-authored repair targets and exposes damaged owned building ids", async () => {
    const game = createGame(20260706);
    game.buildings.blue_test_wall = {
      id: "blue_test_wall",
      type: "wall",
      tribeId: "blue",
      x: 22,
      y: 20,
      hp: 160,
      maxHp: 240,
      armor: 6,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "The eastern wall is damaged; repair it before I risk messengers or a new war.",
          strategySummary: "Repair the damaged wall.",
          memoryNote: "Blue wall blue_test_wall needs maintenance under threat.",
          orders: [
            {
              type: "REPAIR",
              priority: 1,
              targetBuildingId: "blue_test_wall",
              messageType: "LETTER",
              diplomacyIntent: "NONE",
              subject: "",
              body: "",
              reason: "Restore blue_test_wall before enemies exploit the breach."
            }
          ],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(game, "blue", "qwen3.5:9b-mlx");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(body.prompt).toContain("Own buildings:");
    expect(body.prompt).toContain("blue_test_wall: wall at 22,20 hp 160/240 armor 6");
    expect(body.prompt).toContain("REPAIR available");
    expect(body.prompt).toContain("blue_test_wall:wall:hp160/240");
    expect(body.format.properties.orders.items.properties.type.enum).toContain("REPAIR");
    expect(decision.orders[0]).toMatchObject({
      type: "REPAIR",
      targetBuildingId: "blue_test_wall"
    });
  });

  it("uses the chat endpoint for gpt-oss and reads JSON from message content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          thinking: "private reasoning should not be parsed as the answer",
          content: `<think>private chain</think>${JSON.stringify({
            freeformStrategy: "Use the chat adapter to add this sovereign to the live model rotation.",
            strategySummary: "Chat adapter works for gpt-oss.",
            memoryNote: "gpt-oss answered through /api/chat.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })}`
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "gpt-oss:20b", {
      recentOwnReports: ["ai_report/medium: chat adapter report context should survive"],
      resolvedLessons: []
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/chat");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBeUndefined();
    expect(body.stream).toBe(false);
    expect(body.think).toBe("low");
    expect(body.messages[0].content).toContain("This is your world, your reign, and your living population");
    expect(body.messages[0].content).toContain("ai_report/medium: chat adapter report context should survive");
    expect(body.format.properties.freeformStrategy).toBeTruthy();
    expect(decision.strategySummary).toBe("Chat adapter works for gpt-oss.");
  });

  it("sends non-blue AI iteration reports and fixed lessons through the gpt-oss chat prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          thinking: "private reasoning should stay outside JSON parsing",
          content: JSON.stringify({
            freeformStrategy: "Use Green's own iteration reports before choosing a doctrine.",
            strategySummary: "Green consumed report feedback.",
            memoryNote: "Green should not repeat fixed report bugs.",
            orders: [],
            unitNames: [],
            bugReport: "",
            bugSeverity: "low"
          })
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignDecision(createGame(20260702), "green", "gpt-oss:20b", {
      recentOwnReports: ["self_report/medium id green-canary: Green report must reach only Green's prompt"],
      resolvedLessons: ["fixed self_report/medium id green-canary: Green report became a resolved lesson"]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/chat");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBeUndefined();
    expect(body.messages[0].content).toContain("You are the embodied sovereign of Green Vale");
    expect(body.messages[0].content).toContain("AI iteration memory:");
    expect(body.messages[0].content).toContain("open unresolved own reports");
    expect(body.messages[0].content).toContain("Green report must reach only Green's prompt");
    expect(body.messages[0].content).toContain("resolved iteration lessons");
    expect(body.messages[0].content).toContain("Green report became a resolved lesson");
  });

  it("sends reply AI iteration reports and fixed lessons through the gpt-oss chat prompt", async () => {
    const game = createGame(20260702);
    const sent = sendPlayerMessage(game, "green", "peace");
    if (!sent.ok) throw new Error(sent.reason);
    const packet = game.packets[sent.packetId];
    if (!packet) throw new Error("Expected a packet to reply to");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          thinking: "private reply reasoning",
          content: JSON.stringify({
            strategyNote: "Green reads reply iteration memory before answering.",
            memoryNote: "Green reply should remember fixed reports.",
            subject: "Green report-aware reply",
            body: "I have read my own report history before answering your envoy.",
            diplomacyIntent: "PEACE_OFFER",
            bugReport: "",
            bugSeverity: "low"
          })
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    await requestSovereignReply(game, packet.id, "gpt-oss:20b", {
      recentOwnReports: ["reply_bug_report/medium id green-reply: Green reply report must reach chat prompt"],
      resolvedLessons: ["fixed reply_bug_report/medium id green-reply: Green reply learned the fix"]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/chat");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBeUndefined();
    expect(body.messages[0].content).toContain("You are the embodied sovereign of Green Vale");
    expect(body.messages[0].content).toContain("AI iteration memory:");
    expect(body.messages[0].content).toContain("Green reply report must reach chat prompt");
    expect(body.messages[0].content).toContain("resolved iteration lessons");
    expect(body.messages[0].content).toContain("Green reply learned the fix");
  });

  it("keeps generate models on /api/generate with prompt-based schema turns", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          freeformStrategy: "Stay on the generate adapter for models that support it cleanly.",
          strategySummary: "Generate adapter remains stable.",
          memoryNote: "qwen used /api/generate.",
          orders: [],
          unitNames: [],
          bugReport: "",
          bugSeverity: "low"
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "qwen3.5:9b-mlx");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/generate");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("This is your world, your reign, and your living population");
    expect(body.messages).toBeUndefined();
    expect(body.think).toBe(false);
    expect(decision.strategySummary).toBe("Generate adapter remains stable.");
  });

  it("retries gpt-oss chat compact transport failures before falling back", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockRejectedValueOnce(new Error("signal is aborted without reason"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: "assistant",
            content: JSON.stringify({
              freeformStrategy: "Recover the chat adapter after an aborted first call.",
              strategySummary: "Chat transport recovered.",
              memoryNote: "gpt-oss chat recovered after retry.",
              orders: [],
              unitNames: [],
              bugReport: "",
              bugSeverity: "low"
            })
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });

    const decision = await requestSovereignDecision(createGame(20260701), "blue", "gpt-oss:20b");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("/ollama/api/chat");
    expect(fetchMock.mock.calls[1][0]).toBe("/ollama/api/chat");
    expect(fetchMock.mock.calls[2][0]).toBe("/ollama/api/chat");
    expect(decision.strategySummary).toBe("Chat transport recovered.");
    expect(decision.transportNote).toBe("Ollama decision chat transport recovered after 2 attempts");
    expect(decision.recoveryNote).toContain("decision used compact prompt after transport");
  });
});

function catchUpSection(prompt: string): string {
  const match = prompt.match(/Since your last move:\s*([\s\S]*?)\n\s*Recent information answers:/);
  return match?.[1] ?? "";
}

function promptLineValue(prompt: string, label: string): string {
  const line = prompt
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(label));
  return line?.slice(label.length).trim() ?? "";
}
