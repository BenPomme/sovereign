import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

const bugReportPath = resolve(process.cwd(), "AI_BUG_REPORTS.md");
const bugTriagePath = resolve(process.cwd(), "AI_BUG_TRIAGE.json");
const bugBucketTriagePath = resolve(process.cwd(), "AI_BUG_BUCKET_TRIAGE.json");
const bugSnapshotDir = resolve(process.cwd(), "AI_BUG_SNAPSHOTS");

type BugReportEntry = {
  id: string;
  timestamp: string;
  tick: string;
  tribe: string;
  tribeId?: string;
  severity: string;
  category: string;
  provider: string;
  model: string;
  strategy: string;
  source: string;
  turnContext: string;
  snapshot: string;
  report: string;
  triageStatus?: TriageStatus;
  triageNote?: string;
  triageProof?: FixedTriageProof;
  triageUpdatedAt?: string;
  bucketKey?: string;
  bucketStatus?: TriageStatus;
  bucketNote?: string;
  bucketProof?: FixedTriageProof;
  bucketUpdatedAt?: string;
  bucketCoversReportsThrough?: string;
  bucketCoversLatestTick?: string;
  bucketCovered?: boolean;
  reviewStatus?: TriageStatus;
  synthetic?: boolean;
};
type TriageStatus = "unresolved" | "triaged" | "fixed" | "ignored";
type FixedTriageProof = {
  summary: string;
  evidence: string;
  fixedBy: "observer_ui" | "smoke" | "review_script" | "manual";
  fixedAtTurn?: number;
  verifiedAt: string;
};
type TriageRecord = {
  status: TriageStatus;
  note: string;
  proof?: FixedTriageProof;
  updatedAt: string;
};
type BucketTriageRecord = {
  status: TriageStatus;
  note: string;
  proof?: FixedTriageProof;
  coveredThrough: {
    reportId: string;
    timestamp: string;
    tick: string;
  };
  updatedAt: string;
};
type BugReportBucket = {
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
  latestStatus: TriageStatus;
  latestTick: string;
  latestTimestamp: string;
  latestTribe: string;
  latestReport: string;
  latestSnapshot?: string;
  bucketStatus?: TriageStatus;
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

export default defineConfig({
  root: "apps/client",
  plugins: [aiBugReportPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/ollama": {
        target: "http://localhost:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, "")
      }
    }
  }
});

function aiBugReportPlugin(): Plugin {
  return {
    name: "sovereigns-ai-bug-report",
    configureServer(server) {
      server.middlewares.use("/api/ai-bug-report", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "POST required" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const report = formatBugReport(body);
          await ensureBugReportFile();
          await writeBugSnapshot(report.id, body);
          await appendFile(bugReportPath, report.markdown, "utf8");
          sendJson(res, 200, { ok: true, path: bugReportPath, reportId: report.id, snapshot: report.snapshotUrl, snapshotPath: report.snapshotPath });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          sendJson(res, 400, { ok: false, error: message });
        }
      });
      server.middlewares.use("/api/ai-bug-report-summary", async (req, res) => {
        if (req.method !== "GET") {
          sendJson(res, 405, { ok: false, error: "GET required" });
          return;
        }

        try {
          await ensureBugReportFile();
          const [markdown, fileStat, triage, bucketTriage] = await Promise.all([
            readFile(bugReportPath, "utf8"),
            stat(bugReportPath),
            readTriageRecords(),
            readBucketTriageRecords()
          ]);
          sendJson(res, 200, summarizeBugReports(markdown, fileStat.size, triage, bucketTriage));
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          sendJson(res, 500, { ok: false, error: message });
        }
      });
      server.middlewares.use("/api/ai-bug-report-snapshot", async (req, res) => {
        if (req.method !== "GET") {
          sendJson(res, 405, { ok: false, error: "GET required" });
          return;
        }

        try {
          const parsedUrl = new URL(req.url ?? "", "http://localhost");
          const id = reportId(parsedUrl.searchParams.get("id") ?? "");
          if (!id) throw new Error("Missing snapshot id");
          const snapshotPath = resolve(bugSnapshotDir, `${id}.json`);
          if (dirname(snapshotPath) !== bugSnapshotDir || basename(snapshotPath) !== `${id}.json`) throw new Error("Invalid snapshot id");
          const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as unknown;
          sendJson(res, 200, { ok: true, id, path: snapshotPath, snapshot });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          sendJson(res, 404, { ok: false, error: message });
        }
      });
      server.middlewares.use("/api/ai-bug-report-triage", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "POST required" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const reportId = stringFrom(body.reportId, "").trim();
          const status = parseTriageStatus(body.status);
          const note = cleanMarkdown(stringFrom(body.note, ""));
          const updatedAt = new Date().toISOString();
          const proof = parseFixedTriageProof(body.proof, updatedAt);
          if (!reportId) throw new Error("Missing reportId");
          if (status === "fixed" && !proof) throw new Error("Fixed triage requires proof");
          await ensureBugReportFile();
          const markdown = await readFile(bugReportPath, "utf8");
          const reportIds = new Set(parseBugReportEntries(markdown).map((entry) => entry.id));
          if (!reportIds.has(reportId)) throw new Error("Unknown reportId");
          const records = await readTriageRecords();
          records[reportId] = { status, note, proof: status === "fixed" ? proof : undefined, updatedAt };
          await writeTriageRecords(records);
          sendJson(res, 200, { ok: true, path: bugTriagePath, reportId, status, proof: status === "fixed" ? proof : undefined });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          sendJson(res, 400, { ok: false, error: message });
        }
      });
    }
  };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 64_000) throw new Error("Bug report is too large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new Error("Missing bug report body");
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Bug report body must be an object");
  return parsed as Record<string, unknown>;
}

