import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");
const strict = args.has("--strict");
const noWrite = args.has("--no-write");
const reportPath = stringArg("--report", resolve(root, "AI_BUG_REPORTS.md"));
const triagePath = stringArg("--triage", resolve(root, "AI_BUG_TRIAGE.json"));
const snapshotDir = stringArg("--snapshot-dir", resolve(root, "AI_BUG_SNAPSHOTS"));
const outputPath = stringArg("--output", resolve(root, "AI_SNAPSHOT_REPLAY_REPORT.md"));

const validCategories = new Set(["ai_report", "self_report", "llm_transport", "llm_parser", "llm_error", "validation", "state_race", "blocked_order"]);
const validSeverities = new Set(["low", "medium", "high"]);
const validPacketStates = new Set([
  "IN_TRANSIT_OUTBOUND",
  "AWAITING_REPLY",
  "IN_TRANSIT_RETURN",
  "COMPLETED",
  "OVERDUE",
  "KILLED_WITH_PACKET",
  "REFUSED_AT_GATE",
  "DETAINED"
]);

const markdown = existsSync(reportPath) ? await readFile(reportPath, "utf8") : "";
const reports = parseReports(markdown);
const reportsById = new Map(reports.map((entry) => [entry.id, entry]));
const triage = await readTriage(triagePath);
const snapshotFiles = existsSync(snapshotDir)
  ? (await readdir(snapshotDir)).filter((file) => file.endsWith(".json")).sort()
  : [];

const failures = [];
const warnings = [];
const contractWarnings = [];
const replays = [];
const reportSnapshotRefs = new Map();

for (const report of reports) {
  if (!report.snapshot) continue;
  const id = snapshotIdFromUrl(report.snapshot);
  if (!id) {
    failures.push(`Report ${report.id} has an unreadable snapshot URL: ${report.snapshot}`);
    continue;
  }
  reportSnapshotRefs.set(id, report);
  if (!existsSync(resolve(snapshotDir, `${id}.json`))) failures.push(`Report ${report.id} links to missing snapshot ${id}.json`);
}

for (const file of snapshotFiles) {
  const snapshotPath = resolve(snapshotDir, file);
  const id = basename(file, ".json");
  const context = { id, file };
  let payload;
  try {
    payload = JSON.parse(await readFile(snapshotPath, "utf8"));
  } catch (error) {
    failures.push(`${file}: JSON could not be parsed: ${errorMessage(error)}`);
    continue;
  }
  const replay = replaySnapshot(payload, context);
  replays.push(replay);
}

for (const [id, report] of reportSnapshotRefs) {
  if (!snapshotFiles.includes(`${id}.json`)) continue;
  const replay = replays.find((entry) => entry.id === id);
  if (!replay) failures.push(`Report ${report.id} links to snapshot ${id}, but it was not replayed.`);
}

const byCategory = countBy(replays, (entry) => entry.category);
const byStatus = countBy(replays, (entry) => entry.triageStatus);
const byFixtureKind = countBy(replays, (entry) => entry.fixtureKind);
const replayReport = {
  ok: failures.length === 0 && contractWarnings.length === 0,
  generatedAt: new Date().toISOString(),
  reportPath,
  triagePath,
  snapshotDir,
  outputPath: noWrite ? undefined : outputPath,
  totalReports: reports.length,
  reportSnapshots: reportSnapshotRefs.size,
  snapshots: snapshotFiles.length,
  replayed: replays.length,
  fixtureKinds: byFixtureKind,
  categories: byCategory,
  triageStatus: byStatus,
  failures,
  contractWarnings,
  warnings,
  latest: replays.slice(-8).reverse(),
  samples: sampleReplays(replays)
};

const markdownReport = formatReplayMarkdown(replayReport);
if (!noWrite) await writeFile(outputPath, markdownReport, "utf8");

if (jsonOutput) {
  console.log(JSON.stringify(replayReport, null, 2));
} else {
  console.log(markdownReport);
}

if (strict && (failures.length > 0 || contractWarnings.length > 0)) process.exitCode = 1;

