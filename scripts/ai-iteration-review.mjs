import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const reportPath = resolve(root, "AI_BUG_REPORTS.md");
const triagePath = resolve(root, "AI_BUG_TRIAGE.json");
const bucketTriagePath = stringArg("--bucket-triage-path", resolve(root, "AI_BUG_BUCKET_TRIAGE.json"));
const outputPath = resolve(root, "AI_ITERATION_REVIEW.md");

const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");
const strict = args.has("--strict");
const noWrite = args.has("--no-write");
const listBuckets = args.has("--list-buckets");
const includeSynthetic = args.has("--include-synthetic");
const reopenProoflessFixed = args.has("--reopen-proofless-fixed");
const reopenStatus = triageStatusArg("--reopen-status", "triaged");
const triageLegacyAiBuckets = args.has("--triage-legacy-ai-buckets");
const bucketKeyToUpdate = stringArg("--bucket-key", stringArg("--fix-bucket", ""));
const bucketStatusToUpdate = triageStatusArg("--set-bucket-status", triageStatusArg("--fix-bucket-status", "fixed"));
const bucketNote = stringArg("--bucket-note", stringArg("--fix-bucket-note", ""));
const bucketProofSummary = stringArg("--bucket-proof-summary", "Bucket status verified by AI iteration review.");
const bucketProofEvidence = stringArg("--bucket-proof-evidence", stringArg("--fix-bucket-evidence", ""));
const bucketFixedBy = fixedByArg("--bucket-fixed-by", "review_script");
const bucketCoveredThrough = stringArg("--bucket-covered-through", "latest");
const maxHigh = numberArg("--max-unresolved-high", 0);
const maxMedium = numberArg("--max-unresolved-medium", 3);
const maxParserTransport = numberArg("--max-unresolved-parser-transport", 4);

const severityWeight = { high: 100, medium: 40, low: 10 };
const categoryWeight = {
  llm_transport: 25,
  llm_parser: 25,
  llm_error: 18,
  validation: 18,
  state_race: 18,
  self_report: 15,
  ai_report: 12,
  blocked_order: 3
};

const reports = existsSync(reportPath) ? parseReports(await readFile(reportPath, "utf8")) : [];
const triage = await readTriage();
const bucketTriage = await readBucketTriage();
const reopenedProoflessFixed = reopenProoflessFixed ? await reopenProoflessFixedRecords(triage, reopenStatus, noWrite) : 0;
const legacyBucketsTriaged = triageLegacyAiBuckets ? await triageLegacyAiReportBuckets(reports, triage, noWrite) : 0;
const bucketFixesApplied = bucketKeyToUpdate
  ? await updateBucketTriageRecord(reports, bucketTriage, {
      key: bucketKeyToUpdate,
      status: bucketStatusToUpdate,
      note: bucketNote,
      proofSummary: bucketProofSummary,
      proofEvidence: bucketProofEvidence,
      fixedBy: bucketFixedBy,
      coveredThrough: bucketCoveredThrough,
      dryRun: noWrite
    })
  : 0;
