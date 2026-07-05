import { chromium } from "playwright";
import { stat } from "node:fs/promises";

const url = process.env.SOVEREIGNS_URL ?? "http://localhost:5173/";
const screenshotPath =
  process.env.SOVEREIGNS_MOCKED_OLLAMA_SCREENSHOT ??
  "/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
const warnings = [];
const calls = {
  identity: 0,
  decision: 0,
  reply: 0,
  health: 0
};
const callLog = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    const text = message.text();
    if (text.includes("503") && text.includes("Service Unavailable")) {
      warnings.push(`expected mocked transport console error: ${text}`);
      return;
    }
    if (text.includes("ERR_TIMED_OUT")) {
      warnings.push(`expected mocked timeout console error: ${text}`);
      return;
    }
    errors.push(`console error: ${text}`);
  }
  if (message.type() === "warning") warnings.push(`console warning: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("dialog", async (dialog) => {
  warnings.push(`dialog: ${dialog.message()}`);
  await dialog.accept();
});

await page.route("**/ollama/api/tags", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "mock:latest", model: "mock:latest" }] })
  });
});

await page.route("**/ollama/api/generate", async (route) => {
  const body = JSON.parse(route.request().postData() ?? "{}");
  if (body.think !== false) {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: `generate schema calls must disable thinking, got ${JSON.stringify(body.think)}` })
    });
    return;
  }
  const properties = body.format?.properties ?? {};
  if (Object.prototype.hasOwnProperty.call(properties, "realmName")) {
    calls.identity += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: recoverableIdentityJson(calls.identity) })
    });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(properties, "ok")) {
    calls.health += 1;
    if (calls.health <= 2) {
      callLog.push(`health:${calls.health}:fail`);
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "mocked Ollama health check outage" })
      });
      return;
    }
    callLog.push(`health:${calls.health}:success`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: JSON.stringify({ ok: true }) })
    });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(properties, "freeformStrategy")) {
    calls.decision += 1;
    if (calls.decision === 6 || calls.decision === 10 || calls.decision === 11) {
      callLog.push(`decision:${calls.decision}:timedout`);
      await route.abort("timedout");
      return;
    }
    callLog.push(`decision:${calls.decision}`);
    if (calls.decision === 1 || calls.decision === 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ response: "not json at all: deliberate mocked parser failure" })
      });
      return;
    }
    if (calls.decision === 3 || calls.decision === 4 || calls.decision === 5 || calls.decision === 7 || calls.decision === 8 || calls.decision === 9) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "mocked Ollama transport outage" })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: validDecisionJson() })
    });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(properties, "strategyNote")) {
    calls.reply += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: validReplyJson() })
    });
    return;
  }
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "unknown mocked generate schema" })
  });
});

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 15_000 });
await page.click("#pauseButton");
const baselineIssueIds = await page.evaluate(() => {
  if (typeof window.render_game_to_text !== "function") return [];
  const parsed = JSON.parse(window.render_game_to_text());
  return (parsed.aiIssues ?? []).map((issue) => issue.id);
});
await page.evaluate(() => {
  window.advanceTime?.(12_000);
});

const parserState = await page.waitForFunction(
  (baselineIds) => {
    if (typeof window.render_game_to_text !== "function") return null;
    const parsed = JSON.parse(window.render_game_to_text());
    const parserIssue = parsed.aiIssues?.find((issue) => !baselineIds.includes(issue.id) && issue.category === "llm_parser" && issue.saveState === "saved");
    return parsed.llm?.identitySetupComplete && !parsed.llm?.busyTribe && parserIssue
      ? {
          issue: parserIssue,
          decisions: parsed.latestAiDecisions,
          review: parsed.aiReportReview
        }
      : null;
  },
  baselineIssueIds,
  { timeout: 90_000 }
);
const parserValue = await parserState.jsonValue();
if (!reportMatchesFailureKind(parserValue?.issue?.report, "parser")) {
  throw new Error(`Mocked parser failure did not become a saved llm_parser issue: ${JSON.stringify(parserValue)}`);
}
if (
  parserValue.review?.filters?.scope !== "live" ||
  typeof parserValue.review?.liveReviewCounts?.unresolved !== "number" ||
  typeof parserValue.review?.syntheticReviewCounts?.unresolved !== "number"
) {
  throw new Error(`Mocked parser failure did not preserve live default review scope and split counts: ${JSON.stringify(parserValue.review)}`);
}

await page.click("#askAiNowButton");
await page.evaluate(() => {
  window.advanceTime?.(15_000);
});
const transportState = await page.waitForFunction(
  (baselineIds) => {
    if (typeof window.render_game_to_text !== "function") return null;
    const parsed = JSON.parse(window.render_game_to_text());
    const transportIssue = parsed.aiIssues?.find((issue) => !baselineIds.includes(issue.id) && issue.category === "llm_transport" && issue.saveState === "saved");
    const parserBucket = parsed.aiReportReview?.buckets?.find(
      (bucket) => bucket.category === "llm_parser" && bucket.model === "mock:latest failed" && bucket.synthetic
    );
    const transportBucket = parsed.aiReportReview?.buckets?.find(
      (bucket) => bucket.category === "llm_transport" && bucket.model === "mock:latest failed" && bucket.synthetic
    );
    return !parsed.llm?.busyTribe && transportIssue && parserBucket && transportBucket
      ? {
          issue: transportIssue,
          parserBucket,
          transportBucket,
          review: parsed.aiReportReview
        }
      : null;
  },
  baselineIssueIds,
  { timeout: 90_000 }
);
const transportValue = await transportState.jsonValue();
if (!reportMatchesFailureKind(transportValue?.issue?.report, "transport")) {
  throw new Error(`Mocked transport failure did not become a saved llm_transport issue: ${JSON.stringify(transportValue)}`);
}
if (
  transportValue.parserBucket?.synthetic !== true ||
  transportValue.parserBucket?.liveCount !== 0 ||
  transportValue.parserBucket?.syntheticCount < 1 ||
  transportValue.transportBucket?.synthetic !== true ||
  transportValue.transportBucket?.liveCount !== 0 ||
  transportValue.transportBucket?.syntheticCount < 1 ||
  transportValue.review?.filters?.scope !== "live" ||
  transportValue.review?.focusBuckets?.some((bucket) => bucket.filters?.model === "mock:latest failed")
) {
  throw new Error(`Mocked parser/transport buckets were not isolated as synthetic QA fixtures: ${JSON.stringify(transportValue)}`);
}

await page.click("#askAiNowButton");
await page.evaluate(() => {
  window.advanceTime?.(15_000);
});
let cooldownActivationState;
try {
  cooldownActivationState = await page.waitForFunction(
    ({ baselineIds, firstTransportReportId }) => {
      if (typeof window.render_game_to_text !== "function") return null;
      const parsed = JSON.parse(window.render_game_to_text());
      const transportIssues = parsed.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
      const currentTransportIssues = transportIssues.filter((issue) => !baselineIds.includes(issue.id));
      const latestDecision = parsed.latestAiDecisions?.at(-1);
      return !parsed.llm?.busyTribe && parsed.llm?.cooldown && currentTransportIssues.length === 2
        ? {
            cooldown: parsed.llm.cooldown,
            transportIssues: currentTransportIssues,
            allTransportIssueCount: transportIssues.length,
            latestDecision,
            includesFirstReport: currentTransportIssues.some((issue) => issue.id === firstTransportReportId)
          }
        : null;
    },
    { baselineIds: baselineIssueIds, firstTransportReportId: transportValue.issue.id },
    { timeout: 90_000 }
  );
} catch (error) {
  const parsed = await page.evaluate(() => (typeof window.render_game_to_text === "function" ? JSON.parse(window.render_game_to_text()) : null));
  const transportIssues = parsed?.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
  const currentTransportIssues = transportIssues.filter((issue) => !baselineIssueIds.includes(issue.id));
  throw new Error(
    `Timed out waiting for current-run cooldown activation: ${JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      calls,
      callLog,
      busyTribe: parsed?.llm?.busyTribe,
      cooldown: parsed?.llm?.cooldown,
      currentTransportIssues,
      allTransportIssueCount: transportIssues.length,
      latestAiDecisions: parsed?.latestAiDecisions?.slice(-4)
    })}`
  );
}
const cooldownActivationValue = await cooldownActivationState.jsonValue();
if (!cooldownActivationValue?.includesFirstReport) {
  throw new Error(`Second consecutive transport failure did not preserve first report: ${JSON.stringify(cooldownActivationValue)}`);
}
if (cooldownActivationValue.transportIssues.length !== 2) {
  throw new Error(`Second consecutive transport failure should create exactly one additional report: ${JSON.stringify(cooldownActivationValue)}`);
}
const cooldownTransportReportIds = cooldownActivationValue.transportIssues.map((issue) => issue.id);

await page.click("#askAiNowButton");
const cooldownState = await page.waitForFunction(
  ({ baselineIds, transportReportIds }) => {
    if (typeof window.render_game_to_text !== "function") return null;
    const parsed = JSON.parse(window.render_game_to_text());
    const transportIssues = parsed.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
    const currentTransportIssues = transportIssues.filter((issue) => !baselineIds.includes(issue.id));
    const latestDecision = parsed.latestAiDecisions?.at(-1);
    const cooldownAccepted = latestDecision?.accepted?.find((entry) => String(entry).startsWith("LLM_COOLDOWN:"));
    return !parsed.llm?.busyTribe && parsed.llm?.cooldown && cooldownAccepted
      ? {
          cooldown: parsed.llm.cooldown,
          transportIssues: currentTransportIssues,
          allTransportIssueCount: transportIssues.length,
          latestDecision,
          sameTransportReport:
            currentTransportIssues.length === transportReportIds.length && transportReportIds.every((id) => currentTransportIssues.some((issue) => issue.id === id))
        }
      : null;
  },
  { baselineIds: baselineIssueIds, transportReportIds: cooldownTransportReportIds },
  { timeout: 90_000 }
);
const cooldownValue = await cooldownState.jsonValue();
if (!cooldownValue?.sameTransportReport) {
  throw new Error(`Ollama cooldown did not suppress duplicate transport reports: ${JSON.stringify(cooldownValue)}`);
}
if (!cooldownValue.cooldown?.reportsSuppressed || cooldownValue.cooldown.reportsSuppressed < 1) {
  throw new Error(`Ollama cooldown did not expose suppressed report count: ${JSON.stringify(cooldownValue)}`);
}
const cooldownPanelText = await page.locator("#llmPanel").innerText();
if (!cooldownPanelText.includes("Ollama cooldown") || !cooldownPanelText.includes("duplicate reports suppressed")) {
  throw new Error(`AI Observer panel did not surface Ollama cooldown status. Text: ${cooldownPanelText}`);
}

await advancePastCooldown(page);
await page.waitForTimeout(3_000);
await page.click("#askAiNowButton");
await page.evaluate(() => {
  window.advanceTime?.(15_000);
});
let failedCanaryState;
try {
  failedCanaryState = await page.waitForFunction(
    ({ baselineIds, transportReportIds }) => {
      if (typeof window.render_game_to_text !== "function") return null;
      const parsed = JSON.parse(window.render_game_to_text());
      const cooldown = parsed.llm?.cooldown;
      const transportIssues = parsed.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
      const currentTransportIssues = transportIssues.filter((issue) => !baselineIds.includes(issue.id));
      return !parsed.llm?.busyTribe && cooldown?.lastProbeStatus?.includes("Health check failed")
        ? {
            cooldown,
            transportIssues: currentTransportIssues,
            allTransportIssueCount: transportIssues.length,
            sameTransportReport:
              currentTransportIssues.length === transportReportIds.length && transportReportIds.every((id) => currentTransportIssues.some((issue) => issue.id === id)),
            latestDecision: parsed.latestAiDecisions?.at(-1)
          }
        : null;
    },
    { baselineIds: baselineIssueIds, transportReportIds: cooldownTransportReportIds },
    { timeout: 90_000 }
  );
} catch (error) {
  const parsed = await page.evaluate(() => (typeof window.render_game_to_text === "function" ? JSON.parse(window.render_game_to_text()) : null));
  const transportIssues = parsed?.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
  const currentTransportIssues = transportIssues.filter((issue) => !baselineIssueIds.includes(issue.id));
  throw new Error(
    `Timed out waiting for failed cooldown canary: ${JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      calls,
      callLog,
      busyTribe: parsed?.llm?.busyTribe,
      cooldown: parsed?.llm?.cooldown,
      currentTransportIssues,
      allTransportIssueCount: transportIssues.length,
      latestAiDecisions: parsed?.latestAiDecisions?.slice(-4)
    })}`
  );
}
const failedCanaryValue = await failedCanaryState.jsonValue();
if (!failedCanaryValue?.sameTransportReport) {
  throw new Error(`Failed canary created a duplicate transport report: ${JSON.stringify(failedCanaryValue)}`);
}
if (failedCanaryValue.cooldown?.waitingForHealthCheck !== false || failedCanaryValue.cooldown?.probeInFlight !== false) {
  throw new Error(`Failed canary did not extend cooldown cleanly: ${JSON.stringify(failedCanaryValue)}`);
}
if ((failedCanaryValue.cooldown?.untilTick ?? 0) <= cooldownValue.cooldown.untilTick) {
  throw new Error(`Failed canary did not extend the cooldown window: ${JSON.stringify({ before: cooldownValue.cooldown, after: failedCanaryValue.cooldown })}`);
}
if ((failedCanaryValue.cooldown?.reportsSuppressed ?? 0) <= cooldownValue.cooldown.reportsSuppressed) {
  throw new Error(`Failed canary did not keep suppressing duplicate live calls: ${JSON.stringify({ before: cooldownValue.cooldown, after: failedCanaryValue.cooldown })}`);
}
const failedCanaryCooldownNote = failedCanaryValue.latestDecision?.accepted?.find((entry) => String(entry).startsWith("LLM_COOLDOWN:"));
if (
  !failedCanaryCooldownNote ||
  !String(failedCanaryCooldownNote).includes("mock:latest") ||
  !String(failedCanaryCooldownNote).includes("transport outage") ||
  !String(failedCanaryCooldownNote).includes("deterministic fallback")
) {
  throw new Error(`Expired cooldown decision did not expose cooldown fallback note: ${JSON.stringify(failedCanaryValue.latestDecision)}`);
}

await advancePastCooldown(page);
await page.waitForTimeout(3_000);
const needsCanaryRestoreClick = await page.evaluate(() => {
  if (typeof window.render_game_to_text !== "function") return false;
  return Boolean(JSON.parse(window.render_game_to_text()).llm?.cooldown);
});
if (needsCanaryRestoreClick) {
  await page.click("#askAiNowButton");
  await page.evaluate(() => {
    window.advanceTime?.(15_000);
  });
  await page.waitForFunction(
    () => {
      if (typeof window.render_game_to_text !== "function") return false;
      const parsed = JSON.parse(window.render_game_to_text());
      return !parsed.llm?.busyTribe && !parsed.llm?.cooldown;
    },
    null,
    { timeout: 90_000 }
  );
}
await page.click("#askAiNowButton");
const restoredState = await page.waitForFunction(
  (baselineIds) => {
    if (typeof window.render_game_to_text !== "function") return null;
    const parsed = JSON.parse(window.render_game_to_text());
    const latestDecision = parsed.latestAiDecisions?.at(-1);
    const retryDecision = parsed.latestAiDecisions?.find((decision) =>
      decision?.accepted?.some((entry) => String(entry).includes("LLM_TRANSPORT_RETRY"))
    );
    const transportIssues = parsed.aiIssues?.filter((issue) => issue.category === "llm_transport" && issue.saveState === "saved") ?? [];
    return !parsed.llm?.busyTribe && retryDecision?.provider === "ollama" && retryDecision?.summary?.includes("Mock decision returned after deterministic failures")
      ? {
          status: parsed.llm.status,
          latestDecision,
          retryDecision,
          cooldown: parsed.llm?.cooldown ?? null,
          transportIssues: transportIssues.filter((issue) => !baselineIds.includes(issue.id)),
          allTransportIssueCount: transportIssues.length
        }
      : null;
  },
  baselineIssueIds,
  { timeout: 90_000 }
);
const restoredValue = await restoredState.jsonValue();
if (
  restoredValue.transportIssues.length !== cooldownTransportReportIds.length ||
  !cooldownTransportReportIds.every((id) => restoredValue.transportIssues.some((issue) => issue.id === id))
) {
  throw new Error(`Successful canary changed transport report history: ${JSON.stringify(restoredValue)}`);
}
const healthSuccessIndex = callLog.indexOf("health:3:success");
if (healthSuccessIndex < 0) {
  throw new Error(`Successful canary was not called before cooldown cleared: ${JSON.stringify({ calls, callLog, restoredValue })}`);
}
const firstLiveDecisionAfterHealth = callLog.findIndex((entry, index) => index > healthSuccessIndex && entry.startsWith("decision:"));
if (firstLiveDecisionAfterHealth < 0) {
  throw new Error(`No live decision call occurred after successful canary: ${JSON.stringify({ calls, callLog, restoredValue })}`);
}
const postCanaryTimeoutIndex = callLog.indexOf("decision:11:timedout");
const postCanaryRetryIndex = callLog.indexOf("decision:12");
if (postCanaryTimeoutIndex < 0 || postCanaryRetryIndex <= postCanaryTimeoutIndex) {
  throw new Error(`Post-canary timeout did not retry into a live decision: ${JSON.stringify({ calls, callLog, restoredValue })}`);
}

const liveDecisionValue = restoredValue;
if (liveDecisionValue.cooldown) {
  throw new Error(`Cooldown still active after successful canary and live decision: ${JSON.stringify(liveDecisionValue)}`);
}
if (
  liveDecisionValue.transportIssues.length !== cooldownTransportReportIds.length ||
  !cooldownTransportReportIds.every((id) => liveDecisionValue.transportIssues.some((issue) => issue.id === id))
) {
  throw new Error(`Live recovery decision created duplicate transport reports: ${JSON.stringify(liveDecisionValue)}`);
}
const postCanaryRetryNote = liveDecisionValue.retryDecision?.accepted?.find((entry) => String(entry).includes("LLM_TRANSPORT_RETRY"));
if (!postCanaryRetryNote || !String(postCanaryRetryNote).includes("recovered after 2 attempts")) {
  throw new Error(`Post-canary timeout recovered without exposing transport retry evidence: ${JSON.stringify({ liveDecisionValue, callLog })}`);
}
if (calls.health !== 3) {
  throw new Error(`Expected exactly three health canary calls, got ${calls.health}`);
}
if (calls.decision < 12) {
  throw new Error(`Expected live decision after health recovery, got calls ${JSON.stringify(calls)}`);
}

const gptOssChat = await verifyGptOssChatAdapter(browser);

const panelText = await page.locator("#aiBugPanel").innerText();
let reportReviewText = await page.locator("#aiReportReviewPanel").innerText();
for (const label of ["LLM PARSER", "LLM TRANSPORT", "mock:latest failed", "SAVED"]) {
  if (!panelText.includes(label)) {
    throw new Error(`Mocked Ollama QA did not render ${label} in the run-local AI bug panel: ${panelText}`);
  }
}
for (const syntheticLabel of ["mock:latest failed"]) {
  if (reportReviewText.includes(syntheticLabel)) {
    throw new Error(`Default live report review leaked synthetic mocked label ${syntheticLabel}. Report review: ${reportReviewText}`);
  }
}
await setReportReviewScope(page, "synthetic");
await page.waitForFunction(
  () => {
    const parsed = JSON.parse(window.render_game_to_text());
    const text = document.querySelector("#aiReportReviewPanel")?.textContent ?? "";
    return parsed.aiReportReview?.filters?.scope === "synthetic" && text.includes("mock:latest failed") && text.includes("LLM parser");
  },
  null,
  { timeout: 15_000 }
);
reportReviewText = await page.locator("#aiReportReviewPanel").innerText();

await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshot = await stat(screenshotPath);
if (screenshot.size < 50_000) {
  throw new Error(`Mocked Ollama screenshot looks too small: ${screenshot.size}`);
}

await browser.close();

if (errors.length > 0) {
  throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      screenshotPath,
      screenshotBytes: screenshot.size,
      calls,
      parserIssue: parserValue.issue,
      transportIssue: transportValue.issue,
      cooldown: cooldownValue.cooldown,
      cooldownDecision: cooldownValue.latestDecision,
      failedCanary: failedCanaryValue.cooldown,
      restoredStatus: restoredValue.status,
      liveDecision: liveDecisionValue.latestDecision,
      gptOssChat,
      postCanaryRetryNote,
      callLog,
      parserBucket: transportValue.parserBucket,
      transportBucket: transportValue.transportBucket,
      warnings
    },
    null,
    2
  )
);

async function advancePastCooldown(page) {
  await page.evaluate(() => {
    for (let i = 0; i < 5; i += 1) {
      window.advanceTime?.(30_000);
    }
  });
}

async function setReportReviewScope(page, scope) {
  await page.evaluate((nextScope) => {
    const scopeInput = document.querySelector("#reportScopeFilter");
    if (scopeInput instanceof HTMLSelectElement) {
      scopeInput.value = nextScope;
      scopeInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, scope);
}

async function verifyGptOssChatAdapter(browser) {
  const gptPage = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const gptErrors = [];
  const gptCalls = {
    chat: 0,
    generate: 0,
    identity: 0
  };
  gptPage.on("console", (message) => {
    if (message.type() === "error") gptErrors.push(`console error: ${message.text()}`);
  });
  gptPage.on("pageerror", (error) => gptErrors.push(`pageerror: ${error.message}`));
  await gptPage.route("**/ollama/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "gpt-oss:20b", model: "gpt-oss:20b" }] })
    });
  });
  await gptPage.route("**/ollama/api/generate", async (route) => {
    gptCalls.generate += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "gpt-oss must use chat adapter in this smoke" })
    });
  });
  await gptPage.route("**/ollama/api/chat", async (route) => {
    gptCalls.chat += 1;
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (body.model !== "gpt-oss:20b" || body.stream !== false || body.think !== "low" || !Array.isArray(body.messages) || body.prompt) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: `bad gpt-oss chat body ${JSON.stringify(body)}` })
      });
      return;
    }
    const properties = body.format?.properties ?? {};
    let content;
    if (Object.prototype.hasOwnProperty.call(properties, "freeformStrategy")) {
      content = validDecisionJson("Mock gpt-oss chat adapter decision.");
    } else if (Object.prototype.hasOwnProperty.call(properties, "realmName")) {
      gptCalls.identity += 1;
      content = JSON.stringify({
        realmName: `Chat Adapter March ${gptCalls.identity}`,
        sovereignName: `Ada of the Low Think ${gptCalls.identity}`,
        namingStyle: "short adapter names",
        inspiration: "gpt-oss chat adapter smoke",
        unitNames: []
      });
    } else if (Object.prototype.hasOwnProperty.call(properties, "ok")) {
      content = JSON.stringify({ ok: true });
    } else if (Object.prototype.hasOwnProperty.call(properties, "strategyNote")) {
      content = validReplyJson();
    } else {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "unknown gpt-oss chat schema" })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: {
          role: "assistant",
          thinking: "adapter smoke private reasoning",
          content: `<think>hidden adapter smoke reasoning</think>${content}`
        },
        done: true
      })
    });
  });

  await gptPage.goto(url, { waitUntil: "domcontentloaded" });
  await gptPage.waitForSelector("canvas", { timeout: 15_000 });
  const gptState = await gptPage.waitForFunction(
    () => {
      if (typeof window.render_game_to_text !== "function") return null;
      const parsed = JSON.parse(window.render_game_to_text());
      const latestDecision = parsed.latestAiDecisions?.find(
        (decision) => decision.model === "gpt-oss:20b" && decision.summary?.includes("Mock gpt-oss chat adapter decision")
      );
      const quality = parsed.llm?.modelQuality?.find((entry) => entry.model === "gpt-oss:20b" && entry.liveDecisions >= 1);
      const panel = document.querySelector("#llmPanel")?.textContent ?? "";
      return latestDecision && quality
        ? {
            assignments: parsed.llm?.modelAssignments,
            activeModel: parsed.llm?.activeModel,
            latestDecision,
            quality,
            panel
          }
        : null;
    },
    null,
    { timeout: 90_000 }
  );
  const value = await gptState.jsonValue();
  await gptPage.close();
  if (gptErrors.length > 0) {
    throw new Error(`gpt-oss chat adapter smoke emitted errors:\n${gptErrors.join("\n")}`);
  }
  if (gptCalls.generate !== 0 || gptCalls.chat < 1) {
    throw new Error(`gpt-oss chat adapter did not use only /api/chat: ${JSON.stringify({ gptCalls, value })}`);
  }
  if (!value.panel.includes("Chat adapters: gpt-oss:20b via /api/chat")) {
    throw new Error(`AI Observer panel did not expose gpt-oss chat adapter: ${value.panel}`);
  }
  return {
    calls: gptCalls,
    activeModel: value.activeModel,
    assignments: value.assignments,
    quality: value.quality,
    summary: value.latestDecision.summary
  };
}

function reportMatchesFailureKind(report, kind) {
  const text = String(report ?? "").toLowerCase();
  return text.includes(kind) && (text.includes("failure") || text.includes("deterministic fallback used after trying"));
}

function recoverableIdentityJson(index) {
  const payload = {
    realmName: `Mock Realm ${index}`,
    sovereignName: `Mock Sovereign ${index}`,
    namingStyle: `Mock style ${index}`,
    inspiration: "deterministic mocked Ollama smoke",
    unitNames: []
  };
  const json = JSON.stringify(payload);
  return `Here is the identity:\n\`\`\`json\n${json.slice(0, -1)},\n\`\`\``;
}

function validDecisionJson(strategySummary = "Mock decision returned after deterministic failures.") {
  return JSON.stringify({
    freeformStrategy: "Mock recovery strategy after transport checks.",
    strategySummary,
    memoryNote: "Mocked Ollama transport and parser QA completed.",
    orders: [
      {
        type: "SET_POLICY",
        priority: 1,
        messageType: "LETTER",
        diplomacyIntent: "NONE",
        subject: "",
        body: "",
        reason: "Continue deterministic mocked QA."
      }
    ],
    unitNames: [],
    bugReport: "",
    bugSeverity: "low"
  });
}

function validReplyJson() {
  return JSON.stringify({
    strategyNote: "Mock reply acknowledges the incoming message.",
    memoryNote: "Mock reply path stayed available.",
    subject: "Re: mocked message",
    body: "We received the mocked messenger and will continue talks.",
    diplomacyIntent: "PEACE_OFFER",
    bugReport: "",
    bugSeverity: "low"
  });
}