function replaySnapshot(payload, context) {
  const localFailures = [];
  const localWarnings = [];
  const localContractWarnings = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    localFailures.push("snapshot wrapper must be an object");
    return finishReplay(context, {}, {}, {}, localFailures, localWarnings, localContractWarnings);
  }
  const wrapperReport = objectOrEmpty(payload.report);
  const snapshot = objectOrEmpty(payload.snapshot);
  const report = objectOrEmpty(snapshot.report);
  const tribe = objectOrEmpty(snapshot.tribe);
  const counts = objectOrEmpty(snapshot.counts);
  const survivalMandate = objectOrEmpty(snapshot.survivalMandate);
  const goldRace = objectOrEmpty(snapshot.goldRace);
  const mandate = objectOrEmpty(snapshot.mandate);
  const diplomacy = objectOrEmpty(snapshot.diplomacy);
  const visibleSummary = objectOrEmpty(snapshot.visibleSummary);
  const linkedReport = reportSnapshotRefs.get(context.id);
  const triageRecord = triage[context.id];

  if (payload.id && payload.id !== context.id) localFailures.push(`wrapper id ${payload.id} does not match filename id ${context.id}`);
  if (!payload.id) localContractWarnings.push("wrapper id is missing");
  if (!isIsoDate(payload.capturedAt)) localContractWarnings.push("capturedAt is missing or not an ISO timestamp");
  if (!linkedReport) localContractWarnings.push("snapshot is not linked from AI_BUG_REPORTS.md");
  if (linkedReport?.snapshot && snapshotIdFromUrl(linkedReport.snapshot) !== context.id) localFailures.push("linked report snapshot URL does not point back to this file");

  const category = stringValue(wrapperReport.category || report.category || linkedReport?.category || "unknown");
  const provider = stringValue(wrapperReport.provider || report.provider || linkedReport?.provider || "unknown");
  const model = stringValue(wrapperReport.model || report.model || linkedReport?.model || "unknown");
  const severity = stringValue(wrapperReport.severity || report.severity || linkedReport?.severity || "unknown");
  const fixtureKind = isMinimalEndpointSmoke(wrapperReport, snapshot) ? "minimal" : snapshot.report?.turnContext || wrapperReport.turnContext ? "state-invariant" : "minimal";

  if (snapshot.schema !== "sovereign-ai-bug-snapshot-v1") localFailures.push(`unexpected snapshot schema ${stringValue(snapshot.schema || "missing")}`);
  if (!validCategories.has(category)) localContractWarnings.push(`unknown category ${category}`);
  if (!validSeverities.has(severity) && provider !== "smoke") localContractWarnings.push(`unknown severity ${severity}`);
  if (linkedReport) {
    compareField(localFailures, "category", category, linkedReport.category);
    compareField(localFailures, "provider", provider, linkedReport.provider);
    compareField(localFailures, "model", model, linkedReport.model);
    compareField(localFailures, "severity", severity, linkedReport.severity);
    compareField(localFailures, "tick", stringValue(wrapperReport.tick), linkedReport.tick);
    compareField(localFailures, "tribe", stringValue(wrapperReport.tribe), linkedReport.tribe);
  }

  const wrapperTurnContext = parseTurnContext(wrapperReport.turnContext);
  const snapshotTurnContext = parseTurnContext(report.turnContext);
  const turnContext = fixtureKind === "minimal" ? {} : Object.keys(snapshotTurnContext).length > 0 ? snapshotTurnContext : wrapperTurnContext;
  if (Number.isFinite(numberValue(snapshot.tick)) && Number.isFinite(numberValue(wrapperReport.tick))) {
    compareNumber(localFailures, "snapshot tick", numberValue(snapshot.tick), numberValue(wrapperReport.tick));
  }
  if (turnContext.turn !== undefined && Number.isFinite(numberValue(snapshot.tick))) compareNumber(localFailures, "turnContext turn", numberValue(snapshot.tick), Number(turnContext.turn));
  if (turnContext.tribe && tribe.name) compareField(localFailures, "turnContext tribe", stringValue(tribe.name), turnContext.tribe);
  if (turnContext.wealth !== undefined && tribe.wealth !== undefined) compareNumber(localFailures, "wealth", numberValue(tribe.wealth), Number(turnContext.wealth));

  const resources = objectOrEmpty(tribe.resources);
  const contextResources = parseResourceContext(turnContext.resources);
  for (const [resource, amount] of Object.entries(contextResources)) {
    if (resources[resource] === undefined) {
      localFailures.push(`resource ${resource} appears in turnContext but is missing from snapshot tribe.resources`);
      continue;
    }
    compareNumber(localFailures, `resource ${resource}`, numberValue(resources[resource]), amount);
  }
  validateDevelopments(localFailures, localWarnings, localContractWarnings, tribe, turnContext.developments);
  for (const field of [
    ["units", "ownUnits"],
    ["military", "ownMilitary"],
    ["walls", "walls"],
    ["gates", "gates"],
    ["turrets", "turrets"]
  ]) {
    if (turnContext[field[0]] !== undefined && counts[field[1]] !== undefined) {
      compareNumber(localFailures, field[1], numberValue(counts[field[1]]), Number(turnContext[field[0]]));
    }
  }
  if (turnContext.accepted !== undefined && Array.isArray(report.accepted)) compareNumber(localFailures, "accepted count", report.accepted.length, Number(turnContext.accepted));
  if (turnContext.rejected !== undefined && Array.isArray(report.rejected)) compareNumber(localFailures, "rejected count", report.rejected.length, Number(turnContext.rejected));

  const source = parseSource(report.source || wrapperReport.source || linkedReport?.source || "");
  if (source.kind) validateSource(localFailures, category, source);
  if (source.decision && report.decisionId) compareField(localFailures, "source decision", stringValue(report.decisionId), source.decision);
  if (source.provider) compareField(localFailures, "source provider", provider, source.provider);
  if (source.model) compareField(localFailures, "source model", model, source.model);

  if (turnContext.goldRace !== undefined) {
    const racePayload = Object.keys(goldRace).length > 0 ? goldRace : mandate.goldTarget !== undefined ? mandate : {};
    validateGoldRace(localFailures, racePayload, turnContext.goldRace);
    if (Object.keys(goldRace).length === 0 && mandate.goldTarget !== undefined) {
      localWarnings.push("legacy snapshot stores goldRace payload under mandate compatibility field");
    }
  }
  if (turnContext.mandate !== undefined) {
    if (Object.keys(mandate).length === 0) localFailures.push("turnContext has mandate but snapshot.mandate is missing");
    localWarnings.push("legacy mandate snapshot replayed through compatibility path");
  }
  if (turnContext.survival !== undefined) {
    const survivalPayload = Object.keys(survivalMandate).length > 0 ? survivalMandate : goldRace;
    validateSurvivalMandate(localFailures, survivalPayload, turnContext.survival);
  }
  if (Object.keys(goldRace).length > 0) {
    const rule = stringValue(goldRace.victoryRule);
    if (rule && rule !== "most_gold_at_timer" && rule !== "population_happiness_safety_century_cull") {
      localFailures.push(`goldRace.victoryRule is ${goldRace.victoryRule}, expected known victory rule`);
    }
    const publicText = stringValue(goldRace.publicText).toLowerCase();
    if (rule === "most_gold_at_timer" && !publicText.includes("gold")) localWarnings.push("legacy goldRace.publicText does not mention gold");
    if (rule === "population_happiness_safety_century_cull" && !publicText.includes("population")) {
      localWarnings.push("survival compatibility goldRace.publicText does not mention population");
    }
  }
  validateDiplomacy(localFailures, diplomacy);
  validateVisibleSummary(localWarnings, visibleSummary);
  if (Array.isArray(snapshot.latestAiDecisions)) validateLatestDecisions(localWarnings, localContractWarnings, snapshot.latestAiDecisions);
  if (Array.isArray(snapshot.recentEvents)) validateRecentEvents(localContractWarnings, snapshot.recentEvents);

  return finishReplay(
    context,
    { category, provider, model, severity, fixtureKind, triageStatus: triageRecord?.status ?? "unresolved" },
    wrapperReport,
    snapshot,
    localFailures,
    localWarnings,
    localContractWarnings
  );
}

