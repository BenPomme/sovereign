export const MAP_SIZE = 224;
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
  | "archer"
  | "siege_engine"
  | "battering_ram"
  | "catapult";
export type GateState = "open" | "closed" | "locked";
export type GateAccessPolicy = "all" | "owner_allies" | "owner_only";
export type BuildingType = "townHall" | "farm" | "house" | "barracks" | "market" | "watchtower" | "wall" | "gate" | "turret";
export type BuildableBuildingType = "farm" | "house" | "watchtower" | "wall" | "gate" | "turret";
export type DevelopmentId = string;
export type DevelopmentCategory =
  | "foundational"
  | "governance"
  | "economy"
  | "labor"
  | "social"
  | "information"
  | "law"
  | "security"
  | "military"
  | "diplomacy"
  | "infrastructure"
  | "long_horizon";
export type DevelopmentEffectKind =
  | "instant_happiness"
  | "yearly_happiness"
  | "yearly_gold_per_population"
  | "safety"
  | "construction_cost_multiplier"
  | "repair_cost_multiplier"
  | "repair_speed"
  | "unit_speed"
  | "unit_armor"
  | "unit_attack"
  | "unit_vision"
  | "building_max_hp"
  | "building_armor"
  | "building_attack"
  | "building_range"
  | "population_cap"
  | "resource_control"
  | "wealth";
export type DevelopmentEffect = {
  kind: DevelopmentEffectKind;
  amount: number;
  target?: string;
  description: string;
};
export type MessageType = "LETTER" | "REPLY" | "TREATY_PROPOSAL" | "THREAT" | "DEMAND" | "MERGER_PROPOSAL";
export type DiplomacyIntent =
  | "NONE"
  | "PEACE_OFFER"
  | "WARNING"
  | "ALLIANCE_OFFER"
  | "ALLIANCE_ACCEPT"
  | "ALLIANCE_DECLINE"
  | "MERGER_OFFER"
  | "MERGER_ACCEPT"
  | "MERGER_DECLINE";
export type PacketState =
  | "IN_TRANSIT_OUTBOUND"
  | "AWAITING_REPLY"
  | "IN_TRANSIT_RETURN"
  | "COMPLETED"
  | "OVERDUE"
  | "KILLED_WITH_PACKET"
  | "REFUSED_AT_GATE"
  | "DETAINED";
export type ItemType = "packet";
export type GatePassageAction = "allow" | "delay" | "refuse" | "detain" | "ambush";
export type GateDetainedPacketAction = "hold" | "release" | "ransom";
export type GateAccessTreatyAction = "grant" | "revoke";
export type GateSabotageAction = "force_open" | "jam_closed" | "damage" | "clear";
export type GateTollMode = "none" | "optional" | "required";
export type PerimeterPattern = "single" | "line" | "gate_line";
export type PerimeterDirection = "east_west" | "north_south" | "northeast_southwest" | "northwest_southeast";
export type SiegeAssaultMode = "direct" | "coordinated" | "feint" | "probe";

export type Position = {
  x: number;
  y: number;
};

export type CombatStats = {
  hp: number;
  maxHp: number;
  armor: number;
  attack: number;
  range: number;
  attackCooldown: number;
};

export type ResourceDeposit = CombatStats & {
  type: ResourceType;
  amount: number;
};

export type ResourceDepositControl = "controlled" | "contested" | "foreign_controlled" | "uncontrolled";

export type ResourceDepositPosture = {
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  hp: number;
  maxHp: number;
  armor: number;
  attack: number;
  range: number;
  distanceToTownHall: number;
  control: ResourceDepositControl;
  controlledBy?: TribeId;
  nearestTribe?: TribeId;
  nearestTribeDistance?: number;
  defended: boolean;
  defenseScore: number;
  hostileDefended: boolean;
  hostileDefenseScore: number;
  raided: boolean;
  underAttack: boolean;
  raiders: TribeId[];
  visible: boolean;
};

export type ResourceDenialRecord = {
  id: string;
  tick: number;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  maxHp: number;
  attackerTribeId?: TribeId;
  controlledBy?: TribeId;
  visibleTo: TribeId[] | "all";
};

export type ResourceDepletionRecord = {
  id: string;
  tick: number;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  maxHp: number;
  depletedByTribeId?: TribeId;
  controlledBy?: TribeId;
  visibleTo: TribeId[] | "all";
};

export type CivilizationMergerRecord = {
  id: string;
  tick: number;
  year: number;
  leaderTribeId: TribeId;
  mergedTribeId: TribeId;
  proposerTribeId: TribeId;
  accepterTribeId: TribeId;
  proposalMessageId: string;
  acceptanceMessageId: string;
  terms: string;
  transferredUnits: number;
  transferredBuildings: number;
  transferredResources: Resources;
  retiredSovereignUnitId?: string;
  visibleTo: TribeId[] | "all";
};

export type ResourceControlSummary = {
  tribeId: TribeId;
  controlledDeposits: number;
  defendedDeposits: number;
  vulnerableDeposits: number;
  contestedDeposits: number;
  raidedDeposits: number;
  visibleDeposits: number;
  recentDeniedDeposits: number;
  recentDeniedLosses: number;
  controlledValue: number;
  defendedValue: number;
  vulnerableValue: number;
  contestedValue: number;
  raidedValue: number;
  deniedValue: number;
  deniedLossValue: number;
  survivalBonus: number;
};

export type Tile = {
  terrain: TerrainType;
  resource?: ResourceDeposit;
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
  category?: DevelopmentCategory;
  phase?: string;
  aliases: string[];
  tradeoffs: string[];
  synergies: string[];
  socialCosts: string[];
  effects: DevelopmentEffect[];
};
type DevelopmentDefinition = Omit<Development, "aliases" | "tradeoffs" | "synergies" | "socialCosts"> &
  Partial<Pick<Development, "aliases" | "tradeoffs" | "synergies" | "socialCosts">>;
export type ControllerType = "human" | "scripted" | "llm";
export type AiOrderType =
  | "SEND_MESSENGER"
  | "RECRUIT"
  | "BUILD"
  | "DEVELOP"
  | "SCOUT"
  | "DEFEND"
  | "ATTACK"
  | "REPAIR"
  | "SET_GATE"
  | "GATE_OPERATION"
  | "PROPOSE_ALLIANCE"
  | "SET_POLICY"
  | "REPORT_BUG"
  | "REQUEST_INFO";

