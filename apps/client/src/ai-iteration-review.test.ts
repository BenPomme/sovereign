import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reviewScript = resolve(process.cwd(), "scripts/ai-iteration-review.mjs");

describe("AI iteration review classifier", () => {
  it("keeps real reports actionable when the prose mentions synthetic-test words", async () => {
    const root = await mkdtemp(join(tmpdir(), "sovereign-review-"));
    try {
      await writeFile(
        join(root, "AI_BUG_REPORTS.md"),
        [
          "# AI Bug Reports",
          "",
          "## 2026-07-02T09:00:00.000Z - Turn 10 - The Ember Court",
          "",
          "- Tribe id: blue",
          "- Severity: medium",
          "- Category: self_report",
          "- Provider: ollama",
          "- Model: qwen3.5:9b-mlx",
          "- Strategy: Investigate why smoke from the forge is invisible.",
          "- Source: kind=report_bug_order; decision=ai_real; provider=ollama; model=qwen3.5:9b-mlx",
          "- Turn context: turn=10; tribe=The Ember Court; tribeId=blue; resources=coal=10; survival=surviving:year1:review100:survivors5",
          "- Snapshot: /api/ai-bug-report-snapshot?id=2026-07-02T09%3A00%3A00.000Z",
          "- Report: Real report mentions smoke, mock feints, and playwright scribes in its story text.",
          "",
          "## 2026-07-02T09:00:01.000Z - Turn 0 - Smoke Test",
          "",
          "- Tribe id: blue",
          "- Severity: low",
          "- Category: ai_report",
          "- Provider: smoke",
          "- Model: playwright",
          "- Strategy: Smoke endpoint verification",
          "- Source: kind=smoke_endpoint; decision=endpoint; provider=smoke; model=playwright",
          "- Turn context: turn=0; tribe=Smoke Test; tribeId=blue; resources=none; survival=smoke:year1:review100:survivors5",
          "- Snapshot: /api/ai-bug-report-snapshot?id=2026-07-02T09%3A00%3A01.000Z",
          "- Report: Synthetic endpoint fixture.",
          ""
        ].join("\n"),
        "utf8"
      );

      const result = await runReview(root);

      expect(result.ok).toBe(true);
      expect(result.totalReports).toBe(2);
      expect(result.actionableUnresolved).toBe(1);
      expect(result.excludedSyntheticUnresolved).toBe(1);
      expect(result.rankedBacklog[0]).toMatchObject({
        category: "self_report",
        latestTribe: "The Ember Court"
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("classifies live-authored integrity canaries as synthetic from source metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "sovereign-review-"));
    try {
      await writeFile(
        join(root, "AI_BUG_REPORTS.md"),
        [
          "# AI Bug Reports",
          "",
          "## 2026-07-02T10:00:00.000Z - Turn 20 - The Ember Court",
          "",
          "- Tribe id: blue",
          "- Severity: medium",
          "- Category: self_report",
          "- Provider: ollama",
          "- Model: qwen3.5:9b-mlx",
          "- Strategy: Real sovereign report.",
          "- Source: kind=report_bug_order; decision=ai_real; provider=ollama; model=qwen3.5:9b-mlx",
          "- Turn context: turn=20; tribe=The Ember Court; tribeId=blue; resources=coal=10; survival=surviving:year1:review100:survivors5",
          "- Snapshot: /api/ai-bug-report-snapshot?id=2026-07-02T10%3A00%3A00.000Z",
          "- Report: Real wall pathing issue.",
          "",
          "## 2026-07-02T10:00:01.000Z - Turn 21 - The Ember Court",
          "",
          "- Tribe id: blue",
          "- Severity: low",
          "- Category: self_report",
          "- Provider: ollama",
          "- Model: qwen3.5:9b-mlx",
          "- Strategy: Live-authored integrity canary.",
          "- Source: kind=live_integrity_canary; decision=ai_canary; provider=ollama; model=qwen3.5:9b-mlx",
          "- Turn context: turn=21; tribe=The Ember Court; tribeId=blue; resources=coal=10; survival=surviving:year1:review100:survivors5",
          "- Snapshot: /api/ai-bug-report-snapshot?id=2026-07-02T10%3A00%3A01.000Z",
          "- Report: Artificial world-integrity contradiction used to prove live model report authorship.",
          ""
        ].join("\n"),
        "utf8"
      );

      const result = await runReview(root);

      expect(result.ok).toBe(true);
      expect(result.totalReports).toBe(2);
      expect(result.actionableUnresolved).toBe(1);
      expect(result.excludedSyntheticUnresolved).toBe(1);
      expect(result.rankedBacklog[0]).toMatchObject({
        category: "self_report",
        latestTribe: "The Ember Court"
      });
      expect(result.rankedBacklog[0].latestReport).toContain("Real wall pathing issue");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function runReview(root: string): Promise<{
  ok: boolean;
  totalReports: number;
  actionableUnresolved: number;
  excludedSyntheticUnresolved: number;
  rankedBacklog: Array<{ category: string; latestTribe: string; latestReport: string }>;
}> {
  const { stdout } = await new Promise<{ stdout: string }>((resolvePromise, reject) => {
    execFile(process.execPath, [reviewScript, "--json", "--no-write"], { cwd: root }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolvePromise({ stdout });
    });
  });
  return JSON.parse(stdout);
}