function finishReplay(context, meta, wrapperReport, snapshot, localFailures, localWarnings, localContractWarnings) {
  for (const failure of localFailures) failures.push(`${context.file}: ${failure}`);
  for (const warning of localContractWarnings) contractWarnings.push(`${context.file}: ${warning}`);
  for (const warning of localWarnings) warnings.push(`${context.file}: ${warning}`);
  return {
    id: context.id,
    file: context.file,
    tick: numberValue(snapshot.tick ?? wrapperReport.tick),
    tribe: stringValue(wrapperReport.tribe || snapshot.tribe?.name || snapshot.report?.tribeName || "unknown"),
    tribeId: stringValue(wrapperReport.tribeId || snapshot.report?.tribeId || ""),
    category: meta.category ?? "unknown",
    provider: meta.provider ?? "unknown",
    model: meta.model ?? "unknown",
    severity: meta.severity ?? "unknown",
    triageStatus: meta.triageStatus ?? "unresolved",
    fixtureKind: meta.fixtureKind ?? "minimal",
    failures: localFailures.length,
    contractWarnings: localContractWarnings.length,
    warnings: localWarnings.length
  };
}

function validateSource(localFailures, category, source) {
  if (category === "llm_transport" && !source.kind.includes("llm_transport")) localFailures.push(`llm_transport report has source kind ${source.kind}`);
  if (category === "llm_parser" && !source.kind.includes("llm_parser")) localFailures.push(`llm_parser report has source kind ${source.kind}`);
  if (category === "self_report" && !["report_bug_order", "live_integrity_canary"].includes(source.kind)) {
    localFailures.push(`self_report has source kind ${source.kind}`);
  }
}