export type AiStrategicOrder = {
  type: AiOrderType;
  priority: number;
  recipientTribeId?: TribeId;
  unitType?: "peon" | "militia" | "archer" | "siege_engine" | "battering_ram" | "catapult" | "messenger" | "sentinel";
  buildingType?: BuildableBuildingType;
  buildingId?: string;
  targetBuildingId?: string;
  targetResourceType?: ResourceType;
  gateState?: GateState;
  gateAccessPolicy?: GateAccessPolicy;
  fortificationIntent?: string;
  perimeterStrategy?: string;
  perimeterShape?: string;
  perimeterPattern?: PerimeterPattern;
  perimeterDirection?: PerimeterDirection;
  perimeterLength?: number;
  perimeterGateIndex?: number;
  gateOperationIntent?: string;
  gateTerms?: string;
  gatePublicNotice?: string;
  gateEntryAction?: GatePassageAction;
  gateTollMode?: GateTollMode;
  gateUnpaidAction?: GatePassageAction;
  gateTollGold?: number;
  gateDetainedPacketAction?: GateDetainedPacketAction;
  gateDetainedPacketId?: string;
  gateRansomGold?: number;
  gateReleaseSubject?: string;
  gateReleaseMessage?: string;
  gateAccessTreatyAction?: GateAccessTreatyAction;
  gateAccessTreatyName?: string;
  gateAccessTreatyTerms?: string;
  gateAccessTreatyDurationTicks?: number;
  gateSabotageAction?: GateSabotageAction;
  gateSabotageDurationTicks?: number;
  gateSabotageDamage?: number;
  gateOperationDurationTicks?: number;
  siegeIntent?: string;
  assaultPlan?: string;
  assaultMode?: SiegeAssaultMode;
  assemblyX?: number;
  assemblyY?: number;
  assaultDelayTicks?: number;
  assaultWaveSize?: number;
  assaultWaveIntervalTicks?: number;
  feintDurationTicks?: number;
  retreatCondition?: string;
  retreatHealthPct?: number;
  retreatX?: number;
  retreatY?: number;
  repairPlan?: string;
  targetX?: number;
  targetY?: number;
  developmentId?: DevelopmentId;
  messageType?: MessageType;
  diplomacyIntent?: DiplomacyIntent;
  mergerLeaderTribeId?: TribeId;
  mergerTerms?: string;
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

export type FortificationPlanRecord = {
  id: string;
  tick: number;
  tribeId: TribeId;
  buildingId: string;
  buildingType: BuildableBuildingType;
  x: number;
  y: number;
  requestedX?: number;
  requestedY?: number;
  fortificationIntent?: string;
  perimeterStrategy?: string;
  perimeterShape?: string;
  perimeterPattern?: PerimeterPattern;
  perimeterDirection?: PerimeterDirection;
  perimeterLength?: number;
  perimeterGateIndex?: number;
  perimeterGroupId?: string;
  perimeterSegmentIndex?: number;
  perimeterSegmentCount?: number;
  placementPreview?: FortificationPlacementPreview;
  reason: string;
};

export type FortificationPlacementPreview = {
  resolvedTiles: Array<{ buildingId: string; buildingType: BuildableBuildingType; x: number; y: number }>;
  requestedCenter?: Position;
  resolvedCenter: Position;
  resolvedMoved: boolean;
  blockingTileCount: number;
  blockingBuildingIds: string[];
  gateCount: number;
  gatePassageBuildingIds: string[];
  ownerGatePassableCount: number;
  foreignGatePassableCount: number;
  nearestForeignTribeId?: TribeId;
  routeChecks: FortificationRoutePreview[];
  routeBlockedByPlacementCount: number;
  maxAddedRouteSteps: number;
  summary: string;
};

export type FortificationRoutePreview = {
  label: string;
  tribeId: TribeId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  baselineReachable: boolean;
  currentReachable: boolean;
  baselinePathLength?: number;
  currentPathLength?: number;
  blockedByPlacement: boolean;
  addedSteps: number;
};

export type GateOperationRecord = {
  id: string;
  tick: number;
  tribeId: TribeId;
  buildingId: string;
  gateState?: GateState;
  gateAccessPolicy?: GateAccessPolicy;
  targetTribeId?: TribeId;
  gateOperationIntent?: string;
  gateTerms?: string;
  gatePublicNotice?: string;
  entryAction?: GatePassageAction;
  tollMode?: GateTollMode;
  unpaidAction?: GatePassageAction;
  tollGold?: number;
  detainedPacketAction?: GateDetainedPacketAction;
  detainedPacketId?: string;
  ransomGold?: number;
  releaseSubject?: string;
  releaseMessage?: string;
  accessTreatyAction?: GateAccessTreatyAction;
  accessTreatyName?: string;
  accessTreatyTerms?: string;
  accessTreatyDurationTicks?: number;
  sabotageAction?: GateSabotageAction;
  sabotageDurationTicks?: number;
  sabotageDamage?: number;
  expiresAtTick?: number;
  reason: string;
};

export type GateOperationState = GateOperationRecord;

export type GateAccessTreatyRecord = {
  id: string;
  tick: number;
  tribeId: TribeId;
  buildingId: string;
  targetTribeId: TribeId;
  action: GateAccessTreatyAction;
  treatyName?: string;
  treatyTerms?: string;
  publicNotice?: string;
  expiresAtTick?: number;
  expiredAnnounced?: boolean;
  reason: string;
};

export type GateTreatyIncidentRecord = {
  id: string;
  tick: number;
  treatyId: string;
  treatyName?: string;
  buildingId: string;
  gateOwnerTribeId: TribeId;
  affectedTribeId: TribeId;
  packetId: string;
  gateOperationId: string;
  action: Extract<GatePassageAction, "refuse" | "detain" | "ambush">;
  participantTribeIds: TribeId[];
  witnessTribeIds: TribeId[];
  tollGold?: number;
  tollUnpaid?: boolean;
  summary: string;
};

export type GateSabotageState = {
  id: string;
  tick: number;
  tribeId: TribeId;
  targetTribeId?: TribeId;
  action: Extract<GateSabotageAction, "force_open" | "jam_closed">;
  previousGateState?: GateState;
  expiresAtTick?: number;
  reason: string;
};

export type GateSabotageRecord = {
  id: string;
  tick: number;
  tribeId: TribeId;
  buildingId: string;
  targetTribeId?: TribeId;
  action: GateSabotageAction;
  previousGateState?: GateState;
  damage?: number;
  expiresAtTick?: number;
  reason: string;
};

export type SiegePlanRecord = {
  id: string;
  tick: number;
  tribeId: TribeId;
  kind: "attack" | "repair" | "resource_raid";
  targetTribeId?: TribeId;
  targetBuildingId?: string;
  targetResourceType?: ResourceType;
  targetX?: number;
  targetY?: number;
  siegeIntent?: string;
  assaultPlan?: string;
  assaultMode?: SiegeAssaultMode;
  assemblyX?: number;
  assemblyY?: number;
  assaultDelayTicks?: number;
  assaultStartedTick?: number;
  assaultWaveSize?: number;
  assaultWaveIntervalTicks?: number;
  releasedWaveIndexes?: number[];
  feintDurationTicks?: number;
  feintWithdrawTick?: number;
  retreatCondition?: string;
  retreatHealthPct?: number;
  retreatX?: number;
  retreatY?: number;
  repairPlan?: string;
  assignedUnitIds: string[];
  reason: string;
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
  mergedIntoTribeId?: TribeId;
  mergedLeaderTribeId?: TribeId;
  mergedTick?: number;
  mergedYear?: number;
  mergedTerms?: string;
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
  | { kind: "attack"; targetUnitId: string; path: Position[] }
  | {
      kind: "attackBuilding";
      targetBuildingId: string;
      path: Position[];
      siegePlanId?: string;
      siegeIntent?: string;
      assaultMode?: SiegeAssaultMode;
      assaultPhase?: "assembling" | "waiting_wave" | "attacking";
      assemblyTarget?: Position;
      assemblyHoldUntilTick?: number;
      assaultWaveIndex?: number;
      assaultWaveDelayTicks?: number;
      assaultWaveReleaseTick?: number;
      feintWithdrawTick?: number;
      retreatHealthPct?: number;
      retreatTarget?: Position;
    }
  | { kind: "attackResource"; target: Position; resource: ResourceType; path: Position[] }
  | { kind: "repair"; targetBuildingId: string; path: Position[]; siegePlanId?: string; siegeIntent?: string; lastInterruptedTick?: number };

export type DamageableWorldObject = CombatStats & {
  id: string;
  type: UnitType | BuildingType;
  tribeId: TribeId;
  x: number;
  y: number;
};

export type Unit = CombatStats & {
  id: string;
  name: string;
  type: UnitType;
  tribeId: TribeId;
  x: number;
  y: number;
  speed: number;
  visionRadius: number;
  task: UnitTask;
  carriedPacketId?: string;
};

export type Building = CombatStats & {
  id: string;
  type: BuildingType;
  tribeId: TribeId;
  x: number;
  y: number;
  gateState?: GateState;
  gateAccessPolicy?: GateAccessPolicy;
  gateOperation?: GateOperationState;
  gateSabotage?: GateSabotageState;
};

export type Message = {
  id: string;
  type: MessageType;
  originTribeId: TribeId;
  recipientTribeId: TribeId;
  subject: string;
  body: string;
  diplomacyIntent: DiplomacyIntent;
  mergerLeaderTribeId?: TribeId;
  mergerTerms?: string;
  requiresReply: boolean;
  replyToMessageId?: string;
  createdTick: number;
  deliveredTick?: number;
  readTick?: number;
};

export type Packet = CombatStats & {
  id: string;
  itemType: ItemType;
  messageIds: string[];
  carrierUnitId?: string;
  originTribeId: TribeId;
  recipientTribeId: TribeId;
  state: PacketState;
  destination: Position;
  returnTo: Position;
  outboundGateBuildingIds?: string[];
  createdTick: number;
  expectedReturnTick: number;
  lastStateChangeTick: number;
  overdueAnnounced: boolean;
  routeMemory: string[];
};

export type SiegeProjectile = CombatStats & {
  id: string;
  projectileType: "stone_shot";
  tribeId: TribeId;
  originUnitId: string;
  targetBuildingId: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  launchedTick: number;
  impactTick: number;
  siegePlanId?: string;
};

export type CombatStatCoverageIssue = {
  kind: "unitType" | "buildingType" | "resourceType" | "unit" | "building" | "resource" | "packet" | "projectile" | "map";
  id: string;
  reason: string;
};

export type CombatStatCoverageReport = {
  ok: boolean;
  checked: number;
  byKind: Record<"unitType" | "buildingType" | "resourceType" | "unit" | "building" | "resource" | "packet" | "projectile", number>;
  issues: CombatStatCoverageIssue[];
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
  mergedIntoTribeId?: TribeId;
  mergedLeaderTribeId?: TribeId;
  mergedYear?: number;
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
  mergedTribes: number;
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
  projectiles: Record<string, SiegeProjectile>;
  events: GameEvent[];
  aiDecisions: AiDecision[];
  sovereignDecisionCursors: Record<TribeId, SovereignDecisionCursor>;
  foreignObservations: Record<TribeId, ForeignObservation[]>;
  foreignObservationMemory: Record<TribeId, ForeignObservationMemory>;
  aiInformationRequests: AiInformationRequest[];
  postGameLearnings: PostGameLearning[];
  resourceDenials: ResourceDenialRecord[];
  resourceDepletions: ResourceDepletionRecord[];
  civilizationMergers: CivilizationMergerRecord[];
  fortificationPlans: FortificationPlanRecord[];
  gateOperations: GateOperationRecord[];
  gateAccessTreaties: GateAccessTreatyRecord[];
  gateTreatyIncidents: GateTreatyIncidentRecord[];
  gateSabotageHistory: GateSabotageRecord[];
  siegePlans: SiegePlanRecord[];
  sovereignMemories: Record<TribeId, SovereignMemory>;
  diplomaticIntel: Record<TribeId, DiplomaticIntelItem[]>;
  alliances: Partial<Record<TribeId, TribeId>>;
  wars: Record<TribeId, Partial<Record<TribeId, boolean>>>;
  visibility: Record<TribeId, Uint8Array>;
  counters: Record<string, number>;
  victoryPressure: VictoryPressureConfig;
};

export const tribeIds: TribeId[] = ["blue", "red", "green", "yellow", "purple"];
export const unitTypes: readonly UnitType[] = ["sovereign", "peon", "sentinel", "messenger", "trader", "militia", "archer", "siege_engine", "battering_ram", "catapult"] as const;
export const buildingTypes: readonly BuildingType[] = ["townHall", "farm", "house", "barracks", "market", "watchtower", "wall", "gate", "turret"] as const;

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

function scaleMapCoordinate(value: number): number {
  return clamp(Math.round((value / 128) * MAP_SIZE), 8, MAP_SIZE - 9);
}

function mapCenter(): Position {
  const center = Math.floor(MAP_SIZE / 2);
  return { x: center, y: center };
}

function scaledMapOffset(value: number): number {
  return Math.round((value / 128) * MAP_SIZE);
}

function fromMapCenter(dx: number, dy: number): Position {
  const center = mapCenter();
  return { x: center.x + scaledMapOffset(dx), y: center.y + scaledMapOffset(dy) };
}

const starts: Record<TribeId, Position> = {
  blue: { x: scaleMapCoordinate(18), y: scaleMapCoordinate(20) },
  red: { x: scaleMapCoordinate(108), y: scaleMapCoordinate(22) },
  green: { x: scaleMapCoordinate(21), y: scaleMapCoordinate(106) },
  yellow: { x: scaleMapCoordinate(107), y: scaleMapCoordinate(103) },
  purple: mapCenter()
};

type UnitStatDefinition = Pick<Unit, "hp" | "maxHp" | "armor" | "speed" | "visionRadius" | "attack" | "range" | "attackCooldown">;

const unitStats: Record<UnitType, UnitStatDefinition> = {
  sovereign: { hp: 80, maxHp: 80, armor: 2, speed: 1.0, visionRadius: 8, attack: 4, range: 1.2, attackCooldown: 0 },
  peon: { hp: 38, maxHp: 38, armor: 0, speed: 1.0, visionRadius: 5, attack: 2, range: 1.1, attackCooldown: 0 },
  sentinel: { hp: 32, maxHp: 32, armor: 1, speed: 1.35, visionRadius: 10, attack: 1, range: 1.1, attackCooldown: 0 },
  messenger: { hp: 25, maxHp: 25, armor: 0, speed: 1.6, visionRadius: 5, attack: 0, range: 0, attackCooldown: 0 },
  trader: { hp: 44, maxHp: 44, armor: 1, speed: 1.1, visionRadius: 5, attack: 0, range: 0, attackCooldown: 0 },
  militia: { hp: 55, maxHp: 55, armor: 2, speed: 1.05, visionRadius: 5, attack: 7, range: 1.2, attackCooldown: 0 },
  archer: { hp: 40, maxHp: 40, armor: 1, speed: 1.0, visionRadius: 6, attack: 5, range: 4.4, attackCooldown: 0 },
  siege_engine: { hp: 110, maxHp: 110, armor: 4, speed: 0.62, visionRadius: 4, attack: 18, range: 3.2, attackCooldown: 0 },
  battering_ram: { hp: 150, maxHp: 150, armor: 7, speed: 0.48, visionRadius: 3, attack: 20, range: 1.4, attackCooldown: 0 },
  catapult: { hp: 85, maxHp: 85, armor: 2, speed: 0.42, visionRadius: 5, attack: 24, range: 7.5, attackCooldown: 0 }
};

const packetStats: CombatStats = { hp: 8, maxHp: 8, armor: 0, attack: 0, range: 0, attackCooldown: 0 };

const REPAIR_RANGE = 1.2;
const REPAIR_HP_PER_TICK = 5;

function repairHpPerTick(state: GameState, tribeId: TribeId): number {
  return Math.max(1, REPAIR_HP_PER_TICK + developmentEffectAmount(state, tribeId, "repair_speed"));
}

export const resourceTypes: readonly ResourceType[] = ["gold", "food", "wood", "stone", "clay", "limestone", "iron", "coal"] as const;
export type ResourceScarcityTier = "abundant" | "common" | "limited" | "scarce";
export type ResourceScarcityPolicy = {
  tier: ResourceScarcityTier;
  localStarterPatch: boolean;
  centralConflictPatch: boolean;
  wildWeight: number;
};
export const resourceScarcityPolicy: Readonly<Record<ResourceType, ResourceScarcityPolicy>> = Object.freeze({
  food: { tier: "abundant", localStarterPatch: true, centralConflictPatch: false, wildWeight: 10 },
  wood: { tier: "abundant", localStarterPatch: true, centralConflictPatch: false, wildWeight: 0 },
  stone: { tier: "common", localStarterPatch: true, centralConflictPatch: true, wildWeight: 16 },
  clay: { tier: "common", localStarterPatch: true, centralConflictPatch: true, wildWeight: 16 },
  limestone: { tier: "limited", localStarterPatch: true, centralConflictPatch: true, wildWeight: 17 },
  gold: { tier: "limited", localStarterPatch: true, centralConflictPatch: true, wildWeight: 14 },
  iron: { tier: "scarce", localStarterPatch: false, centralConflictPatch: true, wildWeight: 15 },
  coal: { tier: "scarce", localStarterPatch: false, centralConflictPatch: true, wildWeight: 12 }
});
export const scarceMapResourceTypes: readonly ResourceType[] = Object.freeze(resourceTypes.filter((type) => resourceScarcityPolicy[type].tier === "scarce"));
export const trainableUnitTypes: readonly ("peon" | "militia" | "archer" | "siege_engine" | "battering_ram" | "catapult")[] = [
  "peon",
  "militia",
  "archer",
  "siege_engine",
  "battering_ram",
  "catapult"
] as const;
const unitTrainingCosts: Record<(typeof trainableUnitTypes)[number], ResourceCost> = {
  peon: { food: 50 },
  militia: { food: 60, gold: 20 },
  archer: { food: 40, gold: 30, wood: 25 },
  siege_engine: { wood: 120, stone: 80, iron: 35, coal: 20, gold: 70 },
  battering_ram: { wood: 150, stone: 50, iron: 45, gold: 60 },
  catapult: { wood: 170, stone: 120, iron: 55, coal: 35, gold: 90 }
};
const unitDevelopmentRequirements: Record<(typeof trainableUnitTypes)[number], DevelopmentId[]> = {
  peon: [],
  militia: [],
  archer: [],
  siege_engine: ["siege_engineering"],
  battering_ram: ["public_works", "siege_engineering"],
  catapult: ["ballistics", "siege_engineering"]
};
const coreDevelopmentIds: readonly DevelopmentId[] = [
  "masonry",
  "brick_kilns",
  "ironworking",
  "ballistics",
  "military_architecture",
  "public_works",
  "siege_engineering",
  "road_engineering",
  "gate_machinery",
  "taxation",
  "council_governance",
  "free_press",
  "propaganda",
  "forced_labor",
  "abolition",
  "espionage"
] as const;

const coreDevelopmentCatalog: Record<DevelopmentId, DevelopmentDefinition> = {
  masonry: {
    id: "masonry",
    name: "Masonry",
    description: "Stone setting, mortar work, and defensive wall foundations.",
    cost: { stone: 35, clay: 20, limestone: 20, gold: 20 },
    prerequisites: [],
    unlocks: ["wall construction", "gate foundations"],
    category: "infrastructure",
    phase: "core",
    effects: [{ kind: "building_max_hp", amount: 20, target: "fortification", description: "Fortification foundations gain baseline durability." }]
  },
  brick_kilns: {
    id: "brick_kilns",
    name: "Brick Kilns",
    description: "Clay firing and standardized bricks for stronger settlement logistics.",
    cost: { wood: 45, clay: 45, limestone: 15, gold: 25 },
    prerequisites: ["masonry"],
    unlocks: ["stronger wall and gate bodies", "granaries", "archives"],
    category: "infrastructure",
    phase: "core",
    effects: [
      { kind: "building_max_hp", amount: 60, target: "wall", description: "Walls gain fired-brick durability." },
      { kind: "building_max_hp", amount: 60, target: "gate", description: "Gates gain fired-brick durability." },
      { kind: "building_armor", amount: 1, target: "wall", description: "Walls gain brick armor." },
      { kind: "building_armor", amount: 1, target: "gate", description: "Gates gain brick armor." }
    ]
  },
  ironworking: {
    id: "ironworking",
    name: "Ironworking",
    description: "Bloomery iron tools, fittings, and weapon-ready metal supply chains.",
    cost: { wood: 40, iron: 25, coal: 15, gold: 35 },
    prerequisites: [],
    unlocks: ["turret components", "gate hinges and locks", "siege metalwork"],
    category: "economy",
    phase: "core",
    effects: [
      { kind: "unit_attack", amount: 1, target: "military", description: "Iron fittings improve military striking power." },
      { kind: "wealth", amount: 4, description: "Iron tools increase productive capacity." }
    ]
  },
  ballistics: {
    id: "ballistics",
    name: "Ballistics",
    description: "Projectile engineering for fixed defensive engines.",
    cost: { wood: 60, stone: 40, iron: 25, gold: 45 },
    prerequisites: ["ironworking"],
    unlocks: ["turret construction"],
    category: "military",
    phase: "core",
    effects: [
      { kind: "building_attack", amount: 2, target: "turret", description: "Turrets hit harder." },
      { kind: "building_range", amount: 1, target: "turret", description: "Turrets reach farther." }
    ]
  },
  military_architecture: {
    id: "military_architecture",
    name: "Military Architecture",
    description: "Purpose-built fortification layouts, kill zones, and protected logistics.",
    cost: { stone: 70, clay: 35, limestone: 45, iron: 15, gold: 55 },
    prerequisites: ["masonry", "ballistics"],
    unlocks: ["harder wall and gate networks", "stronger turrets", "siege-resistant districts"],
    category: "military",
    phase: "core",
    effects: [
      { kind: "building_max_hp", amount: 90, target: "wall", description: "Walls gain layered fortification layouts." },
      { kind: "building_max_hp", amount: 90, target: "gate", description: "Gates gain layered fortification layouts." },
      { kind: "building_max_hp", amount: 60, target: "turret", description: "Turrets gain reinforced emplacements." },
      { kind: "building_max_hp", amount: 60, target: "watchtower", description: "Watchtowers gain reinforced foundations." },
      { kind: "building_armor", amount: 2, target: "wall", description: "Walls gain military-grade armor." },
      { kind: "building_armor", amount: 2, target: "gate", description: "Gates gain military-grade armor." },
      { kind: "building_armor", amount: 1, target: "turret", description: "Turrets gain military-grade armor." },
      { kind: "building_armor", amount: 1, target: "watchtower", description: "Watchtowers gain military-grade armor." },
      { kind: "building_range", amount: 1, target: "turret", description: "Turret sight lines improve." },
      { kind: "unit_armor", amount: 1, target: "military", description: "Military units drill around protected logistics." },
      { kind: "safety", amount: 3, description: "Fortified layouts improve population safety." }
    ]
  },
  public_works: {
    id: "public_works",
    name: "Public Works",
    description: "State-managed labor crews for roads, repairs, and civic construction.",
    cost: { wood: 40, stone: 30, gold: 40 },
    prerequisites: [],
    unlocks: ["faster repairs", "cheaper civic maintenance", "larger civic housing capacity"],
    category: "infrastructure",
    phase: "core",
    effects: [
      { kind: "repair_speed", amount: 2, description: "State crews repair structures faster." },
      { kind: "repair_cost_multiplier", amount: -0.15, description: "Repair logistics waste fewer materials." },
      { kind: "population_cap", amount: 4, description: "Civic works make larger towns easier to sustain." }
    ]
  },
  siege_engineering: {
    id: "siege_engineering",
    name: "Siege Engineering",
    description: "Purpose-built rams, mantlets, ladders, and breach crews for destroying fortifications.",
    cost: { wood: 90, stone: 55, iron: 45, coal: 25, gold: 75 },
    prerequisites: ["ironworking", "public_works"],
    unlocks: ["siege engine recruitment", "breach bonuses against walls, gates, and turrets"],
    category: "military",
    phase: "core",
    effects: [
      { kind: "unit_attack", amount: 2, target: "siege_engine", description: "Siege engines breach fortifications faster." },
      { kind: "safety", amount: 1, description: "Breach capacity deters hostile walls from trapping the population." }
    ]
  },
  road_engineering: {
    id: "road_engineering",
    name: "Road Engineering",
    description: "Surveyed roadbeds, bridges, and supply lanes that make labor and messengers move more reliably.",
    cost: { wood: 50, stone: 55, limestone: 35, gold: 45 },
    prerequisites: ["public_works"],
    unlocks: ["faster workers and messengers", "faster field repairs"],
    category: "infrastructure",
    phase: "core",
    effects: [
      { kind: "unit_speed", amount: 0.14, target: "logistics", description: "Workers, messengers, traders, and siege engines move faster." },
      { kind: "repair_speed", amount: 1, description: "Repair crews move and stage materials faster." },
      { kind: "repair_cost_multiplier", amount: -0.1, description: "Road logistics reduce repair waste." }
    ]
  },
  gate_machinery: {
    id: "gate_machinery",
    name: "Gate Machinery",
    description: "Counterweights, iron controls, and guard procedures for stronger controlled passages.",
    cost: { wood: 50, stone: 45, limestone: 35, iron: 35, gold: 55 },
    prerequisites: ["masonry", "ironworking"],
    unlocks: ["stronger gates", "future automated gate controls"],
    category: "infrastructure",
    phase: "core",
    effects: [
      { kind: "building_max_hp", amount: 70, target: "gate", description: "Gates gain stronger machinery housings." },
      { kind: "building_armor", amount: 1, target: "gate", description: "Gate controls gain armor." }
    ]
  },
  taxation: {
    id: "taxation",
    name: "Taxation",
    description: "Regular tribute assessment that turns population and commerce into yearly gold.",
    cost: { gold: 35 },
    prerequisites: [],
    unlocks: ["yearly gold income", "wealth growth pressure"],
    category: "economy",
    phase: "core",
    effects: [
      { kind: "yearly_gold_per_population", amount: 2, description: "Each living subject contributes yearly gold." },
      { kind: "yearly_happiness", amount: -1, description: "Taxes strain happiness unless balanced by legitimacy." }
    ]
  },
  council_governance: {
    id: "council_governance",
    name: "Council Governance",
    description: "Representative councils that reduce unrest and make difficult policies easier to sustain.",
    cost: { wood: 20, gold: 45 },
    prerequisites: ["taxation"],
    unlocks: ["happiness buffer", "lower tax unrest"],
    category: "governance",
    phase: "core",
    effects: [
      { kind: "instant_happiness", amount: 4, description: "Councils immediately improve public trust." },
      { kind: "yearly_happiness", amount: 1, description: "Councils reduce yearly unrest." },
      { kind: "yearly_gold_per_population", amount: -0.4, description: "Legitimacy limits tax pressure." },
      { kind: "safety", amount: 3, description: "Representation improves civic stability." }
    ]
  },
  free_press: {
    id: "free_press",
    name: "Free Press",
    description: "Independent messengers, notices, and public debate that raise trust but expose failures.",
    cost: { wood: 35, gold: 35 },
    prerequisites: ["council_governance"],
    unlocks: ["happiness from truthful public accountability", "propaganda resistance"],
    category: "information",
    phase: "core",
    effects: [
      { kind: "instant_happiness", amount: 3, description: "Public accountability improves trust." },
      { kind: "yearly_happiness", amount: 1, description: "Free information reduces yearly suspicion." },
      { kind: "safety", amount: 1, description: "Public warning channels improve safety." }
    ]
  },
  propaganda: {
    id: "propaganda",
    name: "Propaganda",
    description: "Centralized public narratives that can raise morale while making diplomacy less trustworthy.",
    cost: { wood: 25, gold: 35 },
    prerequisites: ["taxation"],
    unlocks: ["morale buffer", "future deception tools"],
    category: "information",
    phase: "core",
    effects: [
      { kind: "instant_happiness", amount: 2, description: "Narrative control creates an immediate morale buffer." },
      { kind: "yearly_happiness", amount: 1, description: "Narrative control sustains morale." },
      { kind: "safety", amount: -1, description: "Distorted feedback weakens true safety assessment." }
    ]
  },
  forced_labor: {
    id: "forced_labor",
    name: "Forced Labor",
    description: "Coerced labor levies that accelerate construction and repair while harming happiness and legitimacy.",
    cost: { gold: 25 },
    prerequisites: ["taxation"],
    unlocks: ["cheaper building and repair labor", "happiness and safety penalties"],
    category: "labor",
    phase: "core",
    effects: [
      { kind: "instant_happiness", amount: -10, description: "Coercion immediately harms happiness." },
      { kind: "yearly_happiness", amount: -2, description: "Coercion keeps harming yearly happiness." },
      { kind: "construction_cost_multiplier", amount: -0.15, description: "Coerced labor lowers construction costs." },
      { kind: "repair_cost_multiplier", amount: -0.25, description: "Coerced labor lowers repair costs." },
      { kind: "repair_speed", amount: 2, description: "Coerced labor speeds emergency repairs." },
      { kind: "safety", amount: -6, description: "Coercion undermines civic safety." }
    ]
  },
  abolition: {
    id: "abolition",
    name: "Abolition",
    description: "Ends coerced labor institutions and redirects legitimacy toward wage labor and citizenship.",
    cost: { gold: 55 },
    prerequisites: ["forced_labor", "council_governance"],
    unlocks: ["forced labor penalties removed", "happiness recovery"],
    category: "labor",
    phase: "core",
    effects: [
      { kind: "instant_happiness", amount: 12, description: "Abolition immediately restores public trust." },
      { kind: "yearly_happiness", amount: 1, description: "Abolition supports yearly legitimacy." },
      { kind: "safety", amount: 4, description: "Rights recovery improves civic safety." }
    ]
  },
  espionage: {
    id: "espionage",
    name: "Espionage",
    description: "Informant networks, coded letters, and scouts trained to discover hidden military and economic intent.",
    cost: { gold: 65, iron: 10 },
    prerequisites: ["council_governance"],
    unlocks: ["wider sentinel vision", "future spy missions"],
    category: "security",
    phase: "core",
    effects: [
      { kind: "unit_vision", amount: 3, target: "sentinel", description: "Sentinels see farther through informant support." },
      { kind: "safety", amount: 2, description: "Better intelligence improves safety." }
    ]
  }
};

const roadmapDevelopmentSeedText = `
SW-001|Unified Settlement Layout
SW-002|Census Tablets
SW-003|Grain Reserve Granary
SW-004|Basic Standard of Measures
SW-005|Frontier Wardens
SW-006|First Magistrate
SW-007|Stone Marker Boundaries
SW-008|Night Signal Network
SW-009|Ritual Court Day
SW-010|Village Guard Militia
SW-011|Tribal Council
SW-012|Hereditary Monarchy
SW-013|Elective Sovereignty
SW-014|Regency Council
SW-015|Provincial Governors
SW-016|Central Chancellery
SW-017|Dual-Executive Model
SW-018|Oath of Office
SW-019|Constitutional Charter
SW-020|Succession Law
SW-021|State Census Hall
SW-022|Court Faction Registry
SW-023|Public Petition Office
SW-024|Rotating Court Location
SW-025|Provincial Assemblies
SW-026|Anti-Coup Watch
SW-027|Succession Crisis Protocol
SW-028|Exile Tribunal
SW-029|Heir Education System
SW-030|Civic Identity Edict
SW-031|Taxpayer Charter
SW-032|Court Record Ledger
SW-033|Municipal Charter
SW-034|Regency Tax Court
SW-035|Executive Immunity Limits
SW-036|Diplomatic Legation Bureau
SW-037|Succession Council
SW-038|Civil-Military Boundary Statute
SW-039|Public Accountability Hearings
SW-040|Shared Regency Council Seats
SW-041|Market Square
SW-042|Fixed Taxation
SW-043|Progressive Tax Bands
SW-044|Grain Tithe Tax
SW-045|Trade Tariff Corridor
SW-046|Mint and Coinage
SW-047|Banking Guild
SW-048|State Treasury Bond
SW-049|Rural Granary Tax Credit
SW-050|Infrastructure Bonds
SW-051|Toll Bridge Network
SW-052|State Granaries as Depository
SW-053|Land Tax Assessment
SW-054|Merchant Charter
SW-055|Standardized Weights
SW-056|Caravan Protection
SW-057|Craft Guild Charter
SW-058|Public Works Bureau
SW-059|Slavery Registration
SW-060|Forced Labor Quota
SW-061|Abolition Reform
SW-062|Debt-Bond Registry
SW-063|Apprenticeship Tax Incentive
SW-064|Port Levies
SW-065|Internal Bond Market
SW-066|Rural Banking Posts
SW-067|Harvest Insurance Pool
SW-068|Black-Market Suppression Bureau
SW-069|Maritime Guild Tax
SW-070|Industrial Hearth Centers
SW-071|Transport Guild Monopoly
SW-072|Land Reform Registry
SW-073|Anti-Inflation Control
SW-074|State Monopsony (War-time Procurement)
SW-075|Regional Resource Charter
SW-076|Treasury Secrecy Protocol
SW-077|Trade Mission Network
SW-078|Provincial Mint Deputies
SW-079|Public Price Bulletin
SW-080|Anti-Piracy Statute
SW-081|Fiscal Forecast Office
SW-082|Currency Anti-Forger Marks
SW-083|Debt Jubilation Moratorium
SW-084|Corporate Charter Monopoly (State-Granted)
SW-085|Agricultural Research Plots
SW-086|Tax Farming Outsource
SW-087|Infrastructure Insurance Levy
SW-088|Export Quota Framework
SW-089|Mining Safety Code
SW-090|Rural Credit Coops
SW-091|State Schools
SW-092|Temple-Market Compacts
SW-093|Public Health Corps
SW-094|Census Health Registry
SW-095|Public Education Curriculum
SW-096|Freedom of Assembly
SW-097|Censorship Office
SW-098|Free Press Charter
SW-099|Civil Rights Codex
SW-100|Anti-Slavery Sentiment Index
SW-101|Civil Registry of Persons
SW-102|Civic Welfare Pensions
SW-103|Public Works Labor Unions
SW-104|Cultural Festivals Commission
SW-105|Elite Patronage Ledger
SW-106|Anti-Extremism Mediation
SW-107|Religious Autonomy Board
SW-108|Controlled Media Network
SW-109|Migration Registry
SW-110|Assimilation Program
SW-111|Migration Restriction Regime
SW-112|Civil Registry Appeals Court
SW-113|Womens Guild Inclusion
SW-114|Child Protection Statute
SW-115|Population Mobility Infrastructure
SW-116|Anti-Corruption Hotline
SW-117|Public Art and Narrative Program
SW-118|Civic Duty Education
SW-119|Minority Representation Rule
SW-120|Public Information Archive
SW-121|City Garrison
SW-122|Rural Policing
SW-123|Code of Criminal Law
SW-124|Judicial Review Court
SW-125|Espionage Academy
SW-126|Counter-Intelligence Bureau
SW-127|Fortress Walls
SW-128|Turret Battery Network
SW-129|Siegeworks Program
SW-130|Watchtower Grid
SW-131|Guerrilla Doctrine
SW-132|Shock Doctrine
SW-133|Defensive Doctrine
SW-134|Standing Army
SW-135|Militia Reserve
SW-136|Officer Corps Academy
SW-137|Conscription
SW-138|Mercenary Charter
SW-139|Diplomacy Corps
SW-140|Treaty Ratification
SW-141|Espionage Countermeasures: False Flag Detectors
SW-142|Propaganda Network
SW-143|Public Diplomatic Ledger
SW-144|Trade Embargo System
SW-145|Refuge Policy
SW-146|Naval Patrol
SW-147|Intelligence Courts
SW-148|Humanitarian Corridor Protocol
SW-149|Border Gate Tax Exemption
SW-150|War Debt Tribunal
SW-151|Succession Education Academy
SW-152|Federal Compact
SW-153|Constitutional Court
SW-154|National Census + AI Forecast
SW-155|Merit Rotation Office
SW-156|Judicial Immunity Reform
SW-157|Constitutional Revision Convention
SW-158|Imperial Secretariat
SW-159|Public Debt Audit
SW-160|Global Trade Treaty Framework
SW-161|Universal Draft Registry
SW-162|Post-War Reconstruction Office
SW-163|Monumental Infrastructure Corridor
SW-164|Civic Automation Ledger
SW-165|Truth and Reconciliation Council
SW-166|Inter-Regional Water Authority
SW-167|Digital Archive Simulation
SW-168|Anti-Extortion Law
SW-169|Public-Private Partnership Board
SW-170|Moral Economy Charter
SW-171|AI Governance Observatory
SW-172|Emergency Constitutional Lock
SW-173|Interfaith Arbitration Tribunal
SW-174|Exile and Reintegration Program
SW-175|Generational Planning Board
`;

type RoadmapDevelopmentSeed = {
  sw: string;
  id: DevelopmentId;
  name: string;
  phase: string;
  category: DevelopmentCategory;
  index: number;
};

function buildGeneratedDevelopmentCatalog(): Record<DevelopmentId, DevelopmentDefinition> {
  const seeds = parseRoadmapDevelopmentSeeds();
  const generated: Record<DevelopmentId, DevelopmentDefinition> = {};
  for (const seed of seeds) {
    generated[seed.id] = {
      id: seed.id,
      name: seed.name,
      description: `${seed.sw} roadmap institution in the ${seed.category.replace("_", " ")} branch.`,
      cost: inferDevelopmentCost(seed),
      prerequisites: inferDevelopmentPrerequisites(seed),
      unlocks: inferDevelopmentUnlocks(seed),
      category: seed.category,
      phase: seed.phase,
      effects: inferDevelopmentEffects(seed)
    };
  }
  return generated;
}

function parseRoadmapDevelopmentSeeds(): RoadmapDevelopmentSeed[] {
  return roadmapDevelopmentSeedText
    .trim()
    .split("\n")
    .map((line, index) => {
      const [sw, name] = line.split("|");
      const phase = phaseForRoadmapNode(sw);
      return {
        sw,
        id: `${sw.toLowerCase().replace("-", "_")}_${slugify(name)}`,
        name,
        phase,
        category: inferDevelopmentCategory(name, phase),
        index: index + 1
      };
    });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function phaseForRoadmapNode(sw: string): string {
  const number = Number(sw.replace("SW-", ""));
  if (number <= 10) return "P0";
  if (number <= 40) return "P1";
  if (number <= 90) return "P2";
  if (number <= 120) return "P3";
  if (number <= 150) return "P4";
  return "P5";
}

function inferDevelopmentCategory(name: string, phase: string): DevelopmentCategory {
  const text = name.toLowerCase();
  if (/\b(tax|market|mint|bank|bond|credit|tariff|guild|trade|merchant|currency|price|inflation|debt|export|procurement|monop|treasury|insurance|fiscal|coin|levy|tithe)\b/.test(text)) return "economy";
  if (/\b(slaver|forced labor|labor|apprentice|union|abolition|bond registry)\b/.test(text)) return "labor";
  if (/\b(school|education|health|welfare|festival|religious|migration|assembly|rights|child|minority|women|culture|public art|civic duty|sentiment)\b/.test(text)) return "social";
  if (/\b(press|media|censor|archive|forecast|ledger|bulletin|narrative|information|propaganda|observatory)\b/.test(text)) return "information";
  if (/\b(law|court|judicial|criminal|tribunal|immunity|charter|constitution|accountability|corruption|petition|magistrate|review)\b/.test(text)) return "law";
  if (/\b(espionage|counter|intelligence|polic|watch|garrison|warden|anti-coup|anti-piracy|anti-extortion|security)\b/.test(text)) return "security";
  if (/\b(wall|turret|siege|watchtower|garrison|doctrine|army|militia|officer|conscription|mercenary|fortress|naval|draft)\b/.test(text)) return "military";
  if (/\b(diplom|treaty|legation|refuge|humanitarian|corridor|interfaith|global trade)\b/.test(text)) return "diplomacy";
  if (/\b(infrastructure|bridge|transport|granary|hearth|mining|agricultural|water|corridor|mobility|monumental|public works|layout|measures|boundaries)\b/.test(text)) return "infrastructure";
  if (phase === "P5") return "long_horizon";
  if (phase === "P1") return "governance";
  if (phase === "P0") return "foundational";
  return "governance";
}

function inferDevelopmentCost(seed: RoadmapDevelopmentSeed): ResourceCost {
  const tier = Number(seed.phase.slice(1)) + 1;
  const variance = seed.index % 5;
  const cost: ResourceCost = { gold: 14 + tier * 9 + variance * 3 };
  if (seed.category === "infrastructure" || seed.category === "military") {
    cost.wood = 16 + tier * 8;
    cost.stone = 12 + tier * 7;
  }
  if (seed.category === "military" || seed.category === "security") cost.iron = 6 + tier * 4;
  if (seed.category === "military" && tier >= 4) cost.coal = 5 + tier * 3;
  if (seed.category === "social" || seed.category === "information" || seed.category === "law") cost.wood = 8 + tier * 5;
  if (seed.category === "economy") cost.gold = (cost.gold ?? 0) + 12 + tier * 4;
  if (seed.category === "labor") cost.food = 8 + tier * 3;
  if (seed.category === "long_horizon") {
    cost.gold = (cost.gold ?? 0) + 35;
    cost.stone = 20 + tier * 8;
    cost.limestone = 12 + tier * 5;
  }
  return cost;
}

function inferDevelopmentPrerequisites(seed: RoadmapDevelopmentSeed): DevelopmentId[] {
  const prereqs = new Set<DevelopmentId>();
  if (seed.phase === "P1") prereqs.add("council_governance");
  if (seed.phase === "P2") prereqs.add(seed.category === "infrastructure" ? "public_works" : "taxation");
  if (seed.phase === "P3") prereqs.add(seed.category === "information" ? "free_press" : "council_governance");
  if (seed.phase === "P4") {
    if (seed.category === "military") prereqs.add("military_architecture");
    else if (seed.category === "security") prereqs.add("espionage");
    else prereqs.add("council_governance");
  }
  if (seed.phase === "P5") {
    prereqs.add("council_governance");
    if (seed.category === "military" || seed.category === "security") prereqs.add("espionage");
  }
  if (seed.category === "labor" && /abolition|anti-slavery/i.test(seed.name)) prereqs.add("forced_labor");
  if (seed.category === "military" && /siege/i.test(seed.name)) prereqs.add("siege_engineering");
  if (seed.category === "economy" && /bank|bond|debt|credit|currency|mint/i.test(seed.name)) prereqs.add("taxation");
  return Array.from(prereqs);
}

function inferDevelopmentUnlocks(seed: RoadmapDevelopmentSeed): string[] {
  const unlocks: Record<DevelopmentCategory, string[]> = {
    foundational: ["administrative stability", "early survival options"],
    governance: ["legitimacy tools", "state coordination"],
    economy: ["wealth generation", "market leverage"],
    labor: ["labor policy trade-offs", "construction capacity"],
    social: ["happiness and population resilience", "legitimacy paths"],
    information: ["public information tools", "narrative leverage"],
    law: ["justice capacity", "institutional safety"],
    security: ["internal security", "intelligence capacity"],
    military: ["war-fighting capacity", "defense posture"],
    diplomacy: ["treaty leverage", "external coordination"],
    infrastructure: ["logistics and construction efficiency", "resource control"],
    long_horizon: ["late-game institutional capacity", "cross-century resilience"]
  };
  return unlocks[seed.category];
}

function inferDevelopmentEffects(seed: RoadmapDevelopmentSeed): DevelopmentEffect[] {
  const text = seed.name.toLowerCase();
  const effects: DevelopmentEffect[] = [];
  const add = (kind: DevelopmentEffectKind, amount: number, description: string, target?: string) => effects.push({ kind, amount, target, description });

  if (seed.category === "foundational") {
    add("safety", 0.8, "Foundational institutions reduce early disorder.");
    add("resource_control", 0.4, "Foundational mapping improves local control.");
  }
  if (seed.category === "governance") {
    add("yearly_happiness", 0.35, "Governance stability improves yearly legitimacy.");
    add("safety", 0.9, "Governance institutions reduce civic risk.");
  }
  if (seed.category === "economy") {
    add("yearly_gold_per_population", 0.16, "Economic institutions raise recurring state income.");
    add("wealth", 2.5, "Economic complexity increases stored productive wealth.");
  }
  if (seed.category === "labor") {
    add("construction_cost_multiplier", -0.025, "Labor institutions change construction throughput.");
    add("repair_speed", 0.25, "Organized labor can mobilize repairs faster.");
  }
  if (seed.category === "social") {
    add("yearly_happiness", 0.45, "Social institutions improve happiness and cohesion.");
    add("safety", 0.45, "Social resilience improves public safety.");
    add("population_cap", 0.8, "Social institutions make larger stable populations easier to sustain.");
  }
  if (seed.category === "information") {
    add("yearly_happiness", 0.25, "Information institutions shape public trust.");
    add("unit_vision", 0.25, "Information flows improve field awareness.", "sentinel");
  }
  if (seed.category === "law") {
    add("safety", 1.1, "Legal institutions reduce disorder and arbitrary violence.");
    add("yearly_happiness", 0.2, "Legal recourse supports legitimacy.");
  }
  if (seed.category === "security") {
    add("safety", 1.2, "Security institutions reduce internal and external risk.");
    add("unit_vision", 0.35, "Security networks improve detection.", "sentinel");
  }
  if (seed.category === "military") {
    add("safety", 0.9, "Military institutions improve deterrence.");
    add("unit_attack", 0.35, "Military organization improves combat pressure.", "military");
    add("unit_armor", 0.2, "Military organization improves field protection.", "military");
  }
  if (seed.category === "diplomacy") {
    add("safety", 0.55, "Diplomacy can reduce isolation and war risk.");
    add("yearly_gold_per_population", 0.06, "Diplomatic channels improve trade and tribute options.");
  }
  if (seed.category === "infrastructure") {
    add("construction_cost_multiplier", -0.018, "Infrastructure reduces construction waste.");
    add("repair_cost_multiplier", -0.018, "Infrastructure improves maintenance logistics.");
    add("resource_control", 0.55, "Infrastructure improves access to useful deposits.");
    add("population_cap", 0.7, "Infrastructure supports denser settlements.");
  }
  if (seed.category === "long_horizon") {
    add("yearly_happiness", 0.25, "Long-horizon institutions improve continuity.");
    add("safety", 0.8, "Long-horizon institutions reduce cross-century fragility.");
    add("wealth", 2.2, "Long-horizon institutions preserve productive capacity.");
    add("population_cap", 0.6, "Long-horizon institutions improve intergenerational population capacity.");
  }

  if (/\b(slavery|forced labor|quota|tax farming|monopoly|censorship|secrecy|restriction|monopsony)\b/.test(text)) {
    add("yearly_happiness", -0.55, "Coercive institutions carry recurring legitimacy costs.");
    add("safety", -0.8, "Coercive institutions create internal safety risks.");
  }
  if (/\b(abolition|rights|welfare|protection|minority|womens|refuge|humanitarian|reconciliation|moral)\b/.test(text)) {
    add("instant_happiness", 2, "Rights reforms immediately improve public trust.");
    add("yearly_happiness", 0.45, "Rights reforms sustain legitimacy.");
  }
  if (/\b(wall|fortress)\b/.test(text)) {
    add("building_max_hp", 55, "Wall institutions improve fortification durability.", "wall");
    add("building_armor", 1, "Wall institutions improve fortification armor.", "wall");
  }
  if (/\b(gate)\b/.test(text)) {
    add("building_max_hp", 35, "Gate institutions improve controlled-passage durability.", "gate");
    add("building_armor", 0.5, "Gate institutions improve controlled-passage armor.", "gate");
  }
  if (/\b(turret|battery)\b/.test(text)) {
    add("building_attack", 1.2, "Turret institutions increase defensive firepower.", "turret");
    add("building_range", 0.4, "Turret institutions improve defensive reach.", "turret");
  }
  if (/\b(watchtower|signal)\b/.test(text)) {
    add("building_max_hp", 25, "Watchtower institutions improve lookout durability.", "watchtower");
    add("unit_vision", 0.35, "Watchtower institutions improve scout coordination.", "sentinel");
  }
  if (/\b(siege|shock|guerrilla|army|militia|officer|conscription|mercenary|garrison|patrol|draft)\b/.test(text)) {
    add("unit_attack", 0.45, "Military doctrine improves combat effectiveness.", "military");
    add("unit_armor", 0.25, "Military doctrine improves combat survivability.", "military");
  }
  if (/\b(road|bridge|transport|corridor|mobility|water|infrastructure)\b/.test(text)) {
    add("unit_speed", 0.025, "Transport institutions improve logistical movement.", "logistics");
    add("repair_speed", 0.2, "Transport institutions speed repairs.");
  }
  if (/\b(espionage|intelligence|counter|false flag|informant)\b/.test(text)) {
    add("unit_vision", 0.5, "Intelligence institutions improve sentinel awareness.", "sentinel");
    add("safety", 0.7, "Intelligence institutions reduce surprise.");
  }
  if (/\b(health|granary|harvest|food|agricultural)\b/.test(text)) {
    add("yearly_happiness", 0.25, "Food and health institutions reduce hardship.");
    add("safety", 0.45, "Food and health institutions improve survival safety.");
    add("population_cap", 1.5, "Food and health institutions support population growth.");
  }
  if (/\b(settlement|housing|census|population|family|clinic|sanitation|water)\b/.test(text)) {
    add("population_cap", 2, "Settlement institutions increase sustainable population capacity.");
  }

  return effects;
}

function normalizeDevelopment(definition: DevelopmentDefinition): Development {
  return {
    ...definition,
    cost: { ...definition.cost },
    prerequisites: [...definition.prerequisites],
    unlocks: [...definition.unlocks],
    aliases: uniqueNonEmpty([...(definition.aliases ?? []), ...inferDevelopmentAliases(definition)]).slice(0, 8),
    tradeoffs: uniqueNonEmpty([...(definition.tradeoffs ?? []), ...inferDevelopmentTradeoffs(definition)]).slice(0, 5),
    synergies: uniqueNonEmpty([...(definition.synergies ?? []), ...inferDevelopmentSynergies(definition)]).slice(0, 5),
    socialCosts: uniqueNonEmpty([...(definition.socialCosts ?? []), ...inferDevelopmentSocialCosts(definition)]).slice(0, 5),
    effects: definition.effects.map((effect) => ({ ...effect }))
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

function inferDevelopmentAliases(development: DevelopmentDefinition): string[] {
  const idWords = development.id
    .replace(/^sw_\d+_/, "")
    .split("_")
    .filter((word) => word.length > 2);
  const nameWords = development.name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  return uniqueNonEmpty([
    development.name,
    development.category ?? "",
    development.phase ?? "",
    ...idWords,
    ...nameWords,
    ...development.unlocks.flatMap((unlock) => unlock.toLowerCase().split(/[^a-z0-9]+/)).filter((word) => word.length > 3)
  ]);
}

function inferDevelopmentTradeoffs(development: DevelopmentDefinition): string[] {
  const text = developmentSearchText(development);
  const tradeoffs: string[] = [];
  const categoryTradeoffs: Record<DevelopmentCategory, string> = {
    foundational: "early stability costs starter labor and materials",
    governance: "coordination improves, but factions and succession constraints become harder to ignore",
    economy: "wealth tools can concentrate power, create dependence, or invite raids",
    labor: "labor policy changes output, legitimacy, happiness, and repair capacity together",
    social: "social cohesion improves, but public programs consume food, gold, and attention",
    information: "information control or openness changes trust, secrecy, and diplomatic credibility",
    law: "formal rules improve safety but constrain arbitrary sovereign action",
    security: "security networks improve warning at the cost of gold, secrecy, and suspicion",
    military: "military capacity diverts scarce iron, coal, people, and gold from growth",
    diplomacy: "external leverage depends on promises that others may keep, break, or fake",
    infrastructure: "fixed assets improve logistics but tie scarce resources to visible targets",
    long_horizon: "late institutions improve continuity but take resources before their payoff is certain"
  };
  if (development.category) tradeoffs.push(categoryTradeoffs[development.category]);
  if (usesScarceResources(development.cost)) tradeoffs.push("requires scarce resources that may force scouting, trade, conflict, or rationing");
  if (development.effects.some((effect) => effect.amount < 0)) tradeoffs.push("has negative side effects that the sovereign must consciously accept or mitigate");
  if (/\b(slavery|forced labor|quota|coerc|censor|propaganda|secrecy|restriction|monopoly|monopsony|tax farming)\b/.test(text)) {
    tradeoffs.push("can produce short-term control or output while damaging trust, safety, or legitimacy");
  }
  if (/\b(free press|assembly|rights|accountability|petition|public)\b/.test(text)) {
    tradeoffs.push("can strengthen legitimacy while making criticism, leaks, and faction pressure harder to suppress");
  }
  if (/\b(wall|gate|turret|fortress|siege|army|militia|conscription|mercenary|draft)\b/.test(text)) {
    tradeoffs.push("raises deterrence while signaling militarization to neighbors");
  }
  return tradeoffs;
}

function inferDevelopmentSynergies(development: DevelopmentDefinition): string[] {
  const text = developmentSearchText(development);
  const synergies: string[] = [];
  const categorySynergies: Record<DevelopmentCategory, string> = {
    foundational: "pairs with scouting, basic housing, resource control, and first laws",
    governance: "pairs with taxation, courts, diplomacy, and succession planning",
    economy: "pairs with markets, taxation, trade routes, debt, banking, and resource claims",
    labor: "pairs with construction, repairs, public works, abolition, or coercive production paths",
    social: "pairs with population growth, health, education, welfare, and civic legitimacy",
    information: "pairs with diplomacy, espionage, propaganda, public ledgers, or free press paths",
    law: "pairs with courts, policing, rights, taxation, anti-corruption, and treaty enforcement",
    security: "pairs with sentinels, counter-intelligence, gates, watchtowers, and witness ledgers",
    military: "pairs with walls, gates, turrets, siege units, doctrines, and scarce metal control",
    diplomacy: "pairs with messengers, treaties, safe-passage writs, trade, threats, and mergers",
    infrastructure: "pairs with construction resources, roads, bridges, repairs, housing, and supply lines",
    long_horizon: "pairs with archives, constitutional locks, reconstruction, and cross-century survival"
  };
  if (development.category) synergies.push(categorySynergies[development.category]);
  if (development.effects.some((effect) => effect.kind.startsWith("building_"))) synergies.push("strengthens buildings or fortifications already unlocked by related engineering");
  if (development.effects.some((effect) => effect.kind.startsWith("unit_"))) synergies.push("improves units that are trained, named, and assigned by the sovereign");
  if (development.effects.some((effect) => effect.kind === "population_cap")) synergies.push("supports larger populations when food, safety, happiness, and housing also keep up");
  if (development.effects.some((effect) => effect.kind === "yearly_gold_per_population" || effect.kind === "wealth")) synergies.push("compounds with population growth and controlled resource deposits");
  if (/\b(wall|fortress|gate|turret|watchtower)\b/.test(text)) synergies.push("combines with perimeter placement, gates, repair crews, and resource chokepoints");
  if (/\b(press|media|ledger|archive|intelligence|espionage|counter)\b/.test(text)) synergies.push("improves what the sovereign can verify, conceal, publish, or dispute");
  return synergies;
}

function inferDevelopmentSocialCosts(development: DevelopmentDefinition): string[] {
  const text = developmentSearchText(development);
  const costs: string[] = ["administrative burden and public opportunity cost"];
  if (usesScarceResources(development.cost)) costs.push("scarce-resource pressure can slow housing, defense, or trade alternatives");
  if (development.effects.some((effect) => effect.kind.includes("happiness") && effect.amount < 0)) costs.push("recurring happiness loss can threaten population growth and survival reviews");
  if (development.effects.some((effect) => effect.kind === "safety" && effect.amount < 0)) costs.push("safety loss increases the chance the population feels endangered");
  if (/\b(slavery|forced labor|quota|coerc|debt-bond)\b/.test(text)) costs.push("coercion creates severe legitimacy harm, resistance risk, and moral injury");
  if (/\b(censor|propaganda|secrecy|controlled media)\b/.test(text)) costs.push("truth and trust costs can poison diplomacy and internal feedback");
  if (/\b(conscription|draft|war|army|militia|mercenary|siege|shock)\b/.test(text)) costs.push("militarization risks casualties, fear, and family disruption");
  if (/\b(tax|tariff|toll|levy|debt|bond|monopoly|monopsony|procurement)\b/.test(text)) costs.push("households and traders may bear heavier burdens or resentment");
  if (/\b(migration restriction|assimilation|exile|minority|religious)\b/.test(text)) costs.push("identity pressure can create exclusion, unrest, or legitimacy disputes");
  if (/\b(free press|assembly|petition|rights|accountability)\b/.test(text)) costs.push("public contestation can expose mistakes, faction conflict, or broken promises");
  return costs;
}

function developmentSearchText(development: DevelopmentDefinition): string {
  return `${development.id} ${development.name} ${development.description} ${development.category ?? ""} ${development.unlocks.join(" ")}`.toLowerCase();
}

function usesScarceResources(cost: ResourceCost): boolean {
  return scarceMapResourceTypes.some((type) => (cost[type] ?? 0) > 0);
}

const generatedDevelopmentCatalog = buildGeneratedDevelopmentCatalog();
export const developmentCatalog: Record<DevelopmentId, Development> = {
  ...Object.fromEntries(Object.values(coreDevelopmentCatalog).map((development) => [development.id, normalizeDevelopment(development)])),
  ...Object.fromEntries(Object.values(generatedDevelopmentCatalog).map((development) => [development.id, normalizeDevelopment(development)]))
};
export const developmentIds: readonly DevelopmentId[] = Object.freeze([...coreDevelopmentIds, ...Object.keys(generatedDevelopmentCatalog)]);

const buildingCosts: Record<BuildableBuildingType, ResourceCost> = {
  farm: { wood: 60 },
  house: { wood: 45, clay: 25, stone: 15, food: 20 },
  watchtower: { wood: 80, stone: 60, clay: 30, limestone: 20, gold: 50 },
  wall: { wood: 20, stone: 30, clay: 25, limestone: 15 },
  gate: { wood: 35, stone: 45, clay: 20, limestone: 25, iron: 20 },
  turret: { wood: 90, stone: 100, limestone: 35, iron: 45, coal: 30, gold: 60 }
};

const buildingRepairCosts: Record<BuildingType, ResourceCost> = {
  townHall: { wood: 30, stone: 25, clay: 10 },
  farm: { wood: 10 },
  house: { wood: 10, clay: 6, stone: 4 },
  barracks: { wood: 18, stone: 12 },
  market: { wood: 15, stone: 10, gold: 5 },
  watchtower: { wood: 20, stone: 20, limestone: 8 },
  wall: { stone: 12, clay: 8, limestone: 5 },
  gate: { wood: 12, stone: 16, limestone: 8, iron: 5 },
  turret: { stone: 25, limestone: 10, iron: 12, coal: 5 }
};

const buildingDevelopmentRequirements: Record<BuildableBuildingType, DevelopmentId[]> = {
  farm: [],
  house: [],
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
  house: { maxHp: 150, armor: 1, visionRadius: 5, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  barracks: { maxHp: 220, armor: 3, visionRadius: 7, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  market: { maxHp: 200, armor: 2, visionRadius: 7, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  watchtower: { maxHp: 260, armor: 3, visionRadius: 12, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  wall: { maxHp: 240, armor: 6, visionRadius: 3, blocksMovement: true, attack: 0, range: 0, cooldownTicks: 0 },
  gate: { maxHp: 220, armor: 5, visionRadius: 4, blocksMovement: false, attack: 0, range: 0, cooldownTicks: 0 },
  turret: { maxHp: 320, armor: 5, visionRadius: 11, blocksMovement: false, attack: 9, range: 7, cooldownTicks: Math.round(TICK_RATE * 1.4) }
};

type BuildingStatDefinition = (typeof buildingStats)[BuildingType];

function effectiveUnitStats(state: GameState, tribeId: TribeId, type: UnitType): UnitStatDefinition {
  const stats = { ...unitStats[type] };
  stats.speed = Number((stats.speed + developmentEffectAmount(state, tribeId, "unit_speed", type)).toFixed(2));
  stats.visionRadius += Math.round(developmentEffectAmount(state, tribeId, "unit_vision", type));
  stats.armor += Math.round(developmentEffectAmount(state, tribeId, "unit_armor", type));
  stats.attack += Math.round(developmentEffectAmount(state, tribeId, "unit_attack", type));
  return stats;
}

function effectiveBuildingStats(state: GameState, tribeId: TribeId, type: BuildingType): BuildingStatDefinition {
  const stats = { ...buildingStats[type] };
  stats.maxHp += Math.round(developmentEffectAmount(state, tribeId, "building_max_hp", type));
  stats.armor += Math.round(developmentEffectAmount(state, tribeId, "building_armor", type));
  stats.attack += Math.round(developmentEffectAmount(state, tribeId, "building_attack", type));
  stats.range += developmentEffectAmount(state, tribeId, "building_range", type);
  return stats;
}

function hasActiveForcedLabor(state: GameState, tribeId: TribeId): boolean {
  return hasDevelopment(state, tribeId, "forced_labor") && !hasDevelopment(state, tribeId, "abolition");
}

function developmentEffectAmount(state: GameState, tribeId: TribeId, kind: DevelopmentEffectKind, target?: UnitType | BuildingType | string): number {
  let total = 0;
  for (const developmentId of state.tribes[tribeId]?.developments ?? []) {
    if (!isDevelopmentEffectActive(state, tribeId, developmentId)) continue;
    const development = developmentCatalog[developmentId];
    if (!development) continue;
    for (const effect of development.effects) {
      if (effect.kind !== kind) continue;
      if (!developmentEffectMatchesTarget(effect, target)) continue;
      total += effect.amount;
    }
  }
  return total;
}

function isDevelopmentEffectActive(state: GameState, tribeId: TribeId, developmentId: DevelopmentId): boolean {
  return !(developmentId === "forced_labor" && hasDevelopment(state, tribeId, "abolition"));
}

function developmentEffectMatchesTarget(effect: DevelopmentEffect, target?: UnitType | BuildingType | string): boolean {
  if (!effect.target || effect.target === "all" || !target) return true;
  if (effect.target === target) return true;
  if (effect.target === "military") return target === "militia" || target === "archer" || target === "siege_engine" || target === "battering_ram" || target === "catapult";
  if (effect.target === "logistics") return target === "peon" || target === "messenger" || target === "trader" || target === "siege_engine" || target === "battering_ram" || target === "catapult";
  if (effect.target === "siege_engine") return target === "siege_engine" || target === "battering_ram" || target === "catapult";
  if (effect.target === "worker") return target === "peon";
  if (effect.target === "fortification") return target === "wall" || target === "gate" || target === "turret" || target === "watchtower";
  return false;
}

function developmentCostMultiplier(state: GameState, tribeId: TribeId, kind: "construction_cost_multiplier" | "repair_cost_multiplier"): number {
  return clamp(1 + developmentEffectAmount(state, tribeId, kind), 0.45, 1.5);
}

export function createRandomGameSeed(): number {
  return ((Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0) || 1;
}

export function createGame(seed = createRandomGameSeed()): GameState {
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
    projectiles: {},
    events: [],
    aiDecisions: [],
    sovereignDecisionCursors: {} as Record<TribeId, SovereignDecisionCursor>,
    foreignObservations: {} as Record<TribeId, ForeignObservation[]>,
    foreignObservationMemory: {} as Record<TribeId, ForeignObservationMemory>,
    aiInformationRequests: [],
    postGameLearnings: [],
    resourceDenials: [],
    resourceDepletions: [],
    civilizationMergers: [],
    fortificationPlans: [],
    gateOperations: [],
    gateAccessTreaties: [],
    gateTreatyIncidents: [],
    gateSabotageHistory: [],
    siegePlans: [],
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

  addEvent(state, "WORLD_STARTED", "World seeded", "Your people awaken to a wider valley beyond their maps.", "all");
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
    updateGateOperations(state);
    updateGateAccessTreaties(state);
    updateGateSabotage(state);
    updateScriptedAi(state);
    updateUnits(state);
    updateCombat(state);
    updateProjectiles(state);
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

export function isTribeMerged(state: GameState, tribeId: TribeId): boolean {
  return Boolean(state.tribes[tribeId]?.mergedIntoTribeId);
}

export function isTribeActive(state: GameState, tribeId: TribeId): boolean {
  const tribe = state.tribes[tribeId];
  return Boolean(tribe && !tribe.eliminated && !tribe.mergedIntoTribeId);
}

export function issueSovereignOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (state.tribes[tribeId].eliminated) return { ok: false, reason: `${state.tribes[tribeId].name} has been eliminated` };
  if (state.tribes[tribeId].mergedIntoTribeId) {
    return { ok: false, reason: `${state.tribes[tribeId].name} has merged into ${state.tribes[state.tribes[tribeId].mergedIntoTribeId].name}` };
  }
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
        order.diplomacyIntent ?? inferDiplomacyIntent(order.messageType ?? "LETTER", order.body),
        {
          mergerLeaderTribeId: order.mergerLeaderTribeId,
          mergerTerms: order.mergerTerms
        }
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
	      const buildingType = order.buildingType ?? "farm";
	      const target = orderBuildTarget(order, townHall);
	      const perimeter = buildPerimeterFromOrder(state, tribeId, order, buildingType, target);
	      if (perimeter) {
	        if (!perimeter.ok) return { ok: false, reason: perimeter.reason };
	        return { ok: true, summary: perimeter.summary };
	      }
	      const result = buildStructure(state, tribeId, buildingType, target);
	      if (!result.ok) return { ok: false, reason: result.reason };
	      recordFortificationPlanFromOrder(state, tribeId, order, result.buildingId, buildingType);
	      return { ok: true, summary: `built ${buildingType}` };
	    }
    case "SET_GATE": {
      const result = setGateState(state, tribeId, order.gateState ?? "locked", order.buildingId, order.gateAccessPolicy);
      if (!result.ok) return { ok: false, reason: result.reason };
      recordGateOperationFromOrder(state, tribeId, order, result.buildingId, { activate: hasGateOperationIntent(order) });
      return { ok: true, summary: result.summary };
    }
    case "GATE_OPERATION":
      return applyGateOperationOrder(state, tribeId, order);
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
      addEvent(state, "AI_SCOUT_ORDER", `${state.tribes[tribeId].name} sends a sentinel`, `${sentinel.name} scouts toward ${target.x},${target.y}.`, [tribeId]);
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
      addEvent(state, "AI_DEFEND_ORDER", `${state.tribes[tribeId].name} consolidates defense`, `${moved} defenders move toward the town hall.`, [tribeId]);
      return { ok: true, summary: `moved ${moved} defenders` };
    }
    case "ATTACK":
      return issueAttackOrder(state, tribeId, order.recipientTribeId, order.reason, order.targetBuildingId ?? order.buildingId, orderResourceTarget(order), order);
    case "REPAIR":
      return issueRepairOrder(state, tribeId, order.targetBuildingId ?? order.buildingId, order);
    case "REPORT_BUG": {
      const title = clampText(order.subject ?? "AI self-report", 80);
      const body = clampText(order.body || order.reason, 260);
      addEvent(state, "AI_SELF_REPORT", `${state.tribes[tribeId].name} reports an issue`, formatBugReportEventBody(title, body, order), [tribeId]);
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
      addEvent(state, "AI_INFO_REQUEST", `${state.tribes[tribeId].name} requests information`, `${subject}: ${body}`, [tribeId]);
      answerInformationRequest(state, request);
      return { ok: true, summary: subject };
    }
    case "SET_POLICY":
      addEvent(state, "AI_POLICY", `${state.tribes[tribeId].name} sets policy`, clampText(order.reason, 180), [tribeId]);
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

function orderResourceTarget(order: AiStrategicOrder): { x: number; y: number; type?: ResourceType } | undefined {
  const x = Number(order.targetX);
  const y = Number(order.targetY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return {
    x: clamp(Math.round(x), 0, MAP_SIZE - 1),
    y: clamp(Math.round(y), 0, MAP_SIZE - 1),
    type: order.targetResourceType
  };
}

function orderRetreatTarget(order: AiStrategicOrder | undefined, fallback: Position): Position | undefined {
  const threshold = optionalOrderNumber(order?.retreatHealthPct, 100);
  const timedWithdrawal = optionalOrderNumber(order?.feintDurationTicks, TICK_RATE * 120);
  const x = Number(order?.retreatX);
  const y = Number(order?.retreatY);
  if (!threshold && !timedWithdrawal && (!Number.isFinite(x) || !Number.isFinite(y))) return undefined;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
  return {
    x: clamp(Math.round(x), 1, MAP_SIZE - 2),
    y: clamp(Math.round(y), 1, MAP_SIZE - 2)
  };
}

function orderAssemblyTarget(order: AiStrategicOrder | undefined): Position | undefined {
  const x = Number(order?.assemblyX);
  const y = Number(order?.assemblyY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return {
    x: clamp(Math.round(x), 1, MAP_SIZE - 2),
    y: clamp(Math.round(y), 1, MAP_SIZE - 2)
  };
}

function optionalOrderText(value: string | undefined, maxLength: number): string | undefined {
  const clean = clampText(value ?? "", maxLength);
  return clean.length > 0 ? clean : undefined;
}

function optionalOrderNumber(value: number | undefined, max: number): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return Math.min(max, Math.max(1, Math.round(number)));
}

function pushBoundedRecord<T>(records: T[], record: T, maxLength: number): void {
  records.push(record);
  if (records.length > maxLength) records.splice(0, records.length - maxLength);
}

function hasGateOperationIntent(order: AiStrategicOrder): boolean {
  return Boolean(
    optionalOrderText(order.gateOperationIntent, 120) ||
      optionalOrderText(order.gateTerms, 300) ||
      optionalOrderText(order.gatePublicNotice, 220) ||
      order.gateEntryAction ||
      order.gateTollMode ||
      order.gateUnpaidAction ||
      optionalOrderNumber(order.gateTollGold, 100000) !== undefined ||
      order.gateDetainedPacketAction ||
      optionalOrderText(order.gateDetainedPacketId, 80) ||
      optionalOrderNumber(order.gateRansomGold, 100000) !== undefined ||
      optionalOrderText(order.gateReleaseSubject, 80) ||
      optionalOrderText(order.gateReleaseMessage, 600) ||
      order.gateAccessTreatyAction ||
      optionalOrderText(order.gateAccessTreatyName, 100) ||
      optionalOrderText(order.gateAccessTreatyTerms, 360) ||
      optionalOrderNumber(order.gateAccessTreatyDurationTicks, TICKS_PER_GAME_YEAR * 100) !== undefined ||
      order.gateSabotageAction ||
      optionalOrderNumber(order.gateSabotageDurationTicks, TICKS_PER_GAME_YEAR * 20) !== undefined ||
      optionalOrderNumber(order.gateSabotageDamage, 5000) !== undefined ||
      optionalOrderNumber(order.gateOperationDurationTicks, TICKS_PER_GAME_YEAR * 100) !== undefined ||
      order.recipientTribeId
  );
}

function isBuildableFortification(buildingType: BuildableBuildingType): boolean {
  return buildingType === "wall" || buildingType === "gate" || buildingType === "turret" || buildingType === "watchtower";
}

function recordFortificationPlanFromOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder,
  buildingId: string,
  buildingType: BuildableBuildingType,
  segment?: {
    groupId?: string;
    index?: number;
    count?: number;
    pattern?: PerimeterPattern;
    direction?: PerimeterDirection;
    length?: number;
    gateIndex?: number;
  }
): FortificationPlanRecord | undefined {
  if (!isBuildableFortification(buildingType) && !order.fortificationIntent && !order.perimeterStrategy && !order.perimeterShape) return undefined;
  const building = state.buildings[buildingId];
  if (!building) return undefined;
  const record: FortificationPlanRecord = {
    id: nextId(state, "fortplan"),
    tick: state.tick,
    tribeId,
    buildingId,
    buildingType,
    x: building.x,
    y: building.y,
    requestedX: Number.isFinite(order.targetX) ? Number(order.targetX) : undefined,
    requestedY: Number.isFinite(order.targetY) ? Number(order.targetY) : undefined,
    fortificationIntent: optionalOrderText(order.fortificationIntent, 120),
    perimeterStrategy: optionalOrderText(order.perimeterStrategy, 320),
    perimeterShape: optionalOrderText(order.perimeterShape, 140),
    perimeterPattern: segment?.pattern ?? order.perimeterPattern,
    perimeterDirection: segment?.direction ?? order.perimeterDirection,
    perimeterLength: segment?.length ?? optionalOrderNumber(order.perimeterLength, 12),
    perimeterGateIndex: segment?.gateIndex ?? optionalOrderNumber(order.perimeterGateIndex, 12),
    perimeterGroupId: segment?.groupId,
    perimeterSegmentIndex: segment?.index,
    perimeterSegmentCount: segment?.count,
    placementPreview: buildFortificationPlacementPreview(state, tribeId, [buildingId], {
      requestedX: Number.isFinite(order.targetX) ? Number(order.targetX) : undefined,
      requestedY: Number.isFinite(order.targetY) ? Number(order.targetY) : undefined
    }),
    reason: optionalOrderText(order.reason, 220) ?? "No stated fortification reason."
  };
  pushBoundedRecord(state.fortificationPlans, record, 120);
  addEvent(
    state,
    "FORTIFICATION_PLAN_RECORDED",
    `${state.tribes[tribeId].name} records a fortification plan`,
    `${buildingType} ${buildingId} at ${building.x},${building.y}. ${record.fortificationIntent ? `Intent: ${record.fortificationIntent}. ` : ""}${
      record.perimeterStrategy ? `Plan: ${record.perimeterStrategy}` : record.reason
    }${record.placementPreview ? ` Preview: ${record.placementPreview.summary}` : ""}`,
    [tribeId]
  );
  return record;
}

function refreshFortificationGroupPlacementPreview(state: GameState, tribeId: TribeId, groupId: string): void {
  const groupPlans = state.fortificationPlans.filter((plan) => plan.perimeterGroupId === groupId && plan.tribeId === tribeId);
  if (groupPlans.length === 0) return;
  const preview = buildFortificationPlacementPreview(
    state,
    tribeId,
    groupPlans.map((plan) => plan.buildingId),
    {
      requestedX: groupPlans.find((plan) => Number.isFinite(plan.requestedX))?.requestedX,
      requestedY: groupPlans.find((plan) => Number.isFinite(plan.requestedY))?.requestedY
    }
  );
  if (!preview) return;
  for (const plan of groupPlans) plan.placementPreview = preview;
}

function buildFortificationPlacementPreview(
  state: GameState,
  tribeId: TribeId,
  buildingIds: string[],
  request: { requestedX?: number; requestedY?: number } = {}
): FortificationPlacementPreview | undefined {
  const buildings = buildingIds
    .map((buildingId) => state.buildings[buildingId])
    .filter((building): building is Building => Boolean(building && building.hp > 0));
  if (buildings.length === 0) return undefined;
  const resolvedTiles = buildings.map((building) => ({ buildingId: building.id, buildingType: building.type as BuildableBuildingType, x: building.x, y: building.y }));
  const resolvedCenter = averageBuildingPosition(buildings);
  const requestedCenter =
    Number.isFinite(request.requestedX) && Number.isFinite(request.requestedY)
      ? { x: Math.round(Number(request.requestedX)), y: Math.round(Number(request.requestedY)) }
      : undefined;
  const gates = buildings.filter((building) => building.type === "gate");
  const blocking = buildings.filter((building) => isBuildingMovementBlocking(building));
  const nearestForeign = nearestForeignTownHall(state, tribeId, resolvedCenter);
  const ownerGatePassableCount = gates.filter((gate) => isTileWalkable(state, gate.x, gate.y, tribeId)).length;
  const foreignGatePassableCount = nearestForeign ? gates.filter((gate) => isTileWalkable(state, gate.x, gate.y, nearestForeign.tribeId)).length : 0;
  const routeChecks = buildFortificationRouteChecks(state, tribeId, buildingIds, resolvedCenter, nearestForeign);
  const routeBlockedByPlacementCount = routeChecks.filter((check) => check.blockedByPlacement).length;
  const maxAddedRouteSteps = routeChecks.reduce((max, check) => Math.max(max, check.addedSteps), 0);
  const summaryParts = [
    `resolved ${buildings.length} tile${buildings.length === 1 ? "" : "s"}`,
    `${blocking.length} blocking`,
    gates.length > 0 ? `${ownerGatePassableCount}/${gates.length} gates passable to owner` : "no gates",
    nearestForeign ? `${foreignGatePassableCount}/${gates.length} gates passable to nearest foreign ${nearestForeign.tribeId}` : "no foreign town route",
    routeBlockedByPlacementCount > 0 ? `${routeBlockedByPlacementCount} route checks blocked` : `max route detour ${maxAddedRouteSteps}`
  ];
  return {
    resolvedTiles,
    requestedCenter,
    resolvedCenter,
    resolvedMoved: requestedCenter ? Math.round(requestedCenter.x) !== Math.round(resolvedCenter.x) || Math.round(requestedCenter.y) !== Math.round(resolvedCenter.y) : false,
    blockingTileCount: blocking.length,
    blockingBuildingIds: blocking.map((building) => building.id),
    gateCount: gates.length,
    gatePassageBuildingIds: gates.filter((gate) => isTileWalkable(state, gate.x, gate.y, tribeId)).map((gate) => gate.id),
    ownerGatePassableCount,
    foreignGatePassableCount,
    nearestForeignTribeId: nearestForeign?.tribeId,
    routeChecks,
    routeBlockedByPlacementCount,
    maxAddedRouteSteps,
    summary: summaryParts.join("; ")
  };
}

function buildFortificationRouteChecks(
  state: GameState,
  tribeId: TribeId,
  buildingIds: string[],
  resolvedCenter: Position,
  nearestForeign: { tribeId: TribeId; townHall: Building } | undefined
): FortificationRoutePreview[] {
  const ownerTownHall = findTownHall(state, tribeId);
  if (!ownerTownHall) return [];
  const checks: FortificationRoutePreview[] = [
    compareRouteWithAndWithoutBuildings(state, buildingIds, "owner_to_fortification", tribeId, ownerTownHall, resolvedCenter)
  ];
  if (nearestForeign) {
    checks.push(compareRouteWithAndWithoutBuildings(state, buildingIds, "owner_to_nearest_foreign_town", tribeId, ownerTownHall, nearestForeign.townHall));
    checks.push(
      compareRouteWithAndWithoutBuildings(state, buildingIds, "nearest_foreign_to_owner_town", nearestForeign.tribeId, nearestForeign.townHall, ownerTownHall)
    );
  }
  return checks;
}

function compareRouteWithAndWithoutBuildings(
  state: GameState,
  buildingIds: string[],
  label: string,
  tribeId: TribeId,
  from: Position,
  to: Position
): FortificationRoutePreview {
  const current = routeProbe(state, tribeId, from, to);
  const baseline = withBuildingsTemporarilyRemoved(state, buildingIds, () => routeProbe(state, tribeId, from, to));
  const addedSteps =
    current.reachable && baseline.reachable ? Math.max(0, (current.pathLength ?? 0) - (baseline.pathLength ?? 0)) : current.reachable || !baseline.reachable ? 0 : 9999;
  return {
    label,
    tribeId,
    fromX: Math.round(from.x),
    fromY: Math.round(from.y),
    toX: Math.round(to.x),
    toY: Math.round(to.y),
    baselineReachable: baseline.reachable,
    currentReachable: current.reachable,
    baselinePathLength: baseline.pathLength,
    currentPathLength: current.pathLength,
    blockedByPlacement: baseline.reachable && !current.reachable,
    addedSteps
  };
}

function routeProbe(state: GameState, tribeId: TribeId, from: Position, to: Position): { reachable: boolean; pathLength?: number } {
  const start = findNearestWalkable(state, from, tribeId) ?? { x: Math.round(from.x), y: Math.round(from.y) };
  const goal = findNearestWalkable(state, to, tribeId) ?? { x: Math.round(to.x), y: Math.round(to.y) };
  const path = findPath(state, { x: start.x, y: start.y, tribeId }, goal);
  const reachable = pathArrives(path, goal);
  return { reachable, pathLength: reachable ? path.length : undefined };
}

function withBuildingsTemporarilyRemoved<T>(state: GameState, buildingIds: string[], run: () => T): T {
  const removed: Array<[string, Building]> = [];
  for (const buildingId of buildingIds) {
    const building = state.buildings[buildingId];
    if (!building) continue;
    removed.push([buildingId, building]);
    delete state.buildings[buildingId];
  }
  try {
    return run();
  } finally {
    for (const [buildingId, building] of removed) state.buildings[buildingId] = building;
  }
}

function averageBuildingPosition(buildings: Building[]): Position {
  return {
    x: Number((buildings.reduce((sum, building) => sum + building.x, 0) / buildings.length).toFixed(2)),
    y: Number((buildings.reduce((sum, building) => sum + building.y, 0) / buildings.length).toFixed(2))
  };
}

function nearestForeignTownHall(state: GameState, tribeId: TribeId, origin: Position): { tribeId: TribeId; townHall: Building } | undefined {
  return tribeIds
    .filter((other) => other !== tribeId && isTribeActive(state, other))
    .flatMap((other) => {
      const townHall = findTownHall(state, other);
      return townHall ? [{ tribeId: other, townHall, distance: Math.hypot(townHall.x - origin.x, townHall.y - origin.y) }] : [];
    })
    .sort((left, right) => left.distance - right.distance || left.tribeId.localeCompare(right.tribeId))[0];
}

function findGateSaboteurUnit(state: GameState, tribeId: TribeId, gate: Building): Unit | undefined {
  return Object.values(state.units)
    .filter(
      (unit) =>
        unit.tribeId === tribeId &&
        unit.hp > 0 &&
        unit.type !== "messenger" &&
        unit.type !== "trader" &&
        distance(unit, gate) <= 2.5
    )
    .sort((left, right) => distance(left, gate) - distance(right, gate) || left.id.localeCompare(right.id))[0];
}

function orderHasForeignGateControlFields(order: AiStrategicOrder): boolean {
  return Boolean(
    order.gateState ||
      order.gateAccessPolicy ||
      order.gateEntryAction ||
      order.gateTollMode ||
      order.gateUnpaidAction ||
      order.gateTollGold ||
      order.gateDetainedPacketAction ||
      order.gateDetainedPacketId ||
      order.gateRansomGold ||
      order.gateReleaseSubject ||
      order.gateReleaseMessage ||
      order.gateAccessTreatyAction ||
      order.gateAccessTreatyName ||
      order.gateAccessTreatyTerms ||
      order.gateAccessTreatyDurationTicks
  );
}

function resolveGateForOperation(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder
): { ok: true; gate: Building; owned: boolean; saboteur?: Unit } | { ok: false; reason: string } {
  const requestedId = order.gateSabotageAction ? order.targetBuildingId ?? order.buildingId : order.buildingId ?? order.targetBuildingId;
  const gate = requestedId
    ? state.buildings[requestedId]
    : Object.values(state.buildings)
        .filter((building) => building.tribeId === tribeId && building.type === "gate" && building.hp > 0)
        .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!gate || gate.hp <= 0) return { ok: false, reason: "no living gate found" };
  if (gate.type !== "gate") return { ok: false, reason: "selected building is not a gate" };
  if (gate.tribeId === tribeId) return { ok: true, gate, owned: true };
  if (!order.gateSabotageAction) return { ok: false, reason: "cannot control another tribe's gate" };
  if (orderHasForeignGateControlFields(order)) return { ok: false, reason: "foreign gate operation can only use explicit sabotage fields" };
  const saboteur = findGateSaboteurUnit(state, tribeId, gate);
  if (!saboteur) return { ok: false, reason: "foreign gate sabotage requires a nearby living non-messenger unit" };
  return { ok: true, gate, owned: false, saboteur };
}

function recordGateOperationFromOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder,
  buildingId: string,
  options: { activate: boolean }
): GateOperationRecord | undefined {
  const gate = state.buildings[buildingId];
  if (!gate || gate.type !== "gate" || gate.hp <= 0) return undefined;
  const durationTicks = optionalOrderNumber(order.gateOperationDurationTicks, TICKS_PER_GAME_YEAR * 100);
  const record: GateOperationRecord = {
    id: nextId(state, "gateop"),
    tick: state.tick,
    tribeId,
    buildingId,
    gateState: gate.gateState,
    gateAccessPolicy: gate.gateAccessPolicy,
    targetTribeId: order.recipientTribeId,
    gateOperationIntent: optionalOrderText(order.gateOperationIntent, 120),
    gateTerms: optionalOrderText(order.gateTerms, 320),
    gatePublicNotice: optionalOrderText(order.gatePublicNotice, 220),
    entryAction: order.gateEntryAction,
    tollMode: order.gateTollMode,
    unpaidAction: order.gateUnpaidAction,
    tollGold: optionalOrderNumber(order.gateTollGold, 100000),
    detainedPacketAction: order.gateDetainedPacketAction,
    detainedPacketId: optionalOrderText(order.gateDetainedPacketId, 80),
    ransomGold: optionalOrderNumber(order.gateRansomGold, 100000),
    releaseSubject: optionalOrderText(order.gateReleaseSubject, 80),
    releaseMessage: optionalOrderText(order.gateReleaseMessage, 600),
    accessTreatyAction: order.gateAccessTreatyAction,
    accessTreatyName: optionalOrderText(order.gateAccessTreatyName, 100),
    accessTreatyTerms: optionalOrderText(order.gateAccessTreatyTerms, 360),
    accessTreatyDurationTicks: optionalOrderNumber(order.gateAccessTreatyDurationTicks, TICKS_PER_GAME_YEAR * 100),
    sabotageAction: order.gateSabotageAction,
    sabotageDurationTicks: optionalOrderNumber(order.gateSabotageDurationTicks, TICKS_PER_GAME_YEAR * 20),
    sabotageDamage: optionalOrderNumber(order.gateSabotageDamage, 5000),
    expiresAtTick: durationTicks ? state.tick + durationTicks : undefined,
    reason: optionalOrderText(order.reason, 220) ?? "No stated gate operation reason."
  };
  pushBoundedRecord(state.gateOperations, record, 120);
  if (options.activate) gate.gateOperation = record;
  return record;
}

function applyGateAccessTreatyOperation(
  state: GameState,
  tribeId: TribeId,
  gate: Building,
  record: GateOperationRecord
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (!record.accessTreatyAction) return { ok: true, summary: "no access treaty action" };
  if (gate.tribeId !== tribeId) return { ok: false, reason: "only a gate owner can grant or revoke access treaties" };
  const targetTribeId = record.targetTribeId;
  if (!targetTribeId || targetTribeId === tribeId) return { ok: false, reason: "access treaty requires a counterparty tribe" };
  const treaty: GateAccessTreatyRecord = {
    id: nextId(state, "gatetreaty"),
    tick: state.tick,
    tribeId,
    buildingId: gate.id,
    targetTribeId,
    action: record.accessTreatyAction,
    treatyName: record.accessTreatyName,
    treatyTerms: record.accessTreatyTerms ?? record.gateTerms,
    publicNotice: record.gatePublicNotice,
    expiresAtTick: record.accessTreatyAction === "grant" && record.accessTreatyDurationTicks ? state.tick + record.accessTreatyDurationTicks : undefined,
    reason: record.reason
  };
  pushBoundedRecord(state.gateAccessTreaties, treaty, 160);
  addEvent(
    state,
    record.accessTreatyAction === "grant" ? "GATE_ACCESS_TREATY_GRANTED" : "GATE_ACCESS_TREATY_REVOKED",
    `${state.tribes[tribeId].name} ${record.accessTreatyAction === "grant" ? "grants" : "revokes"} gate passage`,
    `Gate ${gate.id} at ${gate.x},${gate.y} ${record.accessTreatyAction === "grant" ? "grants controlled passage to" : "revokes controlled passage from"} ${
      state.tribes[targetTribeId].name
    }${treaty.expiresAtTick ? ` until turn ${treaty.expiresAtTick}` : ""}. ${record.accessTreatyTerms ?? record.reason}`,
    [tribeId, targetTribeId]
  );
  return { ok: true, summary: `${record.accessTreatyAction} access treaty ${treaty.id}` };
}

function applyGateSabotageOperation(
  state: GameState,
  tribeId: TribeId,
  gate: Building,
  record: GateOperationRecord,
  saboteur?: Unit
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (!record.sabotageAction) return { ok: true, summary: "no sabotage action" };
  const base: Omit<GateSabotageRecord, "id"> = {
    tick: state.tick,
    tribeId,
    buildingId: gate.id,
    targetTribeId: record.targetTribeId,
    action: record.sabotageAction,
    previousGateState: gate.gateSabotage?.previousGateState ?? gate.gateState ?? "open",
    reason: record.reason
  };

  if (record.sabotageAction === "clear") {
    const previous = gate.gateSabotage;
    if (previous) gate.gateState = previous.previousGateState ?? gate.gateState ?? "open";
    delete gate.gateSabotage;
    pushBoundedRecord(state.gateSabotageHistory, { id: nextId(state, "gatesabotage"), ...base }, 120);
    addEvent(
      state,
      "GATE_SABOTAGE_CLEARED",
      `${state.tribes[tribeId].name} clears gate sabotage`,
      `Gate ${gate.id} at ${gate.x},${gate.y} is cleared of sabotage and is now ${gate.gateState ?? "open"}. ${record.reason}`,
      [gate.tribeId, tribeId]
    );
    return { ok: true, summary: `cleared sabotage on ${gate.id}` };
  }

  if (record.sabotageAction === "damage") {
    const damage = record.sabotageDamage ?? 45;
    const beforeHp = gate.hp;
    const destroyed = applyBuildingDamage(state, gate, damage, tribeId);
    pushBoundedRecord(state.gateSabotageHistory, { id: nextId(state, "gatesabotage"), ...base, damage }, 120);
    addEvent(
      state,
      "GATE_SABOTAGE_DAMAGED",
      `${state.tribes[tribeId].name} sabotages a gate`,
      `${saboteur ? `${saboteur.name} ` : ""}damages gate ${gate.id} at ${gate.x},${gate.y} for ${Math.max(0, beforeHp - Math.max(0, gate.hp))} hp.${
        destroyed ? " The gate is destroyed." : ""
      } ${record.reason}`,
      [gate.tribeId, tribeId]
    );
    return { ok: true, summary: `damaged ${gate.id}` };
  }

  const expiresAtTick = record.sabotageDurationTicks ? state.tick + record.sabotageDurationTicks : undefined;
  const sabotage: GateSabotageState = {
    id: nextId(state, "gatesabotage"),
    tick: state.tick,
    tribeId,
    targetTribeId: record.targetTribeId,
    action: record.sabotageAction,
    previousGateState: gate.gateSabotage?.previousGateState ?? gate.gateState ?? "open",
    expiresAtTick,
    reason: record.reason
  };
  gate.gateSabotage = sabotage;
  gate.gateState = record.sabotageAction === "force_open" ? "open" : "locked";
  pushBoundedRecord(
    state.gateSabotageHistory,
    {
      id: sabotage.id,
      ...base,
      action: record.sabotageAction,
      previousGateState: sabotage.previousGateState,
      expiresAtTick
    },
    120
  );
  addEvent(
    state,
    record.sabotageAction === "force_open" ? "GATE_SABOTAGED_OPEN" : "GATE_SABOTAGED_CLOSED",
    `${state.tribes[tribeId].name} sabotages a gate`,
    `${saboteur ? `${saboteur.name} ` : ""}${record.sabotageAction === "force_open" ? "forces open" : "jams shut"} gate ${gate.id} at ${gate.x},${gate.y}${
      expiresAtTick ? ` until turn ${expiresAtTick}` : ""
    }. ${record.reason}`,
    [gate.tribeId, tribeId]
  );
  return { ok: true, summary: `${record.sabotageAction} on ${gate.id}` };
}

function applyGateOperationOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  const resolved = resolveGateForOperation(state, tribeId, order);
  if (!resolved.ok) return resolved;
  const gate = resolved.gate;
  if (resolved.owned && order.gateState) gate.gateState = order.gateState;
  if (resolved.owned && order.gateAccessPolicy) gate.gateAccessPolicy = order.gateAccessPolicy;
  const record = recordGateOperationFromOrder(state, tribeId, order, gate.id, { activate: true });
  if (!record) return { ok: false, reason: "could not record gate operation" };
  addEvent(
    state,
    "GATE_OPERATION_SET",
    `${state.tribes[tribeId].name} issues private gate orders`,
    `Gate ${gate.id} at ${gate.x},${gate.y}: ${record.gateOperationIntent ?? "custom operation"}. ${
      record.gateTerms ? `Private terms: ${record.gateTerms}. ` : ""
    }${record.targetTribeId ? `Counterparty: ${state.tribes[record.targetTribeId].name}. ` : ""}${
      record.entryAction ? `Entry action: ${record.entryAction}. ` : ""
    }${record.tollGold ? `Toll: ${record.tollGold} gold${record.tollMode ? ` (${record.tollMode})` : ""}. ` : ""}${
      record.unpaidAction ? `Unpaid action: ${record.unpaidAction}. ` : ""
    }${record.detainedPacketAction ? `Detained packet action: ${record.detainedPacketAction}. ` : ""}${
      record.detainedPacketId ? `Packet: ${record.detainedPacketId}. ` : ""
    }${record.ransomGold ? `Ransom: ${record.ransomGold} gold. ` : ""}${
      record.releaseSubject || record.releaseMessage ? "Release message prepared. " : ""
    }${record.accessTreatyAction ? `Access treaty: ${record.accessTreatyAction}. ` : ""}${
      record.accessTreatyName ? `Treaty name: ${record.accessTreatyName}. ` : ""
    }${record.accessTreatyDurationTicks ? `Treaty duration: ${record.accessTreatyDurationTicks} ticks. ` : ""}${
      record.sabotageAction ? `Sabotage: ${record.sabotageAction}. ` : ""
    }${record.sabotageDamage ? `Sabotage damage: ${record.sabotageDamage}. ` : ""}${
      record.sabotageDurationTicks ? `Sabotage duration: ${record.sabotageDurationTicks} ticks. ` : ""
    }${record.expiresAtTick ? `Expires at turn ${record.expiresAtTick}. ` : ""}${record.reason}`,
    [tribeId]
  );
  if (record.gatePublicNotice) {
  addEvent(
    state,
    "GATE_PUBLIC_NOTICE",
    `${state.tribes[tribeId].name} posts a gate notice`,
    `Gate ${gate.id} at ${gate.x},${gate.y}: ${record.gatePublicNotice}`,
      directVisionVisibleTo(state, gate, [tribeId, record.targetTribeId])
    );
  }
  const accessTreatyResult = applyGateAccessTreatyOperation(state, tribeId, gate, record);
  if (!accessTreatyResult.ok) return { ok: false, reason: accessTreatyResult.reason };
  const sabotageResult = applyGateSabotageOperation(state, tribeId, gate, record, resolved.saboteur);
  if (!sabotageResult.ok) return { ok: false, reason: sabotageResult.reason };
  const detainedPacketResult = applyDetainedPacketGateOperation(state, tribeId, gate, record);
  if (!detainedPacketResult.ok) return { ok: false, reason: detainedPacketResult.reason };
  updateVisibility(state);
  return {
    ok: true,
    summary: [
      `recorded gate operation ${record.id} on ${gate.id}`,
      accessTreatyResult.summary === "no access treaty action" ? "" : accessTreatyResult.summary,
      sabotageResult.summary === "no sabotage action" ? "" : sabotageResult.summary,
      detainedPacketResult.summary === "no detained packet action" ? "" : detainedPacketResult.summary
    ]
      .filter(Boolean)
      .join("; ")
  };
}

function recordSiegePlan(
  state: GameState,
  tribeId: TribeId,
  input: {
    kind: SiegePlanRecord["kind"];
    targetTribeId?: TribeId;
    targetBuildingId?: string;
    targetResourceType?: ResourceType;
    targetX?: number;
    targetY?: number;
    siegeIntent?: string;
    assaultPlan?: string;
    assaultMode?: SiegeAssaultMode;
    assemblyX?: number;
    assemblyY?: number;
    assaultDelayTicks?: number;
    assaultStartedTick?: number;
    assaultWaveSize?: number;
    assaultWaveIntervalTicks?: number;
    feintDurationTicks?: number;
    feintWithdrawTick?: number;
    retreatCondition?: string;
    retreatHealthPct?: number;
    retreatX?: number;
    retreatY?: number;
    repairPlan?: string;
    assignedUnitIds: string[];
    reason: string;
  }
): SiegePlanRecord {
  const record: SiegePlanRecord = {
    id: nextId(state, "siegeplan"),
    tick: state.tick,
    tribeId,
    kind: input.kind,
    targetTribeId: input.targetTribeId,
    targetBuildingId: optionalOrderText(input.targetBuildingId, 80),
    targetResourceType: input.targetResourceType,
    targetX: Number.isFinite(input.targetX) ? Math.round(Number(input.targetX)) : undefined,
    targetY: Number.isFinite(input.targetY) ? Math.round(Number(input.targetY)) : undefined,
    siegeIntent: optionalOrderText(input.siegeIntent, 140),
    assaultPlan: optionalOrderText(input.assaultPlan, 360),
    assaultMode: input.assaultMode,
    assemblyX: Number.isFinite(input.assemblyX) ? Math.round(Number(input.assemblyX)) : undefined,
    assemblyY: Number.isFinite(input.assemblyY) ? Math.round(Number(input.assemblyY)) : undefined,
    assaultDelayTicks: optionalOrderNumber(input.assaultDelayTicks, TICK_RATE * 120),
    assaultWaveSize: optionalOrderNumber(input.assaultWaveSize, 12),
    assaultWaveIntervalTicks: optionalOrderNumber(input.assaultWaveIntervalTicks, TICK_RATE * 120),
    releasedWaveIndexes: [],
    feintDurationTicks: optionalOrderNumber(input.feintDurationTicks, TICK_RATE * 120),
    retreatCondition: optionalOrderText(input.retreatCondition, 220),
    retreatHealthPct: optionalOrderNumber(input.retreatHealthPct, 100),
    retreatX: Number.isFinite(input.retreatX) ? Math.round(Number(input.retreatX)) : undefined,
    retreatY: Number.isFinite(input.retreatY) ? Math.round(Number(input.retreatY)) : undefined,
    repairPlan: optionalOrderText(input.repairPlan, 260),
    assignedUnitIds: input.assignedUnitIds.slice(0, 12),
    reason: optionalOrderText(input.reason, 220) ?? "No stated siege reason."
  };
  pushBoundedRecord(state.siegePlans, record, 120);
  return record;
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
  addEvent(state, "ALLIANCE_FORMED", `${state.tribes[a].name} allies with ${state.tribes[b].name}`, "Each tribe can hold only this one alliance unless it is later broken.", [a, b]);
  return { ok: true, summary: `${state.tribes[a].name} allied with ${state.tribes[b].name}` };
}

function issueAttackOrder(
  state: GameState,
  tribeId: TribeId,
  targetTribeId: TribeId | undefined,
  reason: string | undefined,
  targetBuildingId?: string,
  targetResource?: { x: number; y: number; type?: ResourceType },
  order?: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  const targetBuilding = targetBuildingId ? state.buildings[targetBuildingId] : undefined;
  if (!targetBuilding && targetResource) {
    return issueResourceAttackOrder(state, tribeId, targetTribeId, reason, targetResource, order);
  }
  const resolvedTargetTribeId = targetTribeId ?? targetBuilding?.tribeId;
  if (!resolvedTargetTribeId || resolvedTargetTribeId === tribeId || !tribeIds.includes(resolvedTargetTribeId)) return { ok: false, reason: "invalid attack target" };
  if (!isTribeActive(state, resolvedTargetTribeId)) return { ok: false, reason: `${state.tribes[resolvedTargetTribeId].name} is not an active separate civilization` };
  if (targetBuildingId) {
    if (!targetBuilding || targetBuilding.hp <= 0) return { ok: false, reason: "target building is missing or destroyed" };
    if (targetBuilding.tribeId !== resolvedTargetTribeId) return { ok: false, reason: "target building belongs to a different tribe" };
    if (targetBuilding.tribeId === tribeId) return { ok: false, reason: "cannot attack own building" };
  }
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === tribeId && unit.hp > 0 && (targetBuilding ? isSiegeCapableUnit(unit) : isFieldCombatUnit(unit)))
    .sort((left, right) => siegeUnitPriority(right) - siegeUnitPriority(left) || left.id.localeCompare(right.id))
    .slice(0, targetBuilding ? 5 : 4);
  if (attackers.length === 0) return { ok: false, reason: "no military units available" };
  declareWar(state, tribeId, resolvedTargetTribeId, reason ?? "AI attack order");
  if (targetBuilding) {
    const retreatTarget = orderRetreatTarget(order, findTownHall(state, tribeId) ?? starts[tribeId]);
    const assemblyTarget = orderAssemblyTarget(order);
    const siegePlan = recordSiegePlan(state, tribeId, {
      kind: "attack",
      targetTribeId: resolvedTargetTribeId,
      targetBuildingId: targetBuilding.id,
      siegeIntent: order?.siegeIntent,
      assaultPlan: order?.assaultPlan,
      assaultMode: order?.assaultMode,
      assemblyX: assemblyTarget?.x,
      assemblyY: assemblyTarget?.y,
      assaultDelayTicks: order?.assaultDelayTicks,
      assaultWaveSize: order?.assaultWaveSize,
      assaultWaveIntervalTicks: order?.assaultWaveIntervalTicks,
      feintDurationTicks: order?.feintDurationTicks,
      retreatCondition: order?.retreatCondition,
      retreatHealthPct: order?.retreatHealthPct,
      retreatX: retreatTarget?.x,
      retreatY: retreatTarget?.y,
      assignedUnitIds: attackers.map((unit) => unit.id),
      reason: reason ?? "AI siege order"
    });
    const assaultPhase = siegePlan.assaultMode === "coordinated" && assemblyTarget ? "assembling" : "attacking";
    const assemblyHoldUntilTick =
      assaultPhase === "assembling" && siegePlan.assaultDelayTicks !== undefined ? state.tick + siegePlan.assaultDelayTicks : undefined;
    const feintWithdrawTick =
      (siegePlan.assaultMode === "feint" || siegePlan.assaultMode === "probe") && siegePlan.feintDurationTicks !== undefined
        ? state.tick + siegePlan.feintDurationTicks
        : undefined;
    siegePlan.feintWithdrawTick = feintWithdrawTick;
    const waveSize = siegePlan.assaultWaveSize ? clamp(siegePlan.assaultWaveSize, 1, attackers.length) : attackers.length;
    const waveIntervalTicks = siegePlan.assaultWaveIntervalTicks ?? 0;
    for (const [index, unit] of attackers.entries()) {
      const assaultWaveIndex = Math.floor(index / waveSize);
      const assaultWaveDelayTicks = assaultWaveIndex > 0 && waveIntervalTicks > 0 ? assaultWaveIndex * waveIntervalTicks : undefined;
      const attackPosition = findBuildingAttackPosition(state, unit, targetBuilding);
      const initialAssaultPhase =
        assaultPhase === "assembling" ? "assembling" : assaultWaveDelayTicks !== undefined ? "waiting_wave" : "attacking";
      const immediateTarget =
        (initialAssaultPhase === "assembling" || initialAssaultPhase === "waiting_wave") && assemblyTarget ? assemblyTarget : attackPosition;
      unit.task = {
        kind: "attackBuilding",
        targetBuildingId: targetBuilding.id,
        path: findPath(state, unit, immediateTarget),
        siegePlanId: siegePlan.id,
        siegeIntent: siegePlan.siegeIntent,
        assaultMode: siegePlan.assaultMode,
        assaultPhase: initialAssaultPhase,
        assemblyTarget,
        assemblyHoldUntilTick,
        assaultWaveIndex,
        assaultWaveDelayTicks,
        assaultWaveReleaseTick: assaultWaveDelayTicks !== undefined && initialAssaultPhase === "waiting_wave" ? state.tick + assaultWaveDelayTicks : undefined,
        feintWithdrawTick,
        retreatHealthPct: siegePlan.retreatHealthPct,
        retreatTarget:
          siegePlan.retreatX !== undefined && siegePlan.retreatY !== undefined
            ? { x: siegePlan.retreatX, y: siegePlan.retreatY }
            : undefined
      };
    }
    addEvent(
      state,
      "WAR_SIEGE_ORDER",
      `${state.tribes[tribeId].name} attacks ${state.tribes[resolvedTargetTribeId].name}'s ${labelBuildingType(targetBuilding.type)}`,
      `${attackers.length} military units move to destroy ${targetBuilding.type} ${targetBuilding.id} at ${targetBuilding.x},${targetBuilding.y}. ${
        siegePlan.siegeIntent ? `Intent: ${siegePlan.siegeIntent}. ` : ""
      }${siegePlan.assaultPlan ? `Plan: ${siegePlan.assaultPlan}. ` : ""}${
        siegePlan.assaultMode ? `Mode: ${siegePlan.assaultMode}. ` : ""
      }${assemblyTarget ? `Rally at ${assemblyTarget.x},${assemblyTarget.y}. ` : ""}${
        siegePlan.assaultDelayTicks ? `Assembly window ${siegePlan.assaultDelayTicks} ticks. ` : ""
      }${siegePlan.assaultWaveSize ? `Wave size ${siegePlan.assaultWaveSize}. ` : ""}${
        siegePlan.assaultWaveIntervalTicks ? `Wave interval ${siegePlan.assaultWaveIntervalTicks} ticks. ` : ""
      }${siegePlan.feintDurationTicks ? `Withdraw after ${siegePlan.feintDurationTicks} ticks. ` : ""}${
        siegePlan.retreatHealthPct ? `Retreat below ${siegePlan.retreatHealthPct}% health. ` : ""
      }${clampText(reason ?? "No stated reason.", 180)}`,
      directVisionVisibleTo(state, targetBuilding, [tribeId, resolvedTargetTribeId])
    );
    return {
      ok: true,
      summary: `declared war on ${state.tribes[resolvedTargetTribeId].name} and sent ${attackers.length} attackers against ${targetBuilding.type} ${targetBuilding.id}`
    };
  }
  const visibleTarget = getVisibleUnits(state, tribeId)
    .filter((unit) => unit.tribeId === resolvedTargetTribeId && !isProtectedMessenger(unit))
    .sort((left, right) => distance(attackers[0], left) - distance(attackers[0], right))[0];
  const townHall = findTownHall(state, resolvedTargetTribeId);
  const target = visibleTarget ? { x: Math.round(visibleTarget.x), y: Math.round(visibleTarget.y) } : townHall ? { x: townHall.x, y: townHall.y } : starts[resolvedTargetTribeId];
  for (const [index, unit] of attackers.entries()) {
    const offsetTarget = { x: target.x + (index % 2), y: target.y + Math.floor(index / 2) };
    unit.task = visibleTarget
      ? { kind: "attack", targetUnitId: visibleTarget.id, path: findPath(state, unit, offsetTarget) }
      : { kind: "move", target: offsetTarget, path: findPath(state, unit, offsetTarget) };
  }
  addEvent(
    state,
    "WAR_ATTACK_ORDER",
    `${state.tribes[tribeId].name} attacks ${state.tribes[resolvedTargetTribeId].name}`,
    `${attackers.length} military units move under war orders. ${clampText(reason ?? "No stated reason.", 180)}`,
    [tribeId]
  );
  return { ok: true, summary: `declared war on ${state.tribes[resolvedTargetTribeId].name} and sent ${attackers.length} attackers` };
}

function issueResourceAttackOrder(
  state: GameState,
  tribeId: TribeId,
  targetTribeId: TribeId | undefined,
  reason: string | undefined,
  targetResource: { x: number; y: number; type?: ResourceType },
  order?: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (state.visibility[tribeId]?.[tileIndex(targetResource.x, targetResource.y)] !== 2) {
    return { ok: false, reason: "target resource tile is not currently visible" };
  }
  const tile = state.map[tileIndex(targetResource.x, targetResource.y)];
  const resource = tile.resource;
  if (!resource || resource.hp <= 0 || resource.amount <= 0) return { ok: false, reason: "target resource deposit is missing or exhausted" };
  if (targetResource.type && resource.type !== targetResource.type) {
    return { ok: false, reason: `target tile contains ${resource.type}, not ${targetResource.type}` };
  }
  if (targetTribeId) {
    if (targetTribeId === tribeId || !tribeIds.includes(targetTribeId)) return { ok: false, reason: "invalid attack target" };
    if (!isTribeActive(state, targetTribeId)) return { ok: false, reason: `${state.tribes[targetTribeId].name} is not an active separate civilization` };
  }
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === tribeId && unit.hp > 0 && isFieldCombatUnit(unit))
    .slice(0, 4);
  if (attackers.length === 0) return { ok: false, reason: "no military units available" };
  if (targetTribeId) declareWar(state, tribeId, targetTribeId, reason ?? "AI resource raid order");
  const target = { x: targetResource.x, y: targetResource.y };
  recordSiegePlan(state, tribeId, {
    kind: "resource_raid",
    targetTribeId,
    targetResourceType: resource.type,
    targetX: target.x,
    targetY: target.y,
    siegeIntent: order?.siegeIntent,
    assaultPlan: order?.assaultPlan,
    retreatCondition: order?.retreatCondition,
    assignedUnitIds: attackers.map((unit) => unit.id),
    reason: reason ?? "AI resource raid order"
  });
  for (const unit of attackers) {
    const attackPosition = findResourceAttackPosition(state, unit, target);
    unit.task = { kind: "attackResource", resource: resource.type, target, path: findPath(state, unit, attackPosition) };
  }
  invalidateResourceControlCache(state);
  const targetText = targetTribeId ? `${state.tribes[targetTribeId].name}'s claimed ${resource.type} deposit` : `${resource.type} deposit`;
  const visibleTo = resourceEventVisibleTo(state, target, [tribeId, targetTribeId]);
  addEvent(
    state,
    "RESOURCE_RAID_ORDER",
    `${state.tribes[tribeId].name} raids ${resource.type}`,
    `${attackers.length} military units move to destroy the ${targetText} at ${target.x},${target.y}. ${clampText(reason ?? "No stated reason.", 180)}`,
    visibleTo
  );
  return {
    ok: true,
    summary: targetTribeId
      ? `declared war on ${state.tribes[targetTribeId].name} and sent ${attackers.length} attackers against ${resource.type} deposit ${target.x},${target.y}`
      : `sent ${attackers.length} attackers to raid ${resource.type} deposit ${target.x},${target.y}`
  };
}

function findBuildingAttackPosition(state: GameState, unit: Unit, building: Building): Position {
  return findTargetInteractionPosition(state, unit, building, unit.range);
}

function findBuildingRepairPosition(state: GameState, unit: Unit, building: Building): Position {
  return findTargetInteractionPosition(state, unit, building, REPAIR_RANGE);
}

function findResourceAttackPosition(state: GameState, unit: Unit, target: Position): Position {
  return findTargetInteractionPosition(state, unit, target, unit.range);
}

function isBuildingUnderSiege(state: GameState, building: Building): boolean {
  return Object.values(state.units).some(
    (unit) =>
      unit.hp > 0 &&
      unit.tribeId !== building.tribeId &&
      areHostile(state, unit.tribeId, building.tribeId) &&
      (unit.task.kind === "attackBuilding" && unit.task.targetBuildingId === building.id
        ? true
        : distance(unit, building) <= Math.max(unit.range, 1.2))
  );
}

function findTargetInteractionPosition(state: GameState, unit: Unit, target: Position, interactionRange: number): Position {
  if (distance(unit, target) <= interactionRange) return { x: Math.round(unit.x), y: Math.round(unit.y) };
  const radius = Math.max(1, Math.ceil(interactionRange));
  let best: { position: Position; pathLength: number; distance: number } | undefined;
  for (let y = target.y - radius; y <= target.y + radius; y += 1) {
    for (let x = target.x - radius; x <= target.x + radius; x += 1) {
      const position = { x, y };
      if (distance(position, target) > interactionRange) continue;
      if (!isWalkableForTribe(state, x, y, unit.tribeId)) continue;
      const path = findPath(state, unit, position);
      const alreadyThere = Math.round(unit.x) === x && Math.round(unit.y) === y;
      if (!alreadyThere && !pathArrives(path, position)) continue;
      const candidate = { position, pathLength: path.length, distance: distance(unit, position) };
      if (!best || candidate.pathLength < best.pathLength || (candidate.pathLength === best.pathLength && candidate.distance < best.distance)) best = candidate;
    }
  }
  return best?.position ?? findNearestWalkable(state, target, unit.tribeId) ?? { x: target.x, y: target.y };
}

function issueRepairOrder(
  state: GameState,
  tribeId: TribeId,
  targetBuildingId?: string,
  order?: AiStrategicOrder
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (!targetBuildingId) return { ok: false, reason: "missing repair target building id" };
  const building = state.buildings[targetBuildingId];
  if (!building || building.hp <= 0) return { ok: false, reason: "repair target is missing or destroyed" };
  if (building.tribeId !== tribeId) return { ok: false, reason: "cannot repair another tribe's building" };
  if (building.hp >= building.maxHp) return { ok: false, reason: "building is already fully repaired" };
  const peons = Object.values(state.units)
    .filter((unit) => unit.tribeId === tribeId && unit.hp > 0 && unit.type === "peon" && unit.task.kind === "idle")
    .sort((left, right) => distance(left, building) - distance(right, building))
    .slice(0, 2);
  if (peons.length === 0) return { ok: false, reason: "no idle peon available for repair" };
  const cost = getTribeBuildingRepairCost(state, tribeId, building);
  if (!canAfford(state.tribes[tribeId].resources, cost)) return { ok: false, reason: `Not enough resources to repair ${building.type}. Need ${formatResourceCost(cost)}.` };
  spendResources(state.tribes[tribeId].resources, cost);
  const underSiege = isBuildingUnderSiege(state, building);
  const siegePlan =
    underSiege || order?.siegeIntent || order?.repairPlan
      ? recordSiegePlan(state, tribeId, {
          kind: "repair",
          targetBuildingId: building.id,
          siegeIntent: order?.siegeIntent ?? (underSiege ? "repair under fire" : undefined),
          repairPlan: order?.repairPlan,
          assignedUnitIds: peons.map((peon) => peon.id),
          reason: order?.reason ?? "AI repair order"
        })
      : undefined;
  for (const peon of peons) {
    const repairPosition = findBuildingRepairPosition(state, peon, building);
    peon.task = {
      kind: "repair",
      targetBuildingId: building.id,
      path: findPath(state, peon, repairPosition),
      siegePlanId: siegePlan?.id,
      siegeIntent: siegePlan?.siegeIntent
    };
  }
  addEvent(
    state,
    "AI_REPAIR_ORDER",
    `${state.tribes[tribeId].name} repairs ${labelBuildingType(building.type)}`,
    `${peons.length} peon${peons.length === 1 ? "" : "s"} repair ${building.id} at ${building.x},${building.y}. Cost: ${formatResourceCost(cost)}.${
      underSiege ? " The work crew is repairing under hostile pressure." : ""
    }${siegePlan?.repairPlan ? ` Repair plan: ${siegePlan.repairPlan}.` : ""}`,
    [tribeId]
  );
  return { ok: true, summary: `sent ${peons.length} peon${peons.length === 1 ? "" : "s"} to repair ${building.type} ${building.id}` };
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
    [attacker, defender]
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
      reason: `${realmName} or ${sovereignName} reuses a reserved placeholder identity`
    };
  }
  const duplicate = tribeIds.find(
    (otherId) =>
      otherId !== tribeId &&
      state.tribes[otherId].identityChosen &&
      (identityNameKey(state.tribes[otherId].name) === realmKey || identityNameKey(state.tribes[otherId].sovereignName) === sovereignKey)
  );
  if (duplicate) {
    return { ok: false, reason: `${realmName} or ${sovereignName} duplicates an existing hidden identity` };
  }
  tribe.name = realmName;
  tribe.sovereignName = sovereignName;
  tribe.namingStyle = namingStyle;
  tribe.inspiration = inspiration;
  tribe.identityChosen = true;
  const sovereign = Object.values(state.units).find((unit) => unit.tribeId === tribeId && unit.type === "sovereign" && unit.hp > 0);
  if (sovereign) sovereign.name = sovereignName;
  addEvent(state, "AI_IDENTITY_CHOSEN", `${realmName} names its sovereign`, `${sovereignName} rules under a naming style inspired by ${inspiration}.`, [tribeId]);
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
    addEvent(state, "AI_UNIT_NAMES", `${state.tribes[tribeId].name} names its people`, accepted.slice(0, 5).join("; "), [tribeId]);
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
    `${state.tribes[stored.tribeId].name} makes a sovereign decision`,
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

export function trainUnit(
  state: GameState,
  tribeId: TribeId,
  unitType: (typeof trainableUnitTypes)[number]
): { ok: true; unitId: string } | { ok: false; reason: string } {
  const tribe = state.tribes[tribeId];
  const population = Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
  const populationCap = getPopulationCap(state, tribeId);
  if (population >= populationCap) return { ok: false, reason: `Population cap reached (${population}/${populationCap}). Build houses or choose settlement developments to grow further.` };
  const missingDevelopments = getMissingUnitDevelopments(state, tribeId, unitType);
  if (missingDevelopments.length > 0) return { ok: false, reason: `${unitType} requires ${formatDevelopmentList(missingDevelopments)}` };
  const cost = getUnitCost(unitType);
  if (!canAfford(tribe.resources, cost)) return { ok: false, reason: `Not enough resources to train ${unitType}. Need ${formatResourceCost(cost)}.` };
  const source = unitType === "peon" ? findTownHall(state, tribeId) : Object.values(state.buildings).find((building) => building.tribeId === tribeId && building.type === "barracks");
  if (!source) return { ok: false, reason: `No production building for ${unitType}.` };
  spendResources(tribe.resources, cost);
  const unit = addUnit(state, tribeId, unitType, source.x + 1, source.y + 1);
  addEvent(state, "UNIT_TRAINED", `${tribe.name} trains ${unitType}`, `${unit.name} is ready for orders.`, [tribeId]);
  updateVisibility(state);
  return { ok: true, unitId: unit.id };
}

export function getBuildingCost(buildingType: BuildableBuildingType): ResourceCost {
  return { ...buildingCosts[buildingType] };
}

export function getEffectiveBuildingCost(state: GameState, tribeId: TribeId, buildingType: BuildableBuildingType): ResourceCost {
  return scaleResourceCost(buildingCosts[buildingType], developmentCostMultiplier(state, tribeId, "construction_cost_multiplier"));
}

export function getBuildingRepairCost(buildingOrType: Pick<Building, "type" | "hp" | "maxHp"> | BuildingType): ResourceCost {
  const type = typeof buildingOrType === "string" ? buildingOrType : buildingOrType.type;
  const base = buildingRepairCosts[type];
  if (typeof buildingOrType === "string") return { ...base };
  const missingHp = Math.max(0, buildingOrType.maxHp - buildingOrType.hp);
  if (missingHp <= 0 || buildingOrType.maxHp <= 0) return {};
  const scale = Math.max(0.05, Math.min(1, missingHp / buildingOrType.maxHp));
  return scaleResourceCost(base, scale);
}

export function getTribeBuildingRepairCost(state: GameState, tribeId: TribeId, buildingOrType: Pick<Building, "type" | "hp" | "maxHp"> | BuildingType): ResourceCost {
  return scaleResourceCost(getBuildingRepairCost(buildingOrType), developmentCostMultiplier(state, tribeId, "repair_cost_multiplier"));
}

export function getUnitCost(unitType: (typeof trainableUnitTypes)[number]): ResourceCost {
  return { ...unitTrainingCosts[unitType] };
}

export function getUnitRequirements(unitType: (typeof trainableUnitTypes)[number]): DevelopmentId[] {
  return [...unitDevelopmentRequirements[unitType]];
}

export function getMissingUnitDevelopments(state: GameState, tribeId: TribeId, unitType: (typeof trainableUnitTypes)[number]): DevelopmentId[] {
  return unitDevelopmentRequirements[unitType].filter((developmentId) => !hasDevelopment(state, tribeId, developmentId));
}

export function getDevelopment(developmentId: DevelopmentId): Development {
  const development = developmentCatalog[developmentId];
  return {
    ...development,
    cost: { ...development.cost },
    prerequisites: [...development.prerequisites],
    unlocks: [...development.unlocks],
    aliases: [...development.aliases],
    tradeoffs: [...development.tradeoffs],
    synergies: [...development.synergies],
    socialCosts: [...development.socialCosts],
    effects: development.effects.map((effect) => ({ ...effect }))
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

type PerimeterBuildSegment = {
  type: BuildableBuildingType;
  target: Position;
  index: number;
};

type PerimeterBuildResult = { ok: true; buildingIds: string[]; summary: string } | { ok: false; reason: string };

function buildPerimeterFromOrder(
  state: GameState,
  tribeId: TribeId,
  order: AiStrategicOrder,
  buildingType: BuildableBuildingType,
  target: Position
): PerimeterBuildResult | undefined {
  const length = optionalOrderNumber(order.perimeterLength, 12) ?? 1;
  const pattern = order.perimeterPattern ?? "single";
  if (length <= 1 || pattern === "single") return undefined;
  if (buildingType !== "wall" && buildingType !== "gate") return { ok: false, reason: "perimeter builds currently support wall and gate structures only" };
  if (buildingType === "gate" && pattern === "line") {
    return { ok: false, reason: "Use perimeterPattern gate_line when a perimeter should include a commanded gate segment." };
  }
  const direction = order.perimeterDirection ?? "east_west";
  const segments = perimeterSegments(pattern, direction, length, order.perimeterGateIndex, target);
  if (segments.length <= 1) return undefined;
  const uniqueTypes = Array.from(new Set(segments.map((segment) => segment.type)));
  for (const type of uniqueTypes) {
    const missingDevelopments = getMissingBuildingDevelopments(state, tribeId, type);
    if (missingDevelopments.length > 0) return { ok: false, reason: `${labelBuildingType(type)} requires development ${formatDevelopmentList(missingDevelopments)}.` };
  }
  const reserved = new Set<string>();
  const sites = segments.map((segment) => {
    const site = findBuildSite(state, segment.target, reserved);
    if (site) reserved.add(positionKey(site));
    return site ? { ...segment, site } : undefined;
  });
  if (sites.some((site) => !site)) return { ok: false, reason: "No clear build sites for the requested perimeter." };
  const planned = sites.filter((site): site is PerimeterBuildSegment & { site: Position } => Boolean(site));
  const totalCost = planned.reduce<ResourceCost>((sum, segment) => addResourceCosts(sum, getEffectiveBuildingCost(state, tribeId, segment.type)), {});
  if (!canAfford(state.tribes[tribeId].resources, totalCost)) {
    return { ok: false, reason: `Not enough resources to build perimeter. Need ${formatResourceCost(totalCost)}.` };
  }
  spendResources(state.tribes[tribeId].resources, totalCost);
  const groupId = nextId(state, "perimeter");
  const gateSegmentIndex = normalizedPerimeterGateIndex(pattern, length, order.perimeterGateIndex);
  const buildingIds: string[] = [];
  for (const segment of planned) {
    const building = addBuilding(state, tribeId, segment.type, segment.site.x, segment.site.y);
    buildingIds.push(building.id);
    addEvent(
      state,
      "STRUCTURE_BUILT",
      `${state.tribes[tribeId].name} builds ${labelBuildingType(segment.type)}`,
      `A new ${labelBuildingType(segment.type)} stands at ${segment.site.x},${segment.site.y}.`,
      [tribeId]
    );
    recordFortificationPlanFromOrder(state, tribeId, order, building.id, segment.type, {
      groupId,
      index: segment.index,
      count: planned.length,
      pattern,
      direction,
      length,
      gateIndex: gateSegmentIndex === undefined ? undefined : gateSegmentIndex + 1
    });
  }
  refreshFortificationGroupPlacementPreview(state, tribeId, groupId);
  addEvent(
    state,
    "FORTIFICATION_PERIMETER_BUILT",
    `${state.tribes[tribeId].name} builds a perimeter`,
    `${planned.length} structures form a ${pattern} ${direction} perimeter near ${Math.round(target.x)},${Math.round(target.y)}. ${
      order.perimeterStrategy ? `Plan: ${clampText(order.perimeterStrategy, 180)}` : clampText(order.reason, 180)
    }`,
    [tribeId]
  );
  updateVisibility(state);
  return { ok: true, buildingIds, summary: `built perimeter ${groupId} with ${buildingIds.length} structures` };
}

function perimeterSegments(
  pattern: PerimeterPattern,
  direction: PerimeterDirection,
  length: number,
  requestedGateIndex: number | undefined,
  target: Position
): PerimeterBuildSegment[] {
  const segmentCount = clamp(optionalOrderNumber(length, 12) ?? 1, 1, 12);
  const vector = perimeterDirectionVector(direction);
  const centerOffset = Math.floor(segmentCount / 2);
  const gateIndex = normalizedPerimeterGateIndex(pattern, segmentCount, requestedGateIndex);
  const segments: PerimeterBuildSegment[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const offset = index - centerOffset;
    const x = clamp(Math.round(target.x + vector.x * offset), 1, MAP_SIZE - 2);
    const y = clamp(Math.round(target.y + vector.y * offset), 1, MAP_SIZE - 2);
    segments.push({ type: gateIndex === index ? "gate" : "wall", target: { x, y }, index });
  }
  return segments;
}

function normalizedPerimeterGateIndex(pattern: PerimeterPattern, length: number, requestedGateIndex: number | undefined): number | undefined {
  if (pattern !== "gate_line") return undefined;
  const fallback = Math.floor(length / 2);
  const value = optionalOrderNumber(requestedGateIndex, length) ?? fallback + 1;
  return clamp(value - 1, 0, Math.max(0, length - 1));
}

function perimeterDirectionVector(direction: PerimeterDirection): Position {
  if (direction === "north_south") return { x: 0, y: 1 };
  if (direction === "northeast_southwest") return { x: 1, y: -1 };
  if (direction === "northwest_southeast") return { x: 1, y: 1 };
  return { x: 1, y: 0 };
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
  applyDevelopmentEffects(state, tribeId, developmentId);
  addEvent(
    state,
    "DEVELOPMENT_CHOSEN",
    `${state.tribes[tribeId].name} develops ${development.name}`,
    `${development.description} Unlocks: ${development.unlocks.join(", ")}.`,
    [tribeId]
  );
  return { ok: true, summary: `developed ${development.name}` };
}

function applyDevelopmentEffects(state: GameState, tribeId: TribeId, developmentId: DevelopmentId): void {
  const tribe = state.tribes[tribeId];
  const development = developmentCatalog[developmentId];
  const immediateHappiness = development.effects
    .filter((effect) => effect.kind === "instant_happiness")
    .reduce((total, effect) => total + effect.amount, 0);
  if (immediateHappiness !== 0) tribe.happiness = Math.round(clamp(tribe.happiness + immediateHappiness, 0, 100));
  refreshTribeUnitStats(state, tribeId);
  refreshTribeBuildingStats(state, tribeId);
  updateVisibility(state);
}

function refreshTribeUnitStats(state: GameState, tribeId: TribeId): void {
  for (const unit of Object.values(state.units)) {
    if (unit.tribeId !== tribeId || unit.hp <= 0) continue;
    const ratio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
    const stats = effectiveUnitStats(state, tribeId, unit.type);
    unit.maxHp = stats.maxHp;
    unit.hp = Math.max(1, Math.min(stats.maxHp, Math.round(stats.maxHp * ratio)));
    unit.armor = stats.armor;
    unit.speed = stats.speed;
    unit.visionRadius = stats.visionRadius;
    unit.attack = stats.attack;
    unit.range = stats.range;
  }
}

function refreshTribeBuildingStats(state: GameState, tribeId: TribeId): void {
  for (const building of Object.values(state.buildings)) {
    if (building.tribeId !== tribeId || building.hp <= 0) continue;
    const ratio = building.maxHp > 0 ? building.hp / building.maxHp : 1;
    const stats = effectiveBuildingStats(state, tribeId, building.type);
    building.maxHp = stats.maxHp;
    building.hp = Math.max(1, Math.min(stats.maxHp, Math.round(stats.maxHp * ratio)));
    building.armor = stats.armor;
    building.attack = stats.attack;
    building.range = stats.range;
  }
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
  const cost = getEffectiveBuildingCost(state, tribeId, buildingType);
  if (!canAfford(tribe.resources, cost)) return { ok: false, reason: `Not enough resources to build ${buildingType}. Need ${formatResourceCost(cost)}.` };
  const site = findBuildSite(state, near);
  if (!site) return { ok: false, reason: "No clear build site nearby." };
  spendResources(tribe.resources, cost);
  const building = addBuilding(state, tribeId, buildingType, site.x, site.y);
  addEvent(state, "STRUCTURE_BUILT", `${tribe.name} builds ${labelBuildingType(buildingType)}`, `A new ${labelBuildingType(buildingType)} stands at ${site.x},${site.y}.`, [tribeId]);
  updateVisibility(state);
  return { ok: true, buildingId: building.id };
}

export function setGateState(
  state: GameState,
  tribeId: TribeId,
  gateState: GateState,
  buildingId?: string,
  gateAccessPolicy?: GateAccessPolicy
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
  if (gateAccessPolicy) gate.gateAccessPolicy = gateAccessPolicy;
  const accessPolicy = gate.gateAccessPolicy ?? "owner_allies";
  addEvent(
    state,
    "GATE_STATE_CHANGED",
    `${state.tribes[tribeId].name} sets a gate ${gateState}`,
    `Gate at ${gate.x},${gate.y} is now ${gateState} with access ${formatGateAccessPolicy(accessPolicy)}. ${
      gateState === "open" ? "It follows that access policy." : "It blocks movement."
    }`,
    directVisionVisibleTo(state, gate, [tribeId])
  );
  updateVisibility(state);
  return { ok: true, buildingId: gate.id, summary: `set gate ${gate.id} ${gateState} ${accessPolicy}` };
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

export function damageResourceDeposit(
  state: GameState,
  target: Position,
  amount: number,
  attackerTribeId?: TribeId
): { ok: true; destroyed: boolean; resourceType: ResourceType } | { ok: false; reason: string } {
  const roundedTarget = { x: Math.round(target.x), y: Math.round(target.y) };
  if (roundedTarget.x < 0 || roundedTarget.y < 0 || roundedTarget.x >= MAP_SIZE || roundedTarget.y >= MAP_SIZE) {
    return { ok: false, reason: "target resource tile is out of bounds" };
  }
  const tile = state.map[tileIndex(roundedTarget.x, roundedTarget.y)];
  const resource = tile.resource;
  if (!resource || resource.hp <= 0 || resource.amount <= 0) return { ok: false, reason: "missing resource deposit" };
  const resourceType = resource.type;
  const destroyed = applyResourceDamage(state, roundedTarget, amount, attackerTribeId);
  return { ok: true, destroyed, resourceType };
}

export function getUnitCombatStats(unit: Unit): CombatStats {
  return {
    hp: unit.hp,
    maxHp: unit.maxHp,
    armor: unit.armor,
    attack: unit.attack,
    range: unit.range,
    attackCooldown: unit.attackCooldown
  };
}

export function getBuildingCombatStats(building: Building): CombatStats {
  return {
    hp: building.hp,
    maxHp: building.maxHp,
    armor: building.armor,
    attack: building.attack,
    range: building.range,
    attackCooldown: building.attackCooldown
  };
}

export function getResourceDepositCombatStats(resource: ResourceDeposit): CombatStats {
  return {
    hp: resource.hp,
    maxHp: resource.maxHp,
    armor: resource.armor,
    attack: resource.attack,
    range: resource.range,
    attackCooldown: resource.attackCooldown
  };
}

export function getPacketItemCombatStats(packet: Packet): CombatStats {
  return {
    hp: packet.hp,
    maxHp: packet.maxHp,
    armor: packet.armor,
    attack: packet.attack,
    range: packet.range,
    attackCooldown: packet.attackCooldown
  };
}

export function getUnitTypeCombatStats(type: UnitType): CombatStats {
  const stats = unitStats[type];
  return {
    hp: stats.hp,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: stats.attackCooldown
  };
}

export function getBuildingTypeCombatStats(type: BuildingType): CombatStats {
  const stats = buildingStats[type];
  return {
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
}

export function getPacketItemTypeCombatStats(): CombatStats {
  return { ...packetStats };
}

export function getResourceTypeCombatStats(type: ResourceType, amount = 1): CombatStats {
  return getResourceDepositCombatStats(createResourceDeposit(type, amount));
}

export function getCombatStatCoverageReport(state: GameState): CombatStatCoverageReport {
  const issues: CombatStatCoverageIssue[] = [];
  const byKind: CombatStatCoverageReport["byKind"] = {
    unitType: 0,
    buildingType: 0,
    resourceType: 0,
    unit: 0,
    building: 0,
    resource: 0,
    packet: 0,
    projectile: 0
  };
  const check = (
    kind: Exclude<CombatStatCoverageIssue["kind"], "map">,
    id: string,
    stats: Partial<CombatStats> | undefined,
    options: { requireHp?: boolean; attackMustBeZero?: boolean } = {}
  ) => {
    if (!stats) {
      issues.push({ kind, id, reason: "missing combat stats" });
      return;
    }
    byKind[kind] += 1;
    const numbers: Array<keyof CombatStats> = ["hp", "maxHp", "armor", "attack", "range", "attackCooldown"];
    for (const field of numbers) {
      if (typeof stats[field] !== "number" || !Number.isFinite(stats[field])) {
        issues.push({ kind, id, reason: `${field} is missing or not finite` });
      }
    }
    if ((stats.maxHp ?? 0) <= 0) issues.push({ kind, id, reason: "maxHp must be positive" });
    if (options.requireHp !== false && (stats.hp ?? 0) <= 0) issues.push({ kind, id, reason: "hp must be positive for live object" });
    if ((stats.hp ?? 0) > (stats.maxHp ?? 0)) issues.push({ kind, id, reason: "hp exceeds maxHp" });
    if ((stats.armor ?? -1) < 0) issues.push({ kind, id, reason: "armor must be non-negative" });
    if ((stats.attack ?? -1) < 0) issues.push({ kind, id, reason: "attack must be non-negative" });
    if ((stats.range ?? -1) < 0) issues.push({ kind, id, reason: "range must be non-negative" });
    if ((stats.attackCooldown ?? -1) < 0) issues.push({ kind, id, reason: "attackCooldown must be non-negative" });
    if ((stats.attack ?? 0) > 0 && (stats.range ?? 0) <= 0) issues.push({ kind, id, reason: "attacking object must have positive range" });
    if (options.attackMustBeZero && (stats.attack ?? 0) !== 0) issues.push({ kind, id, reason: "passive item/resource attack must be zero" });
  };

  for (const type of unitTypes) check("unitType", type, getUnitTypeCombatStats(type));
  for (const type of buildingTypes) check("buildingType", type, getBuildingTypeCombatStats(type));
  for (const type of resourceTypes) check("resourceType", type, getResourceTypeCombatStats(type, 12), { attackMustBeZero: true });
  check("packet", "packet:itemType", getPacketItemTypeCombatStats(), { attackMustBeZero: true });

  for (const unit of Object.values(state.units)) if (unit.hp > 0) check("unit", unit.id, unit);
  for (const building of Object.values(state.buildings)) if (building.hp > 0) check("building", building.id, building);
  for (const [index, tile] of state.map.entries()) {
    const x = index % MAP_SIZE;
    const y = Math.floor(index / MAP_SIZE);
    if (tile.terrain === "forest" && (!tile.resource || tile.resource.type !== "wood" || tile.resource.amount <= 0 || tile.resource.hp <= 0)) {
      issues.push({ kind: "map", id: `${x},${y}`, reason: "forest terrain must carry a live wood ResourceDeposit instead of acting as an unstatted wood item" });
    }
    if (!tile.resource) continue;
    if (tile.resource.amount <= 0 || tile.resource.hp <= 0) {
      issues.push({ kind: "resource", id: `${tile.resource.type}:${x},${y}`, reason: "dead or exhausted resource deposit should be removed from the map" });
      continue;
    }
    check("resource", `${tile.resource.type}:${x},${y}`, tile.resource, { attackMustBeZero: true });
  }
  for (const packet of Object.values(state.packets)) {
    check("packet", packet.id, packet, { requireHp: packet.state !== "KILLED_WITH_PACKET", attackMustBeZero: true });
    if (packet.itemType !== "packet") issues.push({ kind: "packet", id: packet.id, reason: "packet itemType must be packet" });
  }
  for (const projectile of Object.values(state.projectiles)) {
    check("projectile", projectile.id, projectile);
    if (projectile.projectileType !== "stone_shot") issues.push({ kind: "projectile", id: projectile.id, reason: "unknown projectile type" });
  }
  return {
    ok: issues.length === 0,
    checked: Object.values(byKind).reduce((sum, count) => sum + count, 0),
    byKind,
    issues
  };
}

export function createResourceDeposit(type: ResourceType, amount: number): ResourceDeposit {
  const normalizedAmount = Math.max(0, Math.round(amount));
  const maxHp = Math.max(1, normalizedAmount);
  return {
    type,
    amount: normalizedAmount,
    hp: maxHp,
    maxHp,
    armor: resourceDepositArmor(type),
    attack: 0,
    range: 0,
    attackCooldown: 0
  };
}

function resourceDepositArmor(type: ResourceType): number {
  if (type === "iron") return 3;
  if (type === "stone" || type === "coal" || type === "limestone") return 2;
  if (type === "gold" || type === "clay") return 1;
  return 0;
}

function canAfford(resources: Resources, cost: ResourceCost): boolean {
  return resourceTypes.every((type) => resources[type] >= (cost[type] ?? 0));
}

function spendResources(resources: Resources, cost: ResourceCost): void {
  for (const type of resourceTypes) resources[type] -= cost[type] ?? 0;
}

function addResourceCosts(left: ResourceCost, right: ResourceCost): ResourceCost {
  const sum: ResourceCost = { ...left };
  for (const type of resourceTypes) {
    const amount = (sum[type] ?? 0) + (right[type] ?? 0);
    if (amount > 0) sum[type] = amount;
  }
  return sum;
}

function scaleResourceCost(cost: ResourceCost, scale: number): ResourceCost {
  const scaled: ResourceCost = {};
  for (const type of resourceTypes) {
    const amount = cost[type] ?? 0;
    if (amount > 0) scaled[type] = Math.max(1, Math.ceil(amount * scale));
  }
  return scaled;
}

function formatResourceCost(cost: ResourceCost): string {
  const parts = resourceTypes.flatMap((type) => {
    const amount = cost[type] ?? 0;
    return amount > 0 ? [`${amount} ${type}`] : [];
  });
  return parts.join(", ") || "free";
}

function positionKey(position: Position): string {
  return `${Math.round(position.x)},${Math.round(position.y)}`;
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
  if (tribe.eliminated || tribe.mergedIntoTribeId) return 0;
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
  const developmentValue = developmentEffectAmount(state, tribeId, "wealth") * 10;
  return Math.round(banked + unitValue + buildingValue + developmentValue);
}

export function getVictoryPressure(state: GameState): VictoryPressureStatus {
  const currentYear = getCurrentYear(state);
  const nextReviewYear = state.victoryPressure.nextReviewYear;
  const ranked = tribeIds
    .map((tribeId) => survivalScoreEntry(state, tribeId))
    .sort(
      (left, right) =>
        Number(!isTribeActive(state, left.tribeId)) - Number(!isTribeActive(state, right.tribeId)) ||
        right.survivalScore - left.survivalScore ||
        right.wealthPerCapita - left.wealthPerCapita ||
        tribeIds.indexOf(left.tribeId) - tribeIds.indexOf(right.tribeId)
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const surviving = ranked.filter((entry) => isTribeActive(state, entry.tribeId));
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
    eliminatedTribes: ranked.filter((entry) => entry.eliminated).length,
    mergedTribes: ranked.filter((entry) => entry.mergedIntoTribeId).length,
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
  if (!isTribeActive(state, tribeId) || population === 0) return 0;
  const ownUnits = Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0);
  const military = ownUnits.filter((unit) => isSiegeCapableUnit(unit)).length;
  const siegeEngines = ownUnits.filter((unit) => unit.type === "siege_engine").length;
  const sentinels = ownUnits.filter((unit) => unit.type === "sentinel").length;
  const ownBuildings = Object.values(state.buildings).filter((building) => building.tribeId === tribeId && building.hp > 0);
  const walls = ownBuildings.filter((building) => building.type === "wall").length;
  const gates = ownBuildings.filter((building) => building.type === "gate").length;
  const turrets = ownBuildings.filter((building) => building.type === "turret").length;
  const watchtowers = ownBuildings.filter((building) => building.type === "watchtower").length;
  const activeWars = tribeIds.filter((other) => state.wars[tribeId]?.[other]).length;
  const townHall = ownBuildings.some((building) => building.type === "townHall") ? 8 : -22;
  const resourceControl = getResourceControlSummary(state, tribeId);
  const raw =
    34 +
    townHall +
    military * 5 +
    siegeEngines * 4 +
    sentinels * 3 +
    walls * 2 +
    gates * 3 +
    turrets * 8 +
    watchtowers * 5 +
    developmentEffectAmount(state, tribeId, "safety") +
    developmentEffectAmount(state, tribeId, "resource_control") +
    resourceControl.survivalBonus -
    activeWars * 10 -
    Math.max(0, 10 - population) * 1.5;
  return Math.round(clamp(raw, 0, 100));
}

function survivalScoreEntry(state: GameState, tribeId: TribeId): VictoryScoreEntry {
  const tribe = state.tribes[tribeId];
  const population = countLivingPopulation(state, tribeId);
  const wealth = computeWealth(state, tribeId);
  const wealthPerCapita = population > 0 ? Math.round(wealth / population) : 0;
  const safety = getTribeSafetyScore(state, tribeId);
  const happiness = Math.round(tribe.happiness);
  const survivalScore = !isTribeActive(state, tribeId)
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
    mergedIntoTribeId: tribe.mergedIntoTribeId,
    mergedLeaderTribeId: tribe.mergedLeaderTribeId,
    mergedYear: tribe.mergedYear,
    rank: 0
  };
}

function countLivingPopulation(state: GameState, tribeId: TribeId): number {
  return Object.values(state.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
}

export function getPopulationCap(state: GameState, tribeId: TribeId): number {
  const tribe = state.tribes[tribeId];
  const houses = Object.values(state.buildings).filter((building) => building.tribeId === tribeId && building.type === "house" && building.hp > 0).length;
  const developmentCapacity = Math.max(0, Math.round(developmentEffectAmount(state, tribeId, "population_cap")));
  return tribe.populationCap + houses * 8 + developmentCapacity;
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
  return Object.values(state.buildings).filter((building) => building.hp > 0 && visible[tileIndex(building.x, building.y)] === 2);
}

export function getResourceDepositPosturesForTribe(
  state: GameState,
  tribeId: TribeId,
  options: { visibleOnly?: boolean; limit?: number } = {}
): ResourceDepositPosture[] {
  const visibleOnly = options.visibleOnly ?? false;
  const knowledge: ResourceKnowledgeMode = visibleOnly ? "visible" : "full";
  const visible = state.visibility[tribeId];
  const subjects = collectResourceInfluenceSubjects(state, tribeId, knowledge);
  const postures: ResourceDepositPosture[] = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const index = tileIndex(x, y);
      const visibleNow = visible?.[index] === 2;
      if (visibleOnly && !visibleNow) continue;
      const resource = state.map[index].resource;
      if (!resource || resource.amount <= 0 || resource.hp <= 0) continue;
      postures.push(evaluateResourceDepositPosture(state, tribeId, x, y, resource, subjects, knowledge, visibleNow));
    }
  }
  const scarcityRank: Record<ResourceType, number> = { coal: 8, iron: 7, gold: 6, limestone: 5, stone: 4, clay: 3, wood: 2, food: 1 };
  const sorted = postures.sort(
    (left, right) =>
      Number(right.control === "controlled") - Number(left.control === "controlled") ||
      Number(right.control === "contested") - Number(left.control === "contested") ||
      Number(right.raided) - Number(left.raided) ||
      scarcityRank[right.type] - scarcityRank[left.type] ||
      right.amount - left.amount ||
      left.distanceToTownHall - right.distanceToTownHall
  );
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

export function getVisibleResourceDepositIntel(state: GameState, tribeId: TribeId, limit = 10): ResourceDepositPosture[] {
  return getResourceDepositPosturesForTribe(state, tribeId, { visibleOnly: true, limit });
}

export function getResourceControlSummary(state: GameState, tribeId: TribeId): ResourceControlSummary {
  const cached = resourceControlSummaryCache.get(state);
  if (cached && state.tick - cached.tick < RESOURCE_CONTROL_CACHE_TICKS && cached.byTribe[tribeId]) return cached.byTribe[tribeId];
  const summary = computeResourceControlSummary(state, tribeId);
  const nextCache =
    cached && state.tick - cached.tick < RESOURCE_CONTROL_CACHE_TICKS
      ? cached
      : { tick: state.tick, byTribe: {} as Partial<Record<TribeId, ResourceControlSummary>> };
  nextCache.byTribe[tribeId] = summary;
  resourceControlSummaryCache.set(state, nextCache);
  return summary;
}

function computeResourceControlSummary(state: GameState, tribeId: TribeId): ResourceControlSummary {
  const postures = getResourceDepositPosturesForTribe(state, tribeId);
  const recentDenials = getRecentResourceDenials(state);
  const summary: ResourceControlSummary = {
    tribeId,
    controlledDeposits: 0,
    defendedDeposits: 0,
    vulnerableDeposits: 0,
    contestedDeposits: 0,
    raidedDeposits: 0,
    visibleDeposits: 0,
    recentDeniedDeposits: 0,
    recentDeniedLosses: 0,
    controlledValue: 0,
    defendedValue: 0,
    vulnerableValue: 0,
    contestedValue: 0,
    raidedValue: 0,
    deniedValue: 0,
    deniedLossValue: 0,
    survivalBonus: 0
  };
  for (const posture of postures) {
    const value = resourcePostureValue(posture);
    if (posture.visible) summary.visibleDeposits += 1;
    if (posture.control === "controlled") {
      summary.controlledDeposits += 1;
      summary.controlledValue += value;
      if (posture.defended) {
        summary.defendedDeposits += 1;
        summary.defendedValue += value;
      } else {
        summary.vulnerableDeposits += 1;
        summary.vulnerableValue += value;
      }
    }
    if (posture.control === "contested") {
      summary.contestedDeposits += 1;
      summary.contestedValue += value;
    }
    if (posture.raided && (posture.control === "controlled" || posture.control === "contested" || posture.raiders.includes(tribeId))) {
      summary.raidedDeposits += 1;
      summary.raidedValue += value;
    }
  }
  for (const denial of recentDenials) {
    const value = resourceDenialValue(denial);
    if (denial.attackerTribeId === tribeId) {
      summary.recentDeniedDeposits += 1;
      summary.deniedValue += value;
    }
    if (denial.controlledBy === tribeId && denial.attackerTribeId !== tribeId) {
      summary.recentDeniedLosses += 1;
      summary.deniedLossValue += value;
    }
  }
  summary.controlledValue = Math.round(summary.controlledValue);
  summary.defendedValue = Math.round(summary.defendedValue);
  summary.vulnerableValue = Math.round(summary.vulnerableValue);
  summary.contestedValue = Math.round(summary.contestedValue);
  summary.raidedValue = Math.round(summary.raidedValue);
  summary.deniedValue = Math.round(summary.deniedValue);
  summary.deniedLossValue = Math.round(summary.deniedLossValue);
  summary.survivalBonus = Math.round(
    clamp(
      summary.controlledValue * 0.015 +
        summary.defendedValue * 0.01 -
        summary.vulnerableValue * 0.01 -
        summary.contestedValue * 0.008 -
        summary.raidedValue * 0.02 +
        summary.deniedValue * 0.004 -
        summary.deniedLossValue * 0.025,
      -18,
      22
    )
  );
  return summary;
}

type ResourceKnowledgeMode = "full" | "visible";

type ResourceInfluenceSubject = {
  tribeId: TribeId;
  x: number;
  y: number;
  controlPower: number;
  controlRadius: number;
  defensePower: number;
  defenseRadius: number;
};

const RESOURCE_DENIAL_LOOKBACK_TICKS = TICKS_PER_GAME_YEAR * 50;
const RESOURCE_CONTROL_CACHE_TICKS = TICK_RATE * 2;
const resourceControlSummaryCache = new WeakMap<GameState, { tick: number; byTribe: Partial<Record<TribeId, ResourceControlSummary>> }>();
const resourceValueWeights: Record<ResourceType, number> = {
  gold: 3.5,
  food: 0.2,
  wood: 0.25,
  stone: 1.2,
  clay: 1.2,
  limestone: 1.6,
  iron: 3,
  coal: 2.8
};

function collectResourceInfluenceSubjects(state: GameState, perspectiveTribeId: TribeId, knowledge: ResourceKnowledgeMode): ResourceInfluenceSubject[] {
  const subjects: ResourceInfluenceSubject[] = [];
  const visible = state.visibility[perspectiveTribeId];
  for (const unit of Object.values(state.units)) {
    if (unit.hp <= 0 || !isTribeActive(state, unit.tribeId)) continue;
    if (knowledge === "visible" && unit.tribeId !== perspectiveTribeId && !isPositionVisible(visible, Math.round(unit.x), Math.round(unit.y))) continue;
    subjects.push({
      tribeId: unit.tribeId,
      x: unit.x,
      y: unit.y,
      controlPower: unitResourceControlPower(unit.type),
      controlRadius: 7,
      defensePower: unitResourceDefensePower(unit.type),
      defenseRadius: unit.type === "archer" ? 8 : 6
    });
  }
  for (const building of Object.values(state.buildings)) {
    if (building.hp <= 0 || !isTribeActive(state, building.tribeId)) continue;
    if (knowledge === "visible" && building.tribeId !== perspectiveTribeId && !isPositionVisible(visible, building.x, building.y)) continue;
    subjects.push({
      tribeId: building.tribeId,
      x: building.x,
      y: building.y,
      controlPower: buildingResourceControlPower(building.type),
      controlRadius: buildingResourceControlRadius(building.type),
      defensePower: buildingResourceDefensePower(building),
      defenseRadius: buildingResourceDefenseRadius(building)
    });
  }
  return subjects;
}

function evaluateResourceDepositPosture(
  state: GameState,
  perspectiveTribeId: TribeId,
  x: number,
  y: number,
  resource: ResourceDeposit,
  subjects: ResourceInfluenceSubject[],
  knowledge: ResourceKnowledgeMode,
  visibleNow: boolean
): ResourceDepositPosture {
  const target = { x, y };
  const base = findTownHall(state, perspectiveTribeId) ?? starts[perspectiveTribeId];
  const influence = scoreResourceInfluence(subjects, target);
  const ranked = influence.slice().sort((left, right) => right.score - left.score || left.distance - right.distance);
  const nearest = influence.slice().sort((left, right) => left.distance - right.distance)[0];
  const best = ranked.find((entry) => entry.score >= 1);
  const runnerUp = ranked.find((entry) => entry.tribeId !== best?.tribeId && entry.score >= 1);
  const contested = Boolean(best && runnerUp && runnerUp.score >= Math.max(best.score - 1.5, best.score * 0.78));
  const controlledBy = best && !contested ? best.tribeId : undefined;
  const control: ResourceDepositControl = !best ? "uncontrolled" : contested ? "contested" : best.tribeId === perspectiveTribeId ? "controlled" : "foreign_controlled";
  const defenseScore = scoreResourceDefense(subjects, target, perspectiveTribeId);
  const hostileDefenseScore = Math.max(
    0,
    ...tribeIds.filter((tribeId) => tribeId !== perspectiveTribeId).map((tribeId) => scoreResourceDefense(subjects, target, tribeId))
  );
  const raiders = resourceRaiders(state, target, resource.type, perspectiveTribeId, knowledge);
  return {
    type: resource.type,
    x,
    y,
    amount: Math.round(resource.amount),
    hp: Math.ceil(resource.hp),
    maxHp: resource.maxHp,
    armor: resource.armor,
    attack: resource.attack,
    range: resource.range,
    distanceToTownHall: Math.round(distance(base, target)),
    control,
    controlledBy,
    nearestTribe: nearest?.tribeId,
    nearestTribeDistance: nearest ? Math.round(nearest.distance) : undefined,
    defended: defenseScore >= 4,
    defenseScore: Math.round(defenseScore),
    hostileDefended: hostileDefenseScore >= 4,
    hostileDefenseScore: Math.round(hostileDefenseScore),
    raided: resource.hp < resource.maxHp || raiders.length > 0,
    underAttack: raiders.length > 0,
    raiders,
    visible: visibleNow
  };
}

function scoreResourceInfluence(subjects: ResourceInfluenceSubject[], target: Position): Array<{ tribeId: TribeId; score: number; distance: number }> {
  const byTribe = new Map<TribeId, { score: number; distance: number }>();
  for (const subject of subjects) {
    const subjectDistance = distance(subject, target);
    const current = byTribe.get(subject.tribeId) ?? { score: 0, distance: Number.POSITIVE_INFINITY };
    if (subjectDistance < current.distance) current.distance = subjectDistance;
    if (subjectDistance <= subject.controlRadius) {
      current.score += subject.controlPower * (1 - subjectDistance / Math.max(1, subject.controlRadius));
    }
    byTribe.set(subject.tribeId, current);
  }
  return tribeIds
    .filter((tribeId) => byTribe.has(tribeId))
    .map((tribeId) => {
      const entry = byTribe.get(tribeId)!;
      return { tribeId, score: entry.score, distance: entry.distance };
    });
}

function scoreResourceDefense(subjects: ResourceInfluenceSubject[], target: Position, tribeId: TribeId): number {
  return subjects
    .filter((subject) => subject.tribeId === tribeId)
    .reduce((sum, subject) => {
      const subjectDistance = distance(subject, target);
      if (subjectDistance > subject.defenseRadius) return sum;
      return sum + subject.defensePower * (1 - subjectDistance / Math.max(1, subject.defenseRadius));
    }, 0);
}

function resourceRaiders(
  state: GameState,
  target: Position,
  resourceType: ResourceType,
  perspectiveTribeId: TribeId,
  knowledge: ResourceKnowledgeMode
): TribeId[] {
  const visible = state.visibility[perspectiveTribeId];
  const raiders = new Set<TribeId>();
  for (const unit of Object.values(state.units)) {
    if (unit.hp <= 0 || unit.task.kind !== "attackResource" || unit.task.resource !== resourceType) continue;
    if (unit.task.target.x !== target.x || unit.task.target.y !== target.y) continue;
    if (knowledge === "visible" && unit.tribeId !== perspectiveTribeId && !isPositionVisible(visible, Math.round(unit.x), Math.round(unit.y))) continue;
    raiders.add(unit.tribeId);
  }
  return Array.from(raiders);
}

function resourcePostureValue(posture: Pick<ResourceDepositPosture, "type" | "amount" | "hp" | "maxHp">): number {
  const condition = posture.maxHp > 0 ? clamp(posture.hp / posture.maxHp, 0.25, 1) : 1;
  return Math.min(18, Math.sqrt(Math.max(1, posture.amount)) * resourceValueWeights[posture.type]) * condition;
}

function resourceDenialValue(denial: ResourceDenialRecord): number {
  return Math.min(18, Math.sqrt(Math.max(1, denial.amount)) * resourceValueWeights[denial.type]);
}

function getRecentResourceDenials(state: GameState): ResourceDenialRecord[] {
  const denials = (state as GameState & { resourceDenials?: ResourceDenialRecord[] }).resourceDenials ?? [];
  return denials.filter((denial) => state.tick - denial.tick <= RESOURCE_DENIAL_LOOKBACK_TICKS);
}

export function getRecentResourceDepletions(state: GameState): ResourceDepletionRecord[] {
  const depletions = (state as GameState & { resourceDepletions?: ResourceDepletionRecord[] }).resourceDepletions ?? [];
  return depletions.filter((depletion) => state.tick - depletion.tick <= RESOURCE_DENIAL_LOOKBACK_TICKS);
}

function ensureResourceDenials(state: GameState): ResourceDenialRecord[] {
  const mutable = state as GameState & { resourceDenials?: ResourceDenialRecord[] };
  if (!mutable.resourceDenials) mutable.resourceDenials = [];
  return mutable.resourceDenials;
}

function ensureResourceDepletions(state: GameState): ResourceDepletionRecord[] {
  const mutable = state as GameState & { resourceDepletions?: ResourceDepletionRecord[] };
  if (!mutable.resourceDepletions) mutable.resourceDepletions = [];
  return mutable.resourceDepletions;
}

function invalidateResourceControlCache(state: GameState): void {
  resourceControlSummaryCache.delete(state);
}

function resourceEventVisibleTo(state: GameState, target: Position, extraTribes: Array<TribeId | undefined>): TribeId[] {
  const visible = new Set<TribeId>();
  for (const tribeId of extraTribes) if (tribeId) visible.add(tribeId);
  const index = tileIndex(target.x, target.y);
  for (const tribeId of tribeIds) {
    if (state.visibility[tribeId]?.[index] === 2) visible.add(tribeId);
  }
  return Array.from(visible);
}

function directVisionVisibleTo(state: GameState, target: Position, extraTribes: Array<TribeId | undefined>): TribeId[] {
  const visible = new Set<TribeId>();
  for (const tribeId of extraTribes) if (tribeId) visible.add(tribeId);
  for (const tribeId of tribeIds) {
    if (!isTribeActive(state, tribeId)) continue;
    const unitSees = Object.values(state.units).some(
      (unit) => unit.tribeId === tribeId && unit.hp > 0 && distance(unit, target) <= unit.visionRadius
    );
    if (unitSees) {
      visible.add(tribeId);
      continue;
    }
    const buildingSees = Object.values(state.buildings).some(
      (building) =>
        building.tribeId === tribeId &&
        building.hp > 0 &&
        distance(building, target) <= (buildingStats[building.type]?.visionRadius ?? 0)
    );
    if (buildingSees) visible.add(tribeId);
  }
  return Array.from(visible);
}

function dominantResourceController(state: GameState, target: Position, resource: ResourceDeposit): TribeId | undefined {
  const subjects = collectResourceInfluenceSubjects(state, "blue", "full");
  const influence = scoreResourceInfluence(subjects, target).sort((left, right) => right.score - left.score || left.distance - right.distance);
  const best = influence.find((entry) => entry.score >= 1);
  const runnerUp = influence.find((entry) => entry.tribeId !== best?.tribeId && entry.score >= 1);
  if (!best) return undefined;
  if (runnerUp && runnerUp.score >= Math.max(best.score - 1.5, best.score * 0.78)) return undefined;
  return resource.amount > 0 ? best.tribeId : undefined;
}

function recordResourceDenial(
  state: GameState,
  target: Position,
  resource: ResourceDeposit,
  attackerTribeId: TribeId,
  controlledBy: TribeId | undefined,
  visibleTo: TribeId[]
): void {
  const denials = ensureResourceDenials(state);
  denials.push({
    id: nextId(state, "resource_denial"),
    tick: state.tick,
    type: resource.type,
    x: target.x,
    y: target.y,
    amount: Math.max(1, Math.round(resource.amount)),
    maxHp: resource.maxHp,
    attackerTribeId,
    controlledBy,
    visibleTo
  });
  while (denials.length > 80) denials.shift();
  invalidateResourceControlCache(state);
}

function recordResourceDepletion(
  state: GameState,
  target: Position,
  resource: ResourceDeposit,
  depletedByTribeId: TribeId | undefined,
  controlledBy: TribeId | undefined,
  visibleTo: TribeId[]
): void {
  const depletions = ensureResourceDepletions(state);
  depletions.push({
    id: nextId(state, "resource_depletion"),
    tick: state.tick,
    type: resource.type,
    x: target.x,
    y: target.y,
    amount: Math.max(1, Math.round(resource.amount)),
    maxHp: resource.maxHp,
    depletedByTribeId,
    controlledBy,
    visibleTo
  });
  while (depletions.length > 120) depletions.shift();
  invalidateResourceControlCache(state);
}

function unitResourceControlPower(type: UnitType): number {
  if (type === "siege_engine" || type === "battering_ram" || type === "catapult") return 3;
  if (type === "militia" || type === "archer") return 5;
  if (type === "sentinel") return 4;
  if (type === "sovereign") return 3.5;
  if (type === "peon") return 3;
  return 1.5;
}

function unitResourceDefensePower(type: UnitType): number {
  if (type === "siege_engine" || type === "battering_ram" || type === "catapult") return 3;
  if (type === "militia" || type === "archer") return 5;
  if (type === "sentinel") return 2.5;
  if (type === "sovereign") return 2;
  return 0.5;
}

function buildingResourceControlPower(type: BuildingType): number {
  if (type === "townHall") return 12;
  if (type === "turret") return 8;
  if (type === "watchtower") return 7;
  if (type === "barracks" || type === "market") return 4;
  if (type === "farm") return 3;
  if (type === "house") return 2;
  if (type === "gate") return 2.5;
  if (type === "wall") return 1.5;
  return 1;
}

function buildingResourceControlRadius(type: BuildingType): number {
  if (type === "townHall") return 24;
  if (type === "turret" || type === "watchtower") return 13;
  if (type === "barracks" || type === "market") return 10;
  if (type === "farm") return 8;
  if (type === "house") return 7;
  if (type === "gate" || type === "wall") return 5;
  return 7;
}

function buildingResourceDefensePower(building: Building): number {
  if (building.type === "turret") return 12;
  if (building.type === "watchtower") return 5;
  if (building.type === "barracks") return 3;
  if (building.type === "gate") return 2;
  if (building.type === "wall") return 1.5;
  return building.type === "townHall" ? 2 : 0;
}

function buildingResourceDefenseRadius(building: Building): number {
  if (building.type === "turret") return Math.max(8, building.range + 2);
  if (building.type === "watchtower") return 9;
  if (building.type === "barracks") return 8;
  if (building.type === "wall" || building.type === "gate") return 5;
  return building.type === "townHall" ? 10 : 3;
}

function isPositionVisible(visible: Uint8Array | undefined, x: number, y: number): boolean {
  if (!visible || x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
  return visible[tileIndex(x, y)] === 2;
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
    /\b(private|secret|hidden|unseen|intent|plans?|strategy|treasury|treasuries|stockpiles?|stash|resources?|wealth|rich|poorest|army|armies|deposits?|mines?|ore)\b/.test(lower) &&
    /\b(enemy|rival|foreign|other|their|opponent|opponents?|red|green|yellow|purple|blue)\b/.test(lower);
  const answerStatus: AiInformationRequest["answerStatus"] = asksHidden ? "partial" : "answered";
  const hiddenCaveat = asksHidden
    ? "Private rival intent, unseen armies, hidden treasuries, and unscouted deposits are not directly observable; scout, send a messenger, or provoke a public event to learn more."
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
  const deposits = getVisibleResourceDepositIntel(state, tribeId, 24).filter((deposit) => wanted.includes(deposit.type));
  if (deposits.length === 0) {
    return `Visible resource answer: no ${wanted.join("/")} deposits are currently visible; scout roads, borders, and the center before committing workers or armies.`;
  }
  deposits.sort((left, right) => left.distanceToTownHall - right.distanceToTownHall || right.amount - left.amount);
  return `Visible resource answer: ${deposits
    .slice(0, 6)
    .map(
      (deposit) =>
        `${deposit.type} at ${deposit.x},${deposit.y} amount ${deposit.amount} (${deposit.distanceToTownHall} tiles, ${formatResourcePostureForIntel(
          state,
          tribeId,
          deposit
        )})`
    )
    .join("; ")}.`;
}

function formatResourcePostureForIntel(state: GameState, tribeId: TribeId, deposit: ResourceDepositPosture): string {
  const control =
    deposit.control === "controlled"
      ? "controlled by you"
      : deposit.control === "contested"
        ? "contested"
        : deposit.control === "foreign_controlled"
          ? `foreign-controlled${deposit.controlledBy ? ` by visible ${state.tribes[deposit.controlledBy].name}` : ""}`
          : "uncontrolled";
  const defense = deposit.defended ? "defended by you" : deposit.hostileDefended ? "hostile defenses visible" : "undefended";
  const raid = deposit.underAttack ? `under attack by ${deposit.raiders.join("/")}` : deposit.raided ? "damaged or raided" : "intact";
  return `${control}, ${defense}, ${raid}`;
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
  const projectiles = Object.values(state.projectiles)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${p.projectileType}:${p.tribeId}:${p.targetBuildingId}:${p.x.toFixed(2)},${p.y.toFixed(2)}:${p.impactTick}`)
    .join("|");
  const gates = Object.values(state.buildings)
    .filter((building) => building.type === "gate" && building.hp > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (gate) =>
        `${gate.id}:${gate.tribeId}:${gate.gateState ?? "open"}:${gate.gateAccessPolicy ?? "owner_allies"}:${gate.gateOperation?.id ?? "none"}:${
          gate.gateSabotage?.action ?? "none"
        }`
    )
    .join("|");
  const gateTreaties = state.gateAccessTreaties
    .slice(-20)
    .map((treaty) => `${treaty.id}:${treaty.buildingId}:${treaty.targetTribeId}:${treaty.action}:${treaty.expiresAtTick ?? "never"}`)
    .join("|");
  const gateSabotage = state.gateSabotageHistory
    .slice(-20)
    .map((record) => `${record.id}:${record.buildingId}:${record.tribeId}:${record.action}:${record.expiresAtTick ?? "none"}`)
    .join("|");
  const gateTreatyIncidents = state.gateTreatyIncidents
    .slice(-20)
    .map(
      (record) =>
        `${record.id}:${record.treatyId}:${record.buildingId}:${record.affectedTribeId}:${record.packetId}:${record.action}:w${record.witnessTribeIds.join(",")}`
    )
    .join("|");
  const resourceDepletions = (state.resourceDepletions ?? [])
    .slice(-20)
    .map((record) => `${record.id}:${record.type}:${record.x},${record.y}:${record.depletedByTribeId ?? "none"}`)
    .join("|");
  return `${state.tick};${units};${packets};${projectiles};${gates};${gateTreaties};${gateSabotage};${gateTreatyIncidents};${resourceDepletions}`;
}

function spawnTribe(state: GameState, tribeId: TribeId, start: Position): void {
  addBuilding(state, tribeId, "townHall", start.x, start.y);
  addBuilding(state, tribeId, "farm", start.x - 4, start.y + 2);
  addBuilding(state, tribeId, "house", start.x - 2, start.y - 3);
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
  const stats = effectiveUnitStats(state, tribeId, type);
  const unit: Unit = {
    id,
    name: id,
    type,
    tribeId,
    x,
    y,
    ...stats,
    task: { kind: "idle" }
  };
  state.units[id] = unit;
  return unit;
}

function addBuilding(state: GameState, tribeId: TribeId, type: BuildingType, x: number, y: number): Building {
  const id = nextId(state, type);
  const stats = effectiveBuildingStats(state, tribeId, type);
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
  if (type === "gate") {
    building.gateState = "open";
    building.gateAccessPolicy = "owner_allies";
  }
  state.buildings[id] = building;
  return building;
}

function updateScriptedAi(state: GameState): void {
  for (const tribeId of tribeIds) {
    const tribe = state.tribes[tribeId];
    if (!isTribeActive(state, tribeId)) continue;
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
  if (population >= getPopulationCap(state, tribeId)) return;
  const townHall = findTownHall(state, tribeId);
  if (!townHall) return;
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
  const populationCap = getPopulationCap(state, tribeId);
  if (population >= populationCap) return { ok: false, reason: `population cap reached (${population}/${populationCap}); build houses or settlement developments` };
  const cost = unitType === "messenger" ? { food: 40, gold: 10 } : { food: 30, gold: 20 };
  if (tribe.resources.food < cost.food || tribe.resources.gold < cost.gold) return { ok: false, reason: `not enough resources for ${unitType}` };
  const townHall = findTownHall(state, tribeId);
  if (!townHall) return { ok: false, reason: "town hall destroyed" };
  tribe.resources.food -= cost.food;
  tribe.resources.gold -= cost.gold;
  const unit = addUnit(state, tribeId, unitType, townHall.x + 2, townHall.y + 1);
  addEvent(state, "UNIT_TRAINED", `${tribe.name} trains ${unitType}`, `${unit.name} is ready for orders.`, [tribeId]);
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

function findBuildSite(state: GameState, near: Position, reserved: Set<string> = new Set()): Position | undefined {
  const origin = { x: Math.round(near.x), y: Math.round(near.y) };
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
        if (reserved.has(`${x},${y}`)) continue;
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

function labelResourceType(type: ResourceType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatGateAccessPolicy(policy: GateAccessPolicy): string {
  if (policy === "all") return "all tribes";
  if (policy === "owner_only") return "owner only";
  return "owner and allies";
}

function updateGateOperations(state: GameState): void {
  for (const building of Object.values(state.buildings)) {
    const operation = building.gateOperation;
    if (!operation?.expiresAtTick || operation.expiresAtTick > state.tick) continue;
    delete building.gateOperation;
    addEvent(
      state,
      "GATE_OPERATION_EXPIRED",
      `${state.tribes[building.tribeId].name}'s gate operation expires`,
      `Gate ${building.id} at ${building.x},${building.y} no longer applies operation ${operation.gateOperationIntent ?? operation.id}.`,
      [building.tribeId]
    );
  }
}

export function getActiveGateAccessTreaties(state: GameState, buildingId: string): GateAccessTreatyRecord[] {
  const latestByTarget = new Map<TribeId, GateAccessTreatyRecord>();
  for (const treaty of state.gateAccessTreaties) {
    if (treaty.buildingId !== buildingId) continue;
    const current = latestByTarget.get(treaty.targetTribeId);
    if (!current || treaty.tick > current.tick || (treaty.tick === current.tick && treaty.id.localeCompare(current.id) > 0)) {
      latestByTarget.set(treaty.targetTribeId, treaty);
    }
  }
  return [...latestByTarget.values()]
    .filter((treaty) => treaty.action === "grant" && (!treaty.expiresAtTick || treaty.expiresAtTick > state.tick))
    .sort((left, right) => left.targetTribeId.localeCompare(right.targetTribeId));
}

function hasActiveGateAccessTreaty(state: GameState, building: Building, tribeId: TribeId): boolean {
  return getActiveGateAccessTreaties(state, building.id).some((treaty) => treaty.targetTribeId === tribeId);
}

function activeGateAccessTreatyForTribe(state: GameState, buildingId: string, tribeId: TribeId): GateAccessTreatyRecord | undefined {
  return getActiveGateAccessTreaties(state, buildingId).find((treaty) => treaty.targetTribeId === tribeId);
}

function recordGateTreatyIncident(state: GameState, packet: Packet, operation: GateOperationState, resolution: GatePacketResolution): GateTreatyIncidentRecord | undefined {
  if (resolution.action !== "refuse" && resolution.action !== "detain" && resolution.action !== "ambush") return undefined;
  const treaty = activeGateAccessTreatyForTribe(state, operation.buildingId, packet.originTribeId);
  if (!treaty) return undefined;
  const gate = state.buildings[operation.buildingId];
  const gatePosition = gate ? { x: gate.x, y: gate.y } : packet.destination;
  const participantTribeIds = Array.from(new Set<TribeId>([treaty.tribeId, packet.originTribeId]));
  const visibleTribes = directVisionVisibleTo(state, gatePosition, participantTribeIds);
  const witnessTribeIds = visibleTribes.filter((tribeId) => !participantTribeIds.includes(tribeId));
  const treatyName = treaty.treatyName ? ` "${treaty.treatyName}"` : "";
  const tollText = resolution.tollUnpaid ? ` after unpaid required toll ${resolution.tollGold}` : "";
  const summary = `Active gate treaty ${treaty.id}${treatyName} covered ${state.tribes[packet.originTribeId].name}'s packet ${packet.id}, but gate operation ${operation.id} applied ${resolution.action}${tollText} at ${state.tribes[treaty.tribeId].name} gate ${operation.buildingId}${gate ? ` at ${gate.x},${gate.y}` : ""}.`;
  const incident: GateTreatyIncidentRecord = {
    id: nextId(state, "gateincident"),
    tick: state.tick,
    treatyId: treaty.id,
    treatyName: treaty.treatyName,
    buildingId: operation.buildingId,
    gateOwnerTribeId: treaty.tribeId,
    affectedTribeId: packet.originTribeId,
    packetId: packet.id,
    gateOperationId: operation.id,
    action: resolution.action,
    participantTribeIds,
    witnessTribeIds,
    tollGold: resolution.tollGold > 0 ? resolution.tollGold : undefined,
    tollUnpaid: resolution.tollUnpaid || undefined,
    summary
  };
  pushBoundedRecord(state.gateTreatyIncidents, incident, 160);
  packet.routeMemory.push(`Gate treaty incident ${incident.id}: ${summary}`);
  if (packet.routeMemory.length > 12) packet.routeMemory.splice(0, packet.routeMemory.length - 12);
  addEvent(state, "GATE_TREATY_INCIDENT_RECORDED", "Gate treaty incident recorded", summary, participantTribeIds);
  return incident;
}

function updateGateAccessTreaties(state: GameState): void {
  for (const treaty of state.gateAccessTreaties) {
    if (treaty.action !== "grant" || !treaty.expiresAtTick || treaty.expiresAtTick > state.tick || treaty.expiredAnnounced) continue;
    const latestForTarget = state.gateAccessTreaties
      .filter((candidate) => candidate.buildingId === treaty.buildingId && candidate.targetTribeId === treaty.targetTribeId)
      .sort((left, right) => right.tick - left.tick || right.id.localeCompare(left.id))[0];
    if (latestForTarget?.id !== treaty.id) {
      treaty.expiredAnnounced = true;
      continue;
    }
    treaty.expiredAnnounced = true;
    const gate = state.buildings[treaty.buildingId];
    addEvent(
      state,
      "GATE_ACCESS_TREATY_EXPIRED",
      `${state.tribes[treaty.tribeId].name}'s gate access treaty expires`,
      `Gate ${treaty.buildingId}${gate ? ` at ${gate.x},${gate.y}` : ""} no longer grants passage to ${state.tribes[treaty.targetTribeId].name}.`,
      [treaty.tribeId, treaty.targetTribeId]
    );
  }
}

function updateGateSabotage(state: GameState): void {
  for (const building of Object.values(state.buildings)) {
    if (building.type !== "gate" || !building.gateSabotage) continue;
    const sabotage = building.gateSabotage;
    if (!sabotage.expiresAtTick || sabotage.expiresAtTick > state.tick) continue;
    building.gateState = sabotage.previousGateState ?? building.gateState ?? "open";
    delete building.gateSabotage;
    addEvent(
      state,
      "GATE_SABOTAGE_EXPIRED",
      `${state.tribes[building.tribeId].name}'s gate is no longer sabotaged`,
      `Gate ${building.id} at ${building.x},${building.y} recovers from ${sabotage.action} and returns to ${building.gateState ?? "open"}.`,
      [building.tribeId, sabotage.tribeId]
    );
  }
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
        if (unit.task.path.length === 0 && distance(unit, unit.task.target) >= 0.35) {
          const refreshed = findPath(state, unit, unit.task.target);
          if (pathArrives(refreshed, unit.task.target)) {
            unit.task.path = refreshed;
            moveAlongPath(state, unit, unit.task.path);
          } else {
            unit.task = { kind: "idle" };
            break;
          }
        }
        if (distance(unit, unit.task.target) < 0.35) unit.task = { kind: "idle" };
        break;
      case "gather":
        updateGatherer(state, unit);
        break;
      case "deliver":
        updateMessenger(state, unit, unit.task);
        break;
      case "attack":
      case "attackBuilding":
      case "attackResource":
        updateAttacker(state, unit);
        break;
      case "repair":
        updateRepairer(state, unit);
        break;
    }
  }
}

function updateGatherer(state: GameState, unit: Unit): void {
  if (unit.task.kind !== "gather") return;
  const task = unit.task;
  const targetTile = state.map[tileIndex(task.target.x, task.target.y)];
  const targetResourceAvailable =
    task.resource === "wood"
      ? targetTile.resource?.type === "wood" && targetTile.resource.amount > 0 && targetTile.resource.hp > 0
      : targetTile.resource?.type === task.resource && targetTile.resource.amount > 0 && targetTile.resource.hp > 0;
  if (task.cargo >= 10) {
    if (distance(unit, task.dropoff) > 0.45) {
      if (task.path.length === 0) task.path = findPath(state, unit, task.dropoff);
      moveAlongPath(state, unit, task.path);
      if (task.path.length === 0 && distance(unit, task.dropoff) > 0.45) {
        const refreshed = findPath(state, unit, task.dropoff);
        if (!pathArrives(refreshed, task.dropoff)) {
          unit.task = { kind: "idle" };
          return;
        }
        task.path = refreshed;
      }
      return;
    }
    state.tribes[unit.tribeId].resources[task.resource] += task.cargo;
    task.cargo = 0;
    task.path = findPath(state, unit, task.target);
    return;
  }
  if (task.cargo > 0 && !targetResourceAvailable && !findNearestResource(state, unit, task.resource)) {
    if (distance(unit, task.dropoff) > 0.45) {
      if (task.path.length === 0) task.path = findPath(state, unit, task.dropoff);
      moveAlongPath(state, unit, task.path);
      return;
    }
    state.tribes[unit.tribeId].resources[task.resource] += task.cargo;
    task.cargo = 0;
    unit.task = { kind: "idle" };
    return;
  }
  if (distance(unit, task.target) > 0.45) {
    moveAlongPath(state, unit, task.path);
    if (task.path.length === 0 && distance(unit, task.target) > 0.45) {
      const refreshed = findPath(state, unit, task.target);
      if (!pathArrives(refreshed, task.target)) {
        unit.task = { kind: "idle" };
        return;
      }
      task.path = refreshed;
    }
    return;
  }
  if (task.resource === "wood" && targetTile.terrain === "forest") {
    if (targetTile.resource?.type === "wood") {
      if (targetTile.resource.amount <= 0 || targetTile.resource.hp <= 0) {
        depleteResourceDepositAt(state, task.target, unit.tribeId, { ...targetTile.resource });
        unit.task = { kind: "idle" };
        return;
      }
      const beforeHarvest = { ...targetTile.resource };
      targetTile.resource.amount = Math.max(0, targetTile.resource.amount - 1);
      targetTile.resource.hp = Math.max(0, targetTile.resource.hp - 1);
      invalidateResourceControlCache(state);
      task.cargo += 1;
      if (targetTile.resource.amount <= 0 || targetTile.resource.hp <= 0) {
        depleteResourceDepositAt(state, task.target, unit.tribeId, beforeHarvest);
      }
      return;
    }
    targetTile.terrain = "grass";
    const next = findNearestResource(state, unit, task.resource);
    if (!next) {
      unit.task = { kind: "idle" };
      return;
    }
    task.target = next;
    task.path = findPath(state, unit, next);
    return;
  }
  if (targetTile.resource && (targetTile.resource.amount <= 0 || targetTile.resource.hp <= 0)) {
    depleteResourceDepositAt(state, task.target, unit.tribeId, { ...targetTile.resource });
  }
  if (!targetTile.resource || targetTile.resource.amount <= 0 || targetTile.resource.hp <= 0) {
    const next = findNearestResource(state, unit, task.resource);
    if (!next) {
      unit.task = { kind: "idle" };
      return;
    }
    task.target = next;
    task.path = findPath(state, unit, next);
    return;
  }
  const beforeHarvest = { ...targetTile.resource };
  targetTile.resource.amount = Math.max(0, targetTile.resource.amount - 1);
  targetTile.resource.hp = Math.max(0, targetTile.resource.hp - 1);
  invalidateResourceControlCache(state);
  task.cargo += 1;
  if (targetTile.resource.amount <= 0 || targetTile.resource.hp <= 0) {
    depleteResourceDepositAt(state, task.target, unit.tribeId, beforeHarvest);
  }
}

function activeGateOperationForPacket(state: GameState, packet: Packet): GateOperationState | undefined {
  const candidateIds = packet.outboundGateBuildingIds?.length
    ? packet.outboundGateBuildingIds
    : recipientGateOperationCandidateIds(state, packet.recipientTribeId, [], packet.destination);
  for (const gateId of candidateIds) {
    const building = state.buildings[gateId];
    const operation = building?.type === "gate" && building.hp > 0 ? building.gateOperation : undefined;
    if (!operation) continue;
    if (operation.expiresAtTick && operation.expiresAtTick <= state.tick) continue;
    if (operation.targetTribeId && operation.targetTribeId !== packet.originTribeId) continue;
    return operation;
  }
  return undefined;
}

const GATE_OPERATION_PATH_RADIUS = 1.25;
const GATE_OPERATION_DESTINATION_RADIUS = 8;

function recipientGateOperationCandidateIds(state: GameState, recipientTribeId: TribeId, path: Position[], destination: Position): string[] {
  const gates = Object.values(state.buildings)
    .filter((building) => building.type === "gate" && building.hp > 0 && building.tribeId === recipientTribeId)
    .sort((left, right) => left.id.localeCompare(right.id));
  const pathCandidates = gates
    .map((gate) => {
      let bestPathIndex = Number.POSITIVE_INFINITY;
      let bestPathDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < path.length; index += 1) {
        const stepDistance = distance(gate, path[index]);
        if (stepDistance < bestPathDistance) {
          bestPathDistance = stepDistance;
          bestPathIndex = index;
        }
      }
      return { gate, bestPathIndex, bestPathDistance };
    })
    .filter((candidate) => candidate.bestPathDistance <= GATE_OPERATION_PATH_RADIUS)
    .sort((left, right) => left.bestPathIndex - right.bestPathIndex || left.bestPathDistance - right.bestPathDistance || left.gate.id.localeCompare(right.gate.id))
    .map((candidate) => candidate.gate.id);
  const ids = new Set(pathCandidates);
  const nearestDestinationGate = gates
    .map((gate) => ({ gate, distanceToDestination: distance(gate, destination) }))
    .filter((candidate) => candidate.distanceToDestination <= GATE_OPERATION_DESTINATION_RADIUS)
    .sort((left, right) => left.distanceToDestination - right.distanceToDestination || left.gate.id.localeCompare(right.gate.id))[0]?.gate.id;
  if (nearestDestinationGate) ids.add(nearestDestinationGate);
  return [...ids];
}

type GatePacketResolution = {
  action: GatePassageAction;
  tollGold: number;
  tollMode: GateTollMode;
  tollUnpaid: boolean;
};

function resolveGatePacketResolution(state: GameState, packet: Packet, operation: GateOperationState | undefined): GatePacketResolution {
  if (!operation) return { action: "allow", tollGold: 0, tollMode: "none", tollUnpaid: false };
  const tollGold = operation.tollGold ?? 0;
  const tollMode = operation.tollMode ?? (tollGold > 0 ? "optional" : "none");
  const tollUnpaid = tollGold > 0 && tollMode === "required" && state.tribes[packet.originTribeId].resources.gold < tollGold;
  if (tollUnpaid) {
    return {
      action: operation.unpaidAction ?? "refuse",
      tollGold,
      tollMode,
      tollUnpaid
    };
  }
  return {
    action: operation.entryAction ?? (tollGold > 0 && tollMode !== "none" ? "delay" : "allow"),
    tollGold,
    tollMode,
    tollUnpaid: false
  };
}

function payGateTollIfPossible(state: GameState, packet: Packet, operation: GateOperationState, resolution: GatePacketResolution): boolean {
  if (resolution.tollGold <= 0 || resolution.tollMode === "none" || resolution.tollUnpaid) return false;
  if (state.tribes[packet.originTribeId].resources.gold < resolution.tollGold) {
    packet.routeMemory.push(`Could not pay ${resolution.tollGold} gold requested by gate operation ${operation.id}.`);
    return false;
  }
  state.tribes[packet.originTribeId].resources.gold -= resolution.tollGold;
  state.tribes[packet.recipientTribeId].resources.gold += resolution.tollGold;
  packet.routeMemory.push(`Paid ${resolution.tollGold} gold at gate operation ${operation.id}.`);
  addEvent(
    state,
    "GATE_TOLL_PAID",
    `${state.tribes[packet.originTribeId].name} pays a gate toll`,
    `${resolution.tollGold} gold passes to ${state.tribes[packet.recipientTribeId].name} under gate operation ${operation.id}.`,
    [packet.originTribeId, packet.recipientTribeId]
  );
  return true;
}

function packetCanBeHandledByGate(packet: Packet, gateId: string): boolean {
  return !packet.outboundGateBuildingIds || packet.outboundGateBuildingIds.length === 0 || packet.outboundGateBuildingIds.includes(gateId);
}

function findDetainedPacketForGateOperation(
  state: GameState,
  tribeId: TribeId,
  gateId: string,
  record: GateOperationRecord
): { ok: true; packet: Packet } | { ok: false; reason: string } {
  const packet = record.detainedPacketId ? state.packets[record.detainedPacketId] : undefined;
  if (packet) {
    if (packet.recipientTribeId !== tribeId) return { ok: false, reason: "detained packet belongs to another recipient" };
    if (packet.state !== "DETAINED") return { ok: false, reason: `packet is ${packet.state.toLowerCase().replaceAll("_", " ")}` };
    if (record.targetTribeId && packet.originTribeId !== record.targetTribeId) return { ok: false, reason: "detained packet origin does not match counterparty" };
    if (!packetCanBeHandledByGate(packet, gateId)) return { ok: false, reason: "detained packet is not associated with this gate" };
    return { ok: true, packet };
  }

  const candidates = Object.values(state.packets)
    .filter(
      (candidate) =>
        candidate.recipientTribeId === tribeId &&
        candidate.state === "DETAINED" &&
        (!record.targetTribeId || candidate.originTribeId === record.targetTribeId) &&
        packetCanBeHandledByGate(candidate, gateId)
    )
    .sort((left, right) => right.lastStateChangeTick - left.lastStateChangeTick || right.createdTick - left.createdTick || right.id.localeCompare(left.id));
  const latest = candidates[0];
  return latest ? { ok: true, packet: latest } : { ok: false, reason: "no detained packet matched this gate operation" };
}

function attachGateReleaseMessageToPacket(state: GameState, packet: Packet, record: GateOperationRecord): string | undefined {
  if (!record.releaseSubject && !record.releaseMessage) return undefined;
  if (packet.messageIds.length > 1) return undefined;
  const original = state.messages[packet.messageIds[0]];
  const message: Message = {
    id: nextId(state, "msg"),
    type: "REPLY",
    originTribeId: packet.recipientTribeId,
    recipientTribeId: packet.originTribeId,
    replyToMessageId: original?.id,
    subject: clampText(record.releaseSubject || `Released: ${original?.subject ?? packet.id}`, 80),
    body: clampText(record.releaseMessage || "Your detained messenger is released under gate terms.", 1200),
    diplomacyIntent: "NONE",
    requiresReply: false,
    createdTick: state.tick
  };
  state.messages[message.id] = message;
  packet.messageIds.push(message.id);
  recordMessageIntelForOwner(state, message, packet.recipientTribeId, "sent");
  return message.id;
}

function applyDetainedPacketGateOperation(
  state: GameState,
  tribeId: TribeId,
  gate: Building,
  record: GateOperationRecord
): { ok: true; summary: string } | { ok: false; reason: string } {
  if (!record.detainedPacketAction) return { ok: true, summary: "no detained packet action" };
  const resolved = findDetainedPacketForGateOperation(state, tribeId, gate.id, record);
  if (!resolved.ok) return resolved;
  const packet = resolved.packet;
  const carrier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
  if (!carrier || carrier.hp <= 0) return { ok: false, reason: "detained packet has no living carrier" };

  if (record.detainedPacketAction === "hold") {
    packet.routeMemory.push(`Gate operation ${record.id} keeps packet ${packet.id} detained.`);
    addEvent(
      state,
      "MESSENGER_HELD_AT_GATE",
      `${state.tribes[tribeId].name} keeps a messenger detained`,
      `${carrier.name} remains detained at gate ${gate.id} under operation ${record.id}.`,
      [packet.originTribeId, tribeId]
    );
    return { ok: true, summary: `kept ${packet.id} detained` };
  }

  if (record.detainedPacketAction === "ransom") {
    const ransomGold = record.ransomGold ?? 0;
    if (ransomGold <= 0) return { ok: false, reason: "ransom requires positive gateRansomGold" };
    if (state.tribes[packet.originTribeId].resources.gold < ransomGold) {
      packet.routeMemory.push(`Ransom ${ransomGold} gold under gate operation ${record.id} was unpaid; detention continues.`);
      addEvent(
        state,
        "GATE_RANSOM_UNPAID",
        `${state.tribes[packet.originTribeId].name} cannot pay a gate ransom`,
        `${state.tribes[packet.originTribeId].name} lacks ${ransomGold} gold to release ${carrier.name} from gate ${gate.id}.`,
        [packet.originTribeId, tribeId]
      );
      return { ok: true, summary: `ransom unpaid for ${packet.id}; detention continues` };
    }
    state.tribes[packet.originTribeId].resources.gold -= ransomGold;
    state.tribes[tribeId].resources.gold += ransomGold;
    packet.routeMemory.push(`Paid ${ransomGold} gold ransom under gate operation ${record.id}.`);
    addEvent(
      state,
      "GATE_RANSOM_PAID",
      `${state.tribes[packet.originTribeId].name} pays a gate ransom`,
      `${ransomGold} gold is paid to ${state.tribes[tribeId].name} to release ${carrier.name} from gate ${gate.id}.`,
      [packet.originTribeId, tribeId]
    );
  }

  const path = findPath(state, carrier, packet.returnTo);
  if (!pathArrives(path, packet.returnTo)) {
    markMessengerRouteBlocked(state, carrier, packet, "return route blocked after gate release");
    return { ok: false, reason: "released messenger has no passable return route" };
  }
  const releaseMessageId = attachGateReleaseMessageToPacket(state, packet, record);
  carrier.carriedPacketId = packet.id;
  carrier.task = {
    kind: "deliver",
    packetId: packet.id,
    phase: "returning",
    destination: { ...packet.destination },
    returnTo: { ...packet.returnTo },
    path
  };
  packet.carrierUnitId = carrier.id;
  packet.state = "IN_TRANSIT_RETURN";
  packet.lastStateChangeTick = state.tick;
  packet.routeMemory.push(
    `Released by gate operation ${record.id}${releaseMessageId ? ` with release message ${releaseMessageId}` : ""}; returning home.`
  );
  addEvent(
    state,
    "MESSENGER_RELEASED_AT_GATE",
    `${state.tribes[tribeId].name} releases a detained messenger`,
    `${carrier.name} carrying packet ${packet.id} is released from gate ${gate.id}${releaseMessageId ? " with a written reply" : ""}.`,
    [packet.originTribeId, tribeId]
  );
  return { ok: true, summary: `${record.detainedPacketAction} processed for ${packet.id}` };
}

function applyGateOperationPacketOutcome(state: GameState, unit: Unit, packet: Packet): boolean {
  const operation = activeGateOperationForPacket(state, packet);
  const resolution = resolveGatePacketResolution(state, packet, operation);
  if (!operation || resolution.action === "allow" || resolution.action === "delay") return false;
  packet.lastStateChangeTick = state.tick;
  packet.routeMemory.push(`Gate operation ${operation.id}: ${operation.gateOperationIntent ?? operation.reason}; action ${resolution.action}.`);
  if (resolution.tollUnpaid) packet.routeMemory.push(`Required toll ${resolution.tollGold} gold was unpaid.`);
  else payGateTollIfPossible(state, packet, operation, resolution);
  recordGateTreatyIncident(state, packet, operation, resolution);
  if (resolution.action === "ambush") {
    unit.hp = 0;
    unit.task = { kind: "idle" };
    unit.carriedPacketId = undefined;
    packet.hp = 0;
    packet.state = "KILLED_WITH_PACKET";
    packet.carrierUnitId = undefined;
    addEvent(
      state,
      "MESSENGER_AMBUSHED_AT_GATE",
      `${state.tribes[packet.recipientTribeId].name} ambushes a messenger`,
      `${unit.name} carrying a packet from ${state.tribes[packet.originTribeId].name} is killed at gate ${operation.buildingId}.`,
      [packet.originTribeId, packet.recipientTribeId]
	    );
    return true;
  }
  if (resolution.action === "detain") {
    packet.state = "DETAINED";
    unit.task = { kind: "idle" };
    addEvent(
      state,
      "MESSENGER_DETAINED_AT_GATE",
      `${state.tribes[packet.recipientTribeId].name} detains a messenger`,
      `${unit.name} carrying a packet from ${state.tribes[packet.originTribeId].name} is detained under gate operation ${operation.id}.`,
      [packet.originTribeId, packet.recipientTribeId]
	    );
    return true;
  }
  packet.state = "REFUSED_AT_GATE";
  packet.carrierUnitId = undefined;
  unit.carriedPacketId = undefined;
  unit.task = { kind: "idle" };
  addEvent(
    state,
    "MESSENGER_REFUSED_AT_GATE",
    `${state.tribes[packet.recipientTribeId].name} refuses a messenger`,
    `${unit.name}'s packet from ${state.tribes[packet.originTribeId].name} is refused at gate ${operation.buildingId}.`,
    [packet.originTribeId, packet.recipientTribeId]
  );
  return true;
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
      packet.outboundGateBuildingIds = recipientGateOperationCandidateIds(state, packet.recipientTribeId, path, task.destination);
      recordGateAccessTreatyRouteMemory(state, packet);
      task.path = path;
    }
    moveAlongPath(state, unit, task.path);
    recordRouteMemory(state, unit, packet);
    if (distance(unit, task.destination) < 0.45) {
      if (applyGateOperationPacketOutcome(state, unit, packet)) return;
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
    mergerLeaderTribeId?: TribeId;
    mergerTerms?: string;
  }
): { ok: true; messageId: string; allianceFormed?: boolean; mergerExecuted?: boolean; mergerRecordId?: string } | { ok: false; reason: string } {
  const packet = state.packets[packetId];
  if (!packet) return { ok: false, reason: "missing packet" };
  if (packet.state !== "AWAITING_REPLY") return { ok: false, reason: `packet is ${packet.state.toLowerCase().replaceAll("_", " ")}` };
  if (packet.messageIds.length > 1) return { ok: false, reason: "packet already has a reply" };
  const original = state.messages[packet.messageIds[0]];
  if (!original) return { ok: false, reason: "missing original message" };
  const replyOriginTribeId = packet.recipientTribeId;
  const replyRecipientTribeId = packet.originTribeId;
  const message: Message = {
    id: nextId(state, "msg"),
    type: "REPLY",
    originTribeId: replyOriginTribeId,
    recipientTribeId: replyRecipientTribeId,
    replyToMessageId: original.id,
    subject: clampText(reply.subject || `Re: ${original.subject}`, 80),
    body: clampText(reply.body || "We have received your messenger and will consider your position.", 1200),
    diplomacyIntent: reply.diplomacyIntent ?? "NONE",
    mergerLeaderTribeId: reply.mergerLeaderTribeId,
    mergerTerms: reply.mergerTerms ? clampText(reply.mergerTerms, 500) : undefined,
    requiresReply: false,
    createdTick: state.tick
  };
  state.messages[message.id] = message;
  packet.messageIds.push(message.id);
  recordMessageIntelForOwner(state, message, packet.recipientTribeId, "sent");
  const allianceFormed = resolveAllianceFromDiscussion(state, original, message);
  const merger = resolveMergerFromDiscussion(state, original, message);
  const carrier = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
  if (carrier?.task.kind === "deliver" && carrier.task.packetId === packet.id && carrier.task.phase === "waiting") {
    beginReturnTrip(state, carrier, carrier.task, packet);
  }
  addEvent(
    state,
    "REPLY_ATTACHED",
    `${state.tribes[replyOriginTribeId].name} replies`,
    `${message.subject} is sealed and given back to the messenger.${allianceFormed ? " The reply accepts an alliance." : ""}${
      merger ? " The reply executes a civilization merger." : ""
    }`,
    [replyRecipientTribeId, replyOriginTribeId]
  );
  return { ok: true, messageId: message.id, allianceFormed, mergerExecuted: Boolean(merger), mergerRecordId: merger?.id };
}

function updateAttacker(state: GameState, unit: Unit): void {
  if (unit.task.kind === "attack") {
    const target = state.units[unit.task.targetUnitId];
    if (!target || target.hp <= 0 || target.tribeId === unit.tribeId) {
      unit.task = { kind: "idle" };
      return;
    }
    if (distance(unit, target) <= unit.range) return;
    if (unit.task.path.length === 0) unit.task.path = findPath(state, unit, { x: target.x, y: target.y });
    moveAlongPath(state, unit, unit.task.path);
    return;
  }
  if (unit.task.kind === "attackResource") {
    const targetTile = state.map[tileIndex(unit.task.target.x, unit.task.target.y)];
    if (!targetTile.resource || targetTile.resource.type !== unit.task.resource || targetTile.resource.hp <= 0 || targetTile.resource.amount <= 0) {
      unit.task = { kind: "idle" };
      return;
    }
    if (distance(unit, unit.task.target) <= unit.range) return;
    if (unit.task.path.length === 0) unit.task.path = findPath(state, unit, findResourceAttackPosition(state, unit, unit.task.target));
    moveAlongPath(state, unit, unit.task.path);
    return;
  }
  if (unit.task.kind !== "attackBuilding") return;
  const task = unit.task;
  if (shouldRetreatFromSiege(unit, task)) {
    withdrawSiegeUnit(state, unit, task, "SIEGE_RETREAT_TRIGGERED", `after falling to ${Math.ceil((unit.hp / unit.maxHp) * 100)}% health`);
    return;
  }
  const target = state.buildings[unit.task.targetBuildingId];
  if (!target || target.hp <= 0 || target.tribeId === unit.tribeId) {
    unit.task = { kind: "idle" };
    return;
  }
  if (updateSiegeAssembly(state, unit, task, target)) return;
  if (updateSiegeWaveRelease(state, unit, task, target)) return;
  if (shouldWithdrawFromFeint(state, task)) {
    withdrawSiegeUnit(state, unit, task, "SIEGE_FEINT_WITHDRAWAL", `after ${task.assaultMode} timing completed`);
    return;
  }
  if (distance(unit, target) <= unit.range) return;
  if (unit.task.path.length === 0) unit.task.path = findPath(state, unit, findBuildingAttackPosition(state, unit, target));
  moveAlongPath(state, unit, unit.task.path);
}

function updateSiegeAssembly(state: GameState, unit: Unit, task: Extract<UnitTask, { kind: "attackBuilding" }>, target: Building): boolean {
  if (task.assaultPhase !== "assembling" || !task.assemblyTarget) return false;
  if (distance(unit, task.assemblyTarget) > 0.45) {
    if (task.path.length === 0) task.path = findPath(state, unit, task.assemblyTarget);
    moveAlongPath(state, unit, task.path);
    return true;
  }
  if (!coordinatedAssaultReady(state, task)) return true;
  if (task.assaultWaveDelayTicks !== undefined && task.assaultWaveDelayTicks > 0) {
    const plan = task.siegePlanId ? state.siegePlans.find((candidate) => candidate.id === task.siegePlanId) : undefined;
    task.assaultPhase = "waiting_wave";
    task.assaultWaveReleaseTick = (plan?.assaultStartedTick ?? state.tick) + task.assaultWaveDelayTicks;
    task.path = [];
    return true;
  }
  startSiegeAttackPhase(state, unit, task, target);
  return false;
}

function updateSiegeWaveRelease(state: GameState, unit: Unit, task: Extract<UnitTask, { kind: "attackBuilding" }>, target: Building): boolean {
  if (task.assaultPhase !== "waiting_wave") return false;
  if (task.assaultWaveReleaseTick !== undefined && state.tick < task.assaultWaveReleaseTick) {
    if (task.assemblyTarget && distance(unit, task.assemblyTarget) > 0.45) {
      if (task.path.length === 0) task.path = findPath(state, unit, task.assemblyTarget);
      moveAlongPath(state, unit, task.path);
    }
    return true;
  }
  startSiegeAttackPhase(state, unit, task, target);
  announceSiegeWaveReleased(state, task);
  return false;
}

function startSiegeAttackPhase(state: GameState, unit: Unit, task: Extract<UnitTask, { kind: "attackBuilding" }>, target: Building): void {
  task.assaultPhase = "attacking";
  task.path = findPath(state, unit, findBuildingAttackPosition(state, unit, target));
}

function announceSiegeWaveReleased(state: GameState, task: Extract<UnitTask, { kind: "attackBuilding" }>): void {
  if (task.assaultWaveIndex === undefined || task.assaultWaveIndex <= 0 || !task.siegePlanId) return;
  const plan = state.siegePlans.find((candidate) => candidate.id === task.siegePlanId);
  if (!plan) return;
  const released = plan.releasedWaveIndexes ?? [];
  if (released.includes(task.assaultWaveIndex)) return;
  plan.releasedWaveIndexes = [...released, task.assaultWaveIndex].sort((left, right) => left - right);
  const waveUnits = plan.assignedUnitIds.filter((unitId) => {
    const assigned = state.units[unitId];
    return assigned?.task.kind === "attackBuilding" && assigned.task.siegePlanId === plan.id && assigned.task.assaultWaveIndex === task.assaultWaveIndex;
  });
  const target = plan.targetBuildingId ? state.buildings[plan.targetBuildingId] : undefined;
  addEvent(
    state,
    "SIEGE_WAVE_RELEASED",
    `${state.tribes[plan.tribeId].name} commits a siege wave`,
    `Wave ${task.assaultWaveIndex + 1} sends ${waveUnits.length || "more"} assigned units toward ${plan.targetBuildingId ?? "the target"}.${
      plan.assaultPlan ? ` Plan: ${plan.assaultPlan}.` : ""
    }`,
    target ? directVisionVisibleTo(state, target, [plan.tribeId, plan.targetTribeId, target.tribeId]) : [plan.tribeId]
  );
}

function coordinatedAssaultReady(state: GameState, task: Extract<UnitTask, { kind: "attackBuilding" }>): boolean {
  const plan = task.siegePlanId ? state.siegePlans.find((candidate) => candidate.id === task.siegePlanId) : undefined;
  if (plan?.assaultStartedTick !== undefined) return true;
  const holdExpired = task.assemblyHoldUntilTick !== undefined && state.tick >= task.assemblyHoldUntilTick;
  const allAssembled = plan
    ? plan.assignedUnitIds.every((unitId) => {
        const assigned = state.units[unitId];
        if (!assigned || assigned.hp <= 0) return true;
        if (assigned.task.kind !== "attackBuilding" || assigned.task.siegePlanId !== plan.id) return false;
        if (assigned.task.assaultPhase === "attacking") return true;
        const assemblyTarget = assigned.task.assemblyTarget ?? task.assemblyTarget;
        return assemblyTarget ? distance(assigned, assemblyTarget) <= 0.75 : true;
      })
    : false;
  if (!holdExpired && !allAssembled) return false;
  if (plan && plan.assaultStartedTick === undefined) {
    plan.assaultStartedTick = state.tick;
    const target = plan.targetBuildingId ? state.buildings[plan.targetBuildingId] : undefined;
    addEvent(
      state,
      "COORDINATED_ASSAULT_STARTED",
      `${state.tribes[plan.tribeId].name} launches a coordinated assault`,
      `${plan.assignedUnitIds.length} assigned units leave rally formation for ${plan.targetBuildingId ?? "the target"}.${
        plan.assaultPlan ? ` Plan: ${plan.assaultPlan}.` : ""
      }`,
      target ? directVisionVisibleTo(state, target, [plan.tribeId, plan.targetTribeId, target.tribeId]) : [plan.tribeId]
    );
  }
  return true;
}

function shouldRetreatFromSiege(unit: Unit, task: Extract<UnitTask, { kind: "attackBuilding" }>): boolean {
  const threshold = task.retreatHealthPct;
  if (!threshold || threshold <= 0) return false;
  if (unit.maxHp <= 0) return false;
  return Math.ceil((unit.hp / unit.maxHp) * 100) <= threshold;
}

function shouldWithdrawFromFeint(state: GameState, task: Extract<UnitTask, { kind: "attackBuilding" }>): boolean {
  if (task.assaultMode !== "feint" && task.assaultMode !== "probe") return false;
  return task.feintWithdrawTick !== undefined && state.tick >= task.feintWithdrawTick;
}

function withdrawSiegeUnit(
  state: GameState,
  unit: Unit,
  task: Extract<UnitTask, { kind: "attackBuilding" }>,
  eventType: "SIEGE_RETREAT_TRIGGERED" | "SIEGE_FEINT_WITHDRAWAL",
  cause: string
): void {
  const retreatTarget = task.retreatTarget ?? findTownHall(state, unit.tribeId) ?? starts[unit.tribeId];
  const target = state.buildings[task.targetBuildingId];
  unit.task = { kind: "move", target: retreatTarget, path: findPath(state, unit, retreatTarget) };
  addEvent(
    state,
    eventType,
    `${state.tribes[unit.tribeId].name} pulls back a siege unit`,
    `${unit.name} withdraws toward ${retreatTarget.x},${retreatTarget.y} ${cause}.${task.siegeIntent ? ` Intent: ${task.siegeIntent}.` : ""}`,
    target ? directVisionVisibleTo(state, target, [unit.tribeId, target.tribeId]) : [unit.tribeId]
  );
}

function updateRepairer(state: GameState, unit: Unit): void {
  if (unit.task.kind !== "repair") return;
  const building = state.buildings[unit.task.targetBuildingId];
  if (!building || building.hp <= 0 || building.tribeId !== unit.tribeId) {
    unit.task = { kind: "idle" };
    return;
  }
  if (building.hp >= building.maxHp) {
    unit.task = { kind: "idle" };
    return;
  }
  if (distance(unit, building) > REPAIR_RANGE) {
    if (unit.task.path.length === 0) unit.task.path = findPath(state, unit, findBuildingRepairPosition(state, unit, building));
    moveAlongPath(state, unit, unit.task.path);
    if (unit.task.path.length === 0 && distance(unit, building) > REPAIR_RANGE) {
      const refreshed = findPath(state, unit, findBuildingRepairPosition(state, unit, building));
      if (!pathArrives(refreshed, findBuildingRepairPosition(state, unit, building))) {
        unit.task = { kind: "idle" };
        return;
      }
      unit.task.path = refreshed;
    }
    return;
  }
  const pressure = repairUnderFirePressure(state, unit, building);
  if (pressure) {
    if (!unit.task.lastInterruptedTick || state.tick - unit.task.lastInterruptedTick >= TICK_RATE * 4) {
      unit.task.lastInterruptedTick = state.tick;
      addEvent(
        state,
        "REPAIR_UNDER_FIRE_INTERRUPTED",
        `${state.tribes[unit.tribeId].name}'s repair crew is under fire`,
        `${unit.name} cannot safely repair ${building.id} while ${pressure.name} threatens the work site from ${Math.round(pressure.x)},${Math.round(pressure.y)}.${
          unit.task.siegeIntent ? ` Intent: ${unit.task.siegeIntent}.` : ""
        }`,
        directVisionVisibleTo(state, building, [unit.tribeId, pressure.tribeId])
      );
    }
    return;
  }
  building.hp = Math.min(building.maxHp, building.hp + repairHpPerTick(state, unit.tribeId));
  if (building.hp < building.maxHp) return;
  addEvent(
    state,
    "STRUCTURE_REPAIRED",
    `${state.tribes[unit.tribeId].name} repairs ${labelBuildingType(building.type)}`,
    `${building.id} at ${building.x},${building.y} is back to full strength.`,
    directVisionVisibleTo(state, building, [unit.tribeId])
  );
  unit.task = { kind: "idle" };
  updateVisibility(state);
}

function repairUnderFirePressure(state: GameState, repairer: Unit, building: Building): Unit | undefined {
  return Object.values(state.units)
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.tribeId !== repairer.tribeId &&
        !isProtectedMessenger(unit) &&
        areHostile(state, unit.tribeId, repairer.tribeId) &&
        unit.attack > 0 &&
        (distance(unit, repairer) <= Math.max(unit.range, 1.2) || distance(unit, building) <= Math.max(unit.range, 1.2))
    )
    .sort((left, right) => Math.min(distance(left, repairer), distance(left, building)) - Math.min(distance(right, repairer), distance(right, building)))[0];
}

