import { Application, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import "./styles.css";
import {
  MAP_SIZE,
  TICK_RATE,
  TICKS_PER_GAME_YEAR,
  advanceGameTicks,
  appendSovereignMemory,
  applyTribeIdentity,
  assignGathering,
  attachReplyToPacket,
  buildStructure,
  canChooseDevelopment,
  chooseDevelopment,
  computeWealth,
  createGame,
  createResourceDeposit,
  damageBuilding,
  developmentIds,
  estimateBreachTicks,
  getEffectiveBuildingCost,
  getBuildingRequirements,
  getTribeBuildingRepairCost,
  getCombatStatCoverageReport,
  getDevelopment,
  getMissingBuildingDevelopments,
  getPacketItemCombatStats,
  getPopulationCap,
  getRecentResourceDepletions,
  getRecentVisibleEvents,
  getResourceControlSummary,
  getActiveGateAccessTreaties,
  getTownHall,
  getUnitTypeCombatStats,
  getVictoryPressure,
  getVisibleResourceDepositIntel,
  getVisibleBuildings,
  getVisibleUnits,
  getBuildingTypeCombatStats,
  issueSovereignOrder,
  isBuildingMovementBlocking,
  isTribeActive,
  isTileWalkable,
  previewFortificationBuild,
  recordAiDecision,
  renameUnits,
  buildingTypes,
  projectileTypes,
  resourceTypes,
  scarceMapResourceTypes,
  setGateState,
  summarizeDiplomaticIntel,
  summarizeSovereignMemory,
  issueMove,
  sendPlayerMessage,
  setAllControllers,
  tileIndex,
  trainUnit,
  tribeConfig,
  tribeIds,
  unitTypes,
  type AiDecision,
  type AiStrategicOrder,
  type Building,
  type BuildingType,
  type BuildableBuildingType,
  type DevelopmentId,
  type DiplomacyIntent,
  type GateAccessPolicy,
  type GateDetainedPacketAction,
  type GatePassageAction,
  type GateSabotageAction,
  type GateState,
  type GateTollMode,
  type GameEvent,
  type GameState,
  type Packet,
  type PerimeterDirection,
  type PerimeterPattern,
  type Position,
  type PostGameLearning,
  type ProjectileType,
  type ResourceCost,
  type ResourceDepletionRecord,
  type ResourceDenialRecord,
  type ResourceDeposit,
  type ResourceType,
  type SiegeProjectile,
  type TerrainType,
  type TribeId,
  type Unit,
  type UnitType,
  type VictoryScoreEntry
} from "../../../packages/sim/src";
import {
  chooseDefaultModel,
  describeOllamaFailure,
  fallbackDecision,
  fallbackReply,
  isChatSchemaCompatibleModel,
  isSchemaTurnCompatibleModel,
  loadOllamaModels,
  probeOllamaModel,
  requestSovereignDecision,
  requestSovereignIdentity,
  requestSovereignReply,
  type AiIterationPromptContext,
  type OllamaFailureKind,
  type OllamaModel,
  type SovereignLlmIdentity
} from "./llm";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
    force_ai_self_report_for_test?: (
      tribeId?: TribeId,
      report?: string
    ) => Promise<{
      ok: boolean;
      issueCount: number;
      accepted: string[];
      rejected: string[];
      memory: string[];
      memoryIncludesReport: boolean;
      issue?: AiIssueSummary;
    }>;
    force_live_ai_issue_for_test?: (
      tribeId?: TribeId,
      report?: string
    ) => Promise<{
      ok: boolean;
      issueCount: number;
      accepted: string[];
      rejected: string[];
      memory: string[];
      memoryIncludesReport: boolean;
      issue?: AiIssueSummary;
    }>;
    force_live_authored_bug_report_for_test?: (
      tribeId?: TribeId,
      notice?: string
    ) => Promise<{
      ok: boolean;
      reason?: string;
      issueCount: number;
      accepted: string[];
      rejected: string[];
      provider: AiDecision["provider"];
      model: string;
      strategySummary: string;
      authoredReportText: string;
      orders: AiStrategicOrder[];
      issue?: AiIssueSummary;
    }>;
    refresh_ai_report_review_for_test?: (tribeId?: TribeId) => Promise<{
      ok: boolean;
      total: number;
      aiIterationPromptContext: AiIterationPromptContext;
      tribePromptContexts: Array<{ id: TribeId; name: string; aiIterationPromptContext: AiIterationPromptContext }>;
      tribes: Array<{ id: TribeId; name: string; iterationInbox: AiIterationInbox }>;
    }>;
    force_ai_info_request_for_test?: (
      tribeId?: TribeId,
      body?: string
    ) => { ok: boolean; requestCount: number; answerStatus: string | null; answer: string | null; accepted: string[]; rejected: string[] };
    force_diplomacy_for_test?: (
      recipientTribeId?: TribeId,
      intent?: "peace" | "warning"
    ) => { ok: boolean; packetId?: string; packetState?: Packet["state"]; messageIds?: string[]; reason?: string };
    hold_llm_followup_strategy_for_test?: (enabled?: boolean) => { ok: boolean; enabled: boolean };
    force_survival_review_for_test?: () => {
      ok: boolean;
      winner: string | null;
      learnings: number;
      tick: number;
      year: number;
      eliminatedTribes: number;
      survivingTribes: number;
      persistentGames: number;
      persistentLessons: number;
      appliedLessons: number;
    };
    force_gold_timer_end_for_test?: () => {
      ok: boolean;
      winner: string | null;
      learnings: number;
      tick: number;
      year: number;
      eliminatedTribes: number;
      survivingTribes: number;
      persistentGames: number;
      persistentLessons: number;
      appliedLessons: number;
    };
    clear_persistent_learning_for_test?: () => { ok: boolean; storedGames: number; appliedLessons: number };
    force_resource_boost_for_test?: (tribeId?: TribeId, resources?: Partial<Record<ResourceType, number>>) => {
      ok: boolean;
      resources: Partial<Record<ResourceType, number>>;
    };
    force_development_for_test?: (tribeId?: TribeId, developmentId?: DevelopmentId) => {
      ok: boolean;
      developments: DevelopmentId[];
      reason?: string;
      summary?: string;
    };
    force_gate_state_for_test?: (
      tribeId?: TribeId,
      gateState?: GateState,
      buildingId?: string,
      gateAccessPolicy?: GateAccessPolicy
    ) => { ok: boolean; buildingId?: string; gateState?: GateState; gateAccessPolicy?: GateAccessPolicy; reason?: string };
    force_gate_operation_for_test?: (
      tribeId?: TribeId,
      buildingId?: string,
      gateOperationIntent?: string,
      gateTerms?: string,
      gateState?: GateState,
      gateAccessPolicy?: GateAccessPolicy,
      gateEntryAction?: GatePassageAction,
      gateTollMode?: GateTollMode,
      gateUnpaidAction?: GatePassageAction,
      gatePublicNotice?: string
    ) => {
      ok: boolean;
      buildingId?: string;
      gateOperationIntent?: string;
      gateTerms?: string;
      gateEntryAction?: GatePassageAction;
      gateTollMode?: GateTollMode;
      gateUnpaidAction?: GatePassageAction;
      gatePublicNotice?: string;
      gateOperationCount?: number;
      reason?: string;
    };
    force_gate_ransom_for_test?: () => {
      ok: boolean;
      buildingId?: string;
      packetId?: string;
      packetState?: Packet["state"];
      gateDetainedPacketAction?: GateDetainedPacketAction;
      releaseMessage?: string;
      messageCount?: number;
      blueGoldBefore?: number;
      blueGoldAfter?: number;
      redGoldBefore?: number;
      redGoldAfter?: number;
      eventTypes?: string[];
      reason?: string;
    };
    force_gate_access_sabotage_for_test?: () => {
      ok: boolean;
      buildingId?: string;
      grantTreatyId?: string;
      revokeTreatyId?: string;
      redPassableBefore?: boolean;
      redPassableAfterGrant?: boolean;
      redPassableAfterRevoke?: boolean;
      redPassableAfterSabotage?: boolean;
      redPassableAfterSabotageExpires?: boolean;
      treatyPacketId?: string;
      treatyPacketState?: Packet["state"];
      treatyPacketGateIds?: string[];
      treatyPacketRouteMemory?: string[];
      treatyIncidentId?: string;
      treatyIncidentAction?: GatePassageAction;
      treatyIncidentSummary?: string;
      treatyIncidentParticipants?: TribeId[];
      treatyIncidentWitnesses?: TribeId[];
      sabotageAction?: GateSabotageAction;
      sabotageHistoryCount?: number;
      sabotageRecordId?: string;
      sabotageSaboteurUnitId?: string;
      sabotageWitnessObservationCount?: number;
      sabotageWitnessObservationIds?: string[];
      damageBefore?: number;
      damageAfter?: number;
      eventTypes?: string[];
      reason?: string;
    };
    force_perimeter_for_test?: () => {
      ok: boolean;
      buildingIds?: string[];
      wallCount?: number;
      gateCount?: number;
      planCount?: number;
      groupId?: string;
      pattern?: PerimeterPattern;
      direction?: PerimeterDirection;
      length?: number;
      gateIndex?: number;
      wallBlocks?: boolean;
      gatePassable?: boolean;
      prebuildPreviewOk?: boolean;
      prebuildPreview?: unknown;
      prebuildPreviewReason?: string;
      prebuildResourcesUnchanged?: boolean;
      prebuildBuildingCountUnchanged?: boolean;
      prebuildPlanCountUnchanged?: boolean;
      placementPreview?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_corner_perimeter_for_test?: () => {
      ok: boolean;
      buildingIds?: string[];
      wallCount?: number;
      gateCount?: number;
      planCount?: number;
      groupId?: string;
      pattern?: PerimeterPattern;
      direction?: PerimeterDirection;
      length?: number;
      gateIndex?: number;
      nonCollinear?: boolean;
      wallBlocks?: boolean;
      gatePassable?: boolean;
      prebuildPreviewOk?: boolean;
      prebuildPreview?: unknown;
      prebuildPreviewReason?: string;
      prebuildResourcesUnchanged?: boolean;
      prebuildBuildingCountUnchanged?: boolean;
      prebuildPlanCountUnchanged?: boolean;
      placementPreview?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_tower_perimeter_for_test?: () => {
      ok: boolean;
      buildingIds?: string[];
      turretCount?: number;
      watchtowerCount?: number;
      planCount?: number;
      turretGroupId?: string;
      watchtowerGroupId?: string;
      turretPreview?: unknown;
      watchtowerPreview?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_damage_building_for_test?: () => {
      ok: boolean;
      targetBuildingId?: string;
      buildingType?: Building["type"];
      beforeHp?: number;
      afterHp?: number;
      damageState?: DurabilityCondition;
      repairState?: RepairState;
      healthPct?: number;
      selectedPanel?: string;
      reason?: string;
    };
    force_siege_for_test?: (buildingType?: "wall" | "gate" | "turret") => {
      ok: boolean;
      targetBuildingId?: string;
      buildingType?: "wall" | "gate" | "turret";
      destroyed?: boolean;
      beforeHp?: number;
      afterHp?: number | null;
      beforeWalkable?: boolean;
      afterWalkable?: boolean;
      attackerTasks?: string[];
      recentEvents?: string[];
      reason?: string;
    };
    force_multi_target_siege_for_test?: () => {
      ok: boolean;
      targetBuildingIds?: string[];
      assignedTargets?: string[];
      guardRoles?: Array<{ unitId: string; role: "cover" | "escort"; task: string }>;
      destroyedTargets?: string[];
      attackerTasksBefore?: string[];
      attackerTasksAfter?: string[];
      siegePlan?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_siege_engine_for_test?: () => {
      ok: boolean;
      unitId?: string;
      unitType?: UnitType;
      targetBuildingId?: string;
      breachEstimateBefore?: number | null;
      destroyed?: boolean;
      attackerTasks?: string[];
      recentEvents?: string[];
      reason?: string;
    };
    force_artillery_for_test?: () => {
      ok: boolean;
      unitId?: string;
      unitType?: UnitType;
      targetBuildingId?: string;
      projectileSeen?: boolean;
      impactSeen?: boolean;
      destroyed?: boolean;
      projectileSnapshots?: Array<{
        id: string;
        projectileType: string;
        targetKind: "building" | "unit";
        x: number;
        y: number;
        targetBuildingId?: string;
        targetUnitId?: string;
        impactTick: number;
        hp: number;
        maxHp: number;
        armor: number;
        attack: number;
        range: number;
        attackCooldown: number;
      }>;
      recentEvents?: string[];
      reason?: string;
    };
    force_projectile_visual_for_test?: () => {
      ok: boolean;
      unitId?: string;
      unitType?: UnitType;
      targetBuildingId?: string;
      projectileSeen?: boolean;
      projectileSnapshots?: Array<{
        id: string;
        projectileType: string;
        targetKind: "building" | "unit";
        x: number;
        y: number;
        targetBuildingId?: string;
        targetUnitId?: string;
        impactTick: number;
        hp: number;
        maxHp: number;
        armor: number;
        attack: number;
        range: number;
        attackCooldown: number;
      }>;
      visibleProjectiles?: unknown[];
      recentCombatEvents?: unknown[];
      combatOverlay?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_ranged_projectiles_for_test?: () => {
      ok: boolean;
      archerId?: string;
      turretId?: string;
      arrowTargetUnitId?: string;
      boltTargetUnitId?: string;
      arrowProjectile?: unknown;
      turretBoltProjectile?: unknown;
      projectileSnapshots?: unknown[];
      visibleProjectiles?: unknown[];
      recentCombatEvents?: unknown[];
      combatOverlay?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_retreat_for_test?: () => {
      ok: boolean;
      targetBuildingId?: string;
      retreatTarget?: Position;
      retreatedUnits?: string[];
      attackTasksBefore?: string[];
      moveTasksAfter?: string[];
      siegePlan?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_coordinated_feint_for_test?: () => {
      ok: boolean;
      coordinated?: {
        ok: boolean;
        targetBuildingId: string;
        assemblyTarget: Position;
        assembleTasksBefore: string[];
        attackTasksAfter: string[];
        siegePlan?: unknown;
        recentEvents: string[];
      };
      wave?: {
        ok: boolean;
        targetBuildingId: string;
        holdTarget: Position;
        waitingTasksBefore: string[];
        releaseTasksAfter: string[];
        siegePlan?: unknown;
        recentEvents: string[];
      };
      feint?: {
        ok: boolean;
        targetBuildingId: string;
        retreatTarget: Position;
        attackTasksBefore: string[];
        moveTasksAfter: string[];
        siegePlan?: unknown;
        recentEvents: string[];
      };
      reason?: string;
    };
    force_resource_raid_for_test?: () => {
      ok: boolean;
      target?: { x: number; y: number; type: ResourceType };
      beforeHp?: number;
      beforeAmount?: number;
      afterHp?: number | null;
      afterAmount?: number | null;
      destroyed?: boolean;
      beforePosture?: unknown;
      afterPosture?: unknown;
      resourceControlBefore?: unknown;
      resourceControlAfter?: unknown;
      resourceDenials?: unknown[];
      attackerTasks?: string[];
      recentEvents?: string[];
      reason?: string;
    };
    force_resource_depletion_for_test?: () => {
      ok: boolean;
      target?: { x: number; y: number; type: ResourceType };
      beforeAmount?: number;
      afterAmount?: number | null;
      stockpileBefore?: number;
      stockpileAfter?: number;
      depleted?: boolean;
      resourceDepletions?: unknown[];
      recentEvents?: string[];
      workerTask?: string;
      reason?: string;
    };
    force_civilization_merger_for_test?: () => {
      ok: boolean;
      packetId?: string;
      messageId?: string;
      mergerRecordId?: string;
      leaderTribeId?: TribeId;
      mergedTribeId?: TribeId;
      mergedIntoTribeId?: TribeId | null;
      leaderPopulation?: number;
      mergedPopulation?: number;
      leaderResources?: Partial<Record<ResourceType, number>>;
      recentMergers?: unknown[];
      reason?: string;
    };
    force_repair_for_test?: () => {
      ok: boolean;
      targetBuildingId?: string;
      beforeHp?: number;
      afterHp?: number | null;
      completed?: boolean;
      damagedSnapshot?: BuildingDurabilitySnapshot;
      repairQueuedSnapshot?: BuildingDurabilitySnapshot;
      repairedSnapshot?: BuildingDurabilitySnapshot;
      repairerTasks?: string[];
      recentEvents?: string[];
      reason?: string;
    };
    force_repair_under_fire_for_test?: () => {
      ok: boolean;
      targetBuildingId?: string;
      beforeHp?: number;
      afterHp?: number | null;
      interrupted?: boolean;
      completed?: boolean;
      repairerTasks?: string[];
      interruptedEvents?: string[];
      selectedPanel?: string;
      reason?: string;
    };
    force_repair_interdiction_for_test?: () => {
      ok: boolean;
      targetBuildingId?: string;
      repairerBeforeHp?: number;
      repairerAfterHp?: number;
      wallBeforeHp?: number;
      wallAfterHp?: number | null;
      attackTasks?: string[];
      repairerTasks?: string[];
      siegePlan?: unknown;
      recentEvents?: string[];
      reason?: string;
    };
    force_visual_motion_for_test?: () => { ok: boolean; unitId?: string; reason?: string };
    render_motion_probe_for_test?: (unitId: string) => MotionProbePayload | null;
    reset_motion_probe_for_test?: (unitId: string) => boolean;
  }
}

type MotionProbePayload = {
  tick: number;
  clock: {
    tickRate: number;
    simulationStepSeconds: number;
    accumulated: number;
    renderAlpha: number;
    measuredFps: number;
    lastFrameDeltaMs: number;
    maxFrameDeltaMs: number;
    lastRenderDurationMs: number;
    maxRenderDurationMs: number;
  };
  unit: {
    x: number;
    y: number;
    visualX: number;
    visualY: number;
  } | null;
  llm: {
    activeJobCount: number;
    maxConcurrentJobs: number;
    pressureActive: boolean;
  };
  cadence: MotionCadenceProbePayload;
};

type MotionCadenceProbePayload = {
  unitId: string | null;
  elapsedMs: number;
  frameCount: number;
  uniqueTicks: number;
  averageFramesPerTick: number;
  maxFramesPerTick: number;
  repeatedTickFrames: number;
  sameTickMotionFrames: number;
  tickChanges: number;
  snapTickChanges: number;
  maxTickerDeltaMs: number;
  minMeasuredFps: number;
  maxMeasuredFps: number;
};

const TILE = 22;
const playerTribe: TribeId = "blue";
const observerMode = true;
const llmIntervalTicks = 420;
const targetConcurrentLlmJobs = 2;
const buildableBuildingTypes: BuildableBuildingType[] = ["farm", "house", "watchtower", "wall", "gate", "turret"];
const contestedResourceTypes = new Set<ResourceType>(["coal", "iron", "limestone", "clay", "stone", "gold"]);
const scarceResourceTypes = new Set<ResourceType>(scarceMapResourceTypes);
const constructionResourceTypes = new Set<ResourceType>(["wood", "stone", "clay", "limestone", "iron", "coal"]);
const persistentLearningStorageKey = "sovereign-worlds.learning.v1";
const persistentLearningSchema = "sovereign-worlds-learning-v1";
const maxPersistentLearningGames = 12;
const simulationStepSeconds = 1 / TICK_RATE;
const maxSimulationStepsPerFrame = 24;
const minimumSmoothFps = 25;
const llmFramePressureCooldownMs = 4000;
const llmJobLaunchSpacingMs = 1200;

function initialGameSeed(): number {
  const explicitSeed = new URLSearchParams(window.location.search).get("seed");
  if (explicitSeed) {
    const parsed = Number(explicitSeed);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed)) >>> 0;
  }
  const bytes = new Uint32Array(1);
  window.crypto?.getRandomValues?.(bytes);
  return ((bytes[0] || Math.floor(Math.random() * 0xffffffff)) ^ Date.now()) >>> 0;
}

const state = createGame(initialGameSeed());
let persistentLearning = loadPersistentLearning();
let persistentLearningAppliedLessons = applyPersistentLearningToGame(state, persistentLearning);
let persistedVictoryRecordId: string | undefined;
setAllControllers(state, "llm");
const viewport = mustGet("viewport");
const resourceBar = mustGet("resourceBar");
const selectedPanel = mustGet("selectedPanel");
const diplomacyPanel = mustGet("diplomacyPanel");
const eventLog = mustGet("eventLog");
const llmPanel = mustGet("llmPanel");
const victoryPanel = mustGet("victoryPanel");
const aiBugPanel = mustGet("aiBugPanel");
const aiInfoRequestPanel = mustGet("aiInfoRequestPanel");
const aiReportReviewPanel = mustGet("aiReportReviewPanel");
const tribePanel = mustGet("tribePanel");
const legendPanel = mustGet("legendPanel");
const recipientSelect = mustGet("recipientSelect") as HTMLSelectElement;
const pauseButton = mustGet("pauseButton") as HTMLButtonElement;
const speedButton = mustGet("speedButton") as HTMLButtonElement;
const hoverTooltip = mustGet("hoverTooltip");

for (const tribeId of tribeIds.filter((id) => id !== playerTribe)) {
  const option = document.createElement("option");
  option.value = tribeId;
  option.textContent = tribeConfig[tribeId].name;
  recipientSelect.append(option);
}

let selectedUnitId: string | undefined;
let selectedBuildingId: string | undefined;
let paused = false;
let speedIndex = 0;
const speedOptions = [1, 2, 4, 8];
const camera = { x: 0, y: 0, scale: 0.85 };
let showResourceLabels = false;
let showContestedResources = true;
let showDefenseOverlay = true;
const keys = new Set<string>();
let pointerScreen: Position | undefined;
let pointerInsideViewport = false;
let dragState:
  | {
      pointerId: number;
      button: number;
      screenX: number;
      screenY: number;
      cameraX: number;
      cameraY: number;
      moved: boolean;
    }
  | undefined;
type HitTarget = { kind: "unit"; unit: Unit } | { kind: "building"; building: Building };
type HoverTarget =
  | { kind: "unit"; unit: Unit }
  | { kind: "building"; building: Building }
  | { kind: "tile"; x: number; y: number; terrain: TerrainType; resource?: ResourceDeposit };
type LabelTier = "overview" | "tactical" | "detail";
type VisualTextureAtlas = {
  resources: Record<ResourceType, Texture>;
  buildings: Record<BuildingType, Record<BuildingVisualState, Texture>>;
  units: Record<UnitType, Record<UnitVisualState, Texture>>;
  diplomacy: Record<DiplomacyTextureType, Texture>;
  projectiles: Record<ProjectileType, Texture>;
};
type BuildingVisualState = "normal" | "damaged" | "critical" | "repairing" | "gate_open" | "gate_closed" | "gate_locked";
const buildingVisualStates: BuildingVisualState[] = ["normal", "damaged", "critical", "repairing", "gate_open", "gate_closed", "gate_locked"];
type UnitVisualState = "idle" | "move" | "gather" | "deliver" | "repair" | "attack" | "scout";
const unitVisualStates: UnitVisualState[] = ["idle", "move", "gather", "deliver", "repair", "attack", "scout"];
type DiplomacyTextureType = "packet_outbound" | "packet_returning" | "packet_target";
const diplomacyTextureTypes: DiplomacyTextureType[] = ["packet_outbound", "packet_returning", "packet_target"];
type DurabilityCondition = "intact" | "worn" | "damaged" | "critical" | "destroyed";
type RepairState = "none" | "repairing" | "recently_repaired";
type CombatEventMarker = {
  id: string;
  tick: number;
  type: string;
  title: string;
  body: string;
  x: number;
  y: number;
  ageTicks: number;
  actorTribeId?: TribeId;
  targetTribeId?: TribeId;
  subjectId?: string;
  targetId?: string;
  projectileType?: SiegeProjectile["projectileType"];
  severity?: "skirmish" | "impact" | "destroyed" | "raid";
  screenX: number;
  screenY: number;
};
type CombatStatSnapshot = {
  hp: number;
  maxHp: number;
  healthPct: number;
  armor: number;
  attack: number;
  range: number;
  attackCooldown: number;
  condition: DurabilityCondition;
};
type BuildingDurabilitySnapshot = CombatStatSnapshot & {
  damageState: DurabilityCondition;
  repairState: RepairState;
  blocksMovement: boolean;
};
type AiBugSeverity = "low" | "medium" | "high";
type AiBugCategory = "ai_report" | "self_report" | "blocked_order" | "state_race" | "validation" | "llm_error" | "llm_transport" | "llm_parser";
type AiReportSourceKind =
  | "report_bug_order"
  | "live_integrity_canary"
  | "strategy_bug_report"
  | "reply_bug_report"
  | "strategy_llm_error"
  | "strategy_llm_transport"
  | "strategy_llm_parser"
  | "reply_llm_error"
  | "reply_llm_transport"
  | "reply_llm_parser"
  | "order_rejected"
  | "reply_rejected";
type AiBugEntry = {
  id: string;
  tick: number;
  tribeId: TribeId;
  tribeName: string;
  provider: string;
  model: string;
  severity: AiBugSeverity;
  category: AiBugCategory;
  source: string;
  turnContext: string;
  snapshot?: string;
  report: string;
  accepted: string[];
  rejected: string[];
  saveState: "local" | "pending" | "saved" | "failed";
  error?: string;
};
type AiIssueSummary = {
  id: string;
  tick: number;
  tribeId: TribeId;
  category: AiBugCategory;
  severity: AiBugSeverity;
  report: string;
  provider: string;
  model: string;
  source: string;
  snapshot?: string;
  saveState: AiBugEntry["saveState"];
};
type ModelQualitySummary = {
  model: string;
  assignedTribes: string[];
  decisions: number;
  liveDecisions: number;
  fallbackDecisions: number;
  accepted: number;
  rejected: number;
  bugReports: number;
  parserFailures: number;
  transportFailures: number;
  jsonRecoveries: number;
  transportRetries: number;
  lastTick: number | null;
  status: "no-turns" | "clean" | "watch" | "unstable";
};
type AiReportReviewEntry = {
  id: string;
  timestamp: string;
  tick: string;
  tribe: string;
  tribeId?: TribeId;
  severity: string;
  category: string;
  provider: string;
  model: string;
  strategy: string;
  source: string;
  turnContext: string;
  snapshot?: string;
  report: string;
  triageStatus?: AiReportTriageStatus;
  triageNote?: string;
  triageProof?: FixedTriageProof;
  triageUpdatedAt?: string;
  bucketKey?: string;
  bucketStatus?: AiReportTriageStatus;
  bucketNote?: string;
  bucketProof?: FixedTriageProof;
  bucketUpdatedAt?: string;
  bucketCoversReportsThrough?: string;
  bucketCoversLatestTick?: string;
  bucketCovered?: boolean;
  reviewStatus?: AiReportTriageStatus;
  synthetic?: boolean;
};
type FixedTriageProof = {
  summary: string;
  evidence: string;
  fixedBy: "observer_ui" | "smoke" | "review_script" | "manual";
  fixedAtTurn?: number;
  verifiedAt: string;
};
type AiReportReviewCategory = {
  category: string;
  count: number;
  latestTick: string;
  latestTribe: string;
  latestReport: string;
};
type AiReportReviewBucket = {
  key: string;
  category: string;
  provider: string;
  model: string;
  sourceKind: string;
  total: number;
  unresolvedCount: number;
  triagedCount: number;
  fixedCount: number;
  ignoredCount: number;
  current: boolean;
  latestReportId: string;
  latestStatus: AiReportTriageStatus;
  latestTick: string;
  latestTimestamp: string;
  latestTribe: string;
  latestReport: string;
  latestSnapshot?: string;
  bucketStatus?: AiReportTriageStatus;
  bucketNote?: string;
  bucketProof?: FixedTriageProof;
  bucketUpdatedAt?: string;
  bucketCoversReportsThrough?: string;
  bucketCoversLatestTick?: string;
  bucketCoveredReports: number;
  latestFixedReportId?: string;
  latestFixedProof?: FixedTriageProof;
  latestFixedUpdatedAt?: string;
  synthetic: boolean;
  liveCount: number;
  syntheticCount: number;
};
type AiReportReview = {
  ok: boolean;
  path?: string;
  triagePath?: string;
  bucketTriagePath?: string;
  bytes?: number;
  total: number;
  liveReports?: number;
  syntheticReports?: number;
  triageCounts?: Record<AiReportTriageStatus, number>;
  reviewCounts?: Record<AiReportTriageStatus, number>;
  liveReviewCounts?: Record<AiReportTriageStatus, number>;
  syntheticReviewCounts?: Record<AiReportTriageStatus, number>;
  categories: AiReportReviewCategory[];
  buckets: AiReportReviewBucket[];
  bucketCoveredReports?: number;
  reports: AiReportReviewEntry[];
  latest: AiReportReviewEntry[];
  error?: string;
};
type AiReportTriageStatus = "unresolved" | "triaged" | "fixed" | "ignored";
type AiReportFilterStatus = AiReportTriageStatus | "all";
type AiReportScopeFilter = "live" | "synthetic" | "all";
type AiReportFilters = {
  scope: AiReportScopeFilter;
  status: AiReportFilterStatus;
  category: string;
  severity: string;
  provider: string;
  model: string;
  query: string;
};
type AiReportFocusBucket = {
  key: string;
  label: string;
  count: number;
  latestTick: string;
  latestTribe: string;
  latestReport: string;
  filters: AiReportFilters;
};
type AiSnapshotPreview = {
  id: string;
  url: string;
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
  capturedAt?: string;
  report?: {
    tick?: string;
    tribe?: string;
    provider?: string;
    model?: string;
    severity?: string;
    category?: string;
    report?: string;
  };
  snapshot?: {
    tick?: number;
    report?: {
      text?: string;
      category?: string;
      provider?: string;
      model?: string;
      tribeName?: string;
    };
    tribe?: {
      name?: string;
      developments?: Array<{ id?: string; name?: string }>;
      resources?: Record<string, number>;
      wealth?: number;
      population?: number;
      memory?: string;
    };
    counts?: Record<string, number>;
    survivalMandate?: {
      publicText?: string;
      currentYear?: number;
      nextReviewYear?: number;
      finalYear?: number;
      survivingTribes?: number;
      eliminatedTribes?: number;
      turnsRemaining?: number;
    };
    goldRace?: {
      publicText?: string;
      leaderName?: string;
      leaderWealth?: number;
      leaderGold?: number;
      wealthTarget?: number;
      goldTarget?: number;
      turnsRemaining?: number;
    };
    mandate?: {
      publicText?: string;
      leaderName?: string;
      leaderWealth?: number;
      wealthTarget?: number;
      turnsRemaining?: number;
    };
    recentEvents?: Array<{ tick?: number; title?: string; body?: string }>;
  };
};
type AiIterationInbox = AiIterationPromptContext & {
  openReportCount: number;
  resolvedLessonCount: number;
  promptSummary: string;
};
type ConstructionFlash = {
  buildingId: string;
  buildingType: BuildableBuildingType;
  tick: number;
  message: string;
};
type PersistentLearningGame = {
  id: string;
  recordedAt: string;
  seed: number;
  wonTick: number;
  winnerTribeId: TribeId;
  winnerName: string;
  winnerGold: number;
  scoreByTribe: VictoryScoreEntry[];
  lessons: PostGameLearning[];
};
type PersistentLearningState = {
  schema: typeof persistentLearningSchema;
  games: PersistentLearningGame[];
};
type PersistentLearningComparison = {
  tribeId: TribeId;
  tribeName: string;
  games: number;
  latestRank: number | null;
  previousRank: number | null;
  rankDelta: number | null;
  latestGold: number | null;
  previousGold: number | null;
  goldDelta: number | null;
  bestRank: number | null;
  bestGold: number | null;
  latestLesson: string | null;
};
type OllamaCooldownState = {
  model: string;
  untilTick: number;
  reason: string;
  reportsSuppressed: number;
  probeInFlight: boolean;
  lastProbeTick?: number;
  lastProbeStatus?: string;
};
type OllamaTransportFailureStreak = {
  count: number;
  lastTick: number;
  reason: string;
};
type LlmJobMode = "strategy" | "reply" | "identity";
type LlmJobRecord = {
  mode: LlmJobMode;
  model: string;
};
type LlmAttemptFailure = {
  model: string;
  kind: OllamaFailureKind;
  attempts: number;
  message: string;
  category: AiBugCategory;
  sourceKind: AiReportSourceKind;
};
let ollamaModels: OllamaModel[] = [];
let activeModel = "";
const tribeModelAssignments: Partial<Record<TribeId, string>> = {};
let llmStatus = "Connecting to local Ollama...";
let identityStatus = "AI sovereign names pending.";
let bugReportStatus = "AI reports and blocked orders appear in the queue below.";
let llmBusyTribe: TribeId | undefined;
let llmBusyMode: LlmJobMode | undefined;
const activeLlmJobs = new Map<TribeId, LlmJobRecord>();
let llmSchedulePumpPending = false;
let llmSchedulingStarted = false;
let llmFollowupStrategyHoldForTest = false;
let followAction = false;
let followUnitId: string | undefined;
let aiBugCounter = 0;
let manualAskCursor = 0;
const aiBugReports: AiBugEntry[] = [];
let aiReportReview: AiReportReview = { ok: false, total: 0, categories: [], buckets: [], reports: [], latest: [] };
const aiReportFilters: AiReportFilters = {
  scope: "live",
  status: "unresolved",
  category: "all",
  severity: "all",
  provider: "all",
  model: "all",
  query: ""
};
let aiSnapshotPreview: AiSnapshotPreview = { id: "", url: "", status: "idle" };
let constructionFlash: ConstructionFlash | undefined;
const recentConstructionFlashes: ConstructionFlash[] = [];
let ollamaCooldown: OllamaCooldownState | undefined;
const ollamaTransportFailureStreaks: Partial<Record<string, OllamaTransportFailureStreak>> = {};
const pendingReplyPacketIds = new Set<string>();
let identitySetupComplete = false;
const nextIdentityRetryTick: Record<TribeId, number> = {
  blue: 20,
  red: 25,
  green: 30,
  yellow: 35,
  purple: 40
};
const nextLlmDecisionTick: Record<TribeId, number> = {
  blue: 70,
  red: 110,
  green: 150,
  yellow: 190,
  purple: 230
};

const app = new Application();
const world = new Container();
const terrainLayer = new Container();
const ambientTerrainGraphics = new Graphics();
const resourceSpriteLayer = new Container();
const routeLayer = new Container();
const routeStaticGraphics = new Graphics();
const routePulseGraphics = new Graphics();
const packetSpriteLayer = new Container();
const dynamicLayer = new Container();
const overlayGraphics = new Graphics();
const buildingUnderlayGraphics = new Graphics();
const buildingSpriteLayer = new Container();
const buildingGraphics = new Graphics();
const unitSpriteLayer = new Container();
const projectileSpriteLayer = new Container();
const dynamicGraphics = new Graphics();
const unitOverlayGraphics = new Graphics();
const labelBackdropGraphics = new Graphics();
const dynamicLabelLayer = new Container();
const fogLayer = new Graphics();
routeLayer.addChild(routeStaticGraphics, routePulseGraphics, packetSpriteLayer);
dynamicLayer.addChild(
  overlayGraphics,
  buildingUnderlayGraphics,
  buildingSpriteLayer,
  buildingGraphics,
  dynamicGraphics,
  unitSpriteLayer,
  projectileSpriteLayer,
  unitOverlayGraphics,
  labelBackdropGraphics,
  dynamicLabelLayer
);
world.addChild(terrainLayer, ambientTerrainGraphics, resourceSpriteLayer, routeLayer, dynamicLayer, fogLayer);
let visualTextures: VisualTextureAtlas | undefined;
const resourceSpritePool: Sprite[] = [];
let activeResourceSpriteCount = 0;
const buildingSpritePool: Sprite[] = [];
let activeBuildingSpriteCount = 0;
const unitSpritePool: Sprite[] = [];
let activeUnitSpriteCount = 0;
const projectileSpritePool: Sprite[] = [];
let activeProjectileSpriteCount = 0;
const packetSpritePool: Sprite[] = [];
let activePacketSpriteCount = 0;
const mapTextPool: Text[] = [];
let activeMapTextCount = 0;
let lastRouteStaticSignature = "";
let activeRouteVisualCount = 0;
let activeAmbientTerrainCueCount = 0;
let activeFogTileCount = 0;
let activeFogEdgeCueCount = 0;

let accumulated = 0;
let renderAlpha = 1;
const unitVisualFrames = new Map<string, { previous: Position; current: Position }>();
type RenderOptions = {
  frame?: boolean;
  forceHud?: boolean;
  forceLabels?: boolean;
  forceFog?: boolean;
  forceTooltip?: boolean;
};
const frameHudIntervalMs = 500;
const frameLabelIntervalMs = 200;
const frameTooltipIntervalMs = 80;
let renderClockMs = 0;
let lastHudRenderMs = Number.NEGATIVE_INFINITY;
let lastLabelRenderMs = Number.NEGATIVE_INFINITY;
let lastTooltipRenderMs = Number.NEGATIVE_INFINITY;
let fogDirty = true;
let frameCountSinceSample = 0;
let lastFpsSampleMs = performance.now();
let measuredFps = 0;
let lastFrameDeltaMs = 0;
let maxFrameDeltaMs = 0;
let lastRenderDurationMs = 0;
let maxRenderDurationMs = 0;
let llmFramePressureUntilMs = 0;
let motionProbeUnitId: string | undefined;
let motionProbeStartedAtMs = 0;
let motionProbeFrameCount = 0;
let motionProbeRepeatedTickFrames = 0;
let motionProbeSameTickMotionFrames = 0;
let motionProbeTickChanges = 0;
let motionProbeSnapTickChanges = 0;
let motionProbeMaxFramesPerTick = 0;
let motionProbeFramesForCurrentTick = 0;
let motionProbeMaxTickerDeltaMs = 0;
let motionProbeMinMeasuredFps = Number.POSITIVE_INFINITY;
let motionProbeMaxMeasuredFps = 0;
let motionProbeLastTick: number | undefined;
let motionProbeLastVisual: Position | undefined;
let motionProbeLastLogical: Position | undefined;

void bootstrap();

async function bootstrap(): Promise<void> {
  await app.init({
    resizeTo: viewport,
    background: "#11100e",
    antialias: false,
    autoDensity: true,
    preserveDrawingBuffer: new URLSearchParams(window.location.search).has("qaCanvasReadback"),
    resolution: Math.min(window.devicePixelRatio || 1, 1.5)
  });
  viewport.append(app.canvas);
  app.stage.addChild(world);
  visualTextures = createVisualTextureAtlas();
  app.ticker.maxFPS = 60;
  app.ticker.minFPS = minimumSmoothFps;
  centerCamera({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  resetVisualFrames(state);

  refreshTerrainLayer();
  bindInput();
  bindButtons();
  renderLegend();
  void refreshAiReportReview();
  void initializeLlm();
  installTestHooks();

  app.ticker.add((ticker) => {
    renderClockMs = performance.now();
    updateFramePerformance(ticker.deltaMS, renderClockMs);
    updateCamera(ticker.deltaMS / 1000);
    if (!paused) {
      accumulated += (ticker.deltaMS / 1000) * speedOptions[speedIndex];
      let steps = 0;
      const visualBefore = accumulated >= simulationStepSeconds ? snapshotUnitPositions(state) : undefined;
      while (accumulated >= simulationStepSeconds && steps < maxSimulationStepsPerFrame) {
        advanceSimulationTicks(1, { render: false, visual: false, scheduleAi: false });
        accumulated -= simulationStepSeconds;
        steps += 1;
      }
      if (steps > 0 && visualBefore) {
        updateVisualFrames(visualBefore, state);
        queueLlmSchedulePump();
      }
      if (steps >= maxSimulationStepsPerFrame) accumulated = 0;
    }
    renderAlpha = paused ? 1 : clamp(accumulated / simulationStepSeconds, 0, 1);
    recordMotionCadenceProbe(ticker.deltaMS);
    updateFollowCamera();
    render({ frame: true });
  });

  render();
}

function updateFramePerformance(deltaMs: number, nowMs: number): void {
  frameCountSinceSample += 1;
  lastFrameDeltaMs = deltaMs;
  maxFrameDeltaMs = Math.max(maxFrameDeltaMs, deltaMs);
  const elapsed = nowMs - lastFpsSampleMs;
  if (elapsed < 1000) return;
  measuredFps = (frameCountSinceSample * 1000) / elapsed;
  frameCountSinceSample = 0;
  lastFpsSampleMs = nowMs;
  maxFrameDeltaMs = deltaMs;
}

function render(options: RenderOptions = {}): void {
  const startedAt = performance.now();
  world.x = camera.x;
  world.y = camera.y;
  world.scale.set(camera.scale);
  const now = renderClockMs || performance.now();
  const updateLabels = !options.frame || options.forceLabels === true || now - lastLabelRenderMs >= frameLabelIntervalMs;
  const updateHudNow = options.forceHud === true || !options.frame || now - lastHudRenderMs >= frameHudIntervalMs;
  const updateTooltipNow = options.forceTooltip === true || !options.frame || now - lastTooltipRenderMs >= frameTooltipIntervalMs;
  drawAmbientTerrain(state, ambientTerrainGraphics);
  drawRoutes(state);
  drawDynamic(state, dynamicLayer, { updateLabels });
  if (options.forceFog || !options.frame || fogDirty) {
    drawFog(state, fogLayer);
    fogDirty = false;
  }
  if (updateHudNow) {
    updateHud(state);
    lastHudRenderMs = now;
  }
  if (updateTooltipNow) {
    updateHoverTooltip();
    lastTooltipRenderMs = now;
  }
  lastRenderDurationMs = performance.now() - startedAt;
  maxRenderDurationMs = Math.max(maxRenderDurationMs, lastRenderDurationMs);
}

function refreshTerrainLayer(): void {
  terrainLayer.removeChildren();
  const chunkTiles = 32;
  for (let y = 0; y < MAP_SIZE; y += chunkTiles) {
    for (let x = 0; x < MAP_SIZE; x += chunkTiles) {
      const chunk = new Graphics();
      drawTerrainChunk(state, chunk, x, Math.min(MAP_SIZE, x + chunkTiles), y, Math.min(MAP_SIZE, y + chunkTiles));
      chunk.cacheAsTexture(true);
      terrainLayer.addChild(chunk);
    }
  }
}

function advanceSimulation(seconds: number, options: { render?: boolean; visual?: boolean; scheduleAi?: boolean } = {}): void {
  const ticks = Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.floor(seconds * TICK_RATE)) : 0;
  advanceSimulationTicks(ticks, options);
}

function advanceSimulationTicks(ticks: number, options: { render?: boolean; visual?: boolean; scheduleAi?: boolean } = {}): void {
  const wholeTicks = Math.max(0, Math.floor(ticks));
  const before = options.visual === false || wholeTicks === 0 ? undefined : snapshotUnitPositions(state);
  advanceGameTicks(state, wholeTicks);
  if (before) {
    if (wholeTicks > maxSimulationStepsPerFrame) resetVisualFrames(state);
    else updateVisualFrames(before, state);
  }
  fogDirty = true;
  recordPersistentLearningIfNeeded();
  if (options.scheduleAi !== false) {
    queueLlmSchedulePump();
  }
  if (options.render !== false) {
    renderAlpha = 1;
    updateFollowCamera();
    render();
  }
}

function snapshotUnitPositions(game: GameState): Map<string, Position> {
  const positions = new Map<string, Position>();
  for (const unit of Object.values(game.units)) {
    if (unit.hp > 0) positions.set(unit.id, { x: unit.x, y: unit.y });
  }
  return positions;
}

function resetVisualFrames(game: GameState): void {
  unitVisualFrames.clear();
  for (const unit of Object.values(game.units)) {
    if (unit.hp <= 0) continue;
    const position = { x: unit.x, y: unit.y };
    unitVisualFrames.set(unit.id, { previous: position, current: position });
  }
  renderAlpha = 1;
}

function updateVisualFrames(before: Map<string, Position>, game: GameState): void {
  const living = new Set<string>();
  for (const unit of Object.values(game.units)) {
    if (unit.hp <= 0) continue;
    living.add(unit.id);
    const existing = unitVisualFrames.get(unit.id);
    const previous = before.get(unit.id) ?? existing?.current ?? { x: unit.x, y: unit.y };
    unitVisualFrames.set(unit.id, {
      previous,
      current: { x: unit.x, y: unit.y }
    });
  }
  for (const unitId of Array.from(unitVisualFrames.keys())) {
    if (!living.has(unitId)) unitVisualFrames.delete(unitId);
  }
}

function visualPositionForUnit(unit: Unit): Position {
  const frame = unitVisualFrames.get(unit.id);
  if (!frame) return { x: unit.x, y: unit.y };
  const alpha = clamp(renderAlpha, 0, 1);
  return {
    x: frame.previous.x + (frame.current.x - frame.previous.x) * alpha,
    y: frame.previous.y + (frame.current.y - frame.previous.y) * alpha
  };
}

function visualCenterForUnit(unit: Unit): Position {
  const position = visualPositionForUnit(unit);
  return { x: position.x * TILE + TILE / 2, y: position.y * TILE + TILE / 2 };
}

function installTestHooks(): void {
  window.render_game_to_text = renderGameToText;
  window.render_motion_probe_for_test = renderMotionProbeForTest;
  window.reset_motion_probe_for_test = (unitId: string) => {
    if (!state.units[unitId]) return false;
    resetMotionCadenceProbe(unitId);
    return true;
  };
  window.advanceTime = (ms: number) => {
    const totalMs = Number.isFinite(ms) ? clamp(ms, 0, 30_000) : 0;
    if (totalMs <= 0) {
      return;
    }
    const totalSeconds = totalMs / 1000;
    const total = accumulated + totalSeconds;
    const ticks = Math.floor(total / simulationStepSeconds);
    accumulated = total - ticks * simulationStepSeconds;
    if (ticks > 0) {
      advanceSimulationTicks(ticks, { render: false });
    }
    renderAlpha = clamp(accumulated / simulationStepSeconds, 0, 1);
    updateFollowCamera();
    render({ forceHud: true, forceLabels: true, forceFog: true, forceTooltip: true });
  };
  window.force_ai_self_report_for_test = forceAiSelfReportForTest;
  window.force_live_ai_issue_for_test = forceLiveAiIssueForTest;
  window.force_live_authored_bug_report_for_test = forceLiveAuthoredBugReportForTest;
  window.refresh_ai_report_review_for_test = refreshAiReportReviewForTest;
  window.force_ai_info_request_for_test = forceAiInfoRequestForTest;
  window.force_diplomacy_for_test = forceDiplomacyForTest;
  window.hold_llm_followup_strategy_for_test = holdLlmFollowupStrategyForTest;
  window.force_survival_review_for_test = forceSurvivalReviewForTest;
  window.force_gold_timer_end_for_test = forceSurvivalReviewForTest;
  window.clear_persistent_learning_for_test = clearPersistentLearningForTest;
  window.force_resource_boost_for_test = forceResourceBoostForTest;
  window.force_development_for_test = forceDevelopmentForTest;
  window.force_gate_state_for_test = forceGateStateForTest;
  window.force_gate_operation_for_test = forceGateOperationForTest;
  window.force_gate_ransom_for_test = forceGateRansomForTest;
  window.force_gate_access_sabotage_for_test = forceGateAccessSabotageForTest;
  window.force_perimeter_for_test = forcePerimeterForTest;
  window.force_corner_perimeter_for_test = forceCornerPerimeterForTest;
  window.force_tower_perimeter_for_test = forceTowerPerimeterForTest;
  window.force_damage_building_for_test = forceDamageBuildingForTest;
  window.force_siege_for_test = forceSiegeForTest;
  window.force_multi_target_siege_for_test = forceMultiTargetSiegeForTest;
  window.force_siege_engine_for_test = forceSiegeEngineForTest;
  window.force_artillery_for_test = forceArtilleryForTest;
  window.force_projectile_visual_for_test = forceProjectileVisualForTest;
  window.force_ranged_projectiles_for_test = forceRangedProjectilesForTest;
  window.force_retreat_for_test = forceRetreatForTest;
  window.force_coordinated_feint_for_test = forceCoordinatedFeintForTest;
  window.force_resource_raid_for_test = forceResourceRaidForTest;
  window.force_resource_depletion_for_test = forceResourceDepletionForTest;
  window.force_civilization_merger_for_test = forceCivilizationMergerForTest;
  window.force_repair_for_test = forceRepairForTest;
  window.force_repair_under_fire_for_test = forceRepairUnderFireForTest;
  window.force_repair_interdiction_for_test = forceRepairInterdictionForTest;
  window.force_visual_motion_for_test = forceVisualMotionForTest;
}

function emptyPersistentLearning(): PersistentLearningState {
  return { schema: persistentLearningSchema, games: [] };
}

function loadPersistentLearning(): PersistentLearningState {
  try {
    const raw = window.localStorage.getItem(persistentLearningStorageKey);
    if (!raw) return emptyPersistentLearning();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyPersistentLearning();
    const record = parsed as Partial<PersistentLearningState>;
    const games = Array.isArray(record.games) ? record.games.map(sanitizePersistentLearningGame).filter((game): game is PersistentLearningGame => Boolean(game)) : [];
    return { schema: persistentLearningSchema, games: games.slice(-maxPersistentLearningGames) };
  } catch {
    return emptyPersistentLearning();
  }
}

function savePersistentLearning(): void {
  try {
    window.localStorage.setItem(persistentLearningStorageKey, JSON.stringify(persistentLearning));
  } catch (error) {
    console.warn(`Persistent learning could not be saved: ${error instanceof Error ? error.message : "unknown storage error"}`);
  }
}

function validTribeId(value: unknown): value is TribeId {
  return typeof value === "string" && (tribeIds as readonly string[]).includes(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizePersistentLearningGame(value: unknown): PersistentLearningGame | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Partial<PersistentLearningGame>;
  const winnerTribeId = validTribeId(raw.winnerTribeId) ? raw.winnerTribeId : undefined;
  if (!raw.id || !winnerTribeId || !Array.isArray(raw.lessons)) return undefined;
  const lessons = raw.lessons.map(sanitizePersistentLesson).filter((lesson): lesson is PostGameLearning => Boolean(lesson));
  if (lessons.length === 0) return undefined;
  const scoreByTribe = Array.isArray(raw.scoreByTribe) ? raw.scoreByTribe.map(sanitizeScoreEntry).filter((score): score is VictoryScoreEntry => Boolean(score)) : [];
  return {
    id: clampText(String(raw.id), 140),
    recordedAt: clampText(String(raw.recordedAt ?? ""), 80),
    seed: finiteNumber(raw.seed, 0),
    wonTick: finiteNumber(raw.wonTick, 0),
    winnerTribeId,
    winnerName: clampText(String(raw.winnerName ?? winnerTribeId), 120),
    winnerGold: finiteNumber(raw.winnerGold, 0),
    scoreByTribe,
    lessons
  };
}

function sanitizePersistentLesson(value: unknown): PostGameLearning | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Partial<PostGameLearning>;
  const tribeId = validTribeId(raw.tribeId) ? raw.tribeId : undefined;
  const winnerTribeId = validTribeId(raw.winnerTribeId) ? raw.winnerTribeId : undefined;
  if (!tribeId || !winnerTribeId || !raw.lesson) return undefined;
  return {
    id: clampText(String(raw.id ?? `${tribeId}-${raw.tick ?? 0}`), 100),
    tick: finiteNumber(raw.tick, 0),
    year: raw.year === undefined ? undefined : Math.max(1, finiteNumber(raw.year, 1)),
    tribeId,
    tribeName: clampText(String(raw.tribeName ?? tribeId), 120),
    outcome: raw.outcome === "survived" || raw.outcome === "eliminated" || raw.outcome === "winner" ? raw.outcome : undefined,
    rank: Math.max(1, finiteNumber(raw.rank, 5)),
    gold: Math.max(0, finiteNumber(raw.gold, 0)),
    wealth: raw.wealth === undefined ? undefined : Math.max(0, finiteNumber(raw.wealth, 0)),
    happiness: raw.happiness === undefined ? undefined : Math.max(0, finiteNumber(raw.happiness, 0)),
    safety: raw.safety === undefined ? undefined : Math.max(0, finiteNumber(raw.safety, 0)),
    survivalScore: raw.survivalScore === undefined ? undefined : Math.max(0, finiteNumber(raw.survivalScore, 0)),
    eliminatedTribeId: validTribeId(raw.eliminatedTribeId) ? raw.eliminatedTribeId : undefined,
    eliminatedName: raw.eliminatedName ? clampText(String(raw.eliminatedName), 120) : undefined,
    winnerTribeId,
    winnerName: clampText(String(raw.winnerName ?? winnerTribeId), 120),
    winnerGold: Math.max(0, finiteNumber(raw.winnerGold, 0)),
    lesson: clampText(String(raw.lesson), 300)
  };
}

function sanitizeScoreEntry(value: unknown): VictoryScoreEntry | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Partial<VictoryScoreEntry>;
  const tribeId = validTribeId(raw.tribeId) ? raw.tribeId : undefined;
  if (!tribeId) return undefined;
  return {
    tribeId,
    tribeName: clampText(String(raw.tribeName ?? tribeId), 120),
    gold: Math.max(0, finiteNumber(raw.gold, 0)),
    wealth: Math.max(0, finiteNumber(raw.wealth, 0)),
    population: Math.max(0, finiteNumber(raw.population, 0)),
    happiness: Math.max(0, finiteNumber(raw.happiness, 0)),
    safety: Math.max(0, finiteNumber(raw.safety, 0)),
    wealthPerCapita: Math.max(0, finiteNumber(raw.wealthPerCapita, 0)),
    survivalScore: Math.max(0, finiteNumber(raw.survivalScore, 0)),
    eliminated: Boolean(raw.eliminated),
    eliminatedYear: raw.eliminatedYear === undefined ? undefined : Math.max(0, finiteNumber(raw.eliminatedYear, 0)),
    rank: Math.max(1, finiteNumber(raw.rank, 5))
  };
}

function applyPersistentLearningToGame(game: GameState, history: PersistentLearningState): number {
  let applied = 0;
  for (const savedGame of history.games.slice(-3)) {
    for (const learning of savedGame.lessons) {
      appendSovereignMemory(game, learning.tribeId, `Persistent cross-game learning: ${learning.lesson.replace(/^Post-game learning:\s*/i, "")}`);
      applied += 1;
    }
  }
  return applied;
}

function recordPersistentLearningIfNeeded(): void {
  const victory = getVictoryPressure(state);
  if (victory.status !== "claimed" || !victory.winnerTribeId || state.postGameLearnings.length < tribeIds.length) return;
  if (persistedVictoryRecordId) return;
  const record = buildPersistentLearningGame(victory);
  if (persistentLearning.games.some((game) => game.id === record.id)) {
    persistedVictoryRecordId = record.id;
    return;
  }
  persistentLearning = {
    schema: persistentLearningSchema,
    games: [...persistentLearning.games, record].slice(-maxPersistentLearningGames)
  };
  persistedVictoryRecordId = record.id;
  savePersistentLearning();
}

function buildPersistentLearningGame(victory: ReturnType<typeof getVictoryPressure>): PersistentLearningGame {
  const winnerTribeId = victory.winnerTribeId ?? victory.leaderTribeId;
  const wonTick = victory.wonTick ?? state.tick;
  const lessons = state.postGameLearnings.slice(-tribeIds.length).map((learning) => ({ ...learning }));
  const scoreByTribe =
    lessons.length === tribeIds.length
      ? lessons.map((learning) => {
          const liveScore = victory.scoreByTribe.find((score) => score.tribeId === learning.tribeId);
          return {
            tribeId: learning.tribeId,
            tribeName: learning.tribeName,
            gold: learning.gold,
            wealth: liveScore?.wealth ?? computeWealth(state, learning.tribeId),
            population: liveScore?.population ?? 0,
            happiness: liveScore?.happiness ?? learning.happiness ?? 0,
            safety: liveScore?.safety ?? learning.safety ?? 0,
            wealthPerCapita: liveScore?.wealthPerCapita ?? 0,
            survivalScore: liveScore?.survivalScore ?? learning.survivalScore ?? 0,
            eliminated: liveScore?.eliminated ?? false,
            eliminatedYear: liveScore?.eliminatedYear,
            rank: learning.rank
          };
        })
      : victory.scoreByTribe.map((score) => ({ ...score }));
  const winnerLesson = lessons.find((learning) => learning.tribeId === winnerTribeId);
  const winnerGold = winnerLesson?.winnerGold ?? victory.winnerGold ?? victory.leaderGold;
  const scoreKey = scoreByTribe.map((score) => `${score.tribeId}:${score.rank}:${score.gold}`).join("|");
  return {
    id: `${state.seed}:${wonTick}:${winnerTribeId}:${winnerGold}:${scoreKey}`,
    recordedAt: new Date().toISOString(),
    seed: state.seed,
    wonTick,
    winnerTribeId,
    winnerName: victory.winnerName ?? state.tribes[winnerTribeId].name,
    winnerGold,
    scoreByTribe,
    lessons
  };
}

function persistentLearningSummary(): {
  schema: string;
  storedGames: number;
  storedLessons: number;
  appliedLessons: number;
  lastGame: (Pick<PersistentLearningGame, "id" | "recordedAt" | "winnerTribeId" | "winnerName" | "winnerGold" | "wonTick"> & { lessons: number }) | null;
  comparisons: PersistentLearningComparison[];
} {
  const lastGame = persistentLearning.games.at(-1);
  return {
    schema: persistentLearningSchema,
    storedGames: persistentLearning.games.length,
    storedLessons: persistentLearning.games.reduce((total, game) => total + game.lessons.length, 0),
    appliedLessons: persistentLearningAppliedLessons,
    lastGame: lastGame
      ? {
          id: lastGame.id,
          recordedAt: lastGame.recordedAt,
          winnerTribeId: lastGame.winnerTribeId,
          winnerName: lastGame.winnerName,
          winnerGold: lastGame.winnerGold,
          wonTick: lastGame.wonTick,
          lessons: lastGame.lessons.length
        }
      : null,
    comparisons: tribeIds.map(persistentLearningComparisonForTribe)
  };
}

function persistentLearningComparisonForTribe(tribeId: TribeId): PersistentLearningComparison {
  const entries = persistentLearning.games
    .map((game) => {
      const score = game.scoreByTribe.find((candidate) => candidate.tribeId === tribeId);
      const lesson = game.lessons.find((candidate) => candidate.tribeId === tribeId);
      return score ? { game, score, lesson } : undefined;
    })
    .filter((entry): entry is { game: PersistentLearningGame; score: VictoryScoreEntry; lesson: PostGameLearning | undefined } => Boolean(entry));
  const latest = entries.at(-1);
  const previous = entries.at(-2);
  const bestRank = entries.length > 0 ? Math.min(...entries.map((entry) => entry.score.rank)) : null;
  const bestGold = entries.length > 0 ? Math.max(...entries.map((entry) => entry.score.gold)) : null;
  return {
    tribeId,
    tribeName: latest?.score.tribeName ?? state.tribes[tribeId].name,
    games: entries.length,
    latestRank: latest?.score.rank ?? null,
    previousRank: previous?.score.rank ?? null,
    rankDelta: latest && previous ? previous.score.rank - latest.score.rank : null,
    latestGold: latest?.score.gold ?? null,
    previousGold: previous?.score.gold ?? null,
    goldDelta: latest && previous ? latest.score.gold - previous.score.gold : null,
    bestRank,
    bestGold,
    latestLesson: latest?.lesson?.lesson ?? null
  };
}

function clearPersistentLearningForTest(): { ok: boolean; storedGames: number; appliedLessons: number } {
  persistentLearning = emptyPersistentLearning();
  persistentLearningAppliedLessons = 0;
  persistedVictoryRecordId = undefined;
  try {
    window.localStorage.removeItem(persistentLearningStorageKey);
  } catch {
    // Test hook should not fail just because browser storage is unavailable.
  }
  render();
  return { ok: true, storedGames: 0, appliedLessons: 0 };
}

function rememberConstructionFlash(flash: ConstructionFlash): void {
  constructionFlash = flash;
  recentConstructionFlashes.push(flash);
  if (recentConstructionFlashes.length > 6) recentConstructionFlashes.splice(0, recentConstructionFlashes.length - 6);
}

function activeConstructionFlashes(game: GameState): ConstructionFlash[] {
  const active = recentConstructionFlashes.filter((flash) => {
    const building = game.buildings[flash.buildingId];
    return Boolean(building && building.hp > 0 && game.tick - flash.tick <= 1200);
  });
  recentConstructionFlashes.splice(0, recentConstructionFlashes.length, ...active.slice(-6));
  if (constructionFlash && !recentConstructionFlashes.some((flash) => flash.buildingId === constructionFlash?.buildingId)) {
    constructionFlash = recentConstructionFlashes.at(-1);
  }
  return recentConstructionFlashes.slice();
}

async function forceAiSelfReportForTest(
  tribeId: TribeId = playerTribe,
  report = "Smoke test explicit AI self-report order."
): Promise<{
  ok: boolean;
  issueCount: number;
  accepted: string[];
  rejected: string[];
  memory: string[];
  memoryIncludesReport: boolean;
  issue?: AiIssueSummary;
}> {
  const order: AiStrategicOrder = {
    type: "REPORT_BUG",
    priority: 1,
    messageType: "LETTER",
    diplomacyIntent: "NONE",
    subject: "Smoke explicit AI self-report",
    body: report,
    suspectedArea: "AI report pipeline",
    expectedBehavior: "REPORT_BUG persists structured expected, actual, reproduction, and impact fields.",
    actualBehavior: "Smoke is verifying structured self-report persistence through UI and markdown.",
    reproductionSteps: "Call force_ai_self_report_for_test, then inspect the AI bug panel and AI_BUG_REPORTS.md.",
    strategyImpact: "Future sovereign bug reports are harder to triage if they only contain one vague sentence.",
    bugSeverity: "medium",
    reason: report
  };
  const result = issueSovereignOrder(state, tribeId, order);
  const accepted = result.ok ? [`REPORT_BUG: ${result.summary}`] : [];
  const rejected = result.ok ? [] : [`REPORT_BUG: ${result.reason}`];
  const stored = recordAiDecision(state, {
    tribeId,
    provider: "fallback",
    model: "browser-test-hook",
    freeformStrategy: "Browser smoke verifies explicit AI self-report plumbing.",
    strategySummary: "Browser smoke filed an explicit AI self-report order.",
    memoryNote: "Browser smoke verified explicit AI self-report plumbing.",
    orders: [order],
    accepted,
    rejected
  });
  if (result.ok) await postAiBugReport(stored, formatSelfReportOrder(order), order.bugSeverity ?? "medium", "self_report", true, "report_bug_order");
  render();
  const memory = state.sovereignMemories[tribeId]?.notes ?? [];
  const latestIssue = aiBugReports.at(-1);
  return {
    ok: result.ok,
    issueCount: aiBugReports.length,
    accepted,
    rejected,
    memory,
    memoryIncludesReport: memory.some((note) => note.includes("AI iteration report filed")),
    issue: result.ok && latestIssue ? summarizeAiIssue(latestIssue) : undefined
  };
}

async function forceLiveAiIssueForTest(
  tribeId: TribeId = playerTribe,
  report = "Live feedback canary verified that a saved sovereign issue reappears in that sovereign's next planning inbox."
): Promise<{
  ok: boolean;
  issueCount: number;
  accepted: string[];
  rejected: string[];
  memory: string[];
  memoryIncludesReport: boolean;
  issue?: AiIssueSummary;
}> {
  const order: AiStrategicOrder = {
    type: "REPORT_BUG",
    priority: 1,
    messageType: "LETTER",
    diplomacyIntent: "NONE",
    subject: "Live feedback canary",
    body: report,
    suspectedArea: "AI iteration feedback loop",
    expectedBehavior: "A saved sovereign issue appears in the reporting sovereign's unresolved iteration inbox before its next plan.",
    actualBehavior: "The live monitor is verifying the unresolved issue enters the reporting sovereign's inbox and prompt context.",
    reproductionSteps: "Trigger a live feedback canary issue, read render_game_to_text, and compare the saved issue to the reporting tribe iteration inbox.",
    strategyImpact: "Sovereigns cannot improve their plans if their own reports disappear before the next decision.",
    bugSeverity: "medium",
    reason: report
  };
  const result = issueSovereignOrder(state, tribeId, order);
  const accepted = result.ok ? [`REPORT_BUG: ${result.summary}`] : [];
  const rejected = result.ok ? [] : [`REPORT_BUG: ${result.reason}`];
  const model = modelForTribe(tribeId) || activeModel || "qwen3.5:9b-mlx";
  const stored = recordAiDecision(state, {
    tribeId,
    provider: "ollama",
    model,
    freeformStrategy: "Live feedback canary verifies sovereign issue feedback before future planning.",
    strategySummary: "Live feedback canary filed a sovereign issue for iteration inbox verification.",
    memoryNote: "Live feedback canary verified report feedback into planning inbox.",
    orders: [order],
    accepted,
    rejected
  });
  if (result.ok) await postAiBugReport(stored, formatSelfReportOrder(order), order.bugSeverity ?? "medium", "self_report", true, "report_bug_order");
  render();
  const memory = state.sovereignMemories[tribeId]?.notes ?? [];
  const latestIssue = aiBugReports.at(-1);
  return {
    ok: result.ok,
    issueCount: aiBugReports.length,
    accepted,
    rejected,
    memory,
    memoryIncludesReport: memory.some((note) => note.includes("AI iteration report filed")),
    issue: result.ok && latestIssue ? summarizeAiIssue(latestIssue) : undefined
  };
}

async function forceLiveAuthoredBugReportForTest(
  tribeId: TribeId = playerTribe,
  notice =
    "Your steward's world ledger shows an impossible contradiction: the public roll says your realm has zero living subjects, while your town hall count and visible roster show living people present. This is invalid feedback, not fog of war. Record the contradiction so the scribes can repair the world records before you plan from false population data."
): Promise<{
  ok: boolean;
  reason?: string;
  issueCount: number;
  accepted: string[];
  rejected: string[];
  provider: AiDecision["provider"];
  model: string;
  strategySummary: string;
  authoredReportText: string;
  orders: AiStrategicOrder[];
  issue?: AiIssueSummary;
}> {
  const targetTribeId = validTribeId(tribeId) ? tribeId : playerTribe;
  const model = modelForTribe(targetTribeId) || activeModel;
  if (!model || model === "fallback") {
    return {
      ok: false,
      reason: "No live assigned model is available for the authored bug-report challenge.",
      issueCount: aiBugReports.length,
      accepted: [],
      rejected: [],
      provider: "fallback",
      model: model || "fallback",
      strategySummary: "",
      authoredReportText: "",
      orders: []
    };
  }
  if (!isTribeActive(state, targetTribeId)) {
    return {
      ok: false,
      reason: `${state.tribes[targetTribeId].name} is not an active separate civilization and cannot author a report.`,
      issueCount: aiBugReports.length,
      accepted: [],
      rejected: [],
      provider: "ollama",
      model,
      strategySummary: "",
      authoredReportText: "",
      orders: []
    };
  }
  if (!beginLlmJob(targetTribeId, "strategy", model, false)) {
    return {
      ok: false,
      reason: "A local model lane is already busy.",
      issueCount: aiBugReports.length,
      accepted: [],
      rejected: [],
      provider: "ollama",
      model,
      strategySummary: "",
      authoredReportText: "",
      orders: []
    };
  }

  llmStatus = `${state.tribes[targetTribeId].name} is reading a world-integrity notice with ${model}...`;
  render();
  let outcome: Awaited<ReturnType<NonNullable<Window["force_live_authored_bug_report_for_test"]>>>;
  try {
    const decision = await requestSovereignDecision(state, targetTribeId, model, {
      recentOwnReports: [],
      resolvedLessons: [],
      worldIntegrityNotice: notice
    });
    const accepted = [...transportAccepted(decision.transportNote), ...recoveryAccepted(decision.recoveryNote)];
    const rejected: string[] = [];
    const selfReports: string[] = [];
    const selfReportSeverities: AiBugSeverity[] = [];
    for (const order of decision.orders.slice().sort((a, b) => a.priority - b.priority)) {
      if (order.type !== "REPORT_BUG") {
        rejected.push(`${order.type}: ignored during live-authored bug-report challenge`);
        continue;
      }
      accepted.push("REPORT_BUG: test-only integrity report authored");
      selfReports.push(formatSelfReportOrder(order));
      if (order.bugSeverity) selfReportSeverities.push(order.bugSeverity);
    }
    const authoredReportText =
      selfReports.length > 0
        ? [selfReports.join(" | "), decision.bugReport ? `Additional bugReport: ${decision.bugReport}` : ""].filter(Boolean).join(" | ")
        : decision.bugReport || "";
    const stored = recordAiDecision(state, {
      tribeId: targetTribeId,
      provider: "ollama",
      model,
      freeformStrategy: "Live integrity canary asked a local model to test REPORT_BUG authorship.",
      strategySummary: "Live model authored a test-only integrity canary report.",
      memoryNote: undefined,
      orders: [],
      accepted,
      rejected
    });
    if (!authoredReportText.trim()) {
      outcome = {
        ok: false,
        reason: "The live model did not author a REPORT_BUG order or bugReport field.",
        issueCount: aiBugReports.length,
        accepted,
        rejected,
        provider: "ollama",
        model,
        strategySummary: stored.strategySummary,
        authoredReportText: "",
        orders: decision.orders
      };
    } else {
      const beforeIssueCount = aiBugReports.length;
      const category: AiBugCategory = selfReports.length > 0 ? "self_report" : "ai_report";
      const sourceKind: AiReportSourceKind = "live_integrity_canary";
      await postAiBugReport(
        stored,
        authoredReportText,
        highestBugSeverity([decision.bugSeverity ?? "medium", ...selfReportSeverities]),
        category,
        true,
        sourceKind
      );
      const latestIssue = aiBugReports.slice(beforeIssueCount).find((entry) => entry.tribeId === targetTribeId) ?? aiBugReports.at(-1);
      outcome = {
        ok: Boolean(latestIssue && latestIssue.saveState === "saved"),
        reason: latestIssue?.saveState === "failed" ? latestIssue.error : undefined,
        issueCount: aiBugReports.length,
        accepted,
        rejected,
        provider: "ollama",
        model,
        strategySummary: stored.strategySummary,
        authoredReportText,
        orders: decision.orders,
        issue: latestIssue ? summarizeAiIssue(latestIssue) : undefined
      };
    }
  } catch (error) {
    outcome = {
      ok: false,
      reason: error instanceof Error ? error.message : "unknown live-authored bug-report failure",
      issueCount: aiBugReports.length,
      accepted: [],
      rejected: [],
      provider: "ollama",
      model,
      strategySummary: "",
      authoredReportText: "",
      orders: []
    };
  } finally {
    finishLlmJob(targetTribeId);
    render();
  }
  return outcome;
}

function summarizeAiIssue(issue: AiBugEntry): AiIssueSummary {
  return {
    id: issue.id,
    tick: issue.tick,
    tribeId: issue.tribeId,
    category: issue.category,
    severity: issue.severity,
    report: issue.report,
    provider: issue.provider,
    model: issue.model,
    source: issue.source,
    snapshot: issue.snapshot,
    saveState: issue.saveState
  };
}

async function refreshAiReportReviewForTest(targetTribeId: TribeId = playerTribe): Promise<{
  ok: boolean;
  total: number;
  aiIterationPromptContext: AiIterationPromptContext;
  tribePromptContexts: Array<{ id: TribeId; name: string; aiIterationPromptContext: AiIterationPromptContext }>;
  tribes: Array<{ id: TribeId; name: string; iterationInbox: AiIterationInbox }>;
}> {
  await refreshAiReportReview();
  const promptTribeId = validTribeId(targetTribeId) ? targetTribeId : playerTribe;
  return {
    ok: aiReportReview.ok,
    total: aiReportReview.total,
    aiIterationPromptContext: buildAiIterationPromptContext(promptTribeId),
    tribePromptContexts: tribeIds.map((tribeId) => ({
      id: tribeId,
      name: state.tribes[tribeId].name,
      aiIterationPromptContext: buildAiIterationPromptContext(tribeId)
    })),
    tribes: tribeIds.map((tribeId) => ({
      id: tribeId,
      name: state.tribes[tribeId].name,
      iterationInbox: buildAiIterationInbox(tribeId)
    }))
  };
}

function forceAiInfoRequestForTest(
  tribeId: TribeId = playerTribe,
  body = "Smoke verified that REQUEST_INFO orders render without becoming bug reports."
): { ok: boolean; requestCount: number; answerStatus: string | null; answer: string | null; accepted: string[]; rejected: string[] } {
  const order: AiStrategicOrder = {
    type: "REQUEST_INFO",
    priority: 1,
    messageType: "LETTER",
    diplomacyIntent: "NONE",
    subject: "Smoke strategic information request",
    body,
    reason: body
  };
  const result = issueSovereignOrder(state, tribeId, order);
  const accepted = result.ok ? [`REQUEST_INFO: ${result.summary}`] : [];
  const rejected = result.ok ? [] : [`REQUEST_INFO: ${result.reason}`];
  recordAiDecision(state, {
    tribeId,
    provider: "fallback",
    model: "browser-test-hook",
    freeformStrategy: "Browser smoke verifies strategic information request plumbing.",
    strategySummary: "Browser smoke filed an explicit information request.",
    memoryNote: "Browser smoke verified REQUEST_INFO does not become a bug report.",
    orders: [order],
    accepted,
    rejected
  });
  render();
  const latest = state.aiInformationRequests.at(-1);
  return { ok: result.ok, requestCount: state.aiInformationRequests.length, answerStatus: latest?.answerStatus ?? null, answer: latest?.answer ?? null, accepted, rejected };
}

function forceVisualMotionForTest(): { ok: boolean; unitId?: string; reason?: string } {
  const unit = Object.values(state.units).find((candidate) => candidate.tribeId === playerTribe && candidate.hp > 0 && candidate.type !== "messenger");
  if (!unit) return { ok: false, reason: "no visible player unit available" };
  const offsets = [
    { x: 14, y: 0 },
    { x: 0, y: 14 },
    { x: -14, y: 0 },
    { x: 0, y: -14 },
    { x: 10, y: 10 },
    { x: 6, y: 0 },
    { x: 0, y: 6 }
  ];
  for (const offset of offsets) {
    const target = {
      x: clamp(Math.round(unit.x + offset.x), 2, MAP_SIZE - 3),
      y: clamp(Math.round(unit.y + offset.y), 2, MAP_SIZE - 3)
    };
    if (!issueMove(state, unit.id, target)) continue;
    selectedUnitId = unit.id;
    selectedBuildingId = undefined;
    resetVisualFrames(state);
    resetMotionCadenceProbe(unit.id);
    centerCamera({ x: unit.x, y: unit.y });
    render();
    return { ok: true, unitId: unit.id };
  }
  return { ok: false, unitId: unit.id, reason: "no reachable test motion target" };
}

function holdLlmFollowupStrategyForTest(enabled = true): { ok: boolean; enabled: boolean } {
  llmFollowupStrategyHoldForTest = enabled;
  llmStatus = enabled
    ? "Live monitor is holding follow-up strategy turns after first doctrines."
    : "Live monitor released follow-up strategy turns.";
  render();
  return { ok: true, enabled: llmFollowupStrategyHoldForTest };
}

function healthRatio(entity: { hp: number; maxHp: number }): number {
  if (!Number.isFinite(entity.maxHp) || entity.maxHp <= 0) return 0;
  return clamp(entity.hp / entity.maxHp, 0, 1);
}

function durabilityCondition(entity: { hp: number; maxHp: number }): DurabilityCondition {
  if (entity.hp <= 0) return "destroyed";
  const ratio = healthRatio(entity);
  if (ratio >= 0.98) return "intact";
  if (ratio >= 0.67) return "worn";
  if (ratio >= 0.34) return "damaged";
  return "critical";
}

function combatStatSnapshot(entity: { hp: number; maxHp: number; armor: number; attack: number; range: number; attackCooldown: number }): CombatStatSnapshot {
  return {
    hp: Math.ceil(entity.hp),
    maxHp: entity.maxHp,
    healthPct: Math.round(healthRatio(entity) * 100),
    armor: entity.armor,
    attack: entity.attack,
    range: entity.range,
    attackCooldown: entity.attackCooldown,
    condition: durabilityCondition(entity)
  };
}

function buildingRepairState(game: GameState, building: Building): RepairState {
  if (Object.values(game.units).some((unit) => unit.hp > 0 && unit.task.kind === "repair" && unit.task.targetBuildingId === building.id)) {
    return "repairing";
  }
  const recentRepair = game.events
    .slice(-18)
    .some((event) => event.type === "STRUCTURE_REPAIRED" && game.tick - event.tick <= TICK_RATE * 8 && event.body.includes(building.id));
  return recentRepair ? "recently_repaired" : "none";
}

function buildingDurabilitySnapshot(game: GameState, building: Building): BuildingDurabilitySnapshot {
  const stats = combatStatSnapshot(building);
  return {
    ...stats,
    damageState: stats.condition,
    repairState: buildingRepairState(game, building),
    blocksMovement: isBuildingMovementBlocking(building)
  };
}

function formatCondition(condition: DurabilityCondition): string {
  if (condition === "intact") return "intact";
  if (condition === "worn") return "worn";
  if (condition === "damaged") return "damaged";
  if (condition === "critical") return "critical";
  return "destroyed";
}

function formatRepairState(repairState: RepairState): string {
  if (repairState === "repairing") return "under repair";
  if (repairState === "recently_repaired") return "recently repaired";
  return "none";
}

function buildDevelopmentCatalogTelemetry() {
  const categoryCounts = new Map<string, number>();
  const phaseCounts = new Map<string, number>();
  for (const developmentId of developmentIds) {
    const development = getDevelopment(developmentId);
    const category = development.category ?? "uncategorized";
    const phase = development.phase ?? "unknown";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
  }
  return {
    total: developmentIds.length,
    categoryCounts: Object.fromEntries(categoryCounts),
    phaseCounts: Object.fromEntries(phaseCounts),
    filters: {
      textFields: ["id", "name", "aliases", "tradeoffs", "synergies", "socialCosts"],
      categories: Array.from(categoryCounts.keys()).sort(),
      phases: Array.from(phaseCounts.keys()).sort()
    },
    sample: developmentIds.slice(0, 16).map((id) => {
      const development = getDevelopment(id);
      return {
        id,
        name: development.name,
        category: development.category ?? "uncategorized",
        phase: development.phase ?? "unknown",
        aliases: development.aliases.slice(0, 5),
        tradeoffs: development.tradeoffs.slice(0, 2),
        synergies: development.synergies.slice(0, 2),
        socialCosts: development.socialCosts.slice(0, 2)
      };
    }),
    sampleCount: Math.min(16, developmentIds.length),
    omittedCount: Math.max(0, developmentIds.length - 16)
  };
}

function buildDevelopmentTelemetry(tribeId: TribeId) {
  const unlocked = state.tribes[tribeId].developments.flatMap((id) => (developmentIds.includes(id) ? [id] : []));
  const available = developmentIds.filter((id) => !unlocked.includes(id) && canChooseDevelopment(state, tribeId, id).ok);
  const lockedCount = Math.max(0, developmentIds.length - unlocked.length - available.length);
  return {
    total: developmentIds.length,
    unlockedCount: unlocked.length,
    availableCount: available.length,
    lockedCount,
    unlockedSample: unlocked.slice(-12).map((id) => ({ id, name: getDevelopment(id).name })),
    availableSample: available.slice(0, 16).map((id) => {
      const development = getDevelopment(id);
      return {
        id,
        name: development.name,
        category: development.category ?? "uncategorized",
        phase: development.phase ?? "unknown",
        aliases: development.aliases.slice(0, 5),
        tradeoffs: development.tradeoffs.slice(0, 2),
        synergies: development.synergies.slice(0, 2),
        socialCosts: development.socialCosts.slice(0, 2)
      };
    }),
    availableOmittedCount: Math.max(0, available.length - 16)
  };
}

function buildPopulationOutlook(game: GameState, tribeId: TribeId, score?: VictoryScoreEntry) {
  const tribe = game.tribes[tribeId];
  const population = Object.values(game.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0).length;
  const houseCount = Object.values(game.buildings).filter((building) => building.tribeId === tribeId && building.type === "house" && building.hp > 0).length;
  const populationCap = getPopulationCap(game, tribeId);
  const baseCapacity = tribe.populationCap;
  const housingCapacity = houseCount * 8;
  const developmentCapacity = Math.max(0, populationCap - baseCapacity - housingCapacity);
  const nextGrowthFoodCost = 38 + Math.max(0, Math.floor(population * 0.6));
  const happiness = Math.round(tribe.happiness);
  const safety = score?.safety ?? 0;
  const blockers: string[] = [];
  if (tribe.eliminated) blockers.push("eliminated");
  if (tribe.mergedIntoTribeId) blockers.push(`merged_into_${tribe.mergedIntoTribeId}`);
  if (population >= populationCap) blockers.push("capacity");
  if (tribe.resources.food < nextGrowthFoodCost) blockers.push("food");
  if (happiness < 56) blockers.push("happiness");
  if (safety < 38) blockers.push("safety");
  return {
    population,
    populationCap,
    baseCapacity,
    houseCount,
    housingCapacity,
    developmentCapacity,
    nextGrowthFoodCost,
    availableFood: Math.round(tribe.resources.food),
    happiness,
    safety,
    growthEligible: blockers.length === 0,
    blockers,
    rule: "growth is limited by capacity, food, happiness, and safety; there is no hidden AI-only population cap"
  };
}

function resetMotionCadenceProbe(unitId: string): void {
  motionProbeUnitId = unitId;
  motionProbeStartedAtMs = performance.now();
  motionProbeFrameCount = 0;
  motionProbeRepeatedTickFrames = 0;
  motionProbeSameTickMotionFrames = 0;
  motionProbeTickChanges = 0;
  motionProbeSnapTickChanges = 0;
  motionProbeMaxFramesPerTick = 0;
  motionProbeFramesForCurrentTick = 0;
  motionProbeMaxTickerDeltaMs = 0;
  motionProbeMinMeasuredFps = Number.POSITIVE_INFINITY;
  motionProbeMaxMeasuredFps = 0;
  motionProbeLastTick = undefined;
  motionProbeLastVisual = undefined;
  motionProbeLastLogical = undefined;
}

function recordMotionCadenceProbe(tickerDeltaMs: number): void {
  if (!motionProbeUnitId) return;
  const unit = state.units[motionProbeUnitId];
  if (!unit || unit.hp <= 0) return;
  const visual = visualPositionForUnit(unit);
  const logical = { x: unit.x, y: unit.y };
  motionProbeFrameCount += 1;
  motionProbeMaxTickerDeltaMs = Math.max(motionProbeMaxTickerDeltaMs, tickerDeltaMs);
  if (measuredFps > 0) {
    motionProbeMinMeasuredFps = Math.min(motionProbeMinMeasuredFps, measuredFps);
    motionProbeMaxMeasuredFps = Math.max(motionProbeMaxMeasuredFps, measuredFps);
  }

  if (motionProbeLastTick === undefined || !motionProbeLastVisual || !motionProbeLastLogical) {
    motionProbeLastTick = state.tick;
    motionProbeLastVisual = visual;
    motionProbeLastLogical = logical;
    motionProbeFramesForCurrentTick = 1;
    motionProbeMaxFramesPerTick = Math.max(motionProbeMaxFramesPerTick, motionProbeFramesForCurrentTick);
    return;
  }

  const visualStep = Math.hypot(visual.x - motionProbeLastVisual.x, visual.y - motionProbeLastVisual.y);
  const logicalStep = Math.hypot(logical.x - motionProbeLastLogical.x, logical.y - motionProbeLastLogical.y);
  if (state.tick === motionProbeLastTick) {
    motionProbeRepeatedTickFrames += 1;
    motionProbeFramesForCurrentTick += 1;
    motionProbeMaxFramesPerTick = Math.max(motionProbeMaxFramesPerTick, motionProbeFramesForCurrentTick);
    if (visualStep > 0.001) motionProbeSameTickMotionFrames += 1;
  } else {
    motionProbeTickChanges += 1;
    motionProbeFramesForCurrentTick = 1;
    motionProbeMaxFramesPerTick = Math.max(motionProbeMaxFramesPerTick, motionProbeFramesForCurrentTick);
    if (logicalStep > 0.01 && visualStep >= logicalStep * 0.9 && renderAlpha <= 0.05) {
      motionProbeSnapTickChanges += 1;
    }
  }

  motionProbeLastTick = state.tick;
  motionProbeLastVisual = visual;
  motionProbeLastLogical = logical;
}

function motionCadenceProbePayload(): MotionCadenceProbePayload {
  const uniqueTicks = motionProbeFrameCount > 0 ? motionProbeTickChanges + 1 : 0;
  return {
    unitId: motionProbeUnitId ?? null,
    elapsedMs: motionProbeStartedAtMs > 0 ? Number((performance.now() - motionProbeStartedAtMs).toFixed(1)) : 0,
    frameCount: motionProbeFrameCount,
    uniqueTicks,
    averageFramesPerTick: uniqueTicks > 0 ? Number((motionProbeFrameCount / uniqueTicks).toFixed(2)) : 0,
    maxFramesPerTick: motionProbeMaxFramesPerTick,
    repeatedTickFrames: motionProbeRepeatedTickFrames,
    sameTickMotionFrames: motionProbeSameTickMotionFrames,
    tickChanges: motionProbeTickChanges,
    snapTickChanges: motionProbeSnapTickChanges,
    maxTickerDeltaMs: Number(motionProbeMaxTickerDeltaMs.toFixed(2)),
    minMeasuredFps: motionProbeMinMeasuredFps === Number.POSITIVE_INFINITY ? 0 : Number(motionProbeMinMeasuredFps.toFixed(1)),
    maxMeasuredFps: Number(motionProbeMaxMeasuredFps.toFixed(1))
  };
}

function renderMotionProbeForTest(unitId: string): MotionProbePayload | null {
  const unit = state.units[unitId];
  const visual = unit && unit.hp > 0 ? visualPositionForUnit(unit) : undefined;
  return {
    tick: state.tick,
    clock: {
      tickRate: TICK_RATE,
      simulationStepSeconds,
      accumulated: Number(accumulated.toFixed(4)),
      renderAlpha: Number(renderAlpha.toFixed(3)),
      measuredFps: Number(measuredFps.toFixed(1)),
      lastFrameDeltaMs: Number(lastFrameDeltaMs.toFixed(2)),
      maxFrameDeltaMs: Number(maxFrameDeltaMs.toFixed(2)),
      lastRenderDurationMs: Number(lastRenderDurationMs.toFixed(2)),
      maxRenderDurationMs: Number(maxRenderDurationMs.toFixed(2))
    },
    unit:
      unit && visual
        ? {
            x: Number(unit.x.toFixed(2)),
            y: Number(unit.y.toFixed(2)),
            visualX: Number(visual.x.toFixed(2)),
            visualY: Number(visual.y.toFixed(2))
          }
        : null,
    llm: {
      activeJobCount: activeLlmJobs.size,
      maxConcurrentJobs: maxConcurrentLlmJobs(),
      pressureActive: performance.now() < llmFramePressureUntilMs
    },
    cadence: motionCadenceProbePayload()
  };
}

function renderGameToText(): string {
  const livingUnits = Object.values(state.units).filter((unit) => unit.hp > 0);
  const visibleUnits = observerMode ? livingUnits : getVisibleUnits(state, playerTribe);
  const visibleBuildings = observerMode ? Object.values(state.buildings) : getVisibleBuildings(state, playerTribe);
  const visibleProjectiles = observerMode
    ? Object.values(state.projectiles)
    : Object.values(state.projectiles).filter((projectile) => state.visibility[playerTribe]?.[tileIndex(Math.round(projectile.x), Math.round(projectile.y))] === 2);
  const leader = tribeIds.slice().sort((a, b) => computeWealth(state, b) - computeWealth(state, a))[0];
  const victory = getVictoryPressure(state);
  const aiStatus = compactAiStatus(state);
  const boardReadability = buildBoardReadabilitySnapshot(state, visibleUnits, visibleBuildings, visibleProjectiles);
  const recentCombatEvents = buildRecentCombatEventMarkers(state, visibleUnits, visibleBuildings, 20);
  const payload = {
    coordinateSystem: "tile coordinates, origin top-left, x increases right, y increases down",
    mode: observerMode ? "observer" : "player",
    seed: state.seed,
    tick: state.tick,
    paused,
    speed: speedOptions[speedIndex],
    clock: {
      tickRate: TICK_RATE,
      simulationStepSeconds,
      accumulated: Number(accumulated.toFixed(4)),
      renderAlpha: Number(renderAlpha.toFixed(3)),
      measuredFps: Number(measuredFps.toFixed(1)),
      lastFrameDeltaMs: Number(lastFrameDeltaMs.toFixed(2)),
      maxFrameDeltaMs: Number(maxFrameDeltaMs.toFixed(2)),
      lastRenderDurationMs: Number(lastRenderDurationMs.toFixed(2)),
      maxRenderDurationMs: Number(maxRenderDurationMs.toFixed(2)),
      tickerMaxFps: app.ticker.maxFPS,
      tickerMinFps: app.ticker.minFPS,
      tickerSpeed: app.ticker.speed,
      hudIntervalMs: frameHudIntervalMs,
      labelIntervalMs: frameLabelIntervalMs
    },
    activeModel: activeModel || "fallback",
    llm: {
      identitySetupComplete,
      openingIdentitySetupPending: openingIdentitySetupPending(),
      identityProgress: {
        chosen: tribeIds.filter((tribeId) => state.tribes[tribeId].identityChosen || !isTribeActive(state, tribeId)).length,
        total: tribeIds.length
      },
      schedulingStarted: llmSchedulingStarted,
      busyTribe: llmBusyTribe ?? null,
      busyMode: llmBusyMode ?? null,
      followupStrategyHoldForTest: llmFollowupStrategyHoldForTest,
      activeJobs: activeLlmJobRows(),
      activeJobCount: activeLlmJobs.size,
      maxConcurrentJobs: maxConcurrentLlmJobs(),
      compactStatus: aiStatus,
      fallbackDecisionCount: aiStatus.fallbackDecisions,
      status: llmStatus,
      identityStatus,
      identityBootstrapModel: identityBootstrapModelForTribe(playerTribe) || null,
      strategyBootstrapModel: strategyBootstrapModelForTribe(playerTribe) || null,
      firstDoctrineProgress: {
        written: tribeIds.filter((tribeId) => !isTribeActive(state, tribeId) || hasDoctrineDecision(tribeId)).length,
        total: tribeIds.length
      },
      modelAssignments: tribeIds.reduce<Record<string, string>>((assignments, tribeId) => {
        assignments[tribeId] = modelForTribe(tribeId) || "fallback";
        return assignments;
      }, {}),
      modelQuality: modelQualitySummary(),
      cooldown: ollamaCooldownPayload(),
      frameBudget: {
        minimumSmoothFps,
        pressureActive: performance.now() < llmFramePressureUntilMs
      }
    },
    leader: {
      tribeId: leader,
      name: state.tribes[leader].name,
      wealth: computeWealth(state, leader)
    },
    victory,
    postGameLearnings: state.postGameLearnings.slice(-8),
    persistentLearning: persistentLearningSummary(),
    constructionFeedback: constructionFlash
      ? {
          ...constructionFlash,
          selected: selectedBuildingId === constructionFlash.buildingId,
          visible: visibleBuildings.some((building) => building.id === constructionFlash?.buildingId)
        }
      : null,
    recentConstructionFeedback: activeConstructionFlashes(state).map((flash) => ({
      ...flash,
      selected: selectedBuildingId === flash.buildingId,
      visible: visibleBuildings.some((building) => building.id === flash.buildingId)
    })),
    recentFortificationPlans: state.fortificationPlans.slice(-20),
    recentGateOperations: state.gateOperations.slice(-20),
    recentGateAccessTreaties: state.gateAccessTreaties.slice(-20),
    recentGateTreatyIncidents: state.gateTreatyIncidents.slice(-20),
    recentGateSabotageHistory: state.gateSabotageHistory.slice(-20),
    recentSiegePlans: state.siegePlans.slice(-20),
    recentResourceDepletions: getRecentResourceDepletions(state).slice(-20),
    recentCivilizationMergers: state.civilizationMergers.slice(-20),
    camera: {
      x: Number(camera.x.toFixed(2)),
      y: Number(camera.y.toFixed(2)),
      scale: Number(camera.scale.toFixed(3)),
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight
    },
    tribes: tribeIds.map((tribeId) => {
      const units = livingUnits.filter((unit) => unit.tribeId === tribeId);
      const iterationInbox = buildAiIterationInbox(tribeId);
      const score = victory.scoreByTribe.find((entry) => entry.tribeId === tribeId);
      const populationOutlook = buildPopulationOutlook(state, tribeId, score);
      return {
        id: tribeId,
        defaultName: state.tribes[tribeId].defaultName,
        name: state.tribes[tribeId].name,
        sovereignName: state.tribes[tribeId].sovereignName,
        namingStyle: state.tribes[tribeId].namingStyle,
        controller: state.tribes[tribeId].controller,
        identityChosen: state.tribes[tribeId].identityChosen,
        wealth: computeWealth(state, tribeId),
        happiness: Math.round(state.tribes[tribeId].happiness),
        eliminated: state.tribes[tribeId].eliminated,
        eliminatedYear: state.tribes[tribeId].eliminatedYear ?? null,
        activeCivilization: isTribeActive(state, tribeId),
        mergedIntoTribeId: state.tribes[tribeId].mergedIntoTribeId ?? null,
        mergedLeaderTribeId: state.tribes[tribeId].mergedLeaderTribeId ?? null,
        mergedYear: state.tribes[tribeId].mergedYear ?? null,
        mergedTerms: state.tribes[tribeId].mergedTerms ?? null,
        units: populationOutlook.population,
        populationCap: populationOutlook.populationCap,
        populationOutlook,
        military: units.filter((unit) => isMilitaryUnitType(unit.type)).length,
        messengers: units.filter((unit) => unit.type === "messenger").length,
        houses: populationOutlook.houseCount,
        developments: state.tribes[tribeId].developments.map((id) => ({
          id,
          name: getDevelopment(id).name
        })),
        developmentSummary: buildDevelopmentTelemetry(tribeId),
        memory: state.sovereignMemories[tribeId]?.notes ?? [],
        diplomaticIntel: summarizeDiplomaticIntel(state, tribeId, 10),
        iterationInbox,
        alliance: state.alliances[tribeId] ?? null,
        wars: tribeIds.filter((other) => state.wars[tribeId]?.[other])
      };
    }),
    selected: {
      unitId: selectedUnitId ?? null,
      buildingId: selectedBuildingId ?? null
    },
    mapLayers: {
      resourceLabels: showResourceLabels,
      contestedResources: showContestedResources,
      defenseOverlay: showDefenseOverlay
    },
    boardReadability,
    recentCombatEvents,
    developmentCatalog: buildDevelopmentCatalogTelemetry(),
    combatStatCoverage: getCombatStatCoverageReport(state),
    buildingCosts: buildableBuildingTypes.map((type) => ({
      type,
      cost: getEffectiveBuildingCost(state, playerTribe, type),
      requirements: getBuildingRequirements(type).map((id) => ({
        id,
        name: getDevelopment(id).name
      })),
      missingForPlayer: getMissingBuildingDevelopments(state, playerTribe, type)
    })),
    visibleUnits: visibleUnits.slice(0, 80).map((unit) => {
      const visual = visualPositionForUnit(unit);
      const durability = combatStatSnapshot(unit);
      return {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        tribeId: unit.tribeId,
        x: Number(unit.x.toFixed(2)),
        y: Number(unit.y.toFixed(2)),
        visualX: Number(visual.x.toFixed(2)),
        visualY: Number(visual.y.toFixed(2)),
        hp: durability.hp,
        maxHp: durability.maxHp,
        healthPct: durability.healthPct,
        armor: durability.armor,
        attack: durability.attack,
        range: durability.range,
        condition: durability.condition,
        combatStats: durability,
        task: describeUnitTask(state, unit),
        carriedPacketId: unit.carriedPacketId ?? null,
        screenX: Number((camera.x + (visual.x * TILE + TILE / 2) * camera.scale).toFixed(2)),
        screenY: Number((camera.y + (visual.y * TILE + TILE / 2) * camera.scale).toFixed(2))
      };
    }),
    visibleProjectiles: visibleProjectiles.slice(0, 40).map((projectile) => ({
      id: projectile.id,
      projectileType: projectile.projectileType,
      tribeId: projectile.tribeId,
      originUnitId: projectile.originUnitId ?? null,
      originBuildingId: projectile.originBuildingId ?? null,
      targetKind: projectile.targetKind,
      targetBuildingId: projectile.targetBuildingId ?? null,
      targetUnitId: projectile.targetUnitId ?? null,
      x: Number(projectile.x.toFixed(2)),
      y: Number(projectile.y.toFixed(2)),
      targetX: projectile.targetX,
      targetY: projectile.targetY,
      appliesDamageOnImpact: projectile.appliesDamageOnImpact,
      hp: projectile.hp,
      maxHp: projectile.maxHp,
      armor: projectile.armor,
      attack: projectile.attack,
      range: projectile.range,
      attackCooldown: projectile.attackCooldown,
      impactTick: projectile.impactTick,
      screenX: Number((camera.x + (projectile.x * TILE + TILE / 2) * camera.scale).toFixed(2)),
      screenY: Number((camera.y + (projectile.y * TILE + TILE / 2) * camera.scale).toFixed(2))
    })),
    visibleBuildings: visibleBuildings.slice(0, 80).map((building) => {
      const durability = buildingDurabilitySnapshot(state, building);
      return {
        id: building.id,
        type: building.type,
        tribeId: building.tribeId,
        x: building.x,
        y: building.y,
        hp: durability.hp,
        maxHp: durability.maxHp,
        healthPct: durability.healthPct,
        armor: durability.armor,
        attack: durability.attack,
        range: durability.range,
        condition: durability.condition,
        damageState: durability.damageState,
        repairState: durability.repairState,
        combatStats: durability,
        gateState: building.type === "gate" ? building.gateState ?? "open" : null,
        gateAccessPolicy: building.type === "gate" ? building.gateAccessPolicy ?? "owner_allies" : null,
        gateOperation: building.type === "gate" ? building.gateOperation ?? null : null,
        gateAccessTreaties: building.type === "gate" ? getActiveGateAccessTreaties(state, building.id) : [],
        gateSabotage: building.type === "gate" ? building.gateSabotage ?? null : null,
        gatePassableBy: building.type === "gate" ? tribeIds.filter((tribeId) => !isBuildingMovementBlockingForDisplay(building, tribeId)) : [],
        blocksMovement: durability.blocksMovement,
        breachEstimateTicks: building.tribeId !== playerTribe ? estimateBreachTicks(state, playerTribe, building.id) ?? null : null,
        requirements: isBuildableBuilding(building.type) ? getBuildingRequirements(building.type) : [],
        selected: building.id === selectedBuildingId,
        constructionFocus: building.id === constructionFlash?.buildingId,
        screenX: Number((camera.x + (building.x + 0.5) * TILE * camera.scale).toFixed(2)),
        screenY: Number((camera.y + (building.y + 0.5) * TILE * camera.scale).toFixed(2))
      };
    }),
	    foreignObservations: (state.foreignObservations?.[playerTribe] ?? []).slice(-20).map((observation) => ({
	      id: observation.id,
	      tick: observation.tick,
	      observerTribeId: observation.observerTribeId,
	      kind: observation.kind,
	      subjectKind: observation.subjectKind,
	      subjectTribeId: observation.subjectTribeId,
	      subjectId: observation.subjectId,
	      subjectType: observation.subjectType,
	      x: observation.x,
	      y: observation.y,
	      hp: observation.hp,
      gateTreatyIncidentId: observation.gateTreatyIncidentId ?? null,
      gateTreatyId: observation.gateTreatyId ?? null,
      gateOperationId: observation.gateOperationId ?? null,
      gateOwnerTribeId: observation.gateOwnerTribeId ?? null,
      affectedTribeId: observation.affectedTribeId ?? null,
      packetId: observation.packetId ?? null,
      gateIncidentAction: observation.gateIncidentAction ?? null,
      gateBuildingId: observation.gateBuildingId ?? null,
      gateSabotageId: observation.gateSabotageId ?? null,
      gateSabotageAction: observation.gateSabotageAction ?? null
	    })),
    gateTreatyWitnessObservations: tribeIds
      .flatMap((tribeId) =>
        (state.foreignObservations?.[tribeId] ?? [])
          .filter((observation) => observation.kind === "gate_treaty_incident_witnessed")
          .map((observation) => ({
            id: observation.id,
            tick: observation.tick,
            observerTribeId: tribeId,
            gateTreatyIncidentId: observation.gateTreatyIncidentId ?? null,
            gateTreatyId: observation.gateTreatyId ?? null,
            gateOperationId: observation.gateOperationId ?? null,
            gateOwnerTribeId: observation.gateOwnerTribeId ?? observation.subjectTribeId,
            affectedTribeId: observation.affectedTribeId ?? null,
            packetId: observation.packetId ?? null,
            gateIncidentAction: observation.gateIncidentAction ?? null,
            buildingId: observation.subjectId,
            x: observation.x,
            y: observation.y
          }))
      )
      .slice(-20),
    gateSabotageWitnessObservations: tribeIds
      .flatMap((tribeId) =>
        (state.foreignObservations?.[tribeId] ?? [])
          .filter((observation) => observation.kind === "gate_sabotage_witnessed")
          .map((observation) => ({
            id: observation.id,
            tick: observation.tick,
            observerTribeId: tribeId,
            gateOperationId: observation.gateOperationId ?? null,
            gateOwnerTribeId: observation.gateOwnerTribeId ?? observation.affectedTribeId ?? null,
            affectedTribeId: observation.affectedTribeId ?? null,
            gateBuildingId: observation.gateBuildingId ?? null,
            gateSabotageId: observation.gateSabotageId ?? null,
            gateSabotageAction: observation.gateSabotageAction ?? null,
            saboteurTribeId: observation.subjectTribeId,
            saboteurUnitId: observation.subjectId,
            saboteurUnitType: observation.subjectType,
            x: observation.x,
            y: observation.y
          }))
      )
      .slice(-20),
	    resourceLayoutFingerprint: buildResourceLayoutFingerprint(state),
    resourceTiles: resourceTypes.map((type) => summarizeResourceTiles(state, type)),
    contestedResourceSites: summarizeContestedResourceSites(state),
    resourceControl: tribeIds.map((tribeId) => getResourceControlSummary(state, tribeId)),
    visibleResourceDepositsForPlayer: getVisibleResourceDepositIntel(state, playerTribe, 20),
    packets: Object.values(state.packets)
      .slice(-20)
      .map((packet) => {
        const stats = getPacketItemCombatStats(packet);
        const durability = combatStatSnapshot(packet);
        return {
          id: packet.id,
          itemType: packet.itemType,
          originTribeId: packet.originTribeId,
          recipientTribeId: packet.recipientTribeId,
          state: packet.state,
          messages: packet.messageIds.length,
          carrierUnitId: packet.carrierUnitId ?? null,
          overdueAnnounced: packet.overdueAnnounced,
          routeMemory: packet.routeMemory.slice(-6),
          hp: durability.hp,
          maxHp: durability.maxHp,
          healthPct: durability.healthPct,
          armor: durability.armor,
          attack: durability.attack,
          range: durability.range,
          attackCooldown: durability.attackCooldown,
          condition: durability.condition,
          combatStats: stats
        };
      }),
    latestAiDecisions: state.aiDecisions.slice(-20).map((decision) => ({
      tick: decision.tick,
      tribeId: decision.tribeId,
      provider: decision.provider,
      model: decision.model,
      summary: decision.strategySummary,
      memoryNote: decision.memoryNote ?? null,
      accepted: decision.accepted,
      rejected: decision.rejected
    })),
    aiIssues: aiBugReports.slice(-8).map((entry) => ({
      id: entry.id,
      tick: entry.tick,
      tribeId: entry.tribeId,
      category: entry.category,
      severity: entry.severity,
      source: entry.source,
      turnContext: entry.turnContext,
      snapshot: entry.snapshot ?? null,
      report: entry.report,
      saveState: entry.saveState
    })),
    aiInformationRequests: state.aiInformationRequests.slice(-8).map((request) => ({
      id: request.id,
      tick: request.tick,
      answerTick: request.answerTick ?? null,
      tribeId: request.tribeId,
      tribeName: state.tribes[request.tribeId].name,
      subject: request.subject,
      body: request.body,
      reason: request.reason,
      answerStatus: request.answerStatus ?? null,
      answerSummary: request.answerSummary ?? null,
      answer: request.answer ?? null
    })),
    aiIterationPromptContext: buildAiIterationPromptContext(playerTribe),
    aiReportReview: {
      total: aiReportReview.total,
      triageCounts: aiReportReview.triageCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      reviewCounts: aiReportReview.reviewCounts ?? aiReportReview.triageCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      liveReports: aiReportReview.liveReports ?? 0,
      syntheticReports: aiReportReview.syntheticReports ?? 0,
      liveReviewCounts: aiReportReview.liveReviewCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      syntheticReviewCounts: aiReportReview.syntheticReviewCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      bucketCoveredReports: aiReportReview.bucketCoveredReports ?? 0,
      filters: aiReportFilters,
      filteredCount: filteredAiReports().length,
      focusBuckets: aiReportFocusBuckets(),
      buckets: aiReportReview.buckets,
      snapshotPreview: aiSnapshotPreview,
      categories: aiReportScopedCategories(),
      latest: filteredAiReports().slice(0, 4),
      ok: aiReportReview.ok
    },
    recentEvents: state.events.slice(-10).map((event) => ({
      tick: event.tick,
      type: event.type,
      title: event.title,
      body: event.body,
      context: event.context ?? null
    }))
  };
  return JSON.stringify(payload);
}

function forceSurvivalReviewForTest(): {
  ok: boolean;
  winner: string | null;
  learnings: number;
  tick: number;
  year: number;
  eliminatedTribes: number;
  survivingTribes: number;
  persistentGames: number;
  persistentLessons: number;
  appliedLessons: number;
} {
  let guard = 0;
  while (getVictoryPressure(state).status !== "claimed" && guard < 6) {
    const currentYear = getVictoryPressure(state).currentYear;
    state.victoryPressure.nextReviewYear = Math.max(currentYear, state.victoryPressure.nextReviewYear);
    state.victoryPressure.warningIssued = false;
    const targetTick = (state.victoryPressure.nextReviewYear - 1) * TICKS_PER_GAME_YEAR;
    const ticksToAdvance = Math.max(1, targetTick - state.tick);
    advanceSimulation(ticksToAdvance / TICK_RATE);
    advanceSimulation(0.2);
    guard += 1;
  }
  const victory = getVictoryPressure(state);
  const learningHistory = persistentLearningSummary();
  return {
    ok: victory.status === "claimed" && state.postGameLearnings.length >= tribeIds.length,
    winner: victory.winnerName ?? null,
    learnings: state.postGameLearnings.length,
    tick: state.tick,
    year: victory.currentYear,
    eliminatedTribes: victory.eliminatedTribes,
    survivingTribes: victory.survivingTribes,
    persistentGames: learningHistory.storedGames,
    persistentLessons: learningHistory.storedLessons,
    appliedLessons: learningHistory.appliedLessons
  };
}

function forceResourceBoostForTest(
  tribeId: TribeId = playerTribe,
  resources: Partial<Record<ResourceType, number>> = {}
): { ok: boolean; resources: Partial<Record<ResourceType, number>> } {
  const tribe = state.tribes[tribeId];
  if (!tribe) return { ok: false, resources: {} };
  for (const type of resourceTypes) {
    const amount = resources[type] ?? 0;
    if (amount > 0) tribe.resources[type] += amount;
  }
  render();
  return {
    ok: true,
    resources: Object.fromEntries(resourceTypes.map((type) => [type, Math.round(tribe.resources[type])])) as Partial<Record<ResourceType, number>>
  };
}

function forceDevelopmentForTest(
  tribeId: TribeId = playerTribe,
  developmentId: DevelopmentId = "masonry"
): { ok: boolean; developments: DevelopmentId[]; reason?: string; summary?: string } {
  const tribe = state.tribes[tribeId];
  if (!tribe) return { ok: false, developments: [], reason: "unknown tribe" };
  if (tribe.developments.includes(developmentId)) {
    return { ok: true, developments: [...tribe.developments], summary: `${getDevelopment(developmentId).name} already unlocked` };
  }
  const development = getDevelopment(developmentId);
  for (const type of resourceTypes) {
    const needed = development.cost[type] ?? 0;
    if (tribe.resources[type] < needed) tribe.resources[type] = needed;
  }
  const result = chooseDevelopment(state, tribeId, developmentId);
  render();
  return result.ok
    ? { ok: true, developments: [...tribe.developments], summary: result.summary }
    : { ok: false, developments: [...tribe.developments], reason: result.reason };
}

function forceDiplomacyForTest(
  recipientTribeId: TribeId = "red",
  intent: "peace" | "warning" = "peace"
): { ok: boolean; packetId?: string; packetState?: Packet["state"]; messageIds?: string[]; reason?: string } {
  let result = sendPlayerMessage(state, recipientTribeId, intent);
  if (!result.ok && result.reason.includes("No idle messenger")) {
    state.tribes.blue.resources.food = Math.max(state.tribes.blue.resources.food, 80);
    state.tribes.blue.resources.gold = Math.max(state.tribes.blue.resources.gold, 40);
    const recruited = issueSovereignOrder(state, "blue", {
      type: "RECRUIT",
      unitType: "messenger",
      priority: 1,
      reason: "Browser smoke diplomacy hook needs a fresh courier."
    });
    if (!recruited.ok) {
      render();
      return { ok: false, reason: `No idle messenger and recruit failed: ${recruited.reason}` };
    }
    result = sendPlayerMessage(state, recipientTribeId, intent);
  }
  render();
  if (!result.ok) return { ok: false, reason: result.reason };
  const packet = state.packets[result.packetId];
  return {
    ok: true,
    packetId: result.packetId,
    packetState: packet?.state,
    messageIds: packet?.messageIds ? [...packet.messageIds] : []
  };
}

function forceGateStateForTest(
  tribeId: TribeId = playerTribe,
  gateState: GateState = "locked",
  buildingId?: string,
  gateAccessPolicy?: GateAccessPolicy
): { ok: boolean; buildingId?: string; gateState?: GateState; gateAccessPolicy?: GateAccessPolicy; reason?: string } {
  if (!validTribeId(tribeId)) return { ok: false, reason: "unknown tribe" };
  if (gateState !== "open" && gateState !== "closed" && gateState !== "locked") return { ok: false, reason: "invalid gate state" };
  if (gateAccessPolicy && gateAccessPolicy !== "all" && gateAccessPolicy !== "owner_allies" && gateAccessPolicy !== "owner_only") {
    return { ok: false, reason: "invalid gate access policy" };
  }
  const result = setGateState(state, tribeId, gateState, buildingId, gateAccessPolicy);
  render();
  const gate = result.ok ? state.buildings[result.buildingId] : undefined;
  return result.ok
    ? { ok: true, buildingId: result.buildingId, gateState, gateAccessPolicy: gate?.type === "gate" ? gate.gateAccessPolicy ?? "owner_allies" : undefined }
    : { ok: false, reason: result.reason };
}

function forceGateOperationForTest(
  tribeId: TribeId = playerTribe,
  buildingId?: string,
  gateOperationIntent = "controlled passage toll",
  gateTerms = "Admit named envoys only after a gold toll; detain suspicious messengers.",
  gateState: GateState = "open",
  gateAccessPolicy: GateAccessPolicy = "all",
  gateEntryAction: GatePassageAction = "delay",
  gateTollMode: GateTollMode = "optional",
  gateUnpaidAction: GatePassageAction = "refuse",
  gatePublicNotice = "Gate is open under posted passage rules."
): {
  ok: boolean;
  buildingId?: string;
  gateOperationIntent?: string;
  gateTerms?: string;
  gateEntryAction?: GatePassageAction;
  gateTollMode?: GateTollMode;
  gateUnpaidAction?: GatePassageAction;
  gatePublicNotice?: string;
  gateOperationCount?: number;
  reason?: string;
} {
  if (!validTribeId(tribeId)) return { ok: false, reason: "unknown tribe" };
  const result = issueSovereignOrder(state, tribeId, {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId,
    gateState,
    gateAccessPolicy,
    gateOperationIntent,
    gateTerms,
    gatePublicNotice,
    gateEntryAction,
    gateTollMode,
    gateUnpaidAction,
    gateTollGold: 3,
    gateOperationDurationTicks: TICK_RATE * 60,
    reason: "Browser smoke gate-operation test."
  });
  render();
  if (!result.ok) return { ok: false, reason: result.reason, gateOperationCount: state.gateOperations.length };
  const latest = state.gateOperations.at(-1);
  return {
    ok: true,
    buildingId: latest?.buildingId,
    gateOperationIntent: latest?.gateOperationIntent,
    gateTerms: latest?.gateTerms,
    gateEntryAction: latest?.entryAction,
    gateTollMode: latest?.tollMode,
    gateUnpaidAction: latest?.unpaidAction,
    gatePublicNotice: latest?.gatePublicNotice,
    gateOperationCount: state.gateOperations.length
  };
}

function forceGateRansomForTest(): {
  ok: boolean;
  buildingId?: string;
  packetId?: string;
  packetState?: Packet["state"];
  gateDetainedPacketAction?: GateDetainedPacketAction;
  releaseMessage?: string;
  messageCount?: number;
  blueGoldBefore?: number;
  blueGoldAfter?: number;
  redGoldBefore?: number;
  redGoldAfter?: number;
  eventTypes?: string[];
  reason?: string;
} {
  const blue = state.tribes.blue;
  const red = state.tribes.red;
  for (const type of resourceTypes) {
    blue.resources[type] = Math.max(blue.resources[type], 1000);
    red.resources[type] = Math.max(red.resources[type], type === "gold" ? 40 : 300);
  }
  for (const developmentId of ["masonry", "ironworking"] as const) {
    const result = chooseDevelopment(state, "blue", developmentId);
    if (!result.ok && !blue.developments.includes(developmentId)) {
      render();
      return { ok: false, reason: result.reason };
    }
  }

  let gate = Object.values(state.buildings)
    .filter((building) => building.tribeId === "blue" && building.type === "gate" && building.hp > 0)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!gate) {
    const built = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!built.ok) {
      render();
      return { ok: false, reason: built.reason };
    }
    gate = state.buildings[built.buildingId];
  }

  const detain = issueSovereignOrder(state, "blue", {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId: gate.id,
    recipientTribeId: "red",
    gateState: "open",
    gateAccessPolicy: "all",
    gateOperationIntent: "detain Red courier for ransom leverage",
    gateTerms: "Hold the courier until Red pays for safe return.",
    gateEntryAction: "detain",
    reason: "Browser smoke prepares an explicit detained-packet ransom."
  });
  if (!detain.ok) {
    render();
    return { ok: false, buildingId: gate.id, reason: detain.reason };
  }

  const redIdleMessenger = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "messenger" && unit.hp > 0 && unit.task.kind === "idle");
  if (!redIdleMessenger) {
    render();
    return { ok: false, buildingId: gate.id, reason: "red has no idle messenger" };
  }

  const existingPacketIds = new Set(Object.keys(state.packets));
  const sent = issueSovereignOrder(state, "red", {
    type: "SEND_MESSENGER",
    priority: 1,
    recipientTribeId: "blue",
    messageType: "LETTER",
    diplomacyIntent: "NONE",
    subject: "Gate audience request",
    body: "I request safe passage through your gate to speak about the road.",
    reason: "Browser smoke creates a courier that can be detained and ransomed."
  });
  if (!sent.ok) {
    render();
    return { ok: false, buildingId: gate.id, reason: sent.reason };
  }
  const packet = Object.values(state.packets).find((candidate) => !existingPacketIds.has(candidate.id) && candidate.originTribeId === "red" && candidate.recipientTribeId === "blue");
  if (!packet) {
    render();
    return { ok: false, buildingId: gate.id, reason: "could not find newly sent packet" };
  }
  const messenger = packet.carrierUnitId ? state.units[packet.carrierUnitId] : undefined;
  if (!messenger) {
    render();
    return { ok: false, buildingId: gate.id, packetId: packet.id, reason: "new packet has no carrier" };
  }

  messenger.x = packet.destination.x;
  messenger.y = packet.destination.y;
  advanceGameTicks(state, 1);
  if (state.packets[packet.id].state !== "DETAINED") {
    render();
    return { ok: false, buildingId: gate.id, packetId: packet.id, packetState: state.packets[packet.id].state, reason: "packet was not detained" };
  }

  const blueGoldBefore = blue.resources.gold;
  const redGoldBefore = red.resources.gold;
  const ransom = issueSovereignOrder(state, "blue", {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId: gate.id,
    recipientTribeId: "red",
    gateState: "open",
    gateAccessPolicy: "all",
    gateOperationIntent: "release Red courier after ransom",
    gateTerms: "Red pays gold and receives a warning through the same courier.",
    gateDetainedPacketAction: "ransom",
    gateDetainedPacketId: packet.id,
    gateRansomGold: 10,
    gateReleaseSubject: "Ransom release",
    gateReleaseMessage: "Your courier returns because the ransom was paid; I may still close the road if Red lies about wealth.",
    reason: "Browser smoke executes explicit detained-packet ransom release."
  });
  selectAndShowBuilding(gate);
  render();
  if (!ransom.ok) {
    return { ok: false, buildingId: gate.id, packetId: packet.id, packetState: state.packets[packet.id].state, reason: ransom.reason };
  }
  const releasedPacket = state.packets[packet.id];
  const latestOperation = state.gateOperations.at(-1);
  return {
    ok: true,
    buildingId: gate.id,
    packetId: packet.id,
    packetState: releasedPacket.state,
    gateDetainedPacketAction: latestOperation?.detainedPacketAction,
    releaseMessage: releasedPacket.messageIds.length > 1 ? state.messages[releasedPacket.messageIds[1]]?.body : undefined,
    messageCount: releasedPacket.messageIds.length,
    blueGoldBefore,
    blueGoldAfter: blue.resources.gold,
    redGoldBefore,
    redGoldAfter: red.resources.gold,
    eventTypes: state.events.slice(-12).map((event) => event.type)
  };
}

function forceGateAccessSabotageForTest(): {
  ok: boolean;
  buildingId?: string;
  routeGateId?: string;
  grantTreatyId?: string;
  grantRouteId?: string;
  grantRouteGateIds?: string[];
  grantRouteTreatyIds?: string[];
  grantRouteTerms?: string;
  revokeTreatyId?: string;
  revokeRouteId?: string;
  revokeRouteTreatyIds?: string[];
  redPassableBefore?: boolean;
  redRoutePassableBefore?: boolean;
  redPassableAfterGrant?: boolean;
  redRoutePassableAfterGrant?: boolean;
  redPassableAfterRevoke?: boolean;
  redRoutePassableAfterRevoke?: boolean;
  redPassableAfterSabotage?: boolean;
  redPassableAfterSabotageExpires?: boolean;
  treatyPacketId?: string;
  treatyPacketState?: Packet["state"];
  treatyPacketGateIds?: string[];
  treatyPacketRouteMemory?: string[];
  treatyIncidentId?: string;
  treatyIncidentIds?: string[];
  treatyIncidentAction?: GatePassageAction;
  treatyIncidentSummary?: string;
  treatyIncidentParticipants?: TribeId[];
  treatyIncidentWitnesses?: TribeId[];
  treatyWitnessObservationCount?: number;
  treatyWitnessObservationIds?: string[];
  sabotageAction?: GateSabotageAction;
  sabotageHistoryCount?: number;
  sabotageRecordId?: string;
  sabotageSaboteurUnitId?: string;
  sabotageWitnessObservationCount?: number;
  sabotageWitnessObservationIds?: string[];
  damageBefore?: number;
  damageAfter?: number;
  eventTypes?: string[];
  reason?: string;
} {
  const blue = state.tribes.blue;
  for (const type of resourceTypes) blue.resources[type] = Math.max(blue.resources[type], 1200);
  const red = state.tribes.red;
  for (const type of resourceTypes) red.resources[type] = Math.max(red.resources[type], 1200);
  for (const developmentId of ["masonry", "ironworking"] as const) {
    const result = chooseDevelopment(state, "blue", developmentId);
    if (!result.ok && !blue.developments.includes(developmentId)) {
      render();
      return { ok: false, reason: result.reason };
    }
  }

  const townHall = getTownHall(state, "blue");
  let gate = Object.values(state.buildings)
    .filter((building) => building.tribeId === "blue" && building.type === "gate" && building.hp > 0)
    .sort((left, right) => Math.hypot(left.x - townHall.x, left.y - townHall.y) - Math.hypot(right.x - townHall.x, right.y - townHall.y) || left.id.localeCompare(right.id))[0];
  if (!gate) {
    const built = buildStructure(state, "blue", "gate", getTownHall(state, "blue"));
    if (!built.ok) {
      render();
      return { ok: false, reason: built.reason };
    }
    gate = state.buildings[built.buildingId];
  }
  let routeGate = Object.values(state.buildings)
    .filter((building) => building.tribeId === "blue" && building.type === "gate" && building.hp > 0 && building.id !== gate.id)
    .sort((left, right) => Math.hypot(left.x - gate.x, left.y - gate.y) - Math.hypot(right.x - gate.x, right.y - gate.y) || left.id.localeCompare(right.id))[0];
  if (!routeGate) {
    const target = {
      x: clamp(gate.x + 4, 4, MAP_SIZE - 5),
      y: clamp(gate.y + 2, 4, MAP_SIZE - 5)
    };
    for (let y = target.y - 1; y <= target.y + 1; y += 1) {
      for (let x = target.x - 1; x <= target.x + 1; x += 1) {
        const tile = state.map[tileIndex(x, y)];
        tile.terrain = "grass";
        delete tile.resource;
      }
    }
    const built = buildStructure(state, "blue", "gate", target);
    if (!built.ok) {
      render();
      return { ok: false, buildingId: gate.id, reason: built.reason };
    }
    routeGate = state.buildings[built.buildingId];
  }
  const greenWitness = Object.values(state.units).find((unit) => unit.tribeId === "green" && unit.type === "sentinel" && unit.hp > 0);
  if (!greenWitness) {
    render();
    return { ok: false, buildingId: gate.id, reason: "green has no sentinel witness" };
  }
  greenWitness.x = gate.x + 2;
  greenWitness.y = gate.y;
  delete gate.gateSabotage;
  const reset = setGateState(state, "blue", "open", gate.id, "owner_only");
  if (!reset.ok) {
    render();
    return { ok: false, buildingId: gate.id, reason: reset.reason };
  }
  const routeReset = setGateState(state, "blue", "open", routeGate.id, "owner_only");
  if (!routeReset.ok) {
    render();
    return { ok: false, buildingId: gate.id, routeGateId: routeGate.id, reason: routeReset.reason };
  }
  const redPassableBefore = isTileWalkable(state, gate.x, gate.y, "red");
  const redRoutePassableBefore = isTileWalkable(state, routeGate.x, routeGate.y, "red");
  const routeTerms = "Red may use both smoke route gates for couriers while the writ is active.";
  const grant = issueSovereignOrder(state, "blue", {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId: gate.id,
    recipientTribeId: "red",
    gateOperationIntent: "grant Red controlled treaty passage",
    gateTerms: "Red may cross this gate while the treaty writ is active.",
    gateAccessTreatyAction: "grant",
    gateAccessTreatyName: "Smoke road writ",
    gateAccessTreatyTerms: "Red may pass this gate only under this writ.",
    gateRouteName: "Smoke two-gate road",
    gateRouteGateIds: [gate.id, routeGate.id],
    gateRouteTerms: routeTerms,
    gateAccessTreatyDurationTicks: TICK_RATE * 10,
    reason: "Browser smoke explicit access treaty grant."
  });
  if (!grant.ok) {
    render();
    return { ok: false, buildingId: gate.id, reason: grant.reason };
  }
  const grantRouteTreaties = state.gateAccessTreaties
    .filter((treaty) => treaty.action === "grant" && treaty.routeName === "Smoke two-gate road" && treaty.targetTribeId === "red")
    .slice(-2);
  const grantTreaty = grantRouteTreaties.find((treaty) => treaty.buildingId === gate.id) ?? grantRouteTreaties[0];
  const grantTreatyId = grantTreaty?.id;
  const grantRouteId = grantTreaty?.routeId;
  const grantRouteGateIds = grantTreaty?.routeGateIds ?? [];
  const grantRouteTreatyIds = grantRouteTreaties.map((treaty) => treaty.id);
  const redPassableAfterGrant = isTileWalkable(state, gate.x, gate.y, "red");
  const redRoutePassableAfterGrant = isTileWalkable(state, routeGate.x, routeGate.y, "red");
  let idleRedMessenger = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "messenger" && unit.hp > 0 && unit.task.kind === "idle");
  if (!idleRedMessenger) {
    const trained = issueSovereignOrder(state, "red", {
      type: "RECRUIT",
      priority: 1,
      unitType: "messenger",
      reason: "Browser smoke needs a fresh courier for safe-passage route proof."
    });
    if (!trained.ok) {
      render();
      return { ok: false, buildingId: gate.id, grantTreatyId, reason: trained.reason };
    }
    idleRedMessenger = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "messenger" && unit.hp > 0 && unit.task.kind === "idle");
  }
  const existingPacketIds = new Set(Object.keys(state.packets));
  const treatyCourier = issueSovereignOrder(state, "red", {
    type: "SEND_MESSENGER",
    priority: 1,
    recipientTribeId: "blue",
    messageType: "LETTER",
    diplomacyIntent: "NONE",
    subject: "Safe-passage route proof",
    body: "Red courier travels under the Smoke road writ.",
    reason: "Browser smoke proves named gate treaty route evidence."
  });
  if (!treatyCourier.ok) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, reason: treatyCourier.reason };
  }
  const treatyPacket = Object.values(state.packets).find(
    (packet) => !existingPacketIds.has(packet.id) && packet.originTribeId === "red" && packet.recipientTribeId === "blue"
  );
  if (!treatyPacket) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, reason: "could not find treaty courier packet" };
  }
  const treatyPacketGateIds = treatyPacket.outboundGateBuildingIds ?? [];
  const breachOperation = issueSovereignOrder(state, "blue", {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId: gate.id,
    recipientTribeId: "red",
    gateOperationIntent: "detain Red courier despite the active Smoke road writ",
    gateTerms: "Hold Red's courier as leverage even though the writ still exists.",
    gateEntryAction: "detain",
    reason: "Browser smoke records factual treaty incident evidence."
  });
  if (!breachOperation.ok) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, treatyPacketId: treatyPacket.id, reason: breachOperation.reason };
  }
  const treatyCarrier = treatyPacket.carrierUnitId ? state.units[treatyPacket.carrierUnitId] : undefined;
  if (!treatyCarrier) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, treatyPacketId: treatyPacket.id, reason: "treaty courier has no carrier" };
  }
  treatyCarrier.x = treatyPacket.destination.x;
  treatyCarrier.y = treatyPacket.destination.y;
  advanceGameTicks(state, 1);
  const treatyIncident = state.gateTreatyIncidents.at(-1);
  let secondTreatyIncident = treatyIncident;
  const secondMessenger = issueSovereignOrder(state, "red", {
    type: "RECRUIT",
    priority: 1,
    unitType: "messenger",
    reason: "Browser smoke needs a second courier for repeated treaty incident evidence."
  });
  if (secondMessenger.ok) {
    const secondExistingPacketIds = new Set(Object.keys(state.packets));
    const secondCourier = issueSovereignOrder(state, "red", {
      type: "SEND_MESSENGER",
      priority: 1,
      recipientTribeId: "blue",
      messageType: "LETTER",
      diplomacyIntent: "NONE",
      subject: "Second safe-passage route proof",
      body: "A second Red courier tests whether the Smoke road writ is honored.",
      reason: "Browser smoke creates repeated treaty incident evidence."
    });
    if (secondCourier.ok) {
      const secondTreatyPacket = Object.values(state.packets).find(
        (packet) => !secondExistingPacketIds.has(packet.id) && packet.originTribeId === "red" && packet.recipientTribeId === "blue"
      );
      const secondCarrier = secondTreatyPacket?.carrierUnitId ? state.units[secondTreatyPacket.carrierUnitId] : undefined;
      if (secondTreatyPacket && secondCarrier) {
        secondCarrier.x = secondTreatyPacket.destination.x;
        secondCarrier.y = secondTreatyPacket.destination.y;
        advanceGameTicks(state, 1);
        secondTreatyIncident = state.gateTreatyIncidents.at(-1);
      }
    }
  }
  const treatyPacketRouteMemory = treatyPacket.routeMemory.slice(-6);
  const treatyIncidentIds = Array.from(new Set([treatyIncident?.id, secondTreatyIncident?.id].filter((id): id is string => Boolean(id))));
  const treatyWitnessObservations = (state.foreignObservations.green ?? []).filter(
    (observation) => observation.kind === "gate_treaty_incident_witnessed" && treatyIncidentIds.includes(observation.gateTreatyIncidentId ?? "")
  );
  const revoke = issueSovereignOrder(state, "blue", {
    type: "GATE_OPERATION",
    priority: 1,
    buildingId: gate.id,
    recipientTribeId: "red",
    gateOperationIntent: "revoke Red controlled treaty passage",
    gateAccessTreatyAction: "revoke",
    gateRouteName: "Smoke two-gate road",
    gateRouteGateIds: [gate.id, routeGate.id],
    gateRouteTerms: "The smoke two-gate road is revoked for Red.",
    reason: "Browser smoke explicit access treaty revoke."
  });
  if (!revoke.ok) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, reason: revoke.reason };
  }
  const revokeRouteTreaties = state.gateAccessTreaties
    .filter((treaty) => treaty.action === "revoke" && treaty.routeName === "Smoke two-gate road" && treaty.targetTribeId === "red")
    .slice(-2);
  const revokeTreaty = revokeRouteTreaties.find((treaty) => treaty.buildingId === gate.id) ?? revokeRouteTreaties[0];
  const revokeTreatyId = revokeTreaty?.id;
  const revokeRouteId = revokeTreaty?.routeId;
  const revokeRouteTreatyIds = revokeRouteTreaties.map((treaty) => treaty.id);
  const redPassableAfterRevoke = isTileWalkable(state, gate.x, gate.y, "red");
  const redRoutePassableAfterRevoke = isTileWalkable(state, routeGate.x, routeGate.y, "red");

  const redSaboteur = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.hp > 0 && unit.type === "militia");
  if (!redSaboteur) {
    render();
    return { ok: false, buildingId: gate.id, reason: "red has no militia saboteur" };
  }
  redSaboteur.x = gate.x + 1;
  redSaboteur.y = gate.y;
  const locked = setGateState(state, "blue", "locked", gate.id, "owner_only");
  if (!locked.ok) {
    render();
    return { ok: false, buildingId: gate.id, reason: locked.reason };
  }
  const sabotage = issueSovereignOrder(state, "red", {
    type: "GATE_OPERATION",
    priority: 1,
    targetBuildingId: gate.id,
    gateOperationIntent: "force open Blue's gate from beside the hinges",
    gateSabotageAction: "force_open",
    gateSabotageDurationTicks: 3,
    reason: "Browser smoke adjacent foreign-gate sabotage."
  });
  if (!sabotage.ok) {
    render();
    return { ok: false, buildingId: gate.id, grantTreatyId, revokeTreatyId, reason: sabotage.reason };
  }
  const redPassableAfterSabotage = isTileWalkable(state, gate.x, gate.y, "red");
  const sabotageAction = state.buildings[gate.id]?.gateSabotage?.action as GateSabotageAction | undefined;
  advanceGameTicks(state, 4);
  const redPassableAfterSabotageExpires = isTileWalkable(state, gate.x, gate.y, "red");
  const damageBefore = gate.hp;
  const damaged = issueSovereignOrder(state, "red", {
    type: "GATE_OPERATION",
    priority: 1,
    targetBuildingId: gate.id,
    gateOperationIntent: "damage Blue's gate mechanism",
    gateSabotageAction: "damage",
    gateSabotageDamage: 20,
    reason: "Browser smoke explicit sabotage damage."
  });
  selectAndShowBuilding(gate);
  render();
  if (!damaged.ok) {
    return { ok: false, buildingId: gate.id, grantTreatyId, revokeTreatyId, sabotageAction, reason: damaged.reason };
  }
  const latestSabotageRecord = state.gateSabotageHistory.at(-1);
  const sabotageWitnessObservations = (state.foreignObservations.blue ?? []).filter(
    (observation) => observation.kind === "gate_sabotage_witnessed" && observation.gateSabotageId === latestSabotageRecord?.id
  );
  return {
    ok: true,
    buildingId: gate.id,
    routeGateId: routeGate.id,
    grantTreatyId,
    grantRouteId,
    grantRouteGateIds,
    grantRouteTreatyIds,
    grantRouteTerms: routeTerms,
    revokeTreatyId,
    revokeRouteId,
    revokeRouteTreatyIds,
    treatyPacketId: treatyPacket.id,
    treatyPacketState: treatyPacket.state,
    treatyPacketGateIds,
    treatyPacketRouteMemory,
    treatyIncidentId: treatyIncident?.id,
    treatyIncidentIds,
    treatyIncidentAction: treatyIncident?.action,
    treatyIncidentSummary: treatyIncident?.summary,
    treatyIncidentParticipants: treatyIncident?.participantTribeIds,
    treatyIncidentWitnesses: treatyIncident?.witnessTribeIds,
    treatyWitnessObservationCount: treatyWitnessObservations.length,
    treatyWitnessObservationIds: treatyWitnessObservations.map((observation) => observation.id),
    redPassableBefore,
    redRoutePassableBefore,
    redPassableAfterGrant,
    redRoutePassableAfterGrant,
    redPassableAfterRevoke,
    redRoutePassableAfterRevoke,
    redPassableAfterSabotage,
    redPassableAfterSabotageExpires,
    sabotageAction,
    sabotageHistoryCount: state.gateSabotageHistory.length,
    sabotageRecordId: latestSabotageRecord?.id,
    sabotageSaboteurUnitId: latestSabotageRecord?.saboteurUnitId,
    sabotageWitnessObservationCount: sabotageWitnessObservations.length,
    sabotageWitnessObservationIds: sabotageWitnessObservations.map((observation) => observation.id),
    damageBefore,
    damageAfter: gate.hp,
    eventTypes: state.events.slice(-18).map((event) => event.type)
  };
}

function forcePerimeterForTest(): {
  ok: boolean;
  buildingIds?: string[];
  wallCount?: number;
  gateCount?: number;
  planCount?: number;
  groupId?: string;
  pattern?: PerimeterPattern;
  direction?: PerimeterDirection;
  length?: number;
  gateIndex?: number;
  wallBlocks?: boolean;
  gatePassable?: boolean;
  prebuildPreviewOk?: boolean;
  prebuildPreview?: unknown;
  prebuildPreviewReason?: string;
  prebuildResourcesUnchanged?: boolean;
  prebuildBuildingCountUnchanged?: boolean;
  prebuildPlanCountUnchanged?: boolean;
  placementPreview?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 1200);
  for (const developmentId of ["masonry", "ironworking"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) {
      render();
      return { ok: false, reason: result.reason };
    }
  }

  const townHall = getTownHall(state, playerTribe);
  const target = {
    x: clamp(townHall.x + 17, 4, MAP_SIZE - 5),
    y: clamp(townHall.y + 8, 4, MAP_SIZE - 5)
  };
  for (let y = target.y - 1; y <= target.y + 1; y += 1) {
    for (let x = target.x - 3; x <= target.x + 3; x += 1) {
      const tile = state.map[tileIndex(x, y)];
      tile.terrain = "grass";
      delete tile.resource;
    }
  }

  const buildOrder: AiStrategicOrder = {
    type: "BUILD",
    priority: 1,
    buildingType: "wall",
    targetX: target.x,
    targetY: target.y,
    perimeterPattern: "gate_line",
    perimeterDirection: "east_west",
    perimeterLength: 5,
    perimeterGateIndex: 3,
    fortificationIntent: "browser smoke customs wall",
    perimeterShape: "straight five-tile line with central gate",
    perimeterStrategy: "Hold a visible border while preserving one gate-controlled passage.",
    reason: "Browser smoke perimeter test."
  };
  const resourcesBeforePreview = { ...tribe.resources };
  const buildingCountBeforePreview = Object.keys(state.buildings).length;
  const planCountBeforePreview = state.fortificationPlans.length;
  const prebuildPreview = previewFortificationBuild(state, playerTribe, buildOrder);
  const prebuildResourcesUnchanged = resourceTypes.every((type) => tribe.resources[type] === resourcesBeforePreview[type]);
  const prebuildBuildingCountUnchanged = Object.keys(state.buildings).length === buildingCountBeforePreview;
  const prebuildPlanCountUnchanged = state.fortificationPlans.length === planCountBeforePreview;
  if (!prebuildPreview.ok || !prebuildResourcesUnchanged || !prebuildBuildingCountUnchanged || !prebuildPlanCountUnchanged) {
    render();
    return {
      ok: false,
      prebuildPreviewOk: prebuildPreview.ok,
      prebuildPreview: prebuildPreview.ok ? prebuildPreview.preview : undefined,
      prebuildPreviewReason: prebuildPreview.ok ? undefined : prebuildPreview.reason,
      prebuildResourcesUnchanged,
      prebuildBuildingCountUnchanged,
      prebuildPlanCountUnchanged,
      reason: prebuildPreview.ok ? "pre-build preview mutated state" : prebuildPreview.reason
    };
  }

  const beforeIds = new Set(Object.keys(state.buildings));
  const result = issueSovereignOrder(state, playerTribe, buildOrder);
  if (!result.ok) {
    render();
    return { ok: false, reason: result.reason };
  }

  const built = Object.values(state.buildings).filter((building) => !beforeIds.has(building.id));
  const walls = built.filter((building) => building.type === "wall");
  const gates = built.filter((building) => building.type === "gate");
  const latestPlan = state.fortificationPlans.at(-1);
  const groupId = latestPlan?.perimeterGroupId;
  const perimeterPlans = groupId ? state.fortificationPlans.filter((plan) => plan.perimeterGroupId === groupId) : [];
  const selected = gates[0] ?? built[0];
  if (selected) selectAndShowBuilding(selected);
  else render({ forceHud: true, forceLabels: true, forceFog: true });

  const wallBlocks = walls.length > 0 && walls.every((wall) => !isTileWalkable(state, wall.x, wall.y, playerTribe));
  const gatePassable = gates.length > 0 && gates.every((gate) => isTileWalkable(state, gate.x, gate.y, playerTribe));
  return {
    ok: built.length === 5 && walls.length === 4 && gates.length === 1 && perimeterPlans.length === 5 && wallBlocks && gatePassable,
    buildingIds: built.map((building) => building.id),
    wallCount: walls.length,
    gateCount: gates.length,
    planCount: perimeterPlans.length,
    groupId,
    pattern: latestPlan?.perimeterPattern,
    direction: latestPlan?.perimeterDirection,
    length: latestPlan?.perimeterLength,
    gateIndex: latestPlan?.perimeterGateIndex,
    wallBlocks,
    gatePassable,
    prebuildPreviewOk: true,
    prebuildPreview: prebuildPreview.preview,
    prebuildResourcesUnchanged,
    prebuildBuildingCountUnchanged,
    prebuildPlanCountUnchanged,
    placementPreview: latestPlan?.placementPreview,
    recentEvents: state.events.slice(-10).map((event) => `${event.type}:${event.body}`)
  };
}

function forceCornerPerimeterForTest(): {
  ok: boolean;
  buildingIds?: string[];
  wallCount?: number;
  gateCount?: number;
  planCount?: number;
  groupId?: string;
  pattern?: PerimeterPattern;
  direction?: PerimeterDirection;
  length?: number;
  gateIndex?: number;
  nonCollinear?: boolean;
  wallBlocks?: boolean;
  gatePassable?: boolean;
  prebuildPreviewOk?: boolean;
  prebuildPreview?: unknown;
  prebuildPreviewReason?: string;
  prebuildResourcesUnchanged?: boolean;
  prebuildBuildingCountUnchanged?: boolean;
  prebuildPlanCountUnchanged?: boolean;
  placementPreview?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 1200);
  for (const developmentId of ["masonry", "ironworking"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) {
      render();
      return { ok: false, reason: result.reason };
    }
  }

  const townHall = getTownHall(state, playerTribe);
  const target = {
    x: clamp(townHall.x + 25, 4, MAP_SIZE - 6),
    y: clamp(townHall.y + 8, 4, MAP_SIZE - 6)
  };
  for (let y = target.y - 1; y <= target.y + 3; y += 1) {
    for (let x = target.x - 1; x <= target.x + 4; x += 1) {
      const tile = state.map[tileIndex(x, y)];
      tile.terrain = "grass";
      delete tile.resource;
    }
  }

  const buildOrder: AiStrategicOrder = {
    type: "BUILD",
    priority: 1,
    buildingType: "wall",
    targetX: target.x,
    targetY: target.y,
    perimeterPattern: "gate_corner",
    perimeterDirection: "east_west",
    perimeterLength: 5,
    perimeterGateIndex: 3,
    fortificationIntent: "browser smoke bent customs wall",
    perimeterShape: "L-shaped corner wall with the bend gate at the road elbow",
    perimeterStrategy: "Use a bend to watch two approaches while preserving one controlled passage.",
    reason: "Browser smoke corner perimeter test."
  };
  const resourcesBeforePreview = { ...tribe.resources };
  const buildingCountBeforePreview = Object.keys(state.buildings).length;
  const planCountBeforePreview = state.fortificationPlans.length;
  const prebuildPreview = previewFortificationBuild(state, playerTribe, buildOrder);
  const prebuildResourcesUnchanged = resourceTypes.every((type) => tribe.resources[type] === resourcesBeforePreview[type]);
  const prebuildBuildingCountUnchanged = Object.keys(state.buildings).length === buildingCountBeforePreview;
  const prebuildPlanCountUnchanged = state.fortificationPlans.length === planCountBeforePreview;
  if (!prebuildPreview.ok || !prebuildResourcesUnchanged || !prebuildBuildingCountUnchanged || !prebuildPlanCountUnchanged) {
    render();
    return {
      ok: false,
      prebuildPreviewOk: prebuildPreview.ok,
      prebuildPreview: prebuildPreview.ok ? prebuildPreview.preview : undefined,
      prebuildPreviewReason: prebuildPreview.ok ? undefined : prebuildPreview.reason,
      prebuildResourcesUnchanged,
      prebuildBuildingCountUnchanged,
      prebuildPlanCountUnchanged,
      reason: prebuildPreview.ok ? "pre-build preview mutated state" : prebuildPreview.reason
    };
  }

  const beforeIds = new Set(Object.keys(state.buildings));
  const result = issueSovereignOrder(state, playerTribe, buildOrder);
  if (!result.ok) {
    render();
    return { ok: false, reason: result.reason };
  }

  const built = Object.values(state.buildings).filter((building) => !beforeIds.has(building.id));
  const walls = built.filter((building) => building.type === "wall");
  const gates = built.filter((building) => building.type === "gate");
  const latestPlan = state.fortificationPlans.at(-1);
  const groupId = latestPlan?.perimeterGroupId;
  const perimeterPlans = groupId ? state.fortificationPlans.filter((plan) => plan.perimeterGroupId === groupId) : [];
  const selected = gates[0] ?? built[0];
  if (selected) selectAndShowBuilding(selected);
  else render({ forceHud: true, forceLabels: true, forceFog: true });

  const wallBlocks = walls.length > 0 && walls.every((wall) => !isTileWalkable(state, wall.x, wall.y, playerTribe));
  const gatePassable = gates.length > 0 && gates.every((gate) => isTileWalkable(state, gate.x, gate.y, playerTribe));
  const nonCollinear = new Set(built.map((building) => building.x)).size > 1 && new Set(built.map((building) => building.y)).size > 1;
  return {
    ok: built.length === 5 && walls.length === 4 && gates.length === 1 && perimeterPlans.length === 5 && wallBlocks && gatePassable && nonCollinear,
    buildingIds: built.map((building) => building.id),
    wallCount: walls.length,
    gateCount: gates.length,
    planCount: perimeterPlans.length,
    groupId,
    pattern: latestPlan?.perimeterPattern,
    direction: latestPlan?.perimeterDirection,
    length: latestPlan?.perimeterLength,
    gateIndex: latestPlan?.perimeterGateIndex,
    nonCollinear,
    wallBlocks,
    gatePassable,
    prebuildPreviewOk: true,
    prebuildPreview: prebuildPreview.preview,
    prebuildResourcesUnchanged,
    prebuildBuildingCountUnchanged,
    prebuildPlanCountUnchanged,
    placementPreview: latestPlan?.placementPreview,
    recentEvents: state.events.slice(-10).map((event) => `${event.type}:${event.body}`)
  };
}

function forceTowerPerimeterForTest(): {
  ok: boolean;
  buildingIds?: string[];
  turretCount?: number;
  watchtowerCount?: number;
  planCount?: number;
  turretGroupId?: string;
  watchtowerGroupId?: string;
  turretPreview?: unknown;
  watchtowerPreview?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 1800);
  for (const developmentId of ["ironworking", "ballistics"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) {
      render();
      return { ok: false, reason: result.reason };
    }
  }

  const townHall = getTownHall(state, playerTribe);
  const turretTarget = {
    x: clamp(townHall.x + 22, 5, MAP_SIZE - 6),
    y: clamp(townHall.y + 12, 5, MAP_SIZE - 6)
  };
  const watchtowerTarget = {
    x: clamp(townHall.x + 22, 5, MAP_SIZE - 6),
    y: clamp(townHall.y + 16, 5, MAP_SIZE - 6)
  };
  for (const target of [turretTarget, watchtowerTarget]) {
    for (let y = target.y - 1; y <= target.y + 1; y += 1) {
      for (let x = target.x - 3; x <= target.x + 3; x += 1) {
        const tile = state.map[tileIndex(x, y)];
        tile.terrain = "grass";
        delete tile.resource;
      }
    }
  }

  const beforeIds = new Set(Object.keys(state.buildings));
  const turretResult = issueSovereignOrder(state, playerTribe, {
    type: "BUILD",
    priority: 1,
    buildingType: "turret",
    targetX: turretTarget.x,
    targetY: turretTarget.y,
    perimeterPattern: "line",
    perimeterDirection: "east_west",
    perimeterLength: 3,
    fortificationIntent: "browser smoke turret battery",
    perimeterShape: "three-turret line",
    perimeterStrategy: "Create three overlapping fields of fire along the road without blocking friendly movement.",
    reason: "Browser smoke turret perimeter test."
  });
  if (!turretResult.ok) {
    render();
    return { ok: false, reason: turretResult.reason };
  }
  const turretPlans = state.fortificationPlans.slice(-3);
  const turretGroupId = turretPlans.at(-1)?.perimeterGroupId;

  const watchtowerResult = issueSovereignOrder(state, playerTribe, {
    type: "BUILD",
    priority: 1,
    buildingType: "watchtower",
    targetX: watchtowerTarget.x,
    targetY: watchtowerTarget.y,
    perimeterPattern: "line",
    perimeterDirection: "east_west",
    perimeterLength: 3,
    fortificationIntent: "browser smoke lookout chain",
    perimeterShape: "three-watchtower line",
    perimeterStrategy: "Extend sight along the same frontier without creating a movement barrier.",
    reason: "Browser smoke watchtower perimeter test."
  });
  if (!watchtowerResult.ok) {
    render();
    return { ok: false, reason: watchtowerResult.reason };
  }

  const newBuildings = Object.values(state.buildings).filter((building) => !beforeIds.has(building.id));
  const turretBuildings = newBuildings.filter((building) => building.type === "turret");
  const watchtowerBuildings = newBuildings.filter((building) => building.type === "watchtower");
  const watchtowerPlans = state.fortificationPlans.slice(-3);
  const watchtowerGroupId = watchtowerPlans.at(-1)?.perimeterGroupId;
  const planCount = state.fortificationPlans.filter((plan) => plan.perimeterGroupId === turretGroupId || plan.perimeterGroupId === watchtowerGroupId).length;
  const selected = turretBuildings[0] ?? watchtowerBuildings[0];
  if (selected) selectAndShowBuilding(selected);
  else render({ forceHud: true, forceLabels: true, forceFog: true });

  return {
    ok:
      turretBuildings.length === 3 &&
      watchtowerBuildings.length === 3 &&
      planCount === 6 &&
      turretPlans.every((plan) => plan.buildingType === "turret" && plan.perimeterPattern === "line") &&
      watchtowerPlans.every((plan) => plan.buildingType === "watchtower" && plan.perimeterPattern === "line"),
    buildingIds: newBuildings.map((building) => building.id),
    turretCount: turretBuildings.length,
    watchtowerCount: watchtowerBuildings.length,
    planCount,
    turretGroupId,
    watchtowerGroupId,
    turretPreview: turretPlans[0]?.placementPreview,
    watchtowerPreview: watchtowerPlans[0]?.placementPreview,
    recentEvents: state.events.slice(-16).map((event) => `${event.type}:${event.body}`)
  };
}

function findFortificationForDamageTest(): Building | undefined {
  return Object.values(state.buildings)
    .filter((candidate) => candidate.tribeId === playerTribe && candidate.hp > 0 && (candidate.type === "wall" || candidate.type === "gate" || candidate.type === "turret"))
    .sort((left, right) => left.id.localeCompare(right.id))[0];
}

function ensureFortificationForDamageTest(): { ok: true; building: Building } | { ok: false; reason: string } {
  let building = findFortificationForDamageTest();
  if (building) return { ok: true, building };
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 500);
  if (!tribe.developments.includes("masonry")) tribe.developments.push("masonry");
  const built = buildStructure(state, playerTribe, "wall", getTownHall(state, playerTribe));
  if (!built.ok) return { ok: false, reason: built.reason };
  building = state.buildings[built.buildingId];
  return { ok: true, building };
}

function selectAndShowBuilding(building: Building): void {
  selectedBuildingId = building.id;
  selectedUnitId = undefined;
  centerCamera(building);
  fogDirty = true;
  render({ forceHud: true, forceLabels: true, forceFog: true, forceTooltip: true });
}

function forceDamageBuildingForTest(): {
  ok: boolean;
  targetBuildingId?: string;
  buildingType?: Building["type"];
  beforeHp?: number;
  afterHp?: number;
  damageState?: DurabilityCondition;
  repairState?: RepairState;
  healthPct?: number;
  selectedPanel?: string;
  reason?: string;
} {
  const ensured = ensureFortificationForDamageTest();
  if (!ensured.ok) {
    render();
    return { ok: false, reason: ensured.reason };
  }
  const building = ensured.building;
  if (building.hp < building.maxHp * 0.7) building.hp = building.maxHp;
  const beforeHp = Math.ceil(building.hp);
  const targetHp = Math.max(1, Math.min(building.maxHp - 1, Math.floor(building.maxHp * 0.45)));
  const damageAmount = Math.max(1, beforeHp - targetHp + building.armor);
  const damaged = damageBuilding(state, building.id, damageAmount, "red");
  const damagedBuilding = state.buildings[building.id];
  if (!damaged.ok || !damagedBuilding || damaged.destroyed) {
    render();
    return { ok: false, targetBuildingId: building.id, buildingType: building.type, beforeHp, reason: damaged.ok ? "damage test unexpectedly destroyed the building" : damaged.reason };
  }
  selectAndShowBuilding(damagedBuilding);
  const durability = buildingDurabilitySnapshot(state, damagedBuilding);
  return {
    ok: durability.damageState !== "intact" && durability.damageState !== "destroyed",
    targetBuildingId: damagedBuilding.id,
    buildingType: damagedBuilding.type,
    beforeHp,
    afterHp: durability.hp,
    damageState: durability.damageState,
    repairState: durability.repairState,
    healthPct: durability.healthPct,
    selectedPanel: selectedPanel.textContent ?? ""
  };
}

function forceSiegeForTest(buildingType: "wall" | "gate" | "turret" = "wall"): {
  ok: boolean;
  targetBuildingId?: string;
  buildingType?: "wall" | "gate" | "turret";
  destroyed?: boolean;
  beforeHp?: number;
  afterHp?: number | null;
  beforeWalkable?: boolean;
  afterWalkable?: boolean;
  attackerTasks?: string[];
  recentEvents?: string[];
  reason?: string;
} {
  if (buildingType !== "wall" && buildingType !== "gate" && buildingType !== "turret") return { ok: false, reason: "invalid siege target type" };
  const targetBuildingId = `test_siege_${buildingType}`;
  const stats = getBuildingTypeCombatStats(buildingType);
  const target = { x: 50, y: buildingType === "wall" ? 50 : buildingType === "gate" ? 54 : 58 };
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
    type: buildingType,
    tribeId: "red",
    x: target.x,
    y: target.y,
    hp: 2,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  if (buildingType === "gate") {
    state.buildings[targetBuildingId].gateState = "locked";
    state.buildings[targetBuildingId].gateAccessPolicy = "owner_only";
  }
  for (const pos of [
    { x: target.x - 1, y: target.y },
    { x: target.x, y: target.y },
    { x: target.x - 2, y: target.y },
    { x: target.x - 2, y: target.y + 1 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  const attackers = Object.values(state.units).filter((unit) => unit.tribeId === playerTribe && unit.type === "militia" && unit.hp > 0);
  if (attackers.length === 0) return { ok: false, targetBuildingId, buildingType, reason: "no blue militia available" };
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = target.x - 2;
    attacker.y = target.y + index;
    attacker.attackCooldown = 0;
    attacker.task = { kind: "idle" };
  }
  const beforeWalkable = isTileWalkable(state, target.x, target.y, playerTribe);
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId,
    reason: `Browser smoke siege test: breach a specific hostile ${buildingType}.`
  });
  if (!result.ok) {
    render();
    return { ok: false, targetBuildingId, buildingType, beforeWalkable, reason: result.reason };
  }
  const attackerTasks = attackers.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(60, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const remaining = state.buildings[targetBuildingId];
  const afterWalkable = isTileWalkable(state, target.x, target.y, playerTribe);
  return {
    ok: !remaining,
    targetBuildingId,
    buildingType,
    destroyed: !remaining,
    beforeHp: 2,
    afterHp: remaining?.hp ?? null,
    beforeWalkable,
    afterWalkable,
    attackerTasks,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceMultiTargetSiegeForTest(): {
  ok: boolean;
  targetBuildingIds?: string[];
  assignedTargets?: string[];
  guardRoles?: Array<{ unitId: string; role: "cover" | "escort"; task: string }>;
  destroyedTargets?: string[];
  attackerTasksBefore?: string[];
  attackerTasksAfter?: string[];
  siegePlan?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 800);
  const targetBuildingIds = ["test_multi_siege_wall_a", "test_multi_siege_wall_b"];
  const targetPositions = [
    { id: targetBuildingIds[0], x: 62, y: 50, hp: 2 },
    { id: targetBuildingIds[1], x: 62, y: 52, hp: 120 }
  ];
  const stats = getBuildingTypeCombatStats("wall");
  for (const target of targetPositions) {
    state.buildings[target.id] = {
      id: target.id,
      type: "wall",
      tribeId: "red",
      x: target.x,
      y: target.y,
      hp: target.hp,
      maxHp: stats.maxHp,
      armor: 0,
      attack: 0,
      range: 0,
      attackCooldown: 0
    };
    for (const pos of [
      { x: target.x - 2, y: target.y },
      { x: target.x - 1, y: target.y },
      { x: target.x, y: target.y },
      { x: target.x - 2, y: target.y + 1 }
    ]) {
      state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
      delete state.map[tileIndex(pos.x, pos.y)].resource;
    }
  }
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.hp > 0 && unit.type === "militia")
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, 4);
  while (attackers.length < 4) {
    const trained = trainUnit(state, playerTribe, "militia");
    if (!trained.ok) return { ok: false, targetBuildingIds, reason: trained.reason };
    const unit = state.units[trained.unitId];
    if (unit) attackers.push(unit);
  }
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = targetPositions[0].x - 2;
    attacker.y = targetPositions[0].y + index;
    attacker.hp = attacker.maxHp;
    attacker.attackCooldown = 0;
    attacker.task = { kind: "idle" };
  }
  const coverUnit = attackers[0];
  const escortUnit = attackers[1];
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    recipientTribeId: "red",
    targetBuildingIds,
    coverUnitIds: [coverUnit.id],
    escortUnitIds: [escortUnit.id],
    coverX: targetPositions[0].x - 1,
    coverY: targetPositions[0].y,
    coverRadius: 4,
    coverPlan: "screen hostile defenders near the first breach point",
    escortX: targetPositions[1].x - 1,
    escortY: targetPositions[1].y,
    escortRadius: 5,
    escortPlan: "escort the second breach group and intercept nearby defenders",
    siegeIntent: "browser smoke multi-target siege group",
    assaultPlan: "Split attackers across both named walls, then keep pressure on the surviving target.",
    reason: "Browser smoke multi-target siege test."
  });
  if (!result.ok) {
    render();
    return { ok: false, targetBuildingIds, reason: result.reason };
  }
  const siegePlan = state.siegePlans.at(-1);
  const assigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
  const assignedTargets = assigned.flatMap((unit) => (unit.task.kind === "attackBuilding" ? [unit.task.targetBuildingId] : []));
  const guards = Object.values(state.units).filter((unit) => unit.task.kind === "guardSiege" && unit.task.siegePlanId === siegePlan?.id);
  const guardRoles = guards.flatMap((unit) =>
    unit.task.kind === "guardSiege" ? [{ unitId: unit.id, role: unit.task.guardRole, task: describeUnitTask(state, unit) }] : []
  );
  const attackerTasksBefore = assigned.map((unit) => describeUnitTask(state, unit));
  const orderEvents = state.events.slice(-12).map((event) => `${event.type}:${event.body}`);
  advanceSimulationTicks(220, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const attackerTasksAfter = assigned.map((unit) => describeUnitTask(state, unit));
  const destroyedTargets = targetBuildingIds.filter((id) => !state.buildings[id]);
  const recentEvents = [...orderEvents, ...state.events.slice(-36).map((event) => `${event.type}:${event.body}`)];
  return {
    ok:
      destroyedTargets.length === targetBuildingIds.length &&
      targetBuildingIds.every((id) => assignedTargets.includes(id)) &&
      guardRoles.some((role) => role.role === "cover" && role.unitId === coverUnit.id) &&
      guardRoles.some((role) => role.role === "escort" && role.unitId === escortUnit.id) &&
      recentEvents.some((event) => event.includes("SIEGE_GROUP_RETARGETED") && event.includes(targetBuildingIds[1])),
    targetBuildingIds,
    assignedTargets,
    guardRoles,
    destroyedTargets,
    attackerTasksBefore,
    attackerTasksAfter,
    siegePlan,
    recentEvents
  };
}

function forceSiegeEngineForTest(): {
  ok: boolean;
  unitId?: string;
  unitType?: UnitType;
  targetBuildingId?: string;
  breachEstimateBefore?: number | null;
  destroyed?: boolean;
  attackerTasks?: string[];
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 900);
  for (const developmentId of ["ironworking", "public_works", "siege_engineering"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) return { ok: false, reason: result.reason };
  }
  const trained = trainUnit(state, playerTribe, "siege_engine");
  if (!trained.ok) return { ok: false, reason: trained.reason };
  const siegeEngine = state.units[trained.unitId];
  const targetBuildingId = "test_siege_engine_wall";
  const stats = getBuildingTypeCombatStats("wall");
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
    type: "wall",
    tribeId: "red",
    x: 52,
    y: 50,
    hp: 90,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  for (const pos of [
    { x: 49, y: 50 },
    { x: 50, y: 50 },
    { x: 51, y: 50 },
    { x: 52, y: 50 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  siegeEngine.x = 49;
  siegeEngine.y = 50;
  siegeEngine.attackCooldown = 0;
  siegeEngine.task = { kind: "idle" };
  const breachEstimateBefore = estimateBreachTicks(state, playerTribe, targetBuildingId) ?? null;
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId,
    reason: "Browser smoke siege-engine test: use a trained siege engine against a hostile wall."
  });
  if (!result.ok) {
    render();
    return { ok: false, unitId: siegeEngine.id, unitType: siegeEngine.type, targetBuildingId, breachEstimateBefore, reason: result.reason };
  }
  const attackers = Object.values(state.units).filter((unit) => unit.tribeId === playerTribe && unit.task.kind === "attackBuilding");
  const attackerTasks = attackers.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(100, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const remaining = state.buildings[targetBuildingId];
  return {
    ok: !remaining && breachEstimateBefore !== null,
    unitId: siegeEngine.id,
    unitType: siegeEngine.type,
    targetBuildingId,
    breachEstimateBefore,
    destroyed: !remaining,
    attackerTasks,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceArtilleryForTest(): {
  ok: boolean;
  unitId?: string;
  unitType?: UnitType;
  targetBuildingId?: string;
  projectileSeen?: boolean;
  impactSeen?: boolean;
  destroyed?: boolean;
  projectileSnapshots?: Array<{
    id: string;
    projectileType: string;
    targetKind: "building" | "unit";
    x: number;
    y: number;
    targetBuildingId?: string;
    targetUnitId?: string;
    impactTick: number;
    hp: number;
    maxHp: number;
    armor: number;
    attack: number;
    range: number;
    attackCooldown: number;
  }>;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 1200);
  for (const developmentId of ["ironworking", "public_works", "ballistics", "siege_engineering"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) return { ok: false, reason: result.reason };
  }
  const trained = trainUnit(state, playerTribe, "catapult");
  if (!trained.ok) return { ok: false, reason: trained.reason };
  const catapult = state.units[trained.unitId];
  const targetBuildingId = "test_artillery_wall";
  const stats = getBuildingTypeCombatStats("wall");
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
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
    { x: 47, y: 50 },
    { x: 52, y: 50 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  catapult.x = 45;
  catapult.y = 50;
  catapult.attackCooldown = 0;
  catapult.task = { kind: "idle" };
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId,
    siegeIntent: "bombard the hostile wall from range",
    assaultPlan: "Keep the catapult outside the wall and let projectile impacts open the breach.",
    retreatCondition: "Withdraw the machine if defenders close the distance.",
    reason: "Browser smoke artillery test: use a trained catapult to fire projectiles at a hostile wall."
  });
  if (!result.ok) {
    render();
    return { ok: false, unitId: catapult.id, unitType: catapult.type, targetBuildingId, reason: result.reason };
  }
  advanceSimulationTicks(1, { scheduleAi: false, render: false });
  const projectileSnapshots = Object.values(state.projectiles).map(projectileSnapshotForTest);
  const projectileSeen = projectileSnapshots.length > 0;
  advanceSimulationTicks(120, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const recentEvents = state.events.slice(-16).map((event) => `${event.type}:${event.body}`);
  const impactSeen = recentEvents.some((event) => event.includes("SIEGE_PROJECTILE_IMPACT") && event.includes(targetBuildingId));
  const remaining = state.buildings[targetBuildingId];
  return {
    ok: projectileSeen && impactSeen && !remaining,
    unitId: catapult.id,
    unitType: catapult.type,
    targetBuildingId,
    projectileSeen,
    impactSeen,
    destroyed: !remaining,
    projectileSnapshots,
    recentEvents
  };
}

function projectileSnapshotForTest(projectile: SiegeProjectile) {
  return {
    id: projectile.id,
    projectileType: projectile.projectileType,
    targetKind: projectile.targetKind,
    x: Number(projectile.x.toFixed(2)),
    y: Number(projectile.y.toFixed(2)),
    targetBuildingId: projectile.targetBuildingId,
    targetUnitId: projectile.targetUnitId,
    impactTick: projectile.impactTick,
    hp: projectile.hp,
    maxHp: projectile.maxHp,
    armor: projectile.armor,
    attack: projectile.attack,
    range: projectile.range,
    attackCooldown: projectile.attackCooldown
  };
}

function forceProjectileVisualForTest(): {
  ok: boolean;
  unitId?: string;
  unitType?: UnitType;
  targetBuildingId?: string;
  projectileSeen?: boolean;
  projectileSnapshots?: ReturnType<typeof projectileSnapshotForTest>[];
  visibleProjectiles?: unknown[];
  recentCombatEvents?: unknown[];
  combatOverlay?: unknown;
  spriteVisuals?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 1200);
  for (const developmentId of ["ironworking", "public_works", "ballistics", "siege_engineering"] as const) {
    const result = chooseDevelopment(state, playerTribe, developmentId);
    if (!result.ok && !tribe.developments.includes(developmentId)) return { ok: false, reason: result.reason };
  }
  const trained = trainUnit(state, playerTribe, "catapult");
  if (!trained.ok) return { ok: false, reason: trained.reason };
  const catapult = Object.values(state.units).find((unit) => unit.id === trained.unitId);
  if (!catapult) return { ok: false, reason: "trained catapult missing" };
  const targetBuildingId = "test_projectile_visual_wall";
  const stats = getBuildingTypeCombatStats("wall");
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
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
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId,
    siegeIntent: "show an in-flight stone shot clearly on the board.",
    assaultPlan: "Fire once and keep the projectile visible for observer QA.",
    reason: "Browser smoke projectile visual test."
  });
  if (!result.ok) {
    render();
    return { ok: false, unitId: catapult.id, unitType: catapult.type, targetBuildingId, reason: result.reason };
  }
  advanceSimulationTicks(7, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const projectileSnapshots = Object.values(state.projectiles).map(projectileSnapshotForTest);
  const parsed = JSON.parse(renderGameToText());
  return {
    ok: projectileSnapshots.some((projectile) => projectile.targetBuildingId === targetBuildingId),
    unitId: catapult.id,
    unitType: catapult.type,
    targetBuildingId,
    projectileSeen: projectileSnapshots.length > 0,
    projectileSnapshots,
    visibleProjectiles: parsed.visibleProjectiles,
    recentCombatEvents: parsed.recentCombatEvents,
    combatOverlay: parsed.boardReadability?.combatOverlay,
    spriteVisuals: parsed.boardReadability?.spriteVisuals,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceRangedProjectilesForTest(): {
  ok: boolean;
  archerId?: string;
  turretId?: string;
  arrowTargetUnitId?: string;
  boltTargetUnitId?: string;
  arrowProjectile?: ReturnType<typeof projectileSnapshotForTest>;
  turretBoltProjectile?: ReturnType<typeof projectileSnapshotForTest>;
  projectileSnapshots?: ReturnType<typeof projectileSnapshotForTest>[];
  visibleProjectiles?: unknown[];
  recentCombatEvents?: unknown[];
  combatOverlay?: unknown;
  spriteVisuals?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  state.wars.blue.red = true;
  state.wars.red.blue = true;
  for (const pos of [
    { x: 40, y: 53 },
    { x: 43, y: 53 },
    { x: 50, y: 55 },
    { x: 56, y: 55 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  const archerStats = getUnitTypeCombatStats("archer");
  const militiaStats = getUnitTypeCombatStats("militia");
  const turretStats = getBuildingTypeCombatStats("turret");
  const archer: Unit = {
    id: "test_ranged_arrow_archer",
    name: "Arrow Visual Archer",
    type: "archer",
    tribeId: playerTribe,
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
  const arrowTarget: Unit = {
    id: "test_ranged_arrow_target",
    name: "Arrow Target Militia",
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
  const boltTarget: Unit = {
    ...arrowTarget,
    id: "test_ranged_bolt_target",
    name: "Bolt Target Militia",
    x: 56,
    y: 55,
    hp: militiaStats.hp,
    maxHp: militiaStats.maxHp,
    task: { kind: "idle" }
  };
  const turret: Building = {
    id: "test_ranged_turret",
    type: "turret",
    tribeId: playerTribe,
    x: 50,
    y: 55,
    hp: turretStats.maxHp,
    maxHp: turretStats.maxHp,
    armor: turretStats.armor,
    attack: turretStats.attack,
    range: turretStats.range,
    attackCooldown: 0
  };
  state.units[archer.id] = archer;
  state.units[arrowTarget.id] = arrowTarget;
  state.units[boltTarget.id] = boltTarget;
  state.buildings[turret.id] = turret;
  advanceSimulationTicks(1, { scheduleAi: false, render: false });
  archer.attack = 0;
  turret.attackCooldown = TICKS_PER_GAME_YEAR;
  selectAndShowBuilding(turret);
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const projectileSnapshots = Object.values(state.projectiles).map(projectileSnapshotForTest);
  const arrowProjectile = projectileSnapshots.find((projectile) => projectile.projectileType === "arrow" && projectile.targetUnitId === arrowTarget.id);
  const turretBoltProjectile = projectileSnapshots.find((projectile) => projectile.projectileType === "turret_bolt" && projectile.targetUnitId === boltTarget.id);
  const parsed = JSON.parse(renderGameToText());
  archer.hp = 0;
  arrowTarget.hp = 0;
  boltTarget.hp = 0;
  turret.hp = 0;
  return {
    ok: Boolean(arrowProjectile && turretBoltProjectile),
    archerId: archer.id,
    turretId: turret.id,
    arrowTargetUnitId: arrowTarget.id,
    boltTargetUnitId: boltTarget.id,
    arrowProjectile,
    turretBoltProjectile,
    projectileSnapshots,
    visibleProjectiles: parsed.visibleProjectiles,
    recentCombatEvents: parsed.recentCombatEvents,
    combatOverlay: parsed.boardReadability?.combatOverlay,
    spriteVisuals: parsed.boardReadability?.spriteVisuals,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceRetreatForTest(): {
  ok: boolean;
  targetBuildingId?: string;
  retreatTarget?: Position;
  retreatedUnits?: string[];
  attackTasksBefore?: string[];
  moveTasksAfter?: string[];
  siegePlan?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 600);
  const targetBuildingId = "test_retreat_wall";
  const stats = getBuildingTypeCombatStats("wall");
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
    type: "wall",
    tribeId: "red",
    x: 54,
    y: 54,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  for (const pos of [
    { x: 48, y: 53 },
    { x: 48, y: 54 },
    { x: 48, y: 55 },
    { x: 49, y: 54 },
    { x: 54, y: 54 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  if (!Object.values(state.units).some((unit) => unit.tribeId === playerTribe && unit.hp > 0 && isSiegeCapableUnitTypeForSmoke(unit.type))) {
    const trained = trainUnit(state, playerTribe, "militia");
    if (!trained.ok) return { ok: false, targetBuildingId, reason: trained.reason };
  }
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.hp > 0 && isSiegeCapableUnitTypeForSmoke(unit.type))
    .sort((left, right) => siegeSmokePriority(right.type) - siegeSmokePriority(left.type) || left.id.localeCompare(right.id))
    .slice(0, 5);
  if (attackers.length === 0) return { ok: false, targetBuildingId, reason: "no field attackers available" };
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = 48;
    attacker.y = 53 + index;
    attacker.hp = Math.max(1, Math.floor(attacker.maxHp * 0.35));
    attacker.task = { kind: "idle" };
  }
  const retreatTarget = { x: 42, y: 52 };
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId,
    siegeIntent: "test a controlled withdrawal instead of sacrificing damaged attackers",
    assaultPlan: "Probe the wall and pull back wounded units to the west rally point.",
    retreatCondition: "Any unit below half health should withdraw rather than continue the breach.",
    retreatHealthPct: 50,
    retreatX: retreatTarget.x,
    retreatY: retreatTarget.y,
    reason: "Browser smoke retreat-trigger test."
  });
  if (!result.ok) {
    render();
    return { ok: false, targetBuildingId, retreatTarget, reason: result.reason };
  }
  const attackTasksBefore = attackers.map((unit) => describeUnitTask(state, unit));
  const siegePlan = state.siegePlans.at(-1);
  advanceSimulationTicks(1, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const moveTasksAfter = attackers.map((unit) => describeUnitTask(state, unit));
  const retreatedUnits = attackers
    .filter((unit) => unit.task.kind === "move" && unit.task.target.x === retreatTarget.x && unit.task.target.y === retreatTarget.y)
    .map((unit) => unit.id);
  return {
    ok: retreatedUnits.length > 0 && retreatedUnits.length === attackers.length,
    targetBuildingId,
    retreatTarget,
    retreatedUnits,
    attackTasksBefore,
    moveTasksAfter,
    siegePlan,
    recentEvents: state.events.slice(-10).map((event) => `${event.type}:${event.body}`)
  };
}

function forceCoordinatedFeintForTest(): {
  ok: boolean;
  coordinated?: {
    ok: boolean;
    targetBuildingId: string;
    assemblyTarget: Position;
    assembleTasksBefore: string[];
    attackTasksAfter: string[];
    siegePlan?: unknown;
    recentEvents: string[];
  };
  wave?: {
    ok: boolean;
    targetBuildingId: string;
    holdTarget: Position;
    waitingTasksBefore: string[];
    releaseTasksAfter: string[];
    siegePlan?: unknown;
    recentEvents: string[];
  };
  feint?: {
    ok: boolean;
    targetBuildingId: string;
    retreatTarget: Position;
    attackTasksBefore: string[];
    moveTasksAfter: string[];
    siegePlan?: unknown;
    recentEvents: string[];
  };
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 800);
  const attackers = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.hp > 0 && isSiegeCapableUnitTypeForSmoke(unit.type))
    .sort((left, right) => siegeSmokePriority(right.type) - siegeSmokePriority(left.type) || left.id.localeCompare(right.id))
    .slice(0, 5);
  if (attackers.length === 0) {
    const trained = trainUnit(state, playerTribe, "militia");
    if (!trained.ok) return { ok: false, reason: trained.reason };
    const militia = state.units[trained.unitId];
    if (militia) attackers.push(militia);
  }
  if (attackers.length === 0) return { ok: false, reason: "no siege-capable attackers available" };

  const coordinatedTargetId = "test_coordinated_wall";
  const coordinatedStats = getBuildingTypeCombatStats("wall");
  state.buildings[coordinatedTargetId] = {
    id: coordinatedTargetId,
    type: "wall",
    tribeId: "red",
    x: 55,
    y: 56,
    hp: coordinatedStats.maxHp,
    maxHp: coordinatedStats.maxHp,
    armor: coordinatedStats.armor,
    attack: coordinatedStats.attack,
    range: coordinatedStats.range,
    attackCooldown: 0
  };
  const assemblyTarget = { x: 48, y: 56 };
  for (const pos of [
    assemblyTarget,
    { x: 49, y: 56 },
    { x: 54, y: 56 },
    { x: 55, y: 56 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = 45;
    attacker.y = 54 + index;
    attacker.hp = attacker.maxHp;
    attacker.task = { kind: "idle" };
  }
  const coordinatedOrder = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId: coordinatedTargetId,
    siegeIntent: "browser smoke coordinated rally before breach",
    assaultPlan: "Assemble every assigned unit at the rally tile before the assault starts.",
    assaultMode: "coordinated",
    assemblyX: assemblyTarget.x,
    assemblyY: assemblyTarget.y,
    assaultDelayTicks: TICK_RATE * 5,
    reason: "Browser smoke coordinated-assault test."
  });
  if (!coordinatedOrder.ok) return { ok: false, reason: coordinatedOrder.reason };
  const coordinatedPlan = state.siegePlans.at(-1);
  const coordinatedAssigned = Object.values(state.units).filter(
    (unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === coordinatedPlan?.id
  );
  const assembleTasksBefore = coordinatedAssigned.map((unit) => describeUnitTask(state, unit));
  for (const unit of coordinatedAssigned) {
    unit.x = assemblyTarget.x;
    unit.y = assemblyTarget.y;
  }
  advanceSimulationTicks(1, { scheduleAi: false, render: false });
  const attackTasksAfter = coordinatedAssigned.map((unit) => describeUnitTask(state, unit));
  const coordinatedEvents = state.events.slice(-14).map((event) => `${event.type}:${event.body}`);
  const coordinated = {
    ok:
      coordinatedAssigned.length > 0 &&
      coordinatedAssigned.every((unit) => unit.task.kind === "attackBuilding" && unit.task.assaultPhase === "attacking") &&
      coordinatedPlan?.assaultStartedTick !== undefined &&
      coordinatedEvents.some((event) => event.includes("COORDINATED_ASSAULT_STARTED") && event.includes(coordinatedTargetId)),
    targetBuildingId: coordinatedTargetId,
    assemblyTarget,
    assembleTasksBefore,
    attackTasksAfter,
    siegePlan: coordinatedPlan,
    recentEvents: coordinatedEvents
  };

  const feintTargetId = "test_feint_wall";
  const feintStats = getBuildingTypeCombatStats("wall");
  state.buildings[feintTargetId] = {
    id: feintTargetId,
    type: "wall",
    tribeId: "red",
    x: 56,
    y: 60,
    hp: feintStats.maxHp,
    maxHp: feintStats.maxHp,
    armor: feintStats.armor,
    attack: feintStats.attack,
    range: feintStats.range,
    attackCooldown: 0
  };
  const retreatTarget = { x: 44, y: 60 };
  for (const pos of [
    { x: 50, y: 60 },
    { x: 55, y: 60 },
    { x: 56, y: 60 },
    retreatTarget
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = 50;
    attacker.y = 59 + index;
    attacker.hp = attacker.maxHp;
    attacker.task = { kind: "idle" };
  }
  const feintOrder = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId: feintTargetId,
    siegeIntent: "browser smoke feint withdrawal",
    assaultPlan: "Pressure the wall briefly and then pull every assigned unit back.",
    assaultMode: "feint",
    feintDurationTicks: 2,
    retreatX: retreatTarget.x,
    retreatY: retreatTarget.y,
    reason: "Browser smoke feint/probe test."
  });
  if (!feintOrder.ok) return { ok: false, coordinated, reason: feintOrder.reason };
  const feintPlan = state.siegePlans.at(-1);
  const feintAssigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === feintPlan?.id);
  const attackTasksBefore = feintAssigned.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(3, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const moveTasksAfter = feintAssigned.map((unit) => describeUnitTask(state, unit));
  const feintEvents = state.events.slice(-14).map((event) => `${event.type}:${event.body}`);
  const feint = {
    ok:
      feintAssigned.length > 0 &&
      feintAssigned.every((unit) => unit.task.kind === "move" && unit.task.target.x === retreatTarget.x && unit.task.target.y === retreatTarget.y) &&
      feintEvents.some((event) => event.includes("SIEGE_FEINT_WITHDRAWAL") && event.includes(`${retreatTarget.x},${retreatTarget.y}`)),
    targetBuildingId: feintTargetId,
    retreatTarget,
    attackTasksBefore,
    moveTasksAfter,
    siegePlan: feintPlan,
    recentEvents: feintEvents
  };
  const waveTargetId = "test_wave_wall";
  const waveStats = getBuildingTypeCombatStats("wall");
  state.buildings[waveTargetId] = {
    id: waveTargetId,
    type: "wall",
    tribeId: "red",
    x: 58,
    y: 58,
    hp: waveStats.maxHp,
    maxHp: waveStats.maxHp,
    armor: waveStats.armor,
    attack: waveStats.attack,
    range: waveStats.range,
    attackCooldown: 0
  };
  const holdTarget = { x: 50, y: 58 };
  for (const pos of [
    holdTarget,
    { x: 57, y: 58 },
    { x: 58, y: 58 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = 48;
    attacker.y = 58 + index;
    attacker.hp = attacker.maxHp;
    attacker.task = { kind: "idle" };
  }
  const waveOrder = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetBuildingId: waveTargetId,
    siegeIntent: "browser smoke staggered wave release",
    assaultPlan: "Hold the reserve wave, then release it after a short interval.",
    assaultMode: "direct",
    assemblyX: holdTarget.x,
    assemblyY: holdTarget.y,
    assaultWaveSize: 1,
    assaultWaveIntervalTicks: 3,
    reason: "Browser smoke siege-wave test."
  });
  if (!waveOrder.ok) return { ok: false, coordinated, feint, reason: waveOrder.reason };
  const wavePlan = state.siegePlans.at(-1);
  const waveAssigned = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === wavePlan?.id);
  const waitingTasksBefore = waveAssigned.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(4, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const releaseTasksAfter = waveAssigned.map((unit) => describeUnitTask(state, unit));
  const waveEvents = state.events.slice(-16).map((event) => `${event.type}:${event.body}`);
  const wave = {
    ok:
      waveAssigned.length >= 2 &&
      waitingTasksBefore.some((task) => task.includes("Holding wave 2")) &&
      releaseTasksAfter.some((task) => task.includes("Attacking wall test_wave_wall")) &&
      wavePlan?.releasedWaveIndexes?.includes(1) === true &&
      waveEvents.some((event) => event.includes("SIEGE_WAVE_RELEASED") && event.includes("Wave 2")),
    targetBuildingId: waveTargetId,
    holdTarget,
    waitingTasksBefore,
    releaseTasksAfter,
    siegePlan: wavePlan,
    recentEvents: waveEvents
  };
  return { ok: coordinated.ok && feint.ok && wave.ok, coordinated, feint, wave };
}

function isSiegeCapableUnitTypeForSmoke(type: UnitType): boolean {
  return type === "militia" || type === "archer" || type === "siege_engine" || type === "battering_ram" || type === "catapult";
}

function siegeSmokePriority(type: UnitType): number {
  if (type === "catapult") return 6;
  if (type === "battering_ram") return 5;
  if (type === "siege_engine") return 4;
  if (type === "archer") return 2;
  if (type === "militia") return 1;
  return 0;
}

function forceResourceRaidForTest(): {
  ok: boolean;
  target?: { x: number; y: number; type: ResourceType };
  beforeHp?: number;
  beforeAmount?: number;
  afterHp?: number | null;
  afterAmount?: number | null;
  destroyed?: boolean;
  beforePosture?: unknown;
  afterPosture?: unknown;
  resourceControlBefore?: unknown;
  resourceControlAfter?: unknown;
  resourceDenials?: unknown[];
  attackerTasks?: string[];
  recentEvents?: string[];
  reason?: string;
} {
  const target = { x: 49, y: 52 };
  const targetIndex = tileIndex(target.x, target.y);
  state.map[targetIndex] = { terrain: "hill", resource: createResourceDeposit("iron", 6) };
  const resource = state.map[targetIndex].resource;
  if (!resource) return { ok: false, target: { ...target, type: "iron" }, reason: "test resource was not created" };
  for (const pos of [
    target,
    { x: 48, y: 52 },
    { x: 48, y: 53 },
    { x: 49, y: 53 }
  ]) {
    if (pos.x === target.x && pos.y === target.y) continue;
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  const attackers = Object.values(state.units).filter((unit) => unit.tribeId === playerTribe && unit.type === "militia" && unit.hp > 0);
  if (attackers.length === 0) return { ok: false, target: { ...target, type: "iron" }, reason: "no blue militia available" };
  for (const [index, attacker] of attackers.entries()) {
    attacker.x = 48;
    attacker.y = 52 + index;
    attacker.task = { kind: "idle" };
  }
  advanceSimulationTicks(5, { scheduleAi: false, render: false, visual: false });
  const beforePosture = getVisibleResourceDepositIntel(state, playerTribe, 20).find((deposit) => deposit.x === target.x && deposit.y === target.y);
  const resourceControlBefore = getResourceControlSummary(state, playerTribe);
  const beforeHp = Math.ceil(resource.hp);
  const beforeAmount = Math.round(resource.amount);
  const result = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    targetX: target.x,
    targetY: target.y,
    targetResourceType: "iron",
    reason: "Browser smoke resource raid test: destroy a visible iron deposit."
  });
  if (!result.ok) {
    render();
    return { ok: false, target: { ...target, type: "iron" }, beforeHp, beforeAmount, reason: result.reason };
  }
  const attackerTasks = attackers.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(80, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const remaining = state.map[targetIndex].resource;
  const afterPosture = getVisibleResourceDepositIntel(state, playerTribe, 20).find((deposit) => deposit.x === target.x && deposit.y === target.y) ?? null;
  const resourceControlAfter = getResourceControlSummary(state, playerTribe);
  return {
    ok: !remaining,
    target: { ...target, type: "iron" },
    beforeHp,
    beforeAmount,
    afterHp: remaining ? Math.ceil(remaining.hp) : null,
    afterAmount: remaining ? Math.round(remaining.amount) : null,
    destroyed: !remaining,
    beforePosture,
    afterPosture,
    resourceControlBefore,
    resourceControlAfter,
    resourceDenials: state.resourceDenials.slice(-5),
    attackerTasks,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceResourceDepletionForTest(): {
  ok: boolean;
  target?: { x: number; y: number; type: ResourceType };
  beforeAmount?: number;
  afterAmount?: number | null;
  stockpileBefore?: number;
  stockpileAfter?: number;
  depleted?: boolean;
  resourceDepletions?: unknown[];
  recentEvents?: string[];
  workerTask?: string;
  reason?: string;
} {
  const townHall = getTownHall(state, playerTribe);
  const target = { x: townHall.x + 2, y: townHall.y };
  const targetIndex = tileIndex(target.x, target.y);
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const tile = state.map[tileIndex(x, y)];
      if (tile.resource?.type === "clay") delete tile.resource;
    }
  }
  state.map[targetIndex] = { terrain: "grass", resource: createResourceDeposit("clay", 3) };
  const worker = Object.values(state.units).find((unit) => unit.tribeId === playerTribe && unit.type === "peon" && unit.hp > 0);
  if (!worker) return { ok: false, target: { ...target, type: "clay" }, reason: "no peon available" };
  worker.x = target.x;
  worker.y = target.y;
  worker.task = { kind: "idle" };
  const beforeAmount = state.map[targetIndex].resource?.amount ?? 0;
  const stockpileBefore = state.tribes[playerTribe].resources.clay;
  const assigned = assignGathering(state, worker.id, "clay");
  if (!assigned.ok) {
    render();
    return { ok: false, target: { ...target, type: "clay" }, beforeAmount, stockpileBefore, reason: assigned.reason };
  }
  advanceSimulationTicks(80, { scheduleAi: false, render: false });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  const remaining = state.map[targetIndex].resource;
  const recentDepletions = getRecentResourceDepletions(state).slice(-5);
  const depletion = recentDepletions.find((record) => record.type === "clay" && record.x === target.x && record.y === target.y);
  const stockpileAfter = state.tribes[playerTribe].resources.clay;
  return {
    ok: !remaining && Boolean(depletion) && stockpileAfter >= stockpileBefore + beforeAmount,
    target: { ...target, type: "clay" },
    beforeAmount,
    afterAmount: remaining ? Math.round(remaining.amount) : null,
    stockpileBefore,
    stockpileAfter,
    depleted: !remaining,
    resourceDepletions: recentDepletions,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`),
    workerTask: describeUnitTask(state, worker)
  };
}

function forceCivilizationMergerForTest(): {
  ok: boolean;
  packetId?: string;
  messageId?: string;
  mergerRecordId?: string;
  leaderTribeId?: TribeId;
  mergedTribeId?: TribeId;
  mergedIntoTribeId?: TribeId | null;
  leaderPopulation?: number;
  mergedPopulation?: number;
  leaderResources?: Partial<Record<ResourceType, number>>;
  recentMergers?: unknown[];
  reason?: string;
} {
  const leaderTribeId: TribeId = "blue";
  const mergedTribeId: TribeId = "green";
  if (!isTribeActive(state, leaderTribeId) || !isTribeActive(state, mergedTribeId)) {
    return { ok: false, leaderTribeId, mergedTribeId, reason: "test tribes are not active separate civilizations" };
  }
  if (!Object.values(state.units).some((unit) => unit.tribeId === leaderTribeId && unit.type === "messenger" && unit.hp > 0 && unit.task.kind === "idle")) {
    state.tribes[leaderTribeId].resources.food = Math.max(state.tribes[leaderTribeId].resources.food, 80);
    state.tribes[leaderTribeId].resources.gold = Math.max(state.tribes[leaderTribeId].resources.gold, 40);
    state.tribes[leaderTribeId].populationCap = Math.max(state.tribes[leaderTribeId].populationCap, getPopulationCap(state, leaderTribeId) + 2);
    const trained = issueSovereignOrder(state, leaderTribeId, {
      type: "RECRUIT",
      priority: 1,
      unitType: "messenger",
      reason: "Browser smoke needs a real courier for a negotiated merger packet."
    });
    if (!trained.ok) {
      const courier = Object.values(state.units).find((unit) => unit.tribeId === leaderTribeId && unit.type === "messenger" && unit.hp > 0);
      if (!courier) return { ok: false, leaderTribeId, mergedTribeId, reason: trained.reason };
      courier.carriedPacketId = undefined;
      courier.task = { kind: "idle" };
    }
  }
  const beforePacketIds = new Set(Object.keys(state.packets));
  const terms = "Green keeps its homes and workers; Blue holds the single crown and takes survival responsibility for both peoples.";
  const order = issueSovereignOrder(state, leaderTribeId, {
    type: "SEND_MESSENGER",
    priority: 1,
    recipientTribeId: mergedTribeId,
    messageType: "MERGER_PROPOSAL",
    diplomacyIntent: "MERGER_OFFER",
    mergerLeaderTribeId: leaderTribeId,
    mergerTerms: terms,
    subject: "One crown survival compact",
    body: `Blue proposes one shared civilization under Blue leadership. Terms: ${terms}`,
    reason: "Browser smoke should prove merger requires an authored proposal and authored acceptance."
  });
  if (!order.ok) {
    render();
    return { ok: false, leaderTribeId, mergedTribeId, reason: order.reason };
  }
  const packet = Object.values(state.packets).find((candidate) => !beforePacketIds.has(candidate.id));
  if (!packet) {
    render();
    return { ok: false, leaderTribeId, mergedTribeId, reason: "proposal did not create a packet" };
  }
  let guard = 0;
  while (state.packets[packet.id]?.state !== "AWAITING_REPLY" && guard < 80) {
    advanceSimulationTicks(20, { scheduleAi: false, render: false });
    guard += 1;
  }
  const awaitingPacket = state.packets[packet.id];
  if (!awaitingPacket || awaitingPacket.state !== "AWAITING_REPLY") {
    render({ forceHud: true, forceLabels: true, forceFog: true });
    return { ok: false, packetId: packet.id, leaderTribeId, mergedTribeId, reason: `packet did not reach reply state: ${awaitingPacket?.state ?? "missing"}` };
  }
  const result = attachReplyToPacket(state, awaitingPacket.id, {
    subject: "Re: One crown survival compact",
    body: `Green accepts a merger under Blue as sole leader. Terms accepted: ${terms}`,
    diplomacyIntent: "MERGER_ACCEPT",
    mergerLeaderTribeId: leaderTribeId,
    mergerTerms: terms
  });
  render({ forceHud: true, forceLabels: true, forceFog: true });
  if (!result.ok) {
    return { ok: false, packetId: awaitingPacket.id, leaderTribeId, mergedTribeId, reason: result.reason };
  }
  const leaderPopulation = Object.values(state.units).filter((unit) => unit.tribeId === leaderTribeId && unit.hp > 0).length;
  const mergedPopulation = Object.values(state.units).filter((unit) => unit.tribeId === mergedTribeId && unit.hp > 0).length;
  return {
    ok: Boolean(result.mergerExecuted && result.mergerRecordId && state.tribes[mergedTribeId].mergedIntoTribeId === leaderTribeId && mergedPopulation === 0),
    packetId: awaitingPacket.id,
    messageId: result.messageId,
    mergerRecordId: result.mergerRecordId,
    leaderTribeId,
    mergedTribeId,
    mergedIntoTribeId: state.tribes[mergedTribeId].mergedIntoTribeId ?? null,
    leaderPopulation,
    mergedPopulation,
    leaderResources: Object.fromEntries(resourceTypes.map((type) => [type, Math.round(state.tribes[leaderTribeId].resources[type])])) as Partial<Record<ResourceType, number>>,
    recentMergers: state.civilizationMergers.slice(-5)
  };
}

function forceRepairForTest(): {
  ok: boolean;
  targetBuildingId?: string;
  beforeHp?: number;
  afterHp?: number | null;
  completed?: boolean;
  damagedSnapshot?: BuildingDurabilitySnapshot;
  repairQueuedSnapshot?: BuildingDurabilitySnapshot;
  repairedSnapshot?: BuildingDurabilitySnapshot;
  repairerTasks?: string[];
  recentEvents?: string[];
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 500);
  if (!tribe.developments.includes("masonry")) tribe.developments.push("masonry");
  let building =
    selectedBuildingId && state.buildings[selectedBuildingId]?.tribeId === playerTribe && state.buildings[selectedBuildingId].hp > 0
      ? state.buildings[selectedBuildingId]
      : findFortificationForDamageTest();
  if (!building) {
    const ensured = ensureFortificationForDamageTest();
    if (!ensured.ok) {
      render();
      return { ok: false, reason: ensured.reason };
    }
    building = ensured.building;
  }
  if (building.hp >= building.maxHp) {
    building.hp = Math.max(1, building.maxHp - 80);
  }
  selectAndShowBuilding(building);
  const damagedSnapshot = buildingDurabilitySnapshot(state, building);
  const repairCost = getTribeBuildingRepairCost(state, playerTribe, building);
  for (const type of resourceTypes) {
    const needed = repairCost[type] ?? 0;
    if (tribe.resources[type] < needed) tribe.resources[type] = needed;
  }
  const repairers = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.type === "peon" && unit.hp > 0)
    .slice(0, 2);
  if (repairers.length === 0) {
    render();
    return { ok: false, targetBuildingId: building.id, reason: "no blue peon available" };
  }
  for (const [index, peon] of repairers.entries()) {
    peon.x = building.x + 1;
    peon.y = building.y + index;
    peon.task = { kind: "idle" };
  }
  const beforeHp = Math.ceil(building.hp);
  const result = issueSovereignOrder(state, playerTribe, {
    type: "REPAIR",
    priority: 1,
    targetBuildingId: building.id,
    reason: "Browser smoke repair test: restore a damaged owned structure."
  });
  const repairQueuedSnapshot = buildingDurabilitySnapshot(state, building);
  if (!result.ok) {
    render();
    return { ok: false, targetBuildingId: building.id, beforeHp, damagedSnapshot, repairQueuedSnapshot, reason: result.reason };
  }
  const repairerTasks = repairers.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(80, { scheduleAi: false, render: false });
  const repaired = state.buildings[building.id];
  if (repaired) selectAndShowBuilding(repaired);
  else render({ forceHud: true, forceLabels: true, forceFog: true });
  const repairedSnapshot = repaired ? buildingDurabilitySnapshot(state, repaired) : undefined;
  return {
    ok: Boolean(repaired && repaired.hp > beforeHp),
    targetBuildingId: building.id,
    beforeHp,
    afterHp: repaired ? Math.ceil(repaired.hp) : null,
    completed: repaired ? repaired.hp >= repaired.maxHp : false,
    damagedSnapshot,
    repairQueuedSnapshot,
    repairedSnapshot,
    repairerTasks,
    recentEvents: state.events.slice(-24).map((event) => `${event.type}:${event.body}`)
  };
}

function forceRepairUnderFireForTest(): {
  ok: boolean;
  targetBuildingId?: string;
  beforeHp?: number;
  afterHp?: number | null;
  interrupted?: boolean;
  completed?: boolean;
  repairerTasks?: string[];
  interruptedEvents?: string[];
  selectedPanel?: string;
  reason?: string;
} {
  const tribe = state.tribes[playerTribe];
  for (const type of resourceTypes) tribe.resources[type] = Math.max(tribe.resources[type], 700);
  if (!tribe.developments.includes("masonry")) tribe.developments.push("masonry");
  const stats = getBuildingTypeCombatStats("wall");
  const targetBuildingId = "test_repair_fire_wall";
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
    type: "wall",
    tribeId: playerTribe,
    x: 39,
    y: 30,
    hp: stats.maxHp - 90,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  for (const pos of [
    { x: 38, y: 30 },
    { x: 38, y: 31 },
    { x: 39, y: 30 },
    { x: 40, y: 30 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  const repairers = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.type === "peon" && unit.hp > 0)
    .slice(0, 2);
  if (repairers.length === 0) return { ok: false, targetBuildingId, reason: "no blue peon available" };
  for (const [index, peon] of repairers.entries()) {
    peon.x = 38;
    peon.y = 30 + index;
    peon.task = { kind: "idle" };
  }
  const hostile = Object.values(state.units).find((unit) => unit.tribeId === "red" && unit.type === "militia" && unit.hp > 0);
  if (!hostile) return { ok: false, targetBuildingId, reason: "no red militia available" };
  hostile.x = 40;
  hostile.y = 30;
  hostile.task = { kind: "idle" };
  hostile.attackCooldown = 0;
  state.wars[playerTribe].red = true;
  state.wars.red[playerTribe] = true;
  const building = state.buildings[targetBuildingId];
  const beforeHp = Math.ceil(building.hp);
  const result = issueSovereignOrder(state, playerTribe, {
    type: "REPAIR",
    priority: 1,
    targetBuildingId,
    siegeIntent: "repair while the breach is under direct hostile pressure",
    repairPlan: "Send workers, but recognize that hostile militia must be cleared before safe repairs resume.",
    reason: "Browser smoke repair-under-fire test."
  });
  if (!result.ok) {
    render();
    return { ok: false, targetBuildingId, beforeHp, reason: result.reason };
  }
  const repairerTasks = repairers.map((unit) => describeUnitTask(state, unit));
  advanceSimulationTicks(6, { scheduleAi: false, render: false });
  const after = state.buildings[targetBuildingId];
  if (after) selectAndShowBuilding(after);
  else render({ forceHud: true, forceLabels: true, forceFog: true });
  const interruptedEvents = state.events
    .slice(-16)
    .filter((event) => event.type === "REPAIR_UNDER_FIRE_INTERRUPTED")
    .map((event) => `${event.type}:${event.body}`);
  const selectedPanel = document.querySelector("#selectedPanel")?.textContent ?? "";
  const completed = Boolean(after && after.hp >= after.maxHp);
  const interrupted = repairers.some((unit) => unit.task.kind === "repair" && unit.task.lastInterruptedTick !== undefined) || interruptedEvents.length > 0;
  return {
    ok: Boolean(after && interrupted && after.hp <= beforeHp && !completed),
    targetBuildingId,
    beforeHp,
    afterHp: after ? Math.ceil(after.hp) : null,
    interrupted,
    completed,
    repairerTasks,
    interruptedEvents,
    selectedPanel
  };
}

function forceRepairInterdictionForTest(): {
  ok: boolean;
  targetBuildingId?: string;
  repairerBeforeHp?: number;
  repairerAfterHp?: number;
  wallBeforeHp?: number;
  wallAfterHp?: number | null;
  attackTasks?: string[];
  repairerTasks?: string[];
  siegePlan?: unknown;
  recentEvents?: string[];
  reason?: string;
} {
  const redTribe = state.tribes.red;
  const blueTribe = state.tribes[playerTribe];
  for (const type of resourceTypes) {
    redTribe.resources[type] = Math.max(redTribe.resources[type], 700);
    blueTribe.resources[type] = Math.max(blueTribe.resources[type], 700);
  }
  if (!redTribe.developments.includes("masonry")) redTribe.developments.push("masonry");
  const stats = getBuildingTypeCombatStats("wall");
  const targetBuildingId = "test_repair_interdiction_wall";
  state.buildings[targetBuildingId] = {
    id: targetBuildingId,
    type: "wall",
    tribeId: "red",
    x: 42,
    y: 31,
    hp: stats.maxHp - 100,
    maxHp: stats.maxHp,
    armor: stats.armor,
    attack: stats.attack,
    range: stats.range,
    attackCooldown: 0
  };
  for (const pos of [
    { x: 40, y: 31 },
    { x: 41, y: 31 },
    { x: 41, y: 32 },
    { x: 42, y: 31 },
    { x: 42, y: 32 },
    { x: 43, y: 31 },
    { x: 43, y: 32 }
  ]) {
    state.map[tileIndex(pos.x, pos.y)].terrain = "grass";
    delete state.map[tileIndex(pos.x, pos.y)].resource;
  }
  const repairers = Object.values(state.units)
    .filter((unit) => unit.tribeId === "red" && unit.type === "peon" && unit.hp > 0)
    .slice(0, 2);
  if (repairers.length === 0) return { ok: false, targetBuildingId, reason: "no red peon available" };
  for (const [index, peon] of repairers.entries()) {
    peon.x = 42;
    peon.y = 32 + index * 0.2;
    peon.hp = peon.maxHp;
    peon.task = { kind: "idle" };
  }
  const repairResult = issueSovereignOrder(state, "red", {
    type: "REPAIR",
    priority: 1,
    targetBuildingId,
    repairPlan: "Keep workers on the breach unless Blue physically stops them.",
    reason: "Browser smoke contested repair target."
  });
  if (!repairResult.ok) {
    render();
    return { ok: false, targetBuildingId, reason: repairResult.reason };
  }
  let militia = Object.values(state.units)
    .filter((unit) => unit.tribeId === playerTribe && unit.type === "militia" && unit.hp > 0)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!militia) {
    const trained = trainUnit(state, playerTribe, "militia");
    if (!trained.ok) return { ok: false, targetBuildingId, reason: trained.reason };
    militia = state.units[trained.unitId];
  }
  militia.x = 41;
  militia.y = 32;
  militia.hp = militia.maxHp;
  militia.attackCooldown = 0;
  militia.task = { kind: "idle" };
  const repairerBeforeHp = repairers[0].hp;
  const wallBeforeHp = state.buildings[targetBuildingId]?.hp ?? 0;
  const attackResult = issueSovereignOrder(state, playerTribe, {
    type: "ATTACK",
    priority: 1,
    recipientTribeId: "red",
    targetBuildingId,
    interdictRepairs: true,
    repairInterdictionRadius: 4,
    repairInterdictionPlan: "Stop the repair crew at the breach before resuming wall damage.",
    siegeIntent: "counter Red's repair attempt at the exact wall.",
    reason: "Browser smoke repair interdiction test."
  });
  if (!attackResult.ok) {
    render();
    return { ok: false, targetBuildingId, repairerBeforeHp, wallBeforeHp: Math.ceil(wallBeforeHp), reason: attackResult.reason };
  }
  const siegePlan = state.siegePlans.at(-1);
  const attackers = Object.values(state.units).filter((unit) => unit.task.kind === "attackBuilding" && unit.task.siegePlanId === siegePlan?.id);
  const attackTasks = attackers.map((unit) => describeUnitTask(state, unit));
  const repairerTasks = repairers.map((unit) => describeUnitTask(state, unit));
  const orderEvents = state.events.slice(-12).map((event) => `${event.type}:${event.body}`);
  advanceSimulationTicks(4, { scheduleAi: false, render: false });
  const wall = state.buildings[targetBuildingId];
  if (wall) selectAndShowBuilding(wall);
  else render({ forceHud: true, forceLabels: true, forceFog: true });
  const recentEvents = [...orderEvents, ...state.events.slice(-16).map((event) => `${event.type}:${event.body}`)];
  const repairerAfterHp = repairers[0].hp;
  return {
    ok:
      repairerAfterHp < repairerBeforeHp &&
      Boolean(siegePlan?.interdictRepairs) &&
      recentEvents.some((event) => event.includes("SIEGE_REPAIR_INTERDICTION_ORDERED")) &&
      recentEvents.some((event) => event.includes("REPAIR_UNDER_FIRE_INTERRUPTED")),
    targetBuildingId,
    repairerBeforeHp: Math.ceil(repairerBeforeHp),
    repairerAfterHp: Math.ceil(repairerAfterHp),
    wallBeforeHp: Math.ceil(wallBeforeHp),
    wallAfterHp: wall ? Math.ceil(wall.hp) : null,
    attackTasks,
    repairerTasks,
    siegePlan,
    recentEvents
  };
}

function summarizeResourceTiles(game: GameState, type: ResourceType): {
  type: ResourceType;
  tiles: number;
  amount: number;
  samples: Array<{ x: number; y: number; amount: number; hp: number; maxHp: number; healthPct: number; armor: number; attack: number; range: number }>;
} {
  const tiles = collectResourceTiles(game, type);
  const center = { x: Math.floor(MAP_SIZE / 2), y: Math.floor(MAP_SIZE / 2) };
  const samples = tiles
    .slice()
    .sort((left, right) => distanceToTile(left, center) - distanceToTile(right, center))
    .slice(0, 5)
    .map((tile) => ({
      x: tile.x,
      y: tile.y,
      amount: Math.round(tile.amount),
      hp: Math.ceil(tile.hp),
      maxHp: tile.maxHp,
      healthPct: Math.round(healthRatio(tile) * 100),
      armor: tile.armor,
      attack: tile.attack,
      range: tile.range
    }));
  return {
    type,
    tiles: tiles.length,
    amount: Math.round(tiles.reduce((sum, tile) => sum + tile.amount, 0)),
    samples
  };
}

function buildResourceLayoutFingerprint(game: GameState): string {
  let hash = 2166136261 >>> 0;
  let liveResourceTiles = 0;
  const mix = (value: number): void => {
    hash ^= value;
    hash = Math.imul(hash, 16777619) >>> 0;
  };
  for (let index = 0; index < game.map.length; index += 1) {
    const resource = game.map[index].resource;
    if (!resource || resource.amount <= 0 || resource.hp <= 0) continue;
    liveResourceTiles += 1;
    mix(index);
    mix(resourceTypes.indexOf(resource.type) + 1);
    mix(Math.round(resource.amount));
    mix(Math.ceil(resource.hp));
  }
  return `${game.seed}:${liveResourceTiles}:${hash.toString(16).padStart(8, "0")}`;
}

function summarizeContestedResourceSites(game: GameState): Array<{
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  healthPct: number;
  distanceToCenter: number;
  nearestTribe: TribeId;
  nearestTribeDistance: number;
  rivalTribe?: TribeId;
  rivalTribeDistance?: number;
  contested: boolean;
  scarce: boolean;
  pressureScore: number;
}> {
  const center = { x: Math.floor(MAP_SIZE / 2), y: Math.floor(MAP_SIZE / 2) };
  const sites: Array<{
    type: ResourceType;
    x: number;
    y: number;
    amount: number;
    healthPct: number;
    distanceToCenter: number;
    nearestTribe: TribeId;
    nearestTribeDistance: number;
    rivalTribe?: TribeId;
    rivalTribeDistance?: number;
    contested: boolean;
    scarce: boolean;
    pressureScore: number;
  }> = [];
  for (const type of resourceTypes) {
    if (!contestedResourceTypes.has(type)) continue;
    for (const tile of collectResourceTiles(game, type)) {
      const nearest = tribeIds
        .map((tribeId) => {
          const townHall = Object.values(game.buildings).find((building) => building.tribeId === tribeId && building.type === "townHall");
          const origin = townHall ? { x: townHall.x, y: townHall.y } : { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
          return { tribeId, distance: distanceToTile(tile, origin) };
        })
        .sort((left, right) => left.distance - right.distance);
      const leader = nearest[0];
      const runnerUp = nearest[1];
      const distanceToCenter = distanceToTile(tile, center);
      const contested = distanceToCenter <= 42 || (runnerUp ? runnerUp.distance - leader.distance <= 14 : false);
      const scarce = scarceResourceTypes.has(type);
      sites.push({
        type,
        x: tile.x,
        y: tile.y,
        amount: Math.round(tile.amount),
        healthPct: Math.round((tile.hp / Math.max(1, tile.maxHp)) * 100),
        distanceToCenter: Math.round(distanceToCenter),
        nearestTribe: leader.tribeId,
        nearestTribeDistance: Math.round(leader.distance),
        rivalTribe: runnerUp?.tribeId,
        rivalTribeDistance: runnerUp ? Math.round(runnerUp.distance) : undefined,
        contested,
        scarce,
        pressureScore: Math.round(
          (contested ? 100 : 0) +
            (scarce ? 40 : 0) +
            Math.max(0, 45 - distanceToCenter) +
            Math.min(50, Math.round(tile.amount / 12)) +
            (tile.hp < tile.maxHp ? 25 : 0)
        )
      });
    }
  }
  return sites
    .sort((left, right) => right.pressureScore - left.pressureScore || left.distanceToCenter - right.distanceToCenter || right.amount - left.amount)
    .slice(0, 24);
}

function collectResourceTiles(
  game: GameState,
  type: ResourceType
): Array<{ x: number; y: number; amount: number; hp: number; maxHp: number; armor: number; attack: number; range: number; attackCooldown: number }> {
  const tiles: Array<{ x: number; y: number; amount: number; hp: number; maxHp: number; armor: number; attack: number; range: number; attackCooldown: number }> = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const tile = game.map[tileIndex(x, y)];
      if (type === "wood") {
        if (tile.resource?.type === "wood" && tile.resource.amount > 0 && tile.resource.hp > 0) {
          tiles.push({ x, y, ...tile.resource });
        }
        continue;
      }
      if (tile.resource?.type === type && tile.resource.amount > 0 && tile.resource.hp > 0) {
        tiles.push({ x, y, ...tile.resource });
      }
    }
  }
  return tiles;
}

function distanceToTile(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function assignTribeModels(models: OllamaModel[]): void {
  for (const tribeId of tribeIds) delete tribeModelAssignments[tribeId];
  const ranked = rankedOllamaModels(models);
  if (ranked.length === 0) return;
  tribeIds.forEach((tribeId, index) => {
    tribeModelAssignments[tribeId] = ranked[index % ranked.length].name;
  });
}

function rankedOllamaModels(models: OllamaModel[]): OllamaModel[] {
  const seen = new Set<string>();
  const unique = models.filter((model) => {
    if (!model.name || seen.has(model.name)) return false;
    seen.add(model.name);
    return true;
  });
  const compatible = unique.filter(isSchemaTurnCompatibleModel);
  const defaultModel = chooseDefaultModel(unique);
  const preference = (name: string): number => {
    const lower = name.toLowerCase();
    if (lower.includes("qwen3.5:9b") || lower.includes("qwen3.5-9b")) return 0;
    if (lower.startsWith("gpt-oss:20b")) return 1;
    if (lower.startsWith("gpt-oss")) return 2;
    if (lower.includes("qwen") && !lower.includes("27b")) return 3;
    if (lower === "gemma4:12b") return 6;
    if (lower.includes("gemma4")) return 7;
    if (lower.includes("qwen3.5:27b") || lower.includes("qwen3.5-27b")) return 6;
    if (lower.includes("deepseek")) return 4;
    if (lower.includes("mistral")) return 9;
    return 10;
  };
  const fastAssignmentPool = compatible.filter((model) => preference(model.name) <= 3);
  const assignmentPool = fastAssignmentPool.length > 0 ? fastAssignmentPool : compatible;
  return assignmentPool
    .slice()
    .sort(
      (left, right) =>
        Number(right.name === defaultModel) - Number(left.name === defaultModel) ||
        preference(left.name) - preference(right.name) ||
        left.name.localeCompare(right.name)
    );
}

function modelForTribe(tribeId: TribeId): string {
  return tribeModelAssignments[tribeId] ?? activeModel;
}

function identityModelForTribe(tribeId: TribeId): string {
  return modelForTribe(tribeId) || identityBootstrapModelForTribe(tribeId);
}

function identityModelsForTribe(tribeId: TribeId): string[] {
  const assignedModel = modelForTribe(tribeId);
  const fallbackModel = chooseDefaultModel(ollamaModels) ?? activeModel;
  return Array.from(
    new Set(
      [
        assignedModel,
        fallbackModel,
        ...rankedOllamaModels(ollamaModels).map((model) => model.name)
      ].filter(Boolean)
    )
  );
}

function identityBootstrapModelForTribe(tribeId: TribeId): string {
  return modelForTribe(tribeId) ?? chooseDefaultModel(ollamaModels) ?? activeModel ?? "";
}

function identityBootstrapSummary(): string {
  const assignedModels = Array.from(new Set(tribeIds.map((tribeId) => modelForTribe(tribeId)).filter(Boolean)));
  const rerouteFallback = chooseDefaultModel(ollamaModels) ?? activeModel;
  if (assignedModels.length === 0) return "no identity bootstrap model";
  return `assigned models (${assignedModels.join(", ")}) for startup names and first doctrines; ${rerouteFallback || assignedModels[0]} remains available only as a reroute fallback`;
}

function liveModelCandidatesForTribe(tribeId: TribeId, preferredModel = modelForTribe(tribeId)): string[] {
  return Array.from(
    new Set(
      [
        preferredModel,
        activeModel,
        ...rankedOllamaModels(ollamaModels).map((model) => model.name)
      ].filter(Boolean)
    )
  ).slice(0, 4);
}

function strategyModelForTribe(tribeId: TribeId): string {
  if (!hasDoctrineDecision(tribeId)) return modelForTribe(tribeId) || strategyBootstrapModelForTribe(tribeId);
  return modelForTribe(tribeId) || strategyBootstrapModelForTribe(tribeId);
}

function strategyBootstrapModelForTribe(tribeId: TribeId): string {
  return modelForTribe(tribeId) ?? chooseDefaultModel(ollamaModels) ?? activeModel ?? "";
}

function hasDoctrineDecision(tribeId: TribeId): boolean {
  return state.aiDecisions.some((decision) => decision.tribeId === tribeId && !isIdentityDecision(decision) && !isReplyDecision(decision));
}

function firstDoctrineSetupPending(): boolean {
  return tribeIds.some((tribeId) => isTribeActive(state, tribeId) && !hasDoctrineDecision(tribeId));
}

function isIdentityDecision(decision: AiDecision): boolean {
  return decision.accepted.some((entry) => String(entry).startsWith("IDENTITY:"));
}

function isReplyDecision(decision: AiDecision): boolean {
  return decision.accepted.some((entry) => String(entry).startsWith("REPLY:"));
}

function syncPrimaryLlmJob(): void {
  const first = activeLlmJobs.entries().next().value as [TribeId, LlmJobRecord] | undefined;
  llmBusyTribe = first?.[0];
  llmBusyMode = first?.[1].mode;
}

function activeLlmJobRows(): Array<{ tribeId: TribeId; tribeName: string; mode: LlmJobMode; model: string }> {
  return Array.from(activeLlmJobs.entries()).map(([tribeId, job]) => ({
    tribeId,
    tribeName: state.tribes[tribeId].name,
    mode: job.mode,
    model: job.model || "fallback"
  }));
}

function maxConcurrentLlmJobs(): number {
  const assignedModels = new Set(
    tribeIds
      .map((tribeId) => modelForTribe(tribeId))
      .filter((model): model is string => Boolean(model && model !== "fallback"))
  );
  const availableModelCount = assignedModels.size || rankedOllamaModels(ollamaModels).length;
  const base = Math.max(1, Math.min(targetConcurrentLlmJobs, availableModelCount || targetConcurrentLlmJobs));
  const frameBudgetMs = 1000 / minimumSmoothFps;
  if (measuredFps > 0 && (measuredFps < 50 || lastRenderDurationMs > frameBudgetMs * 0.5 || maxFrameDeltaMs > frameBudgetMs * 1.25)) {
    return 1;
  }
  return base;
}

function hasLlmCapacity(ignoreFramePressure = false): boolean {
  return activeLlmJobs.size < maxConcurrentLlmJobs() && (ignoreFramePressure || !llmFramePressureActive());
}

function tribeHasActiveLlmJob(tribeId: TribeId): boolean {
  return activeLlmJobs.has(tribeId);
}

function modelHasActiveLlmJob(model: string): boolean {
  if (!model) return false;
  return Array.from(activeLlmJobs.values()).some((job) => job.model === model);
}

function modelHasOtherActiveLlmJob(model: string, tribeId: TribeId): boolean {
  if (!model) return false;
  return Array.from(activeLlmJobs.entries()).some(([activeTribeId, job]) => activeTribeId !== tribeId && job.model === model);
}

function canStartLlmJob(tribeId: TribeId, model = modelForTribe(tribeId), allowSameModelParallel = false, ignoreFramePressure = false): boolean {
  if (!hasLlmCapacity(ignoreFramePressure) || tribeHasActiveLlmJob(tribeId)) return false;
  return allowSameModelParallel || !modelHasActiveLlmJob(model);
}

function llmFramePressureActive(nowMs = performance.now()): boolean {
  if (measuredFps > 0 && measuredFps < minimumSmoothFps) {
    llmFramePressureUntilMs = Math.max(llmFramePressureUntilMs, nowMs + llmFramePressureCooldownMs);
  }
  if (maxFrameDeltaMs > 250) {
    llmFramePressureUntilMs = Math.max(llmFramePressureUntilMs, nowMs + llmFramePressureCooldownMs);
  }
  return nowMs < llmFramePressureUntilMs;
}

function beginLlmJob(tribeId: TribeId, mode: LlmJobMode, model = modelForTribe(tribeId), allowSameModelParallel = false, ignoreFramePressure = false): boolean {
  if (!canStartLlmJob(tribeId, model, allowSameModelParallel, ignoreFramePressure)) return false;
  activeLlmJobs.set(tribeId, { mode, model });
  syncPrimaryLlmJob();
  return true;
}

function updateLlmJobModel(tribeId: TribeId, model: string): void {
  const job = activeLlmJobs.get(tribeId);
  if (!job) return;
  activeLlmJobs.set(tribeId, { ...job, model });
  syncPrimaryLlmJob();
}

function finishLlmJob(tribeId: TribeId): void {
  activeLlmJobs.delete(tribeId);
  syncPrimaryLlmJob();
  queueLlmSchedulePump();
}

function queueLlmSchedulePump(): void {
  if (llmSchedulePumpPending) return;
  llmSchedulePumpPending = true;
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      llmSchedulePumpPending = false;
      const startedJob = scheduleOneLlmJob();
      if (startedJob && activeLlmJobs.size < maxConcurrentLlmJobs()) {
        window.setTimeout(() => queueLlmSchedulePump(), llmJobLaunchSpacingMs);
      }
    }, 0);
  });
}

function scheduleOneLlmJob(): boolean {
  const activeBefore = activeLlmJobs.size;
  if (scheduleLlmReply()) return true;
  if (scheduleLlmDecision()) return true;
  return activeLlmJobs.size > activeBefore;
}

function modelAssignmentSummary(): string {
  return tribeIds.map((tribeId) => `${state.tribes[tribeId].name}: ${modelForTribe(tribeId) || "fallback"}`).join("; ");
}

function skippedModelSummary(models: OllamaModel[]): string {
  const skipped = models.filter((model) => !isSchemaTurnCompatibleModel(model)).map((model) => `${model.name} needs adapter`);
  return skipped.length > 0 ? ` Skipped for schema turns: ${skipped.join(", ")}.` : "";
}

function chatAdapterSummary(models: OllamaModel[]): string {
  const adapted = models.filter(isChatSchemaCompatibleModel).map((model) => `${model.name} via /api/chat`);
  return adapted.length > 0 ? ` Chat adapters: ${adapted.join(", ")}.` : "";
}

async function initializeLlm(): Promise<void> {
  try {
    ollamaModels = await loadOllamaModels();
    assignTribeModels(ollamaModels);
    activeModel = chooseDefaultModel(ollamaModels) ?? "";
    llmStatus = activeModel
      ? `Local Ollama connected. Tribe models: ${modelAssignmentSummary()}.${chatAdapterSummary(ollamaModels)}${skippedModelSummary(ollamaModels)}`
      : ollamaModels.length > 0
        ? `Ollama is running, but no installed model is compatible with schema turns.${skippedModelSummary(ollamaModels)}`
        : "Ollama is running but no local models are installed.";
    if (activeModel) {
      void runInitialIdentitySetup();
    } else {
      markIdentityGenerationUnavailable("No schema-compatible local model is available; neutral placeholders kept.");
      llmSchedulingStarted = true;
      identitySetupComplete = true;
    }
  } catch (error) {
    llmStatus = `Ollama unavailable. Strategy uses deterministic fallback until a model is available. ${error instanceof Error ? error.message : ""}`;
    markIdentityGenerationUnavailable("Ollama unavailable; neutral placeholders kept.");
    llmSchedulingStarted = true;
    identitySetupComplete = true;
  }
  render();
}

function scheduleLlmDecision(): boolean {
  if (!llmSchedulingStarted || activeLlmJobs.size >= maxConcurrentLlmJobs()) return false;
  if (tryScheduleSovereignIdentity()) return true;
  return tryScheduleSovereignDecision();
}

function tryScheduleSovereignIdentity(): boolean {
  if (ollamaModels.length === 0) return false;
  const unnamedCandidates = tribeIds
    .filter(
      (tribeId) => {
        const model = identityModelForTribe(tribeId);
        return (
          isTribeActive(state, tribeId) &&
          !state.tribes[tribeId].identityChosen &&
          state.tick >= nextIdentityRetryTick[tribeId] &&
          canStartLlmJob(tribeId, model, true, false)
        );
      }
    )
    .sort((left, right) => nextIdentityRetryTick[left] - nextIdentityRetryTick[right]);
  const unnamed = unnamedCandidates.find((tribeId) => !tribeUsesCoolingModel(tribeId, identityModelForTribe(tribeId))) ?? unnamedCandidates[0];
  if (!unnamed) return false;
  nextIdentityRetryTick[unnamed] = state.tick + 900;
  void runSovereignIdentity(unnamed);
  return true;
}

function tryScheduleSovereignDecision(): boolean {
  const dueCandidates = tribeIds
    .filter(
      (tribeId) => {
        const model = strategyModelForTribe(tribeId);
        const firstDoctrine = !hasDoctrineDecision(tribeId);
        return (
          isTribeActive(state, tribeId) &&
          (firstDoctrine || !firstDoctrineSetupPending()) &&
          (firstDoctrine || !llmFollowupStrategyHoldForTest) &&
          state.tick >= nextLlmDecisionTick[tribeId] &&
          canStartLlmJob(tribeId, model, firstDoctrine, false) &&
          (!ollamaModels.length || state.tribes[tribeId].identityChosen || identitySetupComplete)
        );
      }
    )
    .sort((left, right) => nextLlmDecisionTick[left] - nextLlmDecisionTick[right]);
  const due = dueCandidates.find((tribeId) => !tribeUsesCoolingModel(tribeId, strategyModelForTribe(tribeId))) ?? dueCandidates[0];
  if (!due) return false;
  void runSovereignDecision(due, false);
  return true;
}

function openingIdentitySetupPending(): boolean {
  return ollamaModels.length > 0 && activeModel !== "" && !identitySetupComplete;
}

function describeActiveLlmJobs(): string {
  const active = activeLlmJobRows().map((job) => `${job.tribeName} ${job.mode}`).join(", ");
  return active || "no active AI lanes";
}

function scheduleLlmReply(): boolean {
  if (!llmSchedulingStarted) return false;
  if (!hasLlmCapacity(true)) return false;
  const packet = Object.values(state.packets)
    .filter(
      (candidate) =>
        candidate.state === "AWAITING_REPLY" &&
        candidate.messageIds.length === 1 &&
        state.tribes[candidate.recipientTribeId].controller === "llm" &&
        isTribeActive(state, candidate.recipientTribeId) &&
        !pendingReplyPacketIds.has(candidate.id) &&
          canStartLlmJob(candidate.recipientTribeId, modelForTribe(candidate.recipientTribeId), false, false)
    )
    .sort((a, b) => a.lastStateChangeTick - b.lastStateChangeTick)[0];
  if (!packet) return false;
  void runSovereignReply(packet.id);
  return true;
}

async function runInitialIdentitySetup(): Promise<void> {
  if (ollamaModels.length === 0) {
    markIdentityGenerationUnavailable("No active model; neutral placeholders kept.");
    llmSchedulingStarted = true;
    identitySetupComplete = true;
    return;
  }
  llmSchedulingStarted = true;
  identitySetupComplete = false;
  llmStatus = `Initial sovereign identities queued with ${identityBootstrapSummary()}.`;
  identityStatus = "AI sovereign identities and first doctrines start on each tribe's assigned model; fallback routing is only used if a model fails.";
  render();
  queueLlmSchedulePump();
}

async function runSovereignIdentity(tribeId: TribeId): Promise<void> {
  if (!isTribeActive(state, tribeId)) return;
  const identityModels = identityModelsForTribe(tribeId);
  const primaryModel = identityModels[0];
  if (!primaryModel) return;
  if (!beginLlmJob(tribeId, "identity", primaryModel, true, false)) return;
  llmStatus = `${state.tribes[tribeId].defaultName} is choosing a historical or literary identity with ${primaryModel}...`;
  render();

  const rejectedAttempts: string[] = [];
  let identityChosen = false;
  for (let attempt = 0; attempt < Math.min(identityModels.length, 4); attempt += 1) {
    const tribeModel = identityModels[attempt];
    updateLlmJobModel(tribeId, tribeModel);
    llmStatus = `${state.tribes[tribeId].defaultName} is choosing a historical or literary identity with ${tribeModel}${attempt > 0 ? " after a rejected duplicate or failed identity" : ""}...`;
    render();
    try {
      const identity = await requestSovereignIdentity(state, tribeId, tribeModel, attempt > 0);
      clearOllamaTransportFailureStreak(tribeModel);
      const renameResult = applyIdentityChoice(tribeId, identity);
      recordAiDecision(state, {
        tribeId,
        provider: "ollama",
        model: tribeModel,
        freeformStrategy: `${attempt > 0 ? "Identity retry" : "Identity"} generated from: ${identity.inspiration}`,
        strategySummary: `Chose ${identity.realmName}, led by ${identity.sovereignName}.`,
        orders: [],
        accepted: [
          `IDENTITY: ${identity.realmName}`,
          ...transportAccepted(identity.transportNote),
          ...recoveryAccepted(identity.recoveryNote),
          ...renameResult.accepted.map((item) => `RENAME: ${item}`)
        ],
        rejected: [...rejectedAttempts, ...renameResult.rejected.map((item) => `RENAME: ${item}`)]
      });
      identityChosen = true;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown identity failure";
      rejectedAttempts.push(`IDENTITY_ATTEMPT_${attempt + 1}: ${tribeModel} ${message}`);
      const failure = describeOllamaFailure(error);
      if (failure.kind === "transport") registerOllamaTransportFailure(tribeModel, message);
    }
  }
  if (!identityChosen) {
    identityStatus = `${state.tribes[tribeId].defaultName}: LLM identity generation failed; retrying soon instead of leaving this sovereign stuck.`;
    llmStatus = `Identity call failed for ${state.tribes[tribeId].defaultName}. ${rejectedAttempts.at(-1) ?? "unknown failure"}`;
    nextIdentityRetryTick[tribeId] = state.tick + 180;
  }
  identitySetupComplete = tribeIds.every((id) => !isTribeActive(state, id) || state.tribes[id].identityChosen);
  finishLlmJob(tribeId);
  render();
}

function markIdentityGenerationUnavailable(reason: string): void {
  identityStatus = reason;
  updateRecipientLabels();
}

function activeOllamaCooldown(): OllamaCooldownState | undefined {
  return ollamaCooldown;
}

function clearOllamaTransportFailureStreak(model: string): void {
  if (model) delete ollamaTransportFailureStreaks[model];
}

function registerOllamaTransportFailure(model: string, reason: string): OllamaCooldownState | undefined {
  const previous = ollamaTransportFailureStreaks[model];
  const withinWindow = previous ? state.tick - previous.lastTick <= 900 : false;
  const count = previous && withinWindow ? previous.count + 1 : 1;
  ollamaTransportFailureStreaks[model] = { count, lastTick: state.tick, reason };
  if (count < 2) return undefined;
  return startOllamaCooldown(model, reason);
}

function startOllamaCooldown(model: string, reason: string): OllamaCooldownState {
  const current = activeOllamaCooldown();
  const untilTick = state.tick + 900;
  if (current && current.model === model) {
    current.untilTick = Math.max(current.untilTick, untilTick);
    current.reason = reason;
    if (!current.probeInFlight) current.lastProbeStatus = "waiting for cooldown expiry";
    return current;
  }
  ollamaCooldown = {
    model,
    untilTick,
    reason,
    reportsSuppressed: 0,
    probeInFlight: false,
    lastProbeStatus: "waiting for cooldown expiry"
  };
  return ollamaCooldown;
}

function suppressOllamaDuringCooldown(mode: "strategy" | "reply", model: string): string | undefined {
  const cooldown = activeOllamaCooldown();
  if (!cooldown || cooldown.model !== model) return undefined;
  maybeProbeOllamaCooldown(cooldown);
  cooldown.reportsSuppressed += 1;
  const probeText = state.tick >= cooldown.untilTick ? " health check pending" : "";
  return `LLM_COOLDOWN: ${model} ${mode} skipped until turn ${cooldown.untilTick}${probeText} after transport outage; deterministic fallback used.`;
}

function tribeUsesCoolingModel(tribeId: TribeId, model = modelForTribe(tribeId)): boolean {
  const cooldown = activeOllamaCooldown();
  return Boolean(model && cooldown?.model === model);
}

function maybeProbeOllamaCooldown(cooldown: OllamaCooldownState): void {
  if (cooldown.probeInFlight || state.tick < cooldown.untilTick) return;
  cooldown.probeInFlight = true;
  cooldown.lastProbeTick = state.tick;
  cooldown.lastProbeStatus = `Health check running for ${cooldown.model}.`;
  llmStatus = `Ollama cooldown expired; health-checking ${cooldown.model} before restoring live AI calls.`;
  render();
  void probeOllamaCooldown(cooldown);
}

async function probeOllamaCooldown(cooldown: OllamaCooldownState): Promise<void> {
  try {
    const result = await probeOllamaModel(cooldown.model);
    if (ollamaCooldown !== cooldown) return;
    ollamaCooldown = undefined;
    const accepted = [...transportAccepted(result.transportNote), ...recoveryAccepted(result.recoveryNote)];
    llmStatus = `Ollama model ${cooldown.model} passed cooldown health check; live AI calls restored.${accepted.length ? ` ${accepted.join(" ")}` : ""}`;
  } catch (error) {
    if (ollamaCooldown !== cooldown) return;
    const failure = describeOllamaFailure(error);
    cooldown.probeInFlight = false;
    cooldown.untilTick = state.tick + 900;
    cooldown.reason = `Ollama cooldown health check failed: ${failure.message}`;
    cooldown.lastProbeTick = state.tick;
    cooldown.lastProbeStatus = `Health check failed after ${failure.attempts} attempt${failure.attempts === 1 ? "" : "s"}; cooldown extended.`;
    llmStatus = `${cooldown.reason}; deterministic fallback remains active.`;
  } finally {
    render();
  }
}

function ollamaCooldownPayload(): Record<string, unknown> | null {
  const cooldown = activeOllamaCooldown();
  return cooldown
    ? {
        model: cooldown.model,
        untilTick: cooldown.untilTick,
        turnsRemaining: Math.max(0, cooldown.untilTick - state.tick),
        reason: cooldown.reason,
        reportsSuppressed: cooldown.reportsSuppressed,
        probeInFlight: cooldown.probeInFlight,
        lastProbeTick: cooldown.lastProbeTick ?? null,
        lastProbeStatus: cooldown.lastProbeStatus ?? null,
        waitingForHealthCheck: state.tick >= cooldown.untilTick
      }
    : null;
}

function modelQualitySummary(): ModelQualitySummary[] {
  const byModel = new Map<string, ModelQualitySummary>();
  const ensure = (model: string): ModelQualitySummary => {
    const key = normalizeQualityModelName(model);
    let summary = byModel.get(key);
    if (!summary) {
      summary = {
        model: key,
        assignedTribes: [],
        decisions: 0,
        liveDecisions: 0,
        fallbackDecisions: 0,
        accepted: 0,
        rejected: 0,
        bugReports: 0,
        parserFailures: 0,
        transportFailures: 0,
        jsonRecoveries: 0,
        transportRetries: 0,
        lastTick: null,
        status: "no-turns"
      };
      byModel.set(key, summary);
    }
    return summary;
  };

  for (const tribeId of tribeIds) {
    const model = modelForTribe(tribeId) || "fallback";
    const summary = ensure(model);
    summary.assignedTribes.push(state.tribes[tribeId].name);
  }

  for (const decision of state.aiDecisions) {
    const summary = ensure(decision.model);
    summary.decisions += 1;
    if (decision.provider === "ollama") summary.liveDecisions += 1;
    else summary.fallbackDecisions += 1;
    summary.accepted += decision.accepted.length;
    summary.rejected += decision.rejected.length;
    summary.jsonRecoveries += decision.accepted.filter((entry) => String(entry).startsWith("LLM_JSON_RECOVERED")).length;
    summary.transportRetries += decision.accepted.filter((entry) => String(entry).startsWith("LLM_TRANSPORT_RETRY")).length;
    summary.lastTick = Math.max(summary.lastTick ?? decision.tick, decision.tick);
  }

  for (const issue of aiBugReports) {
    if (issue.saveState === "failed") continue;
    const summary = ensure(issue.model);
    summary.bugReports += 1;
    if (issue.category === "llm_parser") summary.parserFailures += 1;
    if (issue.category === "llm_transport") summary.transportFailures += 1;
    summary.lastTick = Math.max(summary.lastTick ?? issue.tick, issue.tick);
  }

  for (const summary of byModel.values()) {
    summary.status = modelQualityStatus(summary);
  }

  return Array.from(byModel.values()).sort((left, right) => {
    const leftAssignment = firstAssignedTribeIndex(left);
    const rightAssignment = firstAssignedTribeIndex(right);
    const recency = (right.lastTick ?? 0) - (left.lastTick ?? 0);
    return leftAssignment - rightAssignment || recency || left.model.localeCompare(right.model);
  });
}

function normalizeQualityModelName(model: string): string {
  return model.replace(/\s+failed$/i, "") || "fallback";
}

function modelQualityStatus(summary: ModelQualitySummary): ModelQualitySummary["status"] {
  if (summary.decisions === 0 && summary.bugReports === 0) return "no-turns";
  if (summary.parserFailures > 0 || summary.transportFailures > 0) return "unstable";
  if (summary.rejected > 0 || summary.bugReports > 0 || summary.jsonRecoveries > 0 || summary.transportRetries > 0) return "watch";
  return summary.liveDecisions > 0 ? "clean" : "watch";
}

function firstAssignedTribeIndex(summary: ModelQualitySummary): number {
  const indexes = summary.assignedTribes.map((name) => tribeIds.findIndex((tribeId) => state.tribes[tribeId].name === name)).filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : tribeIds.length;
}

function applyIdentityChoice(tribeId: TribeId, identity: SovereignLlmIdentity): { accepted: string[]; rejected: string[] } {
  const identityResult = applyTribeIdentity(state, tribeId, identity);
  if (!identityResult.ok) {
    identityStatus = `Identity rejected for ${tribeId}: ${identityResult.reason}`;
    throw new Error(identityResult.reason);
  }
  const renameResult = renameUnits(state, tribeId, identity.unitNames);
  identityStatus = `${state.tribes[tribeId].name}: ${state.tribes[tribeId].sovereignName}; ${renameResult.accepted.length} units named.`;
  updateRecipientLabels();
  return renameResult;
}

async function runSovereignReply(packetId: string): Promise<void> {
  const packet = state.packets[packetId];
  if (
    !packet ||
    packet.state !== "AWAITING_REPLY" ||
    packet.messageIds.length > 1 ||
    pendingReplyPacketIds.has(packetId) ||
    !isTribeActive(state, packet.recipientTribeId)
  ) {
    return;
  }
  const tribeId = packet.recipientTribeId;
  const tribeModel = modelForTribe(tribeId);
  if (!beginLlmJob(tribeId, "reply", tribeModel, false, false)) return;
  pendingReplyPacketIds.add(packetId);
  const original = state.messages[packet.messageIds[0]];
  llmStatus = tribeModel
    ? `${state.tribes[tribeId].name} is reading ${state.tribes[packet.originTribeId].name}'s message with ${tribeModel}...`
    : `${state.tribes[tribeId].name} is using deterministic fallback to answer a messenger.`;
  render();

  let provider: AiDecision["provider"] = "fallback";
  let model = tribeModel || "fallback";
  let reply = fallbackReply(state, packetId);
  let llmFailureReport: string | undefined;
  let llmFailureCategory: AiBugCategory = "llm_error";
  let llmFailureSourceKind: AiReportSourceKind = "reply_llm_error";
  const skippedLiveModels: string[] = [];
  const failedLiveModels: LlmAttemptFailure[] = [];
  for (const candidateModel of liveModelCandidatesForTribe(tribeId, tribeModel)) {
    if (modelHasOtherActiveLlmJob(candidateModel, tribeId)) continue;
    const cooldownNote = suppressOllamaDuringCooldown("reply", candidateModel);
    if (cooldownNote) {
      skippedLiveModels.push(cooldownNote);
      continue;
    }
    updateLlmJobModel(tribeId, candidateModel);
    model = candidateModel;
    llmStatus = `${state.tribes[tribeId].name} is reading ${state.tribes[packet.originTribeId].name}'s message with ${candidateModel}${candidateModel !== tribeModel ? " after rerouting from its assigned model" : ""}...`;
    render();
    try {
      reply = await requestSovereignReply(state, packetId, candidateModel, buildAiIterationPromptContext(tribeId));
      provider = "ollama";
      clearOllamaTransportFailureStreak(candidateModel);
      break;
    } catch (error) {
      const failure = classifyLlmFailureForReport(error, "reply");
      failedLiveModels.push({ model: candidateModel, ...failure });
      if (failure.kind === "transport") registerOllamaTransportFailure(candidateModel, failure.message);
      llmStatus = `LLM reply ${failure.kind} failure for ${state.tribes[tribeId].name} on ${candidateModel}; trying another local model before deterministic fallback. ${failure.message}`;
      render();
    }
  }
  if (provider !== "ollama") {
    provider = "fallback";
    model = failedLiveModels[0]?.model ? `${failedLiveModels[0].model} failed` : tribeModel ? `${tribeModel} unavailable` : "fallback";
    reply = fallbackReply(state, packetId);
    const latestFailure = failedLiveModels.at(-1);
    if (latestFailure) {
      llmFailureCategory = latestFailure.category;
      llmFailureSourceKind = latestFailure.sourceKind;
      llmFailureReport = `LLM reply failure for ${state.tribes[tribeId].name}; deterministic fallback used after trying ${formatModelAttemptSummary(
        failedLiveModels,
        skippedLiveModels
      )}. ${latestFailure.message}`;
      llmStatus = llmFailureReport;
    }
  }

  if (!isTribeActive(state, tribeId)) {
    pendingReplyPacketIds.delete(packetId);
    finishLlmJob(tribeId);
    llmStatus = `${state.tribes[tribeId].name} is no longer a separate civilization before it could reply.`;
    render();
    return;
  }

  const latestPacket = state.packets[packetId];
  const staleReason = describeStaleReplyPacket(latestPacket);
  const result = staleReason
    ? undefined
    : attachReplyToPacket(state, packetId, {
        subject: reply.subject,
        body: reply.body,
        diplomacyIntent: reply.diplomacyIntent,
        mergerLeaderTribeId: reply.mergerLeaderTribeId,
        mergerTerms: reply.mergerTerms
      });
  const accepted = result?.ok
    ? [
	        `REPLY: ${state.tribes[tribeId].name} answered ${state.tribes[packet.originTribeId].name}`,
	        ...formatSkippedLiveModelNotes(skippedLiveModels, provider),
	        ...formatRerouteAccepted(tribeModel, model, provider),
	        ...transportAccepted(reply.transportNote),
	        ...recoveryAccepted(reply.recoveryNote),
	        ...(result.allianceFormed ? ["ALLIANCE: accepted through discussion"] : []),
	        ...(result.mergerExecuted ? [`MERGER: civilization merged under ${state.tribes[reply.mergerLeaderTribeId ?? packet.originTribeId]?.name ?? "negotiated leader"}`] : [])
      ]
    : [];
  const rejected = staleReason ? [`REPLY_STALE: ${staleReason}`] : result?.ok ? [] : [`REPLY: ${result?.reason ?? "unknown reply failure"}`];
  const stored = recordAiDecision(state, {
    tribeId,
    provider,
    model,
    strategySummary: reply.strategyNote,
    memoryNote: reply.memoryNote ?? `Reply to ${state.tribes[packet.originTribeId].name}: ${reply.strategyNote}`,
    orders: [],
    accepted,
    rejected
  });
  if (llmFailureReport) {
    void postAiBugReport(stored, llmFailureReport, "medium", llmFailureCategory, true, llmFailureSourceKind);
  } else if (reply.bugReport) {
    void postAiBugReport(stored, reply.bugReport, reply.bugSeverity ?? "low", "ai_report", true, "reply_bug_report");
  } else {
    const rejectedIssue = classifyRejectedFeedback(rejected, "reply");
    if (rejectedIssue) {
      void postAiBugReport(stored, rejectedIssue.report, rejectedIssue.severity, rejectedIssue.category, rejectedIssue.persist, "reply_rejected");
    }
  }
  followUnitId = latestPacket?.carrierUnitId ?? packet.carrierUnitId ?? followUnitId;
  pendingReplyPacketIds.delete(packetId);
  finishLlmJob(tribeId);
	  llmStatus = provider === "fallback" && skippedLiveModels.length > 0 && !llmFailureReport
	    ? `${state.tribes[tribeId].name} replied with deterministic fallback because all local model candidates were cooling down.`
	    : result?.ok
	      ? `${state.tribes[tribeId].name} replied to ${state.tribes[packet.originTribeId].name}: ${reply.strategyNote}`
	      : `${state.tribes[tribeId].name} could not reply to ${original?.subject ?? "message"}: ${staleReason ?? result?.reason ?? "unknown reply failure"}`;
  render();
}

async function runSovereignDecision(tribeId: TribeId, immediate: boolean): Promise<void> {
  const assignedModel = modelForTribe(tribeId);
  const firstDoctrine = !hasDoctrineDecision(tribeId);
  const tribeModel = strategyModelForTribe(tribeId);
  if (!beginLlmJob(tribeId, "strategy", tribeModel, firstDoctrine, false)) return;
  if (!isTribeActive(state, tribeId)) {
    nextLlmDecisionTick[tribeId] = Number.POSITIVE_INFINITY;
    finishLlmJob(tribeId);
    return;
  }
  llmStatus = tribeModel
    ? firstDoctrine && assignedModel && assignedModel !== tribeModel
      ? `${state.tribes[tribeId].name} is writing its first doctrine with ${tribeModel}; ${assignedModel} remains assigned for later turns.`
      : `${state.tribes[tribeId].name} is thinking with ${tribeModel}...`
    : `${state.tribes[tribeId].name} is using deterministic fallback.`;
  render();

  let provider: AiDecision["provider"] = "fallback";
  let model = tribeModel || "fallback";
  let decision = fallbackDecision(state, tribeId);
  let llmFailureReport: string | undefined;
  let llmFailureCategory: AiBugCategory = "llm_error";
  let llmFailureSourceKind: AiReportSourceKind = "strategy_llm_error";
  const skippedLiveModels: string[] = [];
  const busyLiveModels: string[] = [];
  const failedLiveModels: LlmAttemptFailure[] = [];
  for (const candidateModel of liveModelCandidatesForTribe(tribeId, tribeModel)) {
    if (!firstDoctrine && modelHasOtherActiveLlmJob(candidateModel, tribeId)) {
      busyLiveModels.push(candidateModel);
      continue;
    }
    const cooldownNote = suppressOllamaDuringCooldown("strategy", candidateModel);
    if (cooldownNote) {
      skippedLiveModels.push(cooldownNote);
      continue;
    }
    updateLlmJobModel(tribeId, candidateModel);
    model = candidateModel;
    llmStatus = `${state.tribes[tribeId].name} is thinking with ${candidateModel}${candidateModel !== tribeModel ? " after rerouting from its assigned model" : ""}...`;
    render();
    try {
      decision = await requestSovereignDecision(state, tribeId, candidateModel, buildAiIterationPromptContext(tribeId));
      provider = "ollama";
      clearOllamaTransportFailureStreak(candidateModel);
      break;
    } catch (error) {
      const failure = classifyLlmFailureForReport(error, "strategy");
      failedLiveModels.push({ model: candidateModel, ...failure });
      if (failure.kind === "transport") registerOllamaTransportFailure(candidateModel, failure.message);
      llmStatus = `LLM strategy ${failure.kind} failure for ${state.tribes[tribeId].name} on ${candidateModel}; trying another local model before deterministic fallback. ${failure.message}`;
      render();
    }
  }
  if (provider !== "ollama" && busyLiveModels.length > 0) {
    nextLlmDecisionTick[tribeId] = state.tick + 45;
    llmStatus = `${state.tribes[tribeId].name} is waiting for a live model lane instead of using deterministic fallback. Busy alternatives: ${busyLiveModels.join(", ")}.`;
    finishLlmJob(tribeId);
    render();
    return;
  }
  if (provider !== "ollama") {
    provider = "fallback";
    model = failedLiveModels[0]?.model ? `${failedLiveModels[0].model} failed` : tribeModel ? `${tribeModel} unavailable` : "fallback";
    decision = fallbackDecision(state, tribeId);
    const latestFailure = failedLiveModels.at(-1);
    if (latestFailure) {
      llmFailureCategory = latestFailure.category;
      llmFailureSourceKind = latestFailure.sourceKind;
      llmFailureReport = `LLM strategy failure for ${state.tribes[tribeId].name}; deterministic fallback used after trying ${formatModelAttemptSummary(
        failedLiveModels,
        skippedLiveModels
      )}. ${latestFailure.message}`;
      llmStatus = llmFailureReport;
    }
  }

  if (!isTribeActive(state, tribeId)) {
    nextLlmDecisionTick[tribeId] = Number.POSITIVE_INFINITY;
    finishLlmJob(tribeId);
    llmStatus = `${state.tribes[tribeId].name} is no longer a separate civilization before its strategy could be applied.`;
    render();
    return;
  }

  const accepted: string[] = [];
  const rejected: string[] = [];
  const selfReports: string[] = [];
  const selfReportSeverities: AiBugSeverity[] = [];
  accepted.push(...formatSkippedLiveModelNotes(skippedLiveModels, provider));
  accepted.push(...formatFirstDoctrineBootstrapAccepted(firstDoctrine, assignedModel, tribeModel, model, provider));
  accepted.push(...formatRerouteAccepted(tribeModel, model, provider));
  accepted.push(...transportAccepted(decision.transportNote));
  accepted.push(...recoveryAccepted(decision.recoveryNote));
  const renameResult = renameUnits(state, tribeId, decision.unitNames);
  for (const renamed of renameResult.accepted) accepted.push(`RENAME: ${renamed}`);
  for (const failed of renameResult.rejected) rejected.push(`RENAME: ${failed}`);
  for (const order of decision.orders.slice().sort((a, b) => a.priority - b.priority)) {
    const result = issueSovereignOrder(state, tribeId, order);
    if (result.ok) {
      accepted.push(`${order.type}: ${result.summary}`);
      if (order.type === "REPORT_BUG") {
        selfReports.push(formatSelfReportOrder(order));
        if (order.bugSeverity) selfReportSeverities.push(order.bugSeverity);
      }
    } else {
      rejected.push(`${order.type}: ${result.reason}`);
    }
  }

  const stored = recordAiDecision(state, {
    tribeId,
    provider,
    model,
    freeformStrategy: decision.freeformStrategy,
    strategySummary: decision.strategySummary,
    memoryNote: decision.memoryNote ?? decision.freeformStrategy ?? decision.strategySummary,
    orders: decision.orders,
    accepted,
    rejected
  });
  const combinedSelfReport =
    selfReports.length > 0
      ? [selfReports.join(" | "), decision.bugReport ? `Additional bugReport: ${decision.bugReport}` : ""].filter(Boolean).join(" | ")
      : undefined;
  if (llmFailureReport) {
    void postAiBugReport(stored, llmFailureReport, "medium", llmFailureCategory, true, llmFailureSourceKind);
  } else if (combinedSelfReport) {
    void postAiBugReport(stored, combinedSelfReport, highestBugSeverity([decision.bugSeverity ?? "medium", ...selfReportSeverities]), "self_report", true, "report_bug_order");
  } else if (decision.bugReport) {
    void postAiBugReport(stored, decision.bugReport, decision.bugSeverity ?? "low", "ai_report", true, "strategy_bug_report");
  } else {
    const rejectedIssue = classifyRejectedFeedback(rejected, "order");
    if (rejectedIssue) {
      void postAiBugReport(stored, rejectedIssue.report, rejectedIssue.severity, rejectedIssue.category, rejectedIssue.persist, "order_rejected");
    }
  }
  const lastPacket = Object.values(state.packets)
    .filter((packet) => packet.originTribeId === tribeId && packet.carrierUnitId)
    .slice(-1)[0];
  followUnitId = lastPacket?.carrierUnitId ?? followUnitId;
  nextLlmDecisionTick[tribeId] = state.tick + (immediate ? 120 : firstDoctrine ? 60 : llmIntervalTicks);
  finishLlmJob(tribeId);
  llmStatus =
    provider === "fallback" && skippedLiveModels.length > 0 && !llmFailureReport
      ? `${state.tribes[tribeId].name} used deterministic fallback because all local model candidates were cooling down: ${stored.strategySummary}`
      : `${state.tribes[tribeId].name} decided via ${provider === "ollama" ? model : "fallback"}: ${stored.strategySummary}`;
  render();
}

function recoveryAccepted(note: string | undefined): string[] {
  return note ? [`LLM_JSON_RECOVERED: ${note}`] : [];
}

function transportAccepted(note: string | undefined): string[] {
  return note ? [`LLM_TRANSPORT_RETRY: ${note}`] : [];
}

function formatRerouteAccepted(preferredModel: string, actualModel: string, provider: AiDecision["provider"]): string[] {
  if (provider !== "ollama" || !preferredModel || !actualModel || preferredModel === actualModel) return [];
  return [`LLM_MODEL_REROUTE: preferred ${preferredModel} unavailable, used ${actualModel}`];
}

function formatFirstDoctrineBootstrapAccepted(
  firstDoctrine: boolean,
  assignedModel: string,
  preferredModel: string,
  actualModel: string,
  provider: AiDecision["provider"]
): string[] {
  if (!firstDoctrine || provider !== "ollama" || !assignedModel || !preferredModel || !actualModel || assignedModel === actualModel) return [];
  return [`LLM_FIRST_DOCTRINE_BOOTSTRAP: used ${actualModel} for first doctrine; assigned ${assignedModel} remains for later turns`];
}

function formatSkippedLiveModelNotes(notes: string[], provider: AiDecision["provider"]): string[] {
  if (notes.length === 0) return [];
  if (provider === "fallback") return notes;
  return notes.map((note) => note.replace("; deterministic fallback used.", "; tried another local model before fallback."));
}

function formatModelAttemptSummary(failures: LlmAttemptFailure[], skippedNotes: string[]): string {
  const failed = failures.map((failure) => `${failure.model} ${failure.kind} after ${failure.attempts} attempt${failure.attempts === 1 ? "" : "s"}`);
  const skipped = skippedNotes.map((note) => note.replace(/^LLM_COOLDOWN:\s*/i, "").replace(/; deterministic fallback used\.$/i, ""));
  return [...failed, ...skipped].join("; ") || "no live model candidates";
}

function classifyLlmFailureForReport(
  error: unknown,
  source: "strategy" | "reply"
): { kind: OllamaFailureKind; attempts: number; message: string; category: AiBugCategory; sourceKind: AiReportSourceKind } {
  const failure = describeOllamaFailure(error);
  const category: AiBugCategory =
    failure.kind === "transport" ? "llm_transport" : failure.kind === "parser" ? "llm_parser" : "llm_error";
  const sourceKind: AiReportSourceKind =
    source === "strategy"
      ? failure.kind === "transport"
        ? "strategy_llm_transport"
        : failure.kind === "parser"
          ? "strategy_llm_parser"
          : "strategy_llm_error"
      : failure.kind === "transport"
        ? "reply_llm_transport"
        : failure.kind === "parser"
          ? "reply_llm_parser"
          : "reply_llm_error";
  return {
    kind: failure.kind,
    attempts: failure.attempts,
    message: failure.message,
    category,
    sourceKind
  };
}

function formatSelfReportOrder(order: AiStrategicOrder): string {
  const title = order.subject?.trim() || "AI self-report";
  const detail = order.body?.trim() || order.reason.trim();
  const structured = [
    order.suspectedArea ? `Suspected area: ${order.suspectedArea}` : "",
    order.expectedBehavior ? `Expected: ${order.expectedBehavior}` : "",
    order.actualBehavior ? `Actual: ${order.actualBehavior}` : "",
    order.reproductionSteps ? `Repro: ${order.reproductionSteps}` : "",
    order.strategyImpact ? `Strategy impact: ${order.strategyImpact}` : "",
    order.bugSeverity ? `Self-rated severity: ${order.bugSeverity}` : ""
  ].filter(Boolean);
  return [ `${title}: ${detail}`, ...structured ].join(" | ");
}

function highestBugSeverity(values: AiBugSeverity[]): AiBugSeverity {
  if (values.includes("high")) return "high";
  if (values.includes("medium")) return "medium";
  return "low";
}

async function postAiBugReport(
  decision: AiDecision,
  report: string,
  severity: AiBugSeverity,
  category: AiBugCategory = "ai_report",
  persist = true,
  sourceKind: AiReportSourceKind = "strategy_bug_report"
): Promise<void> {
  const source = buildAiReportSource(decision, sourceKind);
  const turnContext = buildAiReportTurnContext(decision);
  const entry = recordAiIssue(decision, report, severity, category, persist ? "pending" : "local", source, turnContext);
  if (!persist) {
    rememberAiReportFiled(decision, entry);
    bugReportStatus = `Latest AI issue logged locally for ${entry.tribeName}.`;
    render();
    return;
  }

  try {
    const response = await fetch("/api/ai-bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tick: decision.tick,
        tribe: state.tribes[decision.tribeId].name,
        tribeId: decision.tribeId,
        provider: decision.provider,
        model: decision.model,
        severity,
        category,
        summary: decision.strategySummary,
        source,
        turnContext,
        report,
        snapshot: buildAiReportSnapshot(decision, source, turnContext, report, severity, category),
        accepted: decision.accepted,
        rejected: decision.rejected
      })
    });
    if (!response.ok) throw new Error(`local report endpoint returned ${response.status}`);
    const saved = (await response.json()) as { snapshot?: string };
    entry.snapshot = typeof saved.snapshot === "string" ? saved.snapshot : undefined;
    entry.saveState = "saved";
    rememberAiReportFiled(decision, entry);
    bugReportStatus = `Latest AI bug report saved for ${state.tribes[decision.tribeId].name}.`;
    await refreshAiReportReview();
  } catch (error) {
    entry.saveState = "failed";
    entry.error = error instanceof Error ? error.message : "unknown error";
    bugReportStatus = `AI bug report could not be saved: ${entry.error}`;
  }
  render();
}

function buildAiReportSource(decision: AiDecision, kind: AiReportSourceKind): string {
  return `kind=${kind}; decision=${decision.id}; provider=${decision.provider}; model=${decision.model}`;
}

function buildAiReportTurnContext(decision: AiDecision): string {
  const tribe = state.tribes[decision.tribeId];
  const units = Object.values(state.units).filter((unit) => unit.tribeId === decision.tribeId && unit.hp > 0);
  const buildings = Object.values(state.buildings).filter((building) => building.tribeId === decision.tribeId && building.hp > 0);
  const military = units.filter((unit) => isMilitaryUnitType(unit.type)).length;
  const walls = buildings.filter((building) => building.type === "wall").length;
  const gates = buildings.filter((building) => building.type === "gate").length;
  const turrets = buildings.filter((building) => building.type === "turret").length;
  const packets = Object.values(state.packets).filter((packet) => packet.originTribeId === decision.tribeId || packet.recipientTribeId === decision.tribeId);
  const victory = getVictoryPressure(state);
  const alliedTribeId = state.alliances[decision.tribeId];
  const alliance = alliedTribeId ? state.tribes[alliedTribeId].name : "none";
  const wars = tribeIds.filter((other) => state.wars[decision.tribeId]?.[other]).map((other) => state.tribes[other].name);
  const recentEvents = getRecentVisibleEvents(state, decision.tribeId, 3).map((event) => `${event.type}:${event.title}`).join(" | ") || "none";
  const resources = resourceTypes.map((type) => `${type}=${Math.round(tribe.resources[type])}`).join(",");
  const developments = tribe.developments.join("|") || "none";
  const ownScore = victory.scoreByTribe.find((score) => score.tribeId === decision.tribeId);
  return clampText(
    [
      `turn=${decision.tick}`,
      `tribe=${tribe.name}`,
      `tribeId=${decision.tribeId}`,
      `year=${victory.currentYear}`,
      `wealth=${computeWealth(state, decision.tribeId)}`,
      `happiness=${Math.round(tribe.happiness)}`,
      `safety=${ownScore?.safety ?? 0}`,
      `resources=${resources}`,
      `developments=${developments}`,
      `units=${units.length}`,
      `military=${military}`,
      `walls=${walls}`,
      `gates=${gates}`,
      `turrets=${turrets}`,
      `alliance=${alliance}`,
      `wars=${wars.join(",") || "none"}`,
      `packets=${packets.slice(-4).map((packet) => `${packet.originTribeId}->${packet.recipientTribeId}:${packet.state}`).join("|") || "none"}`,
      `survival=${victory.status}:year${victory.currentYear}:review${victory.nextReviewYear}:survivors${victory.survivingTribes}`,
      `accepted=${decision.accepted.length}`,
      `rejected=${decision.rejected.length}`,
      `recent=${recentEvents}`,
      `memory=${summarizeSovereignMemory(state, decision.tribeId)}`
    ].join("; "),
    1200
  );
}

function buildAiReportSnapshot(
  decision: AiDecision,
  source: string,
  turnContext: string,
  report: string,
  severity: AiBugSeverity,
  category: AiBugCategory
): Record<string, unknown> {
  const victory = getVictoryPressure(state);
  const tribe = state.tribes[decision.tribeId];
  const ownUnits = Object.values(state.units).filter((unit) => unit.tribeId === decision.tribeId && unit.hp > 0);
  const ownBuildings = Object.values(state.buildings).filter((building) => building.tribeId === decision.tribeId && building.hp > 0);
  const visibleUnits = getVisibleUnits(state, decision.tribeId);
  const visibleBuildings = getVisibleBuildings(state, decision.tribeId);
  const packets = Object.values(state.packets).filter(
    (packet) => packet.originTribeId === decision.tribeId || packet.recipientTribeId === decision.tribeId
  );
  const recentEvents = getRecentVisibleEvents(state, decision.tribeId, 6);
  return {
    schema: "sovereign-ai-bug-snapshot-v1",
    tick: state.tick,
    report: {
      decisionId: decision.id,
      tribeId: decision.tribeId,
      tribeName: tribe.name,
      provider: decision.provider,
      model: decision.model,
      severity,
      category,
      source,
      turnContext,
      text: report,
      accepted: decision.accepted,
      rejected: decision.rejected
    },
    tribe: {
      name: tribe.name,
      sovereignName: tribe.sovereignName,
      developments: tribe.developments.map((id) => ({
        id,
        name: getDevelopment(id).name
      })),
      resources: resourceTypes.reduce<Record<string, number>>((acc, type) => {
        acc[type] = Math.round(tribe.resources[type]);
        return acc;
      }, {}),
      wealth: computeWealth(state, decision.tribeId),
      happiness: Math.round(tribe.happiness),
      population: ownUnits.length,
      memory: summarizeSovereignMemory(state, decision.tribeId)
    },
    counts: {
      ownUnits: ownUnits.length,
      ownMilitary: ownUnits.filter((unit) => isMilitaryUnitType(unit.type)).length,
      ownBuildings: ownBuildings.length,
      walls: ownBuildings.filter((building) => building.type === "wall").length,
      gates: ownBuildings.filter((building) => building.type === "gate").length,
      turrets: ownBuildings.filter((building) => building.type === "turret").length,
      visibleUnits: visibleUnits.length,
      visibleBuildings: visibleBuildings.length,
      activePackets: Object.keys(state.packets).length
    },
    combatStats: {
      ownUnitArmor: Math.round(ownUnits.reduce((sum, unit) => sum + unit.armor, 0)),
      ownUnitAttack: Math.round(ownUnits.reduce((sum, unit) => sum + unit.attack, 0)),
      ownBuildingArmor: Math.round(ownBuildings.reduce((sum, building) => sum + building.armor, 0)),
      ownBuildingAttack: Math.round(ownBuildings.reduce((sum, building) => sum + building.attack, 0))
    },
    survivalMandate: {
      status: victory.status,
      victoryRule: victory.victoryRule,
      currentYear: victory.currentYear,
      nextReviewYear: victory.nextReviewYear,
      finalYear: victory.finalYear,
      survivingTribes: victory.survivingTribes,
      eliminatedTribes: victory.eliminatedTribes,
      turnsRemaining: victory.turnsRemaining,
      winnerTribeId: victory.winnerTribeId,
      winnerName: victory.winnerName,
      winnerSurvivalScore: victory.winnerSurvivalScore,
      poorestTribeId: victory.poorestTribeId,
      poorestName: victory.poorestName,
      poorestWealth: victory.poorestWealth,
      scoreByTribe: victory.scoreByTribe,
      publicText: victory.publicText
    },
    goldRace: {
      status: victory.status,
      victoryRule: victory.victoryRule,
      leaderTribeId: victory.leaderTribeId,
      leaderName: victory.leaderName,
      leaderGold: victory.leaderGold,
      leaderWealth: victory.leaderWealth,
      runnerUpTribeId: victory.runnerUpTribeId,
      runnerUpName: victory.runnerUpName,
      runnerUpGold: victory.runnerUpGold,
      runnerUpWealth: victory.runnerUpWealth,
      goldTarget: victory.goldTarget,
      turnsRemaining: victory.turnsRemaining,
      winnerTribeId: victory.winnerTribeId,
      winnerName: victory.winnerName,
      winnerGold: victory.winnerGold,
      scoreByTribe: victory.scoreByTribe,
      publicText: victory.publicText
    },
    diplomacy: {
      alliance: state.alliances[decision.tribeId] ?? null,
      wars: tribeIds.filter((other) => state.wars[decision.tribeId]?.[other]),
      packets: packets
        .slice(-8)
        .map((packet) => ({
          id: packet.id,
          originTribeId: packet.originTribeId,
          recipientTribeId: packet.recipientTribeId,
          state: packet.state,
          messageCount: packet.messageIds.length,
          overdueAnnounced: packet.overdueAnnounced
        }))
    },
    visibleSummary: {
      foreignUnits: visibleUnits.filter((unit) => unit.tribeId !== decision.tribeId).length,
      foreignBuildings: visibleBuildings.filter((building) => building.tribeId !== decision.tribeId).length,
      contestedResourceSites: summarizeContestedResourceSites(state).slice(0, 6),
      visibleResourceDeposits: getVisibleResourceDepositIntel(state, decision.tribeId, 8),
      resourceControl: getResourceControlSummary(state, decision.tribeId)
    },
    latestAiDecisions: state.aiDecisions.slice(-6).map((item) => ({
      id: item.id,
      tick: item.tick,
      tribeId: item.tribeId,
      provider: item.provider,
      model: item.model,
      summary: item.strategySummary,
      accepted: item.accepted,
      rejected: item.rejected
    })),
    recentEvents: recentEvents.map((event) => ({
      tick: event.tick,
      type: event.type,
      title: event.title,
      body: event.body
    }))
  };
}

async function refreshAiReportReview(): Promise<void> {
  try {
    const response = await fetch("/api/ai-bug-report-summary");
    if (!response.ok) throw new Error(`summary endpoint returned ${response.status}`);
    const payload = (await response.json()) as Partial<AiReportReview>;
    aiReportReview = {
      ok: payload.ok === true,
      path: payload.path,
      bytes: payload.bytes,
      total: typeof payload.total === "number" ? payload.total : 0,
      liveReports: typeof payload.liveReports === "number" ? payload.liveReports : undefined,
      syntheticReports: typeof payload.syntheticReports === "number" ? payload.syntheticReports : undefined,
      triagePath: payload.triagePath,
      bucketTriagePath: payload.bucketTriagePath,
      triageCounts: normalizeTriageCounts(payload.triageCounts),
      reviewCounts: normalizeTriageCounts(payload.reviewCounts),
      liveReviewCounts: normalizeTriageCounts(payload.liveReviewCounts),
      syntheticReviewCounts: normalizeTriageCounts(payload.syntheticReviewCounts),
      categories: Array.isArray(payload.categories) ? payload.categories.slice(0, 8) : [],
      buckets: Array.isArray(payload.buckets) ? payload.buckets.slice(0, 20) : [],
      bucketCoveredReports: typeof payload.bucketCoveredReports === "number" ? payload.bucketCoveredReports : 0,
      reports: Array.isArray(payload.reports) ? payload.reports.slice(0, 250) : [],
      latest: Array.isArray(payload.latest) ? payload.latest.slice(0, 8) : [],
      error: payload.error
    };
  } catch (error) {
    aiReportReview = {
      ok: false,
      total: 0,
      triageCounts: { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      reviewCounts: { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      liveReviewCounts: { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      syntheticReviewCounts: { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 },
      categories: [],
      buckets: [],
      reports: [],
      latest: [],
      error: error instanceof Error ? error.message : "unknown report-review error"
    };
  }
  render();
}

function normalizeTriageCounts(value: unknown): Record<AiReportTriageStatus, number> {
  const counts = { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  if (!value || typeof value !== "object") return counts;
  const record = value as Partial<Record<AiReportTriageStatus, unknown>>;
  for (const key of Object.keys(counts) as AiReportTriageStatus[]) {
    counts[key] = typeof record[key] === "number" && Number.isFinite(record[key]) ? record[key] : 0;
  }
  return counts;
}

function filteredAiReports(): AiReportReviewEntry[] {
  const query = aiReportFilters.query.trim().toLowerCase();
  const source = aiReportReview.reports.length > 0 ? aiReportReview.reports : aiReportReview.latest;
  return source.filter((entry) => {
    const status = aiReportEntryStatus(entry);
    if (!aiReportMatchesScope(entry.synthetic === true)) return false;
    if (aiReportFilters.status !== "all" && status !== aiReportFilters.status) return false;
    if (aiReportFilters.category !== "all" && entry.category !== aiReportFilters.category) return false;
    if (aiReportFilters.severity !== "all" && entry.severity !== aiReportFilters.severity) return false;
    if (aiReportFilters.provider !== "all" && entry.provider !== aiReportFilters.provider) return false;
    if (aiReportFilters.model !== "all" && entry.model !== aiReportFilters.model) return false;
    if (!query) return true;
    return [
      entry.tribe,
      entry.category,
      entry.severity,
      entry.provider,
      entry.model,
      entry.strategy,
      entry.source,
      entry.turnContext,
      entry.report,
      entry.triageNote ?? "",
      entry.bucketNote ?? "",
      triageProofText(entry.triageProof),
      triageProofText(entry.bucketProof)
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function aiReportEntryStatus(entry: AiReportReviewEntry): AiReportTriageStatus {
  return entry.reviewStatus ?? (entry.bucketCovered && entry.bucketStatus ? entry.bucketStatus : entry.triageStatus) ?? "unresolved";
}

function aiReportMatchesScope(synthetic: boolean): boolean {
  if (aiReportFilters.scope === "all") return true;
  if (aiReportFilters.scope === "synthetic") return synthetic;
  return !synthetic;
}

function reportFilterSource(): AiReportReviewEntry[] {
  return aiReportReview.reports.length > 0 ? aiReportReview.reports : aiReportReview.latest;
}

function scopedReportSource(): AiReportReviewEntry[] {
  return reportFilterSource().filter((entry) => aiReportMatchesScope(entry.synthetic === true));
}

function aiReportScopedCategories(): AiReportReviewCategory[] {
  const categories = new Map<string, AiReportReviewCategory>();
  for (const entry of filteredAiReports()) {
    const current = categories.get(entry.category) ?? {
      category: entry.category,
      count: 0,
      latestTick: entry.tick,
      latestTribe: entry.tribe,
      latestReport: entry.report
    };
    current.count += 1;
    if (current.latestTick === "unknown" || Number(entry.tick) > Number(current.latestTick)) {
      current.latestTick = entry.tick;
      current.latestTribe = entry.tribe;
      current.latestReport = entry.report;
    }
    categories.set(entry.category, current);
  }
  return Array.from(categories.values()).sort((left, right) => right.count - left.count || left.category.localeCompare(right.category)).slice(0, 8);
}

function aiReportFocusBuckets(): AiReportFocusBucket[] {
  if (aiReportReview.buckets.length > 0) {
    return aiReportReview.buckets
      .filter((bucket) => aiReportMatchesScope(bucket.synthetic))
      .filter(aiReportBucketMatchesStatusFilter)
      .sort(
        (left, right) =>
          Number(right.current) - Number(left.current) ||
          right.unresolvedCount - left.unresolvedCount ||
          right.total - left.total ||
          left.key.localeCompare(right.key)
      )
      .slice(0, 6)
      .map(aiReportBucketFromServerBucket);
  }
  const source = reportFilterSource().filter((entry) => aiReportMatchesScope(entry.synthetic === true) && aiReportEntryStatus(entry) === "unresolved");
  const buckets: AiReportFocusBucket[] = [
    ...groupAiReportBuckets(source, "llm_transport", "LLM transport", "model"),
    ...groupAiReportBuckets(source, "llm_parser", "LLM parser", "model"),
    ...groupAiReportBuckets(source, "llm_error", "LLM error", "model"),
    singleAiReportBucket(source, "self_report", "AI self-reports"),
    singleAiReportBucket(source, "ai_report", "AI reports")
  ].filter((bucket): bucket is AiReportFocusBucket => Boolean(bucket));
  return buckets
    .sort((left, right) => right.count - left.count || Number(right.latestTick) - Number(left.latestTick) || left.label.localeCompare(right.label))
    .slice(0, 6);
}

function aiReportBucketMatchesStatusFilter(bucket: AiReportReviewBucket): boolean {
  const status = aiReportBucketFilterStatus(bucket);
  if (aiReportFilters.status === "unresolved") return bucket.current;
  if (aiReportFilters.status !== "all") return status === aiReportFilters.status;
  return bucket.current || Boolean(bucket.latestFixedProof) || bucket.bucketStatus === "triaged" || bucket.bucketStatus === "ignored";
}

function aiReportBucketFilterStatus(bucket: AiReportReviewBucket): AiReportFilterStatus {
  return bucket.current ? "unresolved" : bucket.bucketStatus ?? bucket.latestStatus ?? "all";
}

function aiReportBucketFromServerBucket(bucket: AiReportReviewBucket): AiReportFocusBucket {
  const status = aiReportBucketFilterStatus(bucket);
  const sourceQuery = bucket.sourceKind && bucket.sourceKind !== "unknown" ? `kind=${bucket.sourceKind}` : "";
  return {
    key: bucket.key,
    label: `${bucket.current ? "Current" : "Cleared"}: ${aiBugCategoryLabel(bucket.category as AiBugCategory)} / ${bucket.model}`,
    count: bucket.current ? bucket.unresolvedCount : bucket.bucketCoveredReports || bucket.total,
    latestTick: bucket.latestTick,
    latestTribe: bucket.latestTribe,
    latestReport: bucket.latestReport,
    filters: {
      scope: bucket.synthetic ? "synthetic" : "live",
      status,
      category: bucket.category,
      severity: "all",
      provider: bucket.provider,
      model: bucket.model,
      query: sourceQuery
    }
  };
}

function groupAiReportBuckets(
  source: AiReportReviewEntry[],
  category: string,
  labelPrefix: string,
  field: "provider" | "model"
): AiReportFocusBucket[] {
  const groups = new Map<string, AiReportReviewEntry[]>();
  for (const entry of source) {
    if (entry.category !== category) continue;
    const value = entry[field] || "unknown";
    groups.set(value, [...(groups.get(value) ?? []), entry]);
  }
  return Array.from(groups.entries()).map(([value, entries]) =>
    aiReportBucketFromEntries(entries, `${labelPrefix}: ${value}`, {
      status: "unresolved",
      scope: aiReportFilters.scope,
      category,
      severity: "all",
      provider: field === "provider" ? value : "all",
      model: field === "model" ? value : "all",
      query: ""
    })
  );
}

function singleAiReportBucket(source: AiReportReviewEntry[], category: string, label: string): AiReportFocusBucket | undefined {
  const entries = source.filter((entry) => entry.category === category);
  if (entries.length === 0) return undefined;
  return aiReportBucketFromEntries(entries, label, {
    status: "unresolved",
    scope: aiReportFilters.scope,
    category,
    severity: "all",
    provider: "all",
    model: "all",
    query: ""
  });
}

function aiReportBucketFromEntries(entries: AiReportReviewEntry[], label: string, filters: AiReportFilters): AiReportFocusBucket {
  const latest = entries.slice().sort(compareAiReportEntryNewest)[0];
  const key = [filters.scope, filters.status, filters.category, filters.severity, filters.provider, filters.model, filters.query || "none"].join("|");
  return {
    key,
    label,
    count: entries.length,
    latestTick: latest?.tick ?? "unknown",
    latestTribe: latest?.tribe ?? "unknown",
    latestReport: latest?.report ?? "",
    filters
  };
}

function compareAiReportEntryNewest(left: AiReportReviewEntry, right: AiReportReviewEntry): number {
  const timeDelta = Date.parse(right.timestamp) - Date.parse(left.timestamp);
  if (Number.isFinite(timeDelta) && timeDelta !== 0) return timeDelta;
  return Number(right.tick) - Number(left.tick);
}

function buildAiIterationPromptContext(tribeId: TribeId): AiIterationPromptContext {
  const inbox = buildAiIterationInbox(tribeId);
  return {
    recentOwnReports: inbox.recentOwnReports,
    resolvedLessons: inbox.resolvedLessons
  };
}

function buildAiIterationInbox(tribeId: TribeId): AiIterationInbox {
  const reviewEntries = uniqueAiReportReviewEntries([...aiReportReview.reports, ...aiReportReview.latest])
    .filter((entry) => !entry.synthetic && tribeIdForAiReportEntry(entry) === tribeId && shouldRememberAiReport(entry.category, entry.source))
    .sort(compareAiReportEntryNewest);
  const openReviewEntries = reviewEntries.filter((entry) => aiReportEntryStatus(entry) === "unresolved");
  const resolvedReviewEntries = reviewEntries.filter((entry) => aiReportEntryStatus(entry) !== "unresolved");
  const currentReportEntries = aiBugReports
    .filter(
      (entry) =>
        entry.tribeId === tribeId &&
        shouldRememberAiReport(entry.category, entry.source) &&
        !isTestOnlyAiReportSource(entry.source) &&
        !isSyntheticAiReportSource(entry.provider, entry.model) &&
        !resolvedReviewEntries.some((reviewEntry) => aiReportReviewEntryMatchesCurrentReport(reviewEntry, entry))
    )
    .slice(-4)
    .reverse();
  const recentOwnReports = dedupeAiIterationItems([
    ...currentReportEntries.map(formatCurrentAiReportForInbox),
    ...openReviewEntries.slice(0, 4).map(formatOpenAiReportForInbox)
  ]).slice(0, 4);
  const resolvedLessons = reviewEntries
    .filter((entry) => aiReportEntryStatus(entry) !== "unresolved")
    .slice(0, 4)
    .map((entry) => formatAiReportLesson(entry));
  return {
    recentOwnReports,
    resolvedLessons,
    openReportCount: currentReportEntries.length + openReviewEntries.length,
    resolvedLessonCount: resolvedReviewEntries.length,
    promptSummary: formatAiIterationInboxSummary(recentOwnReports, resolvedLessons, currentReportEntries.length + openReviewEntries.length, resolvedReviewEntries.length)
  };
}

function aiReportReviewEntryMatchesCurrentReport(reviewEntry: AiReportReviewEntry, currentEntry: AiBugEntry): boolean {
  if (reviewEntry.category !== currentEntry.category || reviewEntry.severity !== currentEntry.severity) return false;
  if (reviewEntry.source && currentEntry.source && reviewEntry.source === currentEntry.source) return true;
  const currentText = normalizedAiReportText(currentEntry.report);
  const reviewText = normalizedAiReportText(reviewEntry.report);
  return Boolean(currentText && reviewText && (currentText.includes(reviewText.slice(0, 80)) || reviewText.includes(currentText.slice(0, 80))));
}

function uniqueAiReportReviewEntries(entries: AiReportReviewEntry[]): AiReportReviewEntry[] {
  const byId = new Map<string, AiReportReviewEntry>();
  for (const entry of entries.slice().sort(compareAiReportEntryNewest)) {
    if (!entry.id || byId.has(entry.id)) continue;
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values());
}

function dedupeAiIterationItems(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items.map((value) => value.trim()).filter(Boolean)) {
    const key = item.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function normalizedAiReportText(value: string | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_/-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatCurrentAiReportForInbox(entry: AiBugEntry): string {
  return `open current ${entry.category}/${entry.severity} turn ${entry.tick} ${aiReportSourceKindLabel(entry.source)}: ${clampText(entry.report, 130)}`;
}

function formatOpenAiReportForInbox(entry: AiReportReviewEntry): string {
  return `open ${entry.category}/${entry.severity} id ${entry.id} turn ${entry.tick} ${aiReportSourceKindLabel(entry.source)}: ${clampText(entry.report, 130)}`;
}

function aiReportSourceKindLabel(source: string | undefined): string {
  const match = String(source ?? "").match(/(?:^|[;\s])kind=([^;\s]+)/i);
  return match?.[1] ? `kind=${match[1]}` : "kind=unknown";
}

function formatAiIterationInboxSummary(recentOwnReports: string[], resolvedLessons: string[], openCount: number, resolvedCount: number): string {
  return [
    `open ${openCount}`,
    `resolved ${resolvedCount}`,
    recentOwnReports.length ? `next open: ${recentOwnReports[0]}` : "",
    resolvedLessons.length ? `latest lesson: ${resolvedLessons[0]}` : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatAiReportLesson(entry: AiReportReviewEntry): string {
  const status = aiReportEntryStatus(entry);
  const proof = entry.triageProof ?? entry.bucketProof;
  const note = proof?.summary ?? entry.triageNote ?? entry.bucketNote ?? "";
  const evidence = status === "fixed" && proof?.evidence ? ` proof=${clampText(proof.evidence, 60)}` : "";
  return `${status} ${entry.category}/${entry.severity} id ${entry.id} turn ${entry.tick} ${aiReportSourceKindLabel(entry.source)}: ${clampText(entry.report, 105)}${note ? `; ${clampText(note, 55)}` : ""}${evidence}`;
}

async function updateAiReportTriage(reportId: string, status: AiReportTriageStatus): Promise<void> {
  if (!reportId) return;
  const reportEntry = findAiReportReviewEntry(reportId);
  let proof: FixedTriageProof | undefined;
  if (status === "fixed") {
    const evidence =
      window
        .prompt(
          "Proof that this AI report is fixed. Use a test command, source change, or reproduction note.",
          "Verified by browser smoke after fix."
        )
        ?.trim() ?? "";
    if (evidence.length < 12) {
      bugReportStatus = "Fixed reports require proof before they can leave the iteration backlog.";
      render();
      return;
    }
    proof = {
      summary: "Marked fixed from observer UI",
      evidence,
      fixedBy: "observer_ui",
      fixedAtTurn: state.tick,
      verifiedAt: new Date().toISOString()
    };
  }
  try {
    const response = await fetch("/api/ai-bug-report-triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId,
        status,
        note: `Marked ${status} from observer UI at turn ${state.tick}.`,
        proof
      })
    });
    if (!response.ok) throw new Error(`triage endpoint returned ${response.status}`);
    bugReportStatus = `AI report marked ${status}.`;
    await refreshAiReportReview();
    if (reportEntry) rememberAiReportTriage(reportEntry, status, proof);
    render();
  } catch (error) {
    bugReportStatus = `AI report triage failed: ${error instanceof Error ? error.message : "unknown error"}`;
    render();
  }
}

function rememberAiReportFiled(decision: AiDecision, entry: AiBugEntry): void {
  if (!shouldRememberAiReport(entry.category, entry.source)) return;
  appendSovereignMemory(
    state,
    decision.tribeId,
    `World report filed (${entry.category}/${entry.severity}): ${clampText(entry.report, 150)}`
  );
}

function rememberAiReportTriage(entry: AiReportReviewEntry, status: AiReportTriageStatus, proof: FixedTriageProof | undefined): void {
  if (status === "unresolved" || !shouldRememberAiReport(entry.category, entry.source)) return;
  const tribeId = tribeIdForAiReportEntry(entry);
  if (!tribeId) return;
  const proofText = status === "fixed" && proof?.evidence ? ` Proof: ${proof.evidence}` : entry.triageNote ? ` Note: ${entry.triageNote}` : "";
  appendSovereignMemory(
    state,
    tribeId,
    [`World report ${status}: ${clampText(entry.report, 125)}`, clampText(proofText, 70)].filter(Boolean).join(" ")
  );
}

function shouldRememberAiReport(category: string, source: string): boolean {
  if (isTestOnlyAiReportSource(source)) return false;
  if (category.startsWith("llm_")) return false;
  return (
    category === "self_report" ||
    category === "ai_report" ||
    category === "validation" ||
    source.includes("report_bug_order") ||
    source.includes("strategy_bug_report") ||
    source.includes("reply_bug_report")
  );
}

function isTestOnlyAiReportSource(source: string): boolean {
  return /\bkind=live_integrity_canary\b/i.test(source);
}

function isSyntheticAiReportSource(provider: string, model: string): boolean {
  const key = `${provider} ${model}`.toLowerCase();
  return key.includes("browser-test-hook") || key.includes("playwright") || key.includes("mock:") || provider === "smoke";
}

function findAiReportReviewEntry(reportId: string): AiReportReviewEntry | undefined {
  return [...aiReportReview.reports, ...aiReportReview.latest].find((entry) => entry.id === reportId);
}

function tribeIdForAiReportEntry(entry: AiReportReviewEntry): TribeId | undefined {
  if (entry.tribeId && validTribeId(entry.tribeId)) return entry.tribeId;
  const turnContextTribeId = String(entry.turnContext ?? "").match(/(?:^|[;\s])tribeId=([^;\s]+)/i)?.[1];
  if (turnContextTribeId && validTribeId(turnContextTribeId)) return turnContextTribeId;
  return tribeIds.find((tribeId) => {
    const tribe = state.tribes[tribeId];
    return tribe.name === entry.tribe || tribe.defaultName === entry.tribe;
  });
}

function recordAiIssue(
  decision: AiDecision,
  report: string,
  severity: AiBugSeverity,
  category: AiBugCategory,
  saveState: AiBugEntry["saveState"],
  source: string,
  turnContext: string
): AiBugEntry {
  const entry: AiBugEntry = {
    id: `ai-bug-${++aiBugCounter}`,
    tick: decision.tick,
    tribeId: decision.tribeId,
    tribeName: state.tribes[decision.tribeId].name,
    provider: decision.provider,
    model: decision.model,
    severity,
    category,
    source,
    turnContext,
    report,
    accepted: decision.accepted,
    rejected: decision.rejected,
    saveState
  };
  aiBugReports.push(entry);
  if (aiBugReports.length > 24) aiBugReports.shift();
  return entry;
}

function classifyRejectedFeedback(
  rejected: string[],
  source: "order" | "reply"
): { report: string; severity: AiBugSeverity; category: AiBugCategory; persist: boolean } | undefined {
  if (rejected.length === 0) return undefined;
  const text = rejected.join("; ");
  const lower = text.toLowerCase();
  if (source === "reply" && lower.includes("reply_stale")) {
    return {
      report: `Stale reply skipped safely: ${text}`,
      severity: "low",
      category: "state_race",
      persist: false
    };
  }
  if (source === "reply" && (lower.includes("packet is killed with packet") || lower.includes("packet state changed"))) {
    return {
      report: `Reply validation race: ${text}`,
      severity: "medium",
      category: "state_race",
      persist: true
    };
  }
  if (rejected.every(isOrdinaryBlockedFeedback)) {
    return {
      report: `Blocked ${source}: ${text}`,
      severity: "low",
      category: "blocked_order",
      persist: false
    };
  }
  return {
    report: `${source === "reply" ? "Reply" : "Order"} validation rejected: ${text}`,
    severity: "medium",
    category: "validation",
    persist: true
  };
}

function describeStaleReplyPacket(packet: Packet | undefined): string | undefined {
  if (!packet) return "packet is missing";
  if (packet.state !== "AWAITING_REPLY") return `packet state changed to ${packet.state.toLowerCase().replaceAll("_", " ")}`;
  if (packet.messageIds.length > 1) return "packet already has a reply";
  return undefined;
}

function isOrdinaryBlockedFeedback(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("not enough resources") ||
    lower.includes("population cap reached") ||
    lower.includes("no idle sentinel available") ||
    lower.includes("no idle messenger is available") ||
    lower.includes("no defenders available") ||
    lower.includes("no military units available") ||
    lower.includes("has been eliminated") ||
    lower.includes("already has an alliance")
  );
}

function currentLabelTier(): LabelTier {
  if (camera.scale < 0.68) return "overview";
  if (camera.scale < 1.12) return "tactical";
  return "detail";
}

function currentViewportTileBounds(marginTiles = 1): { minX: number; maxX: number; minY: number; maxY: number } {
  const left = -camera.x / camera.scale / TILE;
  const top = -camera.y / camera.scale / TILE;
  const right = (viewport.clientWidth - camera.x) / camera.scale / TILE;
  const bottom = (viewport.clientHeight - camera.y) / camera.scale / TILE;
  return {
    minX: Math.max(0, Math.floor(left) - marginTiles),
    maxX: Math.min(MAP_SIZE - 1, Math.ceil(right) + marginTiles),
    minY: Math.max(0, Math.floor(top) - marginTiles),
    maxY: Math.min(MAP_SIZE - 1, Math.ceil(bottom) + marginTiles)
  };
}

function isWorldPointInViewport(worldX: number, worldY: number, marginPx = 80): boolean {
  const screenX = camera.x + worldX * camera.scale;
  const screenY = camera.y + worldY * camera.scale;
  return screenX >= -marginPx && screenY >= -marginPx && screenX <= viewport.clientWidth + marginPx && screenY <= viewport.clientHeight + marginPx;
}

function isStrategicResource(type: ResourceType): boolean {
  return type === "gold" || scarceResourceTypes.has(type);
}

function shouldRenderResourceLabel(type: ResourceType, tier: LabelTier): boolean {
  if (tier === "detail") return true;
  if (tier === "overview") return isStrategicResource(type);
  return type !== "wood" && type !== "food";
}

function shouldRenderForestHintLabel(tier: LabelTier): boolean {
  return tier === "detail";
}

function isFortificationType(type: Building["type"]): boolean {
  return type === "wall" || type === "gate" || type === "turret" || type === "watchtower";
}

function isMilitaryUnitType(type: UnitType): boolean {
  return type === "militia" || type === "archer" || type === "siege_engine" || type === "battering_ram" || type === "catapult";
}

function shouldRenderBuildingLabel(building: Building, game: GameState, tier: LabelTier): boolean {
  if (building.id === selectedBuildingId || building.id === constructionFlash?.buildingId) return true;
  if (building.hp < building.maxHp || buildingRepairState(game, building) !== "none") return true;
  if (building.type === "townHall" || building.type === "gate" || building.type === "turret") return true;
  if (tier === "detail") return true;
  if (tier === "tactical") return isFortificationType(building.type);
  return building.type === "wall";
}

function shouldRenderUnitLabel(unit: Unit, tier: LabelTier): boolean {
  if (unit.id === selectedUnitId || unit.carriedPacketId !== undefined) return true;
  if (unit.type === "sovereign" || unit.type === "messenger") return true;
  if (tier === "detail") return true;
  if (tier === "tactical") return isMilitaryUnitType(unit.type) || unit.type === "sentinel";
  return false;
}

const combatNoticeEventTypes = new Set([
  "COMBAT_PROJECTILE_LAUNCHED",
  "SIEGE_PROJECTILE_LAUNCHED",
  "SIEGE_PROJECTILE_IMPACT",
  "STRUCTURE_DESTROYED",
  "RESOURCE_DEPOSIT_DESTROYED",
  "RESOURCE_RAID_ORDER",
  "REPAIR_UNDER_FIRE_INTERRUPTED",
  "SIEGE_REPAIR_CREW_INTERDICTED",
  "MESSENGER_KILLED"
]);

function isCombatNoticeEvent(event: GameEvent): boolean {
  return combatNoticeEventTypes.has(event.type) || event.type.startsWith("WAR_") || event.type.startsWith("SIEGE_");
}

function combatEventsVisibleToClient(game: GameState, count = 80): GameEvent[] {
  const events = observerMode ? game.events.slice(-count).reverse() : getRecentVisibleEvents(game, playerTribe, count);
  return events.filter(isCombatNoticeEvent);
}

function buildRecentCombatEventMarkers(game: GameState, visibleUnits: Unit[], visibleBuildings: Building[], count = 20): CombatEventMarker[] {
  const visibleUnitById = new Map(visibleUnits.map((unit) => [unit.id, unit]));
  const visibleBuildingById = new Map(visibleBuildings.map((building) => [building.id, building]));
  return combatEventsVisibleToClient(game, 90)
    .flatMap((event): CombatEventMarker[] => {
      const context = event.context;
      let x = context?.x;
      let y = context?.y;
      if ((x === undefined || y === undefined) && context?.targetId) {
        const unit = visibleUnitById.get(context.targetId);
        const building = visibleBuildingById.get(context.targetId);
        if (unit) {
          x = unit.x;
          y = unit.y;
        } else if (building) {
          x = building.x;
          y = building.y;
        }
      }
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return [];
      return [
        {
          id: event.id,
          tick: event.tick,
          type: event.type,
          title: event.title,
          body: event.body,
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          ageTicks: Math.max(0, game.tick - event.tick),
          actorTribeId: context?.actorTribeId,
          targetTribeId: context?.targetTribeId,
          subjectId: context?.subjectId,
          targetId: context?.targetId,
          projectileType: context?.projectileType,
          severity: context?.severity,
          screenX: Number((camera.x + (x * TILE + TILE / 2) * camera.scale).toFixed(2)),
          screenY: Number((camera.y + (y * TILE + TILE / 2) * camera.scale).toFixed(2))
        }
      ];
    })
    .filter((marker) => marker.ageTicks <= Math.round(TICK_RATE * 24))
    .slice(0, count);
}

function buildCombatOverlayTelemetry(game: GameState, visibleUnits: Unit[], visibleBuildings: Building[], visibleProjectiles: SiegeProjectile[]) {
  const recentEventMarkers = buildRecentCombatEventMarkers(game, visibleUnits, visibleBuildings, 20);
  const activeProjectileMarkers = visibleProjectiles.slice(0, 20).map((projectile) => ({
    id: projectile.id,
    projectileType: projectile.projectileType,
    tribeId: projectile.tribeId,
    x: Number(projectile.x.toFixed(2)),
    y: Number(projectile.y.toFixed(2)),
    targetKind: projectile.targetKind,
    targetBuildingId: projectile.targetBuildingId ?? null,
    targetUnitId: projectile.targetUnitId ?? null,
    screenX: Number((camera.x + (projectile.x * TILE + TILE / 2) * camera.scale).toFixed(2)),
    screenY: Number((camera.y + (projectile.y * TILE + TILE / 2) * camera.scale).toFixed(2))
  }));
  return {
    enabled: true,
    recentCombatEventMarkers: recentEventMarkers.length,
    activeProjectileMarkers: activeProjectileMarkers.length,
    activeProjectileTypes: Array.from(new Set(activeProjectileMarkers.map((marker) => marker.projectileType))).sort(),
    recentEventTypes: Array.from(new Set(recentEventMarkers.map((marker) => marker.type))).sort(),
    markerIds: recentEventMarkers.map((marker) => marker.id).slice(0, 20),
    markers: recentEventMarkers,
    activeProjectiles: activeProjectileMarkers,
    markerPolicy:
      "observer combat overlay marks recent visible combat events with structured coordinates and live visible projectiles; it does not create wars, targets, retaliation, or AI strategy"
  };
}

function buildBoardReadabilitySnapshot(game: GameState, visibleUnits: Unit[], visibleBuildings: Building[], visibleProjectiles: SiegeProjectile[]) {
  const tier = currentLabelTier();
  const viewportTiles = currentViewportTileBounds();
  const resources = countResourceLabelTelemetry(game, tier, viewportTiles);
  const resourceSprites = countResourceSpriteTelemetry(game, viewportTiles);
  const visibleBuildingLabelCount = showResourceLabels
    ? visibleBuildings.filter((building) => {
        return (
          building.hp > 0 &&
          isWorldPointInViewport(building.x * TILE + TILE / 2, building.y * TILE + TILE / 2) &&
          shouldRenderBuildingLabel(building, game, tier)
        );
      }).length
    : 0;
  const visibleBuildingSpriteCount = visibleBuildings.filter((building) => {
    return building.hp > 0 && isWorldPointInViewport(building.x * TILE + TILE / 2, building.y * TILE + TILE / 2, TILE * 2);
  }).length;
  const visibleUnitLabelCount = showResourceLabels
    ? visibleUnits.filter((unit) => {
        const visual = visualPositionForUnit(unit);
        return isWorldPointInViewport(visual.x * TILE + TILE / 2, visual.y * TILE + TILE / 2) && shouldRenderUnitLabel(unit, tier);
      }).length
    : 0;
  const visibleUnitSpriteCount = visibleUnits.filter((unit) => {
    const visual = visualPositionForUnit(unit);
    return isWorldPointInViewport(visual.x * TILE + TILE / 2, visual.y * TILE + TILE / 2, TILE * 2);
  }).length;
  const visibleProjectileSpriteCount = visibleProjectiles.filter((projectile) => {
    return isWorldPointInViewport(projectile.x * TILE + TILE / 2, projectile.y * TILE + TILE / 2, TILE * 3);
  }).length;
  const constructionLabelCount = showResourceLabels
    ? activeConstructionFlashes(game).filter((flash) => {
        const building = game.buildings[flash.buildingId];
        return building && building.hp > 0 && isWorldPointInViewport(building.x * TILE + TILE / 2, building.y * TILE + TILE / 2);
      }).length
    : 0;
  return {
    labelTier: tier,
    labelContrastMode: "backed",
    labelBackdrop: {
      fill: "#080706",
      alpha: 0.54,
      stroke: "#f2d28b",
      strokeAlpha: 0.22
    },
    labelPolicy: !showResourceLabels
      ? "debug map labels disabled; sprites and texture overlays carry the default board read"
      : tier === "overview"
        ? "strategic resources, sovereigns, messengers, town halls, gates, turrets, and damaged or selected targets"
        : tier === "tactical"
          ? "construction resources except wood/food, military units, forts, gates, turrets, and priority targets"
          : "all visible map labels",
    resourceLabelsVisible: showResourceLabels,
    visibleResourceLabelCount: showResourceLabels ? resources.visible : 0,
    suppressedResourceLabelCount: showResourceLabels ? resources.suppressed : resources.potential,
    potentialResourceLabelCount: resources.potential,
    forestHintLabelCount: showResourceLabels ? resources.forestHints : 0,
    visibleBuildingLabelCount,
    visibleUnitLabelCount,
    constructionLabelCount,
    totalVisibleLabelCount: showResourceLabels
      ? resources.visible + resources.forestHints + visibleBuildingLabelCount + visibleUnitLabelCount + constructionLabelCount
      : 0,
    spriteVisuals: {
      atlasReady: Boolean(visualTextures),
      mapLabelsDefault: showResourceLabels ? "debug labels enabled" : "sprite view",
      visibleResourceSpriteCount: resourceSprites.visible,
      visibleScarceResourceSpriteCount: resourceSprites.scarceVisible,
      activeResourceSpriteCount,
      resourceSpritePoolSize: resourceSpritePool.length,
      visibleBuildingSpriteCount,
      activeBuildingSpriteCount,
      buildingSpritePoolSize: buildingSpritePool.length,
      visibleUnitSpriteCount,
      activeUnitSpriteCount,
      unitSpritePoolSize: unitSpritePool.length,
      visibleProjectileSpriteCount,
      activeProjectileSpriteCount,
      projectileSpritePoolSize: projectileSpritePool.length,
      activeMapTextCount,
      mapTextPoolSize: mapTextPool.length,
      activeRouteVisualCount,
      activeAmbientTerrainCueCount,
      activeFogTileCount,
      activeFogEdgeCueCount,
      resourceTextureTypes: resourceTypes.length,
      buildingTextureTypes: buildingTypes.length,
      buildingStateTextureTypes: buildingTypes.length * buildingVisualStates.length,
      unitTextureTypes: unitTypes.length,
      unitStateTextureTypes: unitTypes.length * unitVisualStates.length,
      diplomacyPacketTextureTypes: diplomacyTextureTypes.length,
      projectileTextureTypes: projectileTypes.length,
      activePacketSpriteCount,
      packetSpritePoolSize: packetSpritePool.length,
      siegeEngineTexture: Boolean(visualTextures?.units.siege_engine?.idle),
      batteringRamTexture: Boolean(visualTextures?.units.battering_ram?.idle),
      catapultTexture: Boolean(visualTextures?.units.catapult?.idle),
      unitAnimation: "pooled sprites with idle/move/scout/gather/deliver/repair/attack texture frames, frame-time bob, task cues, team base rings, and packet pulse",
      buildingAnimation: "pooled building sprites with normal/damaged/critical/repairing/open/closed/locked state textures, turret recoil, fortification joins, and construction focus pulse",
      diplomacyAnimation: "pooled scroll, reply, and destination-seal sprites riding courier routes with frame-time bob and viewport culling",
      projectileAnimation: "pooled arrow, turret-bolt, and stone-shot sprites with frame-time pulse, rotation toward target, team tint for arrows, and combat-event halos",
      ambientTerrainAnimation: "single bounded Graphics pass for viewport-culled water shimmer, road dust, canopy drift, grass wind strokes, and hill glints",
      fogAnimation: "dirty-only fog redraw with softened explored haze and edge cues in player-visibility mode",
      terrainTexture: "cached chunk terrain with road shoulders, water ripples, forest canopy marks, hill contours, mountain caps, and sparse grass flecks"
    },
    viewportTiles,
    strategicGridStep: 8,
    majorGridStep: 16,
    resourceAbbreviations: resourceTypes.map((type) => ({
      type,
      label: resourceAbbrev(type),
      scarce: scarceResourceTypes.has(type),
      construction: constructionResourceTypes.has(type),
      visibleAtTier: shouldRenderResourceLabel(type, tier)
    })),
	    visualSignatures: {
      resources: "higher-resolution pooled sprite-textured deposits drawn from live resource health, exhausted-resource decals for recent depletions, and viewport culling",
	      labels: "debug-only map text, disabled by default",
	      forts: "pooled textured walls, gates, and turrets with sprite-state damage, repair, gate passage/lock, and range overlays",
	      units: "untinted textured unit silhouettes with team base rings, frame-time movement bob, packet satchels, and task-state cues",
	      projectiles: "pooled textured arrows, turret bolts, and stone shots rendered as rotated sprites with combat halos"
	    },
	    resourcePressureOverlay: buildResourcePressureOverlayTelemetry(game),
	    fortificationOverlay: buildFortificationOverlayTelemetry(game, visibleUnits, visibleBuildings),
    combatOverlay: buildCombatOverlayTelemetry(game, visibleUnits, visibleBuildings, visibleProjectiles)
	  };
	}

function buildResourcePressureOverlayTelemetry(game: GameState) {
  const pressureSites = buildResourcePressureOverlaySites(game);
  const contestedSites = pressureSites.filter((site) => site.contested);
  const scarceSites = pressureSites.filter((site) => site.scarce);
  const raidedSites = pressureSites.filter((site) => site.raided);
  const deniedSites = pressureSites.filter((site) => site.deniedRecent);
  const depletedSites = pressureSites.filter((site) => site.depletedRecent);
  const routeSites = pressureSites.filter((site) => site.routeFromTribe !== undefined);
  return {
    enabled: showContestedResources,
    routeMarkers: routeSites.length,
    contestedMarkers: contestedSites.length,
    scarceMarkers: scarceSites.length,
    raidedMarkers: raidedSites.length,
    denialMarkers: deniedSites.length,
    depletionMarkers: depletedSites.length,
    routeSiteIds: routeSites.map((site) => site.siteId).slice(0, 20),
    denialSiteIds: deniedSites.map((site) => site.siteId).slice(0, 20),
    depletionSiteIds: depletedSites.map((site) => site.siteId).slice(0, 20),
    pressureSites: pressureSites.slice(0, 20),
    markerPolicy:
      "visual resource overlay marks contested or scarce deposits, damaged/raided deposits, recent destroyed/depleted deposits with exhausted-world decals, and bounded route pressure from the nearest known anchor"
  };
}

function buildResourcePressureOverlaySites(game: GameState): Array<{
  siteId: string;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  healthPct: number;
  contested: boolean;
  scarce: boolean;
  raided: boolean;
  deniedRecent: boolean;
  depletedRecent: boolean;
  nearestTribe?: TribeId;
  rivalTribe?: TribeId;
  routeFromTribe?: TribeId;
  routeFromX?: number;
  routeFromY?: number;
  routeDistance?: number;
  attackerTribeId?: TribeId;
  depletedByTribeId?: TribeId;
  controlledBy?: TribeId;
  pressureScore: number;
}> {
  const activeSites = summarizeContestedResourceSites(game)
    .filter((site) => site.contested || site.scarce || site.healthPct < 100)
    .slice(0, 18)
    .map((site) => {
      const route = resourcePressureRouteAnchor(game, site.nearestTribe, { x: site.x, y: site.y });
      return {
        siteId: resourcePressureSiteId(site.type, site.x, site.y),
        type: site.type,
        x: site.x,
        y: site.y,
        amount: site.amount,
        healthPct: site.healthPct,
        contested: site.contested,
        scarce: site.scarce,
        raided: site.healthPct < 100,
        deniedRecent: false,
        depletedRecent: false,
        nearestTribe: site.nearestTribe,
        rivalTribe: site.rivalTribe,
        routeFromTribe: route?.tribeId,
        routeFromX: route?.x,
        routeFromY: route?.y,
        routeDistance: route?.distance,
        pressureScore: site.pressureScore
      };
    });
  const activeKeys = new Set(activeSites.map((site) => site.siteId));
  const denialSites = recentResourceDenialsForOverlay(game)
    .filter((denial) => !activeKeys.has(resourcePressureSiteId(denial.type, denial.x, denial.y)))
    .slice(-12)
    .map((denial) => {
      const routeTribe = denial.attackerTribeId ?? denial.controlledBy ?? playerTribe;
      const route = resourcePressureRouteAnchor(game, routeTribe, { x: denial.x, y: denial.y });
      return {
        siteId: resourcePressureSiteId(denial.type, denial.x, denial.y),
        type: denial.type,
        x: denial.x,
        y: denial.y,
        amount: Math.round(denial.amount),
        healthPct: 0,
        contested: false,
        scarce: scarceResourceTypes.has(denial.type),
        raided: true,
        deniedRecent: true,
        depletedRecent: false,
        nearestTribe: denial.controlledBy,
        routeFromTribe: route?.tribeId,
        routeFromX: route?.x,
        routeFromY: route?.y,
        routeDistance: route?.distance,
        attackerTribeId: denial.attackerTribeId,
        controlledBy: denial.controlledBy,
        pressureScore: 220 + (scarceResourceTypes.has(denial.type) ? 40 : 0)
      };
    });
  const blockedKeys = new Set([...activeKeys, ...denialSites.map((site) => site.siteId)]);
  const depletionSites = recentResourceDepletionsForOverlay(game)
    .filter((depletion) => !blockedKeys.has(resourcePressureSiteId(depletion.type, depletion.x, depletion.y)))
    .slice(-12)
    .map((depletion) => {
      const routeTribe = depletion.depletedByTribeId ?? depletion.controlledBy ?? playerTribe;
      const route = resourcePressureRouteAnchor(game, routeTribe, { x: depletion.x, y: depletion.y });
      return {
        siteId: resourcePressureSiteId(depletion.type, depletion.x, depletion.y),
        type: depletion.type,
        x: depletion.x,
        y: depletion.y,
        amount: Math.round(depletion.amount),
        healthPct: 0,
        contested: false,
        scarce: scarceResourceTypes.has(depletion.type),
        raided: false,
        deniedRecent: false,
        depletedRecent: true,
        nearestTribe: depletion.controlledBy,
        routeFromTribe: route?.tribeId,
        routeFromX: route?.x,
        routeFromY: route?.y,
        routeDistance: route?.distance,
        depletedByTribeId: depletion.depletedByTribeId,
        controlledBy: depletion.controlledBy,
        pressureScore: 180 + (scarceResourceTypes.has(depletion.type) ? 36 : 0)
      };
    });
  return [...denialSites, ...depletionSites, ...activeSites]
    .sort((left, right) => right.pressureScore - left.pressureScore || left.siteId.localeCompare(right.siteId))
    .slice(0, 24);
}

function recentResourceDenialsForOverlay(game: GameState): ResourceDenialRecord[] {
  return game.resourceDenials.filter((denial) => {
    if (game.tick - denial.tick > TICKS_PER_GAME_YEAR * 50) return false;
    if (observerMode || denial.visibleTo === "all") return true;
    return denial.visibleTo.includes(playerTribe);
  });
}

function recentResourceDepletionsForOverlay(game: GameState): ResourceDepletionRecord[] {
  return getRecentResourceDepletions(game).filter((depletion) => {
    if (game.tick - depletion.tick > TICKS_PER_GAME_YEAR * 50) return false;
    if (observerMode || depletion.visibleTo === "all") return true;
    return depletion.visibleTo.includes(playerTribe);
  });
}

function resourcePressureRouteAnchor(game: GameState, tribeId: TribeId | undefined, target: Position): { tribeId: TribeId; x: number; y: number; distance: number } | undefined {
  if (!tribeId || !isTribeActive(game, tribeId)) return undefined;
  let anchor: Position | undefined;
  try {
    const townHall = getTownHall(game, tribeId);
    anchor = { x: townHall.x, y: townHall.y };
  } catch {
    const unit = Object.values(game.units).find((candidate) => candidate.tribeId === tribeId && candidate.hp > 0);
    if (unit) anchor = { x: unit.x, y: unit.y };
  }
  if (!anchor) return undefined;
  return {
    tribeId,
    x: Number(anchor.x.toFixed(2)),
    y: Number(anchor.y.toFixed(2)),
    distance: Math.round(Math.hypot(anchor.x - target.x, anchor.y - target.y))
  };
}

function resourcePressureSiteId(type: ResourceType, x: number, y: number): string {
  return `${type}@${x},${y}`;
}

function buildFortificationOverlayTelemetry(game: GameState, visibleUnits: Unit[], visibleBuildings: Building[]) {
  const visibleById = new Map(visibleBuildings.filter((building) => building.hp > 0).map((building) => [building.id, building]));
  const visibleFortifications = visibleBuildings.filter(
    (building) => building.hp > 0 && (building.type === "wall" || building.type === "gate" || building.type === "turret" || building.type === "watchtower")
  );
  const visibleWalls = visibleFortifications.filter((building) => building.type === "wall");
  const visibleGates = visibleFortifications.filter((building) => building.type === "gate");
  const visibleTurrets = visibleFortifications.filter((building) => building.type === "turret");
  const visibleWatchtowers = visibleFortifications.filter((building) => building.type === "watchtower");
  const operatedGateIds = visibleGates.filter((building) => Boolean(building.gateOperation)).map((building) => building.id);
  const activeSabotageGateIds = visibleGates.filter((building) => Boolean(building.gateSabotage)).map((building) => building.id);
  const activeAccessTreatyIds = visibleGates.flatMap((building) => getActiveGateAccessTreaties(game, building.id).map((treaty) => treaty.id));
  const visibleWallGateSegments = [...visibleWalls, ...visibleGates];
  const blockedForPlayerCount = visibleWallGateSegments.filter((building) => !isTileWalkable(game, building.x, building.y, playerTribe)).length;
  const passableForPlayerCount = visibleWallGateSegments.filter((building) => isTileWalkable(game, building.x, building.y, playerTribe)).length;
  const sabotageHistoryGateIds = Array.from(
    new Set(game.gateSabotageHistory.filter((record) => visibleById.has(record.buildingId)).map((record) => record.buildingId))
  );
  const perimeterGroups = buildPerimeterOverlayGroups(game, visibleById);
  const visualOverlayMarkers = buildFortificationVisualMarkerTelemetry(game, visibleUnits, visibleBuildings, perimeterGroups);

  return {
    enabled: showDefenseOverlay,
    visibleCounts: {
      fortification: visibleFortifications.length,
      wall: visibleWalls.length,
      gate: visibleGates.length,
      turret: visibleTurrets.length,
      watchtower: visibleWatchtowers.length
    },
    blockedForPlayerCount,
    passableForPlayerCount,
    operatedGateCount: operatedGateIds.length,
    operatedGateIds,
    activeAccessTreatyCount: activeAccessTreatyIds.length,
    activeAccessTreatyIds,
    activeSabotageCount: activeSabotageGateIds.length,
    activeSabotageGateIds,
    recentSabotageHistoryCount: game.gateSabotageHistory.filter((record) => visibleById.has(record.buildingId)).length,
    sabotageHistoryGateIds,
    perimeterGroupCount: perimeterGroups.length,
    visualOverlayMarkers,
    perimeterGroups
  };
}

function buildFortificationVisualMarkerTelemetry(
  game: GameState,
  visibleUnits: Unit[],
  visibleBuildings: Building[],
  perimeterGroups: ReturnType<typeof buildPerimeterOverlayGroups>
) {
  const visibleWallGateSegments = visibleBuildings.filter(
    (building) => building.hp > 0 && (building.type === "wall" || building.type === "gate")
  );
  const visibleGates = visibleWallGateSegments.filter((building) => building.type === "gate");
  const blockedRouteBuildingIds = visibleWallGateSegments
    .filter((building) => !isTileWalkable(game, building.x, building.y, playerTribe))
    .map((building) => building.id);
  const safePassageGateIds = visibleGates.filter((building) => isSafePassageGate(game, building)).map((building) => building.id);
  const operatedGateIds = visibleGates.filter((building) => Boolean(building.gateOperation)).map((building) => building.id);
  const warFrontMarkers = buildWarFrontOverlayMarkers(game, visibleUnits, visibleBuildings);
  const activeWritGateIds = visibleGates
    .filter((building) => getActiveGateAccessTreaties(game, building.id).length > 0)
    .map((building) => building.id);
  const revokedWritGateIds = boundedUniqueGateIds(
    game.gateAccessTreaties
      .filter((record) => record.action === "revoke")
      .filter((record) => visibleGates.some((gate) => gate.id === record.buildingId))
      .map((record) => record.buildingId)
      .reverse()
  );
  const detainedCourierGateIds = visibleGates
    .filter((building) => gateHasDetainedCourierEvidence(game, building.id))
    .map((building) => building.id);
  const tollGateIds = visibleGates.filter((building) => gateHasTollEvidence(game, building.id)).map((building) => building.id);
  const treatyIncidentGateIds = boundedUniqueGateIds(
    game.gateTreatyIncidents
      .filter((incident) => visibleGates.some((gate) => gate.id === incident.buildingId))
      .map((incident) => incident.buildingId)
      .reverse()
  );
  const sabotageGateIds = boundedUniqueGateIds(
    [
      ...visibleGates.filter((building) => Boolean(building.gateSabotage)).map((building) => building.id),
      ...game.gateSabotageHistory
        .filter((record) => visibleGates.some((gate) => gate.id === record.buildingId))
        .map((record) => record.buildingId)
        .reverse()
    ],
    20
  );
  const discoveryGateIds = boundedUniqueGateIds(
    tribeIds
      .flatMap((tribeId) => game.foreignObservations[tribeId] ?? [])
      .filter((observation) => observation.kind === "gate_treaty_incident_witnessed" || observation.kind === "gate_sabotage_witnessed")
      .map((observation) => observation.gateBuildingId ?? observation.subjectId)
      .filter((id): id is string => Boolean(id) && visibleGates.some((gate) => gate.id === id))
      .reverse()
  );

  return {
    enabled: showDefenseOverlay,
    blockedRouteMarkers: blockedRouteBuildingIds.length,
    blockedRouteBuildingIds: blockedRouteBuildingIds.slice(0, 20),
    safePassageMarkers: safePassageGateIds.length,
    safePassageGateIds: safePassageGateIds.slice(0, 20),
    operatedGateMarkers: operatedGateIds.length,
    operatedGateIds: operatedGateIds.slice(0, 20),
    activeWritMarkers: activeWritGateIds.length,
    activeWritGateIds: activeWritGateIds.slice(0, 20),
    revokedWritMarkers: revokedWritGateIds.length,
    revokedWritGateIds,
    detainedCourierMarkers: detainedCourierGateIds.length,
    detainedCourierGateIds: detainedCourierGateIds.slice(0, 20),
    tollMarkers: tollGateIds.length,
    tollGateIds: tollGateIds.slice(0, 20),
    treatyIncidentMarkers: treatyIncidentGateIds.length,
    treatyIncidentGateIds,
    sabotageMarkers: sabotageGateIds.length,
    sabotageGateIds,
    discoveryMarkers: discoveryGateIds.length,
    discoveryGateIds,
    perimeterCenterMarkers: perimeterGroups.length,
    perimeterGroupIds: perimeterGroups.map((group) => group.groupId).slice(0, 20),
    warFrontMarkers: warFrontMarkers.length,
    warFrontPairs: warFrontMarkers
      .slice(0, 20)
      .map((marker) => `${marker.a}:${marker.b}@${Number(marker.x.toFixed(1))},${Number(marker.y.toFixed(1))}`),
    markerPolicy:
      "visual defense overlay marks player-blocking walls/gates, negotiated or open safe-passage gates, active/revoked writs, tolls, detained couriers, incidents, sabotage/discovery evidence, authored perimeter centers, and visible war-front contact"
  };
}

function boundedUniqueGateIds(values: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function recentGateOperationsForGate(game: GameState, buildingId: string, limit = 8) {
  return game.gateOperations.filter((operation) => operation.buildingId === buildingId).slice(-limit);
}

function gateHasDetainedCourierEvidence(game: GameState, buildingId: string): boolean {
  return (
    Object.values(game.packets).some((packet) => packet.state === "DETAINED" && packet.outboundGateBuildingIds?.includes(buildingId)) ||
    recentGateOperationsForGate(game, buildingId).some(
      (operation) =>
        operation.entryAction === "detain" ||
        operation.unpaidAction === "detain" ||
        Boolean(operation.detainedPacketAction) ||
        Boolean(operation.detainedPacketId)
    )
  );
}

function gateHasTollEvidence(game: GameState, buildingId: string): boolean {
  return recentGateOperationsForGate(game, buildingId).some(
    (operation) => (operation.tollGold ?? 0) > 0 || (operation.tollMode !== undefined && operation.tollMode !== "none") || (operation.ransomGold ?? 0) > 0
  );
}

function gateHasRecentRevokedWrit(game: GameState, buildingId: string): boolean {
  return game.gateAccessTreaties
    .slice(-30)
    .some((record) => record.buildingId === buildingId && record.action === "revoke");
}

function gateHasTreatyIncidentEvidence(game: GameState, buildingId: string): boolean {
  return game.gateTreatyIncidents.slice(-30).some((incident) => incident.buildingId === buildingId);
}

function gateHasDiscoveryEvidence(game: GameState, buildingId: string): boolean {
  return tribeIds.some((tribeId) =>
    (game.foreignObservations[tribeId] ?? [])
      .slice(-30)
      .some(
        (observation) =>
          (observation.kind === "gate_treaty_incident_witnessed" || observation.kind === "gate_sabotage_witnessed") &&
          (observation.gateBuildingId === buildingId || observation.subjectId === buildingId)
      )
  );
}

function gateHasSabotageHistoryEvidence(game: GameState, buildingId: string): boolean {
  return game.gateSabotageHistory.slice(-30).some((record) => record.buildingId === buildingId);
}

function isSafePassageGate(game: GameState, building: Building): boolean {
  if (building.type !== "gate" || building.hp <= 0) return false;
  if (building.gateSabotage?.action === "jam_closed") return false;
  const physicallyOpen = building.gateSabotage?.action === "force_open" || (building.gateState ?? "open") === "open";
  if (!physicallyOpen) return false;
  if (isTileWalkable(game, building.x, building.y, building.tribeId)) return true;
  if ((building.gateAccessPolicy ?? "owner_allies") === "all") return true;
  return getActiveGateAccessTreaties(game, building.id).length > 0;
}

function buildWarFrontOverlayMarkers(game: GameState, visibleUnits: Unit[], visibleBuildings: Building[]) {
  const hostileUnits = visibleUnits.filter((unit) => unit.hp > 0 && isMilitaryUnitType(unit.type));
  const anchors = [
    ...visibleUnits
      .filter((unit) => unit.hp > 0)
      .map((unit) => ({ kind: "unit" as const, id: unit.id, tribeId: unit.tribeId, x: unit.x, y: unit.y })),
    ...visibleBuildings
      .filter((building) => building.hp > 0 && (isFortificationType(building.type) || building.type === "townHall"))
      .map((building) => ({ kind: "building" as const, id: building.id, tribeId: building.tribeId, x: building.x, y: building.y }))
  ];
  const markers: Array<{ a: TribeId; b: TribeId; x: number; y: number; distance: number }> = [];
  const seen = new Set<string>();
  for (const unit of hostileUnits) {
    for (const anchor of anchors) {
      if (anchor.tribeId === unit.tribeId || !game.wars[unit.tribeId]?.[anchor.tribeId]) continue;
      if (anchor.kind === "unit" && anchor.id === unit.id) continue;
      const distance = Math.hypot(unit.x - anchor.x, unit.y - anchor.y);
      if (distance > 14) continue;
      const ordered = [unit.tribeId, anchor.tribeId].sort().join(":");
      const key = `${ordered}:${Math.round((unit.x + anchor.x) / 2)},${Math.round((unit.y + anchor.y) / 2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      markers.push({
        a: unit.tribeId,
        b: anchor.tribeId,
        x: (unit.x + anchor.x) / 2,
        y: (unit.y + anchor.y) / 2,
        distance
      });
    }
  }
  return markers.sort((left, right) => left.distance - right.distance).slice(0, 16);
}

function buildPerimeterOverlayGroups(game: GameState, visibleById: Map<string, Building>) {
  const groups = new Map<string, typeof game.fortificationPlans>();
  for (const plan of game.fortificationPlans) {
    if (!plan.perimeterGroupId) continue;
    const existing = groups.get(plan.perimeterGroupId) ?? [];
    existing.push(plan);
    groups.set(plan.perimeterGroupId, existing);
  }

  return Array.from(groups.entries())
    .map(([groupId, plans]) => {
      const latestPlan = plans.reduce((latest, plan) => (plan.tick > latest.tick || (plan.tick === latest.tick && plan.id > latest.id) ? plan : latest), plans[0]);
      const visibleGroupBuildings = plans.flatMap((plan) => {
        const building = visibleById.get(plan.buildingId);
        return building ? [building] : [];
      });
      const gates = visibleGroupBuildings.filter((building) => building.type === "gate");
      const walls = visibleGroupBuildings.filter((building) => building.type === "wall");
      const turrets = visibleGroupBuildings.filter((building) => building.type === "turret");
      const watchtowers = visibleGroupBuildings.filter((building) => building.type === "watchtower");
      const activeAccessTreatyIds = gates.flatMap((gate) => getActiveGateAccessTreaties(game, gate.id).map((treaty) => treaty.id));
      const operatedGateIds = gates.filter((gate) => Boolean(gate.gateOperation)).map((gate) => gate.id);
      const activeSabotageGateIds = gates.filter((gate) => Boolean(gate.gateSabotage)).map((gate) => gate.id);
      const xs = visibleGroupBuildings.map((building) => building.x);
      const ys = visibleGroupBuildings.map((building) => building.y);
      return {
        groupId,
        tribeId: latestPlan.tribeId,
        pattern: latestPlan.perimeterPattern,
        direction: latestPlan.perimeterDirection,
        length: latestPlan.perimeterLength,
        gateIndex: latestPlan.perimeterGateIndex,
        planCount: plans.length,
        segmentCount: Math.max(...plans.map((plan) => plan.perimeterSegmentCount ?? 0), plans.length),
        visibleSegmentCount: visibleGroupBuildings.length,
        visibleBuildingIds: visibleGroupBuildings.map((building) => building.id),
        counts: {
          wall: walls.length,
          gate: gates.length,
          turret: turrets.length,
          watchtower: watchtowers.length
        },
        blockedSegments: [...walls, ...gates].filter((building) => !isTileWalkable(game, building.x, building.y, playerTribe)).length,
        blockedWallSegments: walls.filter((building) => !isTileWalkable(game, building.x, building.y, playerTribe)).length,
        passableGateSegments: gates.filter((building) => isTileWalkable(game, building.x, building.y, building.tribeId)).length,
        passableGatesForPlayer: gates.filter((building) => isTileWalkable(game, building.x, building.y, playerTribe)).length,
        operatedGateIds,
        activeAccessTreatyIds,
        activeSabotageGateIds,
        placementPreview: latestPlan.placementPreview ?? plans.find((plan) => plan.placementPreview)?.placementPreview,
        routeBlockedByPlacementCount: latestPlan.placementPreview?.routeBlockedByPlacementCount ?? 0,
        maxAddedRouteSteps: latestPlan.placementPreview?.maxAddedRouteSteps ?? 0,
        centerX: xs.length > 0 ? Number((xs.reduce((sum, x) => sum + x, 0) / xs.length).toFixed(2)) : latestPlan.requestedX ?? latestPlan.x,
        centerY: ys.length > 0 ? Number((ys.reduce((sum, y) => sum + y, 0) / ys.length).toFixed(2)) : latestPlan.requestedY ?? latestPlan.y,
        latestIntent: latestPlan.fortificationIntent,
        latestStrategy: latestPlan.perimeterStrategy
      };
    })
    .filter((group) => group.visibleSegmentCount > 0)
    .sort((left, right) => right.visibleSegmentCount - left.visibleSegmentCount || left.groupId.localeCompare(right.groupId))
    .slice(0, 12);
}

function countResourceLabelTelemetry(
  game: GameState,
  tier: LabelTier,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): { visible: number; suppressed: number; potential: number; forestHints: number } {
  let visible = 0;
  let suppressed = 0;
  let potential = 0;
  let forestHints = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const tile = game.map[tileIndex(x, y)];
      if (tile.resource && tile.resource.amount > 0 && tile.resource.hp > 0) {
        potential += 1;
        if (shouldRenderResourceLabel(tile.resource.type, tier)) visible += 1;
        else suppressed += 1;
      } else if (tile.terrain === "forest" && shouldRenderForestHintLabel(tier) && (x * 7 + y * 11) % 41 === 0) {
        forestHints += 1;
      }
    }
  }
  return { visible, suppressed, potential, forestHints };
}

function countResourceSpriteTelemetry(
  game: GameState,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): { visible: number; scarceVisible: number } {
  let visible = 0;
  let scarceVisible = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const resource = game.map[tileIndex(x, y)].resource;
      if (!resource || resource.amount <= 0 || resource.hp <= 0) continue;
      visible += 1;
      if (scarceResourceTypes.has(resource.type)) scarceVisible += 1;
    }
  }
  return { visible, scarceVisible };
}

function resetResourceSpritePool(): void {
  activeResourceSpriteCount = 0;
  for (const sprite of resourceSpritePool) sprite.visible = false;
}

function acquireResourceSprite(layer: Container, texture: Texture): Sprite {
  let sprite = resourceSpritePool[activeResourceSpriteCount];
  if (!sprite) {
    sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    resourceSpritePool.push(sprite);
    layer.addChild(sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  sprite.visible = true;
  activeResourceSpriteCount += 1;
  return sprite;
}

function resetBuildingSpritePool(): void {
  activeBuildingSpriteCount = 0;
  for (const sprite of buildingSpritePool) sprite.visible = false;
}

function acquireBuildingSprite(texture: Texture): Sprite {
  let sprite = buildingSpritePool[activeBuildingSpriteCount];
  if (!sprite) {
    sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    buildingSpritePool.push(sprite);
    buildingSpriteLayer.addChild(sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  sprite.visible = true;
  activeBuildingSpriteCount += 1;
  return sprite;
}

function resetUnitSpritePool(): void {
  activeUnitSpriteCount = 0;
  for (const sprite of unitSpritePool) sprite.visible = false;
}

function acquireUnitSprite(texture: Texture): Sprite {
  let sprite = unitSpritePool[activeUnitSpriteCount];
  if (!sprite) {
    sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    unitSpritePool.push(sprite);
    unitSpriteLayer.addChild(sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  sprite.visible = true;
  activeUnitSpriteCount += 1;
  return sprite;
}

function resetProjectileSpritePool(): void {
  activeProjectileSpriteCount = 0;
  for (const sprite of projectileSpritePool) sprite.visible = false;
}

function acquireProjectileSprite(texture: Texture): Sprite {
  let sprite = projectileSpritePool[activeProjectileSpriteCount];
  if (!sprite) {
    sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    projectileSpritePool.push(sprite);
    projectileSpriteLayer.addChild(sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  sprite.visible = true;
  activeProjectileSpriteCount += 1;
  return sprite;
}

function resetPacketSpritePool(): void {
  activePacketSpriteCount = 0;
  for (const sprite of packetSpritePool) sprite.visible = false;
}

function acquirePacketSprite(texture: Texture): Sprite {
  let sprite = packetSpritePool[activePacketSpriteCount];
  if (!sprite) {
    sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    packetSpritePool.push(sprite);
    packetSpriteLayer.addChild(sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  sprite.visible = true;
  activePacketSpriteCount += 1;
  return sprite;
}

function resetMapTextPool(): void {
  activeMapTextCount = 0;
}

function acquireMapText(layer: Container, text: string, fontSize: number, fill: string, anchorX = 0.5, anchorY = 0.5): Text {
  const style = {
    fontFamily: "Arial",
    fontSize,
    fontWeight: "700" as const,
    fill,
    stroke: { color: "#080706", width: Math.max(2, Math.round(fontSize * 0.28)) }
  };
  let label = mapTextPool[activeMapTextCount];
  if (!label) {
    label = new Text({ text, style });
    mapTextPool.push(label);
  } else {
    label.text = text;
    label.style = style;
  }
  label.visible = true;
  label.anchor.set(anchorX, anchorY);
  layer.addChild(label);
  activeMapTextCount += 1;
  return label;
}

function createVisualTextureAtlas(): VisualTextureAtlas {
  return {
    resources: Object.fromEntries(resourceTypes.map((type) => [type, makeAtlasTexture((graphics, size) => drawResourceTexture(graphics, type, size))])) as Record<
      ResourceType,
      Texture
    >,
    buildings: Object.fromEntries(
      buildingTypes.map((type) => [
        type,
        Object.fromEntries(
          buildingVisualStates.map((state) => [state, makeAtlasTexture((graphics, size) => drawBuildingTexture(graphics, type, size, state))])
        ) as Record<BuildingVisualState, Texture>
      ])
    ) as Record<BuildingType, Record<BuildingVisualState, Texture>>,
    units: Object.fromEntries(
      unitTypes.map((type) => [
        type,
        Object.fromEntries(unitVisualStates.map((state) => [state, makeAtlasTexture((graphics, size) => drawUnitTexture(graphics, type, size, state))])) as Record<
          UnitVisualState,
          Texture
        >
      ])
    ) as Record<UnitType, Record<UnitVisualState, Texture>>,
    diplomacy: Object.fromEntries(
      diplomacyTextureTypes.map((type) => [type, makeAtlasTexture((graphics, size) => drawDiplomacyTexture(graphics, type, size))])
    ) as Record<DiplomacyTextureType, Texture>,
    projectiles: Object.fromEntries(
      projectileTypes.map((type) => [type, makeAtlasTexture((graphics, size) => drawProjectileTexture(graphics, type, size))])
    ) as Record<ProjectileType, Texture>
  };
}

function makeAtlasTexture(draw: (graphics: Graphics, size: number) => void): Texture {
  const size = 64;
  const graphics = new Graphics();
  graphics.rect(0, 0, size, size).fill({ color: 0x000000, alpha: 0 });
  draw(graphics, size);
  const texture = app.renderer.generateTexture(graphics);
  graphics.destroy();
  return texture;
}

function drawAtlasSparkle(graphics: Graphics, x: number, y: number, size = 3, color = 0xffffff, alpha = 0.84): void {
  graphics.moveTo(x - size, y).lineTo(x + size, y).moveTo(x, y - size).lineTo(x, y + size).stroke({ color, width: 1.3, alpha });
}

function drawDiplomacyTexture(graphics: Graphics, type: DiplomacyTextureType, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  graphics.ellipse(cx, cy + 16, 17, 5).fill({ color: 0x080706, alpha: 0.26 });
  if (type === "packet_target") {
    graphics.circle(cx, cy + 1, 19).fill({ color: 0x2b2117, alpha: 0.78 }).stroke({ color: 0x080706, width: 2.2, alpha: 0.84 });
    graphics.circle(cx, cy + 1, 14).fill({ color: 0xf2d28b, alpha: 0.92 }).stroke({ color: 0x5d3714, width: 1.8, alpha: 0.9 });
    graphics
      .moveTo(cx - 9, cy - 2)
      .lineTo(cx, cy - 11)
      .lineTo(cx + 9, cy - 2)
      .lineTo(cx + 7, cy + 11)
      .lineTo(cx - 7, cy + 11)
      .closePath()
      .fill({ color: 0x9b5b31, alpha: 0.9 })
      .stroke({ color: 0x43230f, width: 1.4, alpha: 0.86 });
    graphics.rect(cx - 3, cy + 3, 6, 8).fill({ color: 0x442917, alpha: 0.9 });
    drawAtlasSparkle(graphics, cx + 7, cy - 8, 2.2, 0xfff2b6, 0.72);
    return;
  }

  const returning = type === "packet_returning";
  const paper = returning ? 0xffefc5 : 0xf6e4ba;
  const paperDark = returning ? 0xe4bf78 : 0xd2aa67;
  const ribbon = returning ? 0x5fb8e8 : 0xcf4f3f;
  graphics.roundRect(cx - 18, cy - 9, 36, 20, 5).fill(paper).stroke({ color: 0x4d3217, width: 2, alpha: 0.9 });
  graphics.circle(cx - 17, cy + 1, 5).fill(paperDark).stroke({ color: 0x4d3217, width: 1.4, alpha: 0.88 });
  graphics.circle(cx + 17, cy + 1, 5).fill(paperDark).stroke({ color: 0x4d3217, width: 1.4, alpha: 0.88 });
  graphics.moveTo(cx - 11, cy - 5).lineTo(cx + 11, cy - 5).moveTo(cx - 9, cy + 7).lineTo(cx + 9, cy + 7).stroke({ color: 0x7b5830, width: 1.2, alpha: 0.58 });
  if (returning) {
    graphics.moveTo(cx - 13, cy - 4).lineTo(cx, cy + 4).lineTo(cx + 13, cy - 4).stroke({ color: 0x7b5830, width: 1.5, alpha: 0.72 });
    graphics.rect(cx - 18, cy + 4, 36, 4).fill({ color: ribbon, alpha: 0.74 });
  } else {
    graphics.rect(cx - 4, cy - 9, 8, 20).fill({ color: ribbon, alpha: 0.62 });
  }
  graphics.circle(cx + 5, cy + 3, 4.4).fill({ color: ribbon, alpha: 0.92 }).stroke({ color: 0x3f1e17, width: 1, alpha: 0.78 });
  drawAtlasSparkle(graphics, cx - 9, cy - 9, returning ? 2.1 : 1.6, 0xfff6ce, returning ? 0.74 : 0.5);
}

function drawProjectileTexture(graphics: Graphics, type: ProjectileType, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  if (type === "arrow") {
    graphics.moveTo(cx - 22, cy).lineTo(cx + 16, cy).stroke({ color: 0x21150c, width: 5, alpha: 0.82 });
    graphics.moveTo(cx - 22, cy).lineTo(cx + 15, cy).stroke({ color: 0xe9d2a2, width: 2.4, alpha: 0.98 });
    graphics
      .moveTo(cx + 20, cy)
      .lineTo(cx + 10, cy - 6)
      .lineTo(cx + 12, cy)
      .lineTo(cx + 10, cy + 6)
      .closePath()
      .fill({ color: 0xf7e6b7, alpha: 0.96 })
      .stroke({ color: 0x24130a, width: 1.2, alpha: 0.86 });
    graphics.moveTo(cx - 18, cy).lineTo(cx - 25, cy - 5).moveTo(cx - 18, cy).lineTo(cx - 25, cy + 5).stroke({ color: 0xb86d4b, width: 2, alpha: 0.72 });
    return;
  }
  if (type === "turret_bolt") {
    graphics.moveTo(cx - 24, cy).lineTo(cx + 18, cy).stroke({ color: 0x07121b, width: 8, alpha: 0.62 });
    graphics.moveTo(cx - 21, cy).lineTo(cx + 15, cy).stroke({ color: 0x68ccff, width: 5, alpha: 0.92 });
    graphics.moveTo(cx - 5, cy).lineTo(cx + 22, cy).stroke({ color: 0xf7fbff, width: 2.4, alpha: 0.98 });
    graphics.circle(cx + 19, cy, 5.5).fill({ color: 0xe8f5ff, alpha: 0.8 }).stroke({ color: 0x53b9ff, width: 1.8, alpha: 0.92 });
    graphics.circle(cx + 22, cy - 1.5, 2.3).fill({ color: 0xffffff, alpha: 0.86 });
    return;
  }
  graphics.moveTo(cx - 24, cy).lineTo(cx + 8, cy).stroke({ color: 0x1b1208, width: 10, alpha: 0.5 });
  graphics.moveTo(cx - 22, cy).lineTo(cx + 9, cy).stroke({ color: 0xff7a2f, width: 6, alpha: 0.7 });
  graphics.moveTo(cx - 8, cy).lineTo(cx + 22, cy).stroke({ color: 0xfff0a4, width: 3, alpha: 0.92 });
  graphics.circle(cx + 5, cy, 12).fill({ color: 0x2b2925, alpha: 0.98 }).stroke({ color: 0xffed9a, width: 3, alpha: 0.96 });
  graphics.circle(cx + 1, cy - 3, 3).fill({ color: 0xded7c5, alpha: 0.96 });
  graphics.circle(cx + 22, cy, 4).fill({ color: 0xfff0a4, alpha: 0.78 });
}

function drawResourceTexture(graphics: Graphics, type: ResourceType, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  graphics.ellipse(cx, cy + 14, 15, 5).fill({ color: 0x090806, alpha: 0.26 });
  if (type === "gold") {
    graphics.regularPoly(cx - 1, cy + 5, 16, 7).fill(0xb46d18).stroke({ color: 0x4d2c07, width: 2, alpha: 0.82 });
    graphics.circle(cx - 7, cy + 3, 7).fill(0xe7a938).stroke({ color: 0x5d3609, width: 2 });
    graphics.circle(cx + 3, cy + 1, 8).fill(0xffd96b).stroke({ color: 0x6b430d, width: 2 });
    graphics.circle(cx + 9, cy + 8, 5).fill(0xf7bc44).stroke({ color: 0x5d3609, width: 1.5 });
    drawAtlasSparkle(graphics, cx + 1, cy - 2, 3.2, 0xfff2b6, 0.9);
    drawAtlasSparkle(graphics, cx + 10, cy + 3, 2.4, 0xfff2b6, 0.72);
    return;
  }
  if (type === "food") {
    graphics.rect(cx - 15, cy + 1, 30, 16).fill({ color: 0x5e8f3f, alpha: 0.9 }).stroke({ color: 0x2f4d20, width: 2 });
    graphics.rect(cx - 13, cy + 4, 26, 10).fill({ color: 0x8f7c36, alpha: 0.72 });
    for (let i = 0; i < 6; i += 1) {
      const x = cx - 10 + i * 5;
      graphics.moveTo(x, cy + 14).lineTo(x + 2, cy - 10).stroke({ color: 0xd9bc52, width: 2, alpha: 0.95 });
      graphics.circle(x + 1, cy - 9, 2.2).fill(0xf2db72);
    }
    graphics.rect(cx - 15, cy + 9, 30, 5).fill({ color: 0x8d5f35, alpha: 0.84 });
    return;
  }
  if (type === "wood") {
    graphics.roundRect(cx - 15, cy - 2, 30, 8, 4).fill(0x9b6a3b).stroke({ color: 0x432816, width: 2 });
    graphics.roundRect(cx - 12, cy + 7, 26, 8, 4).fill(0xc08a52).stroke({ color: 0x432816, width: 2 });
    graphics.circle(cx - 10, cy + 2, 3).stroke({ color: 0x5b351b, width: 1.4, alpha: 0.9 });
    graphics.circle(cx + 9, cy + 11, 3).stroke({ color: 0x5b351b, width: 1.4, alpha: 0.9 });
    graphics.circle(cx - 4, cy - 11, 10).fill(0x3f8d4c).stroke({ color: 0x1e4426, width: 2 });
    graphics.circle(cx + 7, cy - 13, 8).fill(0x58a85e).stroke({ color: 0x1e4426, width: 1.5 });
    graphics.moveTo(cx - 9, cy - 14).lineTo(cx - 3, cy - 20).lineTo(cx + 3, cy - 13).stroke({ color: 0x9fdc72, width: 1.3, alpha: 0.65 });
    return;
  }
  if (type === "stone") {
    graphics.roundRect(cx - 15, cy + 1, 18, 14, 4).fill(0xa7a297).stroke({ color: 0x3a3834, width: 2 });
    graphics.roundRect(cx - 3, cy - 8, 17, 19, 4).fill(0xc9c3b8).stroke({ color: 0x4d4942, width: 2 });
    graphics.roundRect(cx + 5, cy + 6, 10, 9, 3).fill(0x89847a).stroke({ color: 0x34312c, width: 1.5 });
    graphics.moveTo(cx - 1, cy - 4).lineTo(cx + 9, cy - 2).moveTo(cx - 11, cy + 6).lineTo(cx, cy + 8).stroke({ color: 0xf1eadc, width: 1.2, alpha: 0.52 });
    return;
  }
  if (type === "clay") {
    graphics.roundRect(cx - 15, cy - 8, 30, 10, 2).fill(0xb7653f).stroke({ color: 0x4a251b, width: 2 });
    graphics.roundRect(cx - 13, cy + 4, 26, 10, 2).fill(0xd47a4b).stroke({ color: 0x4a251b, width: 2 });
    graphics.moveTo(cx, cy - 7).lineTo(cx, cy + 13).stroke({ color: 0x6a3221, width: 1.2, alpha: 0.76 });
    graphics.moveTo(cx - 12, cy - 2).lineTo(cx + 12, cy - 2).stroke({ color: 0x6a3221, width: 1.2, alpha: 0.76 });
    graphics.moveTo(cx - 11, cy + 9).lineTo(cx + 11, cy + 9).stroke({ color: 0xffb37c, width: 1, alpha: 0.52 });
    return;
  }
  if (type === "limestone") {
    graphics.roundRect(cx - 16, cy - 8, 32, 23, 3).fill(0xded7bd).stroke({ color: 0x5f5a4a, width: 2 });
    graphics.moveTo(cx - 13, cy).lineTo(cx + 13, cy).stroke({ color: 0x9f967b, width: 1.4, alpha: 0.82 });
    graphics.moveTo(cx - 3, cy - 8).lineTo(cx - 3, cy).moveTo(cx + 7, cy).lineTo(cx + 7, cy + 14).stroke({ color: 0x9f967b, width: 1.4, alpha: 0.82 });
    graphics.circle(cx - 8, cy - 3, 1.5).fill({ color: 0xf7f1d7, alpha: 0.86 });
    graphics.circle(cx + 9, cy + 7, 1.3).fill({ color: 0xf7f1d7, alpha: 0.72 });
    return;
  }
  if (type === "iron") {
    graphics.regularPoly(cx - 4, cy + 4, 14, 6).fill(0x6f7d88).stroke({ color: 0x1d252b, width: 2 });
    graphics.regularPoly(cx + 8, cy + 7, 9, 5).fill(0x495660).stroke({ color: 0x1d252b, width: 1.5 });
    graphics.circle(cx - 8, cy, 2.4).fill({ color: 0xc3d0d7, alpha: 0.9 });
    graphics.circle(cx + 2, cy + 4, 1.8).fill({ color: 0xdbe6eb, alpha: 0.86 });
    graphics.moveTo(cx - 10, cy + 8).lineTo(cx + 5, cy - 2).stroke({ color: 0xbfd6df, width: 1.2, alpha: 0.48 });
    return;
  }
  if (type === "coal") {
    graphics.regularPoly(cx - 5, cy + 5, 13, 6).fill(0x23252a).stroke({ color: 0x090909, width: 2 });
    graphics.regularPoly(cx + 8, cy + 8, 8, 5).fill(0x3a3d44).stroke({ color: 0x090909, width: 1.5 });
    graphics.circle(cx - 8, cy, 2.2).fill({ color: 0x9a9a95, alpha: 0.75 });
    graphics.circle(cx + 1, cy + 7, 1.6).fill({ color: 0xb9b8b0, alpha: 0.65 });
    graphics.moveTo(cx - 13, cy + 11).lineTo(cx + 11, cy + 1).stroke({ color: 0x666a72, width: 1.1, alpha: 0.48 });
    return;
  }
  graphics.regularPoly(cx - 5, cy + 5, 13, 6).fill(0x23252a).stroke({ color: 0x090909, width: 2 });
  graphics.regularPoly(cx + 8, cy + 8, 8, 5).fill(0x3a3d44).stroke({ color: 0x090909, width: 1.5 });
  graphics.circle(cx - 8, cy, 2.2).fill({ color: 0x9a9a95, alpha: 0.75 });
  graphics.circle(cx + 1, cy + 7, 1.6).fill({ color: 0xb9b8b0, alpha: 0.65 });
  graphics.moveTo(cx - 13, cy + 11).lineTo(cx + 11, cy + 1).stroke({ color: 0x666a72, width: 1.1, alpha: 0.48 });
}

function drawBuildingTexture(graphics: Graphics, type: BuildingType, size: number, state: BuildingVisualState = "normal"): void {
  const cx = size / 2;
  const cy = size / 2;
  const accent = () => drawBuildingTextureStateAccent(graphics, type, state, cx, cy);
  graphics.ellipse(cx, cy + 15, 17, 5).fill({ color: 0x090806, alpha: 0.28 });
  if (type === "townHall") {
    graphics.roundRect(cx - 14, cy - 3, 28, 22, 2).fill(0xd8c7a0).stroke({ color: 0x3a2819, width: 2 });
    graphics.moveTo(cx - 17, cy - 3).lineTo(cx, cy - 18).lineTo(cx + 17, cy - 3).closePath().fill(0x945236).stroke({ color: 0x3a2819, width: 2 });
    graphics.rect(cx - 4, cy + 7, 8, 12).fill(0x5b3a25);
    graphics.rect(cx + 7, cy + 2, 6, 6).fill(0x8fc0d2).stroke({ color: 0x2f3d43, width: 1 });
    graphics.rect(cx - 12, cy + 2, 6, 6).fill(0xf5efe0).stroke({ color: 0x3a2819, width: 1 });
    graphics.moveTo(cx, cy - 18).lineTo(cx, cy - 27).lineTo(cx + 9, cy - 23).stroke({ color: 0xf2d28b, width: 2 });
    accent();
    return;
  }
  if (type === "farm") {
    graphics.rect(cx - 17, cy + 3, 34, 13).fill(0x8f7c36).stroke({ color: 0x3c371a, width: 2 });
    for (let i = 0; i < 4; i += 1) {
      graphics.moveTo(cx - 14 + i * 8, cy + 15).lineTo(cx - 9 + i * 8, cy + 3).stroke({ color: 0xddc66b, width: 1.5 });
    }
    graphics.roundRect(cx - 7, cy - 10, 14, 13, 2).fill(0xd5b178).stroke({ color: 0x3a2819, width: 2 });
    graphics.moveTo(cx - 9, cy - 10).lineTo(cx, cy - 18).lineTo(cx + 9, cy - 10).closePath().fill(0xa95b37).stroke({ color: 0x3a2819, width: 2 });
    accent();
    return;
  }
  if (type === "house") {
    graphics.roundRect(cx - 13, cy - 1, 26, 20, 2).fill(0xd0b28c).stroke({ color: 0x3a2819, width: 2 });
    graphics.moveTo(cx - 16, cy - 1).lineTo(cx, cy - 16).lineTo(cx + 16, cy - 1).closePath().fill(0x8f4f35).stroke({ color: 0x3a2819, width: 2 });
    graphics.rect(cx - 4, cy + 7, 8, 12).fill(0x5f3920);
    graphics.rect(cx + 6, cy + 3, 5, 5).fill(0x9cc4cf).stroke({ color: 0x2f3d43, width: 1 });
    graphics.rect(cx - 11, cy + 2, 5, 5).fill(0xf5efe0).stroke({ color: 0x3a2819, width: 1 });
    accent();
    return;
  }
  if (type === "barracks") {
    graphics.roundRect(cx - 15, cy - 3, 30, 21, 2).fill(0xb28b63).stroke({ color: 0x372518, width: 2 });
    graphics.moveTo(cx - 17, cy - 3).lineTo(cx, cy - 18).lineTo(cx + 17, cy - 3).closePath().fill(0x70422c).stroke({ color: 0x372518, width: 2 });
    graphics.rect(cx - 4, cy + 7, 8, 11).fill(0x422819);
    graphics.moveTo(cx + 8, cy - 13).lineTo(cx + 8, cy - 22).lineTo(cx + 16, cy - 18).stroke({ color: 0xeadfbf, width: 2 });
    graphics.moveTo(cx - 12, cy + 4).lineTo(cx - 6, cy - 4).moveTo(cx - 6, cy + 4).lineTo(cx - 12, cy - 4).stroke({ color: 0x422819, width: 1.5, alpha: 0.78 });
    accent();
    return;
  }
  if (type === "market") {
    graphics.roundRect(cx - 15, cy - 1, 30, 19, 2).fill(0xd6b782).stroke({ color: 0x372518, width: 2 });
    for (let i = 0; i < 4; i += 1) {
      graphics.rect(cx - 16 + i * 8, cy - 11, 8, 10).fill(i % 2 === 0 ? 0xf6efe0 : 0xb34f42);
    }
    graphics.moveTo(cx - 17, cy - 11).lineTo(cx + 17, cy - 11).stroke({ color: 0x372518, width: 2 });
    graphics.circle(cx + 8, cy + 9, 4).fill(0xe3bf4d).stroke({ color: 0x67480f, width: 1.5 });
    accent();
    return;
  }
  if (type === "watchtower") {
    graphics.rect(cx - 8, cy - 2, 16, 21).fill(0xa57c51).stroke({ color: 0x332115, width: 2 });
    graphics.rect(cx - 13, cy - 13, 26, 11).fill(0xd0b17a).stroke({ color: 0x332115, width: 2 });
    graphics.rect(cx - 5, cy + 7, 10, 12).fill(0x5f3920);
    graphics.moveTo(cx - 11, cy + 18).lineTo(cx - 16, cy + 23).moveTo(cx + 11, cy + 18).lineTo(cx + 16, cy + 23).stroke({ color: 0x332115, width: 2 });
    graphics.circle(cx, cy - 8, 3).fill(0x8fc0d2).stroke({ color: 0x2f3d43, width: 1.2 });
    graphics.moveTo(cx - 15, cy - 3).lineTo(cx + 15, cy - 3).stroke({ color: 0xeadfbf, width: 1.3, alpha: 0.74 });
    accent();
    return;
  }
  if (type === "wall") {
    graphics.roundRect(cx - 18, cy - 8, 36, 20, 2).fill(0xcac2b4).stroke({ color: 0x2b2925, width: 2 });
    for (let i = 0; i < 4; i += 1) {
      graphics.rect(cx - 17 + i * 9, cy - 15, 7, 8).fill(0xe7ddcb).stroke({ color: 0x2b2925, width: 1.2 });
    }
    graphics.moveTo(cx - 17, cy + 1).lineTo(cx + 17, cy + 1).stroke({ color: 0x837b70, width: 1.2, alpha: 0.8 });
    graphics.moveTo(cx - 5, cy - 8).lineTo(cx - 5, cy + 12).moveTo(cx + 8, cy - 8).lineTo(cx + 8, cy + 12).stroke({ color: 0x837b70, width: 1.2, alpha: 0.8 });
    accent();
    return;
  }
  if (type === "gate") {
    graphics.rect(cx - 18, cy - 8, 36, 20).fill(0xcac2b4).stroke({ color: 0x2b2925, width: 2 });
    graphics.rect(cx - 7, cy - 3, 14, 15).fill(0x68472b).stroke({ color: 0x2b2925, width: 2 });
    graphics.moveTo(cx - 5, cy - 1).lineTo(cx - 5, cy + 11).moveTo(cx, cy - 1).lineTo(cx, cy + 11).moveTo(cx + 5, cy - 1).lineTo(cx + 5, cy + 11).stroke({ color: 0xb99257, width: 1.4 });
    graphics.rect(cx - 15, cy - 16, 8, 9).fill(0xe7ddcb).stroke({ color: 0x2b2925, width: 1.2 });
    graphics.rect(cx + 7, cy - 16, 8, 9).fill(0xe7ddcb).stroke({ color: 0x2b2925, width: 1.2 });
    graphics.moveTo(cx - 13, cy + 4).lineTo(cx + 13, cy + 4).stroke({ color: 0xf2d28b, width: 1.4, alpha: 0.72 });
    accent();
    return;
  }
  if (type === "turret") {
    graphics.roundRect(cx - 11, cy - 3, 22, 22, 3).fill(0xbeb4a4).stroke({ color: 0x2b2925, width: 2 });
    graphics.circle(cx, cy - 7, 10).fill(0xd9c58f).stroke({ color: 0x2b2925, width: 2 });
    graphics.rect(cx - 4, cy - 20, 8, 11).fill(0x45413a).stroke({ color: 0x181510, width: 1.5 });
    graphics.moveTo(cx, cy - 17).lineTo(cx + 15, cy - 20).stroke({ color: 0x45413a, width: 3 });
    graphics.circle(cx + 13, cy - 20, 2.5).fill(0xf2d28b).stroke({ color: 0x181510, width: 1 });
    accent();
    return;
  }
  graphics.roundRect(cx - 11, cy - 3, 22, 22, 3).fill(0xbeb4a4).stroke({ color: 0x2b2925, width: 2 });
  graphics.circle(cx, cy - 7, 10).fill(0xd9c58f).stroke({ color: 0x2b2925, width: 2 });
  graphics.rect(cx - 4, cy - 20, 8, 11).fill(0x45413a).stroke({ color: 0x181510, width: 1.5 });
  graphics.moveTo(cx, cy - 17).lineTo(cx + 15, cy - 20).stroke({ color: 0x45413a, width: 3 });
  graphics.circle(cx + 13, cy - 20, 2.5).fill(0xf2d28b).stroke({ color: 0x181510, width: 1 });
  accent();
}

function drawBuildingTextureStateAccent(graphics: Graphics, type: BuildingType, state: BuildingVisualState, cx: number, cy: number): void {
  if (state === "normal") return;
  if (state === "gate_open") {
    graphics.rect(cx - 9, cy - 3, 18, 16).fill({ color: 0x2d2419, alpha: 0.64 });
    graphics.moveTo(cx - 10, cy + 5).lineTo(cx + 10, cy + 5).stroke({ color: 0x88e68f, width: 2.2, alpha: 0.9 });
    graphics.moveTo(cx + 5, cy).lineTo(cx + 11, cy + 5).lineTo(cx + 5, cy + 10).stroke({ color: 0x88e68f, width: 1.7, alpha: 0.84 });
    return;
  }
  if (state === "gate_closed" || state === "gate_locked") {
    graphics.rect(cx - 10, cy - 3, 20, 16).fill({ color: 0x4b3624, alpha: 0.72 }).stroke({ color: 0x100f0c, width: 1.4, alpha: 0.82 });
    graphics.moveTo(cx - 10, cy + 2).lineTo(cx + 10, cy + 2).moveTo(cx - 9, cy + 8).lineTo(cx + 9, cy + 8).stroke({ color: 0xf2d28b, width: 1.5, alpha: 0.86 });
    if (state === "gate_locked") {
      graphics.roundRect(cx + 2, cy + 1, 8, 8, 2).fill(0xffe17b).stroke({ color: 0x100f0c, width: 1.2 });
      graphics.arc(cx + 6, cy + 1, 3.4, Math.PI, 0).stroke({ color: 0x100f0c, width: 1.2 });
    }
    return;
  }
  if (state === "repairing") {
    graphics.circle(cx, cy + 2, type === "wall" || type === "gate" ? 22 : 18).stroke({ color: 0x7bd8ff, width: 1.8, alpha: 0.64 });
    graphics.moveTo(cx - 17, cy + 14).lineTo(cx - 5, cy + 1).lineTo(cx + 7, cy + 14).stroke({ color: 0x7bd8ff, width: 2.2, alpha: 0.84 });
    graphics.moveTo(cx + 12, cy - 12).lineTo(cx + 20, cy - 4).moveTo(cx + 20, cy - 12).lineTo(cx + 12, cy - 4).stroke({ color: 0xe6fbff, width: 1.8, alpha: 0.88 });
    return;
  }
  const critical = state === "critical";
  const crackColor = critical ? 0x2b0806 : 0x3e2118;
  const rubbleColor = critical ? 0x18120e : 0x4d4034;
  graphics
    .moveTo(cx - 15, cy - 8)
    .lineTo(cx - 7, cy + 1)
    .lineTo(cx - 10, cy + 12)
    .moveTo(cx + 14, cy - 6)
    .lineTo(cx + 5, cy + 4)
    .lineTo(cx + 9, cy + 14)
    .stroke({ color: crackColor, width: critical ? 2.4 : 1.7, alpha: critical ? 0.94 : 0.76 });
  graphics.rect(cx - 17, cy + 13, 8, 5).fill({ color: rubbleColor, alpha: 0.82 });
  graphics.rect(cx + 9, cy + 12, 7, 6).fill({ color: rubbleColor, alpha: 0.74 });
  if (critical) {
    graphics.circle(cx + 13, cy - 13, 4).fill({ color: 0xff6b52, alpha: 0.28 });
    graphics
      .moveTo(cx - 18, cy + 17)
      .lineTo(cx + 18, cy - 12)
      .stroke({ color: 0x7e1f18, width: 2.4, alpha: 0.6 });
  }
}

function drawUnitTexture(graphics: Graphics, type: UnitType, size: number, state: UnitVisualState = "idle"): void {
  const cx = size / 2;
  const cy = size / 2;
  const accent = () => drawUnitTextureStateAccent(graphics, type, state, cx, cy);
  graphics.ellipse(cx, cy + 15, 12, 4).fill({ color: 0x050504, alpha: 0.3 });
  if (type === "sovereign") {
    graphics.moveTo(cx - 12, cy + 14).lineTo(cx, cy - 3).lineTo(cx + 12, cy + 14).closePath().fill(0xd9c58f).stroke({ color: 0x100f0c, width: 2 });
    graphics.circle(cx, cy + 3, 10).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.circle(cx, cy - 9, 6).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx - 8, cy - 14).lineTo(cx - 4, cy - 23).lineTo(cx, cy - 15).lineTo(cx + 4, cy - 23).lineTo(cx + 8, cy - 14).fill(0xf2d28b).stroke({ color: 0x100f0c, width: 1.5 });
    graphics.circle(cx - 2, cy - 10, 1).fill(0x100f0c);
    graphics.circle(cx + 3, cy - 10, 1).fill(0x100f0c);
    accent();
    return;
  }
  if (type === "peon") {
    graphics.circle(cx, cy - 8, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx - 7, cy - 2, 14, 17, 4).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx + 9, cy - 5).lineTo(cx + 17, cy + 10).stroke({ color: 0x100f0c, width: 3 });
    graphics.moveTo(cx + 12, cy + 2).lineTo(cx + 19, cy - 3).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx - 4, cy + 14).lineTo(cx - 9, cy + 20).moveTo(cx + 4, cy + 14).lineTo(cx + 9, cy + 20).stroke({ color: 0x100f0c, width: 2.2 });
    accent();
    return;
  }
  if (type === "sentinel") {
    graphics.moveTo(cx, cy - 18).lineTo(cx + 13, cy + 15).lineTo(cx - 13, cy + 15).closePath().fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.circle(cx, cy - 7, 5).fill(0x8fc0d2).stroke({ color: 0x100f0c, width: 1.5 });
    graphics.circle(cx, cy - 7, 2).fill(0x100f0c);
    graphics.moveTo(cx - 7, cy - 2).lineTo(cx + 7, cy - 2).stroke({ color: 0x100f0c, width: 2 });
    accent();
    return;
  }
  if (type === "messenger") {
    graphics.circle(cx - 4, cy - 10, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx - 10, cy - 3, 16, 15, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx + 4, cy - 9, 15, 10, 2).fill(0xf2d28b).stroke({ color: 0x100f0c, width: 1.5 });
    graphics.moveTo(cx + 5, cy - 8).lineTo(cx + 11, cy - 3).lineTo(cx + 18, cy - 8).stroke({ color: 0x7a5620, width: 1.2 });
    graphics.moveTo(cx - 6, cy + 11).lineTo(cx - 15, cy + 18).moveTo(cx + 2, cy + 11).lineTo(cx + 12, cy + 18).stroke({ color: 0x100f0c, width: 3 });
    accent();
    return;
  }
  if (type === "trader") {
    graphics.circle(cx - 4, cy - 9, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx - 10, cy - 2, 16, 17, 4).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx + 5, cy + 1, 12, 13, 3).fill(0xd6b782).stroke({ color: 0x100f0c, width: 2 });
    graphics.rect(cx + 8, cy + 4, 6, 5).fill(0xf2d28b).stroke({ color: 0x7a5620, width: 1 });
    graphics.circle(cx + 7, cy + 16, 3).fill(0x100f0c);
    graphics.circle(cx + 15, cy + 16, 3).fill(0x100f0c);
    accent();
    return;
  }
  if (type === "siege_engine") {
    graphics.roundRect(cx - 17, cy - 9, 31, 17, 3).fill(0x8f6b45).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx - 15, cy - 9).lineTo(cx - 4, cy - 18).lineTo(cx + 11, cy - 9).closePath().fill(0xb99a6c).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx + 5, cy - 2, 18, 6, 2).fill(0x5a3923).stroke({ color: 0x100f0c, width: 1.5 });
    graphics.moveTo(cx + 21, cy + 1).lineTo(cx + 27, cy - 2).lineTo(cx + 27, cy + 4).closePath().fill(0x3a2114);
    graphics.circle(cx - 10, cy + 11, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    graphics.circle(cx + 10, cy + 11, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    graphics.moveTo(cx - 14, cy + 1).lineTo(cx + 12, cy + 1).stroke({ color: 0xd7c09a, width: 2, alpha: 0.85 });
    accent();
    return;
  }
  if (type === "battering_ram") {
    graphics.roundRect(cx - 18, cy - 7, 36, 15, 4).fill(0x775238).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx - 12, cy - 14, 24, 8, 2).fill(0xb08a5e).stroke({ color: 0x100f0c, width: 1.5 });
    graphics.moveTo(cx + 12, cy).lineTo(cx + 25, cy).stroke({ color: 0x3a2114, width: 5 });
    graphics.moveTo(cx + 22, cy - 4).lineTo(cx + 29, cy).lineTo(cx + 22, cy + 4).closePath().fill(0x2b1b12);
    graphics.circle(cx - 11, cy + 12, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    graphics.circle(cx + 11, cy + 12, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    accent();
    return;
  }
  if (type === "catapult") {
    graphics.roundRect(cx - 16, cy + 1, 31, 10, 3).fill(0x8f6b45).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx - 11, cy + 2).lineTo(cx + 5, cy - 16).lineTo(cx + 16, cy + 2).stroke({ color: 0x100f0c, width: 3 });
    graphics.moveTo(cx - 5, cy - 3).lineTo(cx + 15, cy - 17).stroke({ color: 0x5a3923, width: 4 });
    graphics.circle(cx + 18, cy - 19, 4).fill(0x2b2925).stroke({ color: 0xf5efe0, width: 1.2 });
    graphics.circle(cx - 10, cy + 13, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    graphics.circle(cx + 10, cy + 13, 5).fill(0x2a2018).stroke({ color: 0xf5efe0, width: 1.5 });
    accent();
    return;
  }
  if (type === "militia") {
    graphics.circle(cx, cy - 11, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx - 10, cy - 3).lineTo(cx, cy + 16).lineTo(cx + 10, cy - 3).closePath().fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx + 12, cy - 15).lineTo(cx + 12, cy + 15).stroke({ color: 0x100f0c, width: 3 });
    graphics.moveTo(cx + 8, cy - 10).lineTo(cx + 12, cy - 18).lineTo(cx + 16, cy - 10).stroke({ color: 0x100f0c, width: 2 });
    graphics.circle(cx - 9, cy + 2, 5).fill(0x9fb0ba).stroke({ color: 0x100f0c, width: 1.5 });
    accent();
    return;
  }
  if (type === "archer") {
    graphics.circle(cx - 1, cy - 11, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.roundRect(cx - 8, cy - 4, 14, 18, 4).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
    graphics.moveTo(cx + 12, cy - 14).quadraticCurveTo(cx + 23, cy, cx + 12, cy + 15).stroke({ color: 0x100f0c, width: 3 });
    graphics.moveTo(cx + 11, cy + 1).lineTo(cx + 23, cy - 5).stroke({ color: 0x100f0c, width: 2 });
    accent();
    return;
  }
  graphics.circle(cx - 1, cy - 11, 5).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
  graphics.roundRect(cx - 8, cy - 4, 14, 18, 4).fill(0xf5efe0).stroke({ color: 0x100f0c, width: 2 });
  graphics.moveTo(cx + 12, cy - 14).quadraticCurveTo(cx + 23, cy, cx + 12, cy + 15).stroke({ color: 0x100f0c, width: 3 });
  graphics.moveTo(cx + 11, cy + 1).lineTo(cx + 23, cy - 5).stroke({ color: 0x100f0c, width: 2 });
  accent();
}

function drawUnitTextureStateAccent(graphics: Graphics, type: UnitType, state: UnitVisualState, cx: number, cy: number): void {
  if (state === "idle") return;
  if (state === "move") {
    graphics.circle(cx - 12, cy + 20, 2).fill({ color: 0xd8c56b, alpha: 0.68 });
    graphics.circle(cx + 9, cy + 18, 1.6).fill({ color: 0xf5efe0, alpha: 0.58 });
    graphics.moveTo(cx - 9, cy + 18).lineTo(cx - 16, cy + 22).stroke({ color: 0x100f0c, width: 1.4, alpha: 0.52 });
    return;
  }
  if (state === "gather") {
    graphics.moveTo(cx + 11, cy - 12).lineTo(cx + 22, cy + 5).stroke({ color: 0x3d2818, width: 3, alpha: 0.9 });
    graphics.moveTo(cx + 18, cy - 2).lineTo(cx + 25, cy - 7).stroke({ color: 0xc7c1b3, width: 2, alpha: 0.95 });
    graphics.circle(cx + 22, cy + 7, 2.5).fill({ color: 0xf2d28b, alpha: 0.85 }).stroke({ color: 0x100f0c, width: 0.8, alpha: 0.72 });
    return;
  }
  if (state === "deliver") {
    graphics.roundRect(cx + 9, cy - 14, 13, 9, 2).fill({ color: 0xf2d28b, alpha: 0.95 }).stroke({ color: 0x100f0c, width: 1.2 });
    graphics.moveTo(cx + 10, cy - 13).lineTo(cx + 15, cy - 9).lineTo(cx + 21, cy - 13).stroke({ color: 0x7a5620, width: 1.1, alpha: 0.82 });
    graphics.circle(cx + 20, cy - 5, 1.8).fill({ color: 0xffffff, alpha: 0.72 });
    return;
  }
  if (state === "repair") {
    graphics.circle(cx, cy, type === "siege_engine" || type === "battering_ram" || type === "catapult" ? 22 : 18).stroke({ color: 0x7bd8ff, width: 1.5, alpha: 0.58 });
    graphics.moveTo(cx - 17, cy - 16).lineTo(cx - 9, cy - 8).moveTo(cx - 9, cy - 16).lineTo(cx - 17, cy - 8).stroke({ color: 0x7bd8ff, width: 2.2, alpha: 0.82 });
    return;
  }
  if (state === "attack") {
    graphics.moveTo(cx + 12, cy - 17).lineTo(cx + 26, cy - 27).stroke({ color: 0xffe17b, width: 2.4, alpha: 0.9 });
    graphics.moveTo(cx + 21, cy - 27).lineTo(cx + 27, cy - 27).lineTo(cx + 25, cy - 21).stroke({ color: 0xff6b52, width: 1.8, alpha: 0.78 });
    graphics.circle(cx + 17, cy - 13, 3).fill({ color: 0xff6b52, alpha: 0.38 });
    return;
  }
  if (state === "scout") {
    graphics.circle(cx, cy - 3, 20).stroke({ color: 0x8fc0d2, width: 1.3, alpha: 0.56 });
    graphics.moveTo(cx, cy - 3).lineTo(cx + 18, cy - 17).stroke({ color: 0x8fc0d2, width: 1.5, alpha: 0.82 });
    graphics.circle(cx + 18, cy - 17, 2).fill({ color: 0xe6fbff, alpha: 0.88 });
  }
}

function drawTerrain(game: GameState, graphics: Graphics): void {
  graphics.clear();
  drawTerrainChunk(game, graphics, 0, MAP_SIZE, 0, MAP_SIZE);
}

function drawTerrainChunk(game: GameState, graphics: Graphics, minX: number, maxX: number, minY: number, maxY: number): void {
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const tile = game.map[tileIndex(x, y)];
      const shade = terrainShade(x, y, game.seed);
      graphics.rect(x * TILE, y * TILE, TILE, TILE).fill(shadeColor(terrainColor(tile.terrain), shade));
      drawTerrainDetail(graphics, x, y, tile.terrain, shade);
    }
  }
  drawStrategicGrid(graphics, minX, maxX, minY, maxY);
}

function terrainAmbientMark(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 37, 73856093) ^ Math.imul(y + 19, 19349663) ^ Math.imul(seed + 11, 83492791);
  value ^= value >>> 13;
  return Math.abs(value);
}

function drawAmbientTerrain(game: GameState, graphics: Graphics): void {
  graphics.clear();
  activeAmbientTerrainCueCount = 0;
  const bounds = currentViewportTileBounds(2);
  const now = renderClockMs || performance.now();
  const cueLimit = camera.scale < 0.56 ? 140 : 220;

  outer: for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (activeAmbientTerrainCueCount >= cueLimit) break outer;
      const terrain = game.map[tileIndex(x, y)].terrain;
      const mark = terrainAmbientMark(x, y, game.seed);
      const px = x * TILE;
      const py = y * TILE;
      const phase = now / 480 + (mark % 97) * 0.11;

      if (terrain === "water") {
        if (mark % 2 !== 0) continue;
        const wave = Math.sin(phase) * 1.4;
        graphics
          .moveTo(px + 3, py + 8 + wave)
          .lineTo(px + 8, py + 6 - wave * 0.3)
          .lineTo(px + 14, py + 8 + wave * 0.45)
          .lineTo(px + 20, py + 6 - wave * 0.2)
          .stroke({ color: 0xd7fbff, width: 1.1, alpha: 0.24 + Math.max(0, Math.sin(phase)) * 0.2 });
        activeAmbientTerrainCueCount += 1;
        continue;
      }

      if (camera.scale < 0.56) continue;

      if (terrain === "forest") {
        if (mark % 11 !== 0) continue;
        const drift = Math.sin(phase) * 2.2;
        graphics.circle(px + 8 + drift, py + 7 + Math.cos(phase) * 1.3, 1.4).fill({ color: 0xa6df6b, alpha: 0.32 });
        graphics.moveTo(px + 13 - drift * 0.4, py + 13).lineTo(px + 17 - drift * 0.2, py + 10).stroke({ color: 0x6fc05c, width: 0.9, alpha: 0.24 });
        activeAmbientTerrainCueCount += 1;
        continue;
      }

      if (terrain === "road") {
        if (mark % 13 !== 0) continue;
        const offset = (now / 310 + (mark % TILE)) % TILE;
        graphics.circle(px + offset, py + TILE / 2 + Math.sin(phase) * 2.5, 1.1).fill({ color: 0xf0d79a, alpha: 0.24 });
        activeAmbientTerrainCueCount += 1;
        continue;
      }

      if (terrain === "hill" || terrain === "mountain") {
        if (mark % 17 !== 0) continue;
        graphics
          .moveTo(px + 6, py + 8 + Math.sin(phase) * 0.8)
          .lineTo(px + 13, py + 6)
          .lineTo(px + 18, py + 9 + Math.cos(phase) * 0.7)
          .stroke({ color: terrain === "mountain" ? 0xf0eee6 : 0xd5c88d, width: 0.9, alpha: 0.18 + Math.max(0, Math.sin(phase)) * 0.16 });
        activeAmbientTerrainCueCount += 1;
        continue;
      }

      if (terrain === "grass" && mark % 31 === 0) {
        const sway = Math.sin(phase) * 1.4;
        graphics.moveTo(px + 6, py + 17).lineTo(px + 8 + sway, py + 12).stroke({ color: 0xc2dc74, width: 0.8, alpha: 0.18 });
        activeAmbientTerrainCueCount += 1;
      }
    }
  }
}

function drawResourceSprites(game: GameState, layer: Container): void {
  const bounds = currentViewportTileBounds(3);
  const textures = visualTextures?.resources;
  if (!textures) return;
  const now = renderClockMs || performance.now();
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const resource = game.map[tileIndex(x, y)].resource;
      if (!resource || resource.amount <= 0 || resource.hp <= 0) continue;
      const texture = textures[resource.type];
      if (!texture) continue;
      const sprite = acquireResourceSprite(layer, texture);
      const scarce = scarceResourceTypes.has(resource.type);
      const health = resource.maxHp > 0 ? clamp(resource.hp / resource.maxHp, 0.25, 1) : 1;
      const pulse = scarce ? 1 + Math.sin(now / 480 + x * 0.7 + y * 0.4) * 0.05 : 1;
      const scale = TILE * (scarce ? 1.25 : 1.08) * pulse * (0.92 + health * 0.08);
      sprite.x = x * TILE + TILE / 2;
      sprite.y = y * TILE + TILE / 2;
      sprite.width = scale;
      sprite.height = scale;
      sprite.rotation = scarce ? Math.sin(now / 820 + x * 0.4) * 0.025 : (((x * 11 + y * 7) % 7) - 3) * 0.008;
      sprite.alpha = 0.68 + health * 0.32;
    }
  }
}

type RouteVisual = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  returning: boolean;
};

function collectRouteVisuals(game: GameState): RouteVisual[] {
  const routes: RouteVisual[] = [];
  for (const packet of Object.values(game.packets)) {
    const carrier = packet.carrierUnitId ? game.units[packet.carrierUnitId] : undefined;
    if (!carrier || packet.state === "COMPLETED") continue;
    const target = packet.state === "IN_TRANSIT_RETURN" ? packet.returnTo : packet.destination;
    routes.push({
      id: packet.id,
      fromX: carrier.x * TILE + TILE / 2,
      fromY: carrier.y * TILE + TILE / 2,
      toX: target.x * TILE + TILE / 2,
      toY: target.y * TILE + TILE / 2,
      color: tribeConfig[packet.originTribeId].color,
      returning: packet.state === "IN_TRANSIT_RETURN"
    });
  }
  return routes;
}

function routeStaticSignature(routes: RouteVisual[]): string {
  return routes
    .map((route) => `${route.id}:${route.fromX},${route.fromY}>${route.toX},${route.toY}:${route.color}:${route.returning ? 1 : 0}`)
    .join("|");
}

function drawRoutes(game: GameState): void {
  const now = renderClockMs || performance.now();
  const routes = collectRouteVisuals(game);
  activeRouteVisualCount = routes.length;
  resetPacketSpritePool();
  const signature = routeStaticSignature(routes);
  if (signature !== lastRouteStaticSignature) {
    routeStaticGraphics.clear();
    for (const route of routes) {
      routeStaticGraphics
        .moveTo(route.fromX, route.fromY)
        .lineTo(route.toX, route.toY)
        .stroke({ color: 0x080706, width: 5, alpha: 0.28 });
      routeStaticGraphics
        .moveTo(route.fromX, route.fromY)
        .lineTo(route.toX, route.toY)
        .stroke({ color: route.color, width: route.returning ? 2.4 : 1.8, alpha: route.returning ? 0.84 : 0.68 });
      routeStaticGraphics.circle(route.toX, route.toY, TILE * 0.28).stroke({ color: route.color, width: 1.4, alpha: 0.46 });
    }
    lastRouteStaticSignature = signature;
  }
  routePulseGraphics.clear();
  for (const route of routes) {
    const dx = route.toX - route.fromX;
    const dy = route.toY - route.fromY;
    const routePulse = (now / 900 + route.id.length * 0.071) % 1;
    const pulseX = route.fromX + dx * routePulse;
    const pulseY = route.fromY + dy * routePulse;
    routePulseGraphics
      .circle(pulseX, pulseY, route.returning ? 4 : 3.2)
      .fill({ color: route.returning ? 0xf2d28b : route.color, alpha: 0.64 })
      .stroke({ color: 0x080706, width: 1, alpha: 0.64 });
    drawRoutePacketSprites(route, pulseX, pulseY, Math.atan2(dy, dx), now);
  }
}

function drawRoutePacketSprites(route: RouteVisual, pulseX: number, pulseY: number, angle: number, now: number): void {
  const textures = visualTextures?.diplomacy;
  if (!textures) return;
  if (isWorldPointInViewport(route.toX, route.toY, TILE * 3)) {
    const target = acquirePacketSprite(textures.packet_target);
    target.x = route.toX;
    target.y = route.toY;
    target.width = 20;
    target.height = 20;
    target.rotation = Math.sin(now / 820 + route.id.length) * 0.045;
    target.alpha = route.returning ? 0.6 : 0.78;
    target.tint = 0xffffff;
  }
  if (!isWorldPointInViewport(pulseX, pulseY, TILE * 3)) return;
  const packet = acquirePacketSprite(textures[route.returning ? "packet_returning" : "packet_outbound"]);
  const packetSize = route.returning ? 19 : 17;
  const bob = Math.sin(now / 180 + route.id.length * 0.6) * 1.2;
  packet.x = pulseX;
  packet.y = pulseY - 4 + bob;
  packet.width = packetSize;
  packet.height = packetSize;
  packet.rotation = Math.max(-0.5, Math.min(0.5, angle * 0.32)) + Math.sin(now / 260 + route.id.length) * 0.025;
  packet.alpha = 0.84 + Math.sin(now / 240 + route.id.length) * 0.1;
  packet.tint = route.returning ? 0xfff0c9 : 0xffffff;
}

function drawDynamic(game: GameState, _layer: Container, options: { updateLabels?: boolean } = {}): void {
  const graphics = dynamicGraphics;
  graphics.clear();
  unitOverlayGraphics.clear();
  resetUnitSpritePool();
  resetProjectileSpritePool();
  const updateLabels = options.updateLabels !== false;
  const labelTier = currentLabelTier();
  if (updateLabels) {
    overlayGraphics.clear();
    buildingUnderlayGraphics.clear();
    buildingGraphics.clear();
    labelBackdropGraphics.clear();
    resetResourceSpritePool();
    resetBuildingSpritePool();
    dynamicLabelLayer.removeChildren();
    resetMapTextPool();
    lastLabelRenderMs = renderClockMs || performance.now();
    drawResourceSprites(game, resourceSpriteLayer);
    if (showContestedResources) drawContestedResourceOverlays(game, overlayGraphics);
    if (showDefenseOverlay) drawDefenseOverlay(game, overlayGraphics);
  }

  drawConstructionFocus(game, graphics);
  if (updateLabels && showResourceLabels) addResourceLabels(game, dynamicLabelLayer, labelTier);
  const buildings = observerMode ? Object.values(game.buildings) : getVisibleBuildings(game, playerTribe);
  const units = observerMode ? Object.values(game.units).filter((unit) => unit.hp > 0) : getVisibleUnits(game, playerTribe);
  const projectiles = observerMode
    ? Object.values(game.projectiles)
    : Object.values(game.projectiles).filter((projectile) => game.visibility[playerTribe]?.[tileIndex(Math.round(projectile.x), Math.round(projectile.y))] === 2);
  if (updateLabels) {
    for (const building of buildings) {
      const buildingWorldX = building.x * TILE + TILE / 2;
      const buildingWorldY = building.y * TILE + TILE / 2;
      if (!isWorldPointInViewport(buildingWorldX, buildingWorldY, TILE * 2)) continue;
      drawBuilding(buildingGraphics, building, game);
      if (showResourceLabels && shouldRenderBuildingLabel(building, game, labelTier)) {
        addMapText(
          dynamicLabelLayer,
          buildingAbbrev(building.type),
          buildingWorldX,
          buildingWorldY + 0.5,
          building.type === "wall" || building.type === "gate" ? 10 : 8,
          buildingLabelColor(building)
        );
      }
    }
  }
  if (updateLabels && showResourceLabels) addConstructionFocusLabels(game, dynamicLabelLayer);
  for (const projectile of projectiles) drawProjectileSprite(graphics, projectile);
  drawCombatEventOverlay(game, graphics, units, buildings, projectiles);
  for (const unit of units) {
    const visual = visualPositionForUnit(unit);
    const unitWorldX = visual.x * TILE + TILE / 2;
    const unitWorldY = visual.y * TILE + TILE / 2;
    if (!isWorldPointInViewport(unitWorldX, unitWorldY, TILE * 2)) continue;
    drawUnit(unitOverlayGraphics, unit, visual);
    if (updateLabels && showResourceLabels && shouldRenderUnitLabel(unit, labelTier)) {
      addMapText(
        dynamicLabelLayer,
        unitAbbrev(unit.type),
        unitWorldX,
        unitWorldY + 0.5,
        8,
        unit.type === "messenger" ? tribeConfig[unit.tribeId].colorText : "#0c0b09"
      );
    }
  }
  if (updateLabels && showResourceLabels) {
    for (const unit of units) {
      if (shouldLabelUnit(unit)) {
        const visual = visualPositionForUnit(unit);
        const label = acquireMapText(dynamicLabelLayer, unitLabel(game, unit), unit.type === "sovereign" ? 12 : 9, "#fff8e8", 0, 0);
        label.x = visual.x * TILE - (unit.type === "sovereign" ? 28 : 14);
        label.y = visual.y * TILE - 24;
      }
    }
  }
}

function drawConstructionFocus(game: GameState, graphics: Graphics): void {
  const flashes = activeConstructionFlashes(game);
  flashes.forEach((flash, index) => {
    const building = game.buildings[flash.buildingId];
    if (!building || building.hp <= 0) return;
    const age = game.tick - flash.tick;
    const isLatest = flash.buildingId === constructionFlash?.buildingId;
    const recency = Math.max(0.44, 1 - (flashes.length - 1 - index) * 0.12);
    const pulse = (0.58 + Math.sin(age * 0.28) * 0.18) * recency;
    const cx = building.x * TILE + TILE / 2;
    const cy = building.y * TILE + TILE / 2;
    graphics.circle(cx, cy, TILE * (isLatest ? 1.28 : 1.05)).stroke({ color: 0xffe17b, width: isLatest ? 5 : 3, alpha: pulse });
    graphics.circle(cx, cy, TILE * 0.84).stroke({ color: 0x101010, width: 2, alpha: isLatest ? 0.74 : 0.5 });
  });
}

function addConstructionFocusLabels(game: GameState, layer: Container): void {
  const labelOffsets = [
    { x: -TILE * 1.45, y: -TILE * 1.25 },
    { x: TILE * 1.45, y: -TILE * 1.25 },
    { x: -TILE * 1.45, y: TILE * 1.45 },
    { x: TILE * 1.45, y: TILE * 1.45 },
    { x: 0, y: -TILE * 2.05 },
    { x: 0, y: TILE * 2.1 }
  ];
  const flashes = activeConstructionFlashes(game);
  flashes.forEach((flash, index) => {
    const building = game.buildings[flash.buildingId];
    if (!building || building.hp <= 0) return;
    const isLatest = flash.buildingId === constructionFlash?.buildingId;
    const offset = labelOffsets[index % labelOffsets.length];
    addMapText(
      layer,
      `NEW ${buildingAbbrev(building.type)}`,
      building.x * TILE + TILE / 2 + offset.x,
      building.y * TILE + TILE / 2 + offset.y,
      isLatest ? 14 : 12,
      isLatest ? "#ffe17b" : "#fff4c0"
    );
  });
}

function drawContestedResourceOverlays(game: GameState, graphics: Graphics): void {
  const pressureSites = buildResourcePressureOverlaySites(game);
  for (const site of pressureSites) drawResourcePressureRoute(graphics, site);
  for (const site of pressureSites) if (site.depletedRecent) drawDepletedResourceDecal(graphics, site);
  for (const site of pressureSites) drawResourcePressureMarker(graphics, site);
}

function drawResourcePressureRoute(graphics: Graphics, site: ReturnType<typeof buildResourcePressureOverlaySites>[number]): void {
  if (site.routeFromX === undefined || site.routeFromY === undefined) return;
  const fromX = site.routeFromX * TILE + TILE / 2;
  const fromY = site.routeFromY * TILE + TILE / 2;
  const toX = site.x * TILE + TILE / 2;
  const toY = site.y * TILE + TILE / 2;
  const color = site.deniedRecent ? 0xff5a45 : site.depletedRecent ? 0xb4b8a1 : site.contested ? 0xffd86b : resourceColorNumber(site.type);
  const alpha = site.deniedRecent ? 0.4 : site.depletedRecent ? 0.34 : site.contested ? 0.28 : 0.18;
  graphics
    .moveTo(fromX, fromY)
    .lineTo(toX, toY)
    .stroke({ color: 0x100f0c, width: site.deniedRecent || site.depletedRecent ? 5 : 4, alpha: alpha * 0.72 });
  graphics.moveTo(fromX, fromY).lineTo(toX, toY).stroke({ color, width: site.deniedRecent || site.depletedRecent ? 2.2 : 1.6, alpha });
}

function drawResourcePressureMarker(graphics: Graphics, site: ReturnType<typeof buildResourcePressureOverlaySites>[number]): void {
  const cx = site.x * TILE + TILE / 2;
  const cy = site.y * TILE + TILE / 2;
  const color = site.deniedRecent ? 0xff5a45 : site.depletedRecent ? 0xb4b8a1 : resourceColorNumber(site.type);
  const radius = site.deniedRecent ? TILE * 0.78 : site.depletedRecent ? TILE * 0.72 : site.raided ? TILE * 0.7 : TILE * 0.58;
  const width = site.deniedRecent ? 3.4 : site.depletedRecent ? 2.8 : site.scarce ? 3 : 2;
  graphics.circle(cx, cy, radius + TILE * 0.06).stroke({ color: 0x100f0c, width: 4, alpha: site.deniedRecent || site.depletedRecent ? 0.48 : 0.42 });
  graphics.circle(cx, cy, radius).stroke({ color, width, alpha: site.deniedRecent || site.depletedRecent || site.scarce ? 0.86 : 0.68 });
  if (site.contested && site.rivalTribe) {
    graphics.circle(cx, cy, TILE * 0.36).stroke({ color: tribeConfig[site.rivalTribe].color, width: 1.6, alpha: 0.64 });
  }
  if (site.depletedRecent) {
    graphics
      .moveTo(cx - TILE * 0.34, cy)
      .lineTo(cx + TILE * 0.34, cy)
      .moveTo(cx - TILE * 0.22, cy + TILE * 0.16)
      .lineTo(cx + TILE * 0.22, cy + TILE * 0.16)
      .stroke({ color: 0xfff4d1, width: 2, alpha: 0.72 });
  }
  if (site.raided || site.deniedRecent) {
    graphics
      .moveTo(cx - TILE * 0.28, cy - TILE * 0.28)
      .lineTo(cx + TILE * 0.28, cy + TILE * 0.28)
      .moveTo(cx + TILE * 0.28, cy - TILE * 0.28)
      .lineTo(cx - TILE * 0.28, cy + TILE * 0.28)
      .stroke({ color: 0xfff0c4, width: site.deniedRecent ? 2.2 : 1.6, alpha: site.deniedRecent ? 0.78 : 0.58 });
  }
}

function drawDepletedResourceDecal(graphics: Graphics, site: ReturnType<typeof buildResourcePressureOverlaySites>[number]): void {
  const cx = site.x * TILE + TILE / 2;
  const cy = site.y * TILE + TILE / 2;
  const base = resourceColorNumber(site.type);
  const ownerColor = site.depletedByTribeId ? tribeConfig[site.depletedByTribeId].color : 0xb4b8a1;
  graphics.ellipse(cx, cy + TILE * 0.2, TILE * 0.46, TILE * 0.18).fill({ color: 0x100f0c, alpha: 0.34 });
  graphics.ellipse(cx, cy + TILE * 0.15, TILE * 0.36, TILE * 0.12).stroke({ color: 0xf2d28b, width: 1.4, alpha: 0.3 });
  if (site.type === "wood") {
    graphics.circle(cx - 5, cy + 2, 6).fill({ color: 0x6b4528, alpha: 0.9 }).stroke({ color: 0x21140c, width: 1.2, alpha: 0.88 });
    graphics.circle(cx - 5, cy + 2, 2.4).stroke({ color: 0xc08a52, width: 1, alpha: 0.72 });
    graphics.rect(cx + 4, cy - 4, 4, 13).fill({ color: 0x5b351b, alpha: 0.76 }).stroke({ color: 0x21140c, width: 0.8, alpha: 0.62 });
    graphics.moveTo(cx + 6, cy - 3).lineTo(cx + 12, cy - 8).lineTo(cx + 14, cy - 4).stroke({ color: 0x88b76b, width: 1.2, alpha: 0.5 });
  } else if (site.type === "food") {
    graphics.rect(cx - 9, cy - 1, 18, 8).fill({ color: 0x6c5738, alpha: 0.58 }).stroke({ color: 0x2b1f12, width: 1, alpha: 0.58 });
    for (let i = 0; i < 4; i += 1) {
      const stalkX = cx - 6 + i * 4;
      graphics.moveTo(stalkX, cy + 6).lineTo(stalkX + 2, cy - 7).stroke({ color: 0xbda85f, width: 1.2, alpha: 0.62 });
      graphics.moveTo(stalkX + 1, cy - 4).lineTo(stalkX + 4, cy - 7).stroke({ color: 0xd8c56b, width: 0.8, alpha: 0.45 });
    }
  } else if (site.type === "clay" || site.type === "limestone" || site.type === "stone") {
    graphics.roundRect(cx - 10, cy - 4, 20, 9, 2).fill({ color: site.type === "clay" ? 0x8b472f : 0x9d9788, alpha: 0.64 }).stroke({ color: 0x211a14, width: 1.2, alpha: 0.66 });
    graphics
      .moveTo(cx - 8, cy - 1)
      .lineTo(cx - 2, cy - 4)
      .lineTo(cx + 4, cy)
      .lineTo(cx + 9, cy - 3)
      .stroke({ color: 0xf5efe0, width: 1, alpha: 0.36 });
    graphics.rect(cx - 6, cy + 5, 4, 3).fill({ color: base, alpha: 0.45 });
    graphics.rect(cx + 3, cy + 5, 5, 3).fill({ color: base, alpha: 0.36 });
  } else {
    graphics.regularPoly(cx - 4, cy + 1, 7, 5).fill({ color: 0x25272b, alpha: 0.78 }).stroke({ color: 0x080706, width: 1.2, alpha: 0.72 });
    graphics.regularPoly(cx + 6, cy + 3, 5, 5).fill({ color: site.type === "gold" ? 0x8a5a1b : base, alpha: 0.58 }).stroke({ color: 0x080706, width: 0.9, alpha: 0.62 });
    graphics.moveTo(cx - 9, cy + 8).lineTo(cx + 10, cy - 3).stroke({ color: 0xe8e0ca, width: 1, alpha: 0.28 });
  }
  graphics
    .moveTo(cx - TILE * 0.28, cy - TILE * 0.12)
    .lineTo(cx + TILE * 0.28, cy + TILE * 0.12)
    .moveTo(cx + TILE * 0.24, cy - TILE * 0.14)
    .lineTo(cx - TILE * 0.24, cy + TILE * 0.1)
    .stroke({ color: ownerColor, width: 1.8, alpha: 0.58 });
}

function drawDefenseOverlay(game: GameState, graphics: Graphics): void {
  const buildings = observerMode ? Object.values(game.buildings) : getVisibleBuildings(game, playerTribe);
  const units = observerMode ? Object.values(game.units).filter((unit) => unit.hp > 0) : getVisibleUnits(game, playerTribe);
  const visibleById = new Map(buildings.filter((building) => building.hp > 0).map((building) => [building.id, building]));
  const perimeterGroups = buildPerimeterOverlayGroups(game, visibleById);
  const fortificationByPosition = new Map<string, Building>();
  drawPerimeterGroupOverlays(game, graphics, perimeterGroups);
  drawWarFrontOverlays(game, graphics, units, buildings);
  for (const building of buildings) {
    if (building.hp <= 0 || (building.type !== "wall" && building.type !== "gate")) continue;
    fortificationByPosition.set(`${building.x},${building.y}`, building);
  }
  for (const building of fortificationByPosition.values()) {
    const color = tribeConfig[building.tribeId].color;
    const cx = building.x * TILE + TILE / 2;
    const cy = building.y * TILE + TILE / 2;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1]
    ] as const) {
      const neighbor = fortificationByPosition.get(`${building.x + dx},${building.y + dy}`);
      if (!neighbor || neighbor.tribeId !== building.tribeId) continue;
      graphics.moveTo(cx, cy).lineTo(neighbor.x * TILE + TILE / 2, neighbor.y * TILE + TILE / 2).stroke({ color, width: 5, alpha: 0.26 });
      graphics.moveTo(cx, cy).lineTo(neighbor.x * TILE + TILE / 2, neighbor.y * TILE + TILE / 2).stroke({ color: 0xf2d28b, width: 1.4, alpha: 0.32 });
    }
  }
  for (const building of buildings) {
    if (building.hp <= 0) continue;
    const cx = building.x * TILE + TILE / 2;
    const cy = building.y * TILE + TILE / 2;
    const color = tribeConfig[building.tribeId].color;
    if (building.type === "turret") {
      graphics.circle(cx, cy, TILE * 7).stroke({ color, width: 1.5, alpha: 0.22 });
      graphics.circle(cx, cy, TILE * 1.05).stroke({ color: 0xf2d28b, width: 2, alpha: 0.5 });
    }
    if (building.type === "wall" || building.type === "gate") {
      graphics.rect(building.x * TILE + 1, building.y * TILE + 1, TILE - 2, TILE - 2).stroke({ color: 0x100f0c, width: 4, alpha: 0.42 });
      graphics.rect(building.x * TILE + 2, building.y * TILE + 2, TILE - 4, TILE - 4).stroke({ color, width: 2, alpha: 0.86 });
      if (!isTileWalkable(game, building.x, building.y, playerTribe)) drawBlockedRouteMarker(graphics, building);
      if (building.type === "wall") {
        graphics
          .moveTo(building.x * TILE + 6, building.y * TILE + 6)
          .lineTo(building.x * TILE + TILE - 6, building.y * TILE + TILE - 6)
          .moveTo(building.x * TILE + TILE - 6, building.y * TILE + 6)
          .lineTo(building.x * TILE + 6, building.y * TILE + TILE - 6)
          .stroke({ color: 0x100f0c, width: 1.6, alpha: 0.34 });
      }
      if (building.type === "gate" && building.gateState !== "open") {
        graphics.rect(building.x * TILE + 5, building.y * TILE + 5, TILE - 10, TILE - 10).stroke({ color: 0xffe17b, width: 2, alpha: 0.86 });
      }
      if (building.type === "gate") {
        if (isSafePassageGate(game, building)) drawSafePassageCorridor(game, graphics, building);
        drawGateOperationOverlay(game, graphics, building, cx, cy, color);
      }
    }
  }
}

function drawPerimeterGroupOverlays(
  game: GameState,
  graphics: Graphics,
  perimeterGroups: ReturnType<typeof buildPerimeterOverlayGroups>
): void {
  for (const group of perimeterGroups) {
    const color = tribeConfig[group.tribeId].color;
    const segments = game.fortificationPlans
      .filter((plan) => plan.perimeterGroupId === group.groupId)
      .sort((left, right) => (left.perimeterSegmentIndex ?? 0) - (right.perimeterSegmentIndex ?? 0) || left.id.localeCompare(right.id))
      .flatMap((plan) => {
        const building = game.buildings[plan.buildingId];
        return building && building.hp > 0 ? [building] : [];
      });
    for (let index = 1; index < segments.length; index += 1) {
      const previous = segments[index - 1];
      const current = segments[index];
      graphics
        .moveTo(previous.x * TILE + TILE / 2, previous.y * TILE + TILE / 2)
        .lineTo(current.x * TILE + TILE / 2, current.y * TILE + TILE / 2)
        .stroke({ color: 0xf2d28b, width: 7, alpha: 0.16 });
      graphics
        .moveTo(previous.x * TILE + TILE / 2, previous.y * TILE + TILE / 2)
        .lineTo(current.x * TILE + TILE / 2, current.y * TILE + TILE / 2)
        .stroke({ color, width: 3, alpha: 0.28 });
    }
    const cx = group.centerX * TILE + TILE / 2;
    const cy = group.centerY * TILE + TILE / 2;
    for (const check of group.placementPreview?.routeChecks?.slice(0, 3) ?? []) {
      const routeColor = check.blockedByPlacement ? 0xff6b52 : check.addedSteps > 0 ? 0xf2d28b : 0x7bd88f;
      graphics
        .moveTo(check.fromX * TILE + TILE / 2, check.fromY * TILE + TILE / 2)
        .lineTo(check.toX * TILE + TILE / 2, check.toY * TILE + TILE / 2)
        .stroke({ color: routeColor, width: check.blockedByPlacement ? 2.4 : 1.4, alpha: check.blockedByPlacement ? 0.42 : 0.2 });
    }
    graphics.circle(cx, cy, TILE * 0.72).stroke({ color: 0x100f0c, width: 4, alpha: 0.26 });
    graphics
      .circle(cx, cy, TILE * 0.6)
      .stroke({ color: group.routeBlockedByPlacementCount > 0 ? 0xff6b52 : 0xf2d28b, width: 2.2, alpha: 0.68 });
  }
}

function drawWarFrontOverlays(game: GameState, graphics: Graphics, units: Unit[], buildings: Building[]): void {
  for (const marker of buildWarFrontOverlayMarkers(game, units, buildings)) {
    const cx = marker.x * TILE + TILE / 2;
    const cy = marker.y * TILE + TILE / 2;
    graphics.circle(cx, cy, TILE * 0.9).stroke({ color: 0x100f0c, width: 5, alpha: 0.34 });
    graphics.circle(cx, cy, TILE * 0.76).stroke({ color: 0xff5a45, width: 2.8, alpha: 0.78 });
    graphics
      .moveTo(cx - TILE * 0.32, cy - TILE * 0.32)
      .lineTo(cx + TILE * 0.32, cy + TILE * 0.32)
      .moveTo(cx + TILE * 0.32, cy - TILE * 0.32)
      .lineTo(cx - TILE * 0.32, cy + TILE * 0.32)
      .stroke({ color: 0xffc7b7, width: 2, alpha: 0.74 });
  }
}

function drawBlockedRouteMarker(graphics: Graphics, building: Building): void {
  const cx = building.x * TILE + TILE / 2;
  const cy = building.y * TILE + TILE / 2;
  graphics.circle(cx, cy, TILE * 0.5).stroke({ color: 0x100f0c, width: 4, alpha: 0.4 });
  graphics
    .moveTo(cx - TILE * 0.26, cy - TILE * 0.26)
    .lineTo(cx + TILE * 0.26, cy + TILE * 0.26)
    .moveTo(cx + TILE * 0.26, cy - TILE * 0.26)
    .lineTo(cx - TILE * 0.26, cy + TILE * 0.26)
    .stroke({ color: 0xff5a45, width: 2.4, alpha: 0.86 });
}

function drawSafePassageCorridor(game: GameState, graphics: Graphics, building: Building): void {
  const x = building.x * TILE;
  const y = building.y * TILE;
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const horizontal = hasAdjacentFortification(game, building, -1, 0) || hasAdjacentFortification(game, building, 1, 0);
  if (horizontal) {
    graphics.moveTo(x + 3, cy).lineTo(x + TILE - 3, cy).stroke({ color: 0x0b0c0d, width: 6, alpha: 0.28 });
    graphics.moveTo(x + 3, cy).lineTo(x + TILE - 3, cy).stroke({ color: 0x7bd8ff, width: 3, alpha: 0.88 });
    graphics.moveTo(x + TILE - 8, cy - 4).lineTo(x + TILE - 3, cy).lineTo(x + TILE - 8, cy + 4).stroke({ color: 0x7bd8ff, width: 2, alpha: 0.88 });
  } else {
    graphics.moveTo(cx, y + 3).lineTo(cx, y + TILE - 3).stroke({ color: 0x0b0c0d, width: 6, alpha: 0.28 });
    graphics.moveTo(cx, y + 3).lineTo(cx, y + TILE - 3).stroke({ color: 0x7bd8ff, width: 3, alpha: 0.88 });
    graphics.moveTo(cx - 4, y + TILE - 8).lineTo(cx, y + TILE - 3).lineTo(cx + 4, y + TILE - 8).stroke({ color: 0x7bd8ff, width: 2, alpha: 0.88 });
  }
}

function drawGateScrollBadge(graphics: Graphics, x: number, y: number, color: number, alpha = 0.88): void {
  graphics.roundRect(x - 7, y - 4, 14, 8, 2).fill({ color: 0xf5efe0, alpha }).stroke({ color: 0x100f0c, width: 1.1, alpha: 0.82 });
  graphics.circle(x - 6, y - 4, 2.1).fill({ color: 0xd8c69c, alpha }).stroke({ color: 0x100f0c, width: 0.7, alpha: 0.68 });
  graphics.circle(x + 6, y + 4, 2.1).fill({ color: 0xd8c69c, alpha }).stroke({ color: 0x100f0c, width: 0.7, alpha: 0.68 });
  graphics.moveTo(x - 3, y - 1).lineTo(x + 4, y - 1).moveTo(x - 2, y + 2).lineTo(x + 3, y + 2).stroke({ color, width: 1.2, alpha });
}

function drawGateCoinBadge(graphics: Graphics, x: number, y: number, pulse: number): void {
  graphics.circle(x - 2, y + 2, 4.2).fill({ color: 0xb76f18, alpha: 0.92 }).stroke({ color: 0x100f0c, width: 1, alpha: 0.72 });
  graphics.circle(x + 2, y - 1, 4.4).fill({ color: 0xffd96b, alpha: 0.94 }).stroke({ color: 0x6b430d, width: 1.1 });
  graphics.circle(x + 2, y - 1, 6.5 + pulse * 1.2).stroke({ color: 0xfff2b6, width: 1.1, alpha: 0.34 + pulse * 0.16 });
}

function drawGateDetainBadge(graphics: Graphics, x: number, y: number, color: number): void {
  graphics.roundRect(x - 7, y - 6, 14, 12, 2).fill({ color: 0x15120f, alpha: 0.64 }).stroke({ color, width: 1.4, alpha: 0.88 });
  for (let offset = -4; offset <= 4; offset += 4) {
    graphics.moveTo(x + offset, y - 5).lineTo(x + offset, y + 5).stroke({ color: 0xf2d28b, width: 1.2, alpha: 0.82 });
  }
  graphics.moveTo(x - 6, y - 1).lineTo(x + 6, y - 1).stroke({ color, width: 1.2, alpha: 0.86 });
}

function drawGateReleaseBadge(graphics: Graphics, x: number, y: number, color: number): void {
  graphics.circle(x, y, 6).stroke({ color: 0x100f0c, width: 2, alpha: 0.38 });
  graphics.moveTo(x - 7, y + 3).lineTo(x + 5, y + 3).lineTo(x + 1, y - 1).moveTo(x + 5, y + 3).lineTo(x + 1, y + 7).stroke({ color, width: 2, alpha: 0.9 });
}

function drawGateRevokedWritBadge(graphics: Graphics, x: number, y: number): void {
  drawGateScrollBadge(graphics, x, y, 0xff6b52, 0.82);
  graphics.moveTo(x - 8, y - 6).lineTo(x + 8, y + 6).stroke({ color: 0xff6b52, width: 2.1, alpha: 0.9 });
}

function drawGateIncidentBadge(graphics: Graphics, x: number, y: number, pulse: number): void {
  graphics
    .moveTo(x, y - 8)
    .lineTo(x + 8, y)
    .lineTo(x, y + 8)
    .lineTo(x - 8, y)
    .closePath()
    .fill({ color: 0x2b1b12, alpha: 0.7 })
    .stroke({ color: 0xff8a52, width: 1.7, alpha: 0.88 });
  graphics.circle(x, y, 10 + pulse * 2).stroke({ color: 0xff8a52, width: 1.2, alpha: 0.28 + pulse * 0.16 });
  graphics.moveTo(x, y - 5).lineTo(x, y + 1).stroke({ color: 0xffe0b5, width: 1.6, alpha: 0.9 });
  graphics.circle(x, y + 4, 1.4).fill({ color: 0xffe0b5, alpha: 0.9 });
}

function drawGateDiscoveryBadge(graphics: Graphics, x: number, y: number, pulse: number): void {
  graphics.ellipse(x, y, 8, 5).fill({ color: 0x101923, alpha: 0.68 }).stroke({ color: 0x9ae8ff, width: 1.5, alpha: 0.82 });
  graphics.circle(x, y, 2.6 + pulse * 0.8).fill({ color: 0x9ae8ff, alpha: 0.86 }).stroke({ color: 0x061017, width: 0.8, alpha: 0.76 });
  graphics.circle(x, y, 11 + pulse * 2).stroke({ color: 0x9ae8ff, width: 1, alpha: 0.22 + pulse * 0.12 });
}

function drawGateSabotageGlyph(graphics: Graphics, x: number, y: number, pulse: number): void {
  graphics.circle(x, y, 7 + pulse * 2).stroke({ color: 0xff6bd6, width: 1.6, alpha: 0.42 + pulse * 0.18 });
  graphics
    .moveTo(x - 6, y - 6)
    .lineTo(x + 6, y + 6)
    .moveTo(x + 6, y - 6)
    .lineTo(x - 6, y + 6)
    .stroke({ color: 0xff6bd6, width: 2, alpha: 0.9 });
  graphics.moveTo(x - 2, y - 8).lineTo(x + 2, y - 2).lineTo(x - 1, y + 1).lineTo(x + 3, y + 8).stroke({ color: 0xfff0c4, width: 1.4, alpha: 0.76 });
}

function drawGateOperationOverlay(game: GameState, graphics: Graphics, building: Building, cx: number, cy: number, color: number): void {
  const activeTreaties = getActiveGateAccessTreaties(game, building.id);
  const hasRecentRevoke = gateHasRecentRevokedWrit(game, building.id);
  const hasDetainedCourier = gateHasDetainedCourierEvidence(game, building.id);
  const hasToll = gateHasTollEvidence(game, building.id);
  const hasIncident = gateHasTreatyIncidentEvidence(game, building.id);
  const hasDiscovery = gateHasDiscoveryEvidence(game, building.id);
  const hasSabotageHistory = gateHasSabotageHistoryEvidence(game, building.id);
  const now = renderClockMs || performance.now();
  const pulse = 0.5 + Math.sin(now / 240 + building.x * 0.6 + building.y * 0.3) * 0.5;
  if ((building.gateState ?? "open") === "open" && !building.gateSabotage) {
    graphics.circle(cx, cy, TILE * 0.23).stroke({ color: 0x88e68f, width: 2, alpha: 0.78 });
  }
  if (building.gateState === "closed") {
    graphics.rect(cx - TILE * 0.24, cy - TILE * 0.26, TILE * 0.48, TILE * 0.52).stroke({ color: 0xffb35c, width: 2, alpha: 0.82 });
    graphics.moveTo(cx - TILE * 0.18, cy).lineTo(cx + TILE * 0.18, cy).stroke({ color: 0xffb35c, width: 2, alpha: 0.8 });
  }
  if (building.gateState === "locked") {
    graphics.circle(cx + 5, cy + 2, TILE * 0.18).fill({ color: 0xffe17b, alpha: 0.2 }).stroke({ color: 0xffe17b, width: 2, alpha: 0.88 });
    graphics.roundRect(cx - 6, cy - 4, 12, 11, 2).fill({ color: 0x231a0f, alpha: 0.72 }).stroke({ color: 0xffe17b, width: 1.3, alpha: 0.92 });
    graphics.arc(cx, cy - 4, 4.5, Math.PI, 0).stroke({ color: 0xffe17b, width: 1.4, alpha: 0.92 });
  }
  if (activeTreaties.length > 0) {
    graphics.circle(cx, cy, TILE * 0.72).stroke({ color: 0x7bd8ff, width: 2.4, alpha: 0.78 });
    activeTreaties.slice(0, 3).forEach((_, index) => {
      drawGateScrollBadge(graphics, cx - TILE * 0.42 + index * 8, cy - TILE * 0.55, 0x7bd8ff, 0.82);
    });
  }
  if (hasRecentRevoke && building.gateOperation?.accessTreatyAction !== "revoke") {
    drawGateRevokedWritBadge(graphics, cx - TILE * 0.28, cy + TILE * 0.62);
  }
  if (hasToll && !building.gateOperation) {
    drawGateCoinBadge(graphics, cx + TILE * 0.48, cy - TILE * 0.38, pulse);
  }
  if (hasDetainedCourier && !building.gateOperation) {
    drawGateDetainBadge(graphics, cx - TILE * 0.48, cy + TILE * 0.34, color);
  }
  if (hasIncident) {
    drawGateIncidentBadge(graphics, cx + TILE * 0.5, cy + TILE * 0.56, pulse);
  }
  if (hasDiscovery) {
    drawGateDiscoveryBadge(graphics, cx - TILE * 0.5, cy - TILE * 0.58, pulse);
  }
  if (building.gateOperation) {
    graphics
      .moveTo(cx, cy - TILE * 0.82)
      .lineTo(cx + TILE * 0.22, cy - TILE * 0.56)
      .lineTo(cx, cy - TILE * 0.3)
      .lineTo(cx - TILE * 0.22, cy - TILE * 0.56)
      .closePath()
      .fill({ color, alpha: 0.72 })
      .stroke({ color: 0xf2d28b, width: 1.5, alpha: 0.88 });
    if (building.gateOperation.tollGold || building.gateOperation.tollMode) {
      drawGateCoinBadge(graphics, cx + TILE * 0.48, cy - TILE * 0.38, pulse);
    }
    if (
      building.gateOperation.entryAction === "detain" ||
      building.gateOperation.detainedPacketAction ||
      building.gateOperation.detainedPacketId ||
      building.gateOperation.unpaidAction === "detain"
    ) {
      drawGateDetainBadge(graphics, cx - TILE * 0.48, cy + TILE * 0.34, color);
    }
    if (building.gateOperation.releaseSubject || building.gateOperation.releaseMessage || building.gateOperation.ransomGold) {
      drawGateReleaseBadge(graphics, cx + TILE * 0.5, cy + TILE * 0.34, 0x8df07a);
    }
    if (building.gateOperation.accessTreatyAction) {
      const treatyColor = building.gateOperation.accessTreatyAction === "revoke" ? 0xff6b52 : 0x7bd8ff;
      drawGateScrollBadge(graphics, cx, cy + TILE * 0.62, treatyColor, 0.88);
      if (building.gateOperation.accessTreatyAction === "revoke") {
        graphics.moveTo(cx - 8, cy + TILE * 0.55).lineTo(cx + 8, cy + TILE * 0.69).stroke({ color: 0xff6b52, width: 2, alpha: 0.88 });
      }
    }
    if (building.gateOperation.sabotageAction) {
      drawGateSabotageGlyph(graphics, cx - TILE * 0.46, cy - TILE * 0.36, pulse);
    }
  }
  if (building.gateSabotage) {
    graphics.circle(cx, cy, TILE * 0.86).stroke({ color: 0xff6bd6, width: 3, alpha: 0.82 });
    drawGateSabotageGlyph(graphics, cx, cy, pulse);
  } else if (hasSabotageHistory) {
    drawGateSabotageGlyph(graphics, cx - TILE * 0.34, cy - TILE * 0.34, pulse * 0.5);
  }
}

function buildingVisualState(building: Building, game: GameState): BuildingVisualState {
  const ratio = healthRatio(building);
  if (building.hp > 0 && ratio < 0.34) return "critical";
  if (buildingRepairState(game, building) !== "none") return "repairing";
  if (building.hp > 0 && ratio < 0.98) return "damaged";
  if (building.type === "gate") {
    const gateState = building.gateState ?? "open";
    if (gateState === "locked") return "gate_locked";
    if (gateState === "closed") return "gate_closed";
    return "gate_open";
  }
  return "normal";
}

function buildingTextureForState(building: Building, game: GameState): Texture | undefined {
  const textures = visualTextures?.buildings[building.type];
  return textures?.[buildingVisualState(building, game)] ?? textures?.normal;
}

function placeSprite(sprite: Sprite, left: number, top: number, width: number, height: number): void {
  sprite.x = left + width / 2;
  sprite.y = top + height / 2;
  sprite.width = width;
  sprite.height = height;
}

function drawBuilding(graphics: Graphics, building: Building, game: GameState): void {
  const color = tribeConfig[building.tribeId].color;
  const x = building.x * TILE;
  const y = building.y * TILE;
  const texture = buildingTextureForState(building, game);
  if (texture) {
    drawTexturedBuilding(graphics, building, game, x, y, color, texture);
  } else if (building.type === "wall") {
    graphics.rect(x, y, TILE, TILE).fill({ color: 0x0f0d0a, alpha: 0.38 });
    if (hasAdjacentFortification(game, building, 0, -1)) graphics.rect(x + 7, y - 1, 8, 9).fill({ color: 0xd7d0c2, alpha: 0.98 });
    if (hasAdjacentFortification(game, building, 0, 1)) graphics.rect(x + 7, y + TILE - 8, 8, 9).fill({ color: 0xd7d0c2, alpha: 0.98 });
    if (hasAdjacentFortification(game, building, -1, 0)) graphics.rect(x - 1, y + 7, 9, 8).fill({ color: 0xd7d0c2, alpha: 0.98 });
    if (hasAdjacentFortification(game, building, 1, 0)) graphics.rect(x + TILE - 8, y + 7, 9, 8).fill({ color: 0xd7d0c2, alpha: 0.98 });
    graphics
      .rect(x + 1, y + 4, TILE - 2, TILE - 8)
      .fill({ color: 0xcac2b4, alpha: 0.98 })
      .stroke({ color: 0x0c0a08, width: 3, alpha: 0.95 });
    for (let i = 0; i < 3; i += 1) {
      graphics
        .rect(x + 3 + i * 6, y + 1, 5, 7)
        .fill({ color: 0xf1e7d2, alpha: 0.98 })
        .stroke({ color, width: 1.5, alpha: 0.95 });
    }
    graphics
      .moveTo(x + 3, y + TILE / 2)
      .lineTo(x + TILE - 3, y + TILE / 2)
      .stroke({ color, width: 3, alpha: 0.98 });
  } else if (building.type === "gate") {
    const gateState = building.gateState ?? "open";
    graphics.rect(x, y, TILE, TILE).fill({ color: 0x0f0d0a, alpha: 0.32 });
    if (hasAdjacentFortification(game, building, 0, -1)) graphics.rect(x + 7, y - 1, 8, 9).fill({ color: 0xd7d0c2, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, 0, 1)) graphics.rect(x + 7, y + TILE - 8, 8, 9).fill({ color: 0xd7d0c2, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, -1, 0)) graphics.rect(x - 1, y + 7, 9, 8).fill({ color: 0xd7d0c2, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, 1, 0)) graphics.rect(x + TILE - 8, y + 7, 9, 8).fill({ color: 0xd7d0c2, alpha: 0.96 });
    graphics.rect(x + 1, y + 4, 6, TILE - 8).fill({ color: 0xcac2b4, alpha: 0.98 }).stroke({ color: 0x0c0a08, width: 2, alpha: 0.9 });
    graphics.rect(x + TILE - 7, y + 4, 6, TILE - 8).fill({ color: 0xcac2b4, alpha: 0.98 }).stroke({ color: 0x0c0a08, width: 2, alpha: 0.9 });
    graphics.rect(x + 5, y + 2, TILE - 10, 6).fill({ color: 0xf1e7d2, alpha: 0.98 }).stroke({ color, width: 1.5, alpha: 0.95 });
    if (gateState === "open") {
      graphics.rect(x + 8, y + 8, TILE - 16, TILE - 12).fill({ color: 0x7f6a43, alpha: 0.88 });
      graphics.moveTo(x + 10, y + TILE / 2).lineTo(x + TILE - 10, y + TILE / 2).stroke({ color: 0xffe17b, width: 2, alpha: 0.9 });
    } else {
      graphics.rect(x + 8, y + 8, TILE - 16, TILE - 12).fill({ color: 0x5f4b32, alpha: 0.94 }).stroke({ color: 0x0c0a08, width: 2, alpha: 0.95 });
      for (let i = 0; i < 3; i += 1) graphics.rect(x + 9 + i * 3, y + 9, 2, TILE - 14).fill({ color, alpha: 0.94 });
      if (gateState === "locked") graphics.circle(x + TILE / 2 + 2, y + TILE / 2, 3).fill({ color: 0xffe17b, alpha: 0.95 }).stroke({ color: 0x0c0a08, width: 1 });
    }
  } else if (building.type === "turret") {
    graphics
      .rect(x + 5, y + 7, TILE - 10, TILE - 6)
      .fill({ color, alpha: 0.78 })
      .stroke({ color: 0x16120e, width: 2 });
    graphics.circle(x + TILE / 2, y + 7, 5).fill({ color: 0xd9c58f, alpha: 0.9 }).stroke({ color: 0x16120e, width: 1 });
  } else {
    const size = building.type === "townHall" ? 20 : building.type === "watchtower" ? 16 : 14;
    graphics
      .rect(x + (TILE - size) / 2, y + (TILE - size) / 2, size, size)
      .fill({ color, alpha: 0.72 })
      .stroke({ color: 0x16120e, width: 2 });
  }
  drawBuildingDamageOverlay(graphics, building, x, y);
  drawBuildingRepairCue(graphics, building, game, x, y);
  if (selectedBuildingId === building.id) {
    graphics.circle(x + TILE / 2, y + TILE / 2, TILE * 0.86).stroke({ color: 0xffe17b, width: 4, alpha: 0.9 });
    graphics.rect(building.x * TILE - 2, building.y * TILE - 2, TILE + 4, TILE + 4).stroke({ color: 0xffe17b, width: 3 });
  }
  if (building.hp < building.maxHp) {
    const pct = Math.max(0, building.hp / building.maxHp);
    graphics.rect(x + 3, y + TILE - 4, TILE - 6, 3).fill(0x3a1918);
    graphics.rect(x + 3, y + TILE - 4, (TILE - 6) * pct, 3).fill(0x77d26d);
  }
}

function drawTexturedBuilding(graphics: Graphics, building: Building, game: GameState, x: number, y: number, color: number, texture: Texture): void {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const fortified = building.type === "wall" || building.type === "gate";
  if (fortified) {
    buildingUnderlayGraphics.rect(x, y, TILE, TILE).fill({ color: 0x0f0d0a, alpha: 0.24 });
    if (hasAdjacentFortification(game, building, 0, -1)) buildingUnderlayGraphics.rect(x + 7, y - 2, 8, 9).fill({ color: 0xcac2b4, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, 0, 1)) buildingUnderlayGraphics.rect(x + 7, y + TILE - 7, 8, 9).fill({ color: 0xcac2b4, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, -1, 0)) buildingUnderlayGraphics.rect(x - 2, y + 7, 9, 8).fill({ color: 0xcac2b4, alpha: 0.96 });
    if (hasAdjacentFortification(game, building, 1, 0)) buildingUnderlayGraphics.rect(x + TILE - 7, y + 7, 9, 8).fill({ color: 0xcac2b4, alpha: 0.96 });
    const sprite = acquireBuildingSprite(texture);
    placeSprite(sprite, x - 4, y - 7, TILE + 8, TILE + 12);
    sprite.alpha = building.hp < building.maxHp ? 0.9 + healthRatio(building) * 0.1 : 1;
    sprite.rotation = 0;
    sprite.tint = 0xffffff;
    graphics.moveTo(x + 3, cy + 1).lineTo(x + TILE - 3, cy + 1).stroke({ color, width: 3, alpha: 0.92 });
    if (building.type === "gate") {
      const gateState = building.gateState ?? "open";
      if (gateState !== "open") {
        graphics.rect(x + 8, y + 8, TILE - 16, TILE - 10).stroke({ color: 0xffe17b, width: 2, alpha: 0.86 });
        if (gateState === "locked") graphics.circle(cx + 5, cy + 3, 3.2).fill(0xffe17b).stroke({ color: 0x0c0a08, width: 1.2 });
      } else {
        graphics.moveTo(x + 10, cy + 4).lineTo(x + TILE - 10, cy + 4).stroke({ color: 0xffe17b, width: 2, alpha: 0.76 });
        graphics
          .moveTo(x + 5, cy + 4)
          .lineTo(x + TILE - 5, cy + 4)
          .moveTo(x + TILE - 10, cy)
          .lineTo(x + TILE - 5, cy + 4)
          .lineTo(x + TILE - 10, cy + 8)
          .stroke({ color: 0x88e68f, width: 1.6, alpha: 0.72 });
      }
    }
    return;
  }

  const scalePad = building.type === "townHall" ? 8 : building.type === "turret" || building.type === "watchtower" ? 6 : 4;
  buildingUnderlayGraphics.ellipse(cx, y + TILE - 1, TILE * 0.42, 3.8).fill({ color: 0x080706, alpha: 0.28 });
  const sprite = acquireBuildingSprite(texture);
  placeSprite(sprite, x - scalePad / 2, y - scalePad, TILE + scalePad, TILE + scalePad * 1.3);
  sprite.alpha = building.hp < building.maxHp ? 0.9 + healthRatio(building) * 0.1 : 1;
  sprite.rotation = building.type === "turret" ? Math.sin((renderClockMs || performance.now()) / 520 + building.x * 0.7) * 0.01 : 0;
  sprite.tint = 0xffffff;
  if (building.type === "turret") {
    const recoil = Math.sin((renderClockMs || performance.now()) / 260 + building.x * 0.7 + building.y * 0.4) * 1.2;
    graphics.moveTo(cx, y + 5).lineTo(cx + 12 + recoil, y + 2).stroke({ color, width: 3, alpha: 0.96 });
    graphics.circle(cx, cy - 5, 6).stroke({ color, width: 2, alpha: 0.9 });
    graphics.circle(cx + 13 + recoil, y + 2, 2.3).fill({ color: 0xffe17b, alpha: 0.74 });
    return;
  }
  if (building.type === "watchtower") {
    graphics.moveTo(cx + 4, y + 4).lineTo(cx + 4, y - 7).lineTo(cx + 13, y - 3).stroke({ color, width: 2.2, alpha: 0.95 });
    return;
  }
  graphics.moveTo(cx + 4, y + 3).lineTo(cx + 4, y - 6).lineTo(cx + 13, y - 2).stroke({ color, width: 2, alpha: 0.92 });
  if (building.type === "market") graphics.circle(cx + 8, cy + 8, 4).fill({ color, alpha: 0.9 }).stroke({ color: 0x100f0c, width: 1 });
}

function drawBuildingDamageOverlay(graphics: Graphics, building: Building, x: number, y: number): void {
  const ratio = healthRatio(building);
  if (ratio >= 0.98 || building.hp <= 0) return;
  const condition = durabilityCondition(building);
  const crackColor = condition === "critical" ? 0x2b0806 : 0x3e2118;
  const crackWidth = condition === "critical" ? 2.4 : condition === "damaged" ? 2 : 1.4;
  const alpha = condition === "critical" ? 0.96 : condition === "damaged" ? 0.84 : 0.68;
  const rubbleColor = condition === "critical" ? 0x1c1713 : 0x3d342c;

  if (building.type === "wall" || building.type === "gate") {
    graphics
      .moveTo(x + 4, y + 5)
      .lineTo(x + 9, y + 10)
      .lineTo(x + 7, y + 16)
      .moveTo(x + TILE - 5, y + 6)
      .lineTo(x + TILE - 11, y + 13)
      .lineTo(x + TILE - 8, y + 19)
      .stroke({ color: crackColor, width: crackWidth, alpha });
    if (condition === "damaged" || condition === "critical") {
      graphics.rect(x + 3, y + TILE - 10, 5, 6).fill({ color: rubbleColor, alpha: 0.88 });
      graphics.rect(x + TILE - 8, y + TILE - 12, 4, 8).fill({ color: rubbleColor, alpha: 0.82 });
    }
    if (condition === "critical") {
      graphics
        .moveTo(x + 3, y + TILE - 4)
        .lineTo(x + TILE - 3, y + 4)
        .stroke({ color: 0x7e1f18, width: 3, alpha: 0.78 });
      graphics.rect(x + 9, y + 8, 5, 8).fill({ color: 0x0f0d0a, alpha: 0.86 });
    }
    return;
  }

  if (building.type === "turret") {
    graphics
      .moveTo(x + 7, y + 8)
      .lineTo(x + 13, y + 15)
      .moveTo(x + TILE - 7, y + 9)
      .lineTo(x + TILE - 13, y + 17)
      .stroke({ color: crackColor, width: crackWidth, alpha });
    graphics.circle(x + TILE / 2, y + TILE / 2, condition === "critical" ? 8 : 6).stroke({ color: 0x7e1f18, width: 2, alpha: condition === "worn" ? 0.45 : 0.72 });
    if (condition === "critical") graphics.rect(x + 5, y + TILE - 7, TILE - 10, 4).fill({ color: rubbleColor, alpha: 0.78 });
    return;
  }

  graphics
    .moveTo(x + 6, y + 7)
    .lineTo(x + 12, y + 15)
    .moveTo(x + TILE - 6, y + 8)
    .lineTo(x + TILE - 12, y + 17)
    .stroke({ color: crackColor, width: crackWidth, alpha });
}

function drawBuildingRepairCue(graphics: Graphics, building: Building, game: GameState, x: number, y: number): void {
  const repairState = buildingRepairState(game, building);
  if (repairState === "none") return;
  const color = repairState === "repairing" ? 0x7bd8ff : 0x8df07a;
  const alpha = repairState === "repairing" ? 0.86 : 0.78;
  graphics.circle(x + TILE / 2, y + TILE / 2, TILE * 0.72).stroke({ color, width: 3, alpha });
  graphics
    .moveTo(x + TILE / 2 - 5, y + TILE / 2)
    .lineTo(x + TILE / 2 + 5, y + TILE / 2)
    .moveTo(x + TILE / 2, y + TILE / 2 - 5)
    .lineTo(x + TILE / 2, y + TILE / 2 + 5)
    .stroke({ color, width: 2, alpha: 0.92 });
}

function hasAdjacentFortification(game: GameState, building: Building, dx: number, dy: number): boolean {
  return Object.values(game.buildings).some(
    (candidate) =>
      candidate.id !== building.id &&
      (candidate.type === "wall" || candidate.type === "gate") &&
      candidate.hp > 0 &&
      candidate.x === building.x + dx &&
      candidate.y === building.y + dy
  );
}

function unitSpriteSize(unit: Unit): number {
  if (unit.type === "sovereign") return 34;
  if (unit.type === "siege_engine" || unit.type === "battering_ram" || unit.type === "catapult") return 38;
  if (unit.type === "messenger" || unit.type === "sentinel") return 29;
  return 31;
}

function unitVisualState(unit: Unit): UnitVisualState {
  if (unit.task.kind === "move") return "move";
  if (unit.task.kind === "scout") return "scout";
  if (unit.task.kind === "gather") return "gather";
  if (unit.task.kind === "deliver") return "deliver";
  if (unit.task.kind === "repair") return "repair";
  if (unit.task.kind === "attack" || unit.task.kind === "attackBuilding" || unit.task.kind === "attackResource" || unit.task.kind === "guardSiege") return "attack";
  return "idle";
}

function unitTextureForState(unit: Unit): Texture | undefined {
  const textures = visualTextures?.units[unit.type];
  return textures?.[unitVisualState(unit)] ?? textures?.idle;
}

function drawUnitSprite(graphics: Graphics, unit: Unit, x: number, y: number, radius: number, color: number): boolean {
  const texture = unitTextureForState(unit);
  if (!texture) return false;
  const state = unitVisualState(unit);
  const size = unitSpriteSize(unit);
  const now = renderClockMs || performance.now();
  const activePulse = state === "idle" ? 0 : Math.sin(now / 170 + unit.x * 0.6 + unit.y * 0.35);
  const sprite = acquireUnitSprite(texture);
  sprite.x = x;
  sprite.y = y - 2;
  sprite.width = size * (state === "attack" ? 1.05 + Math.max(0, activePulse) * 0.03 : 1);
  sprite.height = size * (state === "move" ? 1 + Math.max(0, activePulse) * 0.025 : 1);
  sprite.rotation =
    state === "move"
      ? Math.sin(now / 160 + unit.x) * 0.035
      : state === "attack"
        ? Math.sin(now / 90 + unit.y) * 0.045
        : (((unit.x * 13 + unit.y * 7) % 5) - 2) * 0.006;
  sprite.alpha = unit.hp < unit.maxHp ? 0.86 + healthRatio(unit) * 0.14 : 1;
  sprite.tint = 0xffffff;
  graphics.ellipse(x, y + radius + 7, radius + 7, 3.5).fill({ color, alpha: 0.28 }).stroke({ color: 0x100f0c, width: 1, alpha: 0.22 });
  graphics.circle(x - size * 0.34, y - size * 0.3, Math.max(2.2, size * 0.085)).fill({ color, alpha: 0.94 }).stroke({ color: 0x100f0c, width: 0.8, alpha: 0.72 });
  if (unit.type === "sovereign") {
    graphics.circle(x, y - size * 0.45, size * 0.18).stroke({ color, width: 2, alpha: 0.96 });
  } else if (unit.type === "messenger" || unit.type === "trader") {
    graphics.rect(x - size * 0.18, y + size * 0.17, size * 0.36, 2.2).fill({ color, alpha: 0.86 });
  } else if (isMilitaryUnitType(unit.type)) {
    graphics.moveTo(x - size * 0.25, y + size * 0.22).lineTo(x + size * 0.25, y + size * 0.22).stroke({ color, width: 2, alpha: 0.9 });
  }
  if (state !== "idle") {
    graphics.ellipse(x, y + radius + 7, radius + 5, 3).stroke({ color, width: 1.3, alpha: 0.38 });
  }
  return true;
}

function drawUnit(graphics: Graphics, unit: Unit, position: Position = visualPositionForUnit(unit)): void {
  const color = tribeConfig[unit.tribeId].color;
  const radius = unit.type === "sovereign" ? 9 : unit.type === "siege_engine" || unit.type === "battering_ram" || unit.type === "catapult" ? 9 : unit.type === "messenger" ? 6 : 7;
  const moving = unit.task.kind !== "idle";
  const stride = moving ? Math.sin((renderClockMs || performance.now()) / 115 + unit.x * 0.9 + unit.y * 0.5) * 1.6 : Math.sin((renderClockMs || performance.now()) / 720 + unit.x) * 0.35;
  const x = position.x * TILE + TILE / 2;
  const y = position.y * TILE + TILE / 2 + stride;
  if (!drawUnitSprite(graphics, unit, x, y, radius, color)) drawUnitShape(graphics, unit, x, y, radius, color);
  drawUnitActionCue(graphics, unit, x, y, radius, color);
  if (unit.carriedPacketId) {
    const packetPulse = 0.74 + Math.sin((renderClockMs || performance.now()) / 180) * 0.18;
    graphics.roundRect(x + 6, y - 12, 8, 6, 1.5).fill({ color: 0xf2d28b, alpha: 0.95 }).stroke({ color: 0x100f0c, width: 1 });
    graphics.moveTo(x + 7, y - 11).lineTo(x + 10, y - 8).lineTo(x + 14, y - 11).stroke({ color: 0x7a5620, width: 1, alpha: packetPulse });
  }
  if (selectedUnitId === unit.id) graphics.circle(x, y, radius + 5).stroke({ color: 0xf2d28b, width: 2 });
  if (unit.hp < unit.maxHp) {
    const pct = Math.max(0, unit.hp / unit.maxHp);
    if (pct < 0.67) graphics.circle(x, y, radius + 4).stroke({ color: pct < 0.34 ? 0xff6b52 : 0xffb35c, width: 2, alpha: 0.78 });
    graphics.rect(x - 8, y + 9, 16, 3).fill(0x3a1918);
    graphics.rect(x - 8, y + 9, 16 * pct, 3).fill(0x77d26d);
  }
}

function drawUnitActionCue(graphics: Graphics, unit: Unit, x: number, y: number, radius: number, color: number): void {
  const now = renderClockMs || performance.now();
  const phase = Math.sin(now / 150 + unit.x * 0.8 + unit.y * 0.35);
  if (unit.task.kind === "move") {
    graphics.circle(x - 7, y + radius + 8, 1.8).fill({ color, alpha: 0.32 + Math.max(0, phase) * 0.24 });
    graphics.circle(x + 6, y + radius + 7, 1.5).fill({ color: 0xf2d28b, alpha: 0.26 + Math.max(0, -phase) * 0.22 });
    drawMovementHeading(graphics, unit, x, y, color, unit.task.target);
    return;
  }
  if (unit.task.kind === "scout") {
    const sweep = 0.45 + Math.max(0, phase) * 0.2;
    graphics.circle(x, y - 2, radius + 8).stroke({ color: 0x8fc0d2, width: 1.4, alpha: sweep });
    graphics.moveTo(x, y - 2).lineTo(x + 12, y - 11).stroke({ color: 0x8fc0d2, width: 1.3, alpha: 0.5 });
    return;
  }
  if (unit.task.kind === "gather") {
    const resourceColor = resourceColorNumber(unit.task.resource);
    graphics.moveTo(x + 8, y - 9).lineTo(x + 16 + phase * 2, y + 1).stroke({ color: 0x100f0c, width: 2.4, alpha: 0.72 });
    graphics.circle(x + 17 + phase * 2, y + 2, 2.2).fill({ color: resourceColor, alpha: 0.82 }).stroke({ color: 0x100f0c, width: 0.8, alpha: 0.7 });
    return;
  }
  if (unit.task.kind === "deliver") {
    const alpha = 0.42 + Math.max(0, phase) * 0.22;
    graphics.roundRect(x + 8, y - 16, 10, 6, 1.5).fill({ color: 0xf2d28b, alpha }).stroke({ color: 0x100f0c, width: 1, alpha: 0.72 });
    graphics.moveTo(x + 9, y - 15).lineTo(x + 13, y - 12).lineTo(x + 18, y - 15).stroke({ color: 0x7a5620, width: 1, alpha: 0.74 });
    drawMovementHeading(graphics, unit, x, y, color, unit.task.phase === "returning" ? unit.task.returnTo : unit.task.destination);
    return;
  }
  if (unit.task.kind === "repair") {
    const alpha = 0.48 + Math.max(0, phase) * 0.3;
    graphics.circle(x, y, radius + 8).stroke({ color: 0x7bd8ff, width: 1.8, alpha });
    graphics.moveTo(x + 9, y - 9).lineTo(x + 16, y - 2).moveTo(x + 16, y - 9).lineTo(x + 9, y - 2).stroke({ color: 0x7bd8ff, width: 1.8, alpha: 0.78 });
    return;
  }
  if (unit.task.kind === "guardSiege") {
    const alpha = 0.4 + Math.max(0, phase) * 0.25;
    graphics.circle(x, y, radius + 8).stroke({ color: 0x67d9ff, width: 1.8, alpha });
    graphics.moveTo(x - 11, y - 12).lineTo(x + 11, y - 12).lineTo(x + 7, y - 5).lineTo(x - 7, y - 5).closePath().stroke({ color: 0x9ee8ff, width: 1.5, alpha: 0.75 });
    return;
  }
  if (unit.task.kind === "attack" || unit.task.kind === "attackBuilding" || unit.task.kind === "attackResource") {
    const alpha = 0.42 + Math.max(0, phase) * 0.28;
    graphics.circle(x, y, radius + 7).stroke({ color: 0xff6b52, width: 1.8, alpha });
    graphics.moveTo(x + 8, y - 10).lineTo(x + 18, y - 18).stroke({ color: 0xffe17b, width: 2, alpha: 0.68 });
  }
}

function drawMovementHeading(graphics: Graphics, unit: Unit, x: number, y: number, color: number, target: Position): void {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.1) return;
  const ux = dx / length;
  const uy = dy / length;
  const tipX = x + ux * 14;
  const tipY = y + uy * 14;
  const leftX = tipX - ux * 5 - uy * 3;
  const leftY = tipY - uy * 5 + ux * 3;
  const rightX = tipX - ux * 5 + uy * 3;
  const rightY = tipY - uy * 5 - ux * 3;
  graphics.moveTo(tipX, tipY).lineTo(leftX, leftY).lineTo(rightX, rightY).closePath().fill({ color, alpha: 0.72 }).stroke({ color: 0x080706, width: 1, alpha: 0.64 });
}

function drawCombatEventOverlay(
  game: GameState,
  graphics: Graphics,
  visibleUnits: Unit[],
  visibleBuildings: Building[],
  visibleProjectiles: SiegeProjectile[]
): void {
  const now = renderClockMs || performance.now();
  for (const projectile of visibleProjectiles.slice(0, 20)) {
    const x = projectile.x * TILE + TILE / 2;
    const y = projectile.y * TILE + TILE / 2;
    if (!isWorldPointInViewport(x, y, TILE * 4)) continue;
    const color = combatMarkerColor(projectile.projectileType, undefined);
    const pulse = 0.5 + Math.sin(now / 105 + projectile.x * 0.7 + projectile.y * 0.3) * 0.5;
    const radius = projectile.projectileType === "stone_shot" ? 23 + pulse * 4 : 16 + pulse * 3;
    graphics.circle(x, y, radius).stroke({ color, width: projectile.projectileType === "stone_shot" ? 2.4 : 1.8, alpha: 0.34 + pulse * 0.22 });
    graphics
      .moveTo(x - radius * 0.42, y)
      .lineTo(x - radius * 0.16, y)
      .moveTo(x + radius * 0.16, y)
      .lineTo(x + radius * 0.42, y)
      .moveTo(x, y - radius * 0.42)
      .lineTo(x, y - radius * 0.16)
      .moveTo(x, y + radius * 0.16)
      .lineTo(x, y + radius * 0.42)
      .stroke({ color: 0xfff2ba, width: 1.2, alpha: 0.38 + pulse * 0.22 });
  }

  const maxAge = Math.round(TICK_RATE * 24);
  for (const marker of buildRecentCombatEventMarkers(game, visibleUnits, visibleBuildings, 16)) {
    const x = marker.x * TILE + TILE / 2;
    const y = marker.y * TILE + TILE / 2;
    if (!isWorldPointInViewport(x, y, TILE * 4)) continue;
    const freshness = Math.max(0, 1 - marker.ageTicks / maxAge);
    const beat = 0.5 + Math.sin(now / 165 + marker.tick * 0.31) * 0.5;
    const radius = 18 + freshness * 18 + beat * 5;
    const color = combatMarkerColor(marker.projectileType, marker.severity);
    graphics.circle(x, y, radius).stroke({ color: 0x130804, width: 4, alpha: 0.16 + freshness * 0.16 });
    graphics.circle(x, y, radius).stroke({ color, width: 2.2, alpha: 0.22 + freshness * 0.44 });
    graphics
      .moveTo(x, y - radius * 0.72)
      .lineTo(x + radius * 0.26, y)
      .lineTo(x, y + radius * 0.72)
      .lineTo(x - radius * 0.26, y)
      .closePath()
      .stroke({ color: 0xfff0b6, width: 1.2, alpha: 0.16 + freshness * 0.28 });
  }
}

function combatMarkerColor(projectileType?: SiegeProjectile["projectileType"], severity?: CombatEventMarker["severity"]): number {
  if (severity === "destroyed") return 0xff5a3d;
  if (severity === "raid") return 0xffbf47;
  if (projectileType === "stone_shot") return 0xff7a2f;
  if (projectileType === "turret_bolt") return 0x85dcff;
  if (projectileType === "arrow") return 0xf4d37b;
  return 0xff6b52;
}

function drawProjectileSprite(graphics: Graphics, projectile: SiegeProjectile): void {
  const x = projectile.x * TILE + TILE / 2;
  const y = projectile.y * TILE + TILE / 2;
  if (!isWorldPointInViewport(x, y, TILE * 3)) return;
  const texture = visualTextures?.projectiles[projectile.projectileType];
  if (!texture) {
    drawProjectile(graphics, projectile);
    return;
  }
  const startX = projectile.startX * TILE + TILE / 2;
  const startY = projectile.startY * TILE + TILE / 2;
  const targetX = projectile.targetX * TILE + TILE / 2;
  const targetY = projectile.targetY * TILE + TILE / 2;
  const angle = Math.atan2(targetY - startY, targetX - startX);
  const pulse = 0.92 + Math.sin((renderClockMs || performance.now()) / 90 + projectile.x) * 0.06;
  const sprite = acquireProjectileSprite(texture);
  sprite.x = x;
  sprite.y = y;
  sprite.rotation = angle;
  sprite.alpha = projectile.projectileType === "stone_shot" ? 0.94 : 0.98;
  sprite.tint = projectile.projectileType === "arrow" ? tribeConfig[projectile.tribeId].color : 0xffffff;
  if (projectile.projectileType === "stone_shot") {
    sprite.width = 30 * pulse;
    sprite.height = 26 * pulse;
  } else if (projectile.projectileType === "turret_bolt") {
    sprite.width = 38 * pulse;
    sprite.height = 16 * pulse;
  } else {
    sprite.width = 34 * pulse;
    sprite.height = 14 * pulse;
  }
}

function drawProjectile(graphics: Graphics, projectile: SiegeProjectile): void {
  const x = projectile.x * TILE + TILE / 2;
  const y = projectile.y * TILE + TILE / 2;
  const startX = projectile.startX * TILE + TILE / 2;
  const startY = projectile.startY * TILE + TILE / 2;
  const targetX = projectile.targetX * TILE + TILE / 2;
  const targetY = projectile.targetY * TILE + TILE / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const color = tribeConfig[projectile.tribeId].color;
  const pulse = 0.74 + Math.sin((renderClockMs || performance.now()) / 90 + projectile.x) * 0.2;
  if (projectile.projectileType === "arrow") {
    const tailX = x - ux * 16;
    const tailY = y - uy * 16;
    const tipX = x + ux * 9;
    const tipY = y + uy * 9;
    const leftX = tipX - ux * 5 + uy * 3;
    const leftY = tipY - uy * 5 - ux * 3;
    const rightX = tipX - ux * 5 - uy * 3;
    const rightY = tipY - uy * 5 + ux * 3;
    graphics.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ color: 0x2a1c10, width: 4.2, alpha: 0.72 });
    graphics.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ color: 0xe7d2a1, width: 2.1, alpha: 0.95 });
    graphics.moveTo(tipX, tipY).lineTo(leftX, leftY).lineTo(rightX, rightY).closePath().fill({ color, alpha: 0.9 }).stroke({ color: 0x080706, width: 0.8, alpha: 0.68 });
    graphics.circle(tipX, tipY, 2.1).fill({ color: 0xfff1b8, alpha: 0.78 });
    return;
  }
  if (projectile.projectileType === "turret_bolt") {
    const tailX = x - ux * 20;
    const tailY = y - uy * 20;
    const noseX = x + ux * 11;
    const noseY = y + uy * 11;
    graphics.moveTo(tailX, tailY).lineTo(noseX, noseY).stroke({ color: 0x09121d, width: 8, alpha: 0.42 });
    graphics.moveTo(tailX, tailY).lineTo(noseX, noseY).stroke({ color, width: 4.8, alpha: 0.72 });
    graphics.moveTo(x - ux * 8, y - uy * 8).lineTo(noseX, noseY).stroke({ color: 0xf8fbff, width: 2.4, alpha: 0.92 });
    graphics.circle(noseX, noseY, 5.5).fill({ color: 0xe8f2ff, alpha: 0.16 + pulse * 0.16 }).stroke({ color, width: 1.7, alpha: 0.76 });
    graphics.circle(noseX + ux * 3, noseY + uy * 3, 2.5).fill({ color: 0xffffff, alpha: 0.82 });
    return;
  }
  const trailBackX = x - ux * 24;
  const trailBackY = y - uy * 24;
  const trailMidX = x - ux * 12;
  const trailMidY = y - uy * 12;
  const sparkX = x + ux * 8;
  const sparkY = y + uy * 8;
  graphics
    .moveTo(trailBackX, trailBackY)
    .lineTo(trailMidX, trailMidY)
    .lineTo(x, y)
    .stroke({ color: 0x1b1208, width: 9, alpha: 0.36 });
  graphics.moveTo(trailBackX, trailBackY).lineTo(x, y).stroke({ color: 0xff7a2f, width: 6.2, alpha: 0.54 });
  graphics.moveTo(trailMidX, trailMidY).lineTo(sparkX, sparkY).stroke({ color: 0xfff3a4, width: 3.2, alpha: 0.84 });
  graphics.circle(x, y, 11.5).fill({ color: 0xffb347, alpha: 0.18 + pulse * 0.1 });
  graphics.circle(x, y, 7.2).fill({ color: 0x2b2925, alpha: 0.98 }).stroke({ color: 0xffed9a, width: 3.2, alpha: pulse });
  graphics.circle(x - ux * 2.2 - uy * 1.5, y - uy * 2.2 + ux * 1.5, 2.5).fill({ color: 0xded7c5, alpha: 0.96 });
  graphics.circle(sparkX, sparkY, 3.8).fill({ color: 0xfff0a4, alpha: 0.72 });
  graphics.circle(sparkX + ux * 4, sparkY + uy * 4, 2.4).fill({ color: 0xff6d2f, alpha: 0.62 });
}

function drawFog(game: GameState, graphics: Graphics): void {
  graphics.clear();
  activeFogTileCount = 0;
  activeFogEdgeCueCount = 0;
  if (observerMode) return;
  const visibility = game.visibility[playerTribe];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const v = visibility[tileIndex(x, y)];
      if (v === 2) continue;
      activeFogTileCount += 1;
      const px = x * TILE;
      const py = y * TILE;
      graphics.rect(px, py, TILE, TILE).fill({ color: 0x050505, alpha: v === 1 ? 0.42 : 0.86 });
      if (v === 1 && (x * 7 + y * 13 + game.tick) % 5 === 0) {
        graphics.moveTo(px + 3, py + 17).lineTo(px + 12, py + 8).lineTo(px + 21, py + 12).stroke({ color: 0xd7d0c2, width: 0.8, alpha: 0.08 });
      }
      if (activeFogEdgeCueCount < 320 && fogTouchesVisibleTile(visibility, x, y)) {
        activeFogEdgeCueCount += 1;
        graphics.rect(px + 2, py + 2, TILE - 4, TILE - 4).stroke({ color: 0xb8b0a1, width: 0.8, alpha: v === 1 ? 0.12 : 0.06 });
      }
    }
  }
}

function fogTouchesVisibleTile(visibility: Uint8Array, x: number, y: number): boolean {
  const neighbors = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 }
  ];
  return neighbors.some((neighbor) => neighbor.x >= 0 && neighbor.y >= 0 && neighbor.x < MAP_SIZE && neighbor.y < MAP_SIZE && visibility[tileIndex(neighbor.x, neighbor.y)] === 2);
}

function drawTerrainDetail(graphics: Graphics, x: number, y: number, terrain: TerrainType, shade: number): void {
  const px = x * TILE;
  const py = y * TILE;
  const mark = Math.abs(Math.round(shade * 1000) + x * 13 + y * 17);
  if (terrain === "road") {
    graphics
      .moveTo(px + 2, py + TILE / 2)
      .lineTo(px + TILE - 2, py + TILE / 2)
      .stroke({ color: 0xb69561, width: 2, alpha: 0.48 });
    graphics.moveTo(px + 2, py + 6).lineTo(px + TILE - 2, py + 6).stroke({ color: 0x6c5738, width: 0.8, alpha: 0.24 });
    graphics.moveTo(px + 2, py + TILE - 6).lineTo(px + TILE - 2, py + TILE - 6).stroke({ color: 0x6c5738, width: 0.8, alpha: 0.2 });
    if (mark % 5 === 0) graphics.circle(px + TILE / 2, py + TILE / 2, 1.4).fill({ color: 0x6c5738, alpha: 0.6 });
    if (mark % 7 === 0) graphics.circle(px + 5, py + TILE / 2 + 4, 1).fill({ color: 0xf0d79a, alpha: 0.38 });
    return;
  }
  if (terrain === "water") {
    if (mark % 3 !== 0) return;
    graphics
      .moveTo(px + 4, py + 7)
      .lineTo(px + 9, py + 5)
      .lineTo(px + 15, py + 7)
      .lineTo(px + 19, py + 5)
      .stroke({ color: 0x9fd0df, width: 1, alpha: 0.42 });
    if (mark % 2 === 0) {
      graphics
        .moveTo(px + 7, py + 15)
        .lineTo(px + 13, py + 13)
        .lineTo(px + 19, py + 15)
        .stroke({ color: 0xc4edf4, width: 0.9, alpha: 0.28 });
    }
    return;
  }
  if (terrain === "forest") {
    if (mark % 4 !== 0) return;
    graphics.rect(px + 9, py + 12, 4, 6).fill({ color: 0x4b3426, alpha: 0.72 });
    graphics.circle(px + 11, py + 9, 6).fill({ color: 0x2f7b45, alpha: 0.85 });
    graphics.circle(px + 7, py + 11, 4).fill({ color: 0x3f9251, alpha: 0.8 });
    if (mark % 8 === 0) graphics.circle(px + 15, py + 10, 3).fill({ color: 0x6fb45c, alpha: 0.5 });
    return;
  }
  if (terrain === "hill") {
    if (mark % 5 !== 0) return;
    graphics
      .moveTo(px + 4, py + 15)
      .lineTo(px + 10, py + 9)
      .lineTo(px + 18, py + 14)
      .stroke({ color: 0xb3a477, width: 1.4, alpha: 0.5 });
    graphics.moveTo(px + 6, py + 18).lineTo(px + 17, py + 18).stroke({ color: 0x5f5134, width: 0.9, alpha: 0.24 });
    return;
  }
  if (terrain === "mountain") {
    if (mark % 3 !== 0) return;
    graphics
      .moveTo(px + 3, py + 18)
      .lineTo(px + 10, py + 5)
      .lineTo(px + 19, py + 18)
      .stroke({ color: 0xb5b2aa, width: 1.3, alpha: 0.55 });
    graphics.moveTo(px + 8, py + 9).lineTo(px + 10, py + 5).lineTo(px + 13, py + 10).stroke({ color: 0xf0eee6, width: 1, alpha: 0.48 });
    graphics
      .moveTo(px + 10, py + 5)
      .lineTo(px + 12, py + 17)
      .stroke({ color: 0x34322e, width: 1, alpha: 0.55 });
    return;
  }
  if (mark % 10 === 0) {
    graphics
      .moveTo(px + 6, py + 15)
      .lineTo(px + 8, py + 11)
      .moveTo(px + 12, py + 16)
      .lineTo(px + 14, py + 12)
      .stroke({ color: 0x8fb565, width: 1, alpha: 0.4 });
  }
  if (mark % 47 === 0) graphics.circle(px + 17, py + 8, 1.2).fill({ color: 0xd8c56b, alpha: 0.46 });
}

function drawStrategicGrid(graphics: Graphics, minX = 0, maxX = MAP_SIZE, minY = 0, maxY = MAP_SIZE): void {
  const startX = Math.ceil(minX / 8) * 8;
  const startY = Math.ceil(minY / 8) * 8;
  const minPxX = minX * TILE;
  const maxPxX = maxX * TILE;
  const minPxY = minY * TILE;
  const maxPxY = maxY * TILE;
  for (let index = startX; index <= maxX; index += 8) {
    const major = index % 16 === 0;
    const offset = index * TILE;
    graphics.moveTo(offset, minPxY).lineTo(offset, maxPxY).stroke({ color: 0x100f0c, width: major ? 1.2 : 0.7, alpha: major ? 0.18 : 0.08 });
  }
  for (let index = startY; index <= maxY; index += 8) {
    const major = index % 16 === 0;
    const offset = index * TILE;
    graphics.moveTo(minPxX, offset).lineTo(maxPxX, offset).stroke({ color: 0x100f0c, width: major ? 1.2 : 0.7, alpha: major ? 0.18 : 0.08 });
  }
}

function drawResource(graphics: Graphics, x: number, y: number, resource: ResourceType): void {
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  if (resource === "gold") {
    graphics.circle(cx, cy, 5).fill(0xf2c14e).stroke({ color: 0x5e4310, width: 1 });
    return;
  }
  if (resource === "stone") {
    graphics.rect(cx - 5, cy - 5, 10, 10).fill(0xb6b0a4).stroke({ color: 0x46413a, width: 1 });
    return;
  }
  if (resource === "food") {
    graphics.circle(cx - 3, cy, 3).fill(0xd96c4a);
    graphics.circle(cx + 3, cy, 3).fill(0xf09a62);
    return;
  }
  if (resource === "clay") {
    graphics.rect(cx - 6, cy - 5, 12, 10).fill(0xb7653f).stroke({ color: 0x4a251b, width: 1 });
    graphics.moveTo(cx - 5, cy).lineTo(cx + 5, cy).stroke({ color: 0x5d2e20, width: 1, alpha: 0.75 });
    graphics.moveTo(cx, cy - 4).lineTo(cx, cy + 4).stroke({ color: 0x5d2e20, width: 1, alpha: 0.75 });
    return;
  }
  if (resource === "limestone") {
    graphics
      .rect(cx - 6, cy - 5, 12, 10)
      .fill(0xded7bd)
      .stroke({ color: 0x5f5a4a, width: 1 });
    graphics
      .moveTo(cx - 5, cy - 1)
      .lineTo(cx + 5, cy - 1)
      .moveTo(cx - 1, cy - 5)
      .lineTo(cx - 1, cy + 5)
      .stroke({ color: 0x8f876f, width: 1, alpha: 0.78 });
    return;
  }
  if (resource === "iron") {
    graphics.regularPoly(cx, cy, 6, 5).fill(0x6f7d88).stroke({ color: 0x1d252b, width: 1.5 });
    graphics.circle(cx - 2, cy - 2, 1.5).fill({ color: 0xc3d0d7, alpha: 0.8 });
    return;
  }
  if (resource === "coal") {
    graphics.regularPoly(cx, cy, 7, 4).fill(0x23252a).stroke({ color: 0xe4e0d4, width: 1.4 });
    graphics.circle(cx - 2, cy - 2, 1.7).fill({ color: 0x9a9a95, alpha: 0.75 });
    return;
  }
  graphics.rect(cx - 5, cy - 4, 10, 8).fill(0x8ac17a).stroke({ color: 0x2d5b34, width: 1 });
}

function addResourceLabels(game: GameState, layer: Container, tier: LabelTier): void {
  const bounds = currentViewportTileBounds();
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const tile = game.map[tileIndex(x, y)];
      if (tile.resource && tile.resource.amount > 0 && tile.resource.hp > 0 && shouldRenderResourceLabel(tile.resource.type, tier)) {
        addMapText(layer, resourceAbbrev(tile.resource.type), x * TILE + TILE / 2, y * TILE + TILE / 2 + 0.5, 8, resourceLabelColor(tile.resource.type));
      } else if (tile.terrain === "forest" && shouldRenderForestHintLabel(tier) && (x * 7 + y * 11) % 41 === 0) {
        addMapText(layer, "W", x * TILE + TILE / 2, y * TILE + TILE / 2 + 0.5, 7, "#d7f0c8");
      }
    }
  }
}

function drawUnitShape(graphics: Graphics, unit: Unit, x: number, y: number, radius: number, color: number): void {
  const texture = visualTextures?.units[unit.type]?.[unitVisualState(unit)] ?? visualTextures?.units[unit.type]?.idle;
  if (texture) {
    const size = unitSpriteSize(unit);
    graphics.ellipse(x, y + radius + 7, radius + 7, 3.5).fill({ color, alpha: 0.28 }).stroke({ color: 0x100f0c, width: 1, alpha: 0.22 });
    graphics.texture(texture, 0xffffff, x - size / 2, y - size / 2 - 2, size, size);
    graphics.circle(x - size * 0.34, y - size * 0.3, Math.max(2.2, size * 0.085)).fill({ color, alpha: 0.94 }).stroke({ color: 0x100f0c, width: 0.8, alpha: 0.72 });
    if (unit.type === "sovereign") {
      graphics.circle(x, y - size * 0.45, size * 0.18).stroke({ color, width: 2, alpha: 0.96 });
    } else if (unit.type === "messenger" || unit.type === "trader") {
      graphics.rect(x - size * 0.18, y + size * 0.17, size * 0.36, 2.2).fill({ color, alpha: 0.86 });
    } else if (isMilitaryUnitType(unit.type)) {
      graphics.moveTo(x - size * 0.25, y + size * 0.22).lineTo(x + size * 0.25, y + size * 0.22).stroke({ color, width: 2, alpha: 0.9 });
    }
    if (unit.task.kind !== "idle") {
      graphics.ellipse(x, y + radius + 7, radius + 5, 3).stroke({ color, width: 1.3, alpha: 0.38 });
    }
    return;
  }
  if (unit.type === "sovereign") {
    graphics.circle(x, y, radius + 2).fill(0xf2d28b).stroke({ color: 0x100f0c, width: 2 });
    graphics.circle(x, y, radius - 1).fill(color);
    return;
  }
  if (unit.type === "archer") {
    graphics.regularPoly(x, y, radius + 2, 3).fill(color).stroke({ color: 0x100f0c, width: 2 });
    return;
  }
  if (unit.type === "militia") {
    graphics.regularPoly(x, y, radius + 2, 4).fill(color).stroke({ color: 0x100f0c, width: 2 });
    return;
  }
  if (unit.type === "sentinel") {
    graphics.circle(x, y, radius).fill(0xf5efe0).stroke({ color, width: 3 });
    return;
  }
  if (unit.type === "messenger") {
    graphics.roundRect(x - 7, y - 5, 14, 10, 2).fill(0xf5efe0).stroke({ color, width: 3 });
    return;
  }
  graphics.circle(x, y, radius).fill(color).stroke({ color: 0x100f0c, width: 2 });
}

function addMapText(layer: Container, text: string, x: number, y: number, fontSize: number, fill: string): boolean {
  if (!isWorldPointInViewport(x, y, 100)) return false;
  const label = acquireMapText(layer, text, fontSize, fill);
  label.x = x;
  label.y = y;
  const paddingX = Math.max(4, Math.ceil(fontSize * 0.36));
  const paddingY = Math.max(2, Math.ceil(fontSize * 0.2));
  const width = Math.ceil(label.width + paddingX * 2);
  const height = Math.ceil(label.height + paddingY * 2);
  labelBackdropGraphics
    .roundRect(x - width / 2, y - height / 2, width, height, Math.min(5, height / 2))
    .fill({ color: 0x080706, alpha: 0.54 })
    .stroke({ color: 0xf2d28b, width: 1, alpha: 0.22 });
  return true;
}

function updateHud(game: GameState): void {
  const tribe = game.tribes[playerTribe];
  const population = Object.values(game.units).filter((unit) => unit.tribeId === playerTribe && unit.hp > 0).length;
  const victory = getVictoryPressure(game);
  const playerScore = victory.scoreByTribe.find((score) => score.tribeId === playerTribe);
  const aiStatus = compactAiStatus(game);
  resourceBar.innerHTML = [
    ["Year", victory.currentYear.toString()],
    ["Turn", game.tick.toString()],
    ["Survival", victory.status === "claimed" ? victory.winnerName ?? "claimed" : `${victory.survivingTribes} left`],
    ["Next review", `${victory.nextReviewYear}`],
    ["Player happy", `${Math.round(tribe.happiness)}`],
    ["Player safety", `${playerScore?.safety ?? 0}`],
    ["Gold", tribe.resources.gold.toFixed(0)],
    ["Food", tribe.resources.food.toFixed(0)],
    ["Wood", tribe.resources.wood.toFixed(0)],
    ["Stone", tribe.resources.stone.toFixed(0)],
    ["Clay", tribe.resources.clay.toFixed(0)],
    ["Limestone", tribe.resources.limestone.toFixed(0)],
    ["Iron", tribe.resources.iron.toFixed(0)],
    ["Coal", tribe.resources.coal.toFixed(0)],
    ["Player pop", `${population}/${getPopulationCap(game, playerTribe)}`],
    ["LLM", activeModel ? "local" : "fallback"],
    ["Tribes", `${victory.survivingTribes}/${tribeIds.length}`],
    ["AI lanes", `${aiStatus.activeLanes}/${aiStatus.maxLanes}`],
    ["Identities", `${aiStatus.identitiesChosen}/${aiStatus.identitiesTotal}`],
    ["Doctrines", `${aiStatus.firstDoctrines}/${aiStatus.tribesTotal}`],
    ["Live AI turns", `${aiStatus.liveDecisions}`],
    ["Fallback decisions", `${aiStatus.fallbackDecisions}`]
  ]
    .map(([label, value]) => `<span class="resource-pill resource-${label.toLowerCase().replace(/\s+/g, "-")}"><span class="muted">${label}</span><strong>${value}</strong></span>`)
    .join("");

  llmPanel.innerHTML = llmMarkup(game);
  victoryPanel.innerHTML = victoryMarkup(game);
  aiBugPanel.innerHTML = aiBugMarkup(game);
  aiInfoRequestPanel.innerHTML = aiInfoRequestMarkup(game);
  aiReportReviewPanel.innerHTML = aiReportReviewMarkup();
  tribePanel.innerHTML = tribeMarkup(game);
  selectedPanel.innerHTML = selectedMarkup(game);
  diplomacyPanel.innerHTML = diplomacyMarkup(game);
  const events = observerMode ? game.events.slice(-16).reverse() : getRecentVisibleEvents(game, playerTribe, 14);
  const eventLogUnits = observerMode ? Object.values(game.units).filter((unit) => unit.hp > 0) : getVisibleUnits(game, playerTribe);
  const eventLogBuildings = observerMode ? Object.values(game.buildings) : getVisibleBuildings(game, playerTribe);
  const combatMarkers = buildRecentCombatEventMarkers(game, eventLogUnits, eventLogBuildings, 4);
  const combatMarkup =
    combatMarkers.length > 0
      ? `<div class="event-row combat-event-row"><strong>Recent combat</strong>${combatMarkers
          .map(
            (marker) =>
              `<br><span class="muted">Turn ${marker.tick}</span> ${escapeHtml(marker.title)} <span class="muted">@ ${marker.x},${marker.y}</span>`
          )
          .join("")}</div>`
      : "";
  eventLog.innerHTML = `${combatMarkup}${events
    .map((event) => `<div class="event-row"><strong>${event.title}</strong><br><span class="muted">Turn ${event.tick}</span><br>${event.body}</div>`)
    .join("")}`;
}

function selectedMarkup(game: GameState): string {
  const unit = selectedUnitId ? game.units[selectedUnitId] : undefined;
  if (unit) {
    const durability = combatStatSnapshot(unit);
    return `
      <div class="selected-row"><strong>${unit.name}</strong> <span class="muted">${unit.type}</span></div>
      <div class="selected-row">Unit id: ${unit.id}</div>
      <div class="selected-row">Tribe: ${game.tribes[unit.tribeId].name}</div>
      <div class="selected-row">Naming style: ${game.tribes[unit.tribeId].namingStyle}</div>
      <div class="selected-row">Health: ${Math.ceil(unit.hp)} / ${unit.maxHp}</div>
      <div class="selected-row">Condition: ${formatCondition(durability.condition)} (${durability.healthPct}%)</div>
      <div class="selected-row">Armor: ${unit.armor}</div>
      <div class="selected-row">Attack: ${unit.attack} / range ${unit.range}</div>
      <div class="selected-row">Order: ${describeUnitTask(game, unit)}</div>
    `;
  }
  const building = selectedBuildingId ? game.buildings[selectedBuildingId] : undefined;
  if (building) {
    const durability = buildingDurabilitySnapshot(game, building);
    return `
      <div class="selected-row"><strong>${labelBuilding(building.type)}</strong></div>
      ${
        constructionFlash?.buildingId === building.id
          ? `<div class="selected-row construction-confirmation">New construction visible on map</div>`
          : ""
      }
      <div class="selected-row">Tribe: ${game.tribes[building.tribeId].name}</div>
      <div class="selected-row">Position: ${building.x}, ${building.y}</div>
      <div class="selected-row">Health: ${building.hp} / ${building.maxHp}</div>
      <div class="selected-row">Condition: ${formatCondition(durability.condition)} (${durability.healthPct}%); repair ${formatRepairState(durability.repairState)}</div>
      <div class="selected-row">Armor: ${building.armor}</div>
      <div class="selected-row">Attack: ${building.attack} / range ${building.range}</div>
      ${
        building.type === "gate"
          ? `<div class="selected-row">Gate: ${building.gateState ?? "open"}; access ${formatGateAccessPolicy(building.gateAccessPolicy ?? "owner_allies")}</div>`
          : ""
      }
      ${
        building.type === "gate" && getActiveGateAccessTreaties(game, building.id).length > 0
          ? `<div class="selected-row">Access treaties: ${getActiveGateAccessTreaties(game, building.id)
              .map(
                (treaty) =>
                  `${escapeHtml(game.tribes[treaty.targetTribeId].name)}${treaty.expiresAtTick ? ` until ${treaty.expiresAtTick}` : ""}${
                    treaty.routeId ? ` route ${escapeHtml(treaty.routeId)}` : ""
                  }${treaty.routeName ? ` ${escapeHtml(treaty.routeName)}` : ""}${
                    treaty.routeGateIds?.length ? ` gates ${treaty.routeGateIds.map((id) => escapeHtml(id)).join("/")}` : ""
                  }`
              )
              .join(", ")}</div>`
          : ""
      }
      ${
        building.type === "gate" && building.gateSabotage
          ? `<div class="selected-row">Sabotage: ${escapeHtml(building.gateSabotage.action)} by ${escapeHtml(game.tribes[building.gateSabotage.tribeId].name)}${
              building.gateSabotage.expiresAtTick ? ` until ${building.gateSabotage.expiresAtTick}` : ""
            }</div>`
          : ""
      }
      ${
        building.type === "gate" && building.gateOperation
          ? `<div class="selected-row">Operation: ${escapeHtml(building.gateOperation.gateOperationIntent ?? building.gateOperation.id)}${
              building.gateOperation.entryAction ? `; action ${escapeHtml(building.gateOperation.entryAction)}` : ""
            }${
              building.gateOperation.tollGold ? `; toll ${building.gateOperation.tollGold} ${escapeHtml(building.gateOperation.tollMode ?? "optional")}` : ""
            }${
              building.gateOperation.unpaidAction ? `; unpaid ${escapeHtml(building.gateOperation.unpaidAction)}` : ""
            }${
              building.gateOperation.detainedPacketAction ? `; detained ${escapeHtml(building.gateOperation.detainedPacketAction)}` : ""
            }${
              building.gateOperation.detainedPacketId ? ` ${escapeHtml(building.gateOperation.detainedPacketId)}` : ""
            }${
              building.gateOperation.ransomGold ? `; ransom ${building.gateOperation.ransomGold}` : ""
            }${
              building.gateOperation.releaseSubject || building.gateOperation.releaseMessage ? "; release message" : ""
            }${
              building.gateOperation.accessTreatyAction ? `; treaty ${escapeHtml(building.gateOperation.accessTreatyAction)}` : ""
            }${
              building.gateOperation.accessTreatyName ? ` ${escapeHtml(building.gateOperation.accessTreatyName)}` : ""
            }${
              building.gateOperation.sabotageAction ? `; sabotage ${escapeHtml(building.gateOperation.sabotageAction)}` : ""
            }${
              building.gateOperation.gatePublicNotice ? `; public ${escapeHtml(building.gateOperation.gatePublicNotice)}` : ""
            }${
              building.gateOperation.gateTerms ? `; private ${escapeHtml(building.gateOperation.gateTerms)}` : ""
            }</div>`
          : ""
      }
      ${isBuildableBuilding(building.type) ? `<div class="selected-row">Build cost: ${formatCost(getEffectiveBuildingCost(game, building.tribeId, building.type))}</div>` : ""}
      ${building.hp < building.maxHp ? `<div class="selected-row">Repair cost: ${formatCost(getTribeBuildingRepairCost(game, building.tribeId, building))}</div>` : ""}
      <div class="selected-row">${buildingRole(building.type)}</div>
    `;
  }
  return "Select a visible unit or building.";
}

function llmMarkup(game: GameState): string {
  const latest = game.aiDecisions.slice(-12).reverse();
  const cooldown = activeOllamaCooldown();
  const quality = modelQualitySummary();
  const aiStatus = compactAiStatus(game);
  const activeJobs = activeLlmJobRows();
  const identityChosen = tribeIds.filter((tribeId) => game.tribes[tribeId].identityChosen || !isTribeActive(game, tribeId)).length;
  const firstDoctrines = tribeIds.filter((tribeId) => !isTribeActive(game, tribeId) || hasDoctrineDecision(tribeId)).length;
  const activeJobMarkup = activeJobs
    .map((job) => `${escapeHtml(job.tribeName)} ${escapeHtml(job.mode)} with ${escapeHtml(job.model)}`)
    .join("<br>");
  const qualityMarkup =
    quality
      .map(
        (item) => `
          <div class="model-quality-row">
            <strong>${escapeHtml(item.model)}</strong>
            <span class="tag">${escapeHtml(modelQualityStatusLabel(item.status))}</span>
            <br><span class="muted">Live ${item.liveDecisions}, fallback ${item.fallbackDecisions}, rejected ${item.rejected}, issues ${item.bugReports}, recovered ${item.jsonRecoveries + item.transportRetries}</span>
          </div>
        `
      )
      .join("") || `<span class="muted">No model turns recorded yet.</span>`;
  return `
    <div class="llm-status ${activeJobs.length ? "thinking" : ""}">
      <strong>${activeJobs.length ? `Active AI ${activeJobs.length}/${maxConcurrentLlmJobs()}` : "Status"}</strong><br>
      ${activeJobs.length ? activeJobMarkup : escapeHtml(llmStatus)}
      ${activeJobs.length ? `<br><span class="muted">${escapeHtml(llmStatus)}</span>` : ""}
      <br><span class="muted">Identity setup: ${identityChosen}/${tribeIds.length}${openingIdentitySetupPending() ? " before first strategy" : ""}</span>
      <br><span class="muted">First doctrines: ${firstDoctrines}/${tribeIds.length}</span>
      <br><span class="muted">Live AI turns: ${aiStatus.liveDecisions}; fallback decisions: ${aiStatus.fallbackDecisions}</span>
      <br><span class="muted">${identityStatus}</span>
      ${
        cooldown
          ? `<br><span class="status-overdue">Ollama cooldown: ${escapeHtml(cooldown.model)} fallback for ${Math.max(0, cooldown.untilTick - game.tick)} turns; ${cooldown.reportsSuppressed} duplicate reports suppressed.${cooldown.lastProbeStatus ? ` ${escapeHtml(cooldown.lastProbeStatus)}` : ""}</span>`
          : ""
      }
      <br><span class="muted">Models: ${ollamaModels.map((model) => model.name).join(", ") || "none detected"}</span>
      <br><span class="muted">Startup names: ${escapeHtml(identityBootstrapSummary())}</span>
      <br><span class="muted">Assignments: ${escapeHtml(modelAssignmentSummary())}</span>
      ${chatAdapterSummary(ollamaModels) ? `<br><span class="muted">${escapeHtml(chatAdapterSummary(ollamaModels).trim())}</span>` : ""}
      ${skippedModelSummary(ollamaModels) ? `<br><span class="muted">${escapeHtml(skippedModelSummary(ollamaModels).trim())}</span>` : ""}
      <br><span class="muted">${bugReportStatus}</span>
    </div>
    <div class="model-quality-list">
      ${qualityMarkup}
    </div>
    <div class="decision-list">
      ${latest
        .map(
          (decision) => `
            <div class="llm-decision-row">
              <strong style="color:${game.tribes[decision.tribeId].colorText}">${game.tribes[decision.tribeId].name}</strong>
              <span class="tag">${decision.provider}</span>
              ${decision.freeformStrategy ? `<br><span class="muted">Doctrine: ${decision.freeformStrategy}</span>` : ""}
              <br>${decision.strategySummary}
              ${decision.memoryNote ? `<br><span class="muted">Memory: ${escapeHtml(decision.memoryNote)}</span>` : ""}
              <br><span class="muted">Accepted: ${decision.accepted.join("; ") || "none"}</span>
              ${decision.rejected.length > 0 ? `<br><span class="status-overdue">Rejected: ${decision.rejected.join("; ")}</span>` : ""}
            </div>
          `
        )
        .join("") || `<span class="muted">Waiting for first sovereign decision.</span>`}
    </div>
  `;
}

function compactAiStatus(game: GameState): {
  activeLanes: number;
  maxLanes: number;
  identitiesChosen: number;
  identitiesTotal: number;
  firstDoctrines: number;
  tribesTotal: number;
  liveDecisions: number;
  fallbackDecisions: number;
  parserTransportIssues: number;
} {
  return {
    activeLanes: activeLlmJobs.size,
    maxLanes: maxConcurrentLlmJobs(),
    identitiesChosen: tribeIds.filter((tribeId) => game.tribes[tribeId].identityChosen || !isTribeActive(game, tribeId)).length,
    identitiesTotal: tribeIds.length,
    firstDoctrines: tribeIds.filter((tribeId) => !isTribeActive(game, tribeId) || hasDoctrineDecision(tribeId)).length,
    tribesTotal: tribeIds.length,
    liveDecisions: game.aiDecisions.filter((decision) => decision.provider === "ollama").length,
    fallbackDecisions: game.aiDecisions.filter((decision) => decision.provider === "fallback").length,
    parserTransportIssues: aiBugReports.filter((entry) => entry.category === "llm_parser" || entry.category === "llm_transport").length
  };
}

function modelQualityStatusLabel(status: ModelQualitySummary["status"]): string {
  if (status === "no-turns") return "no turns";
  if (status === "clean") return "clean";
  if (status === "unstable") return "unstable";
  return "watch";
}

function victoryMarkup(game: GameState): string {
  const victory = getVictoryPressure(game);
  const learningHistory = persistentLearningSummary();
  const playerComparison = learningHistory.comparisons.find((comparison) => comparison.tribeId === playerTribe);
  const playerScore = victory.scoreByTribe.find((score) => score.tribeId === playerTribe);
  const progress = Math.round(victory.targetProgress * 100);
  const deadlineLabel = victory.yearsUntilReview === 0 ? "now" : `year ${victory.nextReviewYear} (${victory.yearsUntilReview} years)`;
  const statusLabel = victory.status === "claimed" ? "claimed" : victory.status === "warning" ? "warning" : "surviving";
  const learningText =
    game.postGameLearnings.length > 0
      ? `<div class="status-returning">Learning applied: ${game.postGameLearnings.length} sovereign lessons written for next iteration.</div>`
      : "";
  const historyText =
    learningHistory.storedGames > 0
      ? `<div class="status-returning">Persistent learning: ${learningHistory.storedGames} saved game${learningHistory.storedGames === 1 ? "" : "s"}, ${learningHistory.storedLessons} saved lessons, ${learningHistory.appliedLessons} lessons loaded for this run.${
          playerComparison?.games && playerComparison.latestRank
            ? ` Blue latest rank ${playerComparison.latestRank}, best rank ${playerComparison.bestRank ?? playerComparison.latestRank}.`
            : ""
        }</div>`
      : "";
  return `
    <div class="victory-summary ${victory.status}">
      <div class="victory-header">
        <strong>${statusLabel}</strong>
        <span class="tag">public</span>
      </div>
      <div>${escapeHtml(victory.publicText)}</div>
    </div>
    <div class="victory-grid">
      <div><span class="muted">Year</span><strong>${victory.currentYear} / ${victory.finalYear}</strong></div>
      <div><span class="muted">Survivors</span><strong>${victory.survivingTribes} / ${tribeIds.length}</strong></div>
      <div><span class="muted">Next review</span><strong>${deadlineLabel}</strong></div>
      <div><span class="muted">Blue wealth</span><strong>${playerScore?.wealth ?? computeWealth(game, playerTribe)}</strong></div>
    </div>
    <div class="victory-meter" aria-label="Victory pressure ${progress}%">
      <span style="width:${progress}%"></span>
    </div>
    ${
      playerScore
        ? `<div class="muted">Review culls the lowest total wealth. Blue population ${playerScore.population}; happiness ${playerScore.happiness}; safety ${playerScore.safety}; per-head wealth ${playerScore.wealthPerCapita} is diagnostic only.</div>`
        : ""
    }
    ${
      victory.winnerName
        ? `<div class="status-overdue">Survival winner: ${escapeHtml(victory.winnerName)} in year ${victory.wonYear ?? victory.currentYear}.</div>`
        : ""
    }
    ${learningText}
    ${historyText}
  `;
}

function aiBugMarkup(game: GameState): string {
  if (aiBugReports.length === 0) {
    return `<span class="muted">No AI bug reports or blocked orders in this run yet.</span>`;
  }
  return aiBugReports
    .slice(-10)
    .reverse()
    .map((entry) => {
      const rejected = entry.rejected.slice(0, 3).map(escapeHtml).join("; ");
      const accepted = entry.accepted.slice(0, 2).map(escapeHtml).join("; ");
      return `
        <div class="ai-bug-row ${aiBugCategoryClass(entry.category)}">
          <div class="ai-bug-header">
            <strong style="color:${game.tribes[entry.tribeId].colorText}">${escapeHtml(entry.tribeName)}</strong>
            <span class="tag">${aiBugCategoryLabel(entry.category)}</span>
            <span class="tag severity-${entry.severity}">${entry.severity}</span>
            <span class="tag">${aiBugSaveLabel(entry.saveState)}</span>
          </div>
          <div>${escapeHtml(entry.report)}</div>
          <div class="muted">Turn ${entry.tick} | ${escapeHtml(entry.provider)} / ${escapeHtml(entry.model)}</div>
          <div class="muted">Source: ${escapeHtml(entry.source)}</div>
          <div class="muted">Context: ${escapeHtml(entry.turnContext)}</div>
          ${entry.snapshot ? `<div class="muted"><a href="${escapeHtml(entry.snapshot)}" target="_blank" rel="noreferrer">Snapshot</a></div>` : ""}
          ${accepted ? `<div class="muted">Accepted: ${accepted}</div>` : ""}
          ${rejected ? `<div class="status-overdue">Rejected: ${rejected}</div>` : ""}
          ${entry.error ? `<div class="status-overdue">Save error: ${escapeHtml(entry.error)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function aiInfoRequestMarkup(game: GameState): string {
  const requests = state.aiInformationRequests.slice(-8).reverse();
  if (requests.length === 0) {
    return `<span class="muted">No private intelligence requests yet. Peer questions belong in physical diplomacy messages.</span>`;
  }
  return requests
    .map(
      (request) => `
        <div class="info-request-row">
          <div class="info-request-header">
            <strong style="color:${game.tribes[request.tribeId].colorText}">${escapeHtml(game.tribes[request.tribeId].name)}</strong>
            <span class="tag">private intel</span>
            <span class="tag">turn ${request.tick}</span>
          </div>
          <div><strong>${escapeHtml(request.subject)}</strong></div>
          <div>${escapeHtml(request.body)}</div>
          <div class="muted">Reason: ${escapeHtml(request.reason)}</div>
          ${
            request.answer
              ? `<div class="info-answer ${request.answerStatus === "partial" ? "partial" : ""}">
                  <strong>${request.answerStatus === "partial" ? "Partial clerk answer" : "Clerk answer"}</strong>
                  <br>${escapeHtml(request.answer)}
                </div>`
              : `<div class="muted">Answer pending.</div>`
          }
        </div>
      `
    )
    .join("");
}

function aiReportReviewMarkup(): string {
  if (!aiReportReview.ok) {
    return `<span class="muted">Report history unavailable${aiReportReview.error ? `: ${escapeHtml(aiReportReview.error)}` : "."}</span>`;
  }
  if (aiReportReview.total === 0) {
    return `<span class="muted">No persisted AI reports yet.</span>`;
  }
  const categories = aiReportScopedCategories()
    .map(
      (category) => `
        <div class="review-category-row">
          <strong>${escapeHtml(aiBugCategoryLabel(category.category as AiBugCategory))}</strong>
          <span class="tag">${category.count}</span>
          <br><span class="muted">Latest: turn ${escapeHtml(category.latestTick)}, ${escapeHtml(category.latestTribe)}</span>
        </div>
      `
    )
    .join("");
  const filtered = filteredAiReports();
  const latest = filtered
    .slice(0, 6)
    .map(
      (entry) => {
        const status = aiReportEntryStatus(entry);
        return `
        <div class="review-entry-row">
          <strong>${escapeHtml(entry.tribe)}</strong>
          <span class="tag">${escapeHtml(aiBugCategoryLabel(entry.category as AiBugCategory))}</span>
          <span class="tag severity-${escapeHtml(entry.severity)}">${escapeHtml(entry.severity)}</span>
          <span class="tag triage-${status}">${triageStatusLabel(status)}</span>
          <br><span class="muted">Turn ${escapeHtml(entry.tick)} | ${escapeHtml(entry.provider)} / ${escapeHtml(entry.model)}</span>
          ${entry.source ? `<br><span class="muted">Source: ${escapeHtml(entry.source)}</span>` : ""}
          ${entry.turnContext ? `<br><span class="muted">Context: ${escapeHtml(entry.turnContext)}</span>` : ""}
          ${
            entry.snapshot
              ? `<br><button type="button" class="snapshot-preview-button" data-snapshot-url="${escapeHtml(entry.snapshot)}" data-snapshot-id="${escapeHtml(entry.id)}">Preview snapshot</button>
                 <a class="snapshot-link" href="${escapeHtml(entry.snapshot)}" target="_blank" rel="noreferrer">Open JSON</a>`
              : ""
          }
          <br>${escapeHtml(entry.report)}
          ${entry.triageNote ? `<br><span class="muted">Triage note: ${escapeHtml(entry.triageNote)}</span>` : ""}
          ${entry.triageStatus === "fixed" ? `<br><span class="muted">${entry.triageProof ? `Fix proof: ${escapeHtml(triageProofText(entry.triageProof))}` : "Missing fix proof"}</span>` : ""}
          ${
            entry.bucketCovered
              ? `<br><span class="muted">Bucket covered: ${escapeHtml(triageStatusLabel(entry.bucketStatus ?? "unresolved"))} through ${escapeHtml(entry.bucketCoversReportsThrough ?? "latest report")}</span>`
              : ""
          }
          ${entry.bucketProof ? `<br><span class="muted">Bucket proof: ${escapeHtml(triageProofText(entry.bucketProof))}</span>` : ""}
          <div class="triage-actions">
            ${triageActionButton(entry, "triaged")}
            ${triageActionButton(entry, "fixed")}
            ${triageActionButton(entry, "ignored")}
            ${status !== "unresolved" ? triageActionButton(entry, "unresolved") : ""}
          </div>
        </div>
      `;
      }
    )
    .join("") || `<span class="muted">No reports match the current filters.</span>`;
  const triage = aiReportReview.triageCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const liveReview = aiReportReview.liveReviewCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const syntheticReview = aiReportReview.syntheticReviewCounts ?? { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const buckets = aiReportFocusBuckets();
  const bucketMarkup =
    buckets
      .map(
        (bucket) => `
          <button
            type="button"
            class="review-focus-button"
            data-report-focus="true"
            data-bucket-key="${escapeHtml(bucket.key)}"
            data-bucket-current="${escapeHtml(String(bucket.filters.status === "unresolved"))}"
            data-bucket-proof="${escapeHtml(String(Boolean(aiReportReview.buckets.find((candidate) => candidate.key === bucket.key)?.latestFixedProof)))}"
            data-filter-scope="${escapeHtml(bucket.filters.scope)}"
            data-filter-status="${escapeHtml(bucket.filters.status)}"
            data-filter-category="${escapeHtml(bucket.filters.category)}"
            data-filter-severity="${escapeHtml(bucket.filters.severity)}"
            data-filter-provider="${escapeHtml(bucket.filters.provider)}"
            data-filter-model="${escapeHtml(bucket.filters.model)}"
            data-filter-query="${escapeHtml(bucket.filters.query)}"
          >
            <strong>${escapeHtml(bucket.label)}</strong>
            <span>${bucket.count}</span>
            <em>${escapeHtml(bucket.filters.status === "unresolved" ? "Current bucket" : "Cleared bucket")}</em>
            <small>Latest: turn ${escapeHtml(bucket.latestTick)}, ${escapeHtml(bucket.latestTribe)}</small>
          </button>
        `
      )
      .join("") || `<span class="muted">${escapeHtml(aiReportFocusEmptyText())}</span>`;
  return `
    <div class="review-summary">
      <strong>${aiReportReview.total}</strong> persisted AI reports
      <br><span class="muted">Scope: ${escapeHtml(reportScopeLabel(aiReportFilters.scope))} | live ${escapeHtml(String(aiReportReview.liveReports ?? 0))} | synthetic QA ${escapeHtml(String(aiReportReview.syntheticReports ?? 0))}</span>
      <br><span class="muted">Live backlog: unresolved ${liveReview.unresolved} | triaged ${liveReview.triaged} | fixed ${liveReview.fixed} | ignored ${liveReview.ignored}</span>
      ${
        aiReportReview.reviewCounts
          ? `<br><span class="muted">All effective: unresolved ${aiReportReview.reviewCounts.unresolved} | triaged ${aiReportReview.reviewCounts.triaged} | fixed ${aiReportReview.reviewCounts.fixed} | ignored ${aiReportReview.reviewCounts.ignored}</span>`
          : ""
      }
      <br><span class="muted">Synthetic QA: unresolved ${syntheticReview.unresolved} | triaged ${syntheticReview.triaged} | fixed ${syntheticReview.fixed} | ignored ${syntheticReview.ignored}</span>
      <br><span class="muted">Raw triage: unresolved ${triage.unresolved} | triaged ${triage.triaged} | fixed ${triage.fixed} | ignored ${triage.ignored}</span>
      <br><span class="muted">Bucket covered reports: ${escapeHtml(String(aiReportReview.bucketCoveredReports ?? 0))}</span>
      <br><span class="muted">Showing ${filtered.length} matching reports; ${Math.min(filtered.length, 6)} visible.</span>
    </div>
    <div class="review-focus-list">
      ${bucketMarkup}
    </div>
    ${aiSnapshotPreviewMarkup()}
    <div class="review-filters">
      <label>
        Scope
        <select id="reportScopeFilter">
          ${reportScopeOptions()}
        </select>
      </label>
      <label>
        Status
        <select id="reportStatusFilter">
          ${reportStatusOptions()}
        </select>
      </label>
      <label>
        Category
        <select id="reportCategoryFilter">
          ${reportCategoryOptions()}
        </select>
      </label>
      <label>
        Severity
        <select id="reportSeverityFilter">
          ${reportSeverityOptions()}
        </select>
      </label>
      <label>
        Provider
        <select id="reportProviderFilter">
          ${reportProviderOptions()}
        </select>
      </label>
      <label>
        Model
        <select id="reportModelFilter">
          ${reportModelOptions()}
        </select>
      </label>
      <label>
        Search
        <input id="reportSearchInput" type="search" value="${escapeHtml(aiReportFilters.query)}" placeholder="tribe, source, context, model" />
      </label>
    </div>
    <div class="review-category-list">${categories}</div>
    <div class="review-latest-list">${latest}</div>
  `;
}

function reportStatusOptions(): string {
  const options: Array<[AiReportFilterStatus, string]> = [
    ["all", "all"],
    ["unresolved", "unresolved"],
    ["triaged", "triaged"],
    ["fixed", "fixed"],
    ["ignored", "ignored"]
  ];
  return options.map(([value, label]) => `<option value="${value}"${aiReportFilters.status === value ? " selected" : ""}>${label}</option>`).join("");
}

function reportScopeOptions(): string {
  const options: Array<[AiReportScopeFilter, string]> = [
    ["live", "live AI"],
    ["synthetic", "synthetic QA"],
    ["all", "all"]
  ];
  return options.map(([value, label]) => `<option value="${value}"${aiReportFilters.scope === value ? " selected" : ""}>${label}</option>`).join("");
}

function reportScopeLabel(scope: AiReportScopeFilter): string {
  if (scope === "synthetic") return "synthetic QA";
  if (scope === "all") return "all";
  return "live AI";
}

function reportCategoryOptions(): string {
  const known = new Set(["all", ...scopedReportSource().map((entry) => entry.category)]);
  return Array.from(known)
    .map((category) => `<option value="${escapeHtml(category)}"${aiReportFilters.category === category ? " selected" : ""}>${category === "all" ? "all" : aiBugCategoryLabel(category as AiBugCategory)}</option>`)
    .join("");
}

function reportSeverityOptions(): string {
  const source = scopedReportSource();
  const seen = new Set(source.map((entry) => entry.severity).filter(Boolean));
  const ordered = ["all", "high", "medium", "low", ...Array.from(seen).filter((severity) => !["high", "medium", "low"].includes(severity)).sort()];
  return ordered
    .filter((severity, index, list) => list.indexOf(severity) === index)
    .map((severity) => `<option value="${escapeHtml(severity)}"${aiReportFilters.severity === severity ? " selected" : ""}>${escapeHtml(severity)}</option>`)
    .join("");
}

function reportProviderOptions(): string {
  return reportValueOptions("provider", aiReportFilters.provider);
}

function reportModelOptions(): string {
  return reportValueOptions("model", aiReportFilters.model);
}

function reportValueOptions(field: "provider" | "model", selected: string): string {
  const values = Array.from(new Set(scopedReportSource().map((entry) => entry[field]).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
  return ["all", ...values]
    .map((value) => `<option value="${escapeHtml(value)}"${selected === value ? " selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

function aiSnapshotPreviewMarkup(): string {
  if (aiSnapshotPreview.status === "idle") {
    return `<div class="snapshot-preview muted">Select a report snapshot to preview its saved state.</div>`;
  }
  if (aiSnapshotPreview.status === "loading") {
    return `<div class="snapshot-preview">Loading snapshot...</div>`;
  }
  if (aiSnapshotPreview.status === "error") {
    return `<div class="snapshot-preview status-overdue">Snapshot unavailable: ${escapeHtml(aiSnapshotPreview.error ?? "unknown error")}</div>`;
  }
  const report = aiSnapshotPreview.report ?? {};
  const snapshot = aiSnapshotPreview.snapshot ?? {};
  const snapshotReport = snapshot.report ?? {};
  const tribe = snapshot.tribe ?? {};
  const survivalMandate = snapshot.survivalMandate ?? snapshot.goldRace ?? snapshot.mandate ?? {};
  const counts = snapshot.counts ?? {};
  const resources = tribe.resources
    ? Object.entries(tribe.resources)
        .map(([type, amount]) => `${type} ${amount}`)
        .join(", ")
    : "unknown";
  const developments =
    Array.isArray(tribe.developments) && tribe.developments.length > 0
      ? `${tribe.developments
          .slice(-12)
          .map((development) => development.name ?? development.id ?? "unknown")
          .join(", ")}${tribe.developments.length > 12 ? ` (+${tribe.developments.length - 12} more)` : ""}`
      : "none";
  const events = (snapshot.recentEvents ?? [])
    .slice(0, 3)
    .map((event) => `<li>Turn ${escapeHtml(String(event.tick ?? "?"))}: ${escapeHtml(event.title ?? "")}</li>`)
    .join("");
  return `
    <div class="snapshot-preview">
      <div class="snapshot-preview-header">
        <strong>Snapshot preview</strong>
        <a href="${escapeHtml(aiSnapshotPreview.url)}" target="_blank" rel="noreferrer">Open JSON</a>
      </div>
      <div class="muted">Report ${escapeHtml(report.category ?? snapshotReport.category ?? "unknown")} | ${escapeHtml(report.provider ?? snapshotReport.provider ?? "unknown")} / ${escapeHtml(report.model ?? snapshotReport.model ?? "unknown")}</div>
      <div>${escapeHtml(report.report ?? snapshotReport.text ?? "No report text.")}</div>
      <div class="snapshot-grid">
        <div><span class="muted">Tribe</span><strong>${escapeHtml(tribe.name ?? report.tribe ?? snapshotReport.tribeName ?? "unknown")}</strong></div>
        <div><span class="muted">Wealth</span><strong>${escapeHtml(String(tribe.wealth ?? "unknown"))}</strong></div>
        <div><span class="muted">Population</span><strong>${escapeHtml(String(tribe.population ?? "unknown"))}</strong></div>
        <div><span class="muted">Walls / gates / turrets</span><strong>${escapeHtml(String(counts.walls ?? 0))} / ${escapeHtml(String(counts.gates ?? 0))} / ${escapeHtml(String(counts.turrets ?? 0))}</strong></div>
      </div>
      <div class="muted">Resources: ${escapeHtml(resources)}</div>
      <div class="muted">Developments: ${escapeHtml(developments)}</div>
      <div class="muted">Survival mandate: ${escapeHtml(survivalMandate.publicText ?? "unknown")}</div>
      ${tribe.memory ? `<div class="muted">Memory: ${escapeHtml(tribe.memory)}</div>` : ""}
      ${events ? `<ul class="snapshot-events">${events}</ul>` : ""}
    </div>
  `;
}

function applyAiReportFilters(filters: AiReportFilters): void {
  if (aiReportFilters.scope !== filters.scope) aiSnapshotPreview = { id: "", url: "", status: "idle" };
  aiReportFilters.scope = filters.scope;
  aiReportFilters.status = filters.status;
  aiReportFilters.category = filters.category || "all";
  aiReportFilters.severity = filters.severity || "all";
  aiReportFilters.provider = filters.provider || "all";
  aiReportFilters.model = filters.model || "all";
  aiReportFilters.query = filters.query || "";
  render();
}

function aiReportFocusEmptyText(): string {
  if (aiReportFilters.status === "unresolved" && aiReportFilters.scope === "live") {
    return "No current live AI issue buckets. Historical triaged and fixed reports are available through the status filter.";
  }
  if (aiReportFilters.status === "unresolved") return "No current AI issue buckets for this scope.";
  return "No focus buckets match the current filters.";
}

function normalizeReportStatusFilter(value: unknown): AiReportFilterStatus {
  return value === "unresolved" || value === "triaged" || value === "fixed" || value === "ignored" ? value : "all";
}

function normalizeReportScopeFilter(value: unknown): AiReportScopeFilter {
  return value === "synthetic" || value === "all" || value === "live" ? value : "live";
}

function isBuildingMovementBlockingForDisplay(building: Building, tribeId: TribeId): boolean {
  if (building.hp <= 0) return false;
  if (building.type !== "gate") return isBuildingMovementBlocking(building);
  if (building.gateSabotage?.action === "force_open") return false;
  if (building.gateSabotage?.action === "jam_closed") return true;
  if (building.gateState !== "open") return true;
  if (getActiveGateAccessTreaties(state, building.id).some((treaty) => treaty.targetTribeId === tribeId)) return false;
  const policy = building.gateAccessPolicy ?? "owner_allies";
  if (policy === "all") return false;
  if (policy === "owner_only") return tribeId !== building.tribeId;
  return tribeId !== building.tribeId && state.alliances[building.tribeId] !== tribeId && state.alliances[tribeId] !== building.tribeId;
}

async function previewAiSnapshot(url: string, id: string): Promise<void> {
  if (!url) return;
  aiSnapshotPreview = { id, url, status: "loading" };
  render();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`snapshot endpoint returned ${response.status}`);
    const payload = (await response.json()) as { snapshot?: { capturedAt?: string; report?: AiSnapshotPreview["report"]; snapshot?: AiSnapshotPreview["snapshot"] } };
    aiSnapshotPreview = {
      id,
      url,
      status: "loaded",
      capturedAt: payload.snapshot?.capturedAt,
      report: payload.snapshot?.report,
      snapshot: payload.snapshot?.snapshot
    };
  } catch (error) {
    aiSnapshotPreview = {
      id,
      url,
      status: "error",
      error: error instanceof Error ? error.message : "unknown snapshot error"
    };
  }
  render();
}

function triageActionButton(entry: AiReportReviewEntry, status: AiReportTriageStatus): string {
  const current = entry.triageStatus ?? "unresolved";
  const disabled = current === status ? " disabled" : "";
  return `<button type="button" data-report-id="${escapeHtml(entry.id)}" data-triage-status="${status}"${disabled}>${triageStatusLabel(status)}</button>`;
}

function triageStatusLabel(status: AiReportTriageStatus): string {
  if (status === "triaged") return "triaged";
  if (status === "fixed") return "fixed";
  if (status === "ignored") return "ignored";
  return "unresolved";
}

function triageProofText(proof: FixedTriageProof | undefined): string {
  if (!proof) return "";
  const turn = typeof proof.fixedAtTurn === "number" ? ` turn ${proof.fixedAtTurn}` : "";
  return `${proof.summary}; ${proof.evidence}; ${proof.fixedBy}${turn}; verified ${proof.verifiedAt}`;
}

function aiBugCategoryLabel(category: AiBugCategory): string {
  if (category === "ai_report") return "AI report";
  if (category === "self_report") return "self-report";
  if (category === "blocked_order") return "blocked";
  if (category === "state_race") return "race";
  if (category === "llm_transport") return "LLM transport";
  if (category === "llm_parser") return "LLM parser";
  if (category === "llm_error") return "LLM error";
  return "validation";
}

function aiBugCategoryClass(category: AiBugCategory): string {
  if (category === "ai_report") return "ai-bug-report";
  if (category === "self_report") return "ai-bug-report";
  if (category === "blocked_order") return "ai-bug-blocked";
  if (category === "state_race") return "ai-bug-race";
  if (category === "llm_transport") return "ai-bug-validation";
  if (category === "llm_parser") return "ai-bug-validation";
  if (category === "llm_error") return "ai-bug-validation";
  return "ai-bug-validation";
}

function aiBugSaveLabel(saveState: AiBugEntry["saveState"]): string {
  if (saveState === "local") return "UI only";
  if (saveState === "pending") return "saving";
  if (saveState === "saved") return "saved";
  return "failed";
}

function tribeMarkup(game: GameState): string {
  const victory = getVictoryPressure(game);
  const scoreByTribe = new Map(victory.scoreByTribe.map((score) => [score.tribeId, score]));
  return victory.scoreByTribe
    .map((score) => score.tribeId)
    .map((tribeId) => {
      const units = Object.values(game.units).filter((unit) => unit.tribeId === tribeId && unit.hp > 0);
      const military = units.filter((unit) => isMilitaryUnitType(unit.type)).length;
      const messengers = units.filter((unit) => unit.type === "messenger").length;
      const buildings = Object.values(game.buildings).filter((building) => building.tribeId === tribeId && building.hp > 0);
      const houses = buildings.filter((building) => building.type === "house").length;
      const walls = buildings.filter((building) => building.type === "wall").length;
      const gates = buildings.filter((building) => building.type === "gate").length;
      const turrets = buildings.filter((building) => building.type === "turret").length;
      const packets = Object.values(game.packets).filter(
        (packet) =>
          (packet.originTribeId === tribeId || packet.recipientTribeId === tribeId) &&
          !isSettledPacketState(packet)
      ).length;
      const latestDecision = latestDecisionForTribe(game, tribeId);
      const aiStatus = latestDecision
        ? `${latestDecision.provider.toUpperCase()} ${latestDecision.model} at turn ${latestDecision.tick}`
        : "no decision yet";
      const ally = game.alliances[tribeId] ? game.tribes[game.alliances[tribeId]].name : "none";
      const wars = tribeIds.filter((other) => game.wars[tribeId]?.[other]).map((other) => game.tribes[other].name);
      const memory = summarizeSovereignMemory(game, tribeId);
      const iterationInbox = buildAiIterationInbox(tribeId);
      const score = scoreByTribe.get(tribeId);
      const populationCap = getPopulationCap(game, tribeId);
      return `
        <div class="tribe-row ${game.tribes[tribeId].eliminated ? "eliminated" : ""}">
          <div class="tribe-rank-header">
            <span class="rank-badge">#${score?.rank ?? "?"}</span>
            <span class="swatch" style="background:${game.tribes[tribeId].colorText}"></span>
            <strong>${game.tribes[tribeId].name}</strong>
            <span class="tag">${game.tribes[tribeId].controller.toUpperCase()}</span>
          </div>
          <div class="tribe-stat-grid">
            <div><span class="muted">Mandate</span><strong>${score?.survivalScore ?? 0}</strong></div>
            <div><span class="muted">Wealth</span><strong>${score?.wealth ?? computeWealth(game, tribeId)}</strong></div>
            <div><span class="muted">Pop</span><strong>${units.length}/${populationCap}</strong></div>
            <div><span class="muted">Happy</span><strong>${score?.happiness ?? Math.round(game.tribes[tribeId].happiness)}</strong></div>
            <div><span class="muted">Safety</span><strong>${score?.safety ?? 0}</strong></div>
            <div><span class="muted">Per head</span><strong>${score?.wealthPerCapita ?? 0}</strong></div>
          </div>
          <span class="muted">Sovereign ${game.tribes[tribeId].sovereignName}</span><br>
          <span class="muted">Style ${game.tribes[tribeId].namingStyle}</span><br>
          <span class="muted">AI ${escapeHtml(aiStatus)}</span><br>
          <span class="muted">Memory ${escapeHtml(memory)}</span><br>
          <span class="muted">Iteration inbox open ${iterationInbox.openReportCount} | resolved ${iterationInbox.resolvedLessonCount}${iterationInbox.promptSummary ? ` | ${escapeHtml(iterationInbox.promptSummary)}` : ""}</span><br>
          <span class="muted">Military ${military} | Messengers ${messengers} | Packets ${packets} | Houses ${houses} | Walls/gates/turrets ${walls}/${gates}/${turrets} | Alliance ${escapeHtml(ally)} | War ${escapeHtml(wars.join(", ") || "none")}</span>
        </div>
      `;
    })
    .join("");
}

function latestDecisionForTribe(game: GameState, tribeId: TribeId): AiDecision | undefined {
  return game.aiDecisions
    .slice()
    .reverse()
    .find((decision) => decision.tribeId === tribeId);
}

function diplomacyMarkup(game: GameState): string {
  const packets = observerMode
    ? Object.values(game.packets)
    : Object.values(game.packets).filter((packet) => packet.originTribeId === playerTribe || packet.recipientTribeId === playerTribe);
  if (packets.length === 0) return `<span class="muted">No active messages yet.</span>`;
  return packets
    .slice(-8)
    .reverse()
    .map((packet) => {
      const message = game.messages[packet.messageIds[0]];
      const reply = packet.messageIds.length > 1 ? game.messages[packet.messageIds[1]] : undefined;
      const statusClass = packetStatusClass(packet);
      return `
        <div class="packet-row">
          <strong>${message.subject}</strong><br>
          <span class="muted">${game.tribes[packet.originTribeId].name} -> ${game.tribes[packet.recipientTribeId].name}</span><br>
          <span class="${statusClass}">${packet.state.replaceAll("_", " ").toLowerCase()}</span>
          <div class="chat-line"><span class="chat-speaker">${game.tribes[message.originTribeId].name}</span>: ${message.body}</div>
          <div class="muted">Intent: ${message.diplomacyIntent.toLowerCase().replaceAll("_", " ")}</div>
          ${
            reply
              ? `<div class="chat-line reply"><span class="chat-speaker">${game.tribes[reply.originTribeId].name}</span>: ${reply.body}</div>
                 <div class="muted">Reply intent: ${reply.diplomacyIntent.toLowerCase().replaceAll("_", " ")}</div>`
              : packet.state === "AWAITING_REPLY"
                ? `<div class="chat-line pending">Awaiting ${game.tribes[packet.recipientTribeId].name}'s written reply...</div>`
                : ""
          }
          ${packet.overdueAnnounced ? `<br><span class="status-overdue">Overdue: sender only knows the messenger has not returned.</span>` : ""}
        </div>
      `;
    })
    .join("");
}

function bindButtons(): void {
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
  });
  speedButton.addEventListener("click", () => {
    speedIndex = (speedIndex + 1) % speedOptions.length;
    speedButton.textContent = `${speedOptions[speedIndex]}x`;
  });
  bindLayerToggle("showResourceLabelsToggle", (checked) => {
    showResourceLabels = checked;
  });
  bindLayerToggle("showContestedResourcesToggle", (checked) => {
    showContestedResources = checked;
  });
  bindLayerToggle("showDefenseOverlayToggle", (checked) => {
    showDefenseOverlay = checked;
  });
  mustGet("sendPeaceButton").addEventListener("click", () => sendDiplomacy("peace"));
  mustGet("sendThreatButton").addEventListener("click", () => sendDiplomacy("warning"));
  mustGet("askAiNowButton").addEventListener("click", () => {
    if (!llmSchedulingStarted) {
      llmStatus = "Connecting to local Ollama. Sovereign identities will be prepared before strategy turns start.";
      render();
      return;
    }
    if (openingIdentitySetupPending()) {
      llmStatus = `Preparing all sovereign identities before first strategy turns. Active lanes: ${describeActiveLlmJobs()}.`;
      queueLlmSchedulePump();
      render();
      return;
    }
    if (!hasLlmCapacity()) {
      llmStatus = `AI lanes are busy: ${describeActiveLlmJobs()}.`;
      render();
      return;
    }
    const next = nextManualAskTribe();
    if (!next) {
      llmStatus = "No surviving sovereign is available for a new AI turn.";
      render();
      return;
    }
    void runSovereignDecision(next, true);
  });
  aiReportReviewPanel.addEventListener("click", (event) => {
    const focusButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-report-focus]") : null;
    if (focusButton) {
      applyAiReportFilters({
        scope: normalizeReportScopeFilter(focusButton.dataset.filterScope),
        status: normalizeReportStatusFilter(focusButton.dataset.filterStatus),
        category: focusButton.dataset.filterCategory || "all",
        severity: focusButton.dataset.filterSeverity || "all",
        provider: focusButton.dataset.filterProvider || "all",
        model: focusButton.dataset.filterModel || "all",
        query: focusButton.dataset.filterQuery || ""
      });
      return;
    }
    const snapshotButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-snapshot-url]") : null;
    if (snapshotButton) {
      void previewAiSnapshot(snapshotButton.dataset.snapshotUrl ?? "", snapshotButton.dataset.snapshotId ?? "");
      return;
    }
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-report-id][data-triage-status]") : null;
    if (!target) return;
    const status = target.dataset.triageStatus;
    if (status !== "unresolved" && status !== "triaged" && status !== "fixed" && status !== "ignored") return;
    void updateAiReportTriage(target.dataset.reportId ?? "", status);
  });
  aiReportReviewPanel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id === "reportScopeFilter") {
      if (aiReportFilters.scope !== normalizeReportScopeFilter(target.value)) aiSnapshotPreview = { id: "", url: "", status: "idle" };
      aiReportFilters.scope = normalizeReportScopeFilter(target.value);
      aiReportFilters.status = "unresolved";
      aiReportFilters.category = "all";
      aiReportFilters.severity = "all";
      aiReportFilters.provider = "all";
      aiReportFilters.model = "all";
      render();
    }
    if (target.id === "reportStatusFilter") {
      aiReportFilters.status = normalizeReportStatusFilter(target.value);
      render();
    }
    if (target.id === "reportCategoryFilter") {
      aiReportFilters.category = target.value || "all";
      render();
    }
    if (target.id === "reportSeverityFilter") {
      aiReportFilters.severity = target.value || "all";
      render();
    }
    if (target.id === "reportProviderFilter") {
      aiReportFilters.provider = target.value || "all";
      render();
    }
    if (target.id === "reportModelFilter") {
      aiReportFilters.model = target.value || "all";
      render();
    }
  });
  aiReportReviewPanel.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.id !== "reportSearchInput") return;
    aiReportFilters.query = target.value;
    render();
  });
  mustGet("followActionButton").addEventListener("click", () => {
    followAction = !followAction;
    const button = mustGet("followActionButton");
    button.textContent = followAction ? "Stop follow" : "Follow action";
    updateFollowCamera();
    render();
  });
  mustGet("resetViewButton").addEventListener("click", () => {
    followAction = false;
    mustGet("followActionButton").textContent = "Follow action";
    centerCamera({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
    render();
  });
  mustGet("trainPeonButton").addEventListener("click", () => trainFromUi("peon"));
  mustGet("trainMilitiaButton").addEventListener("click", () => trainFromUi("militia"));
  mustGet("trainArcherButton").addEventListener("click", () => trainFromUi("archer"));
  mustGet("buildFarmButton").addEventListener("click", () => buildFromUi("farm"));
  mustGet("buildHouseButton").addEventListener("click", () => buildFromUi("house"));
  mustGet("buildWatchtowerButton").addEventListener("click", () => buildFromUi("watchtower"));
  mustGet("buildWallButton").addEventListener("click", () => buildFromUi("wall"));
  mustGet("buildGateButton").addEventListener("click", () => buildFromUi("gate"));
  mustGet("buildTurretButton").addEventListener("click", () => buildFromUi("turret"));
  bindGatherButton("assignFoodButton", "food");
  bindGatherButton("assignWoodButton", "wood");
  bindGatherButton("assignStoneButton", "stone");
  bindGatherButton("assignClayButton", "clay");
  bindGatherButton("assignLimestoneButton", "limestone");
  bindGatherButton("assignIronButton", "iron");
  bindGatherButton("assignCoalButton", "coal");
  bindGatherButton("assignGoldButton", "gold");
  mustGet("focusSovereignButton").addEventListener("click", () => focusUnit((u) => u.tribeId === playerTribe && u.type === "sovereign"));
  mustGet("focusMessengerButton").addEventListener("click", () => focusUnit((u) => u.tribeId === playerTribe && u.type === "messenger"));
}

function bindLayerToggle(id: string, setValue: (checked: boolean) => void): void {
  const input = mustGet(id) as HTMLInputElement;
  setValue(input.checked);
  input.addEventListener("change", () => {
    setValue(input.checked);
    render();
  });
}

function bindGatherButton(buttonId: string, resource: ResourceType): void {
  mustGet(buttonId).addEventListener("click", () => {
    if (!selectedUnitId) {
      window.alert("Select a Blue peon first.");
      return;
    }
    const result = assignGathering(state, selectedUnitId, resource);
    if (!result.ok) window.alert(result.reason);
    render();
  });
}

function nextManualAskTribe(): TribeId | undefined {
  const candidates: TribeId[] = [];
  for (let offset = 0; offset < tribeIds.length; offset += 1) {
    const index = (manualAskCursor + offset) % tribeIds.length;
    const tribeId = tribeIds[index];
    if (tribeHasActiveLlmJob(tribeId)) continue;
    if (!isTribeActive(state, tribeId)) continue;
    if (!canStartLlmJob(tribeId, strategyModelForTribe(tribeId))) continue;
    candidates.push(tribeId);
  }
  const chosen = candidates.find((tribeId) => !tribeUsesCoolingModel(tribeId, strategyModelForTribe(tribeId))) ?? candidates[0];
  if (!chosen) return undefined;
  manualAskCursor = (tribeIds.indexOf(chosen) + 1) % tribeIds.length;
  return chosen;
}

function updateRecipientLabels(): void {
  for (const option of Array.from(recipientSelect.options)) {
    const tribeId = option.value as TribeId;
    if (state.tribes[tribeId]) option.textContent = state.tribes[tribeId].name;
  }
}

function bindInput(): void {
  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  app.canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const screen = { x: event.offsetX, y: event.offsetY };
    const before = screenToWorld(screen);
    const next = clamp(camera.scale + (event.deltaY < 0 ? 0.08 : -0.08), 0.45, 2.25);
    camera.scale = next;
    camera.x = screen.x - before.x * TILE * camera.scale;
    camera.y = screen.y - before.y * TILE * camera.scale;
    render();
  });
  app.canvas.addEventListener("pointerenter", () => {
    pointerInsideViewport = true;
  });
  app.canvas.addEventListener("pointerleave", () => {
    pointerInsideViewport = false;
    hideHoverTooltip();
  });
  app.canvas.addEventListener("pointermove", (event) => {
    pointerScreen = { x: event.offsetX, y: event.offsetY };
    pointerInsideViewport = true;
    if (dragState && dragState.pointerId === event.pointerId) {
      const dx = event.clientX - dragState.screenX;
      const dy = event.clientY - dragState.screenY;
      if (Math.hypot(dx, dy) > 3) dragState.moved = true;
      camera.x = dragState.cameraX + dx;
      camera.y = dragState.cameraY + dy;
      hideHoverTooltip();
      applyCamera();
      return;
    }
    updateHoverTooltip();
  });
  app.canvas.addEventListener("pointerup", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const wasClick = !dragState.moved && dragState.button === 0;
    dragState = undefined;
    viewport.classList.remove("is-panning");
    app.canvas.releasePointerCapture(event.pointerId);
    if (wasClick && pointerScreen) {
      selectAt(screenToWorld(pointerScreen));
      render();
    }
    updateHoverTooltip();
  });
  app.canvas.addEventListener("pointercancel", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragState = undefined;
    viewport.classList.remove("is-panning");
    hideHoverTooltip();
  });
  app.canvas.addEventListener("pointerdown", (event) => {
    pointerScreen = { x: event.offsetX, y: event.offsetY };
    const worldPosition = screenToWorld({ x: event.offsetX, y: event.offsetY });
    if (event.button === 2) {
      if (selectedUnitId) issueMove(state, selectedUnitId, { x: Math.round(worldPosition.x), y: Math.round(worldPosition.y) });
      render();
      return;
    }
    const hit = findHit(worldPosition);
    if (event.button === 0 && hit) {
      selectHit(hit);
      render();
      updateHoverTooltip();
      return;
    }
    if (event.button === 0 || event.button === 1 || event.shiftKey || keys.has(" ")) {
      dragState = {
        pointerId: event.pointerId,
        button: event.button,
        screenX: event.clientX,
        screenY: event.clientY,
        cameraX: camera.x,
        cameraY: camera.y,
        moved: false
      };
      app.canvas.setPointerCapture(event.pointerId);
      viewport.classList.add("is-panning");
      hideHoverTooltip();
      return;
    }
    selectAt(worldPosition);
    render();
  });
}

function updateCamera(dt: number): void {
  const amount = 360 * dt;
  if (keys.has("arrowleft") || keys.has("a")) camera.x += amount;
  if (keys.has("arrowright") || keys.has("d")) camera.x -= amount;
  if (keys.has("arrowup") || keys.has("w")) camera.y += amount;
  if (keys.has("arrowdown") || keys.has("s")) camera.y -= amount;
  if (pointerInsideViewport && pointerScreen && !dragState && !followAction) {
    const edge = 28;
    if (pointerScreen.x < edge) camera.x += amount * 0.8;
    if (pointerScreen.x > viewport.clientWidth - edge) camera.x -= amount * 0.8;
    if (pointerScreen.y < edge) camera.y += amount * 0.8;
    if (pointerScreen.y > viewport.clientHeight - edge) camera.y -= amount * 0.8;
  }
  applyCamera();
}

function sendDiplomacy(intent: "peace" | "warning"): void {
  const target = recipientSelect.value as TribeId;
  const result = sendPlayerMessage(state, target, intent);
  if (!result.ok) {
    window.alert(result.reason);
  }
  render();
}

function trainFromUi(unitType: "peon" | "militia" | "archer"): void {
  const result = trainUnit(state, playerTribe, unitType);
  if (!result.ok) {
    window.alert(result.reason);
    return;
  }
  selectedUnitId = result.unitId;
  selectedBuildingId = undefined;
  render();
}

function buildFromUi(buildingType: BuildableBuildingType): void {
  const selected = selectedUnitId ? state.units[selectedUnitId] : undefined;
  let fallback: Position;
  try {
    fallback = getTownHall(state, playerTribe);
  } catch {
    window.alert("Blue town hall is unavailable.");
    return;
  }
  const result = buildStructure(state, playerTribe, buildingType, selected && selected.tribeId === playerTribe ? selected : fallback);
  if (!result.ok) {
    window.alert(result.reason);
    return;
  }
  selectedBuildingId = result.buildingId;
  selectedUnitId = undefined;
  const building = state.buildings[result.buildingId];
  rememberConstructionFlash({
    buildingId: result.buildingId,
    buildingType,
    tick: state.tick,
    message: `${labelBuilding(buildingType)} built at ${building.x},${building.y}`
  });
  bugReportStatus = `Built ${labelBuilding(buildingType)} at ${building.x},${building.y}; selected and centered on the map.`;
  centerCamera(building);
  refreshTerrainLayer();
  render();
}

function selectAt(pos: Position): void {
  const hit = findHit(pos);
  if (hit) {
    selectHit(hit);
    return;
  }
  selectedUnitId = undefined;
  selectedBuildingId = undefined;
}

function findHit(pos: Position): HitTarget | undefined {
  const visibleUnits = observerMode ? Object.values(state.units).filter((unit) => unit.hp > 0) : getVisibleUnits(state, playerTribe);
  const unit = nearestUnitByVisualDistance(visibleUnits, pos, 0.8);
  if (unit) return { kind: "unit", unit };
  const visibleBuildings = observerMode ? Object.values(state.buildings) : getVisibleBuildings(state, playerTribe);
  const building = visibleBuildings.find((candidate) => Math.abs(candidate.x - pos.x) < 0.8 && Math.abs(candidate.y - pos.y) < 0.8);
  return building ? { kind: "building", building } : undefined;
}

function selectHit(hit: HitTarget): void {
  if (hit.kind === "unit") {
    selectedUnitId = hit.unit.id;
    selectedBuildingId = undefined;
    return;
  }
  selectedUnitId = undefined;
  selectedBuildingId = hit.building.id;
}

function nearestByDistance<T extends Position>(items: T[], pos: Position, maxDistance: number): T | undefined {
  let best: T | undefined;
  let bestDistance = maxDistance;
  for (const item of items) {
    const candidateDistance = Math.hypot(item.x - pos.x, item.y - pos.y);
    if (candidateDistance < bestDistance) {
      best = item;
      bestDistance = candidateDistance;
    }
  }
  return best;
}

function nearestUnitByVisualDistance(units: Unit[], pos: Position, maxDistance: number): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = maxDistance;
  for (const unit of units) {
    const visual = visualPositionForUnit(unit);
    const candidateDistance = Math.hypot(visual.x - pos.x, visual.y - pos.y);
    if (candidateDistance < bestDistance) {
      best = unit;
      bestDistance = candidateDistance;
    }
  }
  return best;
}

function findHoverTarget(pos: Position): HoverTarget | undefined {
  const hit = findHit(pos);
  if (hit?.kind === "unit") return { kind: "unit", unit: hit.unit };
  if (hit?.kind === "building") return { kind: "building", building: hit.building };
  const x = clamp(Math.floor(pos.x), 0, MAP_SIZE - 1);
  const y = clamp(Math.floor(pos.y), 0, MAP_SIZE - 1);
  const tile = state.map[tileIndex(x, y)];
  return { kind: "tile", x, y, terrain: tile.terrain, resource: tile.resource };
}

function updateHoverTooltip(): void {
  if (!pointerScreen || !pointerInsideViewport || dragState) {
    hideHoverTooltip();
    return;
  }
  const target = findHoverTarget(screenToWorld(pointerScreen));
  if (!target) {
    hideHoverTooltip();
    return;
  }
  hoverTooltip.innerHTML = hoverMarkup(target);
  hoverTooltip.hidden = false;
  const maxLeft = Math.max(8, viewport.clientWidth - hoverTooltip.offsetWidth - 8);
  const maxTop = Math.max(8, viewport.clientHeight - hoverTooltip.offsetHeight - 8);
  hoverTooltip.style.left = `${clamp(pointerScreen.x + 14, 8, maxLeft)}px`;
  hoverTooltip.style.top = `${clamp(pointerScreen.y + 14, 8, maxTop)}px`;
}

function hideHoverTooltip(): void {
  hoverTooltip.hidden = true;
}

function hoverMarkup(target: HoverTarget): string {
  if (target.kind === "unit") {
    const unit = target.unit;
    const packet = unit.carriedPacketId ? state.packets[unit.carriedPacketId] : undefined;
    const durability = combatStatSnapshot(unit);
    return `
      <strong>${unit.name}</strong> <span class="muted">${unit.type}</span>
      <div>Unit id: ${unit.id}</div>
      <div>Tribe: ${state.tribes[unit.tribeId].name}</div>
      <div>Style: ${state.tribes[unit.tribeId].namingStyle}</div>
      <div>Health: ${Math.ceil(unit.hp)} / ${unit.maxHp}</div>
      <div>Condition: ${formatCondition(durability.condition)} (${durability.healthPct}%)</div>
      <div>Armor: ${unit.armor}</div>
      <div>Attack: ${unit.attack} / range ${unit.range}</div>
      <div>Doing: ${describeUnitTask(state, unit)}</div>
      ${packet ? `<div>Packet: ${packet.state.replaceAll("_", " ").toLowerCase()}</div>` : ""}
    `;
  }
  if (target.kind === "building") {
    const building = target.building;
    const durability = buildingDurabilitySnapshot(state, building);
    return `
      <strong>${labelBuilding(building.type)}</strong>
      <div>Tribe: ${state.tribes[building.tribeId].name}</div>
      <div>Health: ${Math.ceil(building.hp)} / ${building.maxHp}</div>
      <div>Condition: ${formatCondition(durability.condition)} (${durability.healthPct}%); repair ${formatRepairState(durability.repairState)}</div>
      <div>Armor: ${building.armor}</div>
      <div>Attack: ${building.attack} / range ${building.range}</div>
      ${building.type === "gate" ? `<div>Gate: ${building.gateState ?? "open"}; access ${formatGateAccessPolicy(building.gateAccessPolicy ?? "owner_allies")}</div>` : ""}
      ${
        building.type === "gate" && getActiveGateAccessTreaties(state, building.id).length > 0
          ? `<div>Access treaties: ${getActiveGateAccessTreaties(state, building.id)
              .map((treaty) => `${escapeHtml(state.tribes[treaty.targetTribeId].name)}${treaty.expiresAtTick ? ` until ${treaty.expiresAtTick}` : ""}`)
              .join(", ")}</div>`
          : ""
      }
      ${
        building.type === "gate" && building.gateSabotage
          ? `<div>Sabotage: ${escapeHtml(building.gateSabotage.action)} by ${escapeHtml(state.tribes[building.gateSabotage.tribeId].name)}${
              building.gateSabotage.expiresAtTick ? ` until ${building.gateSabotage.expiresAtTick}` : ""
            }</div>`
          : ""
      }
      ${
        building.type === "gate" && building.gateOperation
          ? `<div>Operation: ${escapeHtml(building.gateOperation.gateOperationIntent ?? building.gateOperation.id)}${
              building.gateOperation.entryAction ? `; action ${escapeHtml(building.gateOperation.entryAction)}` : ""
            }${
              building.gateOperation.tollGold ? `; toll ${building.gateOperation.tollGold} ${escapeHtml(building.gateOperation.tollMode ?? "optional")}` : ""
            }${
              building.gateOperation.unpaidAction ? `; unpaid ${escapeHtml(building.gateOperation.unpaidAction)}` : ""
            }${
              building.gateOperation.detainedPacketAction ? `; detained ${escapeHtml(building.gateOperation.detainedPacketAction)}` : ""
            }${
              building.gateOperation.detainedPacketId ? ` ${escapeHtml(building.gateOperation.detainedPacketId)}` : ""
            }${
              building.gateOperation.ransomGold ? `; ransom ${building.gateOperation.ransomGold}` : ""
            }${
              building.gateOperation.releaseSubject || building.gateOperation.releaseMessage ? "; release message" : ""
            }${
              building.gateOperation.accessTreatyAction ? `; treaty ${escapeHtml(building.gateOperation.accessTreatyAction)}` : ""
            }${
              building.gateOperation.accessTreatyName ? ` ${escapeHtml(building.gateOperation.accessTreatyName)}` : ""
            }${
              building.gateOperation.sabotageAction ? `; sabotage ${escapeHtml(building.gateOperation.sabotageAction)}` : ""
            }${
              building.gateOperation.gatePublicNotice ? `; public ${escapeHtml(building.gateOperation.gatePublicNotice)}` : ""
            }${
              building.gateOperation.gateTerms ? `; private ${escapeHtml(building.gateOperation.gateTerms)}` : ""
            }</div>`
          : ""
      }
      <div>Position: ${building.x}, ${building.y}</div>
      <div>${buildingRole(building.type)}</div>
    `;
  }
  const depletedResource = target.resource && target.resource.amount > 0 ? undefined : recentResourceDepletionAt(state, target.x, target.y);
  const resource =
    target.resource && target.resource.amount > 0
      ? `${target.resource.type} ${Math.round(target.resource.amount)}`
      : depletedResource
        ? `exhausted ${depletedResource.type}`
        : "none";
  const resourceStats = target.resource && target.resource.amount > 0 ? combatStatSnapshot(target.resource) : undefined;
  return `
    <strong>${target.terrain}</strong>
    <div>Tile: ${target.x}, ${target.y}</div>
    <div>Resource: ${resource}</div>
    ${
      depletedResource
        ? `<div>Exhausted at tick ${depletedResource.tick}${
            depletedResource.depletedByTribeId ? ` by ${escapeHtml(state.tribes[depletedResource.depletedByTribeId].name)}` : ""
          }</div>`
        : ""
    }
    ${
      resourceStats
        ? `
          <div>Deposit health: ${resourceStats.hp} / ${resourceStats.maxHp}</div>
          <div>Condition: ${formatCondition(resourceStats.condition)} (${resourceStats.healthPct}%)</div>
          <div>Armor: ${resourceStats.armor}</div>
          <div>Attack: ${resourceStats.attack} / range ${resourceStats.range}</div>
        `
        : ""
    }
    ${target.resource && target.resource.amount > 0 ? `<div>${resourceRole(target.resource.type)}</div>` : ""}
  `;
}

function recentResourceDepletionAt(game: GameState, x: number, y: number): ResourceDepletionRecord | undefined {
  return getRecentResourceDepletions(game)
    .filter((record) => {
      if (record.x !== x || record.y !== y) return false;
      if (observerMode || record.visibleTo === "all") return true;
      return record.visibleTo.includes(playerTribe);
    })
    .sort((left, right) => right.tick - left.tick)[0];
}

function focusUnit(predicate: (unit: Unit) => boolean): void {
  const unit = Object.values(state.units).find(predicate);
  if (!unit) return;
  selectedUnitId = unit.id;
  selectedBuildingId = undefined;
  centerCamera(unit);
  render();
}

function screenToWorld(pos: Position): Position {
  return {
    x: (pos.x - camera.x) / camera.scale / TILE,
    y: (pos.y - camera.y) / camera.scale / TILE
  };
}

function updateFollowCamera(): void {
  if (!followAction) return;
  const target = followUnitId ? state.units[followUnitId] : undefined;
  if (!target || target.hp <= 0) return;
  centerCamera(visualPositionForUnit(target));
}

function centerCamera(target: Position): void {
  camera.x = viewport.clientWidth / 2 - target.x * TILE * camera.scale;
  camera.y = viewport.clientHeight / 2 - target.y * TILE * camera.scale;
  applyCamera();
}

function applyCamera(): void {
  world.x = camera.x;
  world.y = camera.y;
  world.scale.set(camera.scale);
}

function renderLegend(): void {
  legendPanel.innerHTML = `
    <div class="legend-grid">
      <span class="legend-item"><b>People</b> sovereigns, workers, sentinels, messengers, traders, militia, archers, rams, catapults</span>
      <span class="legend-item"><b>Towns</b> halls, houses, farms, barracks, markets, watchtowers</span>
      <span class="legend-item"><b>Fortifications</b> walls, lockable gates, turrets</span>
      <span class="legend-item"><b>Food and timber</b> crop fields and log piles</span>
      <span class="legend-item"><b>Stone materials</b> stone, clay bricks, limestone blocks</span>
      <span class="legend-item"><b>Scarce deposits</b> iron ore and coal outcrops</span>
      <span class="legend-item"><b>Overlays</b> contested deposits, turret ranges, construction pulses, health bars</span>
      <span class="legend-item"><b>Grid</b> 8-tile strategic reference</span>
    </div>
    <div class="legend-build-costs">
      ${buildableBuildingTypes
        .map((type) => `<div><strong>${labelBuilding(type)}</strong><span>${formatCost(getEffectiveBuildingCost(state, playerTribe, type))}</span></div>`)
        .join("")}
    </div>
    <p class="muted">Observer mode shows all tribes so AI behavior is inspectable. LLM prompts still use each tribe's own visible state and public events.</p>
  `;
}

function shouldLabelUnit(unit: Unit): boolean {
  return unit.type === "sovereign" || unit.type === "messenger" || unit.carriedPacketId !== undefined || selectedUnitId === unit.id;
}

function unitLabel(game: GameState, unit: Unit): string {
  if (unit.type === "sovereign") return unit.name;
  if (unit.type === "messenger") return `${unit.name} MSG`;
  return `${unit.name} ${unit.type}`;
}

function unitAbbrev(type: Unit["type"]): string {
  switch (type) {
    case "sovereign":
      return "SOV";
    case "peon":
      return "P";
    case "sentinel":
      return "S";
    case "messenger":
      return "M";
    case "trader":
      return "T";
    case "militia":
      return "ML";
    case "archer":
      return "AR";
    case "siege_engine":
      return "SE";
    case "battering_ram":
      return "RAM";
    case "catapult":
      return "CAT";
  }
}

function buildingAbbrev(type: Building["type"]): string {
  switch (type) {
    case "townHall":
      return "TH";
    case "farm":
      return "F";
    case "house":
      return "H";
    case "barracks":
      return "BA";
    case "market":
      return "MK";
    case "watchtower":
      return "WT";
    case "wall":
      return "WL";
    case "gate":
      return "GT";
    case "turret":
      return "TU";
  }
}

function buildingLabelColor(building: Building): string {
  if (building.type === "wall" || building.type === "gate") return "#fff4c0";
  if (building.id === selectedBuildingId) return "#fff4c0";
  return "#f4efe6";
}

function resourceAbbrev(type: ResourceType): string {
  switch (type) {
    case "gold":
      return "G";
    case "food":
      return "F";
    case "wood":
      return "W";
    case "stone":
      return "ST";
    case "clay":
      return "CL";
    case "limestone":
      return "LS";
    case "iron":
      return "IR";
    case "coal":
      return "CO";
  }
}

function resourceLabelColor(type: ResourceType): string {
  if (type === "gold") return "#ffe17b";
  if (type === "food") return "#ffd0b4";
  if (type === "stone") return "#ede7da";
  if (type === "clay") return "#ffd1b0";
  if (type === "limestone") return "#f2edd5";
  if (type === "iron") return "#d7e6ee";
  if (type === "coal") return "#f1f1eb";
  return "#d7f0c8";
}

function resourceColorNumber(type: ResourceType): number {
  if (type === "gold") return 0xffd84f;
  if (type === "food") return 0xf08a5f;
  if (type === "stone") return 0xd8d1c4;
  if (type === "clay") return 0xd47a4b;
  if (type === "limestone") return 0xded7bd;
  if (type === "iron") return 0xc3d0d7;
  if (type === "coal") return 0x9a9a95;
  return 0xa2d28c;
}

function terrainColor(terrain: TerrainType): number {
  switch (terrain) {
    case "forest":
      return 0x2f623d;
    case "hill":
      return 0x8a7b55;
    case "road":
      return 0xa18455;
    case "water":
      return 0x2f708c;
    case "mountain":
      return 0x65625a;
    default:
      return 0x5e7d41;
  }
}

function terrainShade(x: number, y: number, seed: number): number {
  const value = Math.sin((x + seed * 0.017) * 12.9898 + (y - seed * 0.011) * 78.233) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * 0.18;
}

function shadeColor(color: number, amount: number): number {
  const r = clamp(((color >> 16) & 255) + amount * 255, 0, 255);
  const g = clamp(((color >> 8) & 255) + amount * 255, 0, 255);
  const b = clamp((color & 255) + amount * 255, 0, 255);
  return (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b);
}

function packetStatusClass(packet: Packet): string {
  if (packet.state === "IN_TRANSIT_OUTBOUND") return "status-outbound";
  if (packet.state === "AWAITING_REPLY") return "status-waiting";
  if (packet.state === "IN_TRANSIT_RETURN" || packet.state === "COMPLETED") return "status-returning";
  if (packet.state === "KILLED_WITH_PACKET" || packet.state === "REFUSED_AT_GATE") return "status-lost";
  if (packet.state === "DETAINED") return "status-waiting";
  return "status-overdue";
}

function isSettledPacketState(packet: Packet): boolean {
  return packet.state === "COMPLETED" || packet.state === "KILLED_WITH_PACKET" || packet.state === "REFUSED_AT_GATE" || packet.state === "DETAINED";
}

function describeUnitTask(game: GameState, unit: Unit): string {
  const task = unit.task;
  if (task.kind === "idle") return "Idle";
  if (task.kind === "move") return `Moving to ${formatPosition(task.target)} (${task.path.length} path steps left)`;
  if (task.kind === "scout") return `Scouting toward ${formatPosition(task.target)} (${task.path.length} path steps left)`;
  if (task.kind === "gather") {
    const phase = task.cargo >= 10 ? "Returning cargo" : distanceToPosition(unit, task.target) > 0.6 ? "Walking to resource" : "Gathering";
    return `${phase}: ${task.resource}, cargo ${Math.floor(task.cargo)}/10`;
  }
  if (task.kind === "deliver") {
    const packet = game.packets[task.packetId];
    const packetState = packet ? packet.state.replaceAll("_", " ").toLowerCase() : "packet missing";
    if (task.phase === "outbound") return `Delivering message to ${formatPosition(task.destination)} (${packetState})`;
    if (task.phase === "waiting") return `Waiting for reply until turn ${task.waitUntilTick ?? "unknown"} (${packetState})`;
    return `Returning with reply to ${formatPosition(task.returnTo)} (${packetState})`;
  }
  if (task.kind === "attack") {
    const target = game.units[task.targetUnitId];
    return target ? `Attacking ${target.name} of ${game.tribes[target.tribeId].name}` : "Attacking missing target";
  }
  if (task.kind === "attackResource") {
    const resource = game.map[tileIndex(task.target.x, task.target.y)].resource;
    return resource ? `Raiding ${resource.type} deposit at ${formatPosition(task.target)}` : `Raiding depleted ${task.resource} deposit at ${formatPosition(task.target)}`;
  }
  if (task.kind === "repair") {
    const building = game.buildings[task.targetBuildingId];
    return building ? `Repairing ${building.type} ${building.id}` : "Repairing missing building";
  }
  if (task.kind === "guardSiege") {
    const verb = task.guardRole === "escort" ? "Escorting siege" : "Covering siege";
    return `${verb} ${task.siegePlanId} around ${formatPosition(task.anchor)} radius ${task.radius}${
      task.guardPlan ? `: ${task.guardPlan}` : ""
    }`;
  }
  const building = game.buildings[task.targetBuildingId];
  if (building && task.assaultPhase === "assembling" && task.assemblyTarget) {
    return `Assembling for ${task.assaultMode ?? "coordinated"} assault at ${formatPosition(task.assemblyTarget)} before attacking ${building.type} ${building.id}`;
  }
  if (building && task.assaultPhase === "waiting_wave") {
    const wave = task.assaultWaveIndex !== undefined ? `wave ${task.assaultWaveIndex + 1}` : "delayed wave";
    const release = task.assaultWaveReleaseTick !== undefined ? ` until turn ${task.assaultWaveReleaseTick}` : "";
    return `Holding ${wave}${release} before attacking ${building.type} ${building.id}`;
  }
  if (building && task.interdictRepairs) {
    return `Interdicting repairs on ${building.type} ${building.id}${task.repairInterdictionPlan ? `: ${task.repairInterdictionPlan}` : ""}`;
  }
  return building
    ? `Attacking ${building.type} ${building.id} of ${game.tribes[building.tribeId].name}${
        task.assaultMode && task.assaultMode !== "direct" ? ` (${task.assaultMode})` : ""
      }`
    : "Attacking missing building";
}

function formatPosition(pos: Position): string {
  return `${Math.round(pos.x)},${Math.round(pos.y)}`;
}

function distanceToPosition(unit: Unit, pos: Position): number {
  return Math.hypot(unit.x - pos.x, unit.y - pos.y);
}

function labelBuilding(type: string): string {
  return type.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function isBuildableBuilding(type: Building["type"]): type is BuildableBuildingType {
  return type === "farm" || type === "house" || type === "watchtower" || type === "wall" || type === "gate" || type === "turret";
}

function formatCost(cost: ResourceCost): string {
  const parts = resourceTypes.flatMap((type) => {
    const amount = cost[type] ?? 0;
    return amount > 0 ? [`${amount} ${type}`] : [];
  });
  return parts.join(", ") || "free";
}

function buildingRole(type: Building["type"]): string {
  if (type === "wall") return "Blocks movement for everyone until destroyed.";
  if (type === "gate") return "Open gates follow their access policy; closed or locked gates block movement.";
  if (type === "turret") return "Fires on hostile units in range.";
  if (type === "watchtower") return "Extends local vision.";
  if (type === "house") return "Raises population capacity and lets a safe, fed population grow over years.";
  return "Kingdom structure.";
}

function formatGateAccessPolicy(policy: GateAccessPolicy): string {
  if (policy === "all") return "all tribes";
  if (policy === "owner_only") return "owner only";
  return "owner and allies";
}

function resourceRole(type: ResourceType): string {
  if (type === "gold") return "Use: currency, diplomacy, military pay.";
  if (type === "food") return "Use: population growth and recruitment.";
  if (type === "wood") return "Use: farms, scaffolding, and early structures.";
  if (type === "stone") return "Use: walls, towers, and durable construction.";
  if (type === "clay") return "Use: bricks, wall mass, storage, and settlement upgrades.";
  if (type === "limestone") return "Use: mortar, watchtowers, walls, and fortified building logistics.";
  if (type === "iron") return "Use: turrets, weapons, gates, and later siege systems.";
  return "Use: fuel for turrets, ironworks, and later industry.";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength - 1).trimEnd();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#039;";
  });
}

function mustGet(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}