function isMinimalEndpointSmoke(wrapperReport, snapshot) {
  return (
    stringValue(wrapperReport.provider) === "smoke" &&
    stringValue(wrapperReport.model) === "playwright" &&
    parseSource(wrapperReport.source).kind === "smoke_endpoint" &&
    Object.keys(objectOrEmpty(snapshot.counts)).length === 0 &&
    Object.keys(objectOrEmpty(snapshot.diplomacy)).length === 0
  );
}

function validateGoldRace(localFailures, goldRace, rawContext) {
  if (Object.keys(goldRace).length === 0) {
    localFailures.push("turnContext has goldRace but snapshot.goldRace is missing");
    return;
  }
  const parsed = parseRace(rawContext);
  if (parsed.status && goldRace.status) compareField(localFailures, "goldRace status", stringValue(goldRace.status), parsed.status);
  if (parsed.leaderGold !== undefined && goldRace.leaderGold !== undefined) compareNumber(localFailures, "goldRace leaderGold", numberValue(goldRace.leaderGold), parsed.leaderGold);
  if (parsed.target !== undefined && goldRace.goldTarget !== undefined) compareNumber(localFailures, "goldRace goldTarget", numberValue(goldRace.goldTarget), parsed.target);
}

function validateSurvivalMandate(localFailures, survival, rawContext) {
  if (Object.keys(survival).length === 0) {
    localFailures.push("turnContext has survival but snapshot.survivalMandate is missing");
    return;
  }
  const parsed = parseSurvivalContext(rawContext);
  if (parsed.status && survival.status) compareField(localFailures, "survival status", stringValue(survival.status), parsed.status);
  if (parsed.year !== undefined && survival.currentYear !== undefined) compareNumber(localFailures, "survival currentYear", numberValue(survival.currentYear), parsed.year);
  if (parsed.review !== undefined && survival.nextReviewYear !== undefined) compareNumber(localFailures, "survival nextReviewYear", numberValue(survival.nextReviewYear), parsed.review);
  if (parsed.survivors !== undefined && survival.survivingTribes !== undefined) compareNumber(localFailures, "survival survivingTribes", numberValue(survival.survivingTribes), parsed.survivors);
}

function validateDiplomacy(localFailures, diplomacy) {
  if (Object.keys(diplomacy).length === 0) return;
  if (diplomacy.alliance !== null && diplomacy.alliance !== undefined && typeof diplomacy.alliance !== "string") localFailures.push("diplomacy.alliance must be string or null");
  if (diplomacy.wars !== undefined && !Array.isArray(diplomacy.wars)) localFailures.push("diplomacy.wars must be an array");
  if (!Array.isArray(diplomacy.packets)) return;
  for (const packet of diplomacy.packets) {
    if (!packet || typeof packet !== "object") {
      localFailures.push("diplomacy packet must be an object");
      continue;
    }
    if (!validPacketStates.has(packet.state)) localFailures.push(`diplomacy packet ${packet.id ?? "unknown"} has invalid state ${packet.state}`);
    if (!Number.isFinite(numberValue(packet.messageCount))) localFailures.push(`diplomacy packet ${packet.id ?? "unknown"} has invalid messageCount`);
  }
}