function updateCombat(state: GameState): void {
  updateTurrets(state);
  const living = Object.values(state.units).filter((u) => u.hp > 0);
  for (const unit of living) {
    if (unit.attack <= 0 || unit.attackCooldown > 0) continue;
    if (unit.task.kind === "attackBuilding") {
      if (unit.task.assaultPhase === "assembling" || unit.task.assaultPhase === "waiting_wave") continue;
      const assignedTarget = state.buildings[unit.task.targetBuildingId];
      if (
        assignedTarget &&
        assignedTarget.hp > 0 &&
        assignedTarget.tribeId !== unit.tribeId &&
        areHostile(state, unit.tribeId, assignedTarget.tribeId) &&
        distance(unit, assignedTarget) <= unit.range
      ) {
        if (unit.type === "catapult") launchSiegeProjectile(state, unit, assignedTarget, unit.task.siegePlanId);
        else applyBuildingDamage(state, assignedTarget, buildingAttackDamage(state, unit, assignedTarget), unit.tribeId);
        unit.attackCooldown = siegeAttackCooldownTicks(unit);
        continue;
      }
    }
    if (unit.task.kind === "attackResource") {
      const targetTile = state.map[tileIndex(unit.task.target.x, unit.task.target.y)];
      const assignedTarget = targetTile.resource;
      if (
        assignedTarget &&
        assignedTarget.type === unit.task.resource &&
        assignedTarget.hp > 0 &&
        assignedTarget.amount > 0 &&
        distance(unit, unit.task.target) <= unit.range
      ) {
        applyResourceDamage(state, unit.task.target, unit.attack, unit.tribeId);
        unit.attackCooldown = Math.round(TICK_RATE * 1.2);
        continue;
      }
    }
    const target = living.find(
      (other) =>
        other.tribeId !== unit.tribeId &&
        !isProtectedMessenger(other) &&
        areHostile(state, unit.tribeId, other.tribeId) &&
        distance(unit, other) <= unit.range
    );
    if (target && !isDedicatedSiegeUnit(unit)) {
      applyUnitDamage(state, target, unit.attack, unit.tribeId);
      unit.attackCooldown = Math.round(TICK_RATE * 1.2);
      continue;
    }
    if (unit.task.kind === "move") continue;
    const buildingTarget = findHostileBuildingInRange(state, unit);
    if (!buildingTarget) continue;
    if (unit.type === "catapult") launchSiegeProjectile(state, unit, buildingTarget);
    else applyBuildingDamage(state, buildingTarget, buildingAttackDamage(state, unit, buildingTarget), unit.tribeId);
    unit.attackCooldown = siegeAttackCooldownTicks(unit);
  }
}

