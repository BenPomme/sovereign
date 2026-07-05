export const MAP_SIZE = 128;
export const TICK_RATE = 10;
export const TICKS_PER_GAME_YEAR = TICK_RATE * 20;
export const SURVIVAL_REVIEW_INTERVAL_YEARS = 100;
export const FINAL_SURVIVAL_YEAR = 400;

export type TribeId = "blue" | "red" | "green" | "yellow" | "purple";
export type TerrainType = "grass" | "forest" | "hill" | "road" | "water" | "mountain";
export type ResourceType = "gold" | "food" | "wood" | "stone" | "clay" | "limestone" | "iron" | "coal";
export type UnitType =
  | "sovereign"
  | "peon"
  | "sentinel"
  | "messenger"
  | "trader"
  | "militia"
  | "archer";
export type GateState = "open" | "closed" | "locked";
export type BuildingType = "townHall" | "farm" | "barracks" | "market" | "watchtower" | "wall" | "gate" | "turret";
export type BuildableBuildingType = "farm" | "watchtower" | "wall" | "gate" | "turret";
export type DevelopmentId = "masonry" | "brick_kilns" | "ironworking" | "ballistics" | "military_architecture" | "public_works";
export type MessageType = "LETTER" | "REPLY" | "TREATY_PROPOSAL" | "THREAT" | "DEMAND";
export type DiplomacyIntent =
  | "NONE"
  | "PEACE_OFFER"
  | "WARNING"
  | "ALLIANCE_OFFER"
  | "ALLIANCE_ACCEPT"
  | "ALLIANCE_DECLINE";
export type PacketState =
  | "IN_TRANSIT_OUTBOUND"
  | "AWAITING_REPLY"
  | "IN_TRANSIT_RETURN"
  | "COMPLETED"
  | "OVERDUE"
  | "KILLED_WITH_PACKET"
  | "REFUSED_AT_GATE"
  | "DETAINED";

export type Position = {
  x: number;
  y: number;
};

export type Tile = {
  terrain: TerrainType;
  resource?: {
    type: ResourceType;
    amount: number;
  };
};

export type Resources = Record<ResourceType, number>;
export type ResourceCost = Partial<Record<ResourceType, number>>;
export type Development = {
  id: DevelopmentId;
  name: string;
  description: string;
  cost: ResourceCost;
  prerequisites: DevelopmentId[];
  unlocks: string[];
};
export type ControllerType = "human" | "scripted" | "llm";
export type AiOrderType =
  | "SEND_MESSENGER"
  | "RECRUIT"
  | "BUILD"
  | "DEVELOP"
  | "SCOUT"
  | "DEFEND"
  | "ATTACK"
  | "SET_GATE"
  | "PROPOSE_ALLIANCE"
  | "SET_POLICY"
  | "REPORT_BUG"
  | "REQUEST_INFO";

export type AiStrategicOrder = {
  type: AiOrderType;
  priority: number;
  recipientTribeId?: TribeId;
  unitType?: "peon" | "militia" | "archer" | "messenger" | "sentinel";
  buildingType?: BuildableBuildingType;
  buildingId?: string;
  gateState?: GateState;
  targetX?: number;
  targetY?: number;
  developmentId?: DevelopmentId;
  messageType?: MessageType;
  diplomacyIntent?: DiplomacyIntent;
  subject?: string;
  body?: string;
  suspectedArea?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reproductionSteps?: string;
  strategyImpact?: string;
  bugSeverity?: "low" | "medium" | "high";
  reason: string;
};

export type TribeIdentity = {
  realmName: string;
  sovereignName: string;
  namingStyle: string;
  inspiration: string;
};

export type UnitNameChoice = {
  unitId: string;
  name: string;
  reason?: string;
};

export type SovereignMemory = {
  notes: string[];
  updatedTick: number;
};

export type DiplomaticIntelKind = "offer" | "promise" | "threat" | "question" | "demand" | "claim" | "refusal";
export type DiplomaticIntelDirection = "sent" | "received";

export type DiplomaticIntelItem = {
  id: string;
  tick: number;
  ownerTribeId: TribeId;
  counterpartyTribeId: TribeId;
  direction: DiplomaticIntelDirection;
  kind: DiplomaticIntelKind;
  messageId: string;
  subject: string;
  summary: string;
  diplomacyIntent: DiplomacyIntent;
  truthStatus: "own_intent" | "unverified_foreign_claim";
};

export type AiDecision = {
  id: string;
  tick: number;
  tribeId: TribeId;
  provider: "ollama" | "fallback";
  model: string;
  strategySummary: string;
  freeformStrategy?: string;
  memoryNote?: string;
  orders: AiStrategicOrder[];
  accepted: string[];
  rejected: string[];
};

export type SovereignDecisionCursor = {
  lastMove?: AiDecision;
  lastStrategy?: AiDecision;
  updatedTick: number;
};

export type ForeignObservationKind = "unit_seen" | "unit_lost" | "building_seen" | "building_lost";

export type ForeignObservationSubject = {
  subjectKind: "unit" | "building";
  subjectTribeId: TribeId;
  subjectId: string;
  subjectType: UnitType | BuildingType;
  x: number;
  y: number;
  hp: number;
};

export type ForeignObservation = ForeignObservationSubject & {
  id: string;
  tick: number;
  observerTribeId: TribeId;
  kind: ForeignObservationKind;
};

export type ForeignObservationMemory = {
  initialized: boolean;
  visibleSubjects: Record<string, ForeignObservationSubject>;
};

export type AiInformationRequest = {
  id: string;
  tick: number;
  tribeId: TribeId;
  subject: string;
  body: string;
  reason: string;
  answerStatus?: "answered" | "partial";
  answerTick?: number;
  answerSummary?: string;
  answer?: string;
};

export type Tribe = {
  id: TribeId;
  name: string;
  defaultName: string;
  sovereignName: string;
  namingStyle: string;
  inspiration: string;
  identityChosen: boolean;
  color: number;
  colorText: string;
  controller: ControllerType;
  resources: Resources;
  developments: DevelopmentId[];
  happiness: number;
  lastYearWealth: number;
  eliminated: boolean;
  eliminatedYear?: number;
  eliminatedTick?: number;
  populationCap: number;
  lastDecisionTick: number;
  nextMessageTick: number;
};

export type UnitTask =
  | { kind: "idle" }
  | { kind: "move"; target: Position; path: Position[] }
  | { kind: "gather"; resource: ResourceType; target: Position; dropoff: Position; path: Position[]; cargo: number }
  | { kind: "scout"; target: Position; path: Position[] }
  | {
      kind: "deliver";
      packetId: string;
      phase: "outbound" | "waiting" | "returning";
      destination: Position;
      returnTo: Position;
      path: Position[];
      waitUntilTick?: number;
    }
  | { kind: "attack"; targetUnitId: string; path: Position[] };

export type Unit = {
  id: string;
  name: string;
  type: UnitType;
  tribeId: TribeId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  speed: number;
  visionRadius: number;
  attack: number;
  range: number;
  attackCooldown: number;
  task: UnitTask;
  carriedPacketId?: string;
};

export type Building = {
  id: string;
  type: BuildingType;
  tribeId: TribeId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  attack: number;
  range: number;
  attackCooldown: number;
  gateState?: GateState;
};

export type Message = {
  id: string;
  type: MessageType;
  originTribeId: TribeId;
  recipientTribeId: TribeId;
  subject: string;
  body: string;
  diplomacyIntent: DiplomacyIntent;
  requiresReply: boolean;
  replyToMessageId?: string;
  createdTick: number;
  deliveredTick?: number;
  readTick?: number;
};

export type Packet = {
  id: string;
  messageIds: string[];
  carrierUnitId?: string;
  originTribeId: TribeId;
  recipientTribeId: TribeId;
  state: PacketState;
  destination: Position;
  returnTo: Position;
  createdTick: number;
  expectedReturnTick: number;
  lastStateChangeTick: number;
  overdueAnnounced: boolean;
  routeMemory: string[];
};

export type GameEvent = {
  id: string;
  tick: number;
  type: string;
  title: string;
  body: string;
  visibleTo: TribeId[] | "all";
};

export type VictoryPressureConfig = {
  reviewIntervalYears: number;
  finalYear: number;
  nextReviewYear: number;
  lastProcessedYear: number;
  warningIssued: boolean;
  winnerTribeId?: TribeId;
  winnerSurvivalScore?: number;
  winnerGold?: number;
  wonYear?: number;
  wonTick?: number;
  learningApplied: boolean;
};

export type VictoryScoreEntry = {
  tribeId: TribeId;
  tribeName: string;
  gold: number;
  wealth: number;
  population: number;
  happiness: number;
  safety: number;
  wealthPerCapita: number;
  survivalScore: number;
  eliminated: boolean;
  eliminatedYear?: number;
  rank: number;
};

export type VictoryPressureStatus = {
  status: "surviving" | "warning" | "claimed";
  victoryRule: "population_happiness_safety_century_cull";
  currentYear: number;
  currentCentury: number;
  nextReviewYear: number;
  finalYear: number;
  yearsUntilReview: number;
  survivingTribes: number;
  eliminatedTribes: number;
  goldTarget: number;
  wealthTarget: number;
  deadlineTick: number;
  warningTick: number;
  turnsRemaining: number;
  leaderTribeId: TribeId;
  leaderName: string;
  leaderGold: number;
  leaderWealth: number;
  leaderSurvivalScore: number;
  poorestTribeId: TribeId;
  poorestName: string;
  poorestSurvivalScore: number;
  runnerUpTribeId?: TribeId;
  runnerUpName?: string;
  runnerUpGold?: number;
  runnerUpWealth?: number;
  leaderMargin: number;
  targetProgress: number;
  winnerTribeId?: TribeId;
  winnerName?: string;
  winnerSurvivalScore?: number;
  winnerGold?: number;
  wonYear?: number;
  wonTick?: number;
  scoreByTribe: VictoryScoreEntry[];
  publicText: string;
};

export type PostGameLearning = {
  id: string;
  tick: number;
  year?: number;
  tribeId: TribeId;
  tribeName: string;
  outcome?: "survived" | "eliminated" | "winner";
  rank: number;
  gold: number;
  wealth?: number;
  happiness?: number;
  safety?: number;
  survivalScore?: number;
  eliminatedTribeId?: TribeId;
  eliminatedName?: string;
  winnerTribeId: TribeId;
  winnerName: string;
  winnerGold: number;
  lesson: string;
};

export type GameState = {
  seed: number;
  tick: number;
  rngState: number;
  map: Tile[];
  tribes: Record<TribeId, Tribe>;
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  messages: Record<string, Message>;
  packets: Record<string, Packet>;
  events: GameEvent[];
  aiDecisions: AiDecision[];
  sovereignDecisionCursors: Record<TribeId, SovereignDecisionCursor>;
  foreignObservations: Record<TribeId, ForeignObservation[]>;
  foreignObservationMemory: Record<TribeId, ForeignObservationMemory>;
  aiInformationRequests: AiInformationRequest[];
  postGameLearnings: PostGameLearning[];
  sovereignMemories: Record<TribeId, SovereignMemory>;
  diplomaticIntel: Record<TribeId, DiplomaticIntelItem[]>;
  alliances: Partial<Record<TribeId, TribeId>>;
  wars: Record<TribeId, Partial<Record<TribeId, boolean>>>;
  visibility: Record<TribeId, Uint8Array>;
  counters: Record<string, number>;
  victoryPressure: VictoryPressureConfig;
};

export const tribeIds: TribeId[] = ["blue", "red", "green", "yellow", "purple"];

export const tribeConfig: Record<TribeId, Pick<Tribe, "id" | "name" | "color" | "colorText" | "controller">> = {
  blue: {
    id: "blue",
    name: "Blue Crown",
    color: 0x4f8df7,
    colorText: "#72a9ff",
      controller: "human"
  },
  red: {
    id: "red",
    name: "Red Banner",
    color: 0xdf4747,
    colorText: "#ff7373",
    controller: "scripted"
  },
  green: {
    id: "green",
    name: "Green Vale",
    color: 0x55b96b,
    colorText: "#75d98c",
    controller: "scripted"
  },
  yellow: {
    id: "yellow",
    name: "Yellow Knives",
    color: 0xd7a72f,
    colorText: "#f0c650",
    controller: "scripted"
  },
  purple: {
    id: "purple",
    name: "Purple Seal",
    color: 0xa276d9,
    colorText: "#c29cff",
    controller: "scripted"
  }
};

const starts: Record<TribeId, Position> = {
  blue: { x: 18, y: 20 },
  red: { x: 108, y: 22 },
  green: { x: 21, y: 106 },
  yellow: { x: 107, y: 103 },
  purple: { x: 66, y: 66 }
};

const unitStats: Record<UnitType, Pick<Unit, "hp" | "maxHp" | "armor" | "speed" | "visionRadius" | "attack" | "range">> = {
  sovereign: { hp: 80, maxHp: 80, armor: 2, speed: 1.0, visionRadius: 8, attack: 4, range: 1.2 },
  peon: { hp: 38, maxHp: 38, armor: 0, speed: 1.0, visionRadius: 5, attack: 2, range: 1.1 },
  sentinel: { hp: 32, maxHp: 32, armor: 1, speed: 1.35, visionRadius: 10, attack: 1, range: 1.1 },
  messenger: { hp: 25, maxHp: 25, armor: 0, speed: 1.6, visionRadius: 5, attack: 0, range: 0 },
  trader: { hp: 44, maxHp: 44, armor: 1, speed: 1.1, visionRadius: 5, attack: 0, range: 0 },
  militia: { hp: 55, maxHp: 55, armor: 2, speed: 1.05, visionRadius: 5, attack: 7, range: 1.2 },
  archer: { hp: 40, maxHp: 40, armor: 1, speed: 1.0, visionRadius: 6, attack: 5, range: 4.4 }
};

export const resourceTypes: readonly ResourceType[] = ["gold", "food", "wood", "stone", "clay", "limestone", "iron", "coal"] as const;
export const developmentIds: readonly DevelopmentId[] = [
  "masonry",
  "brick_kilns",
  "ironworking",
  "ballistics",
  "military_architecture",
  "public_works"
] as const;

export const developmentCatalog: Record<DevelopmentId, Development> = {
  masonry: {
    id: "masonry",
    name: "Masonry",
    description: "Stone setting, mortar work, and defensive wall foundations.",
    cost: { stone: 35, clay: 20, limestone: 20, gold: 20 },
    prerequisites: [],
    unlocks: ["wall construction", "gate foundations"]
  },
  brick_kilns: {
    id: "brick_kilns",
    name: "Brick Kilns",
    description: "Clay firing and standardized bricks for stronger settlement logistics.",
    cost: { wood: 45, clay: 45, limestone: 15, gold: 25 },
    prerequisites: ["masonry"],
    unlocks: ["future stronger walls", "granaries", "archives"]
  },
  ironworking: {
    id: "ironworking",
    name: "Ironworking",
    description: "Bloomery iron tools, fittings, and weapon-ready metal supply chains.",
    cost: { wood: 40, iron: 25, coal: 15, gold: 35 },
    prerequisites: [],
    unlocks: ["turret components", "gate hinges and locks", "future siege tools"]
  },
  ballistics: {
    id: "ballistics",
    name: "Ballistics",
    description: "Projectile engineering for fixed defensive engines.",
    cost: { wood: 60, stone: 40, iron: 25, gold: 45 },
    prerequisites: ["ironworking"],
    unlocks: ["turret construction"]
  },
  military_architecture: {
    id: "military_architecture",
    name: "Military Architecture",
    description: "Purpose-built fortification layouts, kill zones, and protected logistics.",
    cost: { stone: 70, clay: 35, limestone: 45, iron: 15, gold: 55 },
    prerequisites: ["masonry", "ballistics"],
    unlocks: ["future gates", "future stronger walls", "future siege-resistant districts"]
  },
  public_works: {
    id: "public_works",
    name: "Public Works",
    description: "State-managed labor crews for roads, repairs, and civic construction.",
    cost: { wood: 40, stone: 30, gold: 40 },
    prerequisites: [],
    unlocks: ["future roads", "future repair logistics"]
  }
};