function validateVisibleSummary(localWarnings, visibleSummary) {
  if (Object.keys(visibleSummary).length === 0) return;
  if (!Array.isArray(visibleSummary.contestedResourceSites)) return;
  for (const site of visibleSummary.contestedResourceSites) {
    if (!site || typeof site !== "object") {
      localWarnings.push("contested resource site is not an object");
      continue;
    }
    if (!site.type || !Number.isFinite(numberValue(site.x)) || !Number.isFinite(numberValue(site.y))) localWarnings.push("contested resource site is missing type or coordinates");
  }
}

function validateDevelopments(localFailures, localWarnings, localContractWarnings, tribe, rawContext) {
  if (rawContext === undefined) return;
  const developments = Array.isArray(tribe.developments) ? tribe.developments : [];
  const expected = parseDevelopmentContext(rawContext);
  if (expected.length === 0) {
    if (developments.length > 0) localWarnings.push("turnContext has no developments but snapshot tribe.developments is non-empty");
    return;
  }
  if (!Array.isArray(tribe.developments)) {
    localContractWarnings.push("turnContext has developments but snapshot tribe.developments is missing");
    return;
  }
  const ids = new Set(
    developments
      .map((development) => objectOrEmpty(development).id)
      .filter((id) => typeof id === "string")
  );
  for (const id of expected) {
    if (!ids.has(id)) localFailures.push(`development ${id} appears in turnContext but is missing from snapshot tribe.developments`);
  }
}

function parseDevelopmentContext(value) {
  if (typeof value !== "string" || value === "none") return [];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function validateLatestDecisions(localWarnings, localContractWarnings, decisions) {
  for (const decision of decisions) {
    if (!decision || typeof decision !== "object") {
      localContractWarnings.push("latestAiDecisions contains a non-object entry");
      continue;
    }
    if (!decision.provider || !decision.model || decision.summary === undefined || decision.summary === null) {
      localContractWarnings.push(`latest decision ${decision.id ?? "unknown"} is missing provider/model/summary`);
    } else if (String(decision.summary).trim() === "") {
      localWarnings.push(`latest decision ${decision.id ?? "unknown"} has an empty legacy summary`);
    }
  }
}

function validateRecentEvents(localWarnings, events) {
  for (const event of events) {
    if (!event || typeof event !== "object") {
      localWarnings.push("recentEvents contains a non-object entry");
      continue;
    }
    if (!event.type || !event.title) localWarnings.push(`recent event at tick ${event.tick ?? "unknown"} is missing type/title`);
  }
}

function parseReports(markdown) {
  return markdown
    .split(/\n(?=## )/g)
    .filter((section) => section.startsWith("## "))
    .map(parseReportSection)
    .filter(Boolean);
}

function parseReportSection(section) {
  const lines = section.split("\n");
  const heading = lines[0].replace(/^##\s+/, "").trim();
  const match = heading.match(/^(.*?) - Turn (.*?) - (.*)$/);
  const fields = new Map();
  for (const line of lines.slice(1)) {
    const field = line.match(/^-\s+([^:]+):\s*(.*)$/);
    if (!field) continue;
    fields.set(field[1].trim().toLowerCase(), field[2].trim());
  }
  const timestamp = match?.[1] ?? heading;
  return {
    id: reportId(timestamp),
    timestamp,
    tick: match?.[2] ?? "unknown",
    tribe: match?.[3] ?? "unknown tribe",
    tribeId: fields.get("tribe id") || fields.get("tribeid") || tribeIdFromTurnContext(fields.get("turn context")),
    severity: fields.get("severity") ?? "low",
    category: fields.get("category") ?? "ai_report",
    provider: fields.get("provider") ?? "unknown provider",
    model: fields.get("model") ?? "unknown model",
    strategy: fields.get("strategy") ?? "",
    source: fields.get("source") ?? "unknown",
    turnContext: fields.get("turn context") ?? "",
    snapshot: fields.get("snapshot") ?? "",
    report: fields.get("report") ?? ""
  };
}

function tribeIdFromTurnContext(turnContext) {
  return String(turnContext ?? "").match(/(?:^|[;\s])tribeId=([^;\s]+)/i)?.[1];
}

async function readTriage(path) {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const records = {};
    for (const [id, record] of Object.entries(parsed)) {
      if (!record || typeof record !== "object" || Array.isArray(record)) continue;
      records[id] = { status: stringValue(record.status || "unresolved") };
    }
    return records;
  } catch {
    return {};
  }
}

function parseTurnContext(value) {
  const result = {};
  if (typeof value !== "string") return result;
  for (const part of value.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (key) result[key] = raw;
  }
  return result;
}

function parseSource(value) {
  return parseTurnContext(value);
}

function parseResourceContext(value) {
  const result = {};
  if (typeof value !== "string" || value === "none") return result;
  for (const part of value.split(",")) {
    const [key, rawAmount] = part.split("=");
    const amount = Number(rawAmount);
    if (key?.trim() && Number.isFinite(amount)) result[key.trim()] = amount;
  }
  return result;
}

function parseRace(value) {
  if (typeof value !== "string") return {};
  const parts = value.split(":");
  const amountPart = parts.at(-1) ?? "";
  const [leaderGoldRaw, targetRaw] = amountPart.split("/");
  return {
    status: parts[0],
    leaderGold: Number.isFinite(Number(leaderGoldRaw)) ? Number(leaderGoldRaw) : undefined,
    target: Number.isFinite(Number(targetRaw)) ? Number(targetRaw) : undefined
  };
}

function parseSurvivalContext(value) {
  if (typeof value !== "string") return {};
  const parts = value.split(":");
  const numberAfter = (prefix) => {
    const part = parts.find((item) => item.startsWith(prefix));
    if (!part) return undefined;
    const parsed = Number(part.slice(prefix.length));
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    status: parts[0],
    year: numberAfter("year"),
    review: numberAfter("review"),
    survivors: numberAfter("survivors")
  };
}

function compareField(localFailures, label, actual, expected) {
  if (stringValue(actual) !== stringValue(expected)) localFailures.push(`${label} mismatch: ${stringValue(actual)} != ${stringValue(expected)}`);
}

function compareNumber(localFailures, label, actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    localFailures.push(`${label} is not numeric: ${actual} / ${expected}`);
    return;
  }
  if (Math.round(actual) !== Math.round(expected)) localFailures.push(`${label} mismatch: ${actual} != ${expected}`);
}

function snapshotIdFromUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const parsed = new URL(value, "http://localhost");
    return reportId(parsed.searchParams.get("id") ?? "");
  } catch {
    return "";
  }
}