const merged = reports.map((entry) => ({
  ...entry,
  ...mergeTriage(entry, triage[entry.id], bucketTriage[bucketKey(entry)])
}));
const unresolved = merged.filter((entry) => entry.triageStatus === "unresolved" && !entry.bucketCovered);
const synthetic = unresolved.filter(isSyntheticReport);
const actionableUnresolved = includeSynthetic ? unresolved : unresolved.filter((entry) => !isSyntheticReport(entry));
const ranked = rankBuckets(actionableUnresolved);
const counts = countBy(merged, (entry) => entry.triageStatus);
const unresolvedSeverity = countBy(actionableUnresolved, (entry) => normalizeSeverity(entry.severity));
const unresolvedBucketSeverity = countBy(ranked, bucketSeverity);
const parserTransportOpen = actionableUnresolved.filter((entry) => entry.category === "llm_parser" || entry.category === "llm_transport").length;
const parserTransportOpenBuckets = ranked.filter((entry) => entry.category === "llm_parser" || entry.category === "llm_transport").length;
const fixedMissingProof = merged.filter((entry) => entry.triageStatus === "fixed" && !hasProof(entry.triageProof)).length;
const fixedWithProof = merged.filter((entry) => entry.triageStatus === "fixed" && hasProof(entry.triageProof)).length;
const bucketCoveredReports = merged.filter((entry) => entry.bucketCovered).length;
const bucketCoveredBuckets = new Set(merged.filter((entry) => entry.bucketCovered).map((entry) => entry.bucketKey)).size;
const bucketFixedWithProof = Object.values(bucketTriage).filter((record) => record.status === "fixed" && hasProof(record.proof)).length;
const bucketRecords = rankBuckets(merged).map((bucket) => {
  const record = bucketTriage[bucket.key];
  return {
    ...bucket,
    bucketStatus: record?.status ?? "unresolved",
    bucketNote: record?.note ?? "",
    bucketProof: record?.proof,
    bucketUpdatedAt: record?.updatedAt ?? "",
    coveredThrough: record?.coveredThrough
  };
});
const gateFailures = [
  (unresolvedBucketSeverity.high ?? 0) > maxHigh ? `${unresolvedBucketSeverity.high} unresolved high-severity buckets exceeds ${maxHigh}` : "",
  (unresolvedBucketSeverity.medium ?? 0) > maxMedium ? `${unresolvedBucketSeverity.medium} unresolved medium-severity buckets exceeds ${maxMedium}` : "",
  parserTransportOpenBuckets > maxParserTransport
    ? `${parserTransportOpenBuckets} unresolved parser/transport buckets exceeds ${maxParserTransport}`
    : "",
  fixedMissingProof > 0 ? `${fixedMissingProof} fixed reports are missing proof` : ""
].filter(Boolean);

const review = {
  ok: gateFailures.length === 0,
  generatedAt: new Date().toISOString(),
  reportPath,
  triagePath,
  bucketTriagePath,
  totalReports: merged.length,
  reopenedProoflessFixed,
  legacyBucketsTriaged,
  bucketFixesApplied,
  bucketCoveredReports,
  bucketCoveredBuckets,
  bucketFixedWithProof,
  actionableUnresolved: actionableUnresolved.length,
  actionableBuckets: ranked.length,
  excludedSyntheticUnresolved: includeSynthetic ? 0 : synthetic.length,
  triageCounts: {
    unresolved: counts.unresolved ?? 0,
    triaged: counts.triaged ?? 0,
    fixed: counts.fixed ?? 0,
    ignored: counts.ignored ?? 0
  },
  unresolvedSeverity: {
    high: unresolvedSeverity.high ?? 0,
    medium: unresolvedSeverity.medium ?? 0,
    low: unresolvedSeverity.low ?? 0
  },
  unresolvedBucketSeverity: {
    high: unresolvedBucketSeverity.high ?? 0,
    medium: unresolvedBucketSeverity.medium ?? 0,
    low: unresolvedBucketSeverity.low ?? 0
  },
  parserTransportOpen,
  parserTransportOpenBuckets,
  fixedMissingProof,
  fixedWithProof,
  gate: {
    strict,
    includeSynthetic,
    maxHigh,
    maxMedium,
    maxParserTransport,
    failures: gateFailures
  },
  rankedBacklog: ranked.slice(0, 12),
  bucketRecords: listBuckets ? bucketRecords : undefined,
  nextActions: nextActions(ranked)
};

const markdown = formatReviewMarkdown(review);
if (!noWrite) await writeFile(outputPath, markdown, "utf8");

if (jsonOutput) {
  console.log(JSON.stringify({ ...review, outputPath: noWrite ? undefined : outputPath }, null, 2));
} else {
  console.log(markdown);
}

if (strict && gateFailures.length > 0) {
  process.exitCode = 1;
}

function numberArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) return fallback;
  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function triageStatusArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) return fallback;
  return normalizeTriageStatus(value.slice(prefix.length), fallback);
}

function fixedByArg(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) return fallback;
  const parsed = value.slice(prefix.length);
  return ["observer_ui", "smoke", "review_script", "manual"].includes(parsed) ? parsed : fallback;
}

