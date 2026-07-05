import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const includeLive = args.has("--live");
const outputPath = stringArg("--output", resolve(root, "AI_ITERATION_STATUS.json"));
const liveSampleMs = numberArg("--live-sample-ms", numberEnv("SOVEREIGNS_LIVE_AI_SAMPLE_MS", 8_000));

const startedAt = Date.now();
const commands = [];

const review = await runJsonCommand("review", process.execPath, [
  "scripts/ai-iteration-review.mjs",
  "--strict",
  "--json",
  "--no-write"
]);

const snapshotReplay = await runJsonCommand("snapshotReplay", process.execPath, [
  "scripts/replay-ai-snapshots.mjs",
  "--strict",
  "--json",
  "--no-write"
]);

let liveAi;
if (includeLive) {
  liveAi = await runJsonCommand(
    "liveAi",
    process.execPath,
    ["scripts/smoke-live-ai-iteration.mjs"],
    {
      SOVEREIGNS_LIVE_AI_SAMPLE_MS: String(liveSampleMs),
      SOVEREIGNS_FORCE_LIVE_AI_ISSUE: "1"
    },
    25 * 1024 * 1024
  );
}

const reviewSummary = summarizeReview(review.data);
const snapshotReplaySummary = summarizeSnapshotReplay(snapshotReplay.data);
const liveAiSummary = liveAi ? summarizeLiveAi(liveAi.data) : undefined;
const nextActions = buildNextActions(review.data, snapshotReplay.data, liveAi?.data);
const failedCommands = commands.filter((command) => !command.ok);
if (failedCommands.length > 0) {
  nextActions.unshift(`Fix failed iteration command(s): ${failedCommands.map((command) => command.name).join(", ")}.`);
}

const status = {
  schema: "sovereign-ai-iteration-status-v1",
  generatedAt: new Date().toISOString(),
  root,
  durationMs: Date.now() - startedAt,
  ok:
    commands.every((command) => command.ok) &&
    reviewSummary.ok !== false &&
    snapshotReplaySummary.ok !== false &&
    (!liveAiSummary || liveAiSummary.ok !== false),
  mode: {
    live: includeLive,
    liveSampleMs: includeLive ? liveSampleMs : 0
  },
  inputs: {
    review: ["--strict", "--json", "--no-write"],
    snapshotReplay: ["--strict", "--json", "--no-write"],
    live: includeLive ? { enabled: true, sampleMs: liveSampleMs } : { enabled: false }
  },
  mutationPolicy: {
    review: "read-only via --no-write",
    snapshotReplay: "read-only via --no-write",
    liveAi: includeLive ? "browser smoke may update live screenshots and persisted live AI reports" : "not run",
    status: "writes this AI iteration status artifact"
  },
  artifacts: {
    status: outputPath
  },
  commands,
  review: reviewSummary,
  snapshotReplay: snapshotReplaySummary,
  liveAi: liveAiSummary,
  nextActions
};

await writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...status, outputPath }, null, 2));

if (!status.ok) process.exitCode = 1;

async function runJsonCommand(name, command, commandArgs, env = {}, maxBuffer = 10 * 1024 * 1024) {
  const started = Date.now();
  const row = {
    name,
    command: [command, ...commandArgs].join(" "),
    ok: false,
    durationMs: 0,
    exitCode: 0
  };
  commands.push(row);
  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd: root,
      env: { ...process.env, ...env },
      maxBuffer
    });
    row.durationMs = Date.now() - started;
    row.stderr = stderr.trim() || undefined;
    let data;
    try {
      data = parseJsonPayload(stdout);
    } catch (parseError) {
      row.ok = false;
      row.exitCode = 1;
      row.error = parseError instanceof Error ? parseError.message : String(parseError);
      row.stdoutTail = tail(String(stdout ?? ""), 4_000);
      return { data: undefined };
    }
    row.ok = true;
    row.summary = commandSummary(name, data);
    return { data };
  } catch (error) {
    row.durationMs = Date.now() - started;
    row.ok = false;
    row.exitCode = Number.isFinite(error?.code) ? error.code : 1;
    row.error = error instanceof Error ? error.message : String(error);
    row.stderr = String(error?.stderr ?? "").trim() || undefined;
    row.stdoutTail = tail(String(error?.stdout ?? ""), 4_000);
    try {
      const data = parseJsonPayload(String(error?.stdout ?? ""));
      row.summary = commandSummary(name, data);
      return { data };
    } catch {
      return { data: undefined };
    }
  }
}