const buildingCosts: Record<BuildableBuildingType, ResourceCost> = {
  farm: { wood: 60 },
  watchtower: { wood: 80, stone: 60, clay: 30, limestone: 20, gold: 50 },
  wall: { wood: 20, stone: 30, clay: 25, limestone: 15 },
  gate: { wood: 35, stone: 45, clay: 20, limestone: 25, iron: 20 },
  turret: { wood: 90, stone: 100, limestone: 35, iron: 45, coal: 30, gold: 60 }
};

const buildingDevelopmentRequirements: Record<BuildableBuildingType, DevelopmentId[]> = {
  farm: [],
  watchtower: [],
  wall: ["masonry"],
  gate: ["masonry", "ironworking"],
  turret: ["ironworking", "ballistics"]
};

const buildingStats: Record<
  BuildingType,
  { maxHp: number; armor: number; visionRadius: number; blocksMovement: boolean; attack: number; range: number; cooldownTicks: number }
> = {
  townHall: { maxHp: 500, armor: 8, visionRadius: 7, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  farm: { maxHp: 180, armor: 1, visionRadius: 6, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  barracks: { maxHp: 220, armor: 3, visionRadius: 7, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  market: { maxHp: 200, armor: 2, visionRadius: 7, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  watchtower: { maxHp: 260, armor: 3, visionRadius: 12, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  wall: { maxHp: 240, armor: 6, visionRadius: 3, blocksMovement: true, attack: 0, range: 0, cooldownTicks: 0 },
  gate: { maxHp: 220, armor: 5, visionRadius: 4, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  turret: { maxHp: 320, armor: 5, visionRadius: 11, blocksMovement: false, attack: 9, range: 7, cooldownTicks: Math.round(TICK_RATE * 1.4) }
};

export function createGame(seed = 1337): GameState {
  const state: GameState = {
    seed,
    tick: 0,
    rngState: seed,
    map: generateMap(seed),
    tribes: {} as Record<TribeId, Tribe>,
    units: {},
    buildings: {},
    messages: {},
    packets: {},
    events: [],
    aiDecisions: [],
    sovereignDecisionCursors: {} as Record<TribeId, SovereignDecisionCursor>,
    foreignObservations: {} as Record<TribeId, ForeignObservation[]>,
    foreignObservationMemory: {} as Record<TribeId, ForeignObservationMemory>,
    aiInformationRequests: [],
    postGameLearnings: [],
    sovereignMemories: {} as Record<TribeId, SovereignMemory>,
    diplomaticIntel: {} as Record<TribeId, DiplomaticIntelItem[]>,
    alliances: {},
    wars: {} as Record<TribeId, Partial<Record<TribeId, boolean>>>,
    visibility: {} as Record<TribeId, Uint8Array>,
    counters: {},
    victoryPressure: {
      reviewIntervalYears: SURVIVAL_REVIEW_INTERVAL_YEARS,
      finalYear: FINAL_SURVIVAL_YEAR,
      nextReviewYear: SURVIVAL_REVIEW_INTERVAL_YEARS,
      lastProcessedYear: 1,
      warningIssued: false,
      learningApplied: false
    }
  };

  for (const id of tribeIds) state.wars[id] = {};
  for (const id of tribeIds) {
    state.tribes[id] = {
      ...tribeConfig[id],
      defaultName: tribeConfig[id].name,
      sovereignName: `${tribeConfig[id].name} Sovereign`,
      namingStyle: "unclaimed valley names",
      inspiration: "unclaimed founding lineage",
      identityChosen: false,
      resources: { gold: 120, food: 260, wood: 220, stone: 120, clay: 80, limestone: 55, iron: 20, coal: 8 },
      developments: [],
      happiness: 72 + Math.floor(random(state) * 7),
      lastYearWealth: 0,
      eliminated: false,
      populationCap: 20,
      lastDecisionTick: 0,
      nextMessageTick: 260 + Math.floor(random(state) * 220)
    };
    state.sovereignMemories[id] = { notes: [], updatedTick: 0 };
    state.diplomaticIntel[id] = [];
    state.sovereignDecisionCursors[id] = { updatedTick: 0 };
    state.foreignObservations[id] = [];
    state.foreignObservationMemory[id] = { initialized: false, visibleSubjects: {} };
    state.visibility[id] = new Uint8Array(MAP_SIZE * MAP_SIZE);
    spawnTribe(state, id, starts[id]);
  }
  for (const id of tribeIds) state.tribes[id].lastYearWealth = computeWealth(state, id);

  addEvent(state, "WORLD_STARTED", "World seeded", "Five sovereign tribes have entered the valley.", "all");
  updateVisibility(state);
  return state;
}

export function advanceGame(state: GameState, seconds: number): void {
  const ticks = Math.max(1, Math.floor(seconds * TICK_RATE));
  advanceGameTicks(state, ticks);
}

export function advanceGameTicks(state: GameState, ticks: number): void {
  const wholeTicks = Math.max(0, Math.floor(ticks));
  for (let i = 0; i < wholeTicks; i += 1) {
    state.tick += 1;
    updateScriptedAi(state);
    updateUnits(state);
    updateCombat(state);
    updatePackets(state);
    updateYearlyWellbeing(state);
    updateVictoryPressure(state);
    if (state.tick % 5 === 0) updateVisibility(state);
  }
}

export function sendPlayerMessage(
  state: GameState,
  recipientTribeId: TribeId,
  intent: "peace" | "warning"
): { ok: true; packetId: string } | { ok: false; reason: string } {
  const senderName = state.tribes.blue.name;
  const subject = intent === "peace" ? "Peace on the road" : "Border warning";
  const body =
    intent === "peace"
      ? `${senderName} proposes a temporary peace and safe passage for messengers on the eastern road.`
      : `${senderName} warns that attacks on messengers or traders will be answered by force.`;
  const type: MessageType = intent === "peace" ? "TREATY_PROPOSAL" : "THREAT";
  return sendMessage(state, "blue", recipientTribeId, type, subject, body, true, intent === "peace" ? "PEACE_OFFER" : "WARNING");
}

export function setAllControllers(state: GameState, controller: ControllerType): void {
  for (const tribeId of tribeIds) state.tribes[tribeId].controller = controller;
}

export function issueSovereignOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (state.tribes[tribeId].eliminated) return { ok: false, reason: `${state.tribes[tribeId].name} has been eliminated` };
  switch (order.type) {
    case "SEND_MESSENGER": {
      const recipient = order.recipientTribeId;
      if (!recipient || recipient === tribeId || !tribeIds.includes(recipient)) return { ok: false, reason: "invalid messenger recipient" };
      const result = sendMessage(
        state,
        tribeId,
        recipient,
        order.messageType ?? "LETTER",
        clampText(order.subject ?? `Message from ${state.tribes[tribeId].name}`, 80),
        clampText(order.body ?? `${state.tribes[tribeId].name} writes: ${order.reason}`, 800),
        true,
        order.diplomacyIntent ?? inferDiplomacyIntent(order.messageType ?? "LETTER", order.body)
      );
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, summary: `sent messenger to ${state.tribes[recipient].name}` };
    }
    case "PROPOSE_ALLIANCE": {
      const recipient = order.recipientTribeId;
      if (!recipient || recipient === tribeId || !tribeIds.includes(recipient)) return { ok: false, reason: "invalid alliance partner" };
      if (state.alliances[tribeId] && state.alliances[tribeId] !== recipient) {
        return { ok: false, reason: `${state.tribes[tribeId].name} already has an alliance with ${state.tribes[state.alliances[tribeId]].name}` };
      }
      if (state.alliances[recipient] && state.alliances[recipient] !== tribeId) {
        return { ok: false, reason: `${state.tribes[recipient].name} already has an alliance with ${state.tribes[state.alliances[recipient]].name}` };
      }
      const messengerResult = sendMessage(
        state,
        tribeId,
        recipient,
        "TREATY_PROPOSAL",
        clampText(order.subject ?? "Alliance proposal", 80),
        clampText(order.body ?? `${state.tribes[tribeId].name} proposes an exclusive alliance.`, 800),
        true,
        "ALLIANCE_OFFER"
      );
      if (!messengerResult.ok) return { ok: false, reason: messengerResult.reason };
      return { ok: true, summary: `sent alliance offer to ${state.tribes[recipient].name}` };
    }
    case "RECRUIT": {
      const unitType = order.unitType === "messenger" || order.unitType === "sentinel" ? order.unitType : order.unitType ?? "militia";
      if (unitType === "messenger") return trainSpecialUnit(state, tribeId, "messenger");
      if (unitType === "sentinel") return trainSpecialUnit(state, tribeId, "sentinel");
      const result = trainUnit(state, tribeId, unitType);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, summary: `trained ${unitType}` };
    }
    case "BUILD": {
      const townHall = findTownHall(state, tribeId);
      if (!townHall) return { ok: false, reason: "town hall destroyed" };
      const result = buildStructure(state, tribeId, order.buildingType ?? "farm", orderBuildTarget(order, townHall));
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, summary: `built ${order.buildingType ?? "farm"}` };
    }
    case "SET_GATE": {
      const result = setGateState(state, tribeId, order.gateState ?? "locked", order.buildingId);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, summary: result.summary };
    }
    case "DEVELOP": {
      if (!order.developmentId) return { ok: false, reason: "missing development id" };
      const result = chooseDevelopment(state, tribeId, order.developmentId);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, summary: result.summary };
    }
    case "SCOUT": {
      const sentinel = Object.values(state.units).find((unit) => unit.tribeId === tribeId && unit.type === "sentinel" && unit.hp > 0 && unit.task.kind === "idle");
      if (!sentinel) return { ok: false, reason: "no idle sentinel available" };
      const target = chooseScoutTarget(state, tribeId);
      sentinel.task = { kind: "scout", target, path: findPath(state, sentinel, target) };
      addEvent(state, "AI_SCOUT_ORDER", `${state.tribes[tribeId].name} sends a sentinel`, `${sentinel.name} scouts toward ${target.x},${target.y}.`, "all");
      return { ok: true, summary: "sent sentinel scouting" };
    }
    case "DEFEND": {
      const townHall = findTownHall(state, tribeId);
      if (!townHall) return { ok: false, reason: "town hall destroyed" };
      let moved = 0;
      for (const unit of Object.values(state.units)) {
        if (unit.tribeId !== tribeId || unit.hp <= 0 || (unit.type !== "militia" && unit.type !== "archer")) continue;
        const target = { x: townHall.x + (moved % 3) - 1, y: townHall.y - 4 - Math.floor(moved / 3) };
        unit.task = { kind: "move", target, path: findPath(state, unit, target) };
        moved += 1;
      }
      if (moved === 0) return { ok: false, reason: "no defenders available" };
      addEvent(state, "AI_DEFEND_ORDER", `${state.tribes[tribeId].name} consolidates defense`, `${moved} defenders move toward the town hall.`, "all");
      return { ok: true, summary: `moved ${moved} defenders` };
    }
    case "ATTACK":
      return issueAttackOrder(state, tribeId, order.recipientTribeId, order.reason);
    case "REPORT_BUG": {
      const title = clampText(order.subject ?? "AI self-report", 80);
      const body = clampText(order.body || order.reason, 260);
      addEvent(state, "AI_SELF_REPORT", `${state.tribes[tribeId].name} reports an issue`, formatBugReportEventBody(title, body, order), "all");
      return { ok: true, summary: title };
    }
    case "REQUEST_INFO": {
      const subject = clampText(order.subject ?? "Information request", 80);
      const body = clampText(order.body || order.reason, 360);
      const request: AiInformationRequest = {
        id: nextId(state, "info"),
        tick: state.tick,
        tribeId,
        subject,
        body,
        reason: clampText(order.reason, 220)
      };
      state.aiInformationRequests.push(request);
      if (state.aiInformationRequests.length > 80) state.aiInformationRequests.shift();
      addEvent(state, "AI_INFO_REQUEST", `${state.tribes[tribeId].name} requests information`, `${subject}: ${body}`, "all");
      answerInformationRequest(state, request);
      return { ok: true, summary: subject };
    }
    case "SET_POLICY":
      addEvent(state, "AI_POLICY", `${state.tribes[tribeId].name} sets policy`, clampText(order.reason, 180), "all");
      return { ok: true, summary: "policy noted" };
  }
}

function orderBuildTarget(order: AiStrategicOrder, fallback: Position): Position {
  const x = Number(order.targetX);
  const y = Number(order.targetY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
  return {
    x: clamp(Math.round(x), 1, MAP_SIZE - 2),
    y: clamp(Math.round(y), 1, MAP_SIZE - 2)
  };
}

export function formAlliance(state: GameState, a: TribeId, b: TribeId): { ok: true; summary: string } | { ok: false; reason: string } {
  if (a === b) return { ok: false, reason: "a tribe cannot ally with itself" };
  if (state.alliances[a] === b && state.alliances[b] === a) return { ok: true, summary: `${state.tribes[a].name} is already allied with ${state.tribes[b].name}` };
  if (state.alliances[a] && state.alliances[a] !== b) return { ok: false, reason: `${state.tribes[a].name} already has an alliance with ${state.tribes[state.alliances[a]].name}` };
  if (state.alliances[b] && state.alliances[b] !== a) return { ok: false, reason: `${state.tribes[b].name} already has an alliance with ${state.tribes[state.alliances[b]].name}` };
  state.alliances[a] = b;
  state.alliances[b] = a;
  delete state.wars[a][b];
  delete state.wars[b][a];
  addEvent(state, "ALLIANCE_FORMED", `${state.tribes[a].name} allies with ${state.tribes[b].name}`, "Each tribe can hold only this one alliance unless it is later broken.", "all");
  return { ok: true, summary: `${state.tribes[a].name} allied with ${state.tribes[b].name}` };
}

function issueAttackOrder(
  state: GameState,
  tribeId: TribeId,
  targetTribeId: TribeId | undefined,
  reason: string | undefined
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (!targetTribeId || targetTribeId === tribeId || !tribeIds.includes(targetTribeId)) return { ok: false, reason: "invalid attack target" };
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === tribeId && unit.hp > 0 && (unit.type === "militia" || unit.type === "archer"))
    .slice(0, 4);
  if (attackers.length === 0) return { ok: false, reason: "no military units available" };
  declareWar(state, tribeId, targetTribeId, reason ?? "AI attack order");
  const visibleTarget = getVisibleUnits(state, tribeId)
    .filter((unit) => unit.tribeId === targetTribeId && !isProtectedMessenger(unit))
    .sort((left, right) => distance(attackers[0], left) - distance(attackers[0], right))[0];
  const townHall = findTownHall(state, targetTribeId);
  const target = visibleTarget ? { x: Math.round(visibleTarget.x), y: Math.round(visibleTarget.y) } : townHall ? { x: townHall.x, y: townHall.y } : starts[targetTribeId];
  for (const [index, unit] of attackers.entries()) {
    const offsetTarget = { x: target.x + (index % 2), y: target.y + Math.floor(index / 2) };
    unit.task = visibleTarget
      ? { kind: "attack", targetUnitId: visibleTarget.id, path: findPath(state, unit, offsetTarget) }
      : { kind: "move", target: offsetTarget, path: findPath(state, unit, offsetTarget) };
  }
  addEvent(
    state,
    "WAR_ATTACK_ORDER",
    `${state.tribes[tribeId].name} attacks ${state.tribes[targetTribeId].name}`,
    `${attackers.length} military units move under war orders. ${clampText(reason ?? "No stated reason.", 180)}`,
    "all"
  );
  return { ok: true, summary: `declared war on ${state.tribes[targetTribeId].name} and sent ${attackers.length} attackers` };
}