async function ensureBugReportFile(): Promise<void> {
  if (existsSync(bugReportPath)) return;
  await mkdir(dirname(bugReportPath), { recursive: true });
  await writeFile(
    bugReportPath,
    "# AI Bug Reports\n\nLocal sovereign AIs can append observations here for Codex follow-up.\n\n",
    "utf8"
  );
}

function formatBugReport(body: Record<string, unknown>): { id: string; markdown: string; snapshotPath: string; snapshotUrl: string } {
  const tick = stringFrom(body.tick, "unknown");
  const tribe = cleanMarkdown(stringFrom(body.tribe, "unknown tribe"));
  const tribeId = cleanMarkdown(stringFrom(body.tribeId, ""));
  const model = cleanMarkdown(stringFrom(body.model, "unknown model"));
  const provider = cleanMarkdown(stringFrom(body.provider, "unknown provider"));
  const severity = cleanMarkdown(stringFrom(body.severity, "low"));
  const category = cleanMarkdown(stringFrom(body.category, "ai_report"));
  const summary = cleanMarkdown(stringFrom(body.summary, "No strategy summary supplied."));
  const source = cleanMarkdown(stringFrom(body.source, "unknown"));
  const turnContext = cleanMarkdown(stringFrom(body.turnContext, ""));
  const report = cleanMarkdown(stringFrom(body.report, "No report body supplied."));
  const accepted = listFrom(body.accepted);
  const rejected = listFrom(body.rejected);
  const timestamp = new Date().toISOString();
  const id = reportId(timestamp);
  const snapshotPath = resolve(bugSnapshotDir, `${id}.json`);
  const snapshotUrl = `/api/ai-bug-report-snapshot?id=${encodeURIComponent(id)}`;

  return {
    id,
    snapshotPath,
    snapshotUrl,
    markdown: [
    `## ${timestamp} - Turn ${tick} - ${tribe}`,
    "",
    tribeId ? `- Tribe id: ${tribeId}` : "",
    `- Severity: ${severity}`,
    `- Category: ${category}`,
    `- Provider: ${provider}`,
    `- Model: ${model}`,
    `- Strategy: ${summary}`,
    `- Source: ${source}`,
    `- Turn context: ${turnContext}`,
    `- Snapshot: ${snapshotUrl}`,
    `- Report: ${report}`,
    `- Accepted orders: ${accepted}`,
    `- Rejected orders: ${rejected}`,
    ""
    ].join("\n")
  };
}