function siegeAttackCooldownTicks(unit: Unit): number {
  if (unit.type === "catapult") return Math.round(TICK_RATE * 2.6);
  if (unit.type === "battering_ram") return Math.round(TICK_RATE * 1.6);
  return Math.round(TICK_RATE * 1.2);
}

function siegeProjectileTravelTicks(unit: Position, target: Position): number {
  return Math.max(5, Math.round(distance(unit, target) * 2.2));
}

function launchSiegeProjectile(state: GameState, unit: Unit, target: Building, siegePlanId?: string): SiegeProjectile {
  const travelTicks = siegeProjectileTravelTicks(unit, target);
  const damage = buildingAttackDamage(state, unit, target);
  const projectile: SiegeProjectile = {
    id: nextId(state, "projectile"),
    projectileType: "stone_shot",
    tribeId: unit.tribeId,
    originUnitId: unit.id,
    targetBuildingId: target.id,
    x: unit.x,
    y: unit.y,
    startX: unit.x,
    startY: unit.y,
    targetX: target.x,
    targetY: target.y,
    launchedTick: state.tick,
    impactTick: state.tick + travelTicks,
    siegePlanId,
    hp: 1,
    maxHp: 1,
    armor: 0,
    attack: damage,
    range: unit.range,
    attackCooldown: 0
  };
  state.projectiles[projectile.id] = projectile;
  addEvent(
    state,
    "SIEGE_PROJECTILE_LAUNCHED",
    `${state.tribes[unit.tribeId].name} launches artillery`,
    `${unit.name} fires a stone shot at ${target.type} ${target.id}.`,
    directVisionVisibleTo(state, target, [unit.tribeId, target.tribeId])
  );
  return projectile;
}