function reportId(timestamp) {
  return String(timestamp).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 120);
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value).replace(/\s+/g, " ").trim();
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function sampleReplays(items) {
  const seen = new Set();
  const samples = [];
  for (const item of items) {
    const key = `${item.category}|${item.fixtureKind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    samples.push(item);
  }
  return samples.slice(0, 10);
}

function formatReplayMarkdown(report) {
  const failures = report.failures.length > 0 ? report.failures.map((item) => `- ${item}`).join("\n") : "- none";
  const contractWarnings =
    report.contractWarnings.length > 0 ? report.contractWarnings.slice(0, 30).map((item) => `- ${item}`).join("\n") : "- none";
  const warnings = report.warnings.length > 0 ? report.warnings.slice(0, 30).map((item) => `- ${item}`).join("\n") : "- none";
  const samples = report.samples
    .map(
      (item) =>
        `- ${item.file}: ${item.category}/${item.fixtureKind}, ${item.provider}/${item.model}, failures=${item.failures}, contractWarnings=${item.contractWarnings}, warnings=${item.warnings}`
    )
    .join("\n");
  return [
    "# AI Snapshot Replay Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    `Reports: ${report.totalReports}`,
    `Report snapshot links: ${report.reportSnapshots}`,
    `Snapshot files: ${report.snapshots}`,
    `Replayed fixtures: ${report.replayed}`,
    "",
    `Fixture kinds: ${JSON.stringify(report.fixtureKinds)}`,
    `Categories: ${JSON.stringify(report.categories)}`,
    `Triage status: ${JSON.stringify(report.triageStatus)}`,
    "",
    "## Failures",
    failures,
    "",
    "## Contract Warnings",
    contractWarnings,
    "",
    "## Warnings",
    warnings,
    "",
    "## Samples",
    samples || "- none",
    ""
  ].join("\n");
}

function stringArg(name, fallback) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