async function writeBugSnapshot(reportIdValue: string, body: Record<string, unknown>): Promise<void> {
  await mkdir(bugSnapshotDir, { recursive: true });
  const snapshotPath = resolve(bugSnapshotDir, `${reportIdValue}.json`);
  const payload = {
    id: reportIdValue,
    capturedAt: new Date().toISOString(),
    report: {
      tick: stringFrom(body.tick, "unknown"),
      tribe: cleanMarkdown(stringFrom(body.tribe, "unknown tribe")),
      tribeId: cleanMarkdown(stringFrom(body.tribeId, "")),
      provider: cleanMarkdown(stringFrom(body.provider, "unknown provider")),
      model: cleanMarkdown(stringFrom(body.model, "unknown model")),
      severity: cleanMarkdown(stringFrom(body.severity, "low")),
      category: cleanMarkdown(stringFrom(body.category, "ai_report")),
      summary: cleanMarkdown(stringFrom(body.summary, "")),
      source: cleanMarkdown(stringFrom(body.source, "unknown")),
      turnContext: cleanMarkdown(stringFrom(body.turnContext, "")),
      report: cleanMarkdown(stringFrom(body.report, ""))
    },
    snapshot: normalizeSnapshot(body.snapshot)
  };
  await writeFile(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function normalizeSnapshot(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function summarizeBugReports(
  markdown: string,
  bytes: number,
  triage: Record<string, TriageRecord>,
  bucketTriage: Record<string, BucketTriageRecord>
): Record<string, unknown> {
  const entries = parseBugReportEntries(markdown).map((entry) => {
    const record = triage[entry.id];
    const bucketKeyValue = bucketKey(entry);
    const bucketRecord = bucketTriage[bucketKeyValue];
    const bucketCovered = isEntryCoveredByBucket(entry, bucketRecord);
    const bucketStatus = bucketCovered ? bucketRecord.status : "unresolved";
    const reviewStatus = record?.status ?? bucketStatus;
    const synthetic = isSyntheticReportEntry(entry);
    return {
      ...entry,
      triageStatus: record?.status ?? "unresolved",
      triageNote: record?.note ?? "",
      triageProof: record?.proof,
      triageUpdatedAt: record?.updatedAt ?? "",
      bucketKey: bucketKeyValue,
      bucketStatus,
      bucketNote: bucketCovered ? bucketRecord.note : "",
      bucketProof: bucketCovered ? bucketRecord.proof : undefined,
      bucketUpdatedAt: bucketCovered ? bucketRecord.updatedAt : "",
      bucketCoversReportsThrough: bucketCovered ? bucketRecord.coveredThrough.timestamp : "",
      bucketCoversLatestTick: bucketCovered ? bucketRecord.coveredThrough.tick : "unknown",
      bucketCovered,
      reviewStatus,
      synthetic
    };
  });
  const categoryMap = new Map<string, { category: string; count: number; latestTick: string; latestTribe: string; latestReport: string }>();
  const triageCounts: Record<TriageStatus, number> = { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const reviewCounts: Record<TriageStatus, number> = { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const liveReviewCounts: Record<TriageStatus, number> = { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  const syntheticReviewCounts: Record<TriageStatus, number> = { unresolved: 0, triaged: 0, fixed: 0, ignored: 0 };
  for (const entry of entries) {
    triageCounts[entry.triageStatus ?? "unresolved"] += 1;
    reviewCounts[entry.reviewStatus ?? "unresolved"] += 1;
    if (entry.synthetic) syntheticReviewCounts[entry.reviewStatus ?? "unresolved"] += 1;
    else liveReviewCounts[entry.reviewStatus ?? "unresolved"] += 1;
    const current = categoryMap.get(entry.category) ?? {
      category: entry.category,
      count: 0,
      latestTick: entry.tick,
      latestTribe: entry.tribe,
      latestReport: entry.report
    };
    current.count += 1;
    current.latestTick = entry.tick;
    current.latestTribe = entry.tribe;
    current.latestReport = entry.report;
    categoryMap.set(entry.category, current);
  }
  const categories = Array.from(categoryMap.values()).sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
  const buckets = summarizeBuckets(entries, bucketTriage);
  return {
    ok: true,
    path: bugReportPath,
    triagePath: bugTriagePath,
    bucketTriagePath: bugBucketTriagePath,
    bytes,
    total: entries.length,
    liveReports: entries.filter((entry) => !entry.synthetic).length,
    syntheticReports: entries.filter((entry) => entry.synthetic).length,
    triageCounts,
    reviewCounts,
    liveReviewCounts,
    syntheticReviewCounts,
    categories,
    buckets,
    bucketCoveredReports: entries.filter((entry) => entry.bucketCovered).length,
    reports: boundedReportEntries(entries, 250),
    latest: prioritizeReportEntries(entries).slice(0, 8)
  };
}

function parseBugReportEntries(markdown: string): BugReportEntry[] {
  const sections = markdown.split(/\n(?=## )/g);
  const entries: BugReportEntry[] = [];
  for (const section of sections) {
    if (!section.startsWith("## ")) continue;
    const lines = section.split("\n");
    const heading = lines[0].replace(/^##\s+/, "").trim();
    const match = heading.match(/^(.*?) - Turn (.*?) - (.*)$/);
    const fields = new Map<string, string>();
    for (const line of lines.slice(1)) {
      const field = line.match(/^-\s+([^:]+):\s*(.*)$/);
      if (!field) continue;
      fields.set(field[1].trim().toLowerCase(), field[2].trim());
    }
    entries.push({
      id: reportId(match?.[1] ?? heading),
      timestamp: match?.[1] ?? heading,
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
    });
  }
  return entries;
}

function tribeIdFromTurnContext(turnContext: string | undefined): string | undefined {
  return turnContext?.match(/(?:^|[;\s])tribeId=([^;\s]+)/i)?.[1];
}

function prioritizeReportEntries(entries: BugReportEntry[]): BugReportEntry[] {
  const priority: Record<TriageStatus, number> = { unresolved: 0, triaged: 1, fixed: 2, ignored: 3 };
  return entries
    .slice()
    .reverse()
    .sort((left, right) => priority[left.reviewStatus ?? left.triageStatus ?? "unresolved"] - priority[right.reviewStatus ?? right.triageStatus ?? "unresolved"]);
}

function boundedReportEntries(entries: BugReportEntry[], limit: number): BugReportEntry[] {
  const newest = entries.slice().reverse();
  const prioritized = prioritizeReportEntries(entries);
  const recentReserve = Math.min(40, limit);
  const merged = [...prioritized.slice(0, Math.max(0, limit - recentReserve)), ...newest.slice(0, recentReserve)];
  const seen = new Set<string>();
  return merged.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  }).slice(0, limit);
}

async function readTriageRecords(): Promise<Record<string, TriageRecord>> {
  if (!existsSync(bugTriagePath)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(bugTriagePath, "utf8")) as unknown;
  } catch (error) {
    console.warn(`Ignoring unreadable AI bug triage sidecar: ${error instanceof Error ? error.message : "unknown parse error"}`);
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const records: Record<string, TriageRecord> = {};
  for (const [id, rawRecord] of Object.entries(parsed as Record<string, unknown>)) {
    if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) continue;
    const record = rawRecord as Record<string, unknown>;
    records[id] = {
      status: parseTriageStatus(record.status, "unresolved"),
      note: cleanMarkdown(stringFrom(record.note, "")),
      proof: parseFixedTriageProof(record.proof, cleanMarkdown(stringFrom(record.updatedAt, ""))),
      updatedAt: cleanMarkdown(stringFrom(record.updatedAt, ""))
    };
  }
  return records;
}

async function writeTriageRecords(records: Record<string, TriageRecord>): Promise<void> {
  await mkdir(dirname(bugTriagePath), { recursive: true });
  await writeFile(bugTriagePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

async function readBucketTriageRecords(): Promise<Record<string, BucketTriageRecord>> {
  if (!existsSync(bugBucketTriagePath)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(bugBucketTriagePath, "utf8")) as unknown;
  } catch (error) {
    console.warn(`Ignoring unreadable AI bug bucket triage sidecar: ${error instanceof Error ? error.message : "unknown parse error"}`);
    return {};
  }
  const rawBuckets =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && "buckets" in parsed
      ? (parsed as Record<string, unknown>).buckets
      : parsed;
  if (!rawBuckets || typeof rawBuckets !== "object" || Array.isArray(rawBuckets)) return {};
  const records: Record<string, BucketTriageRecord> = {};
  for (const [key, rawRecord] of Object.entries(rawBuckets as Record<string, unknown>)) {
    if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) continue;
    const record = rawRecord as Record<string, unknown>;
    const coveredThroughRaw = record.coveredThrough;
    const coveredThrough =
      coveredThroughRaw && typeof coveredThroughRaw === "object" && !Array.isArray(coveredThroughRaw)
        ? (coveredThroughRaw as Record<string, unknown>)
        : {};
    records[key] = {
      status: parseTriageStatus(record.status, "unresolved"),
      note: cleanMarkdown(stringFrom(record.note, "")),
      proof: parseFixedTriageProof(record.proof, cleanMarkdown(stringFrom(record.updatedAt, ""))),
      coveredThrough: {
        reportId: cleanMarkdown(stringFrom(coveredThrough.reportId, "")),
        timestamp: cleanMarkdown(stringFrom(coveredThrough.timestamp, stringFrom(record.coversReportsThrough, ""))),
        tick: cleanMarkdown(stringFrom(coveredThrough.tick, stringFrom(record.coversLatestTick, "unknown")))
      },
      updatedAt: cleanMarkdown(stringFrom(record.updatedAt, ""))
    };
  }
  return records;
}

function summarizeBuckets(entries: BugReportEntry[], bucketTriage: Record<string, BucketTriageRecord>): BugReportBucket[] {
  const buckets = new Map<string, BugReportBucket>();
  for (const entry of entries) {
    const key = entry.bucketKey ?? bucketKey(entry);
    const current = buckets.get(key) ?? {
      key,
      category: entry.category,
      provider: entry.provider,
      model: entry.model,
      sourceKind: sourceKind(entry.source),
      total: 0,
      unresolvedCount: 0,
      triagedCount: 0,
      fixedCount: 0,
      ignoredCount: 0,
      current: false,
      latestReportId: entry.id,
      latestStatus: entry.reviewStatus ?? "unresolved",
      latestTick: entry.tick,
      latestTimestamp: entry.timestamp,
      latestTribe: entry.tribe,
      latestReport: entry.report,
      latestSnapshot: entry.snapshot,
      bucketCoveredReports: 0,
      synthetic: true,
      liveCount: 0,
      syntheticCount: 0
    };
    const status = entry.reviewStatus ?? "unresolved";
    current.total += 1;
    if (status === "unresolved") current.unresolvedCount += 1;
    if (status === "triaged") current.triagedCount += 1;
    if (status === "fixed") current.fixedCount += 1;
    if (status === "ignored") current.ignoredCount += 1;
    if (entry.bucketCovered) current.bucketCoveredReports += 1;
    if (entry.reviewStatus === "fixed" && entry.triageProof && (!current.latestFixedUpdatedAt || compareBugReportCursor(entry, { timestamp: current.latestFixedUpdatedAt, tick: "unknown" }) >= 0)) {
      current.latestFixedReportId = entry.id;
      current.latestFixedProof = entry.triageProof;
      current.latestFixedUpdatedAt = entry.triageUpdatedAt || entry.bucketUpdatedAt || entry.timestamp;
    }
    if (entry.synthetic) current.syntheticCount += 1;
    else current.liveCount += 1;
    if (compareBugReportCursor(entry, { timestamp: current.latestTimestamp, tick: current.latestTick }) > 0) {
      current.latestReportId = entry.id;
      current.latestStatus = status;
      current.latestTick = entry.tick;
      current.latestTimestamp = entry.timestamp;
      current.latestTribe = entry.tribe;
      current.latestReport = entry.report;
      current.latestSnapshot = entry.snapshot;
    }
    buckets.set(key, current);
  }
  for (const [key, bucket] of buckets) {
    const record = bucketTriage[key];
    bucket.synthetic = bucket.liveCount === 0;
    bucket.current = bucket.unresolvedCount > 0;
    if (record) {
      bucket.bucketStatus = record.status;
      bucket.bucketNote = record.note;
      bucket.bucketProof = record.proof;
      bucket.bucketUpdatedAt = record.updatedAt;
      bucket.bucketCoversReportsThrough = record.coveredThrough.timestamp;
      bucket.bucketCoversLatestTick = record.coveredThrough.tick;
      if (record.status === "fixed" && record.proof && !bucket.latestFixedProof) {
        bucket.latestFixedProof = record.proof;
        bucket.latestFixedUpdatedAt = record.updatedAt;
        bucket.latestFixedReportId = record.coveredThrough.reportId;
      }
    }
  }
  return Array.from(buckets.values()).sort(
    (left, right) =>
      Number(right.current) - Number(left.current) ||
      right.unresolvedCount - left.unresolvedCount ||
      right.total - left.total ||
      left.key.localeCompare(right.key)
  );
}

function bucketKey(entry: Pick<BugReportEntry, "category" | "provider" | "model" | "source">): string {
  return [entry.category, entry.provider, entry.model, sourceKind(entry.source)].join("|");
}

function sourceKind(source: string): string {
  const match = source.match(/kind=([^;]+)/);
  return match?.[1] ?? "unknown";
}

function isSyntheticReportEntry(entry: Pick<BugReportEntry, "provider" | "model" | "source">): boolean {
  const provider = entry.provider.toLowerCase();
  const model = entry.model.toLowerCase();
  const source = entry.source.toLowerCase();
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

function isEntryCoveredByBucket(entry: BugReportEntry, record: BucketTriageRecord | undefined): boolean {
  if (!record || !isCoveredStatus(record.status)) return false;
  if (record.status === "fixed" && !record.proof) return false;
  if (!record.coveredThrough.timestamp && !record.coveredThrough.reportId) return false;
  if (record.coveredThrough.reportId && entry.id === record.coveredThrough.reportId) return true;
  return compareBugReportCursor(entry, record.coveredThrough) <= 0;
}

function isCoveredStatus(status: TriageStatus): boolean {
  return status === "fixed" || status === "triaged" || status === "ignored";
}

function compareBugReportCursor(left: { timestamp?: string; tick?: string; id?: string }, right: { timestamp?: string; tick?: string; id?: string }): number {
  const leftTime = Date.parse(left.timestamp ?? "");
  const rightTime = Date.parse(right.timestamp ?? "");
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
  const leftTick = Number(left.tick);
  const rightTick = Number(right.tick);
  if (Number.isFinite(leftTick) && Number.isFinite(rightTick) && leftTick !== rightTick) return leftTick - rightTick;
  return String(left.id ?? "").localeCompare(String(right.id ?? ""));
}

function parseTriageStatus(value: unknown, fallback?: TriageStatus): TriageStatus {
  if (value === "triaged" || value === "fixed" || value === "ignored" || value === "unresolved") return value;
  if (fallback) return fallback;
  throw new Error("Invalid triage status");
}

function parseFixedTriageProof(value: unknown, verifiedAtFallback: string): FixedTriageProof | undefined {
  if (typeof value === "string") {
    const cleaned = cleanMarkdown(value);
    if (cleaned.length < 12) return undefined;
    return {
      summary: cleaned,
      evidence: cleaned,
      fixedBy: "manual",
      verifiedAt: verifiedAtFallback || new Date().toISOString()
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const summary = cleanMarkdown(stringFrom(record.summary, ""));
  const evidence = cleanMarkdown(stringFrom(record.evidence, ""));
  if (summary.length < 8 || evidence.length < 12) return undefined;
  const fixedBy = parseFixedBy(record.fixedBy);
  const fixedAtTurn = typeof record.fixedAtTurn === "number" && Number.isFinite(record.fixedAtTurn) ? Math.max(0, Math.round(record.fixedAtTurn)) : undefined;
  return {
    summary,
    evidence,
    fixedBy,
    ...(fixedAtTurn !== undefined ? { fixedAtTurn } : {}),
    verifiedAt: cleanMarkdown(stringFrom(record.verifiedAt, verifiedAtFallback || new Date().toISOString()))
  };
}

function parseFixedBy(value: unknown): FixedTriageProof["fixedBy"] {
  return value === "observer_ui" || value === "smoke" || value === "review_script" || value === "manual" ? value : "manual";
}

function reportId(timestamp: string): string {
  return timestamp.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 120);
}

function listFrom(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "none";
  return value.map((item) => cleanMarkdown(String(item))).join("; ");
}

function stringFrom(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function cleanMarkdown(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim().slice(0, 900);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