function updateProjectiles(state: GameState): void {
  for (const projectile of Object.values(state.projectiles)) {
    const target = state.buildings[projectile.targetBuildingId];
    if (!target || target.hp <= 0) {
      delete state.projectiles[projectile.id];
      continue;
    }
    const totalTicks = Math.max(1, projectile.impactTick - projectile.launchedTick);
    const progress = clamp((state.tick - projectile.launchedTick) / totalTicks, 0, 1);
    projectile.x = projectile.startX + (projectile.targetX - projectile.startX) * progress;
    projectile.y = projectile.startY + (projectile.targetY - projectile.startY) * progress;
    if (state.tick < projectile.impactTick) continue;
    const destroyed = applyBuildingDamage(state, target, projectile.attack, projectile.tribeId);
    addEvent(
      state,
      "SIEGE_PROJECTILE_IMPACT",
      `${state.tribes[projectile.tribeId].name}'s artillery lands`,
      `Stone shot ${projectile.id} hits ${target.type} ${target.id} at ${target.x},${target.y}${destroyed ? " and destroys it" : ""}.`,
      directVisionVisibleTo(state, target, [projectile.tribeId, target.tribeId])
    );
    delete state.projectiles[projectile.id];
  }
}

function updateTurrets(state: GameState): void {
  const living = Object.values(state.units).filter((unit) => unit.hp > 0);
  for (const turret of Object.values(state.buildings)) {
    if (turret.type !== "turret" || turret.hp <= 0) continue;
    const stats = effectiveBuildingStats(state, turret.tribeId, turret.type);
    turret.attackCooldown = Math.max(0, turret.attackCooldown - 1);
    if (turret.attackCooldown > 0) continue;
    const target = living
      .filter(
        (unit) =>
          unit.tribeId !== turret.tribeId &&
          !isProtectedMessenger(unit) &&
          areHostile(state, turret.tribeId, unit.tribeId) &&
          distance(turret, unit) <= turret.range
      )
      .sort((left, right) => targetPriority(right) - targetPriority(left) || distance(turret, left) - distance(turret, right))[0];
    if (!target) continue;
    applyUnitDamage(state, target, turret.attack, turret.tribeId);
    turret.attackCooldown = stats.cooldownTicks;
  }
}