function declareWar(state: GameState, attacker: TribeId, defender: TribeId, reason: string): void {
  state.wars[attacker][defender] = true;
  state.wars[defender][attacker] = true;
  if (state.alliances[attacker] === defender) delete state.alliances[attacker];
  if (state.alliances[defender] === attacker) delete state.alliances[defender];
  addEvent(
    state,
    "WAR_DECLARED",
    `${state.tribes[attacker].name} declares war on ${state.tribes[defender].name}`,
    clampText(reason || "War has been declared.", 220),
    "all"
  );
}

export function applyTribeIdentity(
  state: GameState,
  tribeId: TribeId,
  identity: TribeIdentity
): { ok: true; summary: string } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  if (!tribe) return { ok: false, reason: "missing tribe" };
  const realmName = cleanName(identity.realmName, 34, tribe.name);
  const sovereignName = cleanName(identity.sovereignName, 42, `${realmName} Sovereign`);
  const namingStyle = cleanName(identity.namingStyle, 90, "historical and literary names");
  const inspiration = cleanName(identity.inspiration, 120, "history and books");
  const realmKey = identityNameKey(realmName);
  const sovereignKey = identityNameKey(sovereignName);
  const defaultIdentity = tribeIds.find((id) => {
    const defaultRealmKey = identityNameKey(state.tribes[id].defaultName);
    const defaultSovereignKey = identityNameKey(`${state.tribes[id].defaultName} Sovereign`);
    return realmKey === defaultRealmKey || realmKey === defaultSovereignKey || sovereignKey === defaultRealmKey || sovereignKey === defaultSovereignKey;
  });
  if (defaultIdentity) {
    return {
      ok: false,
      reason: `${realmName} or ${sovereignName} reuses the default placeholder identity for ${state.tribes[defaultIdentity].defaultName}`
    };
  }
  const duplicate = tribeIds.find(
    (otherId) =>
      otherId !== tribeId &&
      state.tribes[otherId].identityChosen &&
      (identityNameKey(state.tribes[otherId].name) === realmKey || identityNameKey(state.tribes[otherId].sovereignName) === sovereignKey)
  );
  if (duplicate) {
    return { ok: false, reason: `${realmName} or ${sovereignName} duplicates ${state.tribes[duplicate].name}'s identity` };
  }
  tribe.name = realmName;
  tribe.sovereignName = sovereignName;
  tribe.namingStyle = namingStyle;
  tribe.inspiration = inspiration;
  tribe.identityChosen = true;
  const sovereign = Object.values(state.units).find((unit) => unit.tribeId === tribeId && unit.type === "sovereign" && unit.hp > 0);
  if (sovereign) sovereign.name = sovereignName;
  addEvent(state, "AI_IDENTITY_CHOSEN", `${realmName} names its sovereign`, `${sovereignName} rules under a naming style inspired by ${inspiration}.`, "all");
  return { ok: true, summary: `${realmName} led by ${sovereignName}` };
}

export function renameUnits(
  state: GameState,
  tribeId: TribeId,
  choices: UnitNameChoice[]
): { accepted: string[]; rejected: string[] } {
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const choice of choices.slice(0, 16)) {
    const unit = state.units[choice.unitId];
    if (!unit || unit.tribeId !== tribeId || unit.hp <= 0) {
      rejected.push(`${choice.unitId}: unavailable unit`);
      continue;
    }
    const previous = unit.name;
    unit.name = cleanName(choice.name, 34, previous);
    accepted.push(`${previous} -> ${unit.name}`);
  }
  if (accepted.length > 0) {
    addEvent(state, "AI_UNIT_NAMES", `${state.tribes[tribeId].name} names its people`, accepted.slice(0, 5).join("; "), "all");
  }
  return { accepted, rejected };
}

export function recordAiDecision(
  state: GameState,
  decision: Omit<AiDecision, "id" | "tick">
): AiDecision {
  const strategySummary =
    decision.strategySummary.trim() ||
    decision.memoryNote?.trim() ||
    decision.freeformStrategy?.trim() ||
    decision.accepted[0] ||
    decision.rejected[0] ||
    "No strategic summary provided.";
  const stored: AiDecision = {
    ...decision,
    strategySummary,
    id: nextId(state, "ai"),
    tick: state.tick
  };
  state.aiDecisions.push(stored);
  if (state.aiDecisions.length > 40) state.aiDecisions.shift();
  updateSovereignDecisionCursor(state, stored);
  if (stored.memoryNote) appendSovereignMemory(state, stored.tribeId, stored.memoryNote);
  addEvent(
    state,
    "LLM_DECISION",
    `${state.tribes[stored.tribeId].name} makes an AI decision`,
    `${stored.strategySummary} Accepted: ${stored.accepted.join(", ") || "none"}.`,
    [stored.tribeId]
  );
  return stored;
}

function updateSovereignDecisionCursor(state: GameState, decision: AiDecision): void {
  const cursor = state.sovereignDecisionCursors[decision.tribeId] ?? { updatedTick: 0 };
  if (!decision.accepted.some((entry) => entry.startsWith("IDENTITY:"))) {
    cursor.lastMove = decision;
    if (!decision.accepted.some((entry) => entry.startsWith("REPLY:"))) cursor.lastStrategy = decision;
    cursor.updatedTick = decision.tick;
  }
  state.sovereignDecisionCursors[decision.tribeId] = cursor;
}

export function appendSovereignMemory(state: GameState, tribeId: TribeId, note: string): void {
  const clean = clampText(note, 220);
  if (!clean) return;
  const memory = state.sovereignMemories[tribeId] ?? { notes: [], updatedTick: 0 };
  const withoutDuplicate = memory.notes.filter((existing) => existing.toLowerCase() !== clean.toLowerCase());
  withoutDuplicate.push(clean);
  memory.notes = withoutDuplicate.slice(-8);
  memory.updatedTick = state.tick;
  state.sovereignMemories[tribeId] = memory;
}

export function summarizeSovereignMemory(state: GameState, tribeId: TribeId): string {
  const memory = state.sovereignMemories[tribeId];
  if (!memory || memory.notes.length === 0) return "none";
  return memory.notes.map((note, index) => `${index + 1}. ${note}`).join(" | ");
}

export function summarizeDiplomaticIntel(state: GameState, tribeId: TribeId, limit = 12): string {
  const items = state.diplomaticIntel?.[tribeId] ?? [];
  if (items.length === 0) return "none";
  return items
    .slice(-limit)
    .map((item) => {
      const other = state.tribes[item.counterpartyTribeId]?.name ?? item.counterpartyTribeId;
      const source = item.direction === "sent" ? `you to ${other}` : `${other} to you`;
      const caveat = item.truthStatus === "unverified_foreign_claim" ? "; unverified, may be false" : "";
      return `turn ${item.tick} ${source} ${item.kind} ${item.diplomacyIntent}: "${item.subject}" ${item.summary}${caveat}`;
    })
    .join(" | ");
}

export function trainUnit(state: GameState, tribeId: TribeId, unitType: "peon" | "militia" | "archer"): { ok: true; unitId: string } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  const population = Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
  if (population >= tribe.populationCap) return { ok: false, reason: "Population cap reached. Build more houses later; this slice starts with a cap of 20." };
  const cost = unitType === "peon" ? { food: 50, gold: 0, wood: 0 } : unitType === "militia" ? { food: 60, gold: 20, wood: 0 } : { food: 40, gold: 30, wood: 25 };
  if (tribe.resources.food < cost.food || tribe.resources.gold < cost.gold || tribe.resources.wood < cost.wood) return { ok: false, reason: `Not enough resources to train ${unitType}.` };
  const source = unitType === "peon" ? findTownHall(state, tribeId) : Object.values(state.buildings).find((building) => building.tribeId === tribeId && building.type === "barracks");
  if (!source) return { ok: false, reason: `No production building for ${unitType}.` };
  tribe.resources.food -= cost.food;
  tribe.resources.gold -= cost.gold;
  tribe.resources.wood -= cost.wood;
  const unit = addUnit(state, tribeId, unitType, source.x + 1, source.y + 1);
  addEvent(state, "UNIT_TRAINED", `${tribe.name} trains ${unitType}`, `${unit.name} is ready for orders.`, "all");
  updateVisibility(state);
  return { ok: true, unitId: unit.id };
}

export function getBuildingCost(buildingType: BuildableBuildingType): ResourceCost {
  return { ...buildingCosts[buildingType] };
}

export function getDevelopment(developmentId: DevelopmentId): Development {
  const development = developmentCatalog[developmentId];
  return {
    ...development,
    cost: { ...development.cost },
    prerequisites: [...development.prerequisites],
    unlocks: [...development.unlocks]
  };
}

export function getBuildingRequirements(buildingType: BuildableBuildingType): DevelopmentId[] {
  return [...buildingDevelopmentRequirements[buildingType]];
}

export function hasDevelopment(state: GameState, tribeId: TribeId, developmentId: DevelopmentId): boolean {
  return state.tribes[tribeId].developments.includes(developmentId);
}

export function getMissingBuildingDevelopments(state: GameState, tribeId: TribeId, buildingType: BuildableBuildingType): DevelopmentId[] {
  return buildingDevelopmentRequirements[buildingType].filter((developmentId) => !hasDevelopment(state, tribeId, developmentId));
}

export function canChooseDevelopment(state: GameState, tribeId: TribeId, developmentId: DevelopmentId): { ok: true } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  const development = developmentCatalog[developmentId];
  if (!development) return { ok: false, reason: "unknown development" };
  if (tribe.developments.includes(developmentId)) return { ok: false, reason: `${development.name} already unlocked` };
  const missingPrereq = development.prerequisites.filter((prereq) => !tribe.developments.includes(prereq));
  if (missingPrereq.length > 0) {
    return { ok: false, reason: `${development.name} requires ${formatDevelopmentList(missingPrereq)}` };
  }
  if (!canAfford(tribe.resources, development.cost)) {
    return { ok: false, reason: `Not enough resources to develop ${development.name}. Need ${formatResourceCost(development.cost)}.` };
  }
  return { ok: true };
}

export function chooseDevelopment(
  state: GameState,
  tribeId: TribeId,
  developmentId: DevelopmentId
): { ok: true; summary: string } | { ok: false; reason: string } {
  const check = canChooseDevelopment(state, tribeId, developmentId);
  if (!check.ok) return check;
  const development = developmentCatalog[developmentId];
  spendResources(state.tribes[tribeId].resources, development.cost);
  state.tribes[tribeId].developments.push(developmentId);
  addEvent(
    state,
    "DEVELOPMENT_CHOSEN",
    `${state.tribes[tribeId].name} develops ${development.name}`,
    `${development.description} Unlocks: ${development.unlocks.join(", ")}.`,
    "all"
  );
  return { ok: true, summary: `developed ${development.name}` };
}

export function buildStructure(
  state: GameState,
  tribeId: TribeId,
  buildingType: BuildableBuildingType,
  near: Position
): { ok: true; buildingId: string } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  const missingDevelopments = getMissingBuildingDevelopments(state, tribeId, buildingType);
  if (missingDevelopments.length > 0) {
    return { ok: false, reason: `${labelBuildingType(buildingType)} requires development ${formatDevelopmentList(missingDevelopments)}.` };
  }
  const cost = buildingCosts[buildingType];
  if (!canAfford(tribe.resources, cost)) return { ok: false, reason: `Not enough resources to build ${buildingType}. Need ${formatResourceCost(cost)}.` };
  const site = findBuildSite(state, near);
  if (!site) return { ok: false, reason: "No clear build site nearby." };
  spendResources(tribe.resources, cost);
  const building = addBuilding(state, tribeId, buildingType, site.x, site.y);
  addEvent(state, "STRUCTURE_BUILT", `${tribe.name} builds ${labelBuildingType(buildingType)}`, `A new ${labelBuildingType(buildingType)} stands at ${site.x},${site.y}.`, "all");
  updateVisibility(state);
  return { ok: true, buildingId: building.id };
}

export function setGateState(
  state: GameState,
  tribeId: TribeId,
  gateState: GateState,
  buildingId?: string
): { ok: true; buildingId: string; summary: string } | { ok: false; reason: string } {
  const gate = buildingId
    ? state.buildings[buildingId]
    : Object.values(state.buildings)
        .filter((building) => building.tribeId === tribeId && building.type === "gate" && building.hp > 0)
        .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!gate || gate.hp <= 0) return { ok: false, reason: "no living gate found" };
  if (gate.tribeId !== tribeId) return { ok: false, reason: "cannot control another tribe's gate" };
  if (gate.type !== "gate") return { ok: false, reason: "selected building is not a gate" };
  gate.gateState = gateState;
  addEvent(
    state,
    "GATE_STATE_CHANGED",
    `${state.tribes[tribeId].name} sets a gate ${gateState}`,
    `Gate at ${gate.x},${gate.y} is now ${gateState}. ${gateState === "open" ? "It can be crossed." : "It blocks movement."}`,
    "all"
  );
  updateVisibility(state);
  return { ok: true, buildingId: gate.id, summary: `set gate ${gate.id} ${gateState}` };
}

export function damageBuilding(
  state: GameState,
  buildingId: string,
  amount: number,
  attackerTribeId?: TribeId
): { ok: true; destroyed: boolean } | { ok: false; reason: string } {
  const building = state.buildings[buildingId];
  if (!building || building.hp <= 0) return { ok: false, reason: "missing building" };
  const destroyed = applyBuildingDamage(state, building, amount, attackerTribeId);
  return { ok: true, destroyed };
}

function canAfford(resources: Resources, cost: ResourceCost): boolean {
  return resourceTypes.every((type) => resources[type] >= (cost[type] ?? 0));
}

function spendResources(resources: Resources, cost: ResourceCost): void {
  for (const type of resourceTypes) resources[type] -= cost[type] ?? 0;
}