function parseJsonPayload(stdout) {
  const text = String(stdout ?? "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`Could not find JSON payload in command output: ${tail(text, 1_000)}`);
  return JSON.parse(text.slice(start, end + 1));
}

function summarizeReview(data) {
  if (!data) return { ok: false, error: "review command did not return parseable JSON" };
  return {
    ok: data.ok,
    generatedAt: data.generatedAt,
    totalReports: data.totalReports,
    actionableUnresolved: data.actionableUnresolved,
    actionableBuckets: data.actionableBuckets,
    excludedSyntheticUnresolved: data.excludedSyntheticUnresolved,
    parserTransportOpen: data.parserTransportOpen,
    parserTransportOpenBuckets: data.parserTransportOpenBuckets,
    fixedMissingProof: data.fixedMissingProof,
    triageCounts: data.triageCounts,
    gate: data.gate,
    nextActions: data.nextActions,
    topBacklog: (data.rankedBacklog ?? []).slice(0, 3).map((bucket) => ({
      key: bucket.key,
      category: bucket.category,
      severityCounts: bucket.severityCounts ?? {},
      count: bucket.count,
      latestTribe: bucket.latestTribe,
      latestReport: bucket.latestReport
    }))
  };
}

function summarizeSnapshotReplay(data) {
  if (!data) return { ok: false, error: "snapshot replay command did not return parseable JSON" };
  return {
    ok: data.ok,
    generatedAt: data.generatedAt,
    snapshots: data.snapshots,
    replayed: data.replayed,
    failures: data.failures ?? [],
    contractWarnings: data.contractWarnings ?? [],
    warningCount: (data.warnings ?? []).length,
    categories: data.categories,
    fixtureKinds: data.fixtureKinds
  };
}

function summarizeLiveAi(data) {
  if (!data) return { ok: false, error: "live AI command did not return parseable JSON" };
  const iterationInboxesBeforeCanaryTriage = summarizeLiveIterationInboxes(data.final?.tribes ?? []);
  const iterationInboxesAfterCanaryTriage = summarizePostCanaryIterationInboxes(data);
  const iterationInboxes = iterationInboxesAfterCanaryTriage ?? iterationInboxesBeforeCanaryTriage;
  return {
    ok: data.ok,
    url: data.url,
    screenshotPath: data.screenshotPath,
    screenshotBytes: data.screenshotBytes,
    minStrategyTurnsPerTribe: data.minStrategyTurnsPerTribe,
    parallelStartup: data.parallelStartup
      ? {
          tick: data.parallelStartup.tick,
          activeJobCount: data.parallelStartup.activeJobCount,
          activeJobs: data.parallelStartup.activeJobs ?? [],
          assignments: data.parallelStartup.assignments
        }
      : undefined,
    startup: {
      tick: data.startup?.tick,
      identityProgress: data.startup?.identityProgress,
      firstDoctrineProgress: data.startup?.firstDoctrineProgress,
      firstDoctrineFallbacks: data.startup?.firstDoctrineFallbacks?.length ?? 0,
      compactAiStatus: data.startup?.compactAiStatus,
      fallbackDecisionCount: data.startup?.fallbackDecisionCount ?? 0,
      defaultNamedTribes: data.startup?.defaultNamedTribes ?? [],
      assignments: data.startup?.assignments,
      autonomousStrategyCoverage: data.startup?.autonomousStrategyCoverage ?? [],
      engagedDiversityModels: data.startup?.engagedDiversityModels ?? []
    },
    final: {
      tick: data.final?.tick,
      activeJobs: data.final?.activeJobs ?? [],
      compactAiStatus: data.final?.compactAiStatus,
      fallbackDecisionCount: data.final?.fallbackDecisionCount ?? 0,
      cooldown: data.final?.cooldown ?? null,
      aiIssueCount: data.final?.aiIssues?.length ?? 0,
      autonomousStrategyCoverage: data.final?.autonomousStrategyCoverage ?? [],
      reportQuality: data.reportQuality ?? null,
      liveAuthoredBugReport: data.liveAuthoredBugReport
        ? {
            ok: data.liveAuthoredBugReport.ok,
            issueSaved: data.liveAuthoredBugReport.issue?.saveState === "saved",
            issueCategory: data.liveAuthoredBugReport.issue?.category,
            issueSeverity: data.liveAuthoredBugReport.issue?.severity,
            issueTribeId: data.liveAuthoredBugReport.issue?.tribeId,
            provider: data.liveAuthoredBugReport.provider,
            model: data.liveAuthoredBugReport.model,
            triageStatus: data.liveAuthoredBugReport.triage?.status ?? null,
            feedbackOpenReports: data.liveAuthoredBugReport.feedback?.inbox?.openReportCount ?? null,
            fixedFeedbackOpenReports: data.liveAuthoredBugReport.fixedFeedback?.inbox?.openReportCount ?? null,
            fixedFeedbackResolvedLessons: data.liveAuthoredBugReport.fixedFeedback?.inbox?.resolvedLessonCount ?? null
          }
        : null,
      forcedLiveIssue: data.forcedLiveIssue
        ? {
            ok: data.forcedLiveIssue.ok,
            issueSaved: data.forcedLiveIssue.issue?.saveState === "saved",
            issueCategory: data.forcedLiveIssue.issue?.category,
            issueSeverity: data.forcedLiveIssue.issue?.severity,
            feedbackOpenReports: data.forcedLiveIssue.feedback?.blueInbox?.openReportCount ?? 0,
            triageStatus: data.forcedLiveIssue.triage?.status ?? null,
            fixedFeedbackOpenReports: data.forcedLiveIssue.fixedFeedback?.blueInbox?.openReportCount ?? null,
            fixedFeedbackResolvedLessons: data.forcedLiveIssue.fixedFeedback?.blueInbox?.resolvedLessonCount ?? 0,
            fixedFeedbackPromptResolvedLessons: Array.isArray(data.forcedLiveIssue.fixedFeedback?.aiIterationPromptContext?.resolvedLessons)
              ? data.forcedLiveIssue.fixedFeedback.aiIterationPromptContext.resolvedLessons.length
              : null
          }
        : null,
      forcedLiveIssues: data.forcedLiveIssues
        ? {
            ok: data.forcedLiveIssues.ok,
            issueCount: data.forcedLiveIssues.issues?.length ?? 0,
            tribes: (data.forcedLiveIssues.issues ?? []).map((issue) => ({
              tribeId: issue.tribeId,
              model: issue.model,
              saveState: issue.saveState,
              category: issue.category,
              severity: issue.severity
            })),
            openFeedback: {
              aiIssueCount: data.forcedLiveIssues.feedback?.aiIssueCount ?? null,
              inboxes: data.forcedLiveIssues.feedback?.inboxes ?? [],
              promptContexts: data.forcedLiveIssues.feedback?.promptContexts ?? []
            },
            fixedFeedback: {
              triageCount: data.forcedLiveIssues.triages?.length ?? 0,
              inboxes: data.forcedLiveIssues.fixedFeedback?.inboxes ?? [],
              promptContexts: data.forcedLiveIssues.fixedFeedback?.promptContexts ?? []
            }
          }
        : null,
      iterationInboxes,
      iterationInboxesBeforeCanaryTriage,
      iterationInboxesAfterCanaryTriage,
      modelQuality: (data.final?.modelQuality ?? []).map((item) => ({
        model: item.model,
        liveDecisions: item.liveDecisions,
        fallbackDecisions: item.fallbackDecisions,
        parserFailures: item.parserFailures,
        transportFailures: item.transportFailures,
        status: item.status
      }))
    },
    review: data.review,
    warningCount: (data.warnings ?? []).length
  };
}

function buildNextActions(reviewData, replayData, liveData) {
  const actions = [];
  if (!reviewData) {
    actions.push("Restore parseable JSON output from the AI iteration review command.");
  } else if (!reviewData.ok || reviewData.actionableUnresolved > 0 || reviewData.actionableBuckets > 0) {
    actions.push(...(reviewData.nextActions ?? ["Fix actionable unresolved AI reports."]));
  }
  if (!replayData) {
    actions.push("Restore parseable JSON output from the AI snapshot replay command.");
  } else if (!replayData.ok || (replayData.failures ?? []).length > 0 || (replayData.contractWarnings ?? []).length > 0) {
    actions.push("Fix AI bug snapshot replay failures or contract warnings before trusting future AI reports.");
  }
  if (includeLive) {
    if (!liveData) {
      actions.push("Fix live Ollama startup/iteration monitor failure or timeout.");
    } else if (!liveData.ok) {
      actions.push("Fix live Ollama startup/iteration monitor failure.");
    }
    if (liveData && (liveData.final?.aiIssues ?? []).filter((issue) => !isLiveMonitorIssue(issue)).length > 0) {
      actions.push("Review new live AI issues produced during the live iteration sample.");
    }
  }
  if (actions.length === 0) {
    actions.push(includeLive ? "No actionable AI reports after live iteration. Continue with a longer live run or next roadmap feature." : "No actionable AI reports. Run `pnpm ai:iterate:live` to sample real Ollama behavior.");
  }
  return Array.from(new Set(actions));
}

function commandSummary(name, data) {
  if (name === "review") {
    return {
      ok: data.ok,
      actionableUnresolved: data.actionableUnresolved,
      actionableBuckets: data.actionableBuckets,
      parserTransportOpen: data.parserTransportOpen
    };
  }
  if (name === "snapshotReplay") {
    return {
      ok: data.ok,
      replayed: data.replayed,
      failures: data.failures?.length ?? 0,
      contractWarnings: data.contractWarnings?.length ?? 0
    };
  }
  if (name === "liveAi") {
    const inboxesBeforeCanaryTriage = summarizeLiveIterationInboxes(data.final?.tribes ?? []);
    const inboxesAfterCanaryTriage = summarizePostCanaryIterationInboxes(data);
    const inboxes = inboxesAfterCanaryTriage ?? inboxesBeforeCanaryTriage;
    const forcedLiveIssueCount = data.forcedLiveIssues?.issues?.length ?? (data.forcedLiveIssue?.issue ? 1 : 0);
    const forcedLiveIssueFixedCount =
      data.forcedLiveIssues?.triages?.filter((triage) => triage?.status === "fixed").length ??
      (data.forcedLiveIssue?.triage?.status === "fixed" ? 1 : 0);
    return {
      ok: data.ok,
      identityProgress: data.final?.identityProgress,
      firstDoctrineProgress: data.final?.firstDoctrineProgress,
      minStrategyTurnsPerTribe: data.minStrategyTurnsPerTribe,
      autonomousStrategyCoverage: data.final?.autonomousStrategyCoverage ?? [],
      liveAuthoredBugReport: data.liveAuthoredBugReport
        ? {
            ok: data.liveAuthoredBugReport.ok,
            issueSaved: data.liveAuthoredBugReport.issue?.saveState === "saved",
            triageStatus: data.liveAuthoredBugReport.triage?.status ?? null,
            tribeId: data.liveAuthoredBugReport.issue?.tribeId,
            model: data.liveAuthoredBugReport.model
          }
        : null,
      aiIssueCount: data.final?.aiIssues?.length ?? 0,
      forcedLiveIssue: forcedLiveIssueCount > 0 && forcedLiveIssueFixedCount === forcedLiveIssueCount,
      forcedLiveIssueCount,
      forcedLiveIssueFixedCount,
      iterationOpenReportsBeforeCanaryTriage: inboxesBeforeCanaryTriage.totalOpenReports,
      iterationOpenReportsAfterCanaryTriage: inboxesAfterCanaryTriage?.totalOpenReports ?? null,
      iterationOpenReports: inboxes.totalOpenReports,
      iterationResolvedLessons: inboxes.totalResolvedLessons
    };
  }
  return { ok: data.ok };
}

function summarizeLiveIterationInboxes(tribes) {
  const rows = (tribes ?? []).map((tribe) => ({
    tribeId: tribe.id,
    tribeName: tribe.name,
    openReportCount: tribe.iterationInbox?.openReportCount ?? 0,
    resolvedLessonCount: tribe.iterationInbox?.resolvedLessonCount ?? 0,
    recentOwnReportCount: Array.isArray(tribe.iterationInbox?.recentOwnReports) ? tribe.iterationInbox.recentOwnReports.length : 0,
    resolvedLessonPreviewCount: Array.isArray(tribe.iterationInbox?.resolvedLessons) ? tribe.iterationInbox.resolvedLessons.length : 0
  }));
  return {
    totalOpenReports: rows.reduce((total, row) => total + row.openReportCount, 0),
    totalResolvedLessons: rows.reduce((total, row) => total + row.resolvedLessonCount, 0),
    tribes: rows
  };
}

function summarizePostCanaryIterationInboxes(data) {
  const inboxes = data?.forcedLiveIssues?.fixedFeedback?.inboxes;
  if (!Array.isArray(inboxes) || inboxes.length === 0) return undefined;
  const triages = data?.forcedLiveIssues?.triages;
  const issues = data?.forcedLiveIssues?.issues;
  if (Array.isArray(issues) && Array.isArray(triages) && triages.filter((triage) => triage?.status === "fixed").length < issues.length) {
    return undefined;
  }
  const rows = inboxes.map((inbox) => ({
    tribeId: inbox.tribeId,
    tribeName: inbox.tribeName,
    openReportCount: Number.isFinite(inbox.openReportCount) ? inbox.openReportCount : 0,
    resolvedLessonCount: Number.isFinite(inbox.resolvedLessonCount) ? inbox.resolvedLessonCount : 0,
    recentOwnReportCount: Number.isFinite(inbox.recentOwnReportCount) ? inbox.recentOwnReportCount : 0,
    resolvedLessonPreviewCount: Number.isFinite(inbox.resolvedLessonPreviewCount) ? inbox.resolvedLessonPreviewCount : 0,
    source: "post-canary-triage"
  }));
  return {
    totalOpenReports: rows.reduce((total, row) => total + row.openReportCount, 0),
    totalResolvedLessons: rows.reduce((total, row) => total + row.resolvedLessonCount, 0),
    tribes: rows,
    source: "post-canary-triage"
  };
}

function isLiveMonitorIssue(issue) {
  const text = `${issue?.report ?? ""} ${issue?.source ?? ""} ${issue?.turnContext ?? ""}`.toLowerCase();
  return (
    text.includes("live feedback canary") ||
    text.includes("world ledger") ||
    text.includes("zero living subjects") ||
    text.includes("world-integrity") ||
    text.includes("integrity contradiction")
  );
}

function stringArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function numberArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function numberEnv(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tail(text, maxLength) {
  return text.length <= maxLength ? text : text.slice(text.length - maxLength);
}