function targetPriority(unit: Unit): number {
  if (unit.type === "catapult") return 6;
  if (unit.type === "battering_ram") return 5;
  if (unit.type === "siege_engine") return 4;
  if (unit.type === "archer" || unit.type === "militia") return 3;
  if (unit.type === "sovereign") return 2;
  return 1;
}

function isDedicatedSiegeUnit(unit: Unit): boolean {
  return unit.type === "siege_engine" || unit.type === "battering_ram" || unit.type === "catapult";
}

function isFieldCombatUnit(unit: Unit): boolean {
  return unit.type === "militia" || unit.type === "archer";
}

function isSiegeCapableUnit(unit: Unit): boolean {
  return isFieldCombatUnit(unit) || isDedicatedSiegeUnit(unit);
}

function siegeUnitPriority(unit: Unit): number {
  if (unit.type === "catapult") return 6;
  if (unit.type === "battering_ram") return 5;
  if (unit.type === "siege_engine") return 4;
  if (unit.type === "archer") return 2;
  if (unit.type === "militia") return 1;
  return 0;
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

function isFortificationBuilding(type: BuildingType): boolean {
  return type === "wall" || type === "gate" || type === "turret" || type === "watchtower";
}

function buildingAttackDamage(state: GameState, unit: Unit, building: Building): number {
  let amount = unit.attack;
  if (unit.type === "siege_engine") {
    amount += building.type === "wall" || building.type === "gate" ? 10 : isFortificationBuilding(building.type) ? 6 : 2;
  }
  if (unit.type === "battering_ram") {
    amount += building.type === "wall" || building.type === "gate" ? 18 : isFortificationBuilding(building.type) ? 8 : 3;
  }
  if (unit.type === "catapult") {
    amount += isFortificationBuilding(building.type) ? 10 : 6;
  }
  if (isFortificationBuilding(building.type) && hasDevelopment(state, unit.tribeId, "siege_engineering")) amount += 2;
  return amount;
}

export function estimateBreachTicks(state: GameState, tribeId: TribeId, targetBuildingId: string): number | undefined {
  const building = state.buildings[targetBuildingId];
  if (!building || building.hp <= 0 || building.tribeId === tribeId) return undefined;
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === tribeId && unit.hp > 0 && isSiegeCapableUnit(unit))
    .sort((left, right) => siegeUnitPriority(right) - siegeUnitPriority(left) || left.id.localeCompare(right.id))
    .slice(0, 5);
  if (attackers.length === 0) return undefined;
  const damagePerTick = attackers.reduce((sum, unit) => {
    const damage = armoredDamage(buildingAttackDamage(state, unit, building), building.armor);
    if (damage <= 0) return sum;
    return sum + damage / Math.max(1, siegeAttackCooldownTicks(unit));
  }, 0);
  if (damagePerTick <= 0) return undefined;
  const projectileDelay = attackers.reduce((max, unit) => (unit.type === "catapult" ? Math.max(max, siegeProjectileTravelTicks(unit, building)) : max), 0);
  return Math.max(Math.round(TICK_RATE * 1.2), projectileDelay + Math.ceil(building.hp / damagePerTick));
}