function formatResourceCost(cost: ResourceCost): string {
  const parts = resourceTypes.flatMap((type) => {
    const amount = cost[type] ?? 0;
    return amount > 0 ? [`${amount} ${type}`] : [];
  });
  return parts.join(", ") || "free";
}

function formatDevelopmentList(developmentIds: DevelopmentId[]): string {
  return developmentIds.map((id) => developmentCatalog[id].name).join(", ");
}

export function assignGathering(state: GameState, unitId: string, resource: ResourceType): { ok: true } | { ok: false; reason: string } {
  const unit = state.units[unitId];
  if (!unit || unit.tribeId !== "blue" || unit.type !== "peon") return { ok: false, reason: "Select a Blue peon first." };
  const target = findNearestResource(state, unit, resource);
  if (!target) return { ok: false, reason: `No ${resource} source found.` };
  const townHall = findTownHall(state, unit.tribeId);
  if (!townHall) return { ok: false, reason: "Town hall is unavailable for dropoff." };
  unit.task = {
    kind: "gather",
    resource,
    target,
    dropoff: { x: townHall.x, y: townHall.y },
    path: findPath(state, unit, target),
    cargo: 0
  };
  return { ok: true };
}

export function issueMove(state: GameState, unitId: string, target: Position): boolean {
  const unit = state.units[unitId];
  if (!unit || unit.tribeId !== "blue") return false;
  const path = findPath(state, unit, target);
  unit.task = { kind: "move", target, path };
  return true;
}

export function computeWealth(state: GameState, tribeId: TribeId): number {
  const tribe = state.tribes[tribeId];
  if (tribe.eliminated) return 0;
  const banked =
    tribe.resources.gold +
    tribe.resources.food * 0.18 +
    tribe.resources.wood * 0.22 +
    tribe.resources.stone * 0.3 +
    tribe.resources.clay * 0.34 +
    tribe.resources.limestone * 0.38 +
    tribe.resources.iron * 0.55 +
    tribe.resources.coal * 0.48;
  const unitValue = Object.values(state.units).filter((u) => u.tribeId === tribeId && u.hp > 0).length * 18;
  const buildingValue = Object.values(state.buildings).filter((b) => b.tribeId === tribeId).length * 55;
  return Math.round(banked + unitValue + buildingValue);
}

export function getVictoryPressure(state: GameState): VictoryPressureStatus {
  const currentYear = getCurrentYear(state);
  const nextReviewYear = state.victoryPressure.nextReviewYear;
  const ranked = tribeIds
    .map((tribeId) => survivalScoreEntry(state, tribeId))
    .sort(
      (left, right) =>
        Number(left.eliminated) - Number(right.eliminated) ||
        right.survivalScore - left.survivalScore ||
        right.wealthPerCapita - left.wealthPerCapita ||
        tribeIds.indexOf(left.tribeId) - tribeIds.indexOf(right.tribeId)
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const surviving = ranked.filter((entry) => !entry.eliminated);
  const poorest = surviving.slice().sort((left, right) => left.survivalScore - right.survivalScore || left.wealthPerCapita - right.wealthPerCapita)[0] ?? leader;
  const config = state.victoryPressure;
  const winnerTribeId = config.winnerTribeId;
  const status: VictoryPressureStatus["status"] = winnerTribeId ? "claimed" : config.warningIssued ? "warning" : "surviving";
  const finalTick = yearToTick(config.finalYear);
  const warningTick = yearToTick(Math.max(1, nextReviewYear - 10));
  const turnsRemaining = Math.max(0, yearToTick(nextReviewYear) - state.tick);
  const yearsUntilReview = Math.max(0, nextReviewYear - currentYear);
  const targetProgress = Math.min(1, currentYear / config.finalYear);
  const winner = winnerTribeId ? ranked.find((entry) => entry.tribeId === winnerTribeId) : undefined;
  const winnerName = winnerTribeId ? state.tribes[winnerTribeId].name : undefined;
  const winnerGold = config.winnerGold ?? winner?.gold;
  const winnerSurvivalScore = config.winnerSurvivalScore ?? winner?.survivalScore;
  const publicText =
    status === "claimed" && winnerTribeId
      ? `${winnerName} is the last surviving population in year ${config.wonYear ?? currentYear}. Post-game learning has been written into each sovereign memory.`
      : `Year ${currentYear}: each sovereign must keep its population happy, alive, and safe. Every ${config.reviewIntervalYears} years the poorest surviving population is wiped out and dies; that is the opposite of safety. The last living population around year ${config.finalYear} survives. Exact rival wealth is not public.`;

  return {
    status,
    victoryRule: "population_happiness_safety_century_cull",
    currentYear,
    currentCentury: Math.max(1, Math.ceil(currentYear / config.reviewIntervalYears)),
    nextReviewYear,
    finalYear: config.finalYear,
    yearsUntilReview,
    survivingTribes: surviving.length,
    eliminatedTribes: tribeIds.length - surviving.length,
    goldTarget: 0,
    wealthTarget: 0,
    deadlineTick: finalTick,
    warningTick,
    turnsRemaining,
    leaderTribeId: leader.tribeId,
    leaderName: leader.tribeName,
    leaderGold: leader.gold,
    leaderWealth: leader.wealth,
    leaderSurvivalScore: leader.survivalScore,
    poorestTribeId: poorest.tribeId,
    poorestName: poorest.tribeName,
    poorestSurvivalScore: poorest.survivalScore,
    runnerUpTribeId: runnerUp?.tribeId,
    runnerUpName: runnerUp?.tribeName,
    runnerUpGold: runnerUp?.gold,
    runnerUpWealth: runnerUp?.wealth,
    leaderMargin: leader.survivalScore - (runnerUp?.survivalScore ?? 0),
    targetProgress,
    winnerTribeId,
    winnerName,
    winnerSurvivalScore,
    winnerGold,
    wonYear: config.wonYear,
    wonTick: config.wonTick,
    scoreByTribe: ranked,
    publicText
  };
}

export function getCurrentYear(state: GameState): number {
  return 1 + Math.floor(state.tick / TICKS_PER_GAME_YEAR);
}

export function getTribeSafetyScore(state: GameState, tribeId: TribeId): number {
  const population = countLivingPopulation(state, tribeId);
  if (state.tribes[tribeId].eliminated || population === 0) return 0;
  const ownUnits = Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0);
  const military = ownUnits.filter((unit) => unit.type === "militia" || unit.type === "archer").length;
  const sentinels = ownUnits.filter((unit) => unit.type === "sentinel").length;
  const ownBuildings = Object.values(state.buildings).filter((building) => building.tribeId === tribeId && building.hp > 0);
  const walls = ownBuildings.filter((building) => building.type === "wall").length;
  const gates = ownBuildings.filter((building) => building.type === "gate").length;
  const turrets = ownBuildings.filter((building) => building.type === "turret").length;
  const watchtowers = ownBuildings.filter((building) => building.type === "watchtower").length;
  const activeWars = tribeIds.filter((other) => state.wars[tribeId]?.[other]).length;
  const townHall = ownBuildings.some((building) => building.type === "townHall") ? 8 : -22;
  const raw =
    34 + townHall + military * 5 + sentinels * 3 + walls * 2 + gates * 3 + turrets * 8 + watchtowers * 5 - activeWars * 10 - Math.max(0, 10 - population) * 1.5;
  return Math.round(clamp(raw, 0, 100));
}

function survivalScoreEntry(state: GameState, tribeId: TribeId): VictoryScoreEntry {
  const tribe = state.tribes[tribeId];
  const population = countLivingPopulation(state, tribeId);
  const wealth = computeWealth(state, tribeId);
  const wealthPerCapita = population > 0 ? Math.round(wealth / population) : 0;
  const safety = getTribeSafetyScore(state, tribeId);
  const happiness = Math.round(tribe.happiness);
  const survivalScore = tribe.eliminated
    ? 0
    : Math.round(wealthPerCapita * 0.72 + happiness * 3.2 + safety * 2.4 + Math.min(120, population * 5));
  return {
    tribeId,
    tribeName: tribe.name,
    gold: Math.round(tribe.resources.gold),
    wealth,
    population,
    happiness,
    safety,
    wealthPerCapita,
    survivalScore,
    eliminated: tribe.eliminated,
    eliminatedYear: tribe.eliminatedYear,
    rank: 0
  };
}

function countLivingPopulation(state: GameState, tribeId: TribeId): number {
  return Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
}

function yearToTick(year: number): number {
  return Math.max(0, (year - 1) * TICKS_PER_GAME_YEAR);
}

export function getVisibleUnits(state: GameState, tribeId: TribeId): Unit[] {
  const visible = state.visibility[tribeId];
  return Object.values(state.units).filter((unit) => unit.hp > 0 && visible[tileIndex(Math.round(unit.x), Math.round(unit.y))] === 2);
}

export function getVisibleBuildings(state: GameState, tribeId: TribeId): Building[] {
  const visible = state.visibility[tribeId];
  return Object.values(state.buildings).filter((building) => visible[tileIndex(building.x, building.y)] === 2);
}

function answerInformationRequest(state: GameState, request: AiInformationRequest): void {
  const lower = `${request.subject} ${request.body} ${request.reason}`.toLowerCase();
  const ownUnits = Object.values(state.units).filter((unit) => unit.tribeId === request.tribeId && unit.hp > 0);
  const military = ownUnits.filter((unit) => unit.type === "militia" || unit.type === "archer").length;
  const walls = Object.values(state.buildings).filter((building) => building.tribeId === request.tribeId && building.type === "wall").length;
  const gates = Object.values(state.buildings).filter((building) => building.tribeId === request.tribeId && building.type === "gate").length;
  const turrets = Object.values(state.buildings).filter((building) => building.tribeId === request.tribeId && building.type === "turret").length;
  const visibleResources = summarizeVisibleResourceIntel(state, request.tribeId, lower);
  const visibleForeign = summarizeVisibleForeignIntel(state, request.tribeId);
  const diplomacy = summarizeInformationDiplomacy(state, request.tribeId);
  const victory = getVictoryPressure(state);
  const asksHidden =
    /\b(private|secret|hidden|unseen|intent|plans?|strategy|treasury|resources|wealth|rich|poorest|army|armies)\b/.test(lower) &&
    /\b(enemy|rival|foreign|other|their|opponent)\b/.test(lower);
  const answerStatus: AiInformationRequest["answerStatus"] = asksHidden ? "partial" : "answered";
  const hiddenCaveat = asksHidden
    ? "Private rival intent, unseen armies, and hidden treasuries are not directly observable; scout, send a messenger, or provoke a public event to learn more."
    : "No hidden-state caveat triggered by this question.";
  const ownPosition = `${state.tribes[request.tribeId].name} has wealth ${computeWealth(state, request.tribeId)}, resources ${formatResourcesForInformation(state.tribes[request.tribeId].resources)}, ${ownUnits.length} living units, ${military} military units, ${walls} walls, ${gates} gates, and ${turrets} turrets.`;
  const answer = clampText(
    [
      `Answer uses own, visible, and public information at turn ${state.tick}.`,
      hiddenCaveat,
      `Survival mandate: ${victory.publicText}`,
      ownPosition,
      visibleResources,
      visibleForeign,
      diplomacy
    ].join(" "),
    950
  );
  request.answerStatus = answerStatus;
  request.answerTick = state.tick;
  request.answer = answer;
  request.answerSummary = clampText(answerStatus === "partial" ? `${request.subject}: partial answer; scouting or diplomacy required.` : `${request.subject}: answered from visible/public state.`, 140);
  addEvent(
    state,
    "AI_INFO_ANSWER",
    `${state.tribes[request.tribeId].name} receives an intelligence answer`,
    request.answerSummary,
    [request.tribeId]
  );
}

function summarizeVisibleResourceIntel(state: GameState, tribeId: TribeId, lower: string): string {
  const wanted = requestedResourceTypes(lower);
  const visible = state.visibility[tribeId];
  const base = findTownHall(state, tribeId) ?? starts[tribeId];
  const deposits: { type: ResourceType; x: number; y: number; amount: number; distance: number }[] = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const index = tileIndex(x, y);
      if (visible[index] !== 2) continue;
      const tile = state.map[index];
      if (tile.resource?.amount && wanted.includes(tile.resource.type)) {
        deposits.push({ type: tile.resource.type, x, y, amount: Math.round(tile.resource.amount), distance: distance(base, { x, y }) });
      }
    }
  }
  if (deposits.length === 0) {
    return `Visible resource answer: no ${wanted.join("/")} deposits are currently visible; scout roads, borders, and the center before committing workers or armies.`;
  }
  deposits.sort((left, right) => left.distance - right.distance || right.amount - left.amount);
  return `Visible resource answer: ${deposits
    .slice(0, 6)
    .map((deposit) => `${deposit.type} at ${deposit.x},${deposit.y} amount ${deposit.amount} (${Math.round(deposit.distance)} tiles)`)
    .join("; ")}.`;
}

function requestedResourceTypes(lower: string): ResourceType[] {
  const explicit = resourceTypes.filter((type) => lower.includes(type));
  if (explicit.length > 0) return explicit;
  if (/\b(resource|resources|deposit|deposits|mine|mines|route|routes|map|contested|building|build)\b/.test(lower)) {
    return ["coal", "iron", "limestone", "clay", "gold", "stone", "food"];
  }
  return ["coal", "iron", "limestone", "clay", "gold", "stone"];
}

function summarizeVisibleForeignIntel(state: GameState, tribeId: TribeId): string {
  const visibleUnits = getVisibleUnits(state, tribeId).filter((unit) => unit.tribeId !== tribeId);
  const visibleBuildings = getVisibleBuildings(state, tribeId).filter((building) => building.tribeId !== tribeId);
  const unitCounts = countBy(visibleUnits, (unit) => `${unit.tribeId} ${unit.type}`);
  const buildingCounts = countBy(visibleBuildings, (building) => `${building.tribeId} ${building.type}`);
  const unitText = unitCounts.length > 0 ? unitCounts.join(", ") : "no foreign units visible";
  const buildingText = buildingCounts.length > 0 ? buildingCounts.join(", ") : "no foreign buildings visible";
  return `Visible foreign answer: ${unitText}; ${buildingText}.`;
}

function summarizeInformationDiplomacy(state: GameState, tribeId: TribeId): string {
  const alliance = state.alliances[tribeId] ? state.tribes[state.alliances[tribeId]].name : "none";
  const wars = tribeIds.filter((other) => state.wars[tribeId]?.[other]).map((other) => state.tribes[other].name);
  const packets = Object.values(state.packets)
    .filter((packet) => packet.originTribeId === tribeId || packet.recipientTribeId === tribeId)
    .slice(-4)
    .map((packet) => `${packet.originTribeId}->${packet.recipientTribeId} ${packet.state}`)
    .join("; ");
  return `Diplomacy answer: alliance ${alliance}; wars ${wars.join(", ") || "none"}; recent packets ${packets || "none"}.`;
}

function countBy<T>(items: T[], label: (item: T) => string): string[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(label(item), (counts.get(label(item)) ?? 0) + 1);
  return Array.from(counts.entries()).map(([key, count]) => `${count} ${key}`);
}