async function reopenProoflessFixedRecords(records, status, dryRun) {
  const timestamp = new Date().toISOString();
  let count = 0;
  for (const [id, record] of Object.entries(records)) {
    if (!record || record.status !== "fixed" || hasProof(record.proof)) continue;
    count += 1;
    if (dryRun) continue;
    record.status = status;
    record.note = [
      `Reopened by ai-iteration-review at ${timestamp} because fixed status had no proof.`,
      record.note ? `Previous note: ${record.note}` : ""
    ]
      .filter(Boolean)
      .join(" ");
    record.proof = undefined;
    record.updatedAt = timestamp;
  }
  if (count > 0 && !dryRun) await writeTriage(records);
  return count;
}

async function triageLegacyAiReportBuckets(reportEntries, records, dryRun) {
  const timestamp = new Date().toISOString();
  const rules = new Map([
    [
      "llm_error|fallback|gemma4:latest failed|unknown",
      {
        status: "triaged",
        note:
          "Legacy pre-source/snapshot LLM error bucket. Current reports classify transport/parser failures with source kinds and snapshots; current cooldown suppresses repeated transport reports."
      }
    ],
    [
      "ai_report|ollama|gemma4:latest|unknown",
      {
        status: "triaged",
        note:
          "Legacy mixed AI-report bucket. Current prompt discourages ordinary blocked-order bug reports, stale replies are handled as state races, and current reports include source/context/snapshots."
      }
    ],
    [
      "llm_error|fallback|gemma4:latest failed|strategy_llm_error",
      {
        status: "triaged",
        note:
          "Legacy strategy runtime-error bucket. Current typecheck covers the old missing-symbol failure; current transport/parser failures remain in dedicated unresolved buckets."
      }
    ],
    [
      "llm_error|fallback|gemma4:latest failed|reply_llm_error",
      {
        status: "triaged",
        note:
          "Legacy reply runtime-error bucket. Current reply transport failures are classified separately and remain unresolved when current-format reports exist."
      }
    ],
    [
      "ai_report|fallback|gemma4:latest failed|unknown",
      {
        status: "ignored",
        note:
          "Legacy ordinary blocked-gameplay report. Population caps and similar resource constraints are valid game feedback, not AI iteration bugs."
      }
    ]
  ]);
  let count = 0;
  for (const entry of reportEntries) {
    const rule = rules.get(bucketKey(entry));
    if (!rule) continue;
    const currentStatus = records[entry.id]?.status ?? "unresolved";
    if (currentStatus !== "unresolved") continue;
    count += 1;
    if (dryRun) continue;
    records[entry.id] = {
      status: rule.status,
      note: `${rule.note} Triaged by ai-iteration-review at ${timestamp}.`,
      proof: undefined,
      updatedAt: timestamp
    };
  }
  if (count > 0 && !dryRun) await writeTriage(records);
  return count;
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
  const timestamp = match?.[1] ?? heading;
  const fields = new Map();
  for (const line of lines.slice(1)) {
    const field = line.match(/^-\s+([^:]+):\s*(.*)$/);
    if (!field) continue;
    fields.set(field[1].trim().toLowerCase(), field[2].trim());
  }
  const report = fields.get("report") ?? "";
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
    report,
    structuredReport: parseStructuredReportFields(report)
  };
}

function parseStructuredReportFields(report) {
  const result = {};
  const segments = String(report ?? "")
    .split(/\s+\|\s+/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const match = segment.match(/^([^:]{2,40}):\s*(.*)$/);
    if (!match) {
      if (!result.summary) result.summary = cleanText(segment);
      continue;
    }
    const label = match[1].trim().toLowerCase();
    const value = cleanText(match[2]);
    if (!value) continue;
    if (label === "suspected area") result.suspectedArea = value;
    else if (label === "expected") result.expectedBehavior = value;
    else if (label === "actual") result.actualBehavior = value;
    else if (label === "repro") result.reproductionSteps = value;
    else if (label === "strategy impact") result.strategyImpact = value;
    else if (label === "self-rated severity") result.selfRatedSeverity = value;
    else if (!result.summary) result.summary = cleanText(segment);
  }
  const hasStructuredFields = ["suspectedArea", "expectedBehavior", "actualBehavior", "reproductionSteps", "strategyImpact", "selfRatedSeverity"].some(
    (key) => result[key]
  );
  return hasStructuredFields ? result : undefined;
}

