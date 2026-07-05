import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_LIVE_AI_SCREENSHOT ??
  "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png";
const startupTimeoutMs = numberEnv("SOVEREIGNS_LIVE_AI_STARTUP_TIMEOUT_MS", 600_000);
const sampleMs = numberEnv("SOVEREIGNS_LIVE_AI_SAMPLE_MS", 30_000);
const minStrategyTurnsPerTribe = numberEnv("SOVEREIGNS_LIVE_AI_MIN_STRATEGY_TURNS", 1);
const forceLiveIssue = booleanEnv("SOVEREIGNS_FORCE_LIVE_AI_ISSUE", true);
const forceLiveAuthoredBugReport = booleanEnv("SOVEREIGNS_FORCE_LIVE_AUTHORED_BUG_REPORT", true);
const liveAuthoredBugReportTribe = process.env.SOVEREIGNS_LIVE_AUTHORED_BUG_TRIBE || "blue";
const requiredTribes = ["blue", "red", "green", "yellow", "purple"];
const defaultRealmNames = new Set(["Blue Crown", "Red Banner", "Green Vale", "Yellow Knives", "Purple Seal"]);
const reportQualityFields = [
  { name: "suspectedArea", patterns: [/suspected area\s*:/i, /\bsuspectedArea\b/i] },
  { name: "expectedBehavior", patterns: [/expected\s*:/i, /\bexpectedBehavior\b/i] },
  { name: "actualBehavior", patterns: [/actual\s*:/i, /\bactualBehavior\b/i] },
  { name: "reproductionSteps", patterns: [/\brepro\s*:/i, /\breproduction steps?\s*:/i, /\breproductionSteps\b/i] },
  { name: "strategyImpact", patterns: [/strategy impact\s*:/i, /\bstrategyImpact\b/i] },
  { name: "bugSeverity", patterns: [/self-rated severity\s*:/i, /\bbugSeverity\b/i] }
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
const errors = [];
const warnings = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console error: ${message.text()}`);
  if (message.type() === "warning") warnings.push(`console warning: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("dialog", async (dialog) => {
  warnings.push(`dialog: ${dialog.message()}`);
  await dialog.dismiss();
});

await page.goto(`${url}${url.includes("?") ? "&" : "?"}liveAiIteration=${Date.now()}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.waitForFunction(() => typeof window.render_game_to_text === "function" && typeof window.advanceTime === "function", null, {
  timeout: 15_000
});

const parallelStartupHandle = await page.waitForFunction(
  () => {
    window.advanceTime?.(1000);
    const parsed = JSON.parse(window.render_game_to_text());
    return parsed.llm?.schedulingStarted && (parsed.llm?.activeJobCount ?? 0) >= 1 ? parsed : null;
  },
  null,
  { timeout: 45_000, polling: 1000 }
);
const parallelStartupState = summarizeLiveAiState(await parallelStartupHandle.jsonValue(), requiredTribes);
const followupHold = await page.evaluate(() => {
  if (typeof window.hold_llm_followup_strategy_for_test !== "function") return { ok: false, reason: "missing follow-up strategy hold hook" };
  return window.hold_llm_followup_strategy_for_test(true);
});
if (!followupHold.ok || followupHold.enabled !== true) {
  throw new Error(`Could not enable live monitor follow-up strategy hold: ${JSON.stringify(followupHold)}`);
}

const startupHandle = await page.waitForFunction(
  (tribeIds) => {
    let parsed = JSON.parse(window.render_game_to_text());
    const firstDoctrineTribes = [];
    for (const decision of parsed.latestAiDecisions ?? []) {
      if (!tribeIds.includes(decision.tribeId) || firstDoctrineTribes.includes(decision.tribeId)) continue;
      if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("IDENTITY:"))) continue;
      if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("REPLY:"))) continue;
      firstDoctrineTribes.push(decision.tribeId);
    }
    if (
      parsed.llm?.identityProgress?.chosen >= tribeIds.length &&
      parsed.llm?.firstDoctrineProgress?.written >= tribeIds.length &&
      tribeIds.every((tribeId) => firstDoctrineTribes.includes(tribeId))
    ) {
      return parsed;
    }
    window.advanceTime?.(1000);
    parsed = JSON.parse(window.render_game_to_text());
    const updatedFirstDoctrineTribes = [];
    for (const decision of parsed.latestAiDecisions ?? []) {
      if (!tribeIds.includes(decision.tribeId) || updatedFirstDoctrineTribes.includes(decision.tribeId)) continue;
      if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("IDENTITY:"))) continue;
      if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("REPLY:"))) continue;
      updatedFirstDoctrineTribes.push(decision.tribeId);
    }
    return parsed.llm?.identityProgress?.chosen >= tribeIds.length &&
      parsed.llm?.firstDoctrineProgress?.written >= tribeIds.length &&
      tribeIds.every((tribeId) => updatedFirstDoctrineTribes.includes(tribeId))
      ? parsed
      : null;
  },
  requiredTribes,
  { timeout: startupTimeoutMs, polling: 1000 }
);
const startupState = summarizeLiveAiState(await startupHandle.jsonValue(), requiredTribes);

let liveAuthoredBugReportResult = null;
let liveAuthoredBugReportState = null;
let liveAuthoredOpenPromptState = null;
let liveAuthoredBugReportTriage = null;
if (forceLiveAuthoredBugReport) {
  liveAuthoredBugReportResult = await runLiveAuthoredBugReportWithIdleRetry(page, liveAuthoredBugReportTribe);
  assertLiveAuthoredBugReportResult(liveAuthoredBugReportResult, startupState.assignments, liveAuthoredBugReportTribe);
  liveAuthoredBugReportState = summarizeLiveAiState(await page.evaluate(() => JSON.parse(window.render_game_to_text())), requiredTribes);
  assertAiIssueFeedbackLoop(liveAuthoredBugReportState);
  assertTestOnlyIssuesExcludedFromInboxes(liveAuthoredBugReportState, [liveAuthoredBugReportResult], "open");
  liveAuthoredOpenPromptState = await page.evaluate(async () => {
    if (typeof window.refresh_ai_report_review_for_test !== "function") return { ok: false, reason: "missing report review refresh hook" };
    return await window.refresh_ai_report_review_for_test();
  });
  assertTestOnlyIssuesExcludedFromPromptContexts(liveAuthoredOpenPromptState, [liveAuthoredBugReportResult], "open");
}

const forcedLiveIssueResults = [];
let forcedLiveIssueState = null;
let forcedOpenPromptState = null;
const forcedLiveIssueTriages = [];
let forcedFixedLessonState = null;
if (forceLiveIssue) {
  for (const tribeId of requiredTribes) {
    const result = await page.evaluate(async ({ targetTribeId }) => {
      if (typeof window.force_live_ai_issue_for_test !== "function") return { ok: false, reason: "missing live issue hook" };
      return await window.force_live_ai_issue_for_test(
        targetTribeId,
        `Live feedback canary verified that ${targetTribeId} can file a saved sovereign issue and read it in that sovereign planning inbox.`
      );
    }, { targetTribeId: tribeId });
    forcedLiveIssueResults.push(result);
  }
  assertForcedLiveIssueResults(forcedLiveIssueResults, startupState.assignments);
  const failedForcedIssue = forcedLiveIssueResults.find((result) => !result?.ok || result.issue?.saveState !== "saved");
  if (failedForcedIssue) {
    throw new Error(`Forced live AI issue did not save cleanly: ${JSON.stringify(failedForcedIssue)}`);
  }
  const parsed = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  forcedLiveIssueState = summarizeLiveAiState(parsed, requiredTribes);
  assertAiIssueFeedbackLoop(forcedLiveIssueState);
  assertForcedIssuesVisibleForAllTribes(forcedLiveIssueState, forcedLiveIssueResults);
  forcedOpenPromptState = await page.evaluate(async () => {
    if (typeof window.refresh_ai_report_review_for_test !== "function") return { ok: false, reason: "missing report review refresh hook" };
    return await window.refresh_ai_report_review_for_test();
  });
  assertForcedIssuesInPromptContexts(forcedOpenPromptState, forcedLiveIssueResults, "open");
}

const followupRelease = await page.evaluate(() => {
  if (typeof window.hold_llm_followup_strategy_for_test !== "function") return { ok: false, reason: "missing follow-up strategy hold hook" };
  return window.hold_llm_followup_strategy_for_test(false);
});
if (!followupRelease.ok || followupRelease.enabled !== false) {
  throw new Error(`Could not release live monitor follow-up strategy hold: ${JSON.stringify(followupRelease)}`);
}

const sampleStartedAt = Date.now();
let sampledState = startupState;
while (Date.now() - sampleStartedAt < sampleMs) {
  await page.waitForTimeout(1000);
  const parsed = await page.evaluate(() => {
    window.advanceTime?.(1000);
    return JSON.parse(window.render_game_to_text());
  });
  sampledState = summarizeLiveAiState(parsed, requiredTribes);
}

await page.screenshot({ path: screenshotPath, fullPage: true });
if (liveAuthoredBugReportResult?.issue) {
  liveAuthoredBugReportTriage = await markLiveIssueFixed(
    page,
    liveAuthoredBugReportResult.issue,
    "Live model-authored bug report verified",
    "smoke-live-ai asked a real assigned local model to inspect an in-world integrity contradiction, confirmed it authored a REPORT_BUG/bugReport, then closed the report with proof before strict review."
  );
}
if (forcedLiveIssueResults.some((result) => result?.issue)) {
  for (const result of forcedLiveIssueResults) {
    if (result?.issue) forcedLiveIssueTriages.push(await markForcedLiveIssueFixed(page, result.issue));
  }
}
if (liveAuthoredBugReportResult?.issue || forcedLiveIssueResults.some((result) => result?.issue)) {
  forcedFixedLessonState = await page.evaluate(async () => {
    if (typeof window.refresh_ai_report_review_for_test !== "function") return { ok: false, reason: "missing report review refresh hook" };
    return await window.refresh_ai_report_review_for_test();
  });
  for (const result of forcedLiveIssueResults) {
    if (result?.issue) assertFixedIssueResolvedLesson(forcedFixedLessonState, result.issue);
  }
  if (forcedLiveIssueResults.length > 0) {
    assertFixedIssuesResolvedForAllTribes(forcedFixedLessonState, forcedLiveIssueResults);
    assertForcedIssuesInPromptContexts(forcedFixedLessonState, forcedLiveIssueResults, "fixed");
  }
  if (liveAuthoredBugReportResult?.issue) {
    assertTestOnlyIssuesExcludedFromInboxes(forcedFixedLessonState, [liveAuthoredBugReportResult], "fixed");
    assertTestOnlyIssuesExcludedFromPromptContexts(forcedFixedLessonState, [liveAuthoredBugReportResult], "fixed");
  }
}
await browser.close();

const reportQuality = summarizeReportQuality({
  liveAuthoredBugReportResult,
  forcedLiveIssueResults,
  finalState: sampledState
});

const screenshot = await stat(screenshotPath);
if (screenshot.size < 50_000) {
  throw new Error(`Live AI iteration screenshot looks too small: ${screenshot.size}`);
}
if (errors.length > 0) {
  throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
}

assertStartupParallelism(parallelStartupState);
assertStartupState(startupState);
assertSampledState(sampledState);

let review;
try {
  const { stdout } = await execFileAsync("pnpm", ["ai:review:strict", "--", "--json", "--no-write"], {
    cwd: "/Users/benjaminpommeraud/Desktop/Sovereigns",
    maxBuffer: 5 * 1024 * 1024
  });
  review = parseReviewJson(stdout);
} catch (error) {
  const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout ?? "") : "";
  const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr ?? "") : "";
  throw new Error(`Strict AI review failed after live AI iteration.\n${stdout}\n${stderr}`.trim());
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      startupTimeoutMs,
      sampleMs,
      minStrategyTurnsPerTribe,
      forceLiveIssue,
      forceLiveAuthoredBugReport,
      screenshotPath,
      screenshotBytes: screenshot.size,
      parallelStartup: parallelStartupState,
      startup: startupState,
      liveAuthoredBugReport: liveAuthoredBugReportResult
        ? {
            ok: liveAuthoredBugReportResult.ok,
            provider: liveAuthoredBugReportResult.provider,
            model: liveAuthoredBugReportResult.model,
            strategySummary: liveAuthoredBugReportResult.strategySummary,
            authoredReportText: liveAuthoredBugReportResult.authoredReportText,
            accepted: liveAuthoredBugReportResult.accepted,
            rejected: liveAuthoredBugReportResult.rejected,
            issue: liveAuthoredBugReportResult.issue,
            feedback: liveAuthoredBugReportState
              ? {
                  tick: liveAuthoredBugReportState.tick,
                  aiIssueCount: liveAuthoredBugReportState.aiIssues.length,
                  inbox: liveAuthoredBugReportState.tribes.find((tribe) => tribe.id === liveAuthoredBugReportResult.issue?.tribeId)?.iterationInbox ?? null,
                  promptContext: summarizeForcedIssuePromptContexts(liveAuthoredOpenPromptState, [liveAuthoredBugReportResult])?.[0] ?? null
                }
              : null,
            triage: liveAuthoredBugReportTriage,
            fixedFeedback: forcedFixedLessonState
              ? {
                  ok: forcedFixedLessonState.ok,
                  inbox: forcedFixedLessonState.tribes?.find((tribe) => tribe.id === liveAuthoredBugReportResult.issue?.tribeId)?.iterationInbox ?? null,
                  promptContext: summarizeForcedIssuePromptContexts(forcedFixedLessonState, [liveAuthoredBugReportResult])?.[0] ?? null
                }
              : null
          }
        : null,
      forcedLiveIssue: forcedLiveIssueResults[0]
        ? {
            ok: forcedLiveIssueResults[0].ok,
            issue: forcedLiveIssueResults[0].issue,
            feedback: forcedLiveIssueState
              ? {
                  tick: forcedLiveIssueState.tick,
                  aiIssueCount: forcedLiveIssueState.aiIssues.length,
                  blueInbox: forcedLiveIssueState.tribes.find((tribe) => tribe.id === "blue")?.iterationInbox ?? null
                }
              : null,
            triage: forcedLiveIssueTriages[0] ?? null,
            fixedFeedback: forcedFixedLessonState
              ? {
                  ok: forcedFixedLessonState.ok,
                  blueInbox: forcedFixedLessonState.tribes?.find((tribe) => tribe.id === "blue")?.iterationInbox ?? null,
                  aiIterationPromptContext: forcedFixedLessonState.aiIterationPromptContext ?? null
                }
              : null
          }
        : null,
      forcedLiveIssues: forcedLiveIssueResults.length
        ? {
            ok: forcedLiveIssueResults.every((result) => result?.ok && result.issue?.saveState === "saved"),
            issues: forcedLiveIssueResults.map((result) => result.issue).filter(Boolean),
            feedback: forcedLiveIssueState
              ? {
                  tick: forcedLiveIssueState.tick,
                  aiIssueCount: forcedLiveIssueState.aiIssues.length,
                  inboxes: summarizeForcedIssueInboxes(forcedLiveIssueState.tribes, forcedLiveIssueResults),
                  promptContexts: summarizeForcedIssuePromptContexts(forcedOpenPromptState, forcedLiveIssueResults)
                }
              : null,
            triages: forcedLiveIssueTriages,
            fixedFeedback: forcedFixedLessonState
              ? {
                  ok: forcedFixedLessonState.ok,
                  inboxes: summarizeForcedIssueInboxes(forcedFixedLessonState.tribes, forcedLiveIssueResults),
                  promptContexts: summarizeForcedIssuePromptContexts(forcedFixedLessonState, forcedLiveIssueResults),
                  playerPromptResolvedLessons: forcedFixedLessonState.aiIterationPromptContext?.resolvedLessons ?? []
                }
              : null
          }
        : null,
      reportQuality,
      final: sampledState,
      review: {
        actionableUnresolved: review.actionableUnresolved,
        actionableBuckets: review.actionableBuckets,
        parserTransportOpen: review.parserTransportOpen,
        fixedMissingProof: review.fixedMissingProof,
        nextActions: review.nextActions
      },
      warnings
    },
    null,
    2
  )
);

function summarizeLiveAiState(parsed, tribeIds) {
  const decisions = parsed.latestAiDecisions ?? [];
  const firstDoctrines = firstDoctrineDecisions(decisions, tribeIds);
  const autonomousStrategyCoverage = summarizeAutonomousStrategyCoverage(decisions, tribeIds, parsed.llm?.modelAssignments ?? {});
  const firstDoctrineFallbacks = firstDoctrines.filter((decision) => decision.provider !== "ollama");
  const defaultNamedTribes = (parsed.tribes ?? []).filter((tribe) => defaultRealmNames.has(tribe.name)).map((tribe) => tribe.id);
  const assignedModelNames = Object.values(parsed.llm?.modelAssignments ?? {}).filter(Boolean);
  const assignedDiversityModels = Array.from(new Set(assignedModelNames.filter((model) => model !== parsed.llm?.strategyBootstrapModel)));
  const quality = parsed.llm?.modelQuality ?? [];
  const fallbackDecisionCount =
    Number.isInteger(parsed.llm?.fallbackDecisionCount)
      ? parsed.llm.fallbackDecisionCount
      : quality.reduce((total, entry) => total + (entry.fallbackDecisions ?? 0), 0);
  const activeModels = new Set((parsed.llm?.activeJobs ?? []).map((job) => job.model).filter(Boolean));
  const engagedDiversityModels = assignedDiversityModels.filter((model) => {
    const row = quality.find((entry) => entry.model === model);
    return activeModels.has(model) || (row?.liveDecisions ?? 0) > 0 || (row?.fallbackDecisions ?? 0) > 0;
  });
  const aiIterationPromptContext = parsed.aiIterationPromptContext ?? {};
  return {
    mode: parsed.mode,
    activeModel: parsed.activeModel,
    tick: parsed.tick,
    schedulingStarted: parsed.llm?.schedulingStarted,
    identitySetupComplete: parsed.llm?.identitySetupComplete,
    openingIdentitySetupPending: parsed.llm?.openingIdentitySetupPending,
    identityProgress: parsed.llm?.identityProgress,
    firstDoctrineProgress: parsed.llm?.firstDoctrineProgress,
    activeJobs: parsed.llm?.activeJobs ?? [],
    activeJobCount: parsed.llm?.activeJobCount ?? 0,
    maxConcurrentJobs: parsed.llm?.maxConcurrentJobs ?? 0,
    compactAiStatus: parsed.llm?.compactStatus,
    fallbackDecisionCount,
    status: parsed.llm?.status,
    identityStatus: parsed.llm?.identityStatus,
    identityBootstrapModel: parsed.llm?.identityBootstrapModel,
    strategyBootstrapModel: parsed.llm?.strategyBootstrapModel,
    assignments: parsed.llm?.modelAssignments,
    modelQuality: quality,
    cooldown: parsed.llm?.cooldown,
    firstDoctrines: firstDoctrines.map((decision) => ({
      tribeId: decision.tribeId,
      provider: decision.provider,
      model: decision.model,
      summary: decision.summary,
      accepted: decision.accepted,
      rejected: decision.rejected
    })),
    autonomousStrategyCoverage,
    firstDoctrineFallbacks: firstDoctrineFallbacks.map((decision) => ({
      tribeId: decision.tribeId,
      provider: decision.provider,
      model: decision.model,
      summary: decision.summary
    })),
    defaultNamedTribes,
    assignedDiversityModels,
    engagedDiversityModels,
    tribes: (parsed.tribes ?? []).map((tribe) => ({
      id: tribe.id,
      defaultName: tribe.defaultName,
      name: tribe.name,
      sovereignName: tribe.sovereignName,
      namingStyle: tribe.namingStyle,
      controller: tribe.controller,
      identityChosen: tribe.identityChosen,
      eliminated: tribe.eliminated,
      units: tribe.units,
      iterationInbox: summarizeIterationInbox(tribe.iterationInbox)
    })),
    aiIssues: parsed.aiIssues ?? [],
    aiIterationPromptContext,
    aiReportReview: {
      ok: parsed.aiReportReview?.ok,
      filters: parsed.aiReportReview?.filters,
      liveReports: parsed.aiReportReview?.liveReports,
      syntheticReports: parsed.aiReportReview?.syntheticReports,
      liveReviewCounts: parsed.aiReportReview?.liveReviewCounts,
      syntheticReviewCounts: parsed.aiReportReview?.syntheticReviewCounts,
      focusBuckets: parsed.aiReportReview?.focusBuckets ?? []
    },
    latestAiDecisions: decisions
  };
}

function firstDoctrineDecisions(decisions, tribeIds) {
  const byTribe = new Map();
  for (const decision of decisions) {
    if (!tribeIds.includes(decision.tribeId)) continue;
    if (!isAutonomousStrategyDecision(decision)) continue;
    if (!byTribe.has(decision.tribeId)) byTribe.set(decision.tribeId, decision);
  }
  return tribeIds.flatMap((tribeId) => (byTribe.has(tribeId) ? [byTribe.get(tribeId)] : []));
}

function summarizeAutonomousStrategyCoverage(decisions, tribeIds, assignments) {
  return tribeIds.map((tribeId) => {
    const tribeDecisions = decisions.filter((decision) => decision.tribeId === tribeId && isAutonomousStrategyDecision(decision));
    const live = tribeDecisions.filter((decision) => decision.provider === "ollama");
    const fallback = tribeDecisions.filter((decision) => decision.provider !== "ollama");
    const assignedModel = assignments?.[tribeId] ?? "";
    const assignedModelLive = live.filter((decision) => !assignedModel || decision.model === assignedModel);
    return {
      tribeId,
      assignedModel,
      strategyDecisions: tribeDecisions.length,
      liveStrategyDecisions: live.length,
      assignedModelLiveDecisions: assignedModelLive.length,
      fallbackStrategyDecisions: fallback.length,
      latestTick: tribeDecisions.at(-1)?.tick ?? null,
      latestModel: tribeDecisions.at(-1)?.model ?? null,
      latestSummary: tribeDecisions.at(-1)?.summary ?? ""
    };
  });
}

function isAutonomousStrategyDecision(decision) {
  if (!decision || !decision.tribeId) return false;
  if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("IDENTITY:"))) return false;
  if ((decision.accepted ?? []).some((entry) => String(entry).startsWith("REPLY:"))) return false;
  const text = `${decision.summary ?? ""} ${decision.memoryNote ?? ""} ${(decision.accepted ?? []).join(" ")}`.toLowerCase();
  return !text.includes("live feedback canary");
}

function assertStartupParallelism(state) {
  assertExpectedTribeKeys(state.assignments, "modelAssignments");
  const activeModels = new Set((state.activeJobs ?? []).map((job) => job.model).filter((model) => model && model !== "fallback"));
  if ((state.activeJobs ?? []).length < 1 || activeModels.size < 1) {
    throw new Error(`Live AI startup did not begin a local model lane: ${JSON.stringify(state)}`);
  }
  const mismatchedIdentityJobs = (state.activeJobs ?? []).filter(
    (job) => job.mode === "identity" && state.assignments?.[job.tribeId] && job.model !== state.assignments[job.tribeId]
  );
  if (mismatchedIdentityJobs.length > 0) {
    throw new Error(`Live AI startup routed identity jobs away from their assigned models: ${JSON.stringify({ mismatchedIdentityJobs, state })}`);
  }
  const assignedModels = Array.from(new Set(Object.values(state.assignments ?? {}).filter((model) => model && model !== "fallback")));
  const expectedActiveModelCount = Math.min(state.maxConcurrentJobs || requiredTribes.length, assignedModels.length);
  if (assignedModels.length > 1 && activeModels.size < expectedActiveModelCount) {
    throw new Error(`Live AI startup collapsed assigned model diversity: ${JSON.stringify({ activeModels: Array.from(activeModels), assignedModels, state })}`);
  }
}

function assertStartupState(state) {
  if (state.mode !== "observer") throw new Error(`Live AI monitor expected observer mode: ${JSON.stringify(state)}`);
  if (state.schedulingStarted !== true) throw new Error(`Live AI scheduling did not start: ${JSON.stringify(state)}`);
  if (!state.activeModel || state.activeModel === "fallback") throw new Error(`Live AI active model is unavailable: ${JSON.stringify(state)}`);
  if (state.identitySetupComplete !== true || state.openingIdentitySetupPending !== false) {
    throw new Error(`Live AI identity gate did not complete cleanly: ${JSON.stringify(state)}`);
  }
  assertExpectedTribeKeys(state.assignments, "modelAssignments");
  for (const [tribeId, model] of Object.entries(state.assignments ?? {})) {
    if (!model || model === "fallback") throw new Error(`Live AI model assignment for ${tribeId} is invalid: ${JSON.stringify(state.assignments)}`);
  }
  if (!state.identityBootstrapModel || state.identityBootstrapModel === "fallback") {
    throw new Error(`Live AI identity bootstrap model is invalid: ${JSON.stringify(state)}`);
  }
  if (!state.strategyBootstrapModel || state.strategyBootstrapModel === "fallback") {
    throw new Error(`Live AI strategy bootstrap model is invalid: ${JSON.stringify(state)}`);
  }
  const missingIdentity = requiredTribes.length - (state.identityProgress?.chosen ?? 0);
  if (missingIdentity > 0) throw new Error(`Live AI startup missed identities: ${JSON.stringify(state)}`);
  const missingDoctrine = requiredTribes.length - (state.firstDoctrineProgress?.written ?? 0);
  if (missingDoctrine > 0 || state.firstDoctrines.length < requiredTribes.length) {
    throw new Error(`Live AI startup missed first doctrines: ${JSON.stringify(state)}`);
  }
  if (state.firstDoctrineFallbacks.length > 0) {
    throw new Error(`Live AI first doctrines fell back: ${JSON.stringify(state.firstDoctrineFallbacks)}`);
  }
  assertPerTribeStrategyCoverage(state, 1, "startup");
  const mismatchedFirstDoctrines = state.firstDoctrines.filter(
    (decision) => state.assignments?.[decision.tribeId] && decision.model !== state.assignments[decision.tribeId]
  );
  if (mismatchedFirstDoctrines.length > 0) {
    throw new Error(`Live AI first doctrines did not use assigned models: ${JSON.stringify({ mismatchedFirstDoctrines, assignments: state.assignments })}`);
  }
  if (state.defaultNamedTribes.length >= 3) {
    throw new Error(`Too many tribes kept default names after identity setup: ${JSON.stringify(state.defaultNamedTribes)}`);
  }
  assertCompactAiStatus(state);
  assertTribeIdentities(state.tribes);
  assertTribeIterationInboxes(state.tribes, state.aiIssues ?? []);
  assertAiReportReviewState(state);
  assertNoSyntheticPromptLeak(state.aiIterationPromptContext);
  if (state.aiReportReview?.ok === false) {
    throw new Error(`AI report review panel failed during live startup: ${JSON.stringify(state.aiReportReview)}`);
  }
}

function assertSampledState(state) {
  assertCompactAiStatus(state);
  assertPerTribeStrategyCoverage(state, minStrategyTurnsPerTribe, "sampled run");
  if (state.assignedDiversityModels.length > 0 && state.engagedDiversityModels.length === 0) {
    throw new Error(`No assigned non-bootstrap model was live, active, or recorded during the sampled run: ${JSON.stringify(state)}`);
  }
  const failedSaves = (state.aiIssues ?? []).filter((issue) => issue.saveState === "failed");
  if (failedSaves.length > 0) {
    throw new Error(`AI reports failed to save during live iteration: ${JSON.stringify(failedSaves)}`);
  }
  if (state.cooldown && (state.modelQuality ?? []).every((entry) => entry.liveDecisions === 0)) {
    throw new Error(`All live models appear unavailable during live iteration: ${JSON.stringify(state.cooldown)}`);
  }
  assertSavedIssueMetadata(state.aiIssues ?? []);
  assertAiReportReviewState(state);
  assertTribeIterationInboxes(state.tribes, state.aiIssues ?? []);
  assertAiIssueFeedbackLoop(state);
  assertNoSyntheticPromptLeak(state.aiIterationPromptContext);
  const parserTransportFailures = (state.modelQuality ?? []).filter((entry) => (entry.parserFailures ?? 0) > 0 || (entry.transportFailures ?? 0) > 0);
  if (parserTransportFailures.length > 0) {
    throw new Error(`Live AI monitor found parser/transport failures in strict mode: ${JSON.stringify(parserTransportFailures)}`);
  }
}

function assertPerTribeStrategyCoverage(state, minimumTurns, label) {
  const rows = state.autonomousStrategyCoverage ?? [];
  const missing = requiredTribes
    .map((tribeId) => rows.find((row) => row.tribeId === tribeId) ?? { tribeId, liveStrategyDecisions: 0, assignedModelLiveDecisions: 0 })
    .filter((row) => (row.liveStrategyDecisions ?? 0) < minimumTurns || (row.assignedModelLiveDecisions ?? 0) < minimumTurns);
  if (missing.length > 0) {
    throw new Error(
      `Live AI ${label} did not prove ${minimumTurns} assigned-model autonomous strategy turn(s) for every tribe: ${JSON.stringify({
        minimumTurns,
        missing,
        coverage: rows,
        latestAiDecisions: state.latestAiDecisions
      })}`
    );
  }
}

function assertCompactAiStatus(state) {
  if (!Number.isInteger(state.fallbackDecisionCount) || state.fallbackDecisionCount < 0) {
    throw new Error(`Live AI compact fallback count is invalid: ${JSON.stringify(state)}`);
  }
  const compact = state.compactAiStatus;
  if (
    !compact ||
    !Number.isInteger(compact.activeLanes) ||
    !Number.isInteger(compact.fallbackDecisions) ||
    compact.maxLanes !== state.maxConcurrentJobs ||
    compact.identitiesTotal !== requiredTribes.length ||
    compact.tribesTotal !== requiredTribes.length
  ) {
    throw new Error(`Live AI compact status is malformed: ${JSON.stringify({ compact, state })}`);
  }
  if (compact.fallbackDecisions !== state.fallbackDecisionCount) {
    throw new Error(`Live AI compact fallback count disagrees with model quality: ${JSON.stringify({ compact, state })}`);
  }
}

function assertExpectedTribeKeys(record, label) {
  const actual = Object.keys(record ?? {}).sort();
  const expected = requiredTribes.slice().sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} keys drifted: ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
  }
}

function assertTribeIdentities(tribes) {
  if (!Array.isArray(tribes) || tribes.length !== requiredTribes.length) {
    throw new Error(`Live AI monitor expected five tribes: ${JSON.stringify(tribes)}`);
  }
  const ids = tribes.map((tribe) => tribe.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(requiredTribes.slice().sort())) {
    throw new Error(`Live AI tribe ids drifted: ${JSON.stringify(ids)}`);
  }
  const names = new Set();
  const sovereignNames = new Set();
  for (const tribe of tribes) {
    if (tribe.identityChosen !== true) throw new Error(`Live AI tribe identity was not chosen: ${JSON.stringify(tribe)}`);
    if (!tribe.name || !tribe.sovereignName) throw new Error(`Live AI tribe has empty identity fields: ${JSON.stringify(tribe)}`);
    if (tribe.name === tribe.defaultName) throw new Error(`Live AI tribe kept default realm name: ${JSON.stringify(tribe)}`);
    if (tribe.sovereignName === `${tribe.defaultName} Sovereign`) {
      throw new Error(`Live AI tribe kept placeholder sovereign name: ${JSON.stringify(tribe)}`);
    }
    if (tribe.namingStyle === "unclaimed valley names") throw new Error(`Live AI tribe kept fallback naming style: ${JSON.stringify(tribe)}`);
    if (tribe.controller !== "llm") throw new Error(`Live AI tribe controller is not LLM: ${JSON.stringify(tribe)}`);
    if (names.has(tribe.name)) throw new Error(`Live AI duplicate realm name: ${tribe.name}`);
    if (sovereignNames.has(tribe.sovereignName)) throw new Error(`Live AI duplicate sovereign name: ${tribe.sovereignName}`);
    names.add(tribe.name);
    sovereignNames.add(tribe.sovereignName);
  }
}

function summarizeIterationInbox(inbox) {
  if (!inbox || typeof inbox !== "object") return null;
  return {
    openReportCount: inbox.openReportCount,
    resolvedLessonCount: inbox.resolvedLessonCount,
    recentOwnReports: Array.isArray(inbox.recentOwnReports) ? inbox.recentOwnReports : null,
    resolvedLessons: Array.isArray(inbox.resolvedLessons) ? inbox.resolvedLessons : null,
    promptSummary: typeof inbox.promptSummary === "string" ? inbox.promptSummary : ""
  };
}

function assertTribeIterationInboxes(tribes, aiIssues) {
  let totalOpenReports = 0;
  for (const tribe of tribes ?? []) {
    const inbox = tribe.iterationInbox;
    if (!inbox) throw new Error(`Live AI tribe is missing iteration inbox: ${JSON.stringify(tribe)}`);
    if (!Number.isInteger(inbox.openReportCount) || inbox.openReportCount < 0) {
      throw new Error(`Live AI iteration inbox has invalid open count: ${JSON.stringify({ tribe, inbox })}`);
    }
    if (!Number.isInteger(inbox.resolvedLessonCount) || inbox.resolvedLessonCount < 0) {
      throw new Error(`Live AI iteration inbox has invalid resolved count: ${JSON.stringify({ tribe, inbox })}`);
    }
    const recentOwnReportCount = Array.isArray(inbox.recentOwnReports) ? inbox.recentOwnReports.length : -1;
    const resolvedLessonPreviewCount = Array.isArray(inbox.resolvedLessons) ? inbox.resolvedLessons.length : -1;
    if (recentOwnReportCount < 0 || recentOwnReportCount > 4) {
      throw new Error(`Live AI iteration inbox has invalid open preview count: ${JSON.stringify({ tribe, inbox })}`);
    }
    if (resolvedLessonPreviewCount < 0 || resolvedLessonPreviewCount > 4) {
      throw new Error(`Live AI iteration inbox has invalid resolved preview count: ${JSON.stringify({ tribe, inbox })}`);
    }
    if (inbox.openReportCount < recentOwnReportCount || inbox.resolvedLessonCount < resolvedLessonPreviewCount) {
      throw new Error(`Live AI iteration inbox counts do not cover previews: ${JSON.stringify({ tribe, inbox })}`);
    }
    assertNoSyntheticPromptLeak(inbox);
    totalOpenReports += inbox.openReportCount;
  }
  const liveIssues = (aiIssues ?? []).filter((issue) => !isSyntheticIssue(issue));
  if (liveIssues.length > 0 && totalOpenReports === 0) {
    throw new Error(`Live AI issues were recorded but no tribe iteration inbox shows an open report: ${JSON.stringify(liveIssues)}`);
  }
}

function assertForcedLiveIssueResults(results, assignments) {
  if (results.length !== requiredTribes.length) {
    throw new Error(`Forced live issue canary did not run for every tribe: ${JSON.stringify(results)}`);
  }
  const seen = new Set();
  for (const result of results) {
    const issue = result?.issue;
    if (!result?.ok || !issue || issue.saveState !== "saved") {
      throw new Error(`Forced live issue canary did not save: ${JSON.stringify(result)}`);
    }
    if (!requiredTribes.includes(issue.tribeId)) {
      throw new Error(`Forced live issue canary used an unexpected tribe: ${JSON.stringify(issue)}`);
    }
    if (seen.has(issue.tribeId)) {
      throw new Error(`Forced live issue canary duplicated a tribe: ${JSON.stringify(results.map((candidate) => candidate?.issue?.tribeId))}`);
    }
    seen.add(issue.tribeId);
    const expectedModel = assignments?.[issue.tribeId];
    if (expectedModel && issue.model !== expectedModel) {
      throw new Error(`Forced live issue for ${issue.tribeId} used ${issue.model}, expected assigned model ${expectedModel}: ${JSON.stringify(issue)}`);
    }
  }
  for (const tribeId of requiredTribes) {
    if (!seen.has(tribeId)) throw new Error(`Forced live issue canary missed ${tribeId}: ${JSON.stringify(results)}`);
  }
}

function assertLiveAuthoredBugReportResult(result, assignments, requestedTribeId) {
  if (!result?.ok || !result.issue || result.issue.saveState !== "saved") {
    throw new Error(`Live model did not author and save a bug report: ${JSON.stringify(result)}`);
  }
  if (!requiredTribes.includes(result.issue.tribeId) || result.issue.tribeId !== requestedTribeId) {
    throw new Error(`Live-authored bug report used the wrong tribe: ${JSON.stringify({ requestedTribeId, result })}`);
  }
  if (result.provider !== "ollama" || result.issue.provider !== "ollama") {
    throw new Error(`Live-authored bug report did not come from Ollama: ${JSON.stringify(result)}`);
  }
  const expectedModel = assignments?.[result.issue.tribeId];
  if (expectedModel && (result.model !== expectedModel || result.issue.model !== expectedModel)) {
    throw new Error(`Live-authored bug report used ${result.model}/${result.issue.model}, expected ${expectedModel}: ${JSON.stringify(result)}`);
  }
  if (!["self_report", "ai_report"].includes(result.issue.category)) {
    throw new Error(`Live-authored bug report used an unexpected category: ${JSON.stringify(result)}`);
  }
  if (!String(result.issue.source ?? "").includes("kind=live_integrity_canary")) {
    throw new Error(`Live-authored integrity canary was saved without test-only source metadata: ${JSON.stringify(result.issue)}`);
  }
  const text = normalizeIssueText(`${result.authoredReportText} ${result.issue.report}`);
  if (!text.includes("zero") && !text.includes("ledger") && !text.includes("population") && !text.includes("contradiction")) {
    throw new Error(`Live-authored bug report does not mention the integrity contradiction: ${JSON.stringify(result)}`);
  }
  if (!Array.isArray(result.orders)) {
    throw new Error(`Live-authored bug report did not expose model-authored orders: ${JSON.stringify(result)}`);
  }
  const authoredReportOrder = result.orders.some((order) => order?.type === "REPORT_BUG");
  if (!authoredReportOrder && !result.authoredReportText) {
    throw new Error(`Live model neither wrote REPORT_BUG nor a bugReport field: ${JSON.stringify(result)}`);
  }
}

function summarizeReportQuality({ liveAuthoredBugReportResult, forcedLiveIssueResults, finalState }) {
  const rows = collectReportQualityRows({ liveAuthoredBugReportResult, forcedLiveIssueResults, finalState });
  const missingFieldsByName = Object.fromEntries(reportQualityFields.map((field) => [field.name, 0]));
  const examples = [];
  let vagueCount = 0;
  let actionable = 0;
  for (const row of rows) {
    for (const field of row.missingFields) missingFieldsByName[field] = (missingFieldsByName[field] ?? 0) + 1;
    if (row.vague) vagueCount += 1;
    if (row.missingFields.length === 0 && !row.vague) actionable += 1;
    if ((row.missingFields.length > 0 || row.vague) && examples.length < 2) examples.push(rowExample(row));
  }
  return {
    total: rows.length,
    actionable,
    missingFieldsByName,
    vagueCount,
    examples
  };
}

function collectReportQualityRows({ liveAuthoredBugReportResult, forcedLiveIssueResults, finalState }) {
  const rows = [];
  const seen = new Set();
  const add = (issue, source, authoredReportText = "") => {
    if (!issue || isSyntheticIssue(issue)) return;
    const key = issue.snapshot || issue.id || `${issue.tick}:${issue.tribeId}:${issue.report}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(reportQualityRow(issue, source, authoredReportText));
  };
  if (liveAuthoredBugReportResult?.issue) add(liveAuthoredBugReportResult.issue, "liveAuthoredBugReport", liveAuthoredBugReportResult.authoredReportText ?? "");
  for (const result of forcedLiveIssueResults ?? []) if (result?.issue) add(result.issue, "forcedLiveIssue", "");
  for (const issue of finalState?.aiIssues ?? []) add(issue, "finalAiIssues", "");
  return rows;
}