function formatResourcesForInformation(resources: Resources): string {
  return resourceTypes.map((type) => `${type} ${Math.round(resources[type])}`).join(", ");
}

export function getTownHall(state: GameState, tribeId: TribeId): Building {
  const building = findTownHall(state, tribeId);
  if (!building) throw new Error(`Missing town hall for ${tribeId}`);
  return building;
}

function findTownHall(state: GameState, tribeId: TribeId): Building | undefined {
  return Object.values(state.buildings).find((building) => building.tribeId === tribeId && building.type === "townHall" && building.hp > 0);
}

export function getRecentVisibleEvents(state: GameState, tribeId: TribeId, count = 12): GameEvent[] {
  return state.events
    .filter((event) => event.visibleTo === "all" || event.visibleTo.includes(tribeId))
    .slice(-count)
    .reverse();
}

export function worldSignature(state: GameState): string {
  const units = Object.values(state.units)
    .filter((u) => u.hp > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((u) => `${u.id}:${u.type}:${u.tribeId}:${u.x.toFixed(2)},${u.y.toFixed(2)}:${u.hp}:${u.task.kind}`)
    .join("|");
  const packets = Object.values(state.packets)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${p.state}:${p.carrierUnitId ?? "none"}:${p.messageIds.length}`)
    .join("|");
  return `${state.tick};${units};${packets}`;
}

function spawnTribe(state: GameState, tribeId: TribeId, start: Position): void {
  addBuilding(state, tribeId, "townHall", start.x, start.y);
  addBuilding(state, tribeId, "farm", start.x - 4, start.y + 2);
  addBuilding(state, tribeId, "barracks", start.x + 3, start.y + 3);
  addBuilding(state, tribeId, "market", start.x + 5, start.y - 2);
  addBuilding(state, tribeId, "watchtower", start.x - 5, start.y - 3);
  addUnit(state, tribeId, "sovereign", start.x, start.y - 2);
  for (let i = 0; i < 6; i += 1) addUnit(state, tribeId, "peon", start.x - 2 + (i % 3), start.y + 3 + Math.floor(i / 3));
  addUnit(state, tribeId, "militia", start.x + 2, start.y - 2);
  addUnit(state, tribeId, "militia", start.x + 3, start.y - 2);
  addUnit(state, tribeId, "sentinel", start.x - 3, start.y - 1);
  addUnit(state, tribeId, "messenger", start.x + 1, start.y + 1);
}

function addUnit(state: GameState, tribeId: TribeId, type: UnitType, x: number, y: number): Unit {
  const id = nextId(state, type);
  const stats = unitStats[type];
  const unit: Unit = {
    id,
    name: id,
    type,
    tribeId,
    x,
    y,
    ...stats,
    attackCooldown: 0,
    task: { kind: "idle" }
  };
  state.units[id] = unit;
  return unit;
}

function addBuilding(state: GameState, tribeId: TribeId, type: BuildingType, x: number, y: number): Building {
  const id = nextId(state, type);
  const stats = buildingStats[type];
  const building: Building = {
    id,
    type,
    tribeId,
    x,
    y,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  if (type === "gate") building.gateState = "open";
  state.buildings[id] = building;
  return building;
}

function updateScriptedAi(state: GameState): void {
  for (const tribeId of tribeIds) {
    const tribe = state.tribes[tribeId];
    if (tribe.eliminated) continue;
    if (state.tick - tribe.lastDecisionTick >= 80) {
      tribe.lastDecisionTick = state.tick;
      assignIdleWorkers(state, tribeId);
      assignScouts(state, tribeId);
      trainIfPossible(state, tribeId);
    }
    if (tribe.controller === "scripted" && state.tick >= tribe.nextMessageTick) {
      const options = tribeIds.filter((id) => id !== tribeId);
      const target = options[Math.floor(random(state) * options.length)];
      const isThreat = tribeId === "red" || tribeId === "yellow";
      const result = sendMessage(
        state,
        tribeId,
        target,
        isThreat ? "THREAT" : "TREATY_PROPOSAL",
        isThreat ? "Respect our border" : "Safe roads proposal",
        isThreat
          ? `${state.tribes[tribeId].name} will not tolerate scouts near our market.`
          : `${state.tribes[tribeId].name} proposes messenger safety and temporary trade peace.`,
        true,
        isThreat ? "WARNING" : "PEACE_OFFER"
      );
      tribe.nextMessageTick = state.tick + 460 + Math.floor(random(state) * 360);
      if (!result.ok) tribe.nextMessageTick += 180;
    }
  }
}

function assignIdleWorkers(state: GameState, tribeId: TribeId): void {
  const peons = Object.values(state.units).filter((u) => u.tribeId === tribeId && u.type === "peon" && u.task.kind === "idle");
  const townHall = findTownHall(state, tribeId);
  if (!townHall) return;
  for (const peon of peons) {
    const resources: ResourceType[] = ["wood", "wood", "food", "food", "gold", "stone", "clay", "limestone", "iron", "coal"];
    const resource = resources[Math.floor(random(state) * resources.length)];
    const target = findNearestResource(state, peon, resource);
    if (!target) continue;
    peon.task = {
      kind: "gather",
      resource,
      target,
      dropoff: { x: townHall.x, y: townHall.y },
      path: findPath(state, peon, target),
      cargo: 0
    };
  }
}

function assignScouts(state: GameState, tribeId: TribeId): void {
  for (const unit of Object.values(state.units)) {
    if (unit.tribeId !== tribeId || unit.type !== "sentinel" || unit.task.kind !== "idle") continue;
    const start = starts[tribeId];
    const angle = random(state) * Math.PI * 2;
    const radius = 18 + random(state) * 34;
    const target = {
      x: clamp(Math.round(start.x + Math.cos(angle) * radius), 2, MAP_SIZE - 3),
      y: clamp(Math.round(start.y + Math.sin(angle) * radius), 2, MAP_SIZE - 3)
    };
    unit.task = { kind: "scout", target, path: findPath(state, unit, target) };
  }
}

function trainIfPossible(state: GameState, tribeId: TribeId): void {
  const tribe = state.tribes[tribeId];
  const population = Object.values(state.units).filter((u) => u.tribeId === tribeId && u.hp > 0).length;
  if (population >= tribe.populationCap) return;
  const townHall = findTownHall(state, tribeId);
  const barracks = Object.values(state.buildings).find((b) => b.tribeId === tribeId && b.type === "barracks");
  if (townHall && tribe.resources.food >= 55 && state.tick % 240 === 0) {
    tribe.resources.food -= 50;
    addUnit(state, tribeId, "peon", townHall.x + 1, townHall.y + 2);
    addEvent(state, "UNIT_TRAINED", `${tribe.name} trains a peon`, "A new worker joins the economy.", [tribeId]);
  }
  if (barracks && tribe.resources.food >= 70 && tribe.resources.gold >= 25 && state.tick % 360 === 0) {
    tribe.resources.food -= 60;
    tribe.resources.gold -= 20;
    addUnit(state, tribeId, random(state) > 0.5 ? "militia" : "archer", barracks.x, barracks.y + 1);
  }
}

function trainSpecialUnit(
  state: GameState,
  tribeId: TribeId,
  unitType: "messenger" | "sentinel"
): { ok: true; summary: string } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  const population = Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
  if (population >= tribe.populationCap) return { ok: false, reason: "population cap reached" };
  const cost = unitType === "messenger" ? { food: 40, gold: 10 } : { food: 30, gold: 20 };
  if (tribe.resources.food < cost.food || tribe.resources.gold < cost.gold) return { ok: false, reason: `not enough resources for ${unitType}` };
  const townHall = findTownHall(state, tribeId);
  if (!townHall) return { ok: false, reason: "town hall destroyed" };
  tribe.resources.food -= cost.food;
  tribe.resources.gold -= cost.gold;
  const unit = addUnit(state, tribeId, unitType, townHall.x + 2, townHall.y + 1);
  addEvent(state, "UNIT_TRAINED", `${tribe.name} trains ${unitType}`, `${unit.name} is ready for orders.`, "all");
  updateVisibility(state);
  return { ok: true, summary: `trained ${unitType}` };
}

function chooseScoutTarget(state: GameState, tribeId: TribeId): Position {
  const start = starts[tribeId];
  const visibleEnemy = getVisibleUnits(state, tribeId).find((unit) => unit.tribeId !== tribeId);
  if (visibleEnemy) return { x: Math.round(visibleEnemy.x), y: Math.round(visibleEnemy.y) };
  const angle = random(state) * Math.PI * 2;
  const radius = 22 + random(state) * 42;
  return {
    x: clamp(Math.round(start.x + Math.cos(angle) * radius), 2, MAP_SIZE - 3),
    y: clamp(Math.round(start.y + Math.sin(angle) * radius), 2, MAP_SIZE - 3)
  };
}

function findBuildSite(state: GameState, near: Position): Position | undefined {
  const origin = { x: Math.round(near.x), y: Math.round(near.y) };
  for (let radius = 1; radius <= 5; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
        if (!isWalkable(state, x, y)) continue;
        if (state.map[tileIndex(x, y)].resource) continue;
        if (Object.values(state.buildings).some((building) => building.x === x && building.y === y)) continue;
        if (Object.values(state.units).some((unit) => unit.hp > 0 && Math.round(unit.x) === x && Math.round(unit.y) === y)) continue;
        return { x, y };
      }
    }
  }
  return undefined;
}

function labelBuildingType(type: BuildingType): string {
  return type.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function updateUnits(state: GameState): void {
  for (const unit of Object.values(state.units)) {
    if (unit.hp <= 0) continue;
    unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
    switch (unit.task.kind) {
      case "idle":
        break;
      case "move":
      case "scout":
        moveAlongPath(state, unit, unit.task.path);
        if (distance(unit, unit.task.target) < 0.35) unit.task = { kind: "idle" };
        break;
      case "gather":
        updateGatherer(state, unit);
        break;
      case "deliver":
        updateMessenger(state, unit, unit.task);
        break;
      case "attack":
        updateAttacker(state, unit);
        break;
    }
  }
}

function updateGatherer(state: GameState, unit: Unit): void {
  if (unit.task.kind !== "gather") return;
  const task = unit.task;
  const targetTile = state.map[tileIndex(task.target.x, task.target.y)];
  if (task.cargo >= 10) {
    if (distance(unit, task.dropoff) > 0.45) {
      if (task.path.length === 0) task.path = findPath(state, unit, task.dropoff);
      moveAlongPath(state, unit, task.path);
      return;
    }
    state.tribes[unit.tribeId].resources[task.resource] += task.cargo;
    task.cargo = 0;
    task.path = findPath(state, unit, task.target);
    return;
  }
  if (distance(unit, task.target) > 0.45) {
    moveAlongPath(state, unit, task.path);
    return;
  }
  if (task.resource === "wood" && targetTile.terrain === "forest") {
    if (targetTile.resource?.type === "wood") {
      if (targetTile.resource.amount <= 0) {
        targetTile.terrain = "grass";
        delete targetTile.resource;
        unit.task = { kind: "idle" };
        return;
      }
      targetTile.resource.amount -= 1;
      task.cargo += 1;
      if (targetTile.resource.amount <= 0) {
        targetTile.terrain = "grass";
        delete targetTile.resource;
      }
      return;
    }
    task.cargo += 1;
    return;
  }
  if (!targetTile.resource || targetTile.resource.amount <= 0) {
    const next = findNearestResource(state, unit, task.resource);
    if (!next) {
      unit.task = { kind: "idle" };
      return;
    }
    task.target = next;
    task.path = findPath(state, unit, next);
    return;
  }
  targetTile.resource.amount -= 1;
  task.cargo += 1;
}

function updateMessenger(state: GameState, unit: Unit, task: Extract<UnitTask, { kind: "deliver" }>): void {
  const packet = state.packets[task.packetId];
  if (!packet) {
    unit.task = { kind: "idle" };
    return;
  }
  if (task.phase === "outbound") {
    if (task.path.length === 0 && distance(unit, task.destination) >= 0.45) {
      const path = findPath(state, unit, task.destination);
      if (!pathArrives(path, task.destination)) {
        markMessengerRouteBlocked(state, unit, packet, "outbound route blocked");
        return;
      }
      task.path = path;
    }
    moveAlongPath(state, unit, task.path);
    recordRouteMemory(state, unit, packet);
    if (distance(unit, task.destination) < 0.45) {
      packet.state = "AWAITING_REPLY";
      packet.lastStateChangeTick = state.tick;
      for (const messageId of packet.messageIds) {
        const message = state.messages[messageId];
        message.deliveredTick = state.tick;
        message.readTick = state.tick;
        recordMessageIntelForOwner(state, message, packet.recipientTribeId, "received");
      }
      const decision = recipientDecision(state, packet);
      addEvent(
        state,
        "MESSAGE_DELIVERED",
        `${state.tribes[packet.recipientTribeId].name} receives a messenger`,
        decision.eventText,
        [packet.originTribeId, packet.recipientTribeId]
      );
      task.phase = "waiting";
      task.waitUntilTick = state.tick + decision.delayTicks;
    }
    return;
  }
  if (task.phase === "waiting") {
    if (packet.messageIds.length > 1) {
      beginReturnTrip(state, unit, task, packet);
      return;
    }
    if (task.waitUntilTick && state.tick < task.waitUntilTick) return;
    if (state.tribes[packet.recipientTribeId].controller === "llm") return;
    attachReplyToPacket(state, packet.id, createDeterministicReplyInput(state, packet));
    return;
  }
  if (task.path.length === 0 && distance(unit, task.returnTo) >= 0.45) {
    const path = findPath(state, unit, task.returnTo);
    if (!pathArrives(path, task.returnTo)) {
      markMessengerRouteBlocked(state, unit, packet, "return route blocked");
      return;
    }
    task.path = path;
  }
  moveAlongPath(state, unit, task.path);
  recordRouteMemory(state, unit, packet);
  if (distance(unit, task.returnTo) < 0.45) {
    packet.state = "COMPLETED";
    packet.carrierUnitId = undefined;
    packet.lastStateChangeTick = state.tick;
    unit.carriedPacketId = undefined;
    unit.task = { kind: "idle" };
    for (const messageId of packet.messageIds) {
      const message = state.messages[messageId];
      if (message?.recipientTribeId === packet.originTribeId) {
        message.deliveredTick = state.tick;
        message.readTick = state.tick;
        recordMessageIntelForOwner(state, message, packet.originTribeId, "received");
      }
    }
    addEvent(
      state,
      "MESSENGER_RETURNED",
      `${unit.name} returns to ${state.tribes[packet.originTribeId].name}`,
      `${packet.routeMemory.slice(-2).join(" ") || "The route was uneventful."}`,
      [packet.originTribeId]
    );
  }
}

export function attachReplyToPacket(
  state: GameState,
  packetId: string,
  reply: {
    subject: string;
    body: string;
    diplomacyIntent?: DiplomacyIntent;
  }
): { ok: true; messageId: string; allianceFormed?: boolean } | { ok: false; reason: string } {
  const packet = state.packets[packetId];
  if (!packet) return { ok: false, reason: "missing packet" };
  if (packet.state !== "AWAITING_REPLY") return { ok: false, reason: `packet is ${packet.state.toLowerCase().replaceAll("_", " ")}` };
  if (packet.messageIds.length > 1) return { ok: false, reason: "packet already has a reply" };
  const original = state.messages[packet.messageIds[0]];
  if (!original) return { ok: false, reason: "missing original message" };
  const message: Message = {
    id: nextId(state, "msg"),
    type: "REPLY",
    originTribeId: packet.recipientTribeId,
    recipientTribeId: packet.originTribeId,
    replyToMessageId: original.id,
    subject: clampText(reply.subject || `Re: ${original.subject}`, 80),
    body: clampText(reply.body || "We have received your messenger and will consider your position.", 1200),
    diplomacyIntent: reply.diplomacyIntent ?? "NONE",
    requiresReply: false,
    createdTick: state.tick
  };
  state.messages[message.id] = message;
  packet.messageIds.push(message.id);
  recordMessageIntelForOwner(state, message, packet.recipientTribeId, "sent");
  const allianceFormed = resolveAllianceFromDiscussion(state, original, message);
  const carrier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
  if (carrier?.task.kind === "deliver" && carrier.task.packetId === packet.id && carrier.task.phase === "waiting") {
    beginReturnTrip(state, carrier, carrier.task, packet);
  }
  addEvent(
    state,
    "REPLY_ATTACHED",
    `${state.tribes[packet.recipientTribeId].name} replies`,
    `${message.subject} is sealed and given back to the messenger.${allianceFormed ? " The reply accepts an alliance." : ""}`,
    [packet.originTribeId, packet.recipientTribeId]
  );
  return { ok: true, messageId: message.id, allianceFormed };
}

function updateAttacker(state: GameState, unit: Unit): void {
  if (unit.task.kind !== "attack") return;
  const target = state.units[unit.task.targetUnitId];
  if (!target || target.hp <= 0 || target.tribeId === unit.tribeId) {
    unit.task = { kind: "idle" };
    return;
  }
  if (distance(unit, target) <= unit.range) return;
  if (unit.task.path.length === 0) unit.task.path = findPath(state, unit, { x: target.x, y: target.y });
  moveAlongPath(state, unit, unit.task.path);
}

function updateCombat(state: GameState): void {
  updateTurrets(state);
  const living = Object.values(state.units).filter((u) => u.hp > 0);
  for (const unit of living) {
    if (unit.attack <= 0 || unit.attackCooldown > 0) continue;
    const target = living.find(
      (other) =>
        other.tribeId !== unit.tribeId &&
        !isProtectedMessenger(other) &&
        areHostile(state, unit.tribeId, other.tribeId) &&
        distance(unit, other) <= unit.range
    );
    if (target) {
      applyUnitDamage(state, target, unit.attack, unit.tribeId);
      unit.attackCooldown = Math.round(TICK_RATE * 1.2);
      continue;
    }
    const buildingTarget = findHostileBuildingInRange(state, unit);
    if (!buildingTarget) continue;
    applyBuildingDamage(state, buildingTarget, unit.attack, unit.tribeId);
    unit.attackCooldown = Math.round(TICK_RATE * 1.2);
  }
}

function updateTurrets(state: GameState): void {
  const living = Object.values(state.units).filter((unit) => unit.hp > 0);
  for (const turret of Object.values(state.buildings)) {
    if (turret.type !== "turret" || turret.hp <= 0) continue;
    const stats = buildingStats[turret.type];
    turret.attackCooldown = Math.max(0, turret.attackCooldown - 1);
    if (turret.attackCooldown > 0) continue;
    const target = living
      .filter(
        (unit) =>
          unit.tribeId !== turret.tribeId &&
          !isProtectedMessenger(unit) &&
          areHostile(state, turret.tribeId, unit.tribeId) &&
          distance(turret, unit) <= stats.range
      )
      .sort((left, right) => targetPriority(right) - targetPriority(left) || distance(turret, left) - distance(turret, right))[0];
    if (!target) continue;
    applyUnitDamage(state, target, stats.attack, turret.tribeId);
    turret.attackCooldown = stats.cooldownTicks;
  }
}

function targetPriority(unit: Unit): number {
  if (unit.type === "archer" || unit.type === "militia") return 3;
  if (unit.type === "sovereign") return 2;
  return 1;
}

function findHostileBuildingInRange(state: GameState, unit: Unit): Building | undefined {
  return Object.values(state.buildings)
    .filter(
      (building) =>
        building.tribeId !== unit.tribeId &&
        building.hp > 0 &&
        areHostile(state, unit.tribeId, building.tribeId) &&
        distance(unit, building) <= unit.range
    )
    .sort((left, right) => buildingTargetPriority(right) - buildingTargetPriority(left) || distance(unit, left) - distance(unit, right))[0];
}

function buildingTargetPriority(building: Building): number {
  if (building.type === "turret") return 5;
  if (building.type === "gate") return 4;
  if (building.type === "wall") return 3;
  if (building.type === "watchtower") return 2;
  return 1;
}

function applyUnitDamage(state: GameState, target: Unit, amount: number, attackerTribeId: TribeId): void {
  target.hp -= armoredDamage(amount, target.armor);
  if (target.hp > 0) return;
  target.hp = 0;
  if (target.carriedPacketId) {
    const packet = state.packets[target.carriedPacketId];
    packet.state = "KILLED_WITH_PACKET";
    packet.carrierUnitId = undefined;
    packet.lastStateChangeTick = state.tick;
    addEvent(
      state,
      "MESSENGER_KILLED",
      "Messenger killed",
      `${target.name} disappeared with a sealed packet near ${Math.round(target.x)},${Math.round(target.y)}.`,
      [attackerTribeId]
    );
  }
}

function applyBuildingDamage(state: GameState, building: Building, amount: number, attackerTribeId?: TribeId): boolean {
  building.hp -= armoredDamage(amount, building.armor);
  if (building.hp > 0) return false;
  const destroyedType = building.type;
  const destroyedTribe = building.tribeId;
  const destroyedAt = { x: building.x, y: building.y };
  delete state.buildings[building.id];
  addEvent(
    state,
    "STRUCTURE_DESTROYED",
    `${state.tribes[destroyedTribe].name} loses ${labelBuildingType(destroyedType)}`,
    `${labelBuildingType(destroyedType)} at ${destroyedAt.x},${destroyedAt.y} was destroyed${attackerTribeId ? ` by ${state.tribes[attackerTribeId].name}` : ""}.`,
    "all"
  );
  updateVisibility(state);
  return true;
}

function armoredDamage(amount: number, armor: number): number {
  if (amount <= 0) return 0;
  return Math.max(1, Math.round(amount - armor));
}

function isProtectedMessenger(unit: Unit): boolean {
  return unit.type === "messenger" && unit.carriedPacketId !== undefined;
}

function updatePackets(state: GameState): void {
  for (const packet of Object.values(state.packets)) {
    if (
      !packet.overdueAnnounced &&
      (packet.state === "IN_TRANSIT_OUTBOUND" || packet.state === "AWAITING_REPLY" || packet.state === "IN_TRANSIT_RETURN") &&
      state.tick > packet.expectedReturnTick
    ) {
      packet.overdueAnnounced = true;
      addEvent(
        state,
        "MESSENGER_OVERDUE",
        "Messenger overdue",
        `A messenger to ${state.tribes[packet.recipientTribeId].name} has not returned on time.`,
        [packet.originTribeId]
      );
    }
  }
}

function updateYearlyWellbeing(state: GameState): void {
  const currentYear = getCurrentYear(state);
  for (let year = state.victoryPressure.lastProcessedYear + 1; year <= currentYear; year += 1) {
    for (const tribeId of tribeIds) {
      const tribe = state.tribes[tribeId];
      if (tribe.eliminated) continue;
      const wealth = computeWealth(state, tribeId);
      const previous = tribe.lastYearWealth || wealth;
      const wealthGain = wealth - previous;
      const expectedGain = Math.max(4, previous * 0.012);
      const population = countLivingPopulation(state, tribeId);
      const foodPerCapita = population > 0 ? tribe.resources.food / population : 0;
      const safety = getTribeSafetyScore(state, tribeId);
      let delta = 0;
      if (wealthGain >= expectedGain) delta += 2;
      else if (wealthGain > 0) delta += 1;
      else delta -= 4;
      if (wealthGain > 0 && wealthGain < expectedGain) delta -= 1;
      if (foodPerCapita < 10) delta -= 2;
      if (safety < 45) delta -= 2;
      if (safety >= 70) delta += 1;
      tribe.happiness = Math.round(clamp(tribe.happiness + delta, 0, 100));
      tribe.lastYearWealth = wealth;
    }
    state.victoryPressure.lastProcessedYear = year;
  }
}

function updateVictoryPressure(state: GameState): void {
  const config = state.victoryPressure;
  if (config.winnerTribeId) return;
  const currentYear = getCurrentYear(state);
  if (!config.warningIssued && currentYear >= config.nextReviewYear - 10) {
    config.warningIssued = true;
    addEvent(
      state,
      "SURVIVAL_REVIEW_WARNING",
      "Century review approaching",
      `Year ${currentYear}: a century review will wipe out the poorest surviving population in year ${config.nextReviewYear}. Its people will die and its sovereign will lose everything. Exact rival wealth remains private unless learned through diplomacy, scouting, or deception.`,
      "all"
    );
  }
  while (!config.winnerTribeId && currentYear >= config.nextReviewYear) {
    runCenturyReview(state, config.nextReviewYear);
    config.nextReviewYear += config.reviewIntervalYears;
    config.warningIssued = false;
  }
}

function runCenturyReview(state: GameState, reviewYear: number): void {
  const surviving = getVictoryPressure(state).scoreByTribe.filter((score) => !score.eliminated);
  if (surviving.length <= 1) {
    claimSurvivalWinner(state, surviving[0], reviewYear);
    return;
  }
  const eliminated = surviving
    .slice()
    .sort((left, right) => left.survivalScore - right.survivalScore || left.wealthPerCapita - right.wealthPerCapita || tribeIds.indexOf(left.tribeId) - tribeIds.indexOf(right.tribeId))[0];
  eliminateTribeAtReview(state, eliminated.tribeId, reviewYear, eliminated);
  const refreshed = getVictoryPressure(state);
  const remaining = refreshed.scoreByTribe.filter((score) => !score.eliminated);
  recordSurvivalReviewLearning(state, refreshed, eliminated, reviewYear, remaining.length === 1 ? remaining[0] : undefined);
  if (remaining.length === 1) claimSurvivalWinner(state, remaining[0], reviewYear);
}

function eliminateTribeAtReview(state: GameState, tribeId: TribeId, reviewYear: number, score: VictoryScoreEntry): void {
  const tribe = state.tribes[tribeId];
  tribe.eliminated = true;
  tribe.eliminatedYear = reviewYear;
  tribe.eliminatedTick = state.tick;
  for (const unit of Object.values(state.units)) {
    if (unit.tribeId === tribeId) {
      unit.hp = 0;
      unit.task = { kind: "idle" };
      if (unit.carriedPacketId) {
        const packet = state.packets[unit.carriedPacketId];
        packet.state = "KILLED_WITH_PACKET";
        packet.carrierUnitId = undefined;
        packet.lastStateChangeTick = state.tick;
      }
    }
  }
  for (const packet of Object.values(state.packets)) {
    if (packet.state === "COMPLETED" || packet.state === "KILLED_WITH_PACKET") continue;
    if (packet.originTribeId !== tribeId && packet.recipientTribeId !== tribeId) continue;
    const carrier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
    if (carrier) {
      carrier.carriedPacketId = undefined;
      if (carrier.tribeId !== tribeId && carrier.hp > 0) carrier.task = { kind: "idle" };
    }
    packet.state = "KILLED_WITH_PACKET";
    packet.carrierUnitId = undefined;
    packet.lastStateChangeTick = state.tick;
  }
  addEvent(
    state,
    "CENTURY_POPULATION_ELIMINATED",
    `${tribe.name} is eliminated at the century review`,
    `Year ${reviewYear}: the poorest surviving population died out with survival score ${score.survivalScore}, happiness ${score.happiness}, safety ${score.safety}, and wealth per person ${score.wealthPerCapita}.`,
    "all"
  );
}

function claimSurvivalWinner(state: GameState, winner: VictoryScoreEntry | undefined, reviewYear: number): void {
  if (!winner || state.victoryPressure.winnerTribeId) return;
  const config = state.victoryPressure;
  config.winnerTribeId = winner.tribeId;
  config.winnerSurvivalScore = winner.survivalScore;
  config.winnerGold = winner.gold;
  config.wonYear = reviewYear;
  config.wonTick = state.tick;
  config.learningApplied = true;
  addEvent(
    state,
    "VICTORY_CLAIMED",
    `${winner.tribeName} is the last surviving population`,
    `Year ${reviewYear}: ${winner.tribeName} survives the century eliminations with happiness ${winner.happiness}, safety ${winner.safety}, and survival score ${winner.survivalScore}.`,
    "all"
  );
}

function recordSurvivalReviewLearning(
  state: GameState,
  victory: VictoryPressureStatus,
  eliminated: VictoryScoreEntry,
  reviewYear: number,
  winner?: VictoryScoreEntry
): void {
  for (const score of victory.scoreByTribe) {
    const effectiveScore = score.tribeId === eliminated.tribeId ? eliminated : score;
    const outcome: PostGameLearning["outcome"] = winner?.tribeId === effectiveScore.tribeId ? "winner" : eliminated.tribeId === effectiveScore.tribeId ? "eliminated" : "survived";
    const lesson =
      outcome === "winner"
        ? `Post-game learning: survived to year ${reviewYear} as the last living population. Keep people richer each year, defend food and homes, and use diplomacy to mislead rivals about true wealth.`
        : outcome === "eliminated"
          ? `Post-game learning: wiped out in year ${reviewYear} as the poorest population with happiness ${effectiveScore.happiness}, safety ${effectiveScore.safety}, and wealth per person ${effectiveScore.wealthPerCapita}. The people died; this was total safety failure. Next iteration must raise yearly wealth, food security, and defenses before the next review.`
          : `Post-game learning: survived the year ${reviewYear} review while ${eliminated.tribeName} was wiped out and died. Keep the population slightly wealthier every year and do not reveal exact wealth unless deception or alliance strategy justifies it.`;
    const learning: PostGameLearning = {
      id: nextId(state, "learn"),
      tick: state.tick,
      year: reviewYear,
      tribeId: effectiveScore.tribeId,
      tribeName: effectiveScore.tribeName,
      outcome,
      rank: effectiveScore.rank,
      gold: effectiveScore.gold,
      wealth: effectiveScore.wealth,
      happiness: effectiveScore.happiness,
      safety: effectiveScore.safety,
      survivalScore: effectiveScore.survivalScore,
      eliminatedTribeId: eliminated.tribeId,
      eliminatedName: eliminated.tribeName,
      winnerTribeId: winner?.tribeId ?? victory.leaderTribeId,
      winnerName: winner?.tribeName ?? victory.leaderName,
      winnerGold: winner?.gold ?? victory.leaderGold,
      lesson
    };
    state.postGameLearnings.push(learning);
    appendSovereignMemory(state, score.tribeId, lesson);
  }
  addEvent(
    state,
    "AI_LEARNING_APPLIED",
    "Sovereigns learn from the century review",
    `Each AI wrote a private memory note after the year ${reviewYear} survival review.`,
    "all"
  );
}

function recordMessageIntelForOwner(
  state: GameState,
  message: Message,
  ownerTribeId: TribeId,
  direction: DiplomaticIntelDirection
): void {
  state.diplomaticIntel ??= {} as Record<TribeId, DiplomaticIntelItem[]>;
  const log = (state.diplomaticIntel[ownerTribeId] ??= []);
  if (log.some((item) => item.messageId === message.id && item.direction === direction)) return;
  const counterpartyTribeId = message.originTribeId === ownerTribeId ? message.recipientTribeId : message.originTribeId;
  log.push({
    id: nextId(state, "dip"),
    tick: state.tick,
    ownerTribeId,
    counterpartyTribeId,
    direction,
    kind: classifyDiplomaticIntel(message),
    messageId: message.id,
    subject: clampText(message.subject, 80),
    summary: clampText(message.body, 240),
    diplomacyIntent: message.diplomacyIntent,
    truthStatus: message.originTribeId === ownerTribeId ? "own_intent" : "unverified_foreign_claim"
  });
  if (log.length > 80) log.splice(0, log.length - 80);
}

function classifyDiplomaticIntel(message: Message): DiplomaticIntelKind {
  const text = `${message.subject} ${message.body}`.toLowerCase();
  if (message.diplomacyIntent === "ALLIANCE_DECLINE" || /\b(refuse|decline|reject|no alliance|will not ally)\b/.test(text)) return "refusal";
  if (message.type === "DEMAND" || /\b(demand|tribute|pay|hand over|surrender|must give)\b/.test(text)) return "demand";
  if (message.type === "THREAT" || message.diplomacyIntent === "WARNING" || /\b(threat|warn|attack|war|retaliate|punish|destroy|raid)\b/.test(text)) return "threat";
  if (text.includes("?") || /\b(ask|question|tell me|report whether|share|disclose|what|where|when|how much|whether)\b/.test(text)) return "question";
  if (message.diplomacyIntent === "ALLIANCE_ACCEPT" || /\b(accept|promise|pledge|swear|guarantee|commit|agree)\b/.test(text)) return "promise";
  if (message.type === "TREATY_PROPOSAL" || message.diplomacyIntent === "PEACE_OFFER" || message.diplomacyIntent === "ALLIANCE_OFFER" || /\b(offer|proposal|propose|terms|peace|alliance|treaty|trade)\b/.test(text)) return "offer";
  return "claim";
}

function sendMessage(
  state: GameState,
  originTribeId: TribeId,
  recipientTribeId: TribeId,
  type: MessageType,
  subject: string,
  body: string,
  requiresReply: boolean,
  diplomacyIntent: DiplomacyIntent = inferDiplomacyIntent(type, body)
): { ok: true; packetId: string } | { ok: false; reason: string } {
  if (state.tribes[originTribeId].eliminated) return { ok: false, reason: `${state.tribes[originTribeId].name} has been eliminated.` };
  if (state.tribes[recipientTribeId].eliminated) return { ok: false, reason: `${state.tribes[recipientTribeId].name} has been eliminated.` };
  const messenger = Object.values(state.units).find(
    (unit) => unit.tribeId === originTribeId && unit.type === "messenger" && unit.hp > 0 && unit.task.kind === "idle"
  );
  if (!messenger) return { ok: false, reason: "No idle messenger is available." };
  const destination = findTownHall(state, recipientTribeId);
  if (!destination) return { ok: false, reason: `${state.tribes[recipientTribeId].name} has no town hall for delivery.` };
  const origin = findTownHall(state, originTribeId);
  if (!origin) return { ok: false, reason: `${state.tribes[originTribeId].name} has no town hall for dispatch.` };
  const destinationPosition = { x: destination.x, y: destination.y };
  const path = findPath(state, messenger, destinationPosition);
  if (!pathArrives(path, destinationPosition)) return { ok: false, reason: `No passable messenger route to ${state.tribes[recipientTribeId].name}.` };
  const messageId = nextId(state, "msg");
  const packetId = nextId(state, "pkt");
  const message: Message = {
    id: messageId,
    type,
    originTribeId,
    recipientTribeId,
    subject,
    body,
    diplomacyIntent,
    requiresReply,
    createdTick: state.tick
  };
  const estimatedTicks = Math.max(150, Math.round(path.length / messenger.speed * TICK_RATE * 2.6));
  const packet: Packet = {
    id: packetId,
    messageIds: [messageId],
    carrierUnitId: messenger.id,
    originTribeId,
    recipientTribeId,
    state: "IN_TRANSIT_OUTBOUND",
    destination: { x: destination.x, y: destination.y },
    returnTo: { x: origin.x, y: origin.y },
    createdTick: state.tick,
    expectedReturnTick: state.tick + estimatedTicks,
    lastStateChangeTick: state.tick,
    overdueAnnounced: false,
    routeMemory: []
  };
  state.messages[messageId] = message;
  state.packets[packetId] = packet;
  recordMessageIntelForOwner(state, message, originTribeId, "sent");
  messenger.carriedPacketId = packetId;
  messenger.task = {
    kind: "deliver",
    packetId,
    phase: "outbound",
    destination: { x: destination.x, y: destination.y },
    returnTo: { x: origin.x, y: origin.y },
    path
  };
  addEvent(
    state,
    "MESSENGER_DISPATCHED",
    `${state.tribes[originTribeId].name} dispatches ${messenger.name}`,
    `${subject} is sealed for ${state.tribes[recipientTribeId].name}.`,
    [originTribeId]
  );
  return { ok: true, packetId };
}

function recipientDecision(state: GameState, packet: Packet): { delayTicks: number; eventText: string } {
  const delay = packet.recipientTribeId === "purple" ? 90 : packet.recipientTribeId === "yellow" ? 35 : 55;
  if (packet.recipientTribeId === "yellow" && random(state) < 0.2) {
    packet.routeMemory.push("The gate guards searched the packet and kept the messenger waiting.");
    return { delayTicks: delay + 90, eventText: "The messenger is searched and delayed at the gate." };
  }
  return { delayTicks: delay, eventText: "The messenger is admitted at the town hall and waits for an answer." };
}

function beginReturnTrip(
  state: GameState,
  unit: Unit,
  task: Extract<UnitTask, { kind: "deliver" }>,
  packet: Packet
): void {
  packet.state = "IN_TRANSIT_RETURN";
  packet.lastStateChangeTick = state.tick;
  task.phase = "returning";
  const path = findPath(state, unit, task.returnTo);
  if (!pathArrives(path, task.returnTo)) {
    markMessengerRouteBlocked(state, unit, packet, "return route blocked");
    return;
  }
  task.path = path;
}

function markMessengerRouteBlocked(state: GameState, unit: Unit, packet: Packet, reason: string): void {
  packet.state = "OVERDUE";
  packet.carrierUnitId = undefined;
  packet.lastStateChangeTick = state.tick;
  packet.overdueAnnounced = true;
  packet.routeMemory.push(`Route failed: ${reason} near ${Math.round(unit.x)},${Math.round(unit.y)}.`);
  unit.carriedPacketId = undefined;
  unit.task = { kind: "idle" };
  addEvent(
    state,
    "MESSENGER_ROUTE_BLOCKED",
    "Messenger route blocked",
    `${unit.name} could not complete a packet route: ${reason}.`,
    [packet.originTribeId, packet.recipientTribeId]
  );
}

function createDeterministicReplyInput(
  state: GameState,
  packet: Packet
): { subject: string; body: string; diplomacyIntent: DiplomacyIntent } {
  const original = state.messages[packet.messageIds[0]];
  const tone: Record<TribeId, { body: string; intent: DiplomacyIntent }> = {
    blue: { body: "We will consider this in council and keep our messengers on the road.", intent: "NONE" },
    red: { body: "Peace is possible only if your soldiers stay away from our road.", intent: "PEACE_OFFER" },
    green: { body: "We accept temporary peace and prefer safe messengers before any stronger pact.", intent: "PEACE_OFFER" },
    yellow: { body: "Your words are noted. Your roads remain tempting, so no binding pact is accepted.", intent: "ALLIANCE_DECLINE" },
    purple: { body: "We accept discussion under formal terms and witnessed seals.", intent: "PEACE_OFFER" }
  };
  const stance = tone[packet.recipientTribeId];
  const acceptsAlliance =
    original.diplomacyIntent === "ALLIANCE_OFFER" &&
    !state.alliances[packet.originTribeId] &&
    !state.alliances[packet.recipientTribeId] &&
    (packet.recipientTribeId === "green" || packet.recipientTribeId === "purple");
  return {
    subject: `Re: ${original.subject}`,
    body: acceptsAlliance
      ? `${state.tribes[packet.recipientTribeId].name} accepts an exclusive alliance with ${state.tribes[packet.originTribeId].name}; our messengers will carry the seal.`
      : stance.body,
    diplomacyIntent: acceptsAlliance ? "ALLIANCE_ACCEPT" : stance.intent
  };
}

function resolveAllianceFromDiscussion(state: GameState, original: Message, reply: Message): boolean {
  if (original.diplomacyIntent !== "ALLIANCE_OFFER" || reply.diplomacyIntent !== "ALLIANCE_ACCEPT") return false;
  const result = formAlliance(state, original.originTribeId, original.recipientTribeId);
  return result.ok;
}

function inferDiplomacyIntent(type: MessageType, body: string | undefined): DiplomacyIntent {
  const normalized = (body ?? "").toLowerCase();
  if (normalized.includes("alliance") || normalized.includes("ally")) return type === "REPLY" ? "ALLIANCE_ACCEPT" : "ALLIANCE_OFFER";
  if (type === "THREAT" || normalized.includes("warn") || normalized.includes("demand")) return "WARNING";
  if (type === "TREATY_PROPOSAL" || normalized.includes("peace") || normalized.includes("safe passage")) return "PEACE_OFFER";
  return "NONE";
}

function recordRouteMemory(state: GameState, unit: Unit, packet: Packet): void {
  if (state.tick % 80 !== 0 || packet.routeMemory.length > 5) return;
  const nearby = Object.values(state.units).filter(
    (other) => other.tribeId !== unit.tribeId && other.hp > 0 && (other.type === "militia" || other.type === "archer") && distance(unit, other) < 6
  );
  if (nearby.length > 0) {
    packet.routeMemory.push(`Route report: armed ${state.tribes[nearby[0].tribeId].name} units seen near ${Math.round(unit.x)},${Math.round(unit.y)}.`);
  }
}

function updateVisibility(state: GameState): void {
  for (const tribeId of tribeIds) {
    const layer = state.visibility[tribeId];
    for (let i = 0; i < layer.length; i += 1) if (layer[i] === 2) layer[i] = 1;
    const viewers = [
      ...Object.values(state.units).filter((u) => u.tribeId === tribeId && u.hp > 0),
      ...Object.values(state.buildings).filter((b) => b.tribeId === tribeId).map((b) => ({ x: b.x, y: b.y, visionRadius: buildingStats[b.type].visionRadius }))
    ];
    for (const viewer of viewers) {
      const radius = viewer.visionRadius;
      for (let y = Math.max(0, Math.floor(viewer.y - radius)); y <= Math.min(MAP_SIZE - 1, Math.ceil(viewer.y + radius)); y += 1) {
        for (let x = Math.max(0, Math.floor(viewer.x - radius)); x <= Math.min(MAP_SIZE - 1, Math.ceil(viewer.x + radius)); x += 1) {
          if (distance(viewer, { x, y }) <= radius) layer[tileIndex(x, y)] = 2;
        }
      }
    }
    recordForeignVisibilityObservations(state, tribeId, layer);
  }
}

function recordForeignVisibilityObservations(state: GameState, observerTribeId: TribeId, layer: Uint8Array): void {
  const memory = ensureForeignObservationMemory(state, observerTribeId);
  const current = collectVisibleForeignSubjects(state, observerTribeId, layer);
  if (!memory.initialized) {
    memory.visibleSubjects = current;
    memory.initialized = true;
    return;
  }

  for (const [subjectKey, subject] of Object.entries(current)) {
    if (!memory.visibleSubjects[subjectKey]) {
      appendForeignObservation(state, observerTribeId, subject, subject.subjectKind === "unit" ? "unit_seen" : "building_seen");
    }
  }
  for (const [subjectKey, subject] of Object.entries(memory.visibleSubjects)) {
    if (!current[subjectKey]) {
      appendForeignObservation(state, observerTribeId, subject, subject.subjectKind === "unit" ? "unit_lost" : "building_lost");
    }
  }
  memory.visibleSubjects = current;
}

function ensureForeignObservationMemory(state: GameState, observerTribeId: TribeId): ForeignObservationMemory {
  state.foreignObservations ??= {} as Record<TribeId, ForeignObservation[]>;
  state.foreignObservationMemory ??= {} as Record<TribeId, ForeignObservationMemory>;
  state.foreignObservations[observerTribeId] ??= [];
  state.foreignObservationMemory[observerTribeId] ??= { initialized: false, visibleSubjects: {} };
  return state.foreignObservationMemory[observerTribeId];
}

function collectVisibleForeignSubjects(state: GameState, observerTribeId: TribeId, layer: Uint8Array): Record<string, ForeignObservationSubject> {
  const subjects: Record<string, ForeignObservationSubject> = {};
  for (const unit of Object.values(state.units)) {
    if (unit.hp <= 0 || unit.tribeId === observerTribeId) continue;
    const x = clamp(Math.round(unit.x), 0, MAP_SIZE - 1);
    const y = clamp(Math.round(unit.y), 0, MAP_SIZE - 1);
    if (layer[tileIndex(x, y)] !== 2) continue;
    subjects[`unit:${unit.id}`] = {
      subjectKind: "unit",
      subjectTribeId: unit.tribeId,
      subjectId: unit.id,
      subjectType: unit.type,
      x,
      y,
      hp: Math.ceil(unit.hp)
    };
  }
  for (const building of Object.values(state.buildings)) {
    if (building.hp <= 0 || building.tribeId === observerTribeId) continue;
    if (layer[tileIndex(building.x, building.y)] !== 2) continue;
    subjects[`building:${building.id}`] = {
      subjectKind: "building",
      subjectTribeId: building.tribeId,
      subjectId: building.id,
      subjectType: building.type,
      x: building.x,
      y: building.y,
      hp: Math.ceil(building.hp)
    };
  }
  return subjects;
}

function appendForeignObservation(
  state: GameState,
  observerTribeId: TribeId,
  subject: ForeignObservationSubject,
  kind: ForeignObservationKind
): void {
  const log = state.foreignObservations[observerTribeId] ?? [];
  log.push({
    ...subject,
    id: nextId(state, "obs"),
    tick: state.tick,
    observerTribeId,
    kind
  });
  if (log.length > 120) log.splice(0, log.length - 120);
  state.foreignObservations[observerTribeId] = log;
}

function findNearestResource(state: GameState, unit: Unit, resource: ResourceType): Position | undefined {
  let best: Position | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = 1; y < MAP_SIZE - 1; y += 1) {
    for (let x = 1; x < MAP_SIZE - 1; x += 1) {
      const tile = state.map[tileIndex(x, y)];
      const matches = resource === "wood" ? tile.terrain === "forest" : tile.resource?.type === resource && tile.resource.amount > 0;
      if (!matches) continue;
      const d = Math.abs(unit.x - x) + Math.abs(unit.y - y);
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y };
      }
    }
  }
  return best;
}

function findPath(state: GameState, unit: Pick<Unit, "x" | "y">, target: Position): Position[] {
  const start = { x: clamp(Math.round(unit.x), 0, MAP_SIZE - 1), y: clamp(Math.round(unit.y), 0, MAP_SIZE - 1) };
  let goal = { x: clamp(Math.round(target.x), 0, MAP_SIZE - 1), y: clamp(Math.round(target.y), 0, MAP_SIZE - 1) };
  if (!isWalkable(state, goal.x, goal.y)) {
    const alternate = findNearestWalkable(state, goal);
    if (!alternate) return [];
    goal = alternate;
  }
  if (start.x === goal.x && start.y === goal.y) return [goal];

  const open: Position[] = [start];
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[tileIndex(start.x, start.y), 0]]);
  const fScore = new Map<number, number>([[tileIndex(start.x, start.y), manhattan(start, goal)]]);
  let closest = start;
  let closestDistance = manhattan(start, goal);

  while (open.length > 0) {
    open.sort((a, b) => (fScore.get(tileIndex(a.x, a.y)) ?? Infinity) - (fScore.get(tileIndex(b.x, b.y)) ?? Infinity));
    const current = open.shift()!;
    const currentDistance = manhattan(current, goal);
    if (currentDistance < closestDistance) {
      closest = current;
      closestDistance = currentDistance;
    }
    if (current.x === goal.x && current.y === goal.y) return reconstruct(cameFrom, tileIndex(current.x, current.y)).map(indexToPosition);
    for (const next of neighbors(current)) {
      if (!isWalkable(state, next.x, next.y)) continue;
      const currentIndex = tileIndex(current.x, current.y);
      const nextIndex = tileIndex(next.x, next.y);
      const tentative = (gScore.get(currentIndex) ?? Infinity) + terrainCost(state.map[nextIndex].terrain);
      if (tentative >= (gScore.get(nextIndex) ?? Infinity)) continue;
      cameFrom.set(nextIndex, currentIndex);
      gScore.set(nextIndex, tentative);
      fScore.set(nextIndex, tentative + manhattan(next, goal));
      if (!open.some((p) => p.x === next.x && p.y === next.y)) open.push(next);
    }
  }

  return reconstruct(cameFrom, tileIndex(closest.x, closest.y)).map(indexToPosition);
}

function pathArrives(path: Position[], target: Position): boolean {
  const last = path[path.length - 1];
  return Boolean(last) && last.x === Math.round(target.x) && last.y === Math.round(target.y);
}

function moveAlongPath(state: GameState, unit: Unit, path: Position[]): void {
  if (path.length === 0) return;
  const target = path[0];
  if (!isWalkable(state, target.x, target.y)) {
    path.length = 0;
    return;
  }
  const tile = state.map[tileIndex(clamp(Math.round(unit.x), 0, MAP_SIZE - 1), clamp(Math.round(unit.y), 0, MAP_SIZE - 1))];
  const speedBoost = tile.terrain === "road" ? 1.35 : tile.terrain === "hill" || tile.terrain === "forest" ? 0.75 : 1;
  const step = (unit.speed * speedBoost) / TICK_RATE;
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const d = Math.hypot(dx, dy);
  if (d <= step || d < 0.05) {
    unit.x = target.x;
    unit.y = target.y;
    path.shift();
    return;
  }
  unit.x += (dx / d) * step;
  unit.y += (dy / d) * step;
}

function generateMap(seed: number): Tile[] {
  let rng = seed >>> 0;
  const next = () => {
    rng += 0x6d2b79f5;
    let t = rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const map: Tile[] = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      let terrain: TerrainType = "grass";
      const r = next();
      if (x < 3 || y < 3 || x > MAP_SIZE - 4 || y > MAP_SIZE - 4) terrain = "mountain";
      else if (r < 0.12) terrain = "forest";
      else if (r < 0.17) terrain = "hill";
      else if (r < 0.19) terrain = "water";
      map.push(terrain === "forest" ? { terrain, resource: { type: "wood", amount: 90 + Math.floor(next() * 90) } } : { terrain });
    }
  }
  const center = { x: 64, y: 64 };
  for (const start of Object.values(starts)) drawRoad(map, start, center);
  for (const [tribeId, start] of Object.entries(starts) as [TribeId, Position][]) {
    clearArea(map, start, 8);
    addResourcePatch(map, jitter({ x: start.x + 7, y: start.y - 5 }, 3, next), "gold", 360 + Math.floor(next() * 120));
    addResourcePatch(map, jitter({ x: start.x - 7, y: start.y + 7 }, 3, next), "stone", 340 + Math.floor(next() * 100));
    addResourcePatch(map, jitter({ x: start.x + 1, y: start.y + 8 }, 3, next), "food", 400 + Math.floor(next() * 140));
    addResourcePatch(map, jitter({ x: start.x - 8, y: start.y - 7 }, 4, next), "clay", 220 + Math.floor(next() * 100), 1);
    addResourcePatch(map, jitter({ x: start.x + 8, y: start.y + 6 }, 4, next), "limestone", 160 + Math.floor(next() * 80), 1);
    addForestRing(map, jitter(tribeId === "purple" ? { x: start.x - 12, y: start.y - 10 } : { x: start.x - 10, y: start.y - 4 }, 3, next));
  }
  const contestedDeposits: { center: Position; type: ResourceType; amount: number; spread: number; radius?: number }[] = [
    { center: { x: 61, y: 61 }, type: "coal", amount: 180, spread: 8 },
    { center: { x: 67, y: 67 }, type: "coal", amount: 180, spread: 8 },
    { center: { x: 52, y: 64 }, type: "coal", amount: 150, spread: 9 },
    { center: { x: 76, y: 64 }, type: "coal", amount: 150, spread: 9 },
    { center, type: "iron", amount: 300, spread: 7, radius: 1 },
    { center: { x: 64, y: 39 }, type: "iron", amount: 230, spread: 6 },
    { center: { x: 64, y: 90 }, type: "iron", amount: 230, spread: 6 },
    { center: { x: 39, y: 64 }, type: "iron", amount: 230, spread: 6 },
    { center: { x: 90, y: 64 }, type: "iron", amount: 230, spread: 6 },
    { center: { x: 43, y: 54 }, type: "limestone", amount: 300, spread: 10, radius: 1 },
    { center: { x: 85, y: 54 }, type: "limestone", amount: 300, spread: 10, radius: 1 },
    { center: { x: 43, y: 74 }, type: "limestone", amount: 300, spread: 10, radius: 1 },
    { center: { x: 85, y: 74 }, type: "limestone", amount: 300, spread: 10, radius: 1 },
    { center: { x: 52, y: 52 }, type: "clay", amount: 360, spread: 9, radius: 1 },
    { center: { x: 76, y: 52 }, type: "clay", amount: 360, spread: 9, radius: 1 },
    { center: { x: 52, y: 76 }, type: "clay", amount: 360, spread: 9, radius: 1 },
    { center: { x: 76, y: 76 }, type: "clay", amount: 360, spread: 9, radius: 1 },
    { center: { x: 64, y: 64 }, type: "gold", amount: 420, spread: 14, radius: 1 },
    { center: { x: 47, y: 47 }, type: "stone", amount: 420, spread: 8 },
    { center: { x: 81, y: 81 }, type: "stone", amount: 420, spread: 8 }
  ];
  for (const deposit of contestedDeposits) {
    addResourcePatch(map, jitter(deposit.center, deposit.spread, next), deposit.type, deposit.amount + Math.floor(next() * 80), deposit.radius ?? 0);
  }
  for (let i = 0; i < 28; i += 1) {
    const angle = next() * Math.PI * 2;
    const radius = 18 + next() * 42;
    const roll = next();
    const type: ResourceType =
      roll < 0.12
        ? "coal"
        : roll < 0.27
          ? "iron"
          : roll < 0.44
            ? "limestone"
            : roll < 0.6
              ? "clay"
              : roll < 0.76
                ? "stone"
                : roll < 0.9
                  ? "gold"
                  : "food";
    const amount =
      type === "coal"
        ? 80 + Math.floor(next() * 60)
        : type === "iron"
          ? 120 + Math.floor(next() * 70)
          : 180 + Math.floor(next() * 180);
    addResourcePatch(
      map,
      jitter({ x: Math.round(center.x + Math.cos(angle) * radius), y: Math.round(center.y + Math.sin(angle) * radius) }, 5, next),
      type,
      amount,
      type === "iron" || type === "coal" ? 0 : 1
    );
  }
  return map;
}

function drawRoad(map: Tile[], from: Position, to: Position): void {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.round(from.x + (to.x - from.x) * t);
    const y = Math.round(from.y + (to.y - from.y) * t);
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const px = clamp(x + ox, 1, MAP_SIZE - 2);
        const py = clamp(y + oy, 1, MAP_SIZE - 2);
        map[tileIndex(px, py)] = { terrain: "road" };
      }
    }
  }
}

function clearArea(map: Tile[], center: Position, radius: number): void {
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
      if (distance(center, { x, y }) <= radius) map[tileIndex(x, y)] = { terrain: "grass" };
    }
  }
}

function addResourcePatch(map: Tile[], center: Position, type: ResourceType, amount: number, radius = 1): void {
  const safeCenter = { x: clamp(center.x, 2, MAP_SIZE - 3), y: clamp(center.y, 2, MAP_SIZE - 3) };
  for (let y = safeCenter.y - radius; y <= safeCenter.y + radius; y += 1) {
    for (let x = safeCenter.x - radius; x <= safeCenter.x + radius; x += 1) {
      if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
      if (distance(safeCenter, { x, y }) > radius + 0.3) continue;
      map[tileIndex(x, y)] = { terrain: resourceTerrain(type), resource: { type, amount } };
    }
  }
}

function addForestRing(map: Tile[], center: Position): void {
  for (let y = center.y - 5; y <= center.y + 5; y += 1) {
    for (let x = center.x - 5; x <= center.x + 5; x += 1) {
      if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
      if (distance(center, { x, y }) <= 5) map[tileIndex(x, y)] = { terrain: "forest", resource: { type: "wood", amount: 160 } };
    }
  }
}

function jitter(center: Position, spread: number, next: () => number): Position {
  return {
    x: clamp(Math.round(center.x + (next() * 2 - 1) * spread), 2, MAP_SIZE - 3),
    y: clamp(Math.round(center.y + (next() * 2 - 1) * spread), 2, MAP_SIZE - 3)
  };
}

function resourceTerrain(type: ResourceType): TerrainType {
  if (type === "wood") return "forest";
  if (type === "food" || type === "clay") return "grass";
  return "hill";
}

function addEvent(state: GameState, type: string, title: string, body: string, visibleTo: TribeId[] | "all"): void {
  state.events.push({ id: nextId(state, "evt"), tick: state.tick, type, title, body, visibleTo });
  if (state.events.length > 250) state.events.shift();
}

function nextId(state: GameState, prefix: string): string {
  state.counters[prefix] = (state.counters[prefix] ?? 0) + 1;
  return `${prefix}_${state.counters[prefix].toString().padStart(4, "0")}`;
}

function random(state: GameState): number {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function areHostile(state: GameState, a: TribeId, b: TribeId): boolean {
  if (a === b) return false;
  if (state.wars[a]?.[b] || state.wars[b]?.[a]) return true;
  if (state.alliances[a] === b || state.alliances[b] === a) return false;
  return a === "yellow" || b === "yellow" || (a === "red" && b === "blue") || (a === "blue" && b === "red");
}

function isWalkable(state: GameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
  const terrain = state.map[tileIndex(x, y)].terrain;
  return terrain !== "water" && terrain !== "mountain" && !isBlockingBuildingAt(state, x, y);
}

export function isTileWalkable(state: GameState, x: number, y: number): boolean {
  return isWalkable(state, x, y);
}

function isBlockingBuildingAt(state: GameState, x: number, y: number): boolean {
  return Object.values(state.buildings).some((building) => building.x === x && building.y === y && isBuildingMovementBlocking(building));
}

export function isBuildingMovementBlocking(building: Building): boolean {
  if (building.hp <= 0) return false;
  if (building.type === "gate") return building.gateState !== "open";
  return buildingStats[building.type].blocksMovement;
}

function findNearestWalkable(state: GameState, target: Position): Position | undefined {
  let best: Position | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let radius = 1; radius <= 8; radius += 1) {
    for (let y = target.y - radius; y <= target.y + radius; y += 1) {
      for (let x = target.x - radius; x <= target.x + radius; x += 1) {
        if (Math.abs(target.x - x) !== radius && Math.abs(target.y - y) !== radius) continue;
        if (!isWalkable(state, x, y)) continue;
        const distanceToTarget = manhattan(target, { x, y });
        if (distanceToTarget >= bestDistance) continue;
        best = { x, y };
        bestDistance = distanceToTarget;
      }
    }
    if (best) return best;
  }
  return undefined;
}

function terrainCost(terrain: TerrainType): number {
  if (terrain === "road") return 0.6;
  if (terrain === "forest" || terrain === "hill") return 1.5;
  return 1;
}

function neighbors(pos: Position): Position[] {
  return [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 }
  ];
}

function reconstruct(cameFrom: Map<number, number>, current: number): number[] {
  const total = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    total.unshift(current);
  }
  total.shift();
  return total;
}

function indexToPosition(index: number): Position {
  return { x: index % MAP_SIZE, y: Math.floor(index / MAP_SIZE) };
}

export function tileIndex(x: number, y: number): number {
  return y * MAP_SIZE + x;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function distance(a: Position | Pick<Unit, "x" | "y">, b: Position | Pick<Unit, "x" | "y">): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatBugReportEventBody(title: string, body: string, order: AiStrategicOrder): string {
  const details = [
    order.suspectedArea ? `Area: ${clampText(order.suspectedArea, 80)}` : "",
    order.expectedBehavior ? `Expected: ${clampText(order.expectedBehavior, 120)}` : "",
    order.actualBehavior ? `Actual: ${clampText(order.actualBehavior, 120)}` : "",
    order.reproductionSteps ? `Repro: ${clampText(order.reproductionSteps, 160)}` : "",
    order.strategyImpact ? `Impact: ${clampText(order.strategyImpact, 140)}` : ""
  ].filter(Boolean);
  return clampText([`${title}: ${body}`, ...details].join(" | "), 700);
}

function clampText(value: string, maxLength: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength - 1).trimEnd();
}

function cleanName(value: string | undefined, maxLength: number, fallback: string): string {
  const ascii = (value ?? fallback)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z0-9 '.,-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = ascii || fallback;
  return cleaned.length <= maxLength ? cleaned : cleaned.slice(0, maxLength - 1).trimEnd();
}

function identityNameKey(value: string): string {
  return cleanName(value, 80, "").toLowerCase();
}