function tribeIdFromTurnContext(turnContext) {
  return String(turnContext ?? "").match(/(?:^|[;\s])tribeId=([^;\s]+)/i)?.[1];
}

async function readTriage() {
  if (!existsSync(triagePath)) return {};
  try {
    const parsed = JSON.parse(await readFile(triagePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const records = {};
    for (const [id, raw] of Object.entries(parsed)) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      records[id] = {
        status: normalizeTriageStatus(raw.status),
        note: cleanText(raw.note ?? ""),
        proof: normalizeProof(raw.proof, cleanText(raw.updatedAt ?? "")),
        updatedAt: cleanText(raw.updatedAt ?? "")
      };
    }
    return records;
  } catch {
    return {};
  }
}

async function writeTriage(records) {
  await writeFile(triagePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

async function readBucketTriage() {
  if (!existsSync(bucketTriagePath)) return {};
  try {
    const parsed = JSON.parse(await readFile(bucketTriagePath, "utf8"));
    const rawBuckets =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.buckets && typeof parsed.buckets === "object"
        ? parsed.buckets
        : parsed;
    if (!rawBuckets || typeof rawBuckets !== "object" || Array.isArray(rawBuckets)) return {};
    const records = {};
    for (const [key, raw] of Object.entries(rawBuckets)) {
      const record = normalizeBucketRecord(raw);
      if (record) records[key] = record;
    }
    return records;
  } catch {
    return {};
  }
}

async function writeBucketTriage(records) {
  await writeFile(
    bucketTriagePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        buckets: Object.fromEntries(Object.entries(records).sort(([left], [right]) => left.localeCompare(right)))
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function normalizeBucketRecord(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const coveredThrough =
    raw.coveredThrough && typeof raw.coveredThrough === "object" && !Array.isArray(raw.coveredThrough)
      ? {
          reportId: cleanText(raw.coveredThrough.reportId ?? ""),
          timestamp: cleanText(raw.coveredThrough.timestamp ?? raw.coversReportsThrough ?? ""),
          tick: cleanText(raw.coveredThrough.tick ?? raw.coversLatestTick ?? "unknown")
        }
      : {
          reportId: cleanText(raw.reportId ?? ""),
          timestamp: cleanText(raw.coversReportsThrough ?? ""),
          tick: cleanText(raw.coversLatestTick ?? "unknown")
        };
  return {
    status: normalizeTriageStatus(raw.status),
    note: cleanText(raw.note ?? ""),
    proof: normalizeProof(raw.proof, cleanText(raw.updatedAt ?? "")),
    coveredThrough,
    updatedAt: cleanText(raw.updatedAt ?? "")
  };
}

function mergeTriage(entry, record, bucketRecord) {
  const key = bucketKey(entry);
  const bucketCovered = isEntryCoveredByBucket(entry, bucketRecord);
  const bucketStatus = bucketCovered ? bucketRecord.status : "unresolved";
  const status = record?.status ?? bucketStatus;
  const proof = record?.proof ?? (bucketCovered ? bucketRecord.proof : undefined);
  return {
    triageStatus: status,
    triageNote: record?.note ?? "",
    triageProof: proof,
    triageUpdatedAt: record?.updatedAt ?? "",
    bucketKey: key,
    bucketStatus,
    bucketNote: bucketCovered ? bucketRecord.note : "",
    bucketProof: bucketCovered ? bucketRecord.proof : undefined,
    bucketUpdatedAt: bucketCovered ? bucketRecord.updatedAt : "",
    bucketCovered,
    bucketCoversReportsThrough: bucketCovered ? bucketRecord.coveredThrough?.timestamp ?? "" : "",
    bucketCoversLatestTick: bucketCovered ? bucketRecord.coveredThrough?.tick ?? "unknown" : "unknown"
  };
}

async function updateBucketTriageRecord(reportEntries, records, options) {
  const matching = reportEntries.filter((entry) => bucketKey(entry) === options.key).sort(compareReportNewest);
  if (matching.length === 0) throw new Error(`No reports match bucket key: ${options.key}`);
  const coveredReport = resolveCoveredReport(matching, options.coveredThrough);
  if (!coveredReport) throw new Error(`No report found for bucket coverage target: ${options.coveredThrough}`);
  if (options.status === "fixed" && options.proofEvidence.trim().length < 12) {
    throw new Error("Fixed bucket status requires proof evidence of at least 12 characters.");
  }
  const timestamp = new Date().toISOString();
  if (!options.dryRun) {
    records[options.key] = {
      status: options.status,
      note:
        options.note ||
        `${options.status === "fixed" ? "Fixed" : "Marked"} bucket through report ${coveredReport.id} by ai-iteration-review at ${timestamp}.`,
      proof:
        options.status === "fixed"
          ? {
              summary: cleanText(options.proofSummary),
              evidence: cleanText(options.proofEvidence),
              fixedBy: options.fixedBy,
              verifiedAt: timestamp
            }
          : undefined,
      coveredThrough: {
        reportId: coveredReport.id,
        timestamp: coveredReport.timestamp,
        tick: coveredReport.tick
      },
      updatedAt: timestamp
    };
    await writeBucketTriage(records);
  }
  return matching.filter((entry) => compareReportCursor(entry, coveredReport) <= 0).length;
}

function resolveCoveredReport(matchingNewestFirst, target) {
  if (!target || target === "latest") return matchingNewestFirst[0];
  return matchingNewestFirst.find((entry) => entry.id === target || entry.timestamp === target);
}

function isEntryCoveredByBucket(entry, record) {
  if (!record || !isCoveredStatus(record.status)) return false;
  if (record.status === "fixed" && !hasProof(record.proof)) return false;
  if (!record.coveredThrough?.timestamp && !record.coveredThrough?.reportId) return false;
  if (record.coveredThrough.reportId && entry.id === record.coveredThrough.reportId) return true;
  return compareReportCursor(entry, record.coveredThrough) <= 0;
}

function isCoveredStatus(status) {
  return status === "fixed" || status === "triaged" || status === "ignored";
}

function rankBuckets(entries) {
  const buckets = new Map();
  for (const entry of entries) {
    const key = bucketKey(entry);
    const bucket = buckets.get(key) ?? {
      key,
      category: entry.category,
      provider: entry.provider,
      model: entry.model,
      sourceKind: sourceKind(entry.source),
      count: 0,
      severityCounts: { high: 0, medium: 0, low: 0 },
      latestTick: "unknown",
      latestTimestamp: "",
      latestTribe: "",
      latestReport: "",
      latestStructured: undefined,
      sampleSnapshot: "",
      score: 0
    };
    const severity = normalizeSeverity(entry.severity);
    bucket.count += 1;
    bucket.severityCounts[severity] += 1;
    bucket.score += (severityWeight[severity] ?? severityWeight.low) + (categoryWeight[entry.category] ?? 8);
    if (isNewer(entry, bucket.latestTimestamp, bucket.latestTick)) {
      bucket.latestTick = entry.tick;
      bucket.latestTimestamp = entry.timestamp;
      bucket.latestTribe = entry.tribe;
      bucket.latestReport = entry.report;
      bucket.latestStructured = entry.structuredReport;
      bucket.sampleSnapshot = entry.snapshot;
    }
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).sort(
    (left, right) =>
      right.score - left.score ||
      right.count - left.count ||
      Number(right.latestTick) - Number(left.latestTick) ||
      left.key.localeCompare(right.key)
  );
}

function compareReportNewest(left, right) {
  return -compareReportCursor(left, right);
}

function compareReportCursor(left, right) {
  const leftTime = Date.parse(left.timestamp ?? "");
  const rightTime = Date.parse(right.timestamp ?? "");
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
  const leftTick = Number(left.tick);
  const rightTick = Number(right.tick);
  if (Number.isFinite(leftTick) && Number.isFinite(rightTick) && leftTick !== rightTick) return leftTick - rightTick;
  return String(left.id ?? "").localeCompare(String(right.id ?? ""));
}

function bucketKey(entry) {
  return [entry.category, entry.provider, entry.model, sourceKind(entry.source)].join("|");
}

function bucketSeverity(bucket) {
  if ((bucket.severityCounts.high ?? 0) > 0) return "high";
  if ((bucket.severityCounts.medium ?? 0) > 0) return "medium";
  return "low";
}

function sourceKind(source) {
  const match = source.match(/kind=([^;]+)/);
  return match?.[1] ?? "unknown";
}

function nextActions(buckets) {
  if (buckets.length === 0) return ["No unresolved AI reports. Keep running smoke and live games until new reports appear."];
  return buckets.slice(0, 5).map((bucket, index) => {
    const subject =
      bucket.category === "llm_transport"
        ? "Stabilize local-model transport or fallback reporting"
        : bucket.category === "llm_parser"
          ? "Harden structured-output parsing and recovery"
          : bucket.category === "self_report"
            ? "Address AI-authored blocked gameplay report"
            : bucket.category === "validation"
              ? "Fix rejected-order validation or prompt guidance"
              : "Review and reproduce unresolved AI report bucket";
    return `${index + 1}. ${subject}: ${bucket.count} open ${bucket.category} report(s) for ${bucket.model}; latest turn ${bucket.latestTick} from ${bucket.latestTribe}.`;
  });
}

function formatReviewMarkdown(review) {
  const gateLine = review.ok ? "PASS" : "FAIL";
  const backlog =
    review.rankedBacklog
      .map(
        (bucket, index) =>
          `${index + 1}. ${bucket.category} / ${bucket.model} / ${bucket.sourceKind} - ${bucket.count} open, score ${bucket.score}, latest turn ${bucket.latestTick} (${bucket.latestTribe})\n` +
          `   - Severity: high ${bucket.severityCounts.high}, medium ${bucket.severityCounts.medium}, low ${bucket.severityCounts.low}\n` +
          `   - Latest: ${cleanText(bucket.latestReport || "No report text.")}${formatStructuredReportMarkdown(bucket.latestStructured)}${bucket.sampleSnapshot ? `\n   - Snapshot: ${bucket.sampleSnapshot}` : ""}`
      )
      .join("\n") || "No unresolved AI reports.";
  const actions = review.nextActions.map((action) => `- ${action}`).join("\n");
  const failures = review.gate.failures.map((failure) => `- ${failure}`).join("\n") || "- none";
  return [
    "# AI Iteration Review",
    "",
    `Generated: ${review.generatedAt}`,
    "",
    `Gate: ${gateLine}`,
    "",
    "## Counts",
    "",
    `- Total reports: ${review.totalReports}`,
    `- Reopened proofless fixed reports this run: ${review.reopenedProoflessFixed}`,
    `- Legacy AI bucket reports triaged this run: ${review.legacyBucketsTriaged}`,
    `- Bucket triage records updated this run: ${review.bucketFixesApplied}`,
    `- Bucket-covered reports: ${review.bucketCoveredReports}`,
    `- Bucket-covered buckets: ${review.bucketCoveredBuckets}`,
    `- Bucket fixed records with proof: ${review.bucketFixedWithProof}`,
    `- Unresolved: ${review.triageCounts.unresolved}`,
    `- Actionable unresolved reports: ${review.actionableUnresolved}`,
    `- Actionable unresolved buckets: ${review.actionableBuckets}`,
    `- Excluded synthetic unresolved: ${review.excludedSyntheticUnresolved}`,
    `- Triaged: ${review.triageCounts.triaged}`,
    `- Fixed: ${review.triageCounts.fixed}`,
    `- Ignored: ${review.triageCounts.ignored}`,
    `- Unresolved report severity: high ${review.unresolvedSeverity.high}, medium ${review.unresolvedSeverity.medium}, low ${review.unresolvedSeverity.low}`,
    `- Unresolved bucket severity: high ${review.unresolvedBucketSeverity.high}, medium ${review.unresolvedBucketSeverity.medium}, low ${review.unresolvedBucketSeverity.low}`,
    `- Unresolved parser/transport reports: ${review.parserTransportOpen}`,
    `- Unresolved parser/transport buckets: ${review.parserTransportOpenBuckets}`,
    `- Fixed reports with proof: ${review.fixedWithProof}`,
    `- Fixed reports missing proof: ${review.fixedMissingProof}`,
    "",
    "## Gate Failures",
    "",
    failures,
    "",
    "## Ranked Backlog",
    "",
    backlog,
    "",
    "## Next Actions",
    "",
    actions,
    ""
  ].join("\n");
}

function formatStructuredReportMarkdown(structured) {
  if (!structured) return "";
  const lines = [
    structured.suspectedArea ? `   - Suspected area: ${structured.suspectedArea}` : "",
    structured.expectedBehavior ? `   - Expected: ${structured.expectedBehavior}` : "",
    structured.actualBehavior ? `   - Actual: ${structured.actualBehavior}` : "",
    structured.reproductionSteps ? `   - Repro: ${structured.reproductionSteps}` : "",
    structured.strategyImpact ? `   - Strategy impact: ${structured.strategyImpact}` : "",
    structured.selfRatedSeverity ? `   - Self-rated severity: ${structured.selfRatedSeverity}` : ""
  ].filter(Boolean);
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

function isNewer(entry, latestTimestamp, latestTick) {
  if (!latestTimestamp && latestTick === "unknown") return true;
  const time = Date.parse(entry.timestamp);
  const latestTime = Date.parse(latestTimestamp);
  if (Number.isFinite(time) && Number.isFinite(latestTime) && time !== latestTime) return time > latestTime;
  return Number(entry.tick) > Number(latestTick);
}

function isSyntheticReport(entry) {
  const provider = String(entry.provider ?? "").toLowerCase();
  const model = String(entry.model ?? "").toLowerCase();
  const source = String(entry.source ?? "").toLowerCase();
  return (
    provider === "smoke" ||
    provider === "mock" ||
    model.includes("browser-test-hook") ||
    model.includes("playwright") ||
    model.includes("mock:") ||
    source.includes("kind=smoke_endpoint") ||
    source.includes("kind=live_integrity_canary") ||
    source.includes("provider=smoke") ||
    source.includes("model=playwright") ||
    source.includes("model=browser-test-hook") ||
    source.includes("model=mock:")
  );
}

function countBy(entries, keyFn) {
  const counts = {};
  for (const entry of entries) {
    const key = keyFn(entry) || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function normalizeSeverity(value) {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeTriageStatus(value, fallback = "unresolved") {
  return value === "triaged" || value === "fixed" || value === "ignored" || value === "unresolved" ? value : fallback;
}

function hasProof(value) {
  if (typeof value === "string") return value.trim().length >= 12;
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.summary === "string" &&
    value.summary.trim().length >= 8 &&
    typeof value.evidence === "string" &&
    value.evidence.trim().length >= 12
  );
}

function normalizeProof(value, verifiedAtFallback) {
  if (typeof value === "string") {
    const cleaned = cleanText(value);
    if (cleaned.length < 12) return undefined;
    return { summary: cleaned, evidence: cleaned, fixedBy: "manual", verifiedAt: verifiedAtFallback || new Date().toISOString() };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const summary = cleanText(value.summary ?? "");
  const evidence = cleanText(value.evidence ?? "");
  if (summary.length < 8 || evidence.length < 12) return undefined;
  const fixedBy = ["observer_ui", "smoke", "review_script", "manual"].includes(value.fixedBy) ? value.fixedBy : "manual";
  const fixedAtTurn = typeof value.fixedAtTurn === "number" && Number.isFinite(value.fixedAtTurn) ? Math.max(0, Math.round(value.fixedAtTurn)) : undefined;
  return {
    summary,
    evidence,
    fixedBy,
    ...(fixedAtTurn !== undefined ? { fixedAtTurn } : {}),
    verifiedAt: cleanText(value.verifiedAt ?? verifiedAtFallback ?? new Date().toISOString())
  };
}

function reportId(timestamp) {
  return String(timestamp).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 120);
}

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 320);
}