function reportQualityRow(issue, source, authoredReportText) {
  const text = `${issue.report ?? ""} ${authoredReportText ?? ""}`;
  const missingFields = reportQualityFields
    .filter((field) => {
      if (field.name === "bugSeverity" && issue.severity) return false;
      return !field.patterns.some((pattern) => pattern.test(text));
    })
    .map((field) => field.name);
  const normalized = normalizeIssueText(text);
  const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  const vague =
    wordCount < 18 ||
    /^(issue|bug|problem|broken|not working|something is wrong)\.?$/i.test(normalized) ||
    !/\b(expected|actual|repro|because|when|after|before|should|instead|strategy|impact)\b/i.test(normalized);
  return {
    source,
    tribeId: issue.tribeId ?? null,
    model: issue.model ?? null,
    severity: issue.severity ?? null,
    category: issue.category ?? null,
    missingFields,
    vague,
    wordCount,
    report: issue.report ?? ""
  };
}

function rowExample(row) {
  return {
    source: row.source,
    tribeId: row.tribeId,
    model: row.model,
    severity: row.severity,
    category: row.category,
    missingFields: row.missingFields,
    vague: row.vague,
    report: String(row.report ?? "").slice(0, 220)
  };
}

function assertForcedIssuesVisibleForAllTribes(state, results) {
  for (const issue of forcedIssues(results)) {
    const tribe = (state.tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
    const inbox = tribe?.iterationInbox;
    const reports = Array.isArray(inbox?.recentOwnReports) ? inbox.recentOwnReports : [];
    const issueText = normalizeIssueText(JSON.stringify(reports));
    const issueCategorySeverity = `${issue.category}/${issue.severity}`.toLowerCase();
    const issueSnippet = stableIssueSnippet(issue.report);
    if (!inbox || inbox.openReportCount <= 0 || !issueText.includes(issueCategorySeverity) || (issueSnippet && !issueText.includes(issueSnippet))) {
      throw new Error(`Forced live issue is not visible in ${issue.tribeId}'s own inbox: ${JSON.stringify({ issue, inbox })}`);
    }
  }
}

function assertFixedIssuesResolvedForAllTribes(state, results) {
  for (const issue of forcedIssues(results)) {
    const tribe = (state.tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
    const inbox = tribe?.iterationInbox;
    const lessons = Array.isArray(inbox?.resolvedLessons) ? inbox.resolvedLessons : [];
    const lessonText = normalizeIssueText(JSON.stringify(lessons));
    const issueCategorySeverity = `${issue.category}/${issue.severity}`.toLowerCase();
    const issueSnippet = stableIssueSnippet(issue.report);
    if (!inbox || inbox.resolvedLessonCount <= 0 || !lessonText.includes("fixed") || !lessonText.includes(issueCategorySeverity) || (issueSnippet && !lessonText.includes(issueSnippet))) {
      throw new Error(`Fixed live issue is not visible as a resolved lesson for ${issue.tribeId}: ${JSON.stringify({ issue, inbox })}`);
    }
  }
}

function assertForcedIssuesInPromptContexts(state, results, status) {
  if (!state?.ok) {
    throw new Error(`Report review refresh failed before ${status} prompt-context assertion: ${JSON.stringify(state)}`);
  }
  for (const issue of forcedIssues(results)) {
    const row = (state.tribePromptContexts ?? []).find((candidate) => candidate.id === issue.tribeId);
    const context = row?.aiIterationPromptContext;
    if (!context) {
      throw new Error(`Missing ${status} prompt context for ${issue.tribeId}: ${JSON.stringify(state)}`);
    }
    const issueCategorySeverity = `${issue.category}/${issue.severity}`.toLowerCase();
    const issueSnippet = stableIssueSnippet(issue.report);
    const openText = normalizeIssueText(JSON.stringify(context.recentOwnReports ?? []));
    const resolvedText = normalizeIssueText(JSON.stringify(context.resolvedLessons ?? []));
    if (status === "open") {
      if (!openText.includes(issueCategorySeverity) || (issueSnippet && !openText.includes(issueSnippet))) {
        throw new Error(`Open live issue did not enter ${issue.tribeId}'s prompt context: ${JSON.stringify({ issue, context })}`);
      }
      continue;
    }
    if (openText.includes(issueCategorySeverity) && (!issueSnippet || openText.includes(issueSnippet))) {
      throw new Error(`Fixed live issue remained open in ${issue.tribeId}'s prompt context: ${JSON.stringify({ issue, context })}`);
    }
    if (!resolvedText.includes("fixed") || !resolvedText.includes(issueCategorySeverity) || (issueSnippet && !resolvedText.includes(issueSnippet))) {
      throw new Error(`Fixed live issue did not enter ${issue.tribeId}'s resolved prompt lessons: ${JSON.stringify({ issue, context })}`);
    }
  }
}

function assertTestOnlyIssuesExcludedFromInboxes(state, results, status) {
  for (const issue of forcedIssues(results)) {
    const tribe = (state.tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
    const inbox = tribe?.iterationInbox;
    const issueText = normalizeIssueText(JSON.stringify([inbox?.recentOwnReports ?? [], inbox?.resolvedLessons ?? []]));
    const issueSnippet = stableIssueSnippet(issue.report);
    const sourceText = normalizeIssueText(issue.source);
    if (sourceText.includes("live_integrity_canary") && issueText.includes("live_integrity_canary")) {
      throw new Error(`Test-only integrity canary source leaked into ${issue.tribeId}'s ${status} inbox: ${JSON.stringify({ issue, inbox })}`);
    }
    if (sourceText.includes("live_integrity_canary") && issueSnippet && issueText.includes(issueSnippet)) {
      throw new Error(`Test-only integrity canary report leaked into ${issue.tribeId}'s ${status} inbox: ${JSON.stringify({ issue, inbox })}`);
    }
  }
}

function assertTestOnlyIssuesExcludedFromPromptContexts(state, results, status) {
  if (!state?.ok) {
    throw new Error(`Report review refresh failed before ${status} test-only prompt-context assertion: ${JSON.stringify(state)}`);
  }
  for (const issue of forcedIssues(results)) {
    const row = (state.tribePromptContexts ?? []).find((candidate) => candidate.id === issue.tribeId);
    const context = row?.aiIterationPromptContext;
    const contextText = normalizeIssueText(JSON.stringify(context ?? {}));
    const issueSnippet = stableIssueSnippet(issue.report);
    const sourceText = normalizeIssueText(issue.source);
    if (sourceText.includes("live_integrity_canary") && contextText.includes("live_integrity_canary")) {
      throw new Error(`Test-only integrity canary source leaked into ${issue.tribeId}'s ${status} prompt context: ${JSON.stringify({ issue, context })}`);
    }
    if (sourceText.includes("live_integrity_canary") && issueSnippet && contextText.includes(issueSnippet)) {
      throw new Error(`Test-only integrity canary report leaked into ${issue.tribeId}'s ${status} prompt context: ${JSON.stringify({ issue, context })}`);
    }
  }
}

function forcedIssues(results) {
  return results.map((result) => result?.issue).filter(Boolean);
}

function summarizeForcedIssueInboxes(tribes, results) {
  return forcedIssues(results).map((issue) => {
    const tribe = (tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
    const inbox = tribe?.iterationInbox ?? null;
    return {
      tribeId: issue.tribeId,
      tribeName: tribe?.name ?? issue.tribeId,
      issueModel: issue.model,
      openReportCount: inbox?.openReportCount ?? null,
      resolvedLessonCount: inbox?.resolvedLessonCount ?? null,
      recentOwnReportCount: Array.isArray(inbox?.recentOwnReports) ? inbox.recentOwnReports.length : null,
      resolvedLessonPreviewCount: Array.isArray(inbox?.resolvedLessons) ? inbox.resolvedLessons.length : null
    };
  });
}

function summarizeForcedIssuePromptContexts(state, results) {
  if (!state) return null;
  return forcedIssues(results).map((issue) => {
    const row = (state.tribePromptContexts ?? []).find((candidate) => candidate.id === issue.tribeId);
    const context = row?.aiIterationPromptContext ?? {};
    return {
      tribeId: issue.tribeId,
      tribeName: row?.name ?? issue.tribeId,
      recentOwnReportCount: Array.isArray(context.recentOwnReports) ? context.recentOwnReports.length : null,
      resolvedLessonCount: Array.isArray(context.resolvedLessons) ? context.resolvedLessons.length : null
    };
  });
}

function assertAiIssueFeedbackLoop(state) {
  const liveIssues = (state.aiIssues ?? []).filter((issue) => issue.saveState === "saved" && !isSyntheticIssue(issue));
  for (const issue of liveIssues) {
    const tribe = (state.tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
    if (!tribe) throw new Error(`Saved live AI issue has no matching tribe inbox: ${JSON.stringify(issue)}`);
    const inbox = tribe.iterationInbox;
    if (!inbox || inbox.openReportCount <= 0) {
      throw new Error(`Saved live AI issue did not re-enter the reporting tribe inbox: ${JSON.stringify({ issue, tribe })}`);
    }
    const reports = Array.isArray(inbox.recentOwnReports) ? inbox.recentOwnReports : [];
    const issueCategorySeverity = `${issue.category}/${issue.severity}`.toLowerCase();
    const issueSnippet = stableIssueSnippet(issue.report);
    const matchingReport = reports.find((report) => {
      const text = normalizeIssueText(report);
      return text.includes(issueCategorySeverity) && (!issueSnippet || text.includes(issueSnippet));
    });
    if (!matchingReport) {
      throw new Error(`Saved live AI issue was not visible in its tribe iteration inbox: ${JSON.stringify({ issue, inbox })}`);
    }
    if (issue.tribeId === "blue") {
      const contextText = normalizeIssueText(JSON.stringify(state.aiIterationPromptContext ?? {}));
      if (!contextText.includes(issueCategorySeverity) || (issueSnippet && !contextText.includes(issueSnippet))) {
        throw new Error(`Saved live AI issue for player tribe did not re-enter aiIterationPromptContext: ${JSON.stringify({ issue, context: state.aiIterationPromptContext })}`);
      }
    }
  }
}

function assertFixedIssueResolvedLesson(state, issue) {
  if (!state?.ok) {
    throw new Error(`Report review refresh failed after forced live issue triage: ${JSON.stringify(state)}`);
  }
  const tribe = (state.tribes ?? []).find((candidate) => candidate.id === issue.tribeId);
  if (!tribe) {
    throw new Error(`Fixed live AI issue has no refreshed tribe inbox: ${JSON.stringify({ issue, state })}`);
  }
  const inbox = tribe.iterationInbox;
  if (!inbox) {
    throw new Error(`Fixed live AI issue refresh lost iteration inbox: ${JSON.stringify({ issue, tribe })}`);
  }

  const issueCategorySeverity = `${issue.category}/${issue.severity}`.toLowerCase();
  const issueSnippet = stableIssueSnippet(issue.report);
  const openText = normalizeIssueText(JSON.stringify(inbox.recentOwnReports ?? []));
  const resolvedText = normalizeIssueText(JSON.stringify(inbox.resolvedLessons ?? []));
  if (openText.includes(issueCategorySeverity) && (!issueSnippet || openText.includes(issueSnippet))) {
    throw new Error(`Fixed live AI issue still appears as an open report: ${JSON.stringify({ issue, inbox })}`);
  }
  if (!resolvedText.includes("fixed") || !resolvedText.includes(issueCategorySeverity) || (issueSnippet && !resolvedText.includes(issueSnippet))) {
    throw new Error(`Fixed live AI issue did not re-enter resolved lessons: ${JSON.stringify({ issue, inbox })}`);
  }
  if (issue.tribeId === "blue") {
    const contextText = normalizeIssueText(JSON.stringify(state.aiIterationPromptContext ?? {}));
    if (!contextText.includes("fixed") || !contextText.includes(issueCategorySeverity) || (issueSnippet && !contextText.includes(issueSnippet))) {
      throw new Error(
        `Fixed live AI issue did not re-enter aiIterationPromptContext resolved lessons: ${JSON.stringify({
          issue,
          context: state.aiIterationPromptContext
        })}`
      );
    }
  }
}

function isSyntheticIssue(issue) {
  const text = `${issue.provider ?? ""} ${issue.model ?? ""} ${issue.source ?? ""}`.toLowerCase();
  return ["browser-test-hook", "mock:latest", "playwright", "smoke", "kind=live_integrity_canary"].some((marker) => text.includes(marker));
}

function stableIssueSnippet(report) {
  const words = normalizeIssueText(report)
    .split(/\s+/)
    .filter((word) => word && !["turn", "with", "from", "after", "this", "that", "into"].includes(word));
  return words.slice(0, 4).join(" ");
}

function normalizeIssueText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_/-]+/g, " ")
    .trim();
}

function assertAiReportReviewState(state) {
  const review = state.aiReportReview ?? {};
  if (review.ok !== true) throw new Error(`AI report review state is not ok: ${JSON.stringify(review)}`);
  if (review.filters?.scope !== "live") throw new Error(`AI report review default scope is not live: ${JSON.stringify(review.filters)}`);
  for (const field of ["liveReports", "syntheticReports"]) {
    if (!Number.isFinite(review[field])) throw new Error(`AI report review ${field} is not numeric: ${JSON.stringify(review)}`);
  }
  for (const field of ["unresolved", "triaged", "fixed", "ignored"]) {
    if (!Number.isFinite(review.liveReviewCounts?.[field]) || !Number.isFinite(review.syntheticReviewCounts?.[field])) {
      throw new Error(`AI report review count ${field} is not numeric: ${JSON.stringify(review)}`);
    }
  }
  const badBucket = (review.focusBuckets ?? []).find((bucket) => bucket.filters?.scope !== "live");
  if (badBucket) throw new Error(`AI report focus bucket is not live scoped: ${JSON.stringify(badBucket)}`);
}

function assertNoSyntheticPromptLeak(context) {
  const text = JSON.stringify(context ?? {}).toLowerCase();
  for (const marker of [
    "browser-test-hook",
    "mock:latest",
    "kind=live_integrity_canary",
    "smoke explicit ai self-report",
    "playwright verified that ai bug reports can append",
    "smoke endpoint verification"
  ]) {
    if (text.includes(marker)) throw new Error(`Synthetic marker leaked into AI iteration prompt context: ${marker}`);
  }
}

function assertSavedIssueMetadata(issues) {
  for (const issue of issues) {
    if (issue.saveState !== "saved") throw new Error(`Live AI issue is not saved: ${JSON.stringify(issue)}`);
    if (!issue.category || !issue.severity || !issue.source || !issue.turnContext || !issue.snapshot) {
      throw new Error(`Live AI issue is missing required metadata: ${JSON.stringify(issue)}`);
    }
    for (const marker of ["kind=", "decision=", "provider=", "model="]) {
      if (!String(issue.source).includes(marker)) throw new Error(`Live AI issue source missing ${marker}: ${JSON.stringify(issue)}`);
    }
    for (const marker of ["turn=", "tribe=", "tribeId=", "resources=", "survival=", "accepted=", "rejected=", "recent="]) {
      if (!String(issue.turnContext).includes(marker)) throw new Error(`Live AI issue turn context missing ${marker}: ${JSON.stringify(issue)}`);
    }
    if (!String(issue.snapshot).startsWith("/api/ai-bug-report-snapshot?id=")) {
      throw new Error(`Live AI issue snapshot URL is invalid: ${JSON.stringify(issue)}`);
    }
  }
}

async function markForcedLiveIssueFixed(page, issue) {
  return markLiveIssueFixed(
    page,
    issue,
    "Live issue feedback canary verified",
    "smoke-live-ai forced a non-synthetic saved issue, confirmed it appeared in the reporting tribe iteration inbox, then closed it before strict review."
  );
}

async function markLiveIssueFixed(page, issue, summary, evidence) {
  const reportId = reportIdFromSnapshot(issue.snapshot);
  if (!reportId) throw new Error(`Live issue is missing a triageable snapshot id: ${JSON.stringify(issue)}`);
  const result = await page.evaluate(async ({ reportId, tick, summary, evidence }) => {
    const response = await fetch("/api/ai-bug-report-triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId,
        status: "fixed",
        note: `${summary} and closed by the monitor.`,
        proof: {
          summary,
          evidence,
          fixedBy: "smoke",
          fixedAtTurn: tick,
          verifiedAt: new Date().toISOString()
        }
      })
    });
    return { ok: response.ok, status: response.status, body: await response.json() };
  }, { reportId, tick: issue.tick, summary, evidence });
  if (!result.ok || result.body?.status !== "fixed") {
    throw new Error(`Live issue triage failed: ${JSON.stringify({ issue, result })}`);
  }
  return result.body;
}

async function waitForIdleLlmLane(page) {
  await page.waitForFunction(
    () => {
      const parsed = JSON.parse(window.render_game_to_text());
      return (parsed.llm?.activeJobCount ?? 0) === 0;
    },
    null,
    { timeout: 90_000, polling: 1000 }
  );
}

async function runLiveAuthoredBugReportWithIdleRetry(page, targetTribeId) {
  let latestResult = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await waitForIdleLlmLane(page);
    latestResult = await page.evaluate(async ({ targetTribeId }) => {
      if (typeof window.force_live_authored_bug_report_for_test !== "function") {
        return { ok: false, reason: "missing live-authored bug report hook" };
      }
      return await window.force_live_authored_bug_report_for_test(targetTribeId);
    }, { targetTribeId });
    if (latestResult?.ok || !String(latestResult?.reason ?? "").includes("model lane is already busy")) return latestResult;
    await page.waitForTimeout(1500);
  }
  return latestResult;
}

function reportIdFromSnapshot(snapshot) {
  const value = String(snapshot ?? "");
  const match = value.match(/[?&]id=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function parseReviewJson(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`Could not find review JSON in output: ${stdout}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

function numberEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanEnv(name, fallback) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