function applyUnitDamage(state: GameState, target: Unit, amount: number, attackerTribeId: TribeId): void {
  target.hp -= armoredDamage(amount, target.armor);
  if (target.hp > 0) return;
  target.hp = 0;
  if (target.carriedPacketId) {
    const packet = state.packets[target.carriedPacketId];
    if (packet) destroyPacketItem(state, packet);
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
    directVisionVisibleTo(state, destroyedAt, [destroyedTribe, attackerTribeId])
  );
  updateVisibility(state);
  return true;
}

function applyResourceDamage(state: GameState, target: Position, amount: number, attackerTribeId?: TribeId): boolean {
  const tile = state.map[tileIndex(target.x, target.y)];
  const resource = tile.resource;
  if (!resource || resource.hp <= 0 || resource.amount <= 0) return false;
  const destroyedSnapshot = { ...resource };
  const damage = armoredDamage(amount, resource.armor);
  resource.hp = Math.max(0, resource.hp - damage);
  resource.amount = Math.max(0, resource.amount - damage);
  invalidateResourceControlCache(state);
  if (resource.hp > 0 && resource.amount > 0) return false;
  destroyResourceDepositAt(state, target, resource.type, attackerTribeId, destroyedSnapshot);
  return true;
}

function destroyResourceDepositAt(
  state: GameState,
  target: Position,
  type: ResourceType,
  attackerTribeId?: TribeId,
  destroyedSnapshot?: ResourceDeposit
): void {
  const tile = state.map[tileIndex(target.x, target.y)];
  const resource = destroyedSnapshot ?? tile.resource;
  const controlledBy = resource ? dominantResourceController(state, target, resource) : undefined;
  const visibleTo = resourceEventVisibleTo(state, target, [attackerTribeId, controlledBy]);
  if (resource && attackerTribeId) recordResourceDenial(state, target, resource, attackerTribeId, controlledBy, visibleTo);
  if (type === "wood" && tile.terrain === "forest") tile.terrain = "grass";
  delete tile.resource;
  addEvent(
    state,
    "RESOURCE_DEPOSIT_DESTROYED",
    `${labelResourceType(type)} deposit destroyed`,
    `${labelResourceType(type)} deposit at ${target.x},${target.y} was destroyed${attackerTribeId ? ` by ${state.tribes[attackerTribeId].name}` : ""}.`,
    visibleTo
  );
  updateVisibility(state);
}

