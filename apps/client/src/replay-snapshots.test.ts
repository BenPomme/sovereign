import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const replayScript = resolve(process.cwd(), "scripts/replay-ai-snapshots.mjs");

describe("AI snapshot replay strict gate", () => {
  it("fails strict replay when a snapshot violates the artifact contract", async () => {
    await withReplayFixture(async ({ reportPath, triagePath, snapshotDir }) => {
      await writeSnapshot(snapshotDir, "orphan", {
        id: "orphan",
        report: {
          tick: "1",
          tribe: "Orphan",
          severity: "low",
          category: "self_report",
          provider: "fallback",
          model: "browser-test-hook",
          source: "kind=report_bug_order; decision=ai_orphan; provider=fallback; model=browser-test-hook",
          turnContext: "turn=1; tribe=Orphan; resources=gold=1; developments=none; units=0; military=0; walls=0; gates=0; turrets=0; accepted=0; rejected=0; survival=surviving:year1:review100:survivors5"
        },
        snapshot: {
          schema: "sovereign-ai-bug-snapshot-v1",
          tick: 1,
          report: {
            decisionId: "ai_orphan",
            category: "self_report",
            provider: "fallback",
            model: "browser-test-hook",
            severity: "low",
            source: "kind=report_bug_order; decision=ai_orphan; provider=fallback; model=browser-test-hook",
            turnContext: "turn=1; tribe=Orphan; resources=gold=1; developments=none; units=0; military=0; walls=0; gates=0; turrets=0; accepted=0; rejected=0; survival=surviving:year1:review100:survivors5",
            accepted: [],
            rejected: []
          },
          tribe: {
            name: "Orphan",
            resources: { gold: 1 },
            developments: []
          },
          counts: {
            ownUnits: 0,
            ownMilitary: 0,
            walls: 0,
            gates: 0,
            turrets: 0
          },
          survivalMandate: {
            status: "surviving",
            currentYear: 1,
            nextReviewYear: 100,
            survivingTribes: 5
          }
        }
      });

      const result = await runReplay(reportPath, triagePath, snapshotDir);
      expect(result.code).not.toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(false);
      expect(parsed.contractWarnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("capturedAt is missing"),
          expect.stringContaining("snapshot is not linked")
        ])
      );
      expect(parsed.failures).toEqual([]);
    });
  });

  it("keeps legacy compatibility warnings non-fatal under strict replay", async () => {
    await withReplayFixture(async ({ reportPath, triagePath, snapshotDir }) => {
      const id = "2026-07-02T00:00:00.000Z";
      const snapshotUrl = `/api/ai-bug-report-snapshot?id=${encodeURIComponent(id)}`;
      const turnContext = "turn=1; tribe=Legacy Realm; goldRace=surviving:10/100";
      await writeFile(
        reportPath,
        [
          "# AI Bug Reports",
          "",
          `## ${id} - Turn 1 - Legacy Realm`,
          "",
          "- Severity: low",
          "- Category: ai_report",
          "- Provider: ollama",
          "- Model: qwen3.5:9b-mlx",
          "- Strategy: Legacy compatibility fixture",
          "- Source: kind=strategy_bug_report; decision=ai_legacy; provider=ollama; model=qwen3.5:9b-mlx",
          `- Turn context: ${turnContext}`,
          `- Snapshot: ${snapshotUrl}`,
          "- Report: Legacy gold race snapshot still replays.",
          ""
        ].join("\n"),
        "utf8"
      );
      await writeSnapshot(snapshotDir, id, {
        id,
        capturedAt: "2026-07-02T00:00:00.000Z",
        report: {
          tick: "1",
          tribe: "Legacy Realm",
          severity: "low",
          category: "ai_report",
          provider: "ollama",
          model: "qwen3.5:9b-mlx",
          source: "kind=strategy_bug_report; decision=ai_legacy; provider=ollama; model=qwen3.5:9b-mlx",
          turnContext
        },
        snapshot: {
          schema: "sovereign-ai-bug-snapshot-v1",
          tick: 1,
          report: {
            decisionId: "ai_legacy",
            category: "ai_report",
            provider: "ollama",
            model: "qwen3.5:9b-mlx",
            severity: "low",
            source: "kind=strategy_bug_report; decision=ai_legacy; provider=ollama; model=qwen3.5:9b-mlx",
            turnContext,
            accepted: [],
            rejected: []
          },
          tribe: {
            name: "Legacy Realm",
            resources: {},
            developments: []
          },
          mandate: {
            status: "surviving",
            leaderGold: 10,
            goldTarget: 100
          }
        }
      });

      const result = await runReplay(reportPath, triagePath, snapshotDir);
      expect(result.code).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(true);
      expect(parsed.contractWarnings).toEqual([]);
      expect(parsed.warnings).toEqual(expect.arrayContaining([expect.stringContaining("legacy snapshot stores goldRace payload")]));
    });
  });
});

async function withReplayFixture(
  fn: (paths: { root: string; reportPath: string; triagePath: string; snapshotDir: string }) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "sovereign-replay-"));
  const reportPath = join(root, "AI_BUG_REPORTS.md");
  const triagePath = join(root, "AI_BUG_TRIAGE.json");
  const snapshotDir = join(root, "AI_BUG_SNAPSHOTS");
  await mkdir(snapshotDir);
  await writeFile(reportPath, "# AI Bug Reports\n", "utf8");
  await writeFile(triagePath, "{}\n", "utf8");
  try {
    await fn({ root, reportPath, triagePath, snapshotDir });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeSnapshot(snapshotDir: string, id: string, payload: unknown): Promise<void> {
  await writeFile(join(snapshotDir, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");
}

async function runReplay(reportPath: string, triagePath: string, snapshotDir: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      [
        replayScript,
        "--strict",
        "--json",
        "--no-write",
        `--report=${reportPath}`,
        `--triage=${triagePath}`,
        `--snapshot-dir=${snapshotDir}`
      ],
      { cwd: process.cwd() },
      (error, stdout, stderr) => {
        resolvePromise({
          code: typeof error?.code === "number" ? error.code : 0,
          stdout,
          stderr
        });
      }
    );
  });
}