function depleteResourceDepositAt(state: GameState, target: Position, depletedByTribeId?: TribeId, depletedSnapshot?: ResourceDeposit): void {
  const tile = state.map[tileIndex(target.x, target.y)];
  const resource = depletedSnapshot ?? tile.resource;
  if (!resource) return;
  const controlledBy = dominantResourceController(state, target, resource);
  const visibleTo = resourceEventVisibleTo(state, target, [depletedByTribeId, controlledBy]);
  if (resource.type === "wood" && tile.terrain === "forest") tile.terrain = "grass";
  delete tile.resource;
  recordResourceDepletion(state, target, resource, depletedByTribeId, controlledBy, visibleTo);
  addEvent(
    state,
    "RESOURCE_DEPOSIT_DEPLETED",
    `${labelResourceType(resource.type)} deposit exhausted`,
    `${labelResourceType(resource.type)} deposit at ${target.x},${target.y} was exhausted${
      depletedByTribeId ? ` by ${state.tribes[depletedByTribeId].name} harvesters` : ""
    }.`,
    visibleTo
  );
  updateVisibility(state);
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
      if (!isTribeActive(state, tribeId)) continue;
      const developmentHappiness = applyYearlyDevelopmentEffects(state, tribeId, year);
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
      delta += developmentHappiness;
      tribe.happiness = Math.round(clamp(tribe.happiness + delta, 0, 100));
      tribe.lastYearWealth = wealth;
      applyYearlyPopulationGrowth(state, tribeId, year);
    }
    state.victoryPressure.lastProcessedYear = year;
  }
}

function applyYearlyPopulationGrowth(state: GameState, tribeId: TribeId, year: number): void {
  const tribe = state.tribes[tribeId];
  if (!isTribeActive(state, tribeId)) return;
  const population = countLivingPopulation(state, tribeId);
  const populationCap = getPopulationCap(state, tribeId);
  if (population >= populationCap) return;
  const safety = getTribeSafetyScore(state, tribeId);
  if (tribe.happiness < 56 || safety < 38) return;
  const foodCost = 38 + Math.max(0, Math.floor(population * 0.6));
  if (tribe.resources.food < foodCost) return;
  const townHall = findTownHall(state, tribeId);
  if (!townHall) return;
  const houses = Object.values(state.buildings)
    .filter((building) => building.tribeId === tribeId && building.type === "house" && building.hp > 0)
    .sort((left, right) => Math.hypot(left.x - townHall.x, left.y - townHall.y) - Math.hypot(right.x - townHall.x, right.y - townHall.y));
  const source = houses[year % Math.max(1, houses.length)] ?? townHall;
  const site = findNearestWalkable(state, { x: source.x + 1, y: source.y + 1 }, tribeId) ?? { x: source.x + 1, y: source.y + 1 };
  tribe.resources.food -= foodCost;
  const unit = addUnit(state, tribeId, "peon", site.x, site.y);
  addEvent(
    state,
    "POPULATION_GROWTH",
    `${tribe.name} population grows`,
    `${unit.name} joins the working population in year ${year}. Capacity ${population + 1}/${populationCap}; food spent ${foodCost}.`,
    [tribeId]
  );
  updateVisibility(state);
}

function applyYearlyDevelopmentEffects(state: GameState, tribeId: TribeId, year: number): number {
  const tribe = state.tribes[tribeId];
  const population = countLivingPopulation(state, tribeId);
  const yearlyGoldPerPopulation = developmentEffectAmount(state, tribeId, "yearly_gold_per_population");
  if (yearlyGoldPerPopulation > 0 && population > 0) {
    const taxYield = Math.max(1, Math.round(population * yearlyGoldPerPopulation));
    tribe.resources.gold += taxYield;
    if (year % 10 === 0) {
      addEvent(state, "YEARLY_TAXATION", `${tribe.name} collects institutional income`, `${taxYield} gold enters the treasury through developed institutions.`, [tribeId]);
    }
  }
  return developmentEffectAmount(state, tribeId, "yearly_happiness");
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
  const surviving = getVictoryPressure(state).scoreByTribe.filter((score) => isTribeActive(state, score.tribeId));
  if (surviving.length <= 1) {
    claimSurvivalWinner(state, surviving[0], reviewYear);
    return;
  }
  const eliminated = surviving
    .slice()
    .sort((left, right) => left.survivalScore - right.survivalScore || left.wealthPerCapita - right.wealthPerCapita || tribeIds.indexOf(left.tribeId) - tribeIds.indexOf(right.tribeId))[0];
  eliminateTribeAtReview(state, eliminated.tribeId, reviewYear, eliminated);
  const refreshed = getVictoryPressure(state);
  const remaining = refreshed.scoreByTribe.filter((score) => isTribeActive(state, score.tribeId));
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
        if (packet) destroyPacketItem(state, packet);
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
    destroyPacketItem(state, packet);
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
    `Each surviving court preserves a private lesson after the year ${reviewYear} survival review.`,
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
  diplomacyIntent: DiplomacyIntent = inferDiplomacyIntent(type, body),
  terms: { mergerLeaderTribeId?: TribeId; mergerTerms?: string } = {}
): { ok: true; packetId: string } | { ok: false; reason: string } {
  const originInactiveReason = inactiveSeparateCivilizationReason(state, originTribeId);
  if (originInactiveReason) return { ok: false, reason: originInactiveReason };
  const recipientInactiveReason = inactiveSeparateCivilizationReason(state, recipientTribeId);
  if (recipientInactiveReason) return { ok: false, reason: recipientInactiveReason };
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
    mergerLeaderTribeId: terms.mergerLeaderTribeId,
    mergerTerms: terms.mergerTerms ? clampText(terms.mergerTerms, 500) : undefined,
    requiresReply,
    createdTick: state.tick
  };
  const estimatedTicks = Math.max(150, Math.round(path.length / messenger.speed * TICK_RATE * 2.6));
  const outboundGateBuildingIds = recipientGateOperationCandidateIds(state, recipientTribeId, path, destinationPosition);
  const packet: Packet = {
    id: packetId,
    itemType: "packet",
    ...packetStats,
    messageIds: [messageId],
    carrierUnitId: messenger.id,
    originTribeId,
    recipientTribeId,
    state: "IN_TRANSIT_OUTBOUND",
    destination: { x: destination.x, y: destination.y },
    returnTo: { x: origin.x, y: origin.y },
    outboundGateBuildingIds,
    createdTick: state.tick,
    expectedReturnTick: state.tick + estimatedTicks,
    lastStateChangeTick: state.tick,
    overdueAnnounced: false,
    routeMemory: []
  };
  state.messages[messageId] = message;
  state.packets[packetId] = packet;
  recordGateAccessTreatyRouteMemory(state, packet);
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

function inactiveSeparateCivilizationReason(state: GameState, tribeId: TribeId): string | undefined {
  const tribe = state.tribes[tribeId];
  if (!tribe) return "Unknown civilization.";
  if (tribe.eliminated) return `${tribe.name} has been eliminated.`;
  if (tribe.mergedIntoTribeId) return `${tribe.name} has merged into ${state.tribes[tribe.mergedIntoTribeId].name}.`;
  return undefined;
}

function recipientDecision(state: GameState, packet: Packet): { delayTicks: number; eventText: string } {
  let delay = packet.recipientTribeId === "purple" ? 90 : packet.recipientTribeId === "yellow" ? 35 : 55;
  const gateOperation = activeGateOperationForPacket(state, packet);
  const gateResolution = resolveGatePacketResolution(state, packet, gateOperation);
  if (gateOperation && (gateResolution.action === "delay" || gateResolution.tollGold > 0)) {
    const tollPaid = payGateTollIfPossible(state, packet, gateOperation, gateResolution);
    if (gateResolution.action === "delay") delay += gateResolution.tollGold > 0 ? 45 : 70;
    packet.routeMemory.push(`Gate operation ${gateOperation.id} admits messenger with action ${gateResolution.action}.`);
    const tollText =
      gateResolution.tollGold > 0
        ? tollPaid
          ? ` after a ${gateResolution.tollGold} gold toll`
          : gateResolution.tollMode === "required"
            ? ` despite an unpaid required toll`
            : ` without collecting the optional ${gateResolution.tollGold} gold toll`
        : "";
    const delayText = gateResolution.action === "delay" ? " after gate delay" : "";
    return {
      delayTicks: delay,
      eventText: `The messenger is admitted under gate operation ${gateOperation.id}${tollText}${delayText} and waits for an answer.`
    };
  }
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

function destroyPacketItem(state: GameState, packet: Packet): void {
  packet.hp = 0;
  packet.state = "KILLED_WITH_PACKET";
  packet.carrierUnitId = undefined;
  packet.lastStateChangeTick = state.tick;
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

function resolveMergerFromDiscussion(state: GameState, original: Message, reply: Message): CivilizationMergerRecord | undefined {
  if (original.diplomacyIntent !== "MERGER_OFFER" || reply.diplomacyIntent !== "MERGER_ACCEPT") return undefined;
  const leaderTribeId = original.mergerLeaderTribeId;
  if (!leaderTribeId || reply.mergerLeaderTribeId !== leaderTribeId) return undefined;
  if (leaderTribeId !== original.originTribeId && leaderTribeId !== original.recipientTribeId) return undefined;
  const mergedTribeId = leaderTribeId === original.originTribeId ? original.recipientTribeId : original.originTribeId;
  const terms = clampText(
    [original.mergerTerms, reply.mergerTerms, `Proposal: ${original.body}`, `Acceptance: ${reply.body}`].filter(Boolean).join(" | "),
    900
  );
  const result = completeCivilizationMerger(state, {
    leaderTribeId,
    mergedTribeId,
    proposerTribeId: original.originTribeId,
    accepterTribeId: reply.originTribeId,
    proposalMessageId: original.id,
    acceptanceMessageId: reply.id,
    terms
  });
  return result.ok ? result.record : undefined;
}

export function completeCivilizationMerger(
  state: GameState,
  input: {
    leaderTribeId: TribeId;
    mergedTribeId: TribeId;
    proposerTribeId: TribeId;
    accepterTribeId: TribeId;
    proposalMessageId: string;
    acceptanceMessageId: string;
    terms: string;
  }
): { ok: true; record: CivilizationMergerRecord } | { ok: false; reason: string } {
  const { leaderTribeId, mergedTribeId } = input;
  if (leaderTribeId === mergedTribeId) return { ok: false, reason: "a civilization cannot merge into itself" };
  if (!isTribeActive(state, leaderTribeId)) return { ok: false, reason: `${state.tribes[leaderTribeId].name} is not an active leader civilization` };
  if (!isTribeActive(state, mergedTribeId)) return { ok: false, reason: `${state.tribes[mergedTribeId].name} is not an active civilization to merge` };

  const leader = state.tribes[leaderTribeId];
  const merged = state.tribes[mergedTribeId];
  const leaderPopulation = countLivingPopulation(state, leaderTribeId);
  const mergedPopulation = countLivingPopulation(state, mergedTribeId);
  const transferredResources = Object.fromEntries(resourceTypes.map((type) => [type, Math.round(merged.resources[type])])) as Resources;
  for (const type of resourceTypes) {
    leader.resources[type] += merged.resources[type];
    merged.resources[type] = 0;
  }

  leader.developments = Array.from(new Set([...leader.developments, ...merged.developments]));
  merged.developments = [];
  leader.happiness =
    leaderPopulation + mergedPopulation > 0
      ? Math.round((leader.happiness * leaderPopulation + merged.happiness * mergedPopulation) / (leaderPopulation + mergedPopulation))
      : Math.round((leader.happiness + merged.happiness) / 2);
  leader.populationCap += merged.populationCap;
  merged.populationCap = 0;
  merged.lastYearWealth = 0;

  let transferredUnits = 0;
  let retiredSovereignUnitId: string | undefined;
  for (const unit of Object.values(state.units)) {
    if (unit.tribeId !== mergedTribeId || unit.hp <= 0) continue;
    transferredUnits += 1;
    unit.tribeId = leaderTribeId;
    unit.task = { kind: "idle" };
    if (unit.type === "sovereign") {
      retiredSovereignUnitId = unit.id;
      unit.type = "sentinel";
      const stats = effectiveUnitStats(state, leaderTribeId, "sentinel");
      Object.assign(unit, stats);
      unit.name = clampText(`Retired sovereign ${merged.sovereignName}`, 80);
    }
  }

  let transferredBuildings = 0;
  for (const building of Object.values(state.buildings)) {
    if (building.tribeId !== mergedTribeId || building.hp <= 0) continue;
    transferredBuildings += 1;
    building.tribeId = leaderTribeId;
  }

  mergeDiplomacyState(state, leaderTribeId, mergedTribeId);
  for (const packet of Object.values(state.packets)) {
    if (packet.originTribeId === mergedTribeId) packet.originTribeId = leaderTribeId;
    if (packet.recipientTribeId === mergedTribeId) packet.recipientTribeId = leaderTribeId;
  }

  merged.mergedIntoTribeId = leaderTribeId;
  merged.mergedLeaderTribeId = leaderTribeId;
  merged.mergedTick = state.tick;
  merged.mergedYear = getCurrentYear(state);
  merged.mergedTerms = clampText(input.terms, 900);
  merged.nextMessageTick = Number.POSITIVE_INFINITY;
  state.sovereignDecisionCursors[mergedTribeId] = { updatedTick: state.tick };
  leader.lastYearWealth = computeWealth(state, leaderTribeId);
  invalidateResourceControlCache(state);

  const record: CivilizationMergerRecord = {
    id: nextId(state, "civilization_merger"),
    tick: state.tick,
    year: getCurrentYear(state),
    leaderTribeId,
    mergedTribeId,
    proposerTribeId: input.proposerTribeId,
    accepterTribeId: input.accepterTribeId,
    proposalMessageId: input.proposalMessageId,
    acceptanceMessageId: input.acceptanceMessageId,
    terms: clampText(input.terms, 900),
    transferredUnits,
    transferredBuildings,
    transferredResources,
    retiredSovereignUnitId,
    visibleTo: [leaderTribeId, mergedTribeId]
  };
  pushBoundedRecord(state.civilizationMergers, record, 40);
  appendSovereignMemory(state, leaderTribeId, `Merger executed: ${merged.name} joined under ${leader.sovereignName}. Terms: ${record.terms}`);
  appendSovereignMemory(state, mergedTribeId, `Merger executed: your people joined ${leader.name} under ${leader.sovereignName}. Terms: ${record.terms}`);
  addEvent(
    state,
    "CIVILIZATION_MERGED",
    `${merged.name} merges into ${leader.name}`,
    `${merged.name} joins ${leader.name} under ${leader.sovereignName}. Population transferred ${transferredUnits}; buildings transferred ${transferredBuildings}. Terms: ${record.terms}`,
    [leaderTribeId, mergedTribeId]
  );
  updateVisibility(state);
  return { ok: true, record };
}

function mergeDiplomacyState(state: GameState, leaderTribeId: TribeId, mergedTribeId: TribeId): void {
  const inheritedAlly = state.alliances[mergedTribeId];
  delete state.alliances[mergedTribeId];
  if (state.alliances[leaderTribeId] === mergedTribeId) delete state.alliances[leaderTribeId];
  for (const tribeId of tribeIds) {
    if (state.alliances[tribeId] === mergedTribeId) {
      if (tribeId !== leaderTribeId && !state.alliances[leaderTribeId]) {
        state.alliances[tribeId] = leaderTribeId;
        state.alliances[leaderTribeId] = tribeId;
      } else {
        delete state.alliances[tribeId];
      }
    }
  }
  if (inheritedAlly && inheritedAlly !== leaderTribeId && isTribeActive(state, inheritedAlly) && !state.alliances[leaderTribeId] && !state.alliances[inheritedAlly]) {
    state.alliances[leaderTribeId] = inheritedAlly;
    state.alliances[inheritedAlly] = leaderTribeId;
  }

  for (const other of tribeIds) {
    if (other === leaderTribeId || other === mergedTribeId) continue;
    const inheritedWar = state.wars[mergedTribeId]?.[other] || state.wars[other]?.[mergedTribeId];
    delete state.wars[mergedTribeId][other];
    delete state.wars[other][mergedTribeId];
    if (inheritedWar && isTribeActive(state, other)) {
      state.wars[leaderTribeId][other] = true;
      state.wars[other][leaderTribeId] = true;
    }
  }
  delete state.wars[leaderTribeId][mergedTribeId];
  delete state.wars[mergedTribeId][leaderTribeId];
}

function inferDiplomacyIntent(type: MessageType, body: string | undefined): DiplomacyIntent {
  const normalized = (body ?? "").toLowerCase();
  if (type === "MERGER_PROPOSAL" || /\b(merge|merger|unite our civilizations|one civilization|one people)\b/.test(normalized)) {
    return type === "REPLY" ? "MERGER_ACCEPT" : "MERGER_OFFER";
  }
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

function recordGateAccessTreatyRouteMemory(state: GameState, packet: Packet): void {
  const gateIds = packet.outboundGateBuildingIds ?? [];
  for (const gateId of gateIds) {
    const treaty = activeGateAccessTreatyForTribe(state, gateId, packet.originTribeId);
    if (!treaty) continue;
    const gate = state.buildings[gateId];
    const treatyName = treaty.treatyName ? ` "${treaty.treatyName}"` : "";
    const expiry = treaty.expiresAtTick ? ` until turn ${treaty.expiresAtTick}` : "";
    const note = `Safe-passage treaty ${treaty.id}${treatyName} let ${state.tribes[packet.originTribeId].name}'s courier route through ${state.tribes[treaty.tribeId].name} gate ${gateId}${gate ? ` at ${gate.x},${gate.y}` : ""}${expiry}.`;
    if (!packet.routeMemory.some((entry) => entry.includes(`Safe-passage treaty ${treaty.id}`))) {
      packet.routeMemory.push(note);
    }
  }
  if (packet.routeMemory.length > 12) packet.routeMemory.splice(0, packet.routeMemory.length - 12);
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
      const matches =
        resource === "wood"
          ? tile.resource?.type === "wood" && tile.resource.amount > 0 && tile.resource.hp > 0
          : tile.resource?.type === resource && tile.resource.amount > 0 && tile.resource.hp > 0;
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

function findPath(state: GameState, unit: Pick<Unit, "x" | "y" | "tribeId">, target: Position): Position[] {
  const start = { x: clamp(Math.round(unit.x), 0, MAP_SIZE - 1), y: clamp(Math.round(unit.y), 0, MAP_SIZE - 1) };
  let goal = { x: clamp(Math.round(target.x), 0, MAP_SIZE - 1), y: clamp(Math.round(target.y), 0, MAP_SIZE - 1) };
  if (!isWalkableForTribe(state, goal.x, goal.y, unit.tribeId)) {
    const alternate = findNearestWalkable(state, goal, unit.tribeId);
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
      if (!isWalkableForTribe(state, next.x, next.y, unit.tribeId)) continue;
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
  if (!isWalkableForTribe(state, target.x, target.y, unit.tribeId)) {
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
      map.push(terrain === "forest" ? { terrain, resource: createResourceDeposit("wood", 90 + Math.floor(next() * 90)) } : { terrain });
    }
  }
  const center = mapCenter();
  for (const start of Object.values(starts)) drawRoad(map, start, center);
  for (const [tribeId, start] of Object.entries(starts) as [TribeId, Position][]) {
    clearArea(map, start, 8);
    if (resourceScarcityPolicy.gold.localStarterPatch) addResourcePatch(map, jitter({ x: start.x + 7, y: start.y - 5 }, 3, next), "gold", 360 + Math.floor(next() * 120));
    if (resourceScarcityPolicy.stone.localStarterPatch) addResourcePatch(map, jitter({ x: start.x - 7, y: start.y + 7 }, 3, next), "stone", 340 + Math.floor(next() * 100));
    if (resourceScarcityPolicy.food.localStarterPatch) addResourcePatch(map, jitter({ x: start.x + 1, y: start.y + 8 }, 3, next), "food", 400 + Math.floor(next() * 140));
    if (resourceScarcityPolicy.clay.localStarterPatch) addResourcePatch(map, jitter({ x: start.x - 8, y: start.y - 7 }, 4, next), "clay", 220 + Math.floor(next() * 100), 1);
    if (resourceScarcityPolicy.limestone.localStarterPatch) {
      addResourcePatch(map, jitter({ x: start.x + 8, y: start.y + 6 }, 4, next), "limestone", 160 + Math.floor(next() * 80), 1);
    }
    addForestRing(map, jitter(tribeId === "purple" ? { x: start.x - 12, y: start.y - 10 } : { x: start.x - 10, y: start.y - 4 }, 3, next));
  }
  const contestedDeposits: { center: Position; type: ResourceType; amount: number; spread: number; radius?: number }[] = [
    { center: fromMapCenter(-3, -3), type: "coal", amount: 180, spread: scaledMapOffset(8) },
    { center: fromMapCenter(3, 3), type: "coal", amount: 180, spread: scaledMapOffset(8) },
    { center: fromMapCenter(-12, 0), type: "coal", amount: 150, spread: scaledMapOffset(9) },
    { center: fromMapCenter(12, 0), type: "coal", amount: 150, spread: scaledMapOffset(9) },
    { center, type: "iron", amount: 300, spread: 7, radius: 1 },
    { center: fromMapCenter(0, -25), type: "iron", amount: 230, spread: scaledMapOffset(6) },
    { center: fromMapCenter(0, 26), type: "iron", amount: 230, spread: scaledMapOffset(6) },
    { center: fromMapCenter(-25, 0), type: "iron", amount: 230, spread: scaledMapOffset(6) },
    { center: fromMapCenter(26, 0), type: "iron", amount: 230, spread: scaledMapOffset(6) },
    { center: fromMapCenter(-21, -10), type: "limestone", amount: 300, spread: scaledMapOffset(10), radius: 1 },
    { center: fromMapCenter(21, -10), type: "limestone", amount: 300, spread: scaledMapOffset(10), radius: 1 },
    { center: fromMapCenter(-21, 10), type: "limestone", amount: 300, spread: scaledMapOffset(10), radius: 1 },
    { center: fromMapCenter(21, 10), type: "limestone", amount: 300, spread: scaledMapOffset(10), radius: 1 },
    { center: fromMapCenter(-12, -12), type: "clay", amount: 360, spread: scaledMapOffset(9), radius: 1 },
    { center: fromMapCenter(12, -12), type: "clay", amount: 360, spread: scaledMapOffset(9), radius: 1 },
    { center: fromMapCenter(-12, 12), type: "clay", amount: 360, spread: scaledMapOffset(9), radius: 1 },
    { center: fromMapCenter(12, 12), type: "clay", amount: 360, spread: scaledMapOffset(9), radius: 1 },
    { center, type: "gold", amount: 420, spread: scaledMapOffset(14), radius: 1 },
    { center: fromMapCenter(-17, -17), type: "stone", amount: 420, spread: scaledMapOffset(8) },
    { center: fromMapCenter(17, 17), type: "stone", amount: 420, spread: scaledMapOffset(8) }
  ];
  for (const deposit of contestedDeposits) {
    addResourcePatch(map, jitter(deposit.center, deposit.spread, next), deposit.type, deposit.amount + Math.floor(next() * 80), deposit.radius ?? 0);
  }
  for (let i = 0; i < 28; i += 1) {
    const angle = next() * Math.PI * 2;
    const radius = scaledMapOffset(18 + next() * 42);
    const type = pickWildResourceType(next);
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

function pickWildResourceType(next: () => number): ResourceType {
  const wildTypes = resourceTypes.filter((type) => resourceScarcityPolicy[type].wildWeight > 0);
  const totalWeight = wildTypes.reduce((sum, type) => sum + resourceScarcityPolicy[type].wildWeight, 0);
  let roll = next() * totalWeight;
  for (const type of wildTypes) {
    roll -= resourceScarcityPolicy[type].wildWeight;
    if (roll <= 0) return type;
  }
  return wildTypes[wildTypes.length - 1] ?? "food";
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
      map[tileIndex(x, y)] = { terrain: resourceTerrain(type), resource: createResourceDeposit(type, amount) };
    }
  }
}

function addForestRing(map: Tile[], center: Position): void {
  for (let y = center.y - 5; y <= center.y + 5; y += 1) {
    for (let x = center.x - 5; x <= center.x + 5; x += 1) {
      if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
      if (distance(center, { x, y }) <= 5) map[tileIndex(x, y)] = { terrain: "forest", resource: createResourceDeposit("wood", 160) };
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
  return isWalkableForTribe(state, x, y);
}

function isWalkableForTribe(state: GameState, x: number, y: number, tribeId?: TribeId): boolean {
  if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
  const terrain = state.map[tileIndex(x, y)].terrain;
  return terrain !== "water" && terrain !== "mountain" && !isBlockingBuildingAt(state, x, y, tribeId);
}

export function isTileWalkable(state: GameState, x: number, y: number, tribeId?: TribeId): boolean {
  return isWalkableForTribe(state, x, y, tribeId);
}

function isBlockingBuildingAt(state: GameState, x: number, y: number, tribeId?: TribeId): boolean {
  return Object.values(state.buildings).some((building) => building.x === x && building.y === y && isBuildingMovementBlockingForTribe(state, building, tribeId));
}

export function isBuildingMovementBlocking(building: Building): boolean {
  if (building.hp <= 0) return false;
  if (building.type === "gate" && building.gateSabotage?.action === "force_open") return false;
  if (building.type === "gate" && building.gateSabotage?.action === "jam_closed") return true;
  if (building.type === "gate") return building.gateState !== "open";
  return buildingStats[building.type].blocksMovement;
}

function isBuildingMovementBlockingForTribe(state: GameState, building: Building, tribeId?: TribeId): boolean {
  if (building.hp <= 0) return false;
  if (building.type !== "gate") return buildingStats[building.type].blocksMovement;
  if (building.gateSabotage?.action === "force_open") return false;
  if (building.gateSabotage?.action === "jam_closed") return true;
  if (building.gateState !== "open") return true;
  if (!tribeId) return false;
  if (hasActiveGateAccessTreaty(state, building, tribeId)) return false;
  const policy = building.gateAccessPolicy ?? "owner_allies";
  if (policy === "all") return false;
  if (policy === "owner_only") return tribeId !== building.tribeId;
  return tribeId !== building.tribeId && state.alliances[building.tribeId] !== tribeId && state.alliances[tribeId] !== building.tribeId;
}

function findNearestWalkable(state: GameState, target: Position, tribeId?: TribeId): Position | undefined {
  let best: Position | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let radius = 1; radius <= 8; radius += 1) {
    for (let y = target.y - radius; y <= target.y + radius; y += 1) {
      for (let x = target.x - radius; x <= target.x + radius; x += 1) {
        if (Math.abs(target.x - x) !== radius && Math.abs(target.y - y) !== radius) continue;
        if (!isWalkableForTribe(state, x, y, tribeId)) continue;
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
