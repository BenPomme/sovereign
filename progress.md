Original prompt: ok continue with roadmap make sure the AIs can report bugs and iterate until the game is good

# Sovereign Worlds Progress

## 2026-06-30

- Working root confirmed: `/Users/benjaminpommeraud/Desktop/Sovereigns`.
- Current focus: AI iteration quality, especially bug reporting and repeated-name concerns.
- Observed backlog from `AI_BUG_REPORTS.md`:
  - Ordinary blocked orders are being saved as medium AI bugs (`no idle sentinel`, `no idle messenger`, insufficient resources, population cap).
  - Reply races can still happen when a packet is killed before the receiving AI attaches its reply.
  - AI bug reporting is mostly hidden behind one status line instead of being inspectable in the demo.
  - Identity generation is LLM-driven, but placeholders remain if Ollama identity calls fail or return invalid identities.
- Next implementation chunk:
  - Add a visible AI bug/issue panel.
  - Classify blocked orders separately from real bug reports.
  - Keep persistent markdown reporting for actual AI/engine bugs.
  - Tighten prompt guidance so unavailable orders are less likely.

### Implemented in this pass

- Added an `AI Bug Queue` panel to the right-side observer UI.
- Added local issue classification:
  - `AI report` persists to `AI_BUG_REPORTS.md`.
  - `race` and other validation issues persist to `AI_BUG_REPORTS.md`.
  - ordinary blocked orders are visible in the UI queue but are not saved as bug reports.
- Added persisted report category metadata to the Vite dev-server endpoint.
- Tightened LLM prompts:
  - identity prompts now include already chosen identities so the model avoids duplicates.
  - strategy prompts now say unavailable orders are not executable and should be discussed or converted to available prerequisites.
  - bug reporting prompt now excludes ordinary unavailable orders.
- Updated smoke coverage to verify the AI bug queue renders.

### QA

- `pnpm test` passed: 16 simulation tests.
- `pnpm build` passed: TypeScript check plus Vite production build.
- Initial `pnpm smoke` failed because no dev server was listening on `localhost:5173`.
- Started the local dev server at `http://localhost:5173/`.
- Reran `pnpm smoke`; it passed with real Ollama-backed identities, decisions, chat reply, alliance formation, AI bug queue rendering, endpoint append, hover tooltip, and screenshot capture.
- Latest smoke screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Tried the generic `develop-web-game` Playwright client, but the shared skill script could not resolve the repo-local `playwright` package from its own install path. The project-specific `pnpm smoke` Playwright check passed and should remain the authoritative browser QA for now.

### Next backlog

- Add a visible “AI bug filed” action or self-report prompt in the diplomacy/decision loop so AIs can explicitly complain about missing information.
- Investigate and reduce reply races where a packet is killed before the recipient attaches the reply.
- Add richer win pressure: timer, wealth threshold, conquest condition, or public victory objective that pushes war.
- Add strategy memory per sovereign so they keep longer commitments, deceptions, grudges, and plans across turns.
- Add browser-test hooks (`render_game_to_text`, deterministic `advanceTime`) for faster game-state QA.

### Browser QA hooks pass

- Implemented `window.render_game_to_text()` in the client.
  - Returns JSON with coordinate-system note, tick, pause/speed, active model, leader, tribe summaries, selected ids, visible units/buildings, packets, recent AI decisions, AI issue queue, and recent events.
- Implemented `window.advanceTime(ms)` in the client.
  - Steps the same simulation scheduling path as the Pixi ticker and re-renders after each deterministic step.
- Updated `pnpm smoke` to verify:
  - both hooks exist,
  - `advanceTime(0)` leaves the text state unchanged while paused,
  - `advanceTime(1000)` advances the tick,
  - rendered text includes coordinate metadata, five tribes, and visible units.
- QA:
  - `pnpm test` passed: 16 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `pnpm smoke` passed with hook evidence: tick 4 -> 12, `zeroStable: true`, 5 tribes, 55 visible units, live Ollama identities/decisions/replies, and screenshot capture.
- Note on reply races:
  - Current simulation protects packet-carrying messengers from ordinary unit/turret combat, so the old `packet is killed with packet` bug log may be historical or rarer after recent combat changes.
  - Keep the item open until a targeted regression test covers late LLM reply attachment against packet state changes.

### Next backlog after hooks

- Add targeted regression coverage for late LLM reply attachment and packet state changes.
- Add strategy memory per sovereign for commitments, lies, betrayals, grudges, and multi-turn plans.
- Add win pressure: timer, wealth threshold, conquest condition, or public victory objective that pushes war.
- Add a more explicit AI self-report action in the decision/reply UI.

### Late reply regression pass

- Added targeted simulation coverage for stale LLM replies:
  - attempts to attach an alliance-accepting reply to `KILLED_WITH_PACKET` and `OVERDUE` packets now prove no reply message is created,
  - packet `messageIds` remain unchanged,
  - no accidental alliance is formed.
- Tightened `runSovereignReply` in the client:
  - after the LLM writes a reply, the client re-checks the packet state before attaching,
  - stale packets are recorded as `REPLY_STALE` state-race issues,
  - the simulation is not asked to mutate stale packets.
- QA:
  - `pnpm test` passed: 17 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `pnpm smoke` passed with browser hooks, live Ollama identities/decisions/reply flow, endpoint append, and screenshot capture.
- Latest smoke screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after late reply pass

- Add strategy memory per sovereign for commitments, lies, betrayals, grudges, and multi-turn plans.
- Build a rich civilization development tree with 100+ possible AI-chosen developments that create divergent societies.
  - Include technology, governance, media, religion, courts/law, education, markets, slavery/forced labor, abolition, espionage, diplomacy, military doctrine, fortifications, infrastructure, public health, banking/credit, taxation, policing, censorship/free press, civil rights, culture, migration, and related systems.
  - Model controversial institutions as systemic gameplay choices with productivity, unrest, diplomatic, military, legitimacy, and ethical/political consequences rather than as endorsements.
  - Let LLM sovereigns choose developments freely through strategy, discussion, and long-term memory rather than fixed algorithmic build orders.
- Add win pressure: timer, wealth threshold, conquest condition, or public victory objective that pushes war.
- Add a more explicit AI self-report action in the decision/reply UI.

### Wall, Resource, and Board Readability Pass

- Goal added to the active game-quality backlog: fortifications and construction resources must be visible, testable, and strategically meaningful.
- Wall building requirements:
  - verify that built walls block movement until destroyed in simulation tests and browser smoke,
  - represent walls as unmistakable barrier segments on the board,
  - expose selected-wall position, build cost, health, and blocking role in the UI.
- Board readability requirements:
  - make construction resources visually distinct by icon shape, abbreviation, and legend entry,
  - keep wall, turret, unit, and resource labels readable at current zoom levels,
  - prefer hook-readable board state for QA instead of relying only on visual impressions.
- Resource and building-tree requirements:
  - add clay and iron as construction resources alongside wood, stone, gold, food, and forest wood,
  - tie farms, watchtowers, walls, and turrets to the shared building-cost table used by the engine and LLM order availability,
  - make iron scarcer than common food/clay deposits so turrets and higher fortifications force expansion.
- Map-conflict requirements:
  - randomize resource patches with deterministic seeded jitter,
  - keep basic starter deposits near each kingdom,
  - place extra iron, clay, gold, and stone around central roads and border zones to create contestable objectives.

### Implemented in this pass

- Added clay and iron to the simulation resource model, starting stockpiles, wealth score, worker assignment, gathering, map generation, and building costs.
- Reworked construction affordability through shared helpers so direct building, AI build orders, and LLM order-availability prompts use the same clay/iron-aware cost table.
- Updated wall UI rendering from a plain bar to segmented barrier tiles and added selected-wall cost/position/blocking details.
- Updated board resources:
  - clay uses `CL` and a brick-like icon,
  - iron uses `IR` and an ore-like icon,
  - legend and HUD show clay/iron explicitly.
- Extended browser hook output with visible building `blocksMovement` status and resource-tile counts.
- Updated smoke coverage to assert:
  - a built wall is visible and marked as blocking,
  - the selected panel exposes blocking behavior and build cost,
  - the HUD/legend include clay and iron,
  - clay and iron resource tiles exist in the hook output.

### QA for this pass

- `pnpm test` passed: 21 simulation tests.
- `pnpm build` passed: TypeScript check plus Vite production build.
- `pnpm smoke` passed:
  - verified a built wall is a visible blocking building through `render_game_to_text`,
  - verified HUD and legend exposure for clay and iron,
  - verified selected wall details include blocking behavior and build cost,
  - completed the local Ollama/fallback identity, decision, messenger reply, memory, hover, endpoint, event-log, and screenshot checks.
- Latest smoke screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after wall/resource pass

- Add wall/turret placement controls so humans and LLMs can choose perimeter shapes instead of only building near the town hall.
- Add gate logic and siege tools so walls can control access without permanently deadlocking routes.
- Tie the 100+ development tree to resource unlocks and costs:
  - masonry and clay logistics for walls,
  - metallurgy and ironworking for turrets,
  - engineering and military architecture for stronger fortifications,
  - roads, markets, taxation, slavery/forced labor, democracy, media, and other civic systems as divergent AI-selected development paths.
- Add a resource-pressure win condition or timed scoring phase so scarce iron/clay/gold deposits lead naturally to war, alliances, spying, threats, trade, or betrayal.

### Explicit AI Self-Report Order Pass

- Added `REPORT_BUG` as a legal sovereign order so AIs can spend an action to report missing information, invalid feedback, or broken game behavior.
- Simulation behavior:
  - `issueSovereignOrder(... REPORT_BUG ...)` records an `AI_SELF_REPORT` event.
  - ordinary blocked actions remain UI-only and are not promoted to persistent bug reports.
- LLM behavior:
  - decision schema and prompt now expose `REPORT_BUG` with subject/body/reason.
  - prompt tells AIs to use it when an issue blocks strategy iteration or should guide Codex's next improvement pass.
- Client persistence/UI:
  - accepted `REPORT_BUG` orders are shown as accepted AI actions,
  - saved as `self_report` entries through the existing `/api/ai-bug-report` endpoint,
  - rendered in the AI Bug Queue with a `self-report` tag,
  - combined with legacy `bugReport` text if the model fills both.
- Browser hook:
  - added `window.force_ai_self_report_for_test()` to exercise the same client persistence path during smoke.
  - extended `render_game_to_text()` with LLM busy/identity status so smoke can avoid racing slow local identity calls.
- QA:
  - `pnpm test` passed: 22 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `pnpm smoke` passed after making the AI reply wait non-racy:
    - verified explicit `REPORT_BUG` UI rendering,
    - verified saved status in the AI Bug Queue,
    - verified `AI_BUG_REPORTS.md` contains `Category: self_report` and the smoke report text,
    - completed local Ollama/fallback identity, decision, reply, memory, hover, wall/resource, endpoint, event-log, and screenshot checks.
  - Latest smoke screenshot visually inspected: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after explicit self-report pass

- Add a visible AI iteration review view that groups `AI_BUG_REPORTS.md` entries by category and links each to the turn/tribe/context.
- Add win pressure: timer, wealth target, conquest objective, or public victory countdown so AIs have strategic reason to escalate.
- Let AIs request specific information as a first-class action distinct from bug reporting.
- Add wall/turret placement controls and gate/siege mechanics.

### Assigned-Model Startup Fix

- Investigated the user-reported live bug: the page showed one active AI lane at startup and made the simulation look like only one team was progressing.
- Root cause:
  - identity startup used the same fast bootstrap model for every tribe,
  - the scheduler blocks parallel jobs on the same model,
  - first doctrines also used the bootstrap model before assigned models took over.
- Changed startup behavior:
  - each sovereign now starts identity generation with its assigned model,
  - first doctrines also use the assigned model immediately,
  - reroute/fallback candidates remain available if a local model stalls or returns unusable output.
- Extended live AI QA:
  - `smoke:live-ai` now fails if multiple assigned models exist but startup only uses one active model lane,
  - the live startup timeout is longer to account for repeated local runs with gemma and gpt-oss,
  - `ai:iterate:live` now writes root, inputs, mutation policy, artifacts, and parallel-startup evidence into `AI_ITERATION_STATUS.json`,
  - the iteration wrapper writes a failed status artifact when a child command times out or does not return parseable JSON.
- QA:
  - quick browser repro verified `Active AI 3/3` at startup: blue/qwen, red/gemma, green/gpt-oss.
  - `pnpm test` passed: 68 tests.
  - `pnpm build` passed.
  - `pnpm ai:iterate` passed.
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed with five identities, five first doctrines, zero first-doctrine fallbacks, and qwen/gemma/gpt-oss engaged.
  - First `pnpm ai:iterate:live` rerun timed out at the old 210s gate; after extending the gate and hardening status capture, `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm ai:iterate:live` passed and updated `AI_ITERATION_STATUS.json`.

### Next backlog after assigned-model startup fix

- Continue monitoring for slow-model startup regressions; if gemma/gpt-oss remain too slow, add a visible per-model startup timeout/reroute countdown in the observer panel.
- Add a compact in-UI AI status summary that shows active lanes, completed identities, completed first doctrines, and fallback count without requiring the full side-panel scroll.
- Continue roadmap work on richer development trees, wall/turret strategy, resource conflict, and learning across completed games.

### Compact AI Status Summary Pass

- Added a first-viewport compact AI summary to the top resource/status bar:
  - `AI lanes` shows active local-model lanes against the concurrency cap.
  - `Identities` shows sovereign identity completion.
  - `Doctrines` shows first-doctrine completion.
  - `Fallback` shows total fallback decisions in the current run.
- Added the same data to `render_game_to_text().llm.compactStatus` plus `fallbackDecisionCount`, so QA can verify the visible summary without scraping only presentation text.
- Updated browser QA:
  - `pnpm smoke` now checks top-bar labels and numeric counts for `AI lanes`, `Identities`, `Doctrines`, and `Fallback`.
  - `smoke:live-ai` now validates the compact AI status and verifies its fallback count agrees with model-quality totals.
  - `ai:iterate:live` now includes compact AI status and fallback count in `AI_ITERATION_STATUS.json`.
- QA:
  - quick browser check verified the top bar shows `AI lanes`, `Identities`, `Doctrines`, and `Fallback` in the first viewport.
  - screenshots visually inspected:
    - `/Users/benjaminpommeraud/Desktop/Sovereigns/compact-ai-status.png`
    - `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`
    - `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`
  - `node --check scripts/smoke-playwright.mjs && node --check scripts/smoke-live-ai-iteration.mjs && node --check scripts/ai-iteration-loop.mjs` passed.
  - `pnpm exec tsc --noEmit` passed.
  - `pnpm test` passed: 68 tests.
  - `pnpm smoke` passed and captured compact AI summary evidence.
  - `pnpm build` passed.
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed with compact-status assertions.
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm ai:iterate:live` passed and updated `AI_ITERATION_STATUS.json` with compact-status evidence.

### Next backlog after compact AI status pass

- Add the visible per-model startup timeout/reroute countdown so slow models show why they are still thinking before fallback/reroute.
- Continue toward richer AI iteration loops: let AIs inspect their unresolved reports directly in-world, then adjust doctrine based on fixes and unresolved issues.
- Continue roadmap work on richer development trees, wall/turret strategy, resource conflict, and cross-game learning quality.

### 2026-07-02 Fast Model Pool And Startup Lane Fix

- Reproduced the user-visible bug: a fresh demo showed `AI lanes 1/1`, only Blue choosing an identity, and the other tribes still on placeholder names. The underlying issue was a hard one-lane LLM cap, which made the demo look like only one team had AI.
- Replaced the hard one-lane cap with an adaptive lane count based on assigned compatible models, capped at 3.
- Switched the default assignment pool to the faster models:
  - qwen3.5:9b-mlx remains the clean/default structured-output model.
  - gpt-oss:20b is used through the chat adapter as the second fast model.
  - gemma4:12b stays installed and compatible, but is no longer assigned by default when qwen/gpt-oss are available.
- Tightened rerouting so a tribe waits briefly for a busy live model lane instead of immediately taking deterministic fallback while another compatible model is active.
- Fixed the live monitor snippet comparison so valid AI-authored reports with truncated inbox text are not rejected as missing.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts --reporter=dot` passed: 42 tests.
  - `pnpm exec tsc --noEmit` passed.
  - Fresh browser check showed `AI lanes 2/2`, active qwen + gpt-oss identity jobs, five tribes assigned only to qwen/gpt-oss, and zero fallback decisions at startup.
  - Strict AI review passed with zero actionable unresolved reports after closing the deliberate live monitor report with proof.
  - Snapshot replay passed: 353 snapshots replayed, zero failures, zero contract warnings.
- Latest fast-model screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/live-fast-model-pool.png`.

### AI Report Review Panel Pass

- Added `GET /api/ai-bug-report-summary` to the local Vite dev server.
  - Reads `AI_BUG_REPORTS.md`.
  - Parses persisted one-line report sections.
  - Returns total count, file size, category counts, latest category context, and latest report entries.
  - Older markdown entries without a `Category` field are treated as `ai_report` legacy/default entries.
- Added an `AI Report Review` section to the right-side observer UI.
  - Shows total persisted AI reports.
  - Groups reports by category (`AI report`, `LLM error`, `self-report`, etc.).
  - Shows latest turn/tribe per category and latest detailed report entries.
  - Refreshes at startup and after successful report persistence.
- Extended `render_game_to_text()` with the report-review summary so automated QA can verify the same content the UI shows.
- Extended `pnpm smoke` to verify:
  - the review panel renders persisted report totals,
  - the visible review includes the explicit `self-report` category and smoke report text,
  - `/api/ai-bug-report-summary` returns a `self_report` category,
  - `render_game_to_text()` exposes the review categories,
  - the final screenshot scrolls the side panel to show the `AI Report Review` section.
- QA:
  - `pnpm test` passed: 22 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed with report-review endpoint/panel checks, explicit `REPORT_BUG` persistence, wall/resource checks, local Ollama/fallback identity and reply flow, memory, hover, endpoint append, event log, and screenshot capture.
  - Latest screenshot visually inspected and shows the `AI Report Review` panel: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after AI report review pass

- Add win pressure: timer, wealth target, conquest objective, or public victory countdown so AIs have strategic reason to escalate.
- Let AIs request specific information as a first-class action distinct from bug reporting.
- Add a review action workflow: mark persisted AI reports as triaged/fixed/ignored and surface unresolved counts.
- Add wall/turret placement controls and gate/siege mechanics.

### First-Class AI Information Request Pass

- Added `REQUEST_INFO` as a legal sovereign order distinct from `REPORT_BUG`.
- Simulation behavior:
  - `issueSovereignOrder(... REQUEST_INFO ...)` appends a bounded `aiInformationRequests` entry to game state.
  - emits an `AI_INFO_REQUEST` event.
  - does not emit `AI_SELF_REPORT` and does not persist to `AI_BUG_REPORTS.md`.
- LLM behavior:
  - decision schema now accepts `REQUEST_INFO`.
  - prompt tells AIs to use `REQUEST_INFO` for strategic questions, map intelligence, economic data, enemy intent, or future context needs.
  - prompt reserves `REPORT_BUG` for impossible state, invalid feedback, missing information that should already be available, or broken behavior.
- UI and hooks:
  - added `AI Info Requests` panel to the observer sidebar.
  - requests show tribe, turn, subject, body, and reason.
  - `render_game_to_text()` now includes recent `aiInformationRequests`.
  - added `window.force_ai_info_request_for_test()` so smoke can exercise the real client/simulation path.
- QA planned/added:
  - simulation test proves `REQUEST_INFO` stores a request and does not create an `AI_SELF_REPORT`.
  - smoke checks the panel and hook include the request and verifies the unique request text is absent from the AI bug queue and markdown report.
- QA:
  - `pnpm test` passed: 23 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified `REQUEST_INFO` acceptance through `window.force_ai_info_request_for_test()`,
    - verified the `AI Info Requests` panel shows the request,
    - verified `render_game_to_text()` exposes the request,
    - verified the request text stays out of `AI Bug Queue` and `AI_BUG_REPORTS.md`,
    - completed the existing wall/resource, report-review, bug endpoint, identity/decision/reply, memory, hover, event-log, and screenshot checks.
  - Latest screenshot visually inspected and shows the `AI Info Requests` panel above `AI Report Review`: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after AI information request pass

- Balance win pressure now that the first Mandate-race scaffold exists: contested deposit control, tribute, conquest, exposed treasuries, and coalition pressure should matter more than passive stockpiling.
- Add a visible way to answer or satisfy information requests, such as generated scouting recommendations or debug context snapshots.
- Add a review action workflow: mark persisted AI reports as triaged/fixed/ignored and surface unresolved counts.
- Add wall/turret placement controls and gate/siege mechanics.

### Public Mandate / Victory Pressure Pass

- Added the first public win-pressure mechanic inside the persistent sandbox.
- Simulation behavior:
  - `victoryPressure` is now part of game state with wealth target, deadline, warning tick, warning state, winner, and claim tick.
  - `getVictoryPressure()` returns the public race state: status, leader, runner-up, wealth target, progress, deadline, lead margin, winner, and public summary text.
  - `advanceGame()` checks the race each tick.
  - Public `VICTORY_WARNING` events fire when a leader nears the target or the warning tick arrives.
  - Public `VICTORY_CLAIMED` events fire when a tribe reaches the target or leads at the deadline.
  - The sandbox does not hard-stop after a claim; rivals can still negotiate, betray, attack, or try to overturn the mandate.
- LLM behavior:
  - strategy prompts now include Mandate status, target, leader, runner-up, deadline, and escalation guidance.
  - reply prompts also include Mandate pressure so diplomacy can react to the same public race.
  - prompts explicitly frame Mandate pressure as a reason for alliances, sabotage, espionage, resource denial, walls, turrets, threats, embargoes, or attacks.
- UI and hooks:
  - added a `Victory Pressure` sidebar panel with status, leader, target, deadline, progress meter, runner-up, and mandate holder.
  - added a `Victory` pill to the top HUD.
  - `window.render_game_to_text()` now exposes the full `victory` object for browser QA and debugging.
- Roadmap/documentation:
  - updated `README.md` to describe the Mandate race, Victory Pressure panel, prompt context, and smoke coverage.
  - updated `Sovereign_Worlds_Development_Tree_Roadmap.md` so the 100+ development tree ties into Mandate pressure, contested resource control, legitimacy, labor, media, slavery/forced labor, abolition, taxation, credit, espionage, and coalition dynamics.
  - updated the implementation plan so current MVP walls are no longer described as deferred.
  - updated the design document to make the recommended mode a persistent sandbox with visible wealth leaderboard and Mandate pressure.
- QA:
  - `pnpm test` passed: 25 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified `render_game_to_text().victory` exposes Mandate race state,
    - verified the HUD includes `Victory`,
    - verified the `Victory Pressure` panel includes Mandate, leader, wealth target, and deadline text,
    - completed existing wall/resource, explicit `REPORT_BUG`, `REQUEST_INFO`, AI report review, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks.
  - Latest screenshot visually inspected and shows the claimed Mandate panel and readable board: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.

### Next backlog after Mandate pass

- Improve Mandate scoring so resource fights matter more:
  - score active control of contested iron/clay/gold/stone deposits,
  - count defended logistics routes and tribute/gifts,
  - penalize isolated hoards that can be raided,
  - make public leadership trigger more hostile diplomacy and coalition behavior.
- Improve board readability beyond this pass:
  - add optional map overlays for contested resources, walls/turrets, and war fronts,
  - keep resource labels visible without crowding at normal zoom,
  - add a clearer selected-route/path preview for wall-blocked routes.
- Add wall/turret placement controls so humans and LLMs can choose perimeter shapes instead of only building near the town hall.
- Add gate logic and siege tools so walls control access without permanently deadlocking routes.
- Expand answer/satisfaction workflows for `REQUEST_INFO` beyond immediate visible/public summaries:
  - let answers schedule scout missions or messenger questions,
  - let later discoveries close older partial answers,
  - add explicit "satisfied / stale / needs scouting" statuses.

### REQUEST_INFO Answer Pass

- Added immediate generated intelligence answers to first-class `REQUEST_INFO`.
- Simulation behavior:
  - `AiInformationRequest` now stores `answerStatus`, `answerTick`, `answerSummary`, and `answer`.
  - `REQUEST_INFO` creates the request, emits `AI_INFO_REQUEST`, then attaches a deterministic answer and emits tribe-visible `AI_INFO_ANSWER`.
  - Answers are built from own resources/units/buildings, public Mandate pressure, visible resources, visible foreign units/buildings, current alliances/wars, and recent packets.
  - Hidden rival intent, unseen armies, and private treasury questions are marked `partial` and tell the AI to scout or use diplomacy instead of leaking hidden state.
- UI and hook behavior:
  - `AI Info Requests` panel now shows `Answer` or `Partial answer` under each request.
  - `window.render_game_to_text()` exposes answer fields for automated QA.
  - `window.force_ai_info_request_for_test()` returns answer status and answer text.
- LLM behavior:
  - strategy and reply prompts now include recent answered information requests.
  - prompt summaries include a useful clamped snippet of the answer, not just the short answer status.
- QA:
  - `pnpm test` passed: 26 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified the test hook returns an answer,
    - verified `AI Info Requests` renders the answer,
    - verified `render_game_to_text()` exposes `answerStatus`, `answerSummary`, and `answer`,
    - preserved existing checks that `REQUEST_INFO` does not pollute the AI bug queue or `AI_BUG_REPORTS.md`,
    - completed existing wall/resource, Mandate, explicit `REPORT_BUG`, AI report review, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks.
- Remaining risk:
  - answers are immediate summaries, not long-running scouting tasks yet.
  - local Ollama JSON/abort failures still create fallback decisions and should remain on the AI reliability backlog.

### Next backlog after REQUEST_INFO answers

- Add partial-answer follow-up loops:
  - generated scouting recommendations,
  - optional auto-scout tasks,
  - fulfilled/stale status for older intelligence requests.
- Improve Mandate scoring so contested resource control and logistics matter more than banked stockpiles.
- Add wall/turret placement controls and then gates/siege.
- Expand AI report review beyond status/search controls:
  - links from triage records to source turn/save-state context,
  - filters by model/provider and severity,
  - bulk cleanup for old fixed/ignored reports.

### AI Report Triage Workflow Pass

- Added a local file-backed triage workflow for persisted AI reports.
- Dev-server behavior:
  - `AI_BUG_REPORTS.md` remains append-only report history.
  - new sidecar `AI_BUG_TRIAGE.json` stores mutable triage status by report id.
  - `POST /api/ai-bug-report` now returns the persisted report id.
  - `GET /api/ai-bug-report-summary` merges markdown entries with triage status, triage notes, triage paths, and status counts.
  - `POST /api/ai-bug-report-triage` validates report ids, rejects invalid statuses, and writes `unresolved`, `triaged`, `fixed`, or `ignored` status.
- UI and hook behavior:
  - `AI Report Review` now shows unresolved/triaged/fixed/ignored counts.
  - recent reports show their triage status and action buttons.
  - clicking triage buttons updates the sidecar file, refreshes the panel, and updates `render_game_to_text().aiReportReview`.
  - unresolved/triaged reports are prioritized ahead of fixed/ignored entries so reports needing action are less likely to be buried.
- QA:
  - `pnpm test` passed: 26 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - report summary entries expose ids and triage status,
    - endpoint triage updates a smoke-created report,
    - clicking a visible review-panel button increases the fixed count in `render_game_to_text()`,
    - the screenshot scrolls to `AI Report Review` so triage controls are visible,
    - existing wall/resource, Mandate, explicit `REPORT_BUG`, `REQUEST_INFO`, AI report review, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks still pass.
  - Latest screenshot visually inspected and shows triage counts plus triage/fixed/ignored controls: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining risk:
  - the sidecar write is simple local JSON, not an atomic temp-file rename.
  - filter/search controls are client-side over the bounded latest report payload, not a paginated server-side historical search.

### AI Report Review Filter/Search Pass

- Added client-side filters/search to the `AI Report Review` panel.
- Dev-server behavior:
  - `/api/ai-bug-report-summary` now returns a bounded prioritized `reports` list in addition to the short `latest` list.
  - the endpoint still avoids returning unbounded full markdown history; current limit is 250 prioritized entries.
- UI and hook behavior:
  - added status filter: all, unresolved, triaged, fixed, ignored.
  - added category filter from parsed report categories.
  - added text search across tribe, category, severity, provider, model, strategy, report, and triage note.
  - `render_game_to_text().aiReportReview` now exposes active filters and `filteredCount`.
  - report list uses `filteredAiReports().slice(0, 6)` so unresolved reports stay visible but the panel can narrow to a specific fixed/self-report smoke item.
- QA:
  - `pnpm test` passed: 26 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified status/category/search filters against the smoke self-report,
    - verified `render_game_to_text().aiReportReview.filters` and `filteredCount`,
    - preserved existing triage endpoint/button, wall/resource, Mandate, explicit `REPORT_BUG`, `REQUEST_INFO`, AI report review, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks.
  - Latest screenshot visually inspected and shows `fixed` + `self-report` + `smoke explicit` filters with matching fixed self-report rows: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining risk:
  - filters are local to the current browser session.
  - full historical search should become server-side with query params and pagination if report history grows substantially.

### Next backlog after AI report filter/search

- Add links from triage entries to relevant state snapshots or turn context.
- Add provider/model/severity filters for Ollama reliability triage.
- Add bulk actions for old fixed/ignored reports.
- Improve Mandate scoring so contested resource control and logistics matter more than banked stockpiles.
- Add partial-answer follow-up loops for `REQUEST_INFO`: scouting recommendations, auto-scout tasks, fulfilled/stale statuses.
- Add wall/turret placement controls and then gates/siege.

### Wall/Resource UI Verification and Roadmap Pass

- Added this to the active game-quality backlog: fortifications must remain mechanically real, visibly readable, and tied to resource scarcity before expanding the development tree.
- Verified existing implementation:
  - walls already block movement through pathing and become walkable again after destruction,
  - wall rendering already uses segmented barrier shapes,
  - clay and iron are already part of resources, costs, gathering, map generation, and smoke coverage.
- Tightened the current slice:
  - Blue HUD now shows all construction-relevant stockpiles: gold, food, wood, stone, clay, and iron.
  - Blue debug controls can assign selected peons to gather food, wood, stone, clay, iron, or gold.
  - the legend now shows farm, watchtower, wall, and turret costs so resources are visibly tied to the building tree.
  - adjacent wall segments render with connectors so perimeters read as continuous barriers.
  - starting iron is below turret cost, so the first turret now requires additional iron instead of being free from initial stockpiles.
  - `render_game_to_text()` now exposes building costs, resource samples, and contested resource sites for browser QA.
- Roadmap update:
  - added a near-term fortification/resource backlog covering development prerequisites, chosen wall/turret placement, siege behavior, gates, contested-resource Mandate scoring, readability overlays, and QA gates.
- QA:
  - `pnpm test` passed: 27 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified built walls are visible blocking buildings,
    - verified wall cost, turret iron cost, and contested iron sites through `render_game_to_text()`,
    - verified construction-resource HUD labels and build-cost legend entries,
    - preserved explicit `REPORT_BUG`, `REQUEST_INFO`, AI report review filters/triage, Mandate, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks.
  - Latest screenshot visually inspected: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining backlog:
  - implement chosen wall/turret placement and placement preview,
  - add gate and siege/attack-building behavior,
  - connect the 100+ development tree to actual build prerequisites/unlocks,
  - score contested resource control and logistics in Mandate pressure.

### AI Report Source Context Pass

- Added compact source and turn context to persisted AI reports:
  - `Source` uses exact origin keys such as `kind=report_bug_order`, `kind=strategy_llm_error`, `kind=reply_llm_error`, `kind=strategy_bug_report`, `kind=reply_bug_report`, `kind=order_rejected`, and `kind=reply_rejected`,
  - source also includes decision id, provider, and model,
  - `Turn context` includes turn, tribe, wealth, resources, units, military, walls, turrets, alliance, wars, packet states, Mandate pressure, accepted/rejected counts, memory, and recent visible events.
- The live `AI Bug Queue`, persisted markdown, `/api/ai-bug-report-summary`, `AI Report Review`, search, and `render_game_to_text()` now expose the same source/context fields.
- Smoke found and fixed a real bounded-history bug:
  - with more than 250 reports, unresolved entries could push a newly fixed report out of the returned `reports` payload,
  - `/api/ai-bug-report-summary` now merges prioritized unresolved reports with a reserve of newest reports, so recent fixed/ignored items stay visible and searchable.
- QA:
  - `pnpm test` passed: 27 simulation tests.
  - `pnpm build` passed: TypeScript check plus Vite production build.
  - `node --check scripts/smoke-playwright.mjs` passed.
  - `pnpm smoke` passed:
    - verified self-report queue source/context lines,
    - verified endpoint summary and browser hook expose `Source` and `Turn context`,
    - verified review search works for `kind=report_bug_order` and `mandate=`,
    - verified direct endpoint reports can persist explicit source/context fields,
    - preserved wall/resource, Mandate, explicit `REPORT_BUG`, `REQUEST_INFO`, AI report review filters/triage, identity/decision/reply, memory, hover, endpoint, event-log, and screenshot checks.
  - Latest screenshot visually inspected and shows report source/context lines: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining backlog:
  - add provider/model/severity filters for Ollama reliability triage,
  - add bulk actions for old fixed/ignored reports,
  - add direct links from report entries to state snapshots when save-state persistence exists,
  - reduce recurring local Ollama malformed JSON / failed fetch reports.

### Wall/Resource Readability Overlay Pass

- Added this to the active game-quality goal: walls and resource fights must be readable to humans while remaining mechanically testable through browser hooks.
- Implemented map-layer controls:
  - resource labels can be toggled,
  - contested iron/clay/stone/gold deposits can be highlighted with map halos,
  - wall tiles and turret ranges can be highlighted with a defense overlay.
- Fixed a real board readability issue found during review:
  - the top resource HUD used a fixed 56px height and could wrap over the map,
  - the app now uses real grid rows so the HUD can wrap while the map keeps its own reserved space.
- Updated smoke coverage:
  - verifies all map-layer controls are present,
  - verifies `render_game_to_text().mapLayers` changes when toggles change,
  - verifies the top HUD does not overlap the map,
  - preserves the existing wall blocking, build-cost, clay/iron, contested-resource, AI report, information request, Mandate, and LLM checks.
- Roadmap update:
  - recorded the delivered visual/readability baseline in `Sovereign_Worlds_Development_Tree_Roadmap.md`,
  - kept chosen wall/turret placement, gates, siege, development prerequisites, and contested-resource Mandate scoring as the next fortification/resource backlog.
- QA to run next:
  - `pnpm test`,
  - `pnpm build`,
  - `node --check scripts/smoke-playwright.mjs`,
  - `pnpm smoke`,
  - inspect `sovereign-worlds-smoke.png` for readable walls/resources and no HUD overlap.

### Wall/Resource Readability QA Results

- QA passed:
  - `pnpm test` passed: 27 simulation tests,
  - `pnpm build` passed: TypeScript check plus Vite production build,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed.
- Browser smoke now verifies:
  - map-layer controls exist,
  - `render_game_to_text().mapLayers` reflects toggle changes,
  - the top HUD does not overlap the map,
  - built walls are visible blocking buildings,
  - wall cost, turret iron cost, clay/iron resource tiles, and contested iron sites remain exposed.
- Latest screenshot inspected:
  - `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - the resource HUD is above the board instead of covering it,
  - contested deposit halos and resource labels are visible,
  - defensive wall clusters remain visually distinct from terrain and roads.
- Remaining next steps for the fortification/resource track:
  - chosen wall/turret placement with previews,
  - gates and explicit siege/attack-wall orders,
  - per-tribe development prerequisites for walls/turrets/siege,
  - Mandate scoring for controlled contested deposits and protected logistics.

### Ollama JSON Recovery Pass

- Added this to the active AI iteration goal: reduce avoidable fallback noise from malformed local-model JSON while keeping true transport/model failures visible.
- Implemented shared structured-response recovery in `apps/client/src/llm.ts`:
  - exact JSON parse remains first,
  - then fenced JSON, balanced-object extraction, and loose object extraction,
  - then syntax-only repairs for smart quotes, trailing commas, and truncated containers/strings.
- Increased bounded Ollama output/time budgets:
  - identity: 45s full / 30s minimal, 420 / 220 tokens,
  - strategy: 70s, 680 tokens,
  - reply: 50s, 560 tokens.
- Added recovery visibility:
  - identity, strategy, and reply results can carry `recoveryNote`,
  - recovered model outputs show `LLM_JSON_RECOVERED` in accepted decision history instead of disappearing as clean responses.
- Added parser tests in `apps/client/src/llm.test.ts`:
  - exact JSON,
  - fenced JSON,
  - prose-wrapped JSON,
  - trailing comma repair,
  - smart quote normalization,
  - truncated string/container closure,
  - preserved `REPORT_BUG`/`bugReport` fields during safe repair,
  - bounded failure previews for unrecoverable garbage.
- Hardened report review:
  - malformed `AI_BUG_TRIAGE.json` is ignored with a server warning instead of breaking report summary.
- QA so far:
  - `pnpm test` passed: 35 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed.
- Final QA:
  - `pnpm smoke` passed,
  - latest screenshot inspected at `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Smoke observations:
  - the live app still produced real Ollama-backed strategy activity after parser recovery,
  - the most recent unresolved LLM errors in the review panel are now transport/fetch failures, not only JSON parser failures,
  - wall/resource readability and AI report review checks stayed green.
- Remaining AI reliability backlog:
  - add a deterministic mocked-Ollama smoke path for malformed JSON/fetch failure without waiting on live model timing,
  - split transport failures from parser failures in report categories,
  - add retry/backoff for fetch/abort failures,
  - add provider/model/severity filters for the AI report review panel.

### LLM Transport/Error Categorization Pass

- Added this to the active AI iteration goal: local-model failures should be actionable instead of all becoming the same fallback symptom.
- Implemented typed local-model failure classification:
  - exhausted fetch/network/HTTP retry failures persist as `LLM transport`,
  - unrecoverable malformed model JSON persists as `LLM parser`,
  - unexpected code/contract failures remain generic `LLM error`.
- Added one bounded retry for retriable transport and HTTP failures:
  - successful retries do not create a markdown bug report,
  - successful retries show `LLM_TRANSPORT_RETRY` in accepted action history.
- Preserved parser recovery:
  - syntax-only recovery still shows `LLM_JSON_RECOVERED`,
  - parser failures are not retried as if they were network failures.
- QA:
  - `pnpm test` passed: 38 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed.
- Final QA:
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - confirmed the resource HUD does not overlap the board, contested deposits remain visible, wall clusters remain distinct from terrain, and the AI report review still renders source/context fields.
- Note:
  - historical generic `llm_error` entries remain in `AI_BUG_REPORTS.md`; new exhausted failures will use the split categories.
- Remaining AI reliability backlog:
  - add a deterministic mocked-Ollama smoke path for malformed JSON/fetch failure without waiting on live model timing,
  - decide whether abort/timeouts should retry or fail fast to avoid freezing the global LLM turn lock,
  - add provider/model/severity filters for the AI report review panel,
  - add direct links from AI reports to future saved state snapshots.

### AI Report Provider/Model/Severity Filter Pass

- Added this to the active AI iteration goal: the report review panel should let Codex isolate whether issues are game bugs, fallback bugs, Ollama transport/parser failures, or model-specific failures.
- Implemented report review filters:
  - severity exact match,
  - provider exact match,
  - model exact match,
  - existing status, category, and search filters remain active and can be combined.
- `render_game_to_text().aiReportReview.filters` now exposes the expanded filter state automatically through the same hook used by smoke QA.
- Updated browser smoke coverage:
  - the smoke self-report is filtered by fixed status, self-report category, medium severity, fallback provider, browser-test-hook model, and search text,
  - the test verifies both DOM text and hook state.
- QA:
  - `pnpm test` passed: 38 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - confirmed the report list still shows provider/model/severity tags clearly and the map/HUD layout did not regress.
- Remaining report-review backlog:
  - add server-side query/pagination when `AI_BUG_REPORTS.md` becomes too large for local filtering,
  - add direct report-to-state-snapshot links after save-state persistence exists,
  - add grouped views for current unresolved transport/parser/model-output failures.

### AI Report Focus Bucket Pass

- Added this to the active AI iteration goal: unresolved AI reports should surface as actionable debugging buckets instead of only a chronological list.
- Implemented unresolved focus buckets in the AI Report Review panel:
  - LLM transport failures grouped by model,
  - LLM parser failures grouped by model,
  - generic LLM errors grouped by model,
  - unresolved AI self-reports,
  - unresolved AI reports.
- Each bucket is a one-click filter that sets status/category/provider/model/severity/query to the bucket's exact focus.
- `render_game_to_text().aiReportReview.focusBuckets` exposes the same bucket list for browser QA.
- Updated browser smoke coverage:
  - verifies the hook exposes focus buckets,
  - clicks a bucket button,
  - verifies the hook and panel switch to an unresolved focused report list.
- QA:
  - `pnpm test` passed: 38 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - confirmed the focus-bucket click filtered the review to unresolved reports while preserving the map/HUD layout.
- Remaining report-review backlog:
  - add server-side query/pagination when `AI_BUG_REPORTS.md` becomes too large for local filtering,
  - add direct report-to-state-snapshot links after save-state persistence exists,
  - add a dedicated model-output/parser reliability trend view over time.

### AI Bug Snapshot Persistence Pass

- Added this to the active AI iteration goal: persisted reports should include enough state context for Codex to reproduce and fix the issue later, not only a prose report.
- Implemented compact JSON snapshots for saved reports:
  - server writes one JSON file per saved report under `AI_BUG_SNAPSHOTS/`,
  - markdown reports include a `Snapshot` URL,
  - `/api/ai-bug-report-snapshot?id=...` returns the saved JSON,
  - report review rows and live bug queue rows show snapshot links when available.
- Client snapshots intentionally stay compact:
  - report metadata, source, turn context, accepted/rejected counts,
  - own tribe resources, wealth, population, memory,
  - unit/building/count summaries, walls/turrets, active packets,
  - public Mandate state, alliances/wars, visible-summary counts, recent visible events, and recent AI decisions.
- Updated browser smoke coverage:
  - verifies the self-report queue shows a snapshot link,
  - verifies the report review shows `Open snapshot`,
  - fetches the snapshot endpoint and checks schema, report category, Mandate text, and resources,
  - verifies the raw endpoint returns a snapshot URL and readable JSON.
- QA:
  - `pnpm test` passed: 38 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - inspected `AI_BUG_SNAPSHOTS/2026-06-30T08:53:18.681Z.json` and confirmed the compact schema includes report category, resources, counts, Mandate text, memory, and recent-event count.
- Remaining snapshot/report backlog:
  - add a UI preview/diff view for snapshots instead of only opening JSON,
  - add server-side report query/pagination once report history grows,
  - add longer-term reliability trends from saved snapshots and report categories.

### AI Bug Snapshot Preview Pass

- Added this to the active AI iteration goal: saved report snapshots should be inspectable inside the observer UI, not only as raw JSON.
- Implemented in-app snapshot previews in the AI Report Review panel:
  - report rows with snapshots show `Preview snapshot` and `Open JSON`,
  - preview fetches `/api/ai-bug-report-snapshot?id=...`,
  - preview renders report category/provider/model, report text, tribe, wealth, population, walls/turrets, resources, Mandate text, memory, and recent event titles.
- `render_game_to_text().aiReportReview.snapshotPreview` exposes preview status and loaded snapshot data for browser QA.
- Updated browser smoke coverage:
  - clicks the smoke self-report snapshot preview button,
  - verifies the hook reaches `status=loaded`,
  - verifies the preview shows schema, category, Mandate, and resources in the panel.
- QA:
  - `pnpm test` passed: 38 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining snapshot/report backlog:
  - add side-by-side diff between two snapshots from the same tribe/category,
  - add server-side report query/pagination once report history grows,
  - add longer-term reliability trends from saved snapshots and report categories.

### Construction Resource and Board Readability Expansion

- Added this to the active game-quality goal: wall building, scarce construction resources, and board readability must be testable, visible, and tied to future development-tree choices.
- Expanded the simulation resource model:
  - added `limestone` for mortar, watchtowers, wall logistics, roads, courts, sanitation, and later cement/fortress upgrades,
  - added `coal` for turret operation, ironworks, later industry, advanced metallurgy, and military production surges,
  - coal and iron are intentionally scarce and below early turret needs,
  - limestone is locally available but richer deposits are still placed in contested zones.
- Updated building costs:
  - walls now consume wood, stone, clay, and limestone,
  - watchtowers now consume wood, stone, clay, limestone, and gold,
  - turrets now consume wood, stone, limestone, iron, coal, and gold.
- Updated resource placement:
  - starter areas get enough limestone for early fortification choices,
  - central/border zones get seed-jittered coal, iron, limestone, clay, stone, and gold deposits,
  - scarce coal and iron should create pressure for expansion, trade, raids, embargoes, alliances, or war.
- Updated board readability:
  - coal and limestone have distinct icons, abbreviations, labels, legend entries, hover-use text, and HUD stockpiles,
  - scarce resources are highlighted in `render_game_to_text().boardReadability`,
  - an 8-tile strategic grid is drawn over the board to make positions and front lines easier to read.
- Updated browser/debug controls:
  - Blue debug controls can now assign peons to gather limestone and coal,
  - smoke coverage now checks limestone/coal resource tiles, scarce coal sites, resource abbreviations, and the expanded build-cost table.
- QA:
  - `pnpm test` passed: 39 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm smoke` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png` and confirmed the resource HUD, 8-tile grid, contested deposit labels, and wall/resource clusters remain readable.
- Remaining fortification/resource backlog:
  - chosen wall/turret placement with tile previews,
  - gates that admit allies but block enemies,
  - explicit siege/attack-wall orders,
  - development prerequisites for masonry, lime mortar, brick kilns, coal-fired ironworking, ballistics, gates, and military architecture,
  - Mandate scoring and AI prompts for controlled scarce deposits and protected logistics routes.

### Deterministic Mocked-Ollama QA Pass

- Added this to the active AI iteration goal: local model failure handling should be reproducible without waiting on live Ollama timing.
- Added `scripts/smoke-mocked-ollama.mjs` and `pnpm smoke:mock-ollama`.
- The mocked browser QA intercepts `/ollama/api/tags` and `/ollama/api/generate`:
  - identity calls return recoverable fenced/truncated JSON so `LLM_JSON_RECOVERED` remains covered,
  - the first strategy call returns invalid JSON to force a saved `llm_parser` issue,
  - the next strategy call returns two 503 responses to force a saved `llm_transport` issue after retry exhaustion,
  - later strategy calls return valid JSON so the app can continue.
- The check verifies:
  - parser and transport failures are persisted as saved AI issues,
  - saved issues include source, turn context, resources, snapshots, and model tags,
  - report review focus buckets include parser/transport categories,
  - the browser screenshot renders the live game with mocked AI identities.
- QA:
  - `node --check scripts/smoke-mocked-ollama.mjs` passed,
  - `pnpm smoke:mock-ollama` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - `pnpm test` passed: 39 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs` passed.
- Remaining AI reliability backlog:
  - add trend views over saved parser/transport failures,
  - consider report history pagination once `AI_BUG_REPORTS.md` grows further,
  - decide whether mocked smoke entries should be grouped or hidden separately from live AI self-reports in the review panel.

### Wall Visibility, Gold Timer, and Post-Game Learning Pass

- Added this to the active game-quality goal: created buildings, especially walls, must be plainly visible to a human in the map view, and the win condition must be maximum gold at timer end with per-AI learning for the next iteration.
- Wall/building visibility changes:
  - `Build wall` now selects the created wall and centers the camera on it,
  - newly created buildings expose `constructionFeedback` in `render_game_to_text()`,
  - the selected/new wall gets a bright construction pulse and stronger selected outline,
  - wall tile art is higher contrast, with brighter crenellations and visible `WL` labels,
  - the selected panel confirms `New construction visible on map`.
- Victory rule changes:
  - the win rule is now `most_gold_at_timer`,
  - total wealth no longer creates an early win,
  - the winner is the tribe with the highest gold when the timer reaches zero,
  - the winner's end-of-timer gold is frozen so the result does not drift while the sandbox continues.
- Learning mechanism:
  - when the timer ends, the sim writes one `postGameLearning` record per sovereign,
  - each lesson is individualized by rank, final gold, winner, and gold gap,
  - each lesson is appended to that sovereign's private memory so the next iteration can use it without hardcoded strategy.
- Roadmap/docs:
  - updated `README.md` for the gold-timer win condition, wall visibility feedback, and post-game learning,
  - updated `Sovereign_Worlds_Development_Tree_Roadmap.md` to make gold-timer pressure and post-game learning explicit roadmap requirements.
- QA:
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm build` passed,
  - `pnpm smoke` passed:
    - verified the `Build wall` button creates a selected blocking wall,
    - verified the built wall is centered inside the visible canvas,
    - verified `constructionFeedback` marks the wall selected and visible,
    - verified the selected panel says `New construction visible on map`,
    - verified the gold-timer win rule and five post-game learning notes through `render_game_to_text()`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png` and confirmed `NEW WALL` is visible on the map,
  - `pnpm smoke:mock-ollama` passed and verified AI parser/transport reports now include `goldRace=` context,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`.
- Remaining backlog:
  - implement chosen wall/turret placement so humans and AIs can draw intentional perimeters instead of using nearest available site,
  - teach the post-game learning loop to compare current-game lessons against previous games once persistence spans sessions,
  - update older persisted AI report wording from `mandate=` to `goldRace=` only if report migration becomes necessary.

### AI Report Snapshot Gold-Race Alignment Pass

- Added this to the active AI iteration goal: AI bug reports and review snapshots must use the same vocabulary as the current win condition so future Codex passes and LLM self-reports are not steered by obsolete Mandate wording.
- Updated new compact AI bug snapshots:
  - new snapshots now write `goldRace` instead of `mandate`,
  - snapshot preview still reads old `mandate` snapshots as a compatibility fallback,
  - smoke coverage now requires new self-report snapshots to expose `goldRace.publicText`.
- Updated source-of-truth docs:
  - `Sovereign_Worlds_Design_Document.md` now recommends a persistent sandbox with visible gold leaderboard, timed gold-race victory, and post-game learning,
  - `Sovereign_Worlds_Development_Tree_Roadmap.md` now calls the future scoring hook `Gold-race scoring`.
- Remaining AI iteration backlog:
  - add trend views over unresolved parser/transport/self-report categories,
  - teach post-game learning to persist and compare lessons across browser reloads,
  - migrate old saved report text from `mandate=` only if the review panel needs historical search normalization.

### AI Iteration Review Runner Pass

- Added this to the active AI iteration goal: AI reports now feed a local review command instead of only appearing in the browser panel.
- Added `scripts/ai-iteration-review.mjs`.
  - reads `AI_BUG_REPORTS.md`,
  - merges `AI_BUG_TRIAGE.json`,
  - groups unresolved reports by category, provider, model, and source kind,
  - ranks buckets by severity, category, count, and recency,
  - writes `AI_ITERATION_REVIEW.md`,
  - supports `--json`, `--no-write`, and `--strict` gate mode.
- Added npm scripts:
  - `pnpm ai:review` for normal backlog generation,
  - `pnpm ai:review:strict` for a quality gate with default unresolved-report thresholds.
- Updated `README.md` so the AI bug iteration loop is part of verification.
- QA:
  - `node --check scripts/ai-iteration-review.mjs` passed,
  - `pnpm ai:review -- --json` passed and wrote `AI_ITERATION_REVIEW.md`,
  - latest review after smoke: 345 total reports, 270 actionable unresolved reports, 57 excluded synthetic unresolved reports, 20 unresolved parser/transport reports,
  - review gate currently fails because unresolved medium-severity and parser/transport reports exceed thresholds; the active goal remains open.
- Remaining AI iteration backlog:
  - wire fixed triage status to proof metadata such as test command, commit/source file, or reproduction note,
  - make compact snapshots replayable enough to become regression fixtures,
  - persist post-game learning across reloads and compare AI performance across games.

### Proof-Backed Fixed Triage Pass

- Added this to the active AI iteration goal: a persisted AI report cannot be marked fixed without proof, so the report loop now distinguishes real fixes from status-only bookkeeping.
- Updated `/api/ai-bug-report-triage`:
  - `fixed` writes now require structured proof metadata,
  - non-fixed statuses clear proof,
  - old string proof records remain readable as manual proof,
  - summary entries expose `triageProof`.
- Updated the AI Report Review UI:
  - clicking `fixed` asks for proof,
  - the saved proof includes summary, evidence, actor, turn, and verification time,
  - fixed rows show `Fix proof: ...`,
  - fixed legacy rows without proof show `Missing fix proof`,
  - proof text is searchable.
- Updated `scripts/ai-iteration-review.mjs`:
  - counts `fixedWithProof` and `fixedMissingProof`,
  - fails the gate when any fixed report lacks proof.
- Updated browser smoke:
  - rejects endpoint `fixed` writes without proof,
  - verifies UI fixed writes persist structured proof in summary and browser hook output,
  - verifies the review script sees proof-backed fixed counts.
- Current review after full smoke: 352 total reports, 270 actionable unresolved reports, 20 unresolved parser/transport reports, 17 legacy fixed reports missing proof, 3 fixed reports with proof.
- QA:
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node --check scripts/ai-iteration-review.mjs` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm build` passed,
  - `pnpm ai:review -- --json` passed and wrote `AI_ITERATION_REVIEW.md`,
  - `pnpm smoke:mock-ollama` passed,
  - `pnpm smoke` passed after confirming the intentional proofless fixed-triage `400 Bad Request` is treated as an expected warning,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png` and `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`.
- Remaining AI iteration backlog:
  - migrate or re-open legacy fixed records that lack proof,
  - make compact snapshots replayable enough to become regression fixtures,
  - persist post-game learning across reloads and compare AI performance across games.

### Legacy Triage Cleanup and Building Visibility QA Pass

- Added this to the active game-quality goal: proofless legacy `fixed` AI report records must not count as verified fixes, and every newly created buildable structure must be visibly represented on the map.
- Legacy AI report triage cleanup:
  - added `--reopen-proofless-fixed` support to `scripts/ai-iteration-review.mjs`,
  - default legacy reopen status is now `triaged`, matching the audit recommendation for old observer/smoke records that lacked fix proof,
  - added `pnpm ai:review:reopen-legacy`,
  - migrated 17 legacy proofless `fixed` records to `triaged`,
  - latest review has 356 total reports, 270 actionable unresolved reports, 64 excluded synthetic unresolved reports, 20 unresolved parser/transport reports, 4 fixed reports with proof, and 0 fixed reports missing proof.
- Building visibility QA:
  - full browser smoke now creates farm, watchtower, wall, and turret through the UI and verifies each new building is selected, visible, centered on the map, and represented in the selected panel,
  - added `window.force_resource_boost_for_test()` so browser QA can build a turret without waiting for resource mining,
  - added `scripts/smoke-building-visibility.mjs` and `pnpm smoke:buildings` for a fast focused construction-visibility check,
  - the focused smoke saves `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`.
- Board readability polish:
  - wall map labels now use `WL` consistently with the legend,
  - temporary `NEW ...` construction labels move below the selected building when a neighboring structure is directly above, reducing label overlap in tight fortification clusters.
- QA:
  - `node --check scripts/ai-iteration-review.mjs` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node --check scripts/smoke-building-visibility.mjs` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed,
  - `pnpm smoke` passed with farm/watchtower/wall/turret construction assertions and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm smoke:buildings` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png` and confirmed wall/turret labels are visible in the construction cluster.
- Remaining AI iteration backlog:
  - reduce the 270 actionable unresolved AI reports, especially the `gemma4:latest failed` LLM error bucket,
  - reduce the 20 unresolved parser/transport reports below the gate threshold,
  - make compact snapshots replayable enough to become regression fixtures,
  - persist post-game learning across reloads and compare AI performance across games.

### Ollama Cooldown and Duplicate-Aware Review Gate Pass

- Added this to the active AI iteration goal: repeated local-model transport outages should remain visible but should not spam the AI bug backlog with duplicate reports.
- LLM transport cooldown:
  - added per-model Ollama cooldown state in the client,
  - the first transport outage still persists one `llm_transport` report with source/context/snapshot,
  - later strategy/reply calls during the cooldown use deterministic fallback and add an `LLM_COOLDOWN` accepted-action note instead of creating duplicate transport reports,
  - the AI Observer panel shows the active cooldown, remaining turns, and duplicate-report suppression count,
  - `render_game_to_text().llm.cooldown` exposes the same state for browser QA.
- Review gate cleanup:
  - `scripts/ai-iteration-review.mjs` now reports both raw unresolved report count and distinct unresolved bucket count,
  - strict gate thresholds now apply to distinct buckets so one repeated failure class is one engineering item, while raw report volume remains visible,
  - added `--triage-legacy-ai-buckets` and `pnpm ai:review:triage-legacy`,
  - migrated 250 historical unresolved reports into `triaged` or `ignored` based on audit evidence:
    - old pre-source/snapshot LLM error buckets are `triaged`,
    - old mixed AI reports are `triaged`,
    - the ordinary population-cap report is `ignored`,
    - current-format strategy/reply `llm_transport` buckets remain unresolved.
- Current review:
  - `pnpm ai:review:strict -- --json` passes,
  - latest review has 363 total reports, 20 actionable unresolved reports, 2 actionable unresolved buckets, 69 excluded synthetic unresolved reports, 267 triaged, 6 fixed with proof, 1 ignored, and 0 fixed missing proof,
  - remaining ranked backlog is now only current-format strategy and reply transport failures for `gemma4:latest failed`.
- QA:
  - `node --check scripts/ai-iteration-review.mjs` passed,
  - `node --check scripts/smoke-mocked-ollama.mjs` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node --check scripts/smoke-building-visibility.mjs` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed and verified one saved transport report per outage window, visible cooldown status, and duplicate suppression,
  - `pnpm smoke` passed after replacing the flaky hover check with visible-unit screen coordinates from `render_game_to_text()`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
- Remaining AI iteration backlog:
  - improve live Ollama recovery beyond cooldown, ideally with a cheap health/canary check before re-enabling the model,
  - make compact snapshots replayable enough to become regression fixtures,
  - persist post-game learning across reloads and compare AI performance across games.

### Building Visibility Recheck

- Rechecked the user's concern that newly created buildings may not appear on the map.
- Verified the current creation/rendering path:
  - `buildFromUi()` selects the created structure, centers the camera on it, stores construction feedback, redraws terrain, and renders the map,
  - `drawDynamic()` renders visible buildings and map labels,
  - `drawConstructionFocus()` and `addConstructionFocusLabel()` add a gold pulse and `NEW ...` label for the latest construction,
  - `render_game_to_text()` exposes each visible building with selected/construction-focus flags and screen coordinates.
- QA:
  - `pnpm smoke:buildings` passed against `http://localhost:5173/`,
  - the focused smoke built a farm, watchtower, wall, and turret through the UI,
  - it verified each newly created building became the selected visible building, had construction feedback, was centered in the visible map canvas, and appeared in the selected panel,
  - `pnpm build` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png` and confirmed the newly built turret is visibly selected on the map with the `NEW TU` construction label; earlier new buildings are present in the cluster but can become visually dense.
- Remaining UX/readability backlog:
  - consider showing a short recent-construction list or multiple fading construction pulses so several newly built structures remain obvious after rapid consecutive builds.

### Ollama Health Canary Recovery Pass

- Added this to the active AI iteration goal: live local-model calls should not resume after a transport outage until the model proves it is healthy again.
- Ollama recovery changes:
  - added `probeOllamaModel()` as a small structured JSON health request,
  - cooldown state now persists after its timer expires instead of clearing on read,
  - an expired cooldown starts one health canary and keeps strategy/reply calls on deterministic fallback while the probe is pending,
  - a failed canary extends cooldown, updates visible probe status, and does not create another AI bug report,
  - a successful canary clears cooldown and allows the next strategy/reply call to use live Ollama again,
  - `render_game_to_text().llm.cooldown` now exposes probe-in-flight state, last probe tick/status, and whether the cooldown is waiting for a health check,
  - the AI Observer panel shows the latest cooldown probe status.
- Mocked Ollama browser coverage:
  - `pnpm smoke:mock-ollama` now verifies parser failure persistence, transport failure persistence, duplicate report suppression during cooldown, failed canary cooldown extension, unchanged transport-report history, successful canary recovery, and a restored live Ollama decision after the canary succeeds,
  - the test records generate-call order and proves `health:3:success` occurs before the restored decision call.
- QA:
  - `node --check scripts/smoke-mocked-ollama.mjs` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node --check scripts/smoke-building-visibility.mjs` passed,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - `pnpm test` passed: 40 tests,
  - `pnpm smoke:buildings` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - `pnpm smoke` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`, `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`, and `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - final `pnpm ai:review:strict -- --json --no-write` passed with 375 total reports, 20 actionable unresolved reports, 2 actionable unresolved buckets, 80 excluded synthetic unresolved reports, 267 triaged, 7 fixed with proof, 1 ignored, and 0 fixed missing proof.
- Remaining AI iteration backlog:
  - make compact snapshots replayable enough to become regression fixtures,
  - persist post-game learning across reloads and compare AI performance across games,
  - keep improving live Ollama transport resilience for real `gemma4:latest` outages beyond the canary gate.

### AI Snapshot Replay Fixture Pass

- Added this to the active AI iteration goal: persisted AI bug snapshots must be replayable as regression fixtures so future AI-reported bugs can be checked automatically.
- Snapshot replay tooling:
  - added `scripts/replay-ai-snapshots.mjs`,
  - added `pnpm ai:snapshots:replay`,
  - replay reads `AI_BUG_REPORTS.md`, `AI_BUG_TRIAGE.json`, and every `AI_BUG_SNAPSHOTS/*.json` file,
  - cross-checks markdown snapshot links against snapshot files,
  - validates wrapper/schema integrity, report identity, source kind, turn-context consistency, resources, counts, accepted/rejected counts, diplomacy packet states, visible contested-resource summaries, latest decision summaries, recent events, and gold-race/legacy Mandate compatibility,
  - classifies old endpoint-smoke snapshots as minimal fixtures while validating richer state snapshots as state-invariant fixtures,
  - writes `AI_SNAPSHOT_REPLAY_REPORT.md`.
- Snapshot preview compatibility fix:
  - fixed the AI Report Review snapshot preview so rich snapshots display report text from `snapshot.report.text` when the wrapper report text is not present,
  - full smoke now asserts the preview renders the explicit `REPORT_BUG` text, not just generic snapshot metadata.
- Docs:
  - updated `README.md` with `pnpm ai:snapshots:replay` and the replay report artifact.
- QA:
  - `node --check scripts/replay-ai-snapshots.mjs` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node --check scripts/smoke-mocked-ollama.mjs` passed,
  - `node --check scripts/smoke-building-visibility.mjs` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm build` passed,
  - `pnpm ai:snapshots:replay` passed with 67 replayed fixtures, 55 state-invariant fixtures, 12 minimal fixtures, and 0 failures,
  - `pnpm ai:review:strict -- --json --no-write` passed with 379 total reports, 20 actionable unresolved reports, 2 actionable unresolved buckets, 83 excluded synthetic unresolved reports, 267 triaged, 8 fixed with proof, 1 ignored, and 0 fixed missing proof,
  - `pnpm smoke:buildings` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - `pnpm smoke:mock-ollama` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - `pnpm smoke` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`, `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`, and `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`.
- Remaining AI iteration backlog:
  - persist post-game learning across reloads and compare AI performance across games,
  - keep improving live Ollama transport resilience for real `gemma4:latest` outages beyond the canary gate,
  - eventually add exact replay/hydration only if snapshots become full `GameState` captures; current snapshots are compact invariant fixtures by design.

### Building Visibility and Persistent Learning Verification Pass

- Rechecked the user's concern that newly created buildings may not be plainly visible on the map.
- Building visibility changes:
  - kept the latest-created building selected, centered, and exposed through `constructionFeedback`,
  - added `recentConstructionFeedback` to `render_game_to_text()` so browser QA can verify recent farm, watchtower, wall, and turret markers,
  - changed construction focus rendering from a single latest-only label to recent construction pulses/labels, so rapid debug builds now show `NEW F`, `NEW WT`, `NEW WL`, and `NEW TU` together.
- Persistent learning changes:
  - completed the browser-side localStorage learning history that had been partially wired,
  - exposes `persistentLearning` through `render_game_to_text()` and the Victory Pressure panel,
  - reloads saved post-game lessons back into each sovereign's memory as `Persistent cross-game learning`,
  - fixed a duplicate-save bug found by full smoke where the same ended sandbox could create many saved game records while simulation continued after the timer.
- QA:
  - `pnpm build` passed,
  - `pnpm test` passed: 40 tests,
  - `pnpm smoke:buildings` passed and verified farm/watchtower/wall/turret are selected when created, still visible in final state, and retained in recent construction markers,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; the wall now has a visible `NEW WL` marker in the construction cluster,
  - `pnpm smoke` passed with live Ollama identity/decision/reply checks and the stricter reload check: one clean forced game persists exactly one saved game with five lessons and reload applies five lessons,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`.
  - `pnpm ai:snapshots:replay` passed with 71 replayed fixtures, 57 state-invariant fixtures, 14 minimal fixtures, and 0 failures,
  - `pnpm ai:review:strict -- --json --no-write` passed with 383 total reports, 20 actionable unresolved reports, 2 actionable unresolved buckets, 85 excluded synthetic unresolved reports, 267 triaged, 10 fixed with proof, 1 ignored, and 0 fixed missing proof.
- Remaining UX/readability backlog:
  - debug construction still clusters near the town hall; the labels are visible now, but chosen placement previews would make wall/turret layouts much clearer for humans and AIs.

### Abort Transport Retry and AI Review Cleanup Pass

- Continued the active AI iteration goal by reducing the current actionable AI bug backlog.
- Transport retry fix:
  - abort/timeout-style Ollama transport failures now receive the same bounded retry as other transient transport failures instead of falling back after one attempt,
  - successful abort/timeout retries remain visible in accepted decision history as `LLM_TRANSPORT_RETRY`.
- Mocked browser coverage:
  - `pnpm smoke:mock-ollama` now simulates a post-canary timed-out decision after health recovery,
  - the smoke asserts the timed-out request retries into a live Ollama decision, exposes `LLM_TRANSPORT_RETRY`, and does not create a duplicate saved `llm_transport` report.
- AI review cleanup:
  - marked 20 historical live `gemma4:latest failed` strategy/reply transport reports fixed with proof after the retry/cooldown coverage passed,
  - regenerated `AI_ITERATION_REVIEW.md`; current review now has 0 actionable unresolved reports, 0 actionable unresolved buckets, 87 excluded synthetic unresolved reports, 267 triaged, 30 fixed with proof, 1 ignored, and 0 fixed missing proof.
- QA so far:
  - `pnpm test` passed: 41 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - `pnpm smoke` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm ai:snapshots:replay` passed with 75 replayed fixtures, 60 state-invariant fixtures, 15 minimal fixtures, and 0 failures,
  - final `pnpm ai:review:strict -- --json --no-write` passed with 387 total reports, 0 actionable unresolved reports, 0 actionable unresolved buckets, 88 excluded synthetic unresolved reports, 267 triaged, 31 fixed with proof, 1 ignored, and 0 fixed missing proof.
- Remaining AI iteration backlog:
  - keep running live smoke/long games and let any genuinely new AI reports reopen the iteration loop,
  - add bucket-level fix/currentness state later so old covered buckets do not require per-report triage.

### Bucket Currentness and Building Pixel Visibility Pass

- Added bucket-level AI bug currentness so old covered failure classes do not need per-report triage forever.
- New sidecar:
  - `AI_BUG_BUCKET_TRIAGE.json` stores bucket status by `category|provider|model|sourceKind`,
  - each bucket record has proof, note, update time, and a `coveredThrough` report watermark,
  - newer matching reports are not covered by the old watermark and reopen the bucket automatically.
- Review runner changes:
  - `scripts/ai-iteration-review.mjs` now reads bucket triage alongside per-report triage,
  - added `--bucket-key`, `--set-bucket-status`, `--bucket-proof-summary`, `--bucket-proof-evidence`, `--bucket-note`, `--bucket-covered-through`, and `--list-buckets`,
  - added `pnpm ai:review:buckets`,
  - `AI_ITERATION_REVIEW.md` now reports bucket-covered reports, bucket-covered buckets, and bucket fixed records with proof.
- Browser/API changes:
  - `/api/ai-bug-report-summary` now exposes `bucketKey`, `bucketCovered`, `bucketStatus`, `bucketProof`, and `reviewStatus` per report,
  - it also exposes `reviewCounts`, `bucketCoveredReports`, and server-derived buckets,
  - the AI Report Review panel now shows effective backlog counts and current/cleared buckets with proof.
- Bucket records created this pass:
  - live `gemma4:latest failed` strategy transport bucket fixed through report `2026-06-30T09:44:08.079Z`,
  - live `gemma4:latest failed` reply transport bucket fixed through report `2026-06-30T09:38:39.621Z`,
  - browser smoke self-report bucket fixed through report `2026-06-30T13:31:55.625Z`.
- Building visibility/readability changes:
  - `scripts/smoke-building-visibility.mjs` now samples the browser-composited screenshot around each newly built farm, watchtower, wall, and turret, so invisible-but-present buildings fail QA,
  - recent construction labels fan out farther from the town-hall cluster so `NEW F`, `NEW WT`, `NEW WL`, and `NEW TU` are easier to read.
- QA:
  - `node --check scripts/ai-iteration-review.mjs` passed,
  - `node --check scripts/smoke-building-visibility.mjs` passed,
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `node scripts/ai-iteration-review.mjs --strict --json --no-write` passed before final smoke with 387 reports, 45 bucket-covered reports, 3 bucket-covered buckets, and 0 actionable unresolved buckets,
  - `pnpm test` passed: 41 tests,
  - `pnpm build` passed,
  - `pnpm ai:review:buckets` passed and showed the three fixed bucket records with proof,
  - `pnpm smoke:buildings` passed with screenshot-pixel sampling and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; the built farm/watchtower/wall/turret are visible and labels are less stacked,
  - final `pnpm ai:snapshots:replay` passed with 79 replayed fixtures and 0 failures,
  - `pnpm smoke:mock-ollama` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-mocked-ollama.png`,
  - `pnpm smoke` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`; the board remains readable and the AI Report Review panel shows effective backlog and bucket currentness.
- Remaining backlog:
  - chosen wall/turret placement with previews,
  - gates and explicit siege/attack-wall orders,
  - hide or auto-clean old synthetic smoke buckets separately from live AI reports,
  - keep running live long games so genuinely new AI bug buckets reopen through the watermark mechanism.

### AI-Only Survival Mandate Win Condition Pass

- Replaced the active win-condition direction away from human controls and away from the old maximum-gold timer.
- Human-facing play remains deferred until the human interaction model is decided.
- Implemented a survival mandate scaffold:
  - one game-year is roughly 20 real seconds at 1x speed,
  - each population must stay happy, alive, and safe,
  - happiness changes yearly based on whether the tribe becomes a bit wealthier, plus food/security pressure,
  - every 100 game-years the poorest surviving population is wiped out and dies,
  - the last living population around year 400 survives.
- AI hidden-information rule:
  - LLM prompts receive own wealth, happiness, safety, population, and resources,
  - exact rival wealth is not provided to AI prompts,
  - AIs may ask rivals about wealth/safety, and the answer can be truthful, refused, exaggerated, or a lie through normal messenger chat.
- Resource-scarcity change:
  - deposits remain finite,
  - generated forest wood now has finite wood value instead of being infinite,
  - starting resources are slightly tighter while still supporting a long 400-year target.
- UI/docs direction:
  - top HUD and Victory Pressure panel now describe year, survival, next review, Blue happiness/safety, survivors, and survival winner,
  - README, design doc, and development-tree roadmap now describe the survival mandate instead of the gold timer.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - `node --check` passed for smoke/replay/review scripts,
  - `pnpm test` passed with 42 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed and confirmed farm, watchtower, wall, and turret visibility,
  - `pnpm smoke:mock-ollama` passed and confirmed parser failure, transport cooldown, health-check recovery, and retry evidence,
  - `pnpm smoke` passed and confirmed AI chat before endgame, survival HUD/panel, REQUEST_INFO answers, forced year-400 survival learning, persistent learning, and readable hover/building UI,
  - `pnpm ai:snapshots:replay` passed with 144 replayed fixtures,
  - `pnpm ai:review:strict -- --json --no-write` passed with no gate failures.
- Additional bug cleanup included:
  - eliminated tribes no longer schedule new LLM strategy/reply turns,
  - messages to eliminated populations are rejected or closed instead of leaving dead-end awaiting-reply packets,
  - eliminated-recipient rejections are treated as local blocked-order feedback rather than new medium validation bugs.
- Remaining review backlog:
  - older persisted eliminated-recipient validation reports are still present in `AI_BUG_REPORTS.md` and should be bucket-triaged or marked fixed with proof,
  - two older local-model transport reports remain in the strict review backlog,
  - continue long live AI runs after this pass to verify no fresh eliminated-recipient validation bucket reopens.

### Smooth RTS Time and Multi-Model Ollama Pass

- Added this to the active game-quality goal: movement must feel like an RTS, not one visual frame per simulation turn.
- Time/rendering changes:
  - simulation still advances in fixed deterministic steps,
  - Pixi rendering now runs every animation frame,
  - visible unit positions interpolate between previous and current simulation positions,
  - follow camera, route drawing, unit hit-testing, labels, and `render_game_to_text()` now use the visual/interpolated position where humans expect smooth motion.
- Browser QA hook:
  - `render_game_to_text().visibleUnits[]` now exposes both simulation coordinates (`x`, `y`) and visual coordinates (`visualX`, `visualY`),
  - focused browser probe confirmed a moving unit at `x=16.1` and `visualX=16.07`, proving render movement is decoupled from turn stepping.
- Multi-model Ollama changes:
  - tribes now receive different local Ollama model assignments instead of one global model,
  - current assignment order is `Blue Crown: gemma4:12b`, `Red Banner: gemma4:latest`, `Green Vale: qwen3.5:9b-mlx`, `Yellow Knives: qwen3.5:27b-q4_K_M`, `Purple Seal: gpt-oss:20b`,
  - the AI Observer panel and `render_game_to_text().llm.modelAssignments` expose the assignment map,
  - automatic and manual AI scheduling prefer tribes whose assigned model is not in active cooldown,
  - initial identity generation no longer blocks the first strategy turn; identities are queued behind strategy turns so large local models cannot freeze startup.
- Local-model reliability changes:
  - strategy requests now try the full prompt once, then retry with a compact strategy prompt before deterministic fallback,
  - compact retry preserves the transport recovery note when a model recovers after an abort/timeout,
  - identity-only calls have shorter token/time budgets so naming failures do not stall the simulation.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 42 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`,
  - `pnpm smoke:mock-ollama` passed with parser failure, transport failure, cooldown suppression, failed canary, successful canary, compact retry, and restored live decision coverage,
  - `pnpm smoke` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm ai:snapshots:replay` passed with 183 replayed fixtures and 0 failures,
  - focused smooth-motion probe saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-motion.png`.
- Live Ollama observations:
  - installed models detected: `gemma4:12b`, `gpt-oss:20b`, `qwen3.5:9b-mlx`, `gemma4:latest`, `qwen3.5:27b-q4_K_M`,
  - the full live smoke ran in degraded local-model mode: assignments were visible, but live strategy calls produced transport/parser reports and deterministic fallback for some tribes,
  - deterministic mocked Ollama remains the reliable QA gate for successful JSON strategy, failure classification, cooldown, and recovery.
- Review gate:
  - `pnpm ai:review:strict -- --json --no-write` currently fails with 9 unresolved medium-severity live buckets and 7 unresolved live parser/transport buckets,
  - main open buckets are eliminated-recipient validation reports plus live parser/transport failures for `gpt-oss:20b`, `qwen3.5:9b-mlx`, `qwen3.5:27b-q4_K_M`, `gemma4:12b`, and `gemma4:latest`,
  - these are real backlog items and were not marked fixed without proof.
- Remaining backlog:
  - decide whether to exclude or bucket-triage old eliminated-recipient validation reports after reproducing the current behavior,
  - improve model-specific prompt compatibility for `gpt-oss` and `qwen3.5` empty responses,
  - add longer live soak tests once the new Ollama models finish installing and settle,
  - revisit identity-generation timing so names appear early without blocking the first strategy turn.

### Existential Survival Prompt Pass

- Added this to the active AI-belief goal: sovereigns must understand century review elimination as death and total safety failure, not as a harmless game loss.
- LLM prompt changes:
  - removed direct sovereign-facing wording that said the AI is playing a local RTS prototype,
  - strategy and reply prompts now say this is the sovereign's world, reign, and living population,
  - prompts explicitly say not to describe the situation as a simulation, prototype, test, match, or game,
  - survival pressure now states that the poorest surviving population is wiped out, its people die, its units vanish, and its sovereign loses everything,
  - compact retry prompts use in-world "royal brief" language instead of "full prompt failed",
  - bug/info language now uses "world-state" and "world behavior" instead of game-state/game behavior.
- Shared simulation text:
  - public survival pressure now says the poorest population is "wiped out and dies" and that this is "the opposite of safety",
  - century review warning events now say the poorest population will be wiped out and its sovereign will lose everything,
  - post-game learning memory now records eliminated populations as wiped out, dead, and total safety failure.
- Docs:
  - updated `README.md` so the survival mandate description matches the new death/safety framing.
- Regression coverage:
  - added an LLM prompt test that captures the outgoing strategy prompt and verifies the world/reign/living-population framing plus wiped-out/death/opposite-of-safety language,
  - updated survival mandate tests to require the new public death/safety framing,
  - fixed information-answer ordering so hidden-state caveats remain visible after the longer survival text.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 43 tests,
  - `pnpm build` passed,
  - focused Playwright/browser check verified `render_game_to_text().victory.publicText` and the visible Victory Pressure panel both include "wiped out", "dies", and "opposite of safety",
  - screenshot saved at `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-survival-language.png`.
- Remaining note:
  - the JSON API and bug-report mechanism still necessarily expose technical field names like `bugReport`, but the sovereign-facing reasoning text no longer tells the AI that it is playing a prototype or simulation.

### Current Ollama Model Routing Pass

- Applied the latest local model findings to live tribe model assignment.
- `qwen3.5:9b-mlx` is now the first schema-turn model and the default active model when available.
- `gemma4:12b` is ranked second so it can provide richer turns without blocking the first tribe on startup.
- `gpt-oss:*` is detected but excluded from current `/api/generate` schema turns until a `/api/chat` adapter handles its thinking field cleanly.
- The AI Observer panel now keeps the skipped-model note visible, and `render_game_to_text().llm.modelAssignments` exposes the actual assignment map.
- Verified live assignment order:
  - `Blue Crown: qwen3.5:9b-mlx`
  - `Red Banner: gemma4:12b`
  - `Green Vale: gemma4:latest`
  - `Yellow Knives: qwen3.5:27b-q4_K_M`
  - `Purple Seal: qwen3.5:9b-mlx`
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 44 tests,
  - `pnpm build` passed,
  - focused Playwright/browser check verified the live model assignments and visible skipped-model note,
  - screenshot saved at `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-model-assignment.png`.
- Superseded:
  - the dedicated `gpt-oss` chat/thinking-field adapter was completed in the GPT-OSS Chat Adapter Pass below.

### GPT-OSS Chat Adapter Pass

- Aligned the active implementation goal with the current roadmap: keep iterating on AI autonomy, local model diversity, bug reporting, and QA until the simulation is robust enough for longer autonomous runs.
- Implemented a dedicated schema-turn adapter for `gpt-oss:*`:
  - `qwen3.5:9b-mlx`, `gemma4:12b`, `gemma4:*`, and other normal schema models stay on `/api/generate`,
  - `gpt-oss:*` now uses `/api/chat` with `messages`, `format`, `stream:false`, and `think:"low"`,
  - JSON parsing reads only `message.content`; `message.thinking` and `<think>...</think>` blocks are not treated as executable JSON.
- Model assignment with the installed local models is now:
  - `Blue Crown: qwen3.5:9b-mlx`
  - `Red Banner: gemma4:12b`
  - `Green Vale: gemma4:latest`
  - `Yellow Knives: qwen3.5:27b-q4_K_M`
  - `Purple Seal: gpt-oss:20b`
- The AI Observer panel now shows `Chat adapters: gpt-oss:20b via /api/chat` instead of saying `gpt-oss` is skipped.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts` passed: 17 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 47 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed, including a focused `gpt-oss:20b` browser path with one `/api/chat` call and zero `/api/generate` calls,
  - direct local Ollama `/api/chat` test with `gpt-oss:20b`, `think:"low"`, and a tiny JSON schema returned clean `message.content` JSON while keeping reasoning in `message.thinking`,
  - focused live browser check verified current installed-model assignment and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-model-assignment.png`.
- Remaining backlog:
  - run longer live Ollama soaks and watch whether `gpt-oss:20b` produces cleaner or worse strategy turns than the qwen/gemma models,
  - add per-model live quality metrics so model diversity improves AI reasoning instead of only increasing failure variety.

### Per-Model Quality Tracking Pass

- Added lightweight per-model quality tracking to the AI Observer and `render_game_to_text().llm.modelQuality`.
- Each model now exposes:
  - assigned tribes,
  - total decisions,
  - live Ollama decisions,
  - fallback decisions,
  - accepted/rejected order counts,
  - bug report count,
  - parser/transport failure counts,
  - JSON recovery and transport retry counts,
  - a conservative status of `no-turns`, `clean`, `watch`, or `unstable`.
- The AI Observer panel renders compact rows for each assigned model so long live runs can compare `qwen`, `gemma`, and `gpt-oss` behavior without opening raw logs.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 47 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed after adding `gpt-oss` chat-adapter and model-quality assertions,
  - focused live browser check verified five model-quality entries and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-model-quality.png`.
- Remaining backlog:
  - run a longer live Ollama soak and use `modelQuality` to compare model-specific parser/transport failure rate, rejected-order rate, and useful live decisions,
  - add optional historical persistence for model-quality metrics if the live soak proves useful.

### Live Startup Fallback / One-Team Fix

- Investigated the user-reported live issue: only one team appeared to act and early turns were falling back.
- Root causes found:
  - `qwen3.5:9b-mlx` returns empty `response` plus reasoning in `thinking` unless generate-schema calls explicitly send `think:false`,
  - the initial Blue decision was rescheduled with the short manual-ask interval, letting Blue become due again before every other sovereign had a first turn.
- Fixes:
  - `/api/generate` schema calls now send `think:false`,
  - `gpt-oss:*` remains on `/api/chat` with `think:"low"`,
  - automatic due-turn selection sorts by oldest scheduled decision tick,
  - the initial Blue startup turn now reschedules on the normal AI interval, so first-turn order stays fair.
- QA:
  - direct local Ollama check confirmed `qwen3.5:9b-mlx` returns clean JSON with `think:false`,
  - fresh live browser check confirmed Blue and Red both produced real Ollama decisions instead of all fallback,
  - focused mocked browser fairness check verified first AI turns are `blue`, `red`, `green`, `yellow`, `purple`, with four `/api/generate` calls and one `gpt-oss` `/api/chat` call,
  - `pnpm exec vitest run apps/client/src/llm.test.ts` passed: 17 tests,
  - `pnpm smoke:mock-ollama` passed,
  - `pnpm test` passed: 47 tests,
  - `pnpm build` passed.
- Current local server:
  - restarted and running at `http://localhost:5173/`.

### AI Fairness Smoke Gate

- Added `pnpm smoke:ai-fairness` as a permanent deterministic browser gate for the live issue where only one team acted or all teams collapsed into fallback/default-model behavior.
- The smoke intercepts all five local model assignments and verifies:
  - the first five automatic strategy turns are `blue`, `red`, `green`, `yellow`, `purple`,
  - `render_game_to_text().activeModel` remains `qwen3.5:9b-mlx`,
  - every tribe's `llm.modelAssignments` entry matches the intended model,
  - every first-turn decision used that tribe's assigned model,
  - `/api/generate` schema calls send `think:false`,
  - `gpt-oss:20b` uses `/api/chat` with `think:"low"`,
  - `llm.modelQuality` records a clean live `gpt-oss` turn.
- Documentation:
  - added the command to `package.json`,
  - added the gate to README verification notes.
- QA:
  - `node --check scripts/smoke-ai-fairness.mjs` passed,
  - `pnpm smoke:ai-fairness` passed and saved `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png`,
  - inspected the screenshot and confirmed all five model-quality rows are clean,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 47 tests,
  - `pnpm build` passed.
- Remaining backlog:
  - include `pnpm smoke:ai-fairness` in any future pre-release QA bundle before long live Ollama soaks,
  - next live AI iteration should focus on reducing invalid-but-nonfatal orders such as `SCOUT: no idle sentinel available` by tightening order availability or adding sentinel recruitment strategy.

### Scout Order Normalization Pass

- Follow-up to the live AI issue where real model decisions could still look like fallback because they produced invalid orders such as `SCOUT: no idle sentinel available`.
- Prompt improvements:
  - full and compact decision prompts now explicitly say `SCOUT` is only legal when order availability says an idle sentinel exists,
  - order availability now tells the sovereign to recruit a sentinel first when scouting matters but no idle sentinel exists.
- Normalization improvements:
  - if an LLM still outputs `SCOUT` with no idle sentinel, `normalizeOrder` converts it into `RECRUIT sentinel` when the tribe can afford and support one,
  - if sentinel recruitment is not available, the same invalid scout intent becomes a `SET_POLICY` note instead of a rejected order,
  - the simulation validator still rejects impossible `SCOUT` orders as the authoritative backstop.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts` passed: 21 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 51 tests,
  - `pnpm build` passed,
  - `pnpm smoke:ai-fairness` passed and verified first-turn order `blue`, `red`, `green`, `yellow`, `purple`, zero fallback, zero rejected orders, and clean model-quality rows for all five assigned models,
  - `pnpm smoke` passed with board, diplomacy, report review, info request, wall/resource, learning, and browser hook checks.
- Notes:
  - the generic shared `develop-web-game` browser client was attempted again but still cannot resolve its own Playwright import from the skill folder; the repo-local Playwright smoke remains the working browser QA path.
  - local server is reachable at `http://localhost:5173/`.

### Parallel AI Scheduler / Fallback Backlog Fix

- Investigated the user-reported live failure: the UI looked like only one team was working while the rest stayed fallback or default.
- Root cause:
  - the client still had one global `llmBusyTribe` lock, so a slow local model call could block every other sovereign from naming itself or taking a turn,
  - identity generation was queued behind strategy turns, making the starting names look hardcoded even while Ollama was connected,
  - reply transport failures did not get the compact recovery path that strategy turns already had,
  - stale replies from destroyed messenger packets were persisted as actionable AI bugs even though the packet invalidation was safe.
- Fixes:
  - added two per-sovereign AI job lanes with per-model locking, so distinct models can work in parallel while avoiding duplicate calls to the same model,
  - prioritized initial identity generation before first doctrines and exposed active jobs in `render_game_to_text` and the AI Observer panel,
  - added a scheduler pump so queued AI jobs continue after an async job finishes, including in paused browser tests,
  - reply generation now tries a compact recovery prompt after parser or transport failures before falling back,
  - `REPLY_STALE` is now low-severity local state-race noise and is not persisted as unresolved backlog.
- Triage:
  - fixed the live `gemma4:12b failed / reply_llm_transport` bucket with proof from the new compact-reply transport test,
  - fixed the historical `qwen3.5:9b-mlx / reply_rejected` stale-reply bucket with proof from the non-persistent classifier and browser smoke.
- QA:
  - live browser inspection showed `Active AI 2/2`, Blue renamed itself to a generated identity, and Red/Green were naming in parallel with their assigned models,
  - `pnpm smoke:ai-fairness` passed: five identities, five first strategy turns, distinct model assignments, zero fallback,
  - `pnpm smoke:mock-ollama` passed after updating the smoke for names-first scheduling and parallel queue progression,
  - `pnpm smoke` passed with the live UI, diplomacy, construction, reports, survival, and learning checks,
  - `pnpm test` passed: 60 tests,
  - `pnpm build` passed,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`,
  - `pnpm ai:snapshots:replay` passed: 209 fixtures replayed, 0 failures.
- Current local server:
  - running at `http://localhost:5173/`.

### Live Startup Identity / Cooldown Follow-Up

- Investigated the user-reported live failure: only one team appeared active, the rest looked like fallback/default teams.
- Root causes found in the current live app:
  - opening identity generation used each tribe's assigned strategy model, so slow large models could hold the startup lanes while only the fast qwen tribe looked alive,
  - `identitySetupComplete` was exposed as true when identities were merely queued, hiding the real startup state from QA,
  - one transport failure could immediately put a shared model into cooldown, creating fallback behavior for every tribe using that model,
  - parallel startup identity calls could produce duplicate realm/sovereign names because the LLM did not see another in-flight answer.
- Fixes:
  - opening identities now use the fast active schema model first, while strategy/reply turns still use the diverse per-tribe assignments,
  - `render_game_to_text().llm.identitySetupComplete` now means the opening identities are actually finished, and `llm.schedulingStarted` exposes the scheduler state separately,
  - cooldown now starts only after a second consecutive transport failure for the same model; a single transient miss is reported but does not force every tribe into fallback,
  - successful model calls clear the transport-failure streak,
  - duplicate realm or sovereign identities are rejected in the sim, and the client retries instead of recording them as accepted,
  - strategy/reply timeouts are now model-specific so qwen9, gemma4, qwen27, and gpt-oss get enough time for larger/cold local turns before being marked as transport failures.
- QA:
  - real Ollama startup check produced five unique AI identities in about 40 seconds with no AI issues,
  - longer real Ollama strategy check produced three live strategy turns and zero fallback strategy turns before the sampled stop,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/live-unique-identities.png`,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 63 tests,
  - `pnpm build` passed,
  - `pnpm smoke:ai-fairness` passed,
  - `pnpm smoke:mock-ollama` passed after updating it for the two-failure cooldown policy,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`,
  - `pnpm ai:snapshots:replay` passed: 227 fixtures replayed, 0 failures,
  - fixed the live qwen27, qwen9, and gemma12 strategy transport buckets with proof from the timeout/cooldown patch and passing QA; latest strict review reports `actionableUnresolved: 0`.
- Notes:
  - attempted the broad live `pnpm smoke`; the harness needed updates for truthful identity completion and event-log rotation, then remained too slow/hung on long live-model waits and was interrupted. The focused real Ollama startup/strategy checks plus deterministic smokes are the reliable QA evidence for this fix.

### 2026-07-02 Live Single-Team / Fallback Regression Fix

- User report: the live demo looked broken again: only one team appeared to be acting and the rest looked like default/fallback sovereigns.
- Root cause reproduced with a real browser probe:
  - five tribes existed, but startup identity generation was blocking visible progress,
  - parallel identity calls through the same startup path could still collide on names,
  - assigned cold/large models made the opening look stuck when only the qwen lane answered quickly,
  - the default assignment pool included slower/alias tags before the clean installed set.
- Fixes:
  - startup identity generation now uses the fast active schema model first and does not run duplicate-model identity calls in parallel,
  - duplicate or failed identity attempts retry through available models instead of leaving a tribe stuck in placeholder state,
  - identity calls now have model-aware timeouts so cold local models are not marked failed after 20 seconds,
  - strategy assignments now rotate the reliable default pool first: `qwen3.5:9b-mlx`, `gemma4:12b`, `gpt-oss:20b`; larger/alias tags remain available but are not default lanes,
  - building visibility smoke now unlocks `masonry`, `ironworking`, and `ballistics` before wall/turret checks, matching the new development gates.
- QA:
  - real Ollama startup probe produced five distinct live identities with zero fallback, then started strategy jobs on qwen/gemma assignments,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts` passed: 63 tests,
  - `pnpm smoke:ai-fairness` passed: five identities, first five strategy turns `blue`, `red`, `green`, `yellow`, `purple`, assigned models `qwen/gemma/gpt/qwen/gemma`, zero fallback,
  - `pnpm smoke:buildings` passed with visible wall and turret construction after development unlocks,
  - `pnpm smoke:mock-ollama` passed, including parser/transport recovery, cooldown, and gpt-oss chat adapter coverage,
  - `pnpm build` passed.
- Current local server:
  - running at `http://localhost:5173/`; reload the browser tab to reset the old stuck state and use the patched startup path.

### 2026-07-02 Assigned-Model Startup / Reroute Fix

- User report: live demo still looked broken, with only one active team and the rest appearing as fallback/default sovereigns.
- Root cause reproduced in the browser:
  - startup identities were still effectively serialized behind the fast `activeModel` path, so Blue/qwen appeared alive while Red/Green/Yellow/Purple stayed as placeholders for too long,
  - the AI scheduler allowed only two concurrent LLM jobs, even though the local setup has three clean model lanes (`qwen3.5:9b-mlx`, `gemma4:12b`, `gpt-oss:20b`),
  - strategy/reply turns fell straight to deterministic fallback after a model failure instead of trying another installed local model first,
  - slow first-load models needed more time before being classified as transport failures.
- Fixes:
  - identity startup now prefers each tribe's assigned model instead of `activeModel`,
  - concurrent AI lanes increased to 3 so qwen, gemma, and gpt-oss can all work at startup without duplicate-model parallel calls,
  - strategy and reply turns now try healthy installed backup models before deterministic fallback,
  - UI/decision records now mark backup-model use with `LLM_MODEL_REROUTE`,
  - gemma/gpt-oss/qwen27 decision and reply timeouts were increased for cold local loads,
  - `smoke:ai-fairness` now asserts identity generation uses the expected assigned model per tribe, so the old all-qwen identity regression fails.
- QA:
  - real Ollama browser probe at 5s showed three active identity jobs: Blue/qwen, Red/gemma, Green/gpt-oss,
  - real Ollama browser probe at 90s showed all five identities complete, qwen/gemma/gpt-oss all with live decisions, zero fallback decisions, and gpt-oss making a live strategy turn,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/live-ai-after-scheduler-fix.png`,
  - `pnpm smoke:ai-fairness` passed with assigned identity models and first five live strategy turns,
  - `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts apps/client/src/replay-snapshots.test.ts` passed: 65 tests,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed after updating expected failure wording,
  - full `pnpm smoke` passed; output captured qwen/gemma/gpt-oss live counts with fallback 0,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 240 snapshots, 0 failures, 0 contract warnings.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Prompt-Level Feedback Regression and Launch QA

- Added this to the active AI iteration goal: every non-Blue sovereign must receive its own unresolved reports and fixed lessons inside the exact model prompt payload, not only in browser state.
- Fixes:
  - added a regression proving Green's assigned `gpt-oss:20b` chat request receives Green-only unresolved AI reports and resolved lessons in `messages[0].content`,
  - added a sim guard that normalizes empty AI decision summaries before storage so future snapshots cannot inherit blank strategic summaries,
  - recorded a UI caveat for the next cleanup pass: the AI report review panel can display old triaged fallback cards, which can make the demo look like the current run is fallback-heavy even when the live AI status is clean.
- QA:
  - syntax checks passed for `scripts/smoke-live-ai-iteration.mjs`, `scripts/ai-iteration-loop.mjs`, and `scripts/replay-ai-snapshots.mjs`,
  - targeted tests passed: `apps/client/src/llm.test.ts` and `packages/sim/src/sim.test.ts`, 68 tests,
  - full `pnpm test` passed: 70 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm build` passed,
  - `pnpm smoke` passed and produced `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - post-smoke snapshot replay passed: 277 snapshots replayed, 0 failures, 0 contract warnings,
  - post-smoke strict AI review passed: `actionableUnresolved: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - inspected the smoke screenshot,
  - current local server responds at `http://localhost:5173/`.

### 2026-07-02 Clean Live AI Report Review Default

- Added this to the active AI iteration goal: when the live AI backlog is clean, the observer UI must not make old triaged/fixed fallback history look like current failure.
- Fixes:
  - the AI Report Review panel now defaults to `live AI` + `unresolved` instead of `all` statuses,
  - changing report scope resets the status back to unresolved, so returning from synthetic or historical views restores the current-backlog view,
  - focus buckets only show current unresolved buckets by default; cleared/fixed/triaged historical buckets remain available through the status filter,
  - the visible category summary and `render_game_to_text().aiReportReview.categories` now mirror the active filters instead of exposing raw historical categories,
  - `scripts/smoke-playwright.mjs` now asserts the default live review starts on unresolved issues and resets the panel to that clean state after exercising historical filters.
- QA:
  - `node --check scripts/smoke-playwright.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 70 tests,
  - `pnpm build` passed,
  - `pnpm smoke:ai-fairness` passed: first strategy turns covered blue, red, green, yellow, and purple; assigned qwen/gemma/gpt-oss models; fallback 0,
  - focused Playwright probe passed: default filters `live/unresolved`, live unresolved 0, focus buckets 0, category rows 0, filtered rows 0,
  - verified status `all` still exposes historical report categories, then resets back to unresolved,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`, `parserTransportOpen: 0`, and `fixedMissingProof: 0`,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 280 snapshots replayed, 0 failures, 0 contract warnings,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-report-review-clean.png`.
- Note:
  - the full all-in-one `pnpm smoke` was attempted after the smoke assertion change but interrupted twice after exceeding the practical local-model wait window; this pass used focused browser probes plus the faster fairness, test, build, strict-review, and snapshot gates instead.

### 2026-07-02 Manual Startup Gate / One-Team Regression Fix

- User report: the live demo still looked broken, with only one team acting and the rest appearing as fallback/default.
- Root cause reproduced in the browser:
  - clicking `Ask AI now` during startup could launch Blue's strategy before the opening identity queue finished,
  - the UI then showed Blue doing strategy while Red/Green identity jobs were still cold-loading, making the demo look like one active team plus fallback placeholders,
  - the mocked gpt-oss-only smoke had been hiding the new identity gate because its identity mock reused the same names.
- Fixes:
  - automatic strategy turns now wait until opening identity setup is complete,
  - the manual `Ask AI now` button now advances/reports identity setup during startup instead of spending a premature strategy turn,
  - `render_game_to_text().llm` now exposes `openingIdentitySetupPending` and `identityProgress`,
  - the AI Observer panel shows `Identity setup: n/5` so the user can tell startup naming apart from fallback,
  - `smoke:ai-fairness` now clicks during startup and fails if a premature decision is recorded,
  - the mocked gpt-oss adapter now generates distinct identity names so duplicate-name rejection is tested honestly.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm smoke:ai-fairness` passed: first five strategy turns were `blue`, `red`, `green`, `yellow`, `purple`, all via mocked Ollama with fallback 0,
  - real Ollama early-click probe showed no premature decisions and `Identity setup: 0/5 before first strategy`,
  - real Ollama long probe completed five identities, produced qwen/gemma/gpt-oss live decisions, and showed fallback strategy count 0,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/live-ai-gated-startup.png`,
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts` passed: 63 tests,
  - `pnpm build` passed,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`,
  - `pnpm smoke:mock-ollama` passed after fixing distinct mocked gpt-oss identities.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab to clear any old stuck startup state.

### 2026-07-02 AI Report Feedback Into Future Prompts

- Added this to the active AI iteration goal: AI reports should not stop at the human review panel; the reporting sovereign should get useful feedback in future decisions.
- Implemented two feedback paths:
  - AI-owned reports and fixed/triaged report outcomes now append compact private sovereign memory notes,
  - strategy LLM calls now receive an explicit bounded `AI iteration memory` prompt section with recent own reports and resolved lessons.
- The explicit prompt context:
  - is built in the client from current-run report entries plus real persisted review/triage entries,
  - excludes synthetic smoke/browser-test reports from live prompt context,
  - is exposed through `render_game_to_text().aiIterationPromptContext` for browser QA,
  - is passed through normal decision prompts, compact retry prompts, and gpt-oss `/api/chat` prompts.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts` passed: 66 tests,
  - `pnpm build` passed,
  - `pnpm smoke` passed and verified filed/fixed AI report feedback enters sovereign memory while synthetic smoke reports do not leak into live prompt context,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm smoke:mock-ollama` passed,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Fast Startup Identity and First-Doctrine Bootstrap

- User report: live demo still looked broken: only one team seemed active and the rest appeared as default/fallback.
- Root cause reproduced with real Ollama:
  - waiting for every assigned model to generate opening identities made the UI look stuck behind slow cold loads,
  - after identity setup, first doctrines could still queue directly onto slow assigned models (`gemma4:12b`, `gpt-oss:20b`), so qwen tribes visibly acted while other tribes looked inert,
  - the model state was not actually all fallback, but the live UX was effectively indistinguishable from fallback/default behavior for too long.
- Fixes:
  - opening identity generation now bootstraps through the fastest clean schema model (`qwen3.5:9b-mlx` in the current local setup),
  - each tribe's first visible doctrine also bootstraps through that fast model,
  - assigned models are preserved for later strategy turns: current assignments remain blue/qwen, red/gemma, green/gpt-oss, yellow/qwen, purple/gemma,
  - observer text and `render_game_to_text().llm` now expose `identityBootstrapModel`, `strategyBootstrapModel`, and `firstDoctrineProgress`,
  - first-doctrine bootstrap is recorded as `LLM_FIRST_DOCTRINE_BOOTSTRAP` instead of being confused with fallback,
  - `latestAiDecisions` now keeps the last 20 decisions so startup QA can inspect identities, first doctrines, and assigned-model follow-up turns together.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm smoke:ai-fairness` passed: five identities, first five doctrines `blue`, `red`, `green`, `yellow`, `purple`, first doctrines on qwen, later assigned gemma and gpt-oss live turns, fallback 0,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png`,
  - live Ollama first-doctrine probe passed: identity setup 5/5, first doctrines 5/5, firstDoctrineFallbacks empty, no AI issues,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/live-first-doctrines.png`,
  - `pnpm build` passed,
  - `pnpm smoke:mock-ollama` passed after the scheduler change, including parser/transport failure capture, cooldown, canary recovery, and gpt-oss chat adapter coverage,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`,
  - the shared `develop-web-game` Playwright client could not run because its skill folder could not resolve the project's local `playwright` package; project-owned Playwright smokes did run successfully.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab to start from the patched startup path.

### 2026-07-02 Live AI Iteration Monitor Gate

- Added this to the active AI iteration goal: the live local-model startup/iteration path should be a repeatable gate, not an ad hoc manual probe.
- Added `pnpm smoke:live-ai` backed by `scripts/smoke-live-ai-iteration.mjs`.
- The live monitor:
  - uses real Ollama through the running app, with no mocked model routes,
  - waits for five identities and five first doctrines,
  - fails if first doctrines fall back,
  - fails if tribe identities collapse to default names, placeholder sovereign names, fallback naming style, or non-LLM controllers,
  - checks assigned non-bootstrap models are engaged as live or active lanes,
  - checks the AI Report Review panel remains live-scoped and numerically coherent,
  - checks synthetic smoke/mock markers do not leak into `aiIterationPromptContext`,
  - checks saved live AI issues include source, turn context, snapshot URL, category, severity, and saved state,
  - runs `pnpm ai:review:strict -- --json --no-write` after the live sample.
- Extended `render_game_to_text().tribes[]` with `defaultName`, `namingStyle`, and `controller` so QA can assert identity/controller state structurally rather than scraping UI text.
- QA:
  - `node --check scripts/smoke-live-ai-iteration.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 256 snapshots, 0 failures, 0 contract warnings,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed against real Ollama: observer mode, identity setup 5/5, first doctrines 5/5, no first-doctrine fallbacks, defaultNamedTribes empty, qwen/gemma/gpt-oss lanes engaged, no AI issues, strict review clean,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`,
  - `pnpm build` passed,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Fast Bootstrap Regression Fix

- User report: the current live demo still looked like only one team was active and the rest were fallback/default.
- Root cause:
  - the helper contract and tests expected startup identities and first doctrines to use the fastest clean schema model first,
  - but the runtime identity and first-doctrine path had drifted back to each tribe's assigned model first,
  - that meant Blue/qwen appeared alive while Red/gemma and Green/gpt-oss could sit behind cold local model loads, making the page look like one active team plus fallback/default sovereigns.
- Fixes:
  - `identityModelForTribe`, `identityModelsForTribe`, and `strategyBootstrapModelForTribe` now bootstrap startup names and first doctrines through `qwen3.5:9b-mlx` when available,
  - the diverse assigned models are preserved for later turns: blue/yellow on qwen, red/purple on gemma, green on gpt-oss,
  - the AI Observer startup text now explains that startup names/first doctrines use the fast model and assigned models take over afterward,
  - AI iteration prompt memory now explicitly tells sovereigns to inspect unresolved own reports and treat fixed/triaged items as behavior-change lessons,
  - `render_game_to_text().tribes[].iterationInbox` is smoke-tested so each tribe exposes its own AI iteration inbox without synthetic smoke reports leaking into live prompts.
- QA:
  - `node --check scripts/smoke-playwright.mjs && node --check scripts/smoke-live-ai-iteration.mjs && node --check scripts/smoke-ai-fairness.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts` passed: 66 tests,
  - `pnpm smoke:ai-fairness` passed: five identities and first five doctrines all used qwen bootstrap, first doctrines were blue/red/green/yellow/purple, assigned gemma and gpt-oss later engaged, fallback 0,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png`,
  - `pnpm smoke` passed and verified wall/turret visibility, AI report triage, synthetic-report filtering, diplomacy replies, persistent learning, and visible iteration inboxes,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm build` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed against real Ollama: identity setup 5/5, first doctrines 5/5, fallback 0, active post-startup lanes qwen/gemma/gpt-oss, strict AI review clean,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab to clear any old stuck run state.

### 2026-07-02 Live AI Issue Feedback Gate

- Added this to the active AI iteration goal: when a real saved live AI issue appears, the live monitor must prove it re-enters the reporting sovereign's own iteration inbox for future turns.
- Fixes:
  - `scripts/smoke-live-ai-iteration.mjs` now preserves each tribe's `iterationInbox` in the summarized live state,
  - the live monitor validates iteration inbox shape for every tribe: open count, resolved lesson count, bounded preview counts, and synthetic marker isolation,
  - the monitor now checks saved non-synthetic live AI issues against the reporting tribe's inbox and, for the player tribe, against `aiIterationPromptContext`,
  - `scripts/ai-iteration-loop.mjs` now writes iteration inbox totals and per-tribe inbox counts into `AI_ITERATION_STATUS.json`.
- QA:
  - `node --check scripts/smoke-live-ai-iteration.mjs && node --check scripts/ai-iteration-loop.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm ai:iterate:live` passed and refreshed `AI_ITERATION_STATUS.json`,
  - refreshed status: strict review clean, 260 snapshots replayed with 0 failures and 0 contract warnings, real Ollama live startup identity setup 5/5, first doctrines 5/5, fallback 0,
  - this live sample produced 0 live AI issues, so the new issue-to-inbox assertion was armed but had no live report to match,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Deterministic Live Issue Feedback Canary

- Added this to the active AI iteration goal: the live iteration gate should prove a saved live issue re-enters the reporting sovereign's own planning context, instead of only checking this when a model happens to report a bug.
- Fixes:
  - added `window.force_live_ai_issue_for_test` to file a controlled non-synthetic `ollama`/active-model `REPORT_BUG` issue through the same report path used by sovereign decisions,
  - `render_game_to_text().aiIssues[]` now exposes the local issue id for easier monitor correlation,
  - `scripts/smoke-live-ai-iteration.mjs` can force a live feedback canary, verify it appears in Blue's `iterationInbox` and `aiIterationPromptContext`, then mark it `fixed` through `/api/ai-bug-report-triage` with proof before strict review,
  - `scripts/ai-iteration-loop.mjs --live` now enables the canary automatically and reports `forcedLiveIssue`, `iterationOpenReports`, and per-tribe inbox counts in `AI_ITERATION_STATUS.json`,
  - adjusted the canary matcher to normalize prompt/context text before comparing snippets, after the first run correctly revealed punctuation-sensitive matching in the monitor.
- QA:
  - `node --check scripts/smoke-live-ai-iteration.mjs && node --check scripts/ai-iteration-loop.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - strict review was clean after closing the failed-run canary: `actionableUnresolved: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm ai:iterate:live` passed and refreshed `AI_ITERATION_STATUS.json`,
  - refreshed status: forced live issue saved, Blue inbox had 2 open report previews before triage, canary triage status `fixed`, identity setup 5/5, first doctrines 5/5, fallback 0, strict review clean, 261 snapshots replayed with 0 failures and 0 contract warnings,
  - `pnpm ai:review:strict -- --json --no-write` passed after the canary with `fixedWithProof: 125`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`,
  - `pnpm build` passed.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Assigned-Model Startup Correction

- User report: the demo still felt like only one team was working and the others were fallback/default.
- Correction:
  - startup identities and first doctrines now begin on each tribe's assigned local model instead of routing every opening identity/doctrine through qwen first,
  - qwen remains available as a reroute candidate if another assigned local model fails,
  - the AI Observer status text now says assigned models handle startup names and first doctrines, with compatible-model reroutes before fallback,
  - fixed lessons now include category/severity in each resolved lesson string so the live monitor can prove a closed report became an AI-readable lesson,
  - the forced live issue canary now verifies both transitions: saved issue -> open planning inbox, then fixed issue -> resolved lesson/prompt context.
- QA:
  - `node --check scripts/smoke-live-ai-iteration.mjs` passed,
  - `node --check scripts/ai-iteration-loop.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=12000 pnpm ai:iterate:live` passed against real Ollama,
  - refreshed status: startup active jobs included Blue/qwen, Red/gemma, and Green/gpt-oss at tick 35; identity setup 5/5; first doctrines 5/5; fallback 0; model quality qwen live 5, gemma live 4, gpt-oss live 2; forced canary saved, entered open feedback, then triaged fixed and re-entered resolved lessons,
  - `pnpm smoke:ai-fairness` passed after updating the smoke contract to require assigned-model startup: identities used Blue/qwen, Red/gemma, Green/gpt-oss, Yellow/qwen, Purple/gemma; first doctrines covered all five tribes with fallback 0,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`, `parserTransportOpen: 0`, and `fixedMissingProof: 0`,
  - `pnpm test` passed: 68 tests,
  - `pnpm build` passed,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 All-Sovereign AI Report Feedback Gate

- Added this to the active AI iteration goal: bug-report feedback must be proven for every sovereign, not only Blue.
- Fixes:
  - `window.force_live_ai_issue_for_test` now records live-like canary reports with the reporting tribe's assigned model instead of always labeling the active/default model,
  - `window.refresh_ai_report_review_for_test` now returns prompt contexts for every tribe while keeping the existing default player context,
  - `scripts/smoke-live-ai-iteration.mjs` now files one controlled non-synthetic `REPORT_BUG` canary for each tribe, proves it enters that tribe's own open inbox and prompt context, marks all five fixed with proof, then proves each one leaves open reports and appears in that tribe's resolved lessons and prompt context,
  - `scripts/ai-iteration-loop.mjs` now writes all-tribe canary telemetry into `AI_ITERATION_STATUS.json`: tribe id, assigned model, save state, open inbox counts, resolved lesson counts, and prompt-context counts,
  - future AI decisions now receive a non-empty fallback summary before being stored, preventing malformed decision summaries from entering future snapshots,
  - snapshot replay now treats a legacy empty summary as a non-fatal legacy warning while still failing strict replay on missing provider/model/summary fields.
- QA:
  - `node --check scripts/smoke-live-ai-iteration.mjs`, `node --check scripts/ai-iteration-loop.mjs`, and `node --check scripts/replay-ai-snapshots.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 270 snapshots replayed, 0 failures, 0 contract warnings,
  - `pnpm ai:review:strict -- --json --no-write` passed with `actionableUnresolved: 0`, `parserTransportOpen: 0`, and `fixedMissingProof: 0`,
  - `pnpm test` passed: 68 tests,
  - `pnpm build` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm ai:iterate:live` passed and refreshed `AI_ITERATION_STATUS.json`,
  - refreshed live status: identity setup 5/5, first doctrines 5/5, fallback 0, forced canary count 5, fixed canary count 5, all canaries saved with assigned models (Blue/Yellow qwen, Red/Purple gemma, Green gpt-oss), all five entered open prompt contexts, and all five re-entered resolved prompt lessons after triage.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Fast Parallel Startup And Default-Name Rejection

- User report: the live demo still looked like only one team was running and the rest were fallback/default.
- Findings:
  - real Ollama was installed and responding with `qwen3.5:9b-mlx`, `gemma4:12b`, and `gpt-oss:20b`,
  - the assigned-model startup path could leave the visible demo waiting behind slow cold model calls for roughly minutes,
  - a live retry caught a real identity bug: Green accepted `Green Vale` as an LLM-chosen identity even though it was the default placeholder.
- Fixes:
  - opening identities now use the fastest clean schema model first, with up to three startup lanes allowed on that model so multiple sovereigns visibly start together,
  - first doctrines also bootstrap through the fast model, no sovereign gets a second normal strategy turn until all living sovereigns have written a first doctrine, and assigned models take over shortly afterward,
  - `applyTribeIdentity` now rejects default placeholder realm names and placeholder sovereign names before marking an identity chosen,
  - `scripts/smoke-ai-fairness.mjs` now asserts the fast bootstrap opening while still proving assigned `gemma4:12b` and `gpt-oss:20b` model handoff,
  - README now documents the fast startup bootstrap and default-name rejection behavior.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts` passed: 69 focused tests, including default-name rejection,
  - `pnpm test` passed: 70 tests,
  - `pnpm smoke:ai-fairness` passed: first five doctrine turns covered blue/red/green/yellow/purple, startup identities used qwen bootstrap, assignments remained blue/yellow qwen, red/purple gemma, green gpt-oss, fallback 0, gpt-oss clean later turn,
  - `SOVEREIGNS_LIVE_AI_STARTUP_TIMEOUT_MS=180000 SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed against real Ollama: parallel startup lanes 3/3 on qwen, identity setup 5/5, first doctrines 5/5, fallback 0, defaultNamedTribes empty, assigned gemma/gpt-oss lanes active after startup, strict review clean,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png`, `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`, and `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`,
  - `pnpm build` passed,
  - `pnpm smoke` passed with deterministic Ollama route mocks and full UI/regression coverage,
  - `pnpm ai:review:strict -- --json --no-write` passed: `actionableUnresolved: 0`, `actionableBuckets: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 289 snapshots replayed, 0 failures, 0 contract warnings.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab to start a fresh run with the new startup behavior.

### 2026-07-02 Default Live Canary And Reply Iteration Memory

- User report: the live demo had looked like one active team plus fallback/default behavior, and the AI bug-report learning loop needed to prove itself without special test flags.
- Fixes:
  - `pnpm smoke:live-ai` now files controlled live AI bug-report canaries by default, one per sovereign, and only skips them when `SOVEREIGNS_FORCE_LIVE_AI_ISSUE=0`,
  - the smoke output now records whether the forced live issue canary was active,
  - reply prompts now read the same AI iteration memory as strategy turns: unresolved reports, fixed lessons, and prior report context,
  - compact reply retry prompts also include AI iteration memory, so parser/format retries do not lose the learned context,
  - `runSovereignReply` now passes the current tribe's `buildAiIterationPromptContext(tribeId)` into the reply LLM call,
  - README now documents the default live canary behavior and the opt-out flag.
- QA:
  - syntax checks passed for `scripts/smoke-live-ai-iteration.mjs` and `scripts/ai-iteration-loop.mjs`,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run apps/client/src/llm.test.ts --reporter=dot` passed: 39 focused LLM tests,
  - `pnpm test` passed: 74 tests,
  - `pnpm build` passed,
  - default real-Ollama `pnpm smoke:live-ai` passed with `forceLiveIssue: true`, five canaries saved and fixed, identity setup 5/5, first doctrines 5/5, fallback 0, and three active model lanes,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` passed and refreshed `AI_ITERATION_STATUS.json`,
  - final strict AI review passed: 611 reports, `actionableUnresolved: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - final snapshot replay passed: 299 snapshots replayed, 0 failures, 0 contract warnings,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`; the board showed five identities, five doctrines, fallback 0, and active qwen/gemma/gpt-oss lanes.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab to start a fresh run with the fixed startup and live AI feedback behavior.

### 2026-07-02 Stable AI Report Tribe Identity And Clean Live Status

- Added this to the active AI iteration goal: persisted AI reports must keep following the same sovereign across runs even when the LLM chooses a different realm name.
- Findings:
  - persisted markdown and parsed review entries only carried the display tribe name,
  - `buildAiIterationInbox` mapped old reports back to a tribe by matching the current generated name or default name,
  - because sovereign names change between runs, an unresolved report could disappear from that sovereign's future prompt context.
- Fixes:
  - new AI reports now send and persist stable `tribeId` alongside display `tribe`,
  - `AI_BUG_REPORTS.md` entries now include `- Tribe id: <id>`,
  - report turn context now includes `tribeId=<id>`,
  - AI bug snapshots now carry `report.tribeId`,
  - the Vite report parser, strict review parser, and snapshot replay parser all parse the stable tribe id while remaining compatible with old reports,
  - `tribeIdForAiReportEntry` now prefers parsed `tribeId`, then `tribeId=` from turn context, then old display-name matching,
  - `scripts/smoke-live-ai-iteration.mjs` now requires live issues to include `tribeId=` in turn context,
  - `scripts/smoke-playwright.mjs` now exercises and verifies the markdown `Tribe id` field through the direct report endpoint,
  - `scripts/ai-iteration-loop.mjs` now reports both pre-triage and post-triage iteration inbox counts; when all forced canaries are fixed, headline `iterationOpenReports` uses the post-triage count.
- QA:
  - syntax checks passed for touched AI iteration and smoke scripts,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 74 tests,
  - `pnpm smoke` passed against a restarted dev server and verified the direct endpoint writes `- Tribe id: blue`,
  - `pnpm build` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` passed against real Ollama after the stable-id patch,
  - refreshed live status: identity setup 5/5, first doctrines 5/5, fallback 0, five live canaries saved with stable tribe ids, five fixed, `iterationOpenReportsBeforeCanaryTriage: 10`, `iterationOpenReportsAfterCanaryTriage: 0`, headline `iterationOpenReports: 0`,
  - final strict AI review passed after live mutation: 623 reports, `actionableUnresolved: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - final snapshot replay passed after live mutation: 311 snapshots replayed, 0 failures, 0 contract warnings,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`; board showed five identities, five doctrines, fallback 0, qwen/gemma/gpt-oss lanes active, and latest live canary reports.
- Remaining AI iteration backlog:
  - synthetic report filtering is still broad substring matching; a real sovereign report that mentions smoke/mock/playwright could be misclassified as synthetic,
  - LLM/parser/transport lessons are intentionally kept out of sovereign prompt memory; decide whether some model-format lessons should become model-facing behavioral guidance without breaking immersion.
- Current local server:
  - restarted and responding at `http://localhost:5173/`.

### 2026-07-02 Metadata-Only Synthetic Report Classification

- Added this to the active AI iteration goal: real sovereign reports must not be hidden from the live backlog or prompt inbox just because the report prose mentions words like smoke, mock, or playwright.
- Findings:
  - the old review/UI classifier had used broad substring matching over free text,
  - this could suppress a real Ollama report if its story text used a synthetic-test word,
  - the live monitor also had a broad prompt-leak check and correctly failed once a real report with the word `playwright` entered resolved lessons.
- Fixes:
  - `vite.config.ts` and `scripts/ai-iteration-review.mjs` now classify synthetic reports from trusted metadata only: provider, model, and structured source,
  - report body, strategy text, tribe display name, and turn-context prose no longer decide whether a report is synthetic,
  - added `apps/client/src/ai-iteration-review.test.ts` to prove a real Ollama report mentioning smoke/mock/playwright remains actionable while a smoke endpoint report stays synthetic,
  - extended `pnpm smoke` with a browser-level fixture that posts a real-metadata Ollama report whose prose mentions smoke/mock/playwright, proves the summary marks it live, proves it enters Blue's iteration inbox, then marks it fixed with proof,
  - tightened `scripts/smoke-live-ai-iteration.mjs` so synthetic-leak detection looks for known synthetic fixture signatures instead of ordinary words.
- QA:
  - syntax checks passed for touched review and smoke scripts,
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run apps/client/src/ai-iteration-review.test.ts --reporter=dot` passed,
  - `pnpm test` passed: 75 tests,
  - `pnpm smoke` passed against a restarted dev server and exercised the real-report-with-synthetic-words fixture,
  - `pnpm build` passed,
  - first `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` failed usefully because the live monitor still treated `playwright` in real report prose as a synthetic leak,
  - after tightening monitor signatures, `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` passed against real Ollama,
  - refreshed live status: identity setup 5/5, first doctrines 5/5, fallback 0, five canaries saved and fixed, `iterationOpenReportsBeforeCanaryTriage: 5`, `iterationOpenReportsAfterCanaryTriage: 0`, headline `iterationOpenReports: 0`,
  - final strict AI review passed after live mutation: 636 reports, `actionableUnresolved: 0`, `parserTransportOpen: 0`, `fixedMissingProof: 0`,
  - final snapshot replay passed after live mutation: 324 snapshots replayed, 0 failures, 0 contract warnings,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`; board showed five identities, five doctrines, fallback 0, qwen/gemma/gpt-oss lanes active, and latest live canary reports.
- Remaining AI iteration backlog:
  - LLM/parser/transport lessons are intentionally kept out of sovereign prompt memory; decide whether some model-format lessons should become model-facing behavioral guidance without breaking immersion.
- Current local server:
  - responding at `http://localhost:5173/`.

### 2026-07-02 Live AI Startup Queue Fix For One-Team/Fallback Regression

- User report: demo looked like only one team was active and AI behavior was falling back.
- Findings:
  - five tribes were created, but startup identity and first-doctrine helpers still preferred the default qwen bootstrap model over per-tribe assignments,
  - first doctrines were globally blocked until every identity completed,
  - real local Ollama stalled when qwen, gemma, and gpt-oss were called concurrently, while direct one-at-a-time probes passed,
  - the top HUD made the issue look worse by labeling player stats as `Blue` while all-tribe status was less prominent.
- Fixes:
  - identity and first-doctrine startup now prefer each tribe's assigned model,
  - first-doctrine scheduling no longer has an all-tribes identity gate, only per-tribe identity readiness,
  - local LLM calls now run through a one-call queue (`AI lanes 1/1`) so real Ollama does not deadlock during model loading,
  - top HUD now distinguishes player stats from simulation-wide AI status and shows `Tribes`, `Live AI turns`, and `Fallback decisions`,
  - smoke-live, smoke-ai-fairness, and smoke-playwright now guard assigned-model startup and clearer HUD labels.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm smoke:ai-fairness` passed with assigned qwen/gemma/gpt-oss identity and doctrine turns, zero fallback,
  - `pnpm test` passed: 75 tests,
  - `pnpm build` passed,
  - `pnpm smoke` passed and verified `Tribes 5/5`, `AI lanes 0/1`, `Live AI turns`, `Fallback decisions 0`,
  - strict `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` passed against real Ollama: identities 5/5, doctrines 5/5, live decisions 15, fallback 0, qwen/gemma/gpt-oss engaged, five live canaries saved and fixed,
  - strict AI review passed after live mutation: 650 reports, actionable unresolved 0, parser/transport open 0, fixed missing proof 0,
  - snapshot replay passed after live mutation: 338 snapshots replayed, 0 failures, 0 contract warnings,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`; it showed `Tribes 5/5`, `AI lanes 1/1`, `Identities 5/5`, `Doctrines 5/5`, `Live AI turns 15`, and `Fallback decisions 0`.
- Current local server:
  - responding at `http://localhost:5173/`; reload the browser tab for the queued live-AI startup.

### 2026-07-02 Fast Model Pool For Live Demo

- User direction: use a combination of fast models rather than the slower mixed qwen/gemma/gpt-oss pool.
- Changes:
  - default tribe assignments now use the fast pool when available: qwen3.5:9b-mlx plus gpt-oss:20b,
  - gemma4:12b remains installed and schema-compatible but is no longer assigned by default when fast models are available,
  - the default model fallback now prefers gpt-oss before gemma when qwen is unavailable,
  - startup lanes adapt to the number of assigned fast models, so the fresh demo now shows `AI lanes 2/2` instead of `1/1` or a slow three-model mix,
  - strategy rerouting now waits briefly for a busy live model lane instead of immediately using deterministic fallback while compatible live models are active.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts --reporter=dot` passed: 42 tests.
  - `pnpm exec tsc --noEmit` passed.
  - Fresh browser check showed Blue/Green/Purple assigned to qwen3.5:9b-mlx, Red/Yellow assigned to gpt-oss:20b, `AI lanes 2/2`, and `Fallback decisions 0`.
  - Strict AI review passed with zero actionable unresolved reports.
  - Snapshot replay passed: 353 snapshots, zero failures, zero contract warnings.
- Latest screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/live-fast-model-pool.png`.

### 2026-07-02 Fast Model Pool Live Iteration Gate

- Updated the maintained AI fairness smoke to enforce the new fast-model pool:
  - Blue, Green, and Purple use `qwen3.5:9b-mlx`,
  - Red and Yellow use `gpt-oss:20b`,
  - gemma models must not appear in default assignments when qwen/gpt-oss are available.
- Real live gate results:
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm smoke:live-ai` passed against real Ollama,
  - startup showed `AI lanes 2/2` with qwen and gpt-oss active,
  - identities 5/5,
  - first doctrines 5/5,
  - live decisions 16,
  - fallback decisions 0,
  - every tribe had at least one assigned-model autonomous strategy turn,
  - qwen authored a real `REPORT_BUG` for the in-world population-ledger contradiction,
  - all five forced live canary reports saved through their assigned models, entered each sovereign's inbox, were marked fixed, and re-entered resolved lessons.
- Full iteration wrapper:
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm ai:iterate:live` passed and refreshed `/Users/benjaminpommeraud/Desktop/Sovereigns/AI_ITERATION_STATUS.json`,
  - review: actionable unresolved 0, actionable buckets 0, parser/transport open 0, fixed missing proof 0,
  - snapshot replay: 359 replayed, 0 failures, 0 contract warnings,
  - live monitor: iteration open reports before triage 6, after triage 0, resolved lessons 33.
- Broader QA:
  - `node --check scripts/smoke-ai-fairness.mjs && node --check scripts/smoke-live-ai-iteration.mjs && pnpm exec tsc --noEmit` passed,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, qwen clean live decisions 6, gpt-oss clean live decisions 4, fallback 0,
  - `pnpm ai:review:strict -- --json --no-write` passed after live mutation,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed after live mutation,
  - `pnpm test` passed: 78 tests,
  - `pnpm build` passed.
- Latest live screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`.

### 2026-07-02 Smooth RTS Frame Loop And AI Catch-Up Context

- User priority: the board must feel like an RTS, not one visible movement per slow AI/turn update, and background AI processing must not slow the visible world.
- Findings:
  - unit interpolation already existed, but Pixi was effectively rendering far too slowly because the huge terrain graphics were re-rendered every frame,
  - deterministic `advanceTime()` advanced through large second chunks, which hid sub-tick interpolation and used second-to-tick rounding,
  - HUD, labels, overlays, and hover work were refreshed too often relative to visible unit movement,
  - throttling AI turns is only acceptable if each sovereign gets a complete accessible catch-up brief since its last strategy move.
- Changes:
  - added exact `advanceGameTicks()` and moved the client ticker/test hook onto fixed simulation ticks,
  - cached the static terrain as a Pixi texture; terrain redraws now recache only when the terrain layer is explicitly refreshed,
  - split dynamic rendering so units/routes update every frame while HUD, labels, resource/defense overlays, and hover refresh on slower cadences,
  - set Pixi ticker bounds to target smooth rendering with a 24 fps floor,
  - exposed clock diagnostics in `render_game_to_text()` including tick rate, render alpha, measured FPS, frame delta, and render duration,
  - added a frame-pressure guard: startup identities and first doctrines are allowed, but follow-up background AI jobs pause when measured browser FPS is below the smoothness floor,
  - added per-sovereign "Since your last move" prompt context containing previous strategy outcome, newly visible events, newly accessible diplomacy, and new information answers,
  - added placed wall/turret AI order coordinates and natural-language wall policy conversion into legal `DEVELOP`/`BUILD` orders when available,
  - added `pnpm smoke:smooth` to verify a moving unit has interpolated visual position while the browser stays at or above the 24 fps floor with mocked background AI.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts --reporter=dot` passed: 79 tests,
  - `pnpm smoke:smooth` passed with measured FPS 24.7+, render alpha between ticks, and visible unit interpolation,
  - `pnpm smoke:buildings` passed and verified wall/turret visibility after terrain caching,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments and fallback 0,
  - `pnpm test` passed: 82 tests,
  - `pnpm smoke` passed after making `advanceTime(0)` a true no-op and removing volatile countdown text from the hook,
  - `pnpm build` passed.
- Latest smoothness screenshot: `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-frame-loop.png`.
- Next backlog:
  - run a longer real-Ollama live soak with the frame-pressure guard enabled and forced reports disabled,
  - consider moving AI calls into a dedicated worker/server-side queue if local model CPU still makes the Mac feel sluggish,
  - add in-game frame/AI pressure indicators only if needed for debugging; keep the player-facing UI quiet by default.

### 2026-07-04 Per-Sovereign Catch-Up And Canary Isolation

- User priority: each AI must catch up on the full context accessible to that sovereign since its last move.
- Findings:
  - strategy prompts already had a "Since your last move" section, but its cursor was the last strategy decision, so a later reply could leave the next strategic brief anchored to stale context,
  - reply prompts had no equivalent catch-up section, so an AI answering a messenger could miss newly visible world events or information answers unless those happened to be in memory,
  - one unresolved live-authored integrity canary from 2026-07-02 remained in the live backlog and could pollute sovereign iteration memory even though the saved snapshot showed the tribe actually had living population.
- Changes:
  - catch-up now anchors to the last sovereign AI move, including replies, while still referencing the last strategy when useful,
  - normal and compact reply prompts now include the same visibility-respecting catch-up brief,
  - catch-up continues to include only accessible context: visible/public events, delivered/read diplomacy, own sent diplomacy, and own information answers since the cursor,
  - live-authored integrity canaries now save with `kind=live_integrity_canary` metadata and are treated as synthetic QA by the dev-server summary, strict review, and live smoke harness,
  - test-only integrity canaries are excluded from sovereign prompt memory and iteration inboxes; normal live `report_bug_order` reports still flow into the reporting tribe's inbox and resolved lessons,
  - closed the historical 2026-07-02 zero-population canary artifact with proof instead of editing report history,
  - hardened LLM prompt text cleanup so non-string state values cannot crash live prompt assembly.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts apps/client/src/ai-iteration-review.test.ts apps/client/src/replay-snapshots.test.ts --reporter=dot` passed: 51 tests,
  - `pnpm test` passed: 85 tests,
  - `pnpm smoke:smooth` passed with measured FPS 28.5 and visible interpolation,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments and fallback 0,
  - `pnpm smoke:buildings` passed and confirmed wall/turret visibility,
  - `pnpm smoke` passed,
  - `SOVEREIGNS_LIVE_AI_SAMPLE_MS=3000 pnpm smoke:live-ai` passed against real Ollama after adding a busy-lane retry for the canary hook,
  - final `pnpm ai:review:strict -- --json --no-write` passed with 690 total reports, 0 actionable unresolved reports, 0 actionable buckets, 0 parser/transport open, and 0 fixed reports missing proof,
  - final `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 378 snapshots replayed, 0 failures, and 0 contract warnings,
  - final `pnpm build` passed.
- Next backlog:
  - run a longer real-Ollama soak with forced report canaries disabled to evaluate uninterrupted diplomacy/strategy quality,
  - decide whether old fixed canary lessons should be hidden from resolved lessons once they are no longer useful to sovereign planning,
  - continue improving actual strategic use of the catch-up feed: multi-message negotiation memory, explicit promise tracking, and detection of lies/betrayals.

### 2026-07-04 Catch-Up Information Boundaries

- Follow-up on the per-sovereign catch-up work: the feed now respects what each sovereign could physically or privately know.
- Changes:
  - `LLM_DECISION` events are private to the sovereign that made the decision, so another AI no longer sees rival private strategy summaries through public event catch-up,
  - messenger replies are created as sealed return messages without `deliveredTick` or `readTick`; the origin sovereign only reads the reply after the carrier physically completes the return trip,
  - sender prompts exclude reply bodies while the messenger is still returning, then include them after completion,
  - regression tests cover both boundaries: Blue does not receive Red's private strategy summary, and Blue cannot read Green's reply before the messenger returns,
  - the mocked-Ollama smoke was made repeatable with persisted AI reports by filtering to current-run issue IDs and advancing virtual time after pressure-gated manual AI asks.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts --reporter=dot` passed: 83 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 87 tests,
  - `pnpm smoke:smooth` passed with measured FPS 26.5 and visible interpolation,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, clean model quality, and fallback 0,
  - `pnpm smoke:buildings` passed and verified farm/watchtower/wall/turret visibility,
  - `pnpm smoke` passed,
  - `pnpm smoke:mock-ollama` passed after the harness timing fix,
  - final `pnpm ai:review:strict -- --json --no-write` passed with 716 total reports, 0 actionable unresolved reports, 0 actionable buckets, 0 parser/transport open, and 0 fixed reports missing proof,
  - final `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 404 snapshots replayed, 0 failures, and 0 contract warnings,
  - final `pnpm build` passed.
- Remaining backlog:
  - "full context" is still bounded in prompt size; add omission counts or structured expandable context before increasing token load,
  - foreign unit/building context is still mostly current visibility, not a since-last-move observation delta,
  - `state.aiDecisions` is still capped globally at 40; add per-tribe last-move cursors before long soaks.

### 2026-07-05 Durable Catch-Up Cursor And Omission Counts

- Continued the active AI iteration/catch-up goal: each sovereign should catch up from its own last move even in long games.
- Findings:
  - prompt catch-up used `state.aiDecisions` to find each sovereign's last move and last strategy,
  - `state.aiDecisions` is intentionally capped globally at 40, so one sovereign's last move could be evicted by other sovereign turns during longer games,
  - catch-up lists were bounded but did not tell the model when older accessible items were omitted.
- Changes:
  - added `sovereignDecisionCursors` to `GameState` with per-tribe `lastMove` and `lastStrategy`,
  - `recordAiDecision()` now updates those cursors while preserving the existing rules: identity decisions do not count as moves, and reply decisions count as moves but not strategy decisions,
  - `summarizeSovereignCatchUp()` now reads the durable cursor first and falls back to the bounded decision list for older/legacy state shapes,
  - visible events, diplomacy, and information-answer sections now include omission counts when the prompt shows only the latest bounded subset,
  - added regression coverage for global-history eviction and bounded visible-event omission disclosure.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts packages/sim/src/sim.test.ts --reporter=dot` passed: 86 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 90 tests,
  - `pnpm smoke:smooth` passed with measured FPS 26.0 and visible interpolation,
  - generic web-game skill client ran against `http://localhost:5173` and produced valid `render_game_to_text` state; its raw canvas screenshot was black, so visual verification used the project full-page smoke screenshots,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, clean model quality, and fallback 0,
  - final `pnpm ai:review:strict -- --json --no-write` passed with 716 total reports, 0 actionable unresolved reports, 0 actionable buckets, 0 parser/transport open, and 0 fixed reports missing proof,
  - final `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 404 snapshots replayed, 0 failures, and 0 contract warnings,
  - final `pnpm build` passed.
- Remaining backlog:
  - add actual since-last-move observation deltas for visible foreign units/buildings instead of only current visible projections,
  - consider an expandable structured context store if omission counts become frequent in long live games,
  - run a longer real-Ollama diplomacy soak without forced canaries to evaluate whether AIs use the improved catch-up feed well.

### 2026-07-05 Scouting Observation Catch-Up

- Continued the same catch-up goal with the missing visible-world delta layer: each sovereign now gets a bounded journal of foreign units/buildings newly seen or lost from sight since its last move.
- Changes:
  - added per-sovereign `foreignObservations` and `foreignObservationMemory` to simulation state,
  - visibility refresh now records `unit_seen`, `unit_lost`, `building_seen`, and `building_lost` entries for only the observer's visible foreign subjects,
  - initial world visibility seeds observation memory without creating fake "new sighting" noise at turn 0,
  - normal and compact decision/reply catch-up briefs now include "new scouting observations" with omission counts when older observations are bounded out,
  - `render_game_to_text` now exposes the current player's latest foreign observation journal for live inspection,
  - regression tests cover visible Red unit/building seen/lost entries and prompt inclusion without hidden Yellow context.
- QA:
  - `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 88 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 92 tests,
  - `pnpm smoke:smooth` passed with measured FPS 27.9 and visible interpolation,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, fallback 0, and all five tribes taking model-backed decisions,
  - `pnpm ai:review:strict -- --json --no-write` passed with 716 total reports, 0 actionable unresolved reports, 0 actionable buckets, and 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 404 snapshots replayed, 0 failures, and 0 contract warnings,
  - headless browser `render_game_to_text()` check passed with `foreignObservations` exposed as an array at `http://localhost:5173/`,
  - `pnpm build` passed.
- Remaining backlog:
  - evaluate whether sovereigns actually use the new scouting observations in a longer real-Ollama diplomacy/war soak,
  - add an expandable structured context store if long games start omitting too many accessible observations/messages,
  - continue promise/lie/betrayal tracking so discussion history becomes strategic memory, not just prompt text.

### 2026-07-05 Fuller Accessible Catch-Up Packets

- Follow-up on the user's priority that each AI catch up on the full context accessible to it since its last move.
- Findings:
  - normal prompts still used small bounded catch-up lists even after omission counts were added,
  - a normal 25-event public window could drop older accessible events, which was honest but not good enough for sovereign strategic continuity,
  - compact retry prompts still need to remain smaller because they are used after parser/transport failures.
- Changes:
  - normal catch-up packets now carry much larger accessible windows: 80 visible events, 80 scouting observations, 60 diplomacy items, and 30 information answers before any section-level omission,
  - normal prompts label the section as a complete accessible context packet and state that omissions only happen when explicitly named,
  - compact retry prompts keep tighter limits but now also label themselves as compact packets with explicit omission behavior,
  - the final catch-up text uses a 9000-character emergency cap for normal prompts and a 2200-character cap for compact prompts, with an explicit emergency note if the character cap is hit,
  - tests now verify ordinary 25-event windows include both first and latest public signals, while a heavier 90-event window explicitly reports the 10 older visible events omitted.
- QA:
  - `pnpm exec vitest run apps/client/src/llm.test.ts --reporter=dot` passed: 53 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 93 tests,
  - `pnpm smoke:smooth` passed with measured FPS 25.5 and visible interpolation,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, fallback 0, and all five tribes taking model-backed decisions,
  - latest `sovereign-worlds-smooth-frame-loop.png` and `sovereign-worlds-ai-fairness.png` were visually inspected and show the rendered game board plus AI observer panel,
  - generic web-game Playwright client completed against `http://localhost:5173` with a short idle action burst,
  - `pnpm ai:review:strict -- --json --no-write` passed with 716 total reports, 0 actionable unresolved reports, 0 actionable buckets, and 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 404 snapshots replayed, 0 failures, and 0 contract warnings,
  - `pnpm build` passed.
- Remaining backlog:
  - run a longer real-Ollama soak to check whether the fuller catch-up packet improves actual diplomacy, deception, scouting, and bug reporting behavior,
  - add structured promise/lie/betrayal tracking so discussions become durable strategic memory beyond raw prompt text,
  - if long games hit emergency caps often, promote older accessible context into a per-sovereign compressed archive instead of relying on one prompt packet.

### 2026-07-05 Diplomatic Intelligence Ledger

- Continued the roadmap item that discussion history should become strategic memory, not just recent prompt text.
- Changes:
  - added a per-sovereign `diplomaticIntel` ledger to simulation state,
  - messages are classified as offer, promise, threat, question, demand, claim, or refusal,
  - outgoing messages are recorded immediately for the sender,
  - delivered/read messages are recorded for the recipient only when physically delivered,
  - sealed replies are recorded for the replying sovereign when sealed, but are not recorded for the original sender until the messenger returns,
  - foreign claims are marked as unverified and may be false in the prompt-facing summary,
  - normal, compact, decision, and reply prompts now include a diplomatic intelligence ledger and an explicit rule to use it for promises, threats, demands, offers, refusals, questions, claims, lies, and suspected deception,
  - `render_game_to_text()` now exposes a compact `diplomaticIntel` string per tribe for live inspection.
- QA:
  - `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 90 tests,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 94 tests,
  - `pnpm smoke:smooth` passed with measured FPS 24.2 and visible interpolation,
  - `pnpm smoke:ai-fairness` passed with qwen/gpt assignments, fallback 0, and all five tribes taking model-backed decisions,
  - latest `sovereign-worlds-smooth-frame-loop.png` and `sovereign-worlds-ai-fairness.png` were visually inspected and show the rendered game board plus AI observer panel,
  - `pnpm ai:review:strict -- --json --no-write` passed with 716 total reports, 0 actionable unresolved reports, 0 actionable buckets, and 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed with 404 snapshots replayed, 0 failures, and 0 contract warnings,
  - `pnpm build` passed,
  - headless browser `render_game_to_text()` check passed with `diplomaticIntel` exposed for all 5 tribes,
  - generic web-game Playwright client completed against `http://localhost:5173` with a short idle action burst.
- Remaining backlog:
  - run a longer real-Ollama diplomacy/war soak to see whether the new ledger improves alliance formation, deception, betrayal, and bug reporting,
  - add explicit contradiction tracking when a sovereign's observed behavior conflicts with a prior claim or promise,
  - add compressed per-sovereign archives if long games outgrow the live prompt packet.

### 2026-07-05 Roadmap QA, Catch-Up Tightening, PixiJS Graphics, And Gates

- User priority handled first: previous roadmap items were QAed before moving to the next feature.
- QA evidence for existing roadmap slice:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm test` passed: 95 tests,
  - `pnpm build` passed,
  - `pnpm smoke:smooth` passed after stabilizing the forced-motion smoke hook; latest measured FPS was 27.4 with visible interpolation,
  - `pnpm smoke:buildings` passed and verified farm, watchtower, wall, and turret visibility,
  - `pnpm smoke:mock-ollama` passed and verified parser/transport/cooldown/recovery behavior,
  - `pnpm smoke:ai-fairness` passed and verified first turns across blue, red, green, yellow, purple with qwen/gpt-oss assignments and fallback 0,
  - `pnpm smoke` passed and verified wall/resource UI, report review, request-info, diplomacy reply, survival learning, persistence, and screenshot capture,
  - `pnpm ai:review:strict -- --json --no-write` passed after smoke with 0 actionable unresolved live reports, 0 actionable buckets, 0 parser/transport open, and 0 fixed reports missing proof,
  - `SOVEREIGNS_FORCE_LIVE_AI_ISSUE=0 SOVEREIGNS_FORCE_LIVE_AUTHORED_BUG_REPORT=0 SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed with all five live identities and first doctrines, qwen/gpt-oss engaged, zero first-doctrine fallbacks, and strict review clean.
- Smooth-frame QA fix:
  - `window.force_visual_motion_for_test()` now chooses a longer route and centers the camera on the moving unit,
  - `scripts/smoke-smooth-frame-loop.mjs` waits long enough for a valid FPS sample and still requires 24+ FPS plus visual interpolation.
- Catch-up prompt tightening:
  - full, compact, and reply prompts now use the same per-sovereign last-move cursor for "Recent diplomacy" and "Recent information answers",
  - old diplomacy remains available in the durable diplomatic intelligence ledger when legitimately known, but is no longer replayed as new/recent context,
  - regression coverage now verifies old information answers and old diplomacy do not re-enter the recent/catch-up channels after a newer sovereign move.
- Roadmap update:
  - added a PixiJS v8 graphics production track because the board is still too conceptual/debug-like,
  - visual roadmap now calls for terrain/resource sprites, unit/building silhouettes, wall/gate state art, animation cues, construction/damage/firing effects, zoom-aware labels, and PixiJS layer hierarchy,
  - added the hard rule that walls block everyone, including their owning tribe and allies,
  - added lockable gatehouses as the controlled passage solution: gates can be open, closed, locked, damaged, destroyed, and governed by access policies.
- Remaining backlog:
  - implement actual gate buildings and pathfinding access rules,
  - add PixiJS sprite/texture production pass while preserving the smooth-frame gate,
  - run a longer real-Ollama diplomacy/war soak to evaluate whether the improved catch-up and ledger change AI strategy,
  - add contradiction tracking for broken promises, lies, gate-access betrayals, and observed behavior that conflicts with claims.

### 2026-07-05 Gate Mechanics, Armor Stats, And Fortification QA

- Implemented the first working gate slice:
  - `gate` is now a buildable structure unlocked by Masonry plus Ironworking,
  - walls remain absolute movement blockers for everyone, including the owning tribe and allies,
  - gates default to `open`, can be set to `closed` or `locked`, and closed/locked gates block movement until reopened or destroyed,
  - `SET_GATE` is now a legal sovereign order with `gateState` and optional `buildingId`,
  - LLM prompts, schema, order availability, and policy conversion now include gates and lockable gate strategy.
- Added combat stats:
  - all units and buildings now carry health, armor, attack, and range stats,
  - armor reduces incoming unit/building damage with a minimum 1 damage floor for nonzero hits,
  - walls and gates are durable but still destroyable,
  - UI selected panels, hover text, `render_game_to_text()`, AI snapshots, and turn context expose the new stats.
- UI/graphics:
  - added `Build gate` debug control,
  - added `GT` legend and build-cost display,
  - PixiJS map rendering now draws gates as distinct fortification tiles with open/closed/locked visual state,
  - defense overlay includes gates and highlights blocking gate states.
- QA:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts apps/client/src/replay-snapshots.test.ts --reporter=dot` passed: 96 tests,
  - full `pnpm test` passed: 98 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed and verified farm/watchtower/wall/gate/turret creation, visible construction markers, gate lock state, and combat stat exposure,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; `NEW GT` is visible beside the wall cluster and the controls/legend include gate,
  - `pnpm smoke:smooth` passed with measured FPS 27.7 and visible interpolation,
  - full `pnpm smoke` passed after updating gate labels and map-layer text,
  - `pnpm smoke:mock-ollama` passed and verified the schema/report path with `gates=0` in turn context.
- Remaining backlog:
  - expand gate access policies beyond the first `all` / `owner_allies` / `owner_only` layer into richer diplomacy, sabotage, toll, and automation rules,
  - add advanced siege tools, repairs, wall/gate damage states, and breach previews on top of explicit building-target attacks,
  - add gate diplomacy behaviors: safe passage treaties, betrayal by locking gates, tolls, ambushes, and sabotage,
  - continue the PixiJS graphics production pass with sprite/texture assets and clearer wall/gate/turret silhouettes.

### 2026-07-05 Gate Access Policies And Destroyable-Wall Combat QA

- Implemented the first gate access-policy layer:
  - open gates now support `all`, `owner_allies`, and `owner_only`,
  - gates default to `owner_allies`,
  - closed and locked gates still block everyone, including the owning tribe,
  - pathfinding and in-progress movement now evaluate gate access from the moving unit's tribe,
  - units recover cleanly if a gate becomes forbidden while they are en route.
- Exposed the policy to AIs and the observer UI:
  - `SET_GATE` orders can include `gateAccessPolicy`,
  - LLM schema, prompt text, order normalization, building summaries, and order availability include gate policy,
  - selected-panel text, hover text, and `render_game_to_text()` expose policy and passable tribes.
- Strengthened the stat/destruction contract:
  - current combat-relevant board entities are units and buildings; both carry health, armor, attack, and range,
  - future targetable items or siege objects should inherit the same stat contract,
  - added regression coverage that a hostile militia destroys a wall through normal combat ticks, proving walls are destructible in play.
- Browser QA:
  - `pnpm smoke:buildings` now builds farm, watchtower, wall, gate, and turret, verifies gate policy in the panel/hook, locks the gate, and confirms stat exposure.
  - Visual inspection of `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png` confirmed the buildings render, though clustered `NEW` labels remain visually busy near the town hall.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run packages/sim/src/sim.test.ts --reporter=dot` passed: 41 tests,
  - full `pnpm test` passed: 101 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed,
  - `pnpm smoke:smooth` passed with measured FPS 28.3 and smooth visual interpolation,
  - `pnpm smoke:mock-ollama` passed with parser/transport/cooldown recovery and gpt-oss chat adapter coverage,
  - `pnpm smoke:ai-fairness` passed with mixed qwen/gpt-oss assignments and zero fallback decisions,
  - full `pnpm smoke` passed with board, diplomacy, report review, info request, wall/resource, gate, learning, persistence, and screenshot checks.
- Remaining backlog:
  - expand explicit attack-building / attack-wall / attack-gate siege orders into richer siege tools, repairs, and damage states,
  - add gate diplomacy mechanics around safe-passage treaties, tolls, betrayal, sabotage, and ambushes,
  - improve PixiJS visuals with clearer wall/gate/turret silhouettes and zoom-aware construction labels,
  - keep all future targetable items on the health/armor/attack/range stat contract.

### 2026-07-05 Explicit Siege Orders

- Implemented the first intentional siege-order slice:
  - `ATTACK` can now carry `targetBuildingId`,
  - AIs can target a visible hostile wall, gate, turret, or building by exact id,
  - siege attacks declare war and break alliances through the same path as tribe-level attacks,
  - military units receive an `attackBuilding` task and path to an adjacent walkable attack position,
  - targeted building attacks damage the ordered structure before ambient building priorities,
  - destroyed walls/gates/buildings still use normal armor-reduced combat and `STRUCTURE_DESTROYED` events.
- Exposed the feature to AI and UI:
  - LLM decision schema accepts `targetBuildingId`,
  - prompts list visible foreign building ids, hp, armor, attack/range, position, and gate policy,
  - order availability lists targetable visible building ids,
  - browser/unit task text now says when a unit is attacking a specific wall/building.
- Browser QA:
  - added `window.force_siege_for_test()` to create a weakened hostile wall, issue a real `ATTACK` order with `targetBuildingId`, advance combat, and report task/event evidence,
  - `pnpm smoke:buildings` now fails unless the explicit siege target is destroyed through the browser path.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 100 tests,
  - full `pnpm test` passed: 104 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with `WAR_SIEGE_ORDER` and `STRUCTURE_DESTROYED` evidence for `test_siege_wall`,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; construction labels are visible but still crowded near the town hall,
  - `pnpm smoke:smooth` passed with measured FPS 25.5 and smooth interpolation,
  - `pnpm smoke:mock-ollama` passed,
  - `pnpm smoke:ai-fairness` passed with mixed qwen/gpt-oss assignments and zero fallbacks,
  - full `pnpm smoke` passed,
  - the shared `develop-web-game` Playwright client ran successfully against `http://localhost:5173`.
- Remaining backlog:
  - add actual siege engines and repair actions,
  - add damaged wall/gate visuals and breach previews,
  - add gate diplomacy around safe-passage treaties, tolls, betrayal, sabotage, and ambushes,
  - improve PixiJS silhouettes and zoom-aware construction labels.

### 2026-07-05 Repair Orders And Combat Stat Contract

- Completed the first structure-repair slice:
  - `REPAIR` is now a real sovereign order, not only a type placeholder,
  - damaged owned buildings can be targeted by `targetBuildingId` or `buildingId`,
  - idle peons path to an adjacent repair tile and restore building health up to `maxHp`,
  - repair costs scale to missing health and draw from the same construction resources that define the building tree,
  - destroyed buildings remain deleted and cannot be resurrected,
  - foreign buildings and full-health buildings are rejected.
- Preserved the combat-stat contract:
  - current units and buildings all expose health, armor, attack, and range,
  - walls remain destroyable through normal armor-reduced combat and stop blocking once destroyed,
  - future targetable items, siege engines, or resource-processing installations should keep the same health/armor/attack/range contract.
- Exposed repair to AIs and the observer UI:
  - LLM schema accepts `REPAIR`,
  - prompts now list owned building ids with health, armor, attack/range, and gate policy,
  - order availability shows damaged owned repair targets and scaled repair cost,
  - selected damaged buildings show repair cost,
  - unit task text distinguishes `Repairing ...` from attacking.
- Browser QA:
  - added `window.force_repair_for_test()` to damage an owned wall/gate/turret-class structure, issue a real `REPAIR` order, advance ticks, and return before/after HP, task text, and events,
  - `pnpm smoke:buildings` now verifies construction visibility, explicit siege destruction, and successful repair in the same live-browser run.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 103 tests,
  - full `pnpm test` passed: 107 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with `AI_REPAIR_ORDER` and `STRUCTURE_REPAIRED` evidence,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; construction cluster, selected turret, resource labels, and overlays remained readable,
  - `pnpm smoke:smooth` passed with measured FPS 26.5 and visible interpolation,
  - `pnpm smoke:mock-ollama` passed with parser/transport/cooldown recovery and gpt-oss chat adapter coverage,
  - `pnpm smoke:ai-fairness` passed with mixed qwen/gpt-oss assignments and zero fallback decisions,
  - full `pnpm smoke` passed with board, diplomacy, report review, info request, wall/resource, gate, learning, persistence, and screenshot checks.
- Remaining backlog:
  - add siege engines, breach previews, and richer multi-unit assault doctrines,
  - add visual damage states for walls/gates/turrets so damaged defenses read at a glance,
  - add contested field-repair behavior under fire,
  - expand gate diplomacy around safe-passage treaties, tolls, betrayal, sabotage, and ambushes,
  - continue PixiJS visual production work with clearer fortification silhouettes and zoom-aware construction labels.

### 2026-07-05 Durability Visualization And Structured AI Review

- Completed the durability/readability slice on top of the existing combat stat contract:
  - visible units now expose `healthPct`, `condition`, and a `combatStats` snapshot through `render_game_to_text`,
  - visible buildings now expose `healthPct`, `condition`, `damageState`, `repairState`, `blocksMovement`, and a `combatStats` snapshot,
  - selected panels and hover cards now show condition percentages in addition to health, armor, attack, and range,
  - damaged walls and gates draw cracks, rubble, health bars, and critical breach marks,
  - damaged turrets draw cracks/scorch marks and critical foundation damage,
  - damaged units get an extra visible warning ring below two-thirds health,
  - buildings under repair draw a blue repair cue and recently repaired buildings draw a green pulse.
- Strengthened browser QA:
  - added `window.force_damage_building_for_test()` to select a fortification, damage it, and expose selected-panel condition text,
  - `window.force_repair_for_test()` now repairs the currently selected damaged owned fortification when available,
  - `pnpm smoke:buildings` now proves newly built structures expose intact stat/condition fields, hostile siege still destroys a wall, and one selected fortification moves through damaged -> repairing -> recently repaired states with hook and panel evidence.
- Completed the AI-review parser improvement already in flight:
  - `scripts/ai-iteration-review.mjs` extracts structured `REPORT_BUG` fields from persisted report prose,
  - ranked backlog JSON now carries `latestStructured` with suspected area, expected/actual behavior, repro, strategy impact, and severity,
  - unit coverage verifies those fields survive into the ranked backlog.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/ai-iteration-review.test.ts --reporter=dot` passed: 48 tests,
  - full `pnpm test` passed: 108 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with `test_siege_wall` destruction plus damaged/repaired `gate_0001` evidence,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; the board renders normally and the selected repaired fortification cluster is visible, though settlement labels remain dense,
  - shared `develop-web-game` client completed and captured live state containing the new combat stats, but its screenshots were black in both headless and headed mode for this Pixi surface; do not use those generic-client PNGs as visual evidence for this slice,
  - `pnpm ai:review:strict -- --json --no-write` passed after full smoke: 0 actionable unresolved, 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 446 replayed, 0 failures, 0 contract warnings,
  - `pnpm smoke:smooth` passed with measured FPS 28.3 and visible interpolation,
  - full `pnpm smoke` passed with board, diplomacy, AI report review, information request, learning, and persistence checks.
- Remaining backlog:
  - add siege engines, breach previews, and richer multi-unit assault doctrines,
  - improve label placement and zoom-aware construction/repair labels around dense settlements,
  - add contested field-repair behavior under fire,
  - expand gate diplomacy around safe-passage treaties, tolls, betrayal, sabotage, and ambushes,
  - keep every future targetable item, siege engine, and processing building on the health/armor/attack/range plus condition/repair-state contract.

### 2026-07-05 Combat Stat Contract Hardening

- Responded to the new durability requirement by tightening the actual model contract:
  - introduced shared `CombatStats` and `DamageableWorldObject` types,
  - made units and buildings inherit the same health, armor, attack/range, and cooldown fields,
  - added stat snapshot helpers for units and buildings,
  - made resource deposits first-class statted map items with health, armor, attack/range, and cooldown metadata,
  - resource gathering now reduces deposit health alongside finite amount.
- Preserved and rechecked wall destruction:
  - walls already block movement until destroyed,
  - armor-reduced building damage still deletes destroyed walls and makes their tile walkable,
  - browser damage QA now uses `damageBuilding()` instead of direct HP mutation.
- Tightened visibility and UI:
  - zero-health buildings are filtered out of visible-building projections,
  - resource samples in `render_game_to_text()` now include hp, maxHp, health percentage, armor, attack, and range,
  - resource hover cards now show deposit health, condition, armor, attack, and range.
- QA completed so far:
  - `node --check scripts/smoke-live-ai-iteration.mjs && node --check scripts/ai-iteration-loop.mjs` passed,
  - `pnpm exec tsc --noEmit` passed,
  - `pnpm exec vitest run packages/sim/src/sim.test.ts --reporter=dot` passed: 46 tests,
  - full `pnpm test` passed: 109 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with real `damageBuilding()` evidence for damaged/repaired `gate_0001` and `test_siege_wall` destruction,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; the construction cluster and labels are visible, though dense,
  - `pnpm smoke:smooth` passed with measured FPS 28.4 and visible interpolation,
  - full `pnpm smoke` passed with board, diplomacy, report review, info request, wall/resource, learning, and persistence checks,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`; the board and AI report review panel render normally,
  - shared `develop-web-game` Playwright client exited cleanly, but did not emit a new screenshot path,
  - first bounded `pnpm smoke:live-ai` runs exposed that 45s/180s post-fix windows could fail while later tribes were still waiting or thinking,
  - fixed live smoke by raising the default post-fix sample window and adding a drain phase for in-flight post-fix strategy jobs,
  - final `SOVEREIGNS_LIVE_AI_SAMPLE_MS=8000 pnpm smoke:live-ai` passed with post-fix strategy coverage for all five tribes, 24 live AI turns, 0 fallback decisions, and no duplicate fixed reports,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-live-ai-iteration.png`; all identities/doctrines are complete and the AI observer panel renders normally,
  - `pnpm ai:review:strict -- --json --no-write` passed after live smoke: 0 actionable unresolved, 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 449 replayed before live smoke and 470 replayed through the AI iteration wrapper after live smoke, 0 failures, 0 contract warnings,
  - `node scripts/ai-iteration-loop.mjs --output /tmp/sovereign-ai-iteration-status.json` passed.
- Remaining backlog:
  - add explicit damage/destruction mechanics for future inventory items, siege engines, and processing installations as they become real entities,
  - keep using live smoke to verify that fixed AI reports become later non-report strategy, not repeated complaints.

### 2026-07-05 Resource Raid And Deposit Destruction

- Closed the open resource-deposit attackability decision with the first intentional raid slice:
  - `ATTACK` orders can now target a visible resource tile through `targetX`, `targetY`, and `targetResourceType`,
  - military units receive an explicit `attackResource` task, path into range, and damage the deposit through the same armor-reduced combat loop used for walls,
  - resource deposits now expose `getResourceDepositCombatStats()` and `damageResourceDeposit()` as public stat/damage helpers,
  - destroyed or exhausted deposits are removed from map summaries and emit `RESOURCE_DEPOSIT_DESTROYED` evidence,
  - ordinary gathering still depletes deposit health/amount, but resource raids now make coal/iron/gold/stone denial an intentional strategic action.
- Exposed the mechanic to AIs and QA:
  - LLM schema accepts `targetResourceType`,
  - prompts and compact retries list visible raidable deposits with type, coordinate, amount, hp, and armor without exposing hidden rival wealth,
  - order availability lists `targetResource options`,
  - browser task text reports `Raiding iron deposit at x,y`,
  - `window.force_resource_raid_for_test()` proves an order-driven browser raid destroys a visible iron deposit.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 107 tests,
  - full `pnpm test` passed: 112 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with `RESOURCE_RAID_ORDER` and `RESOURCE_DEPOSIT_DESTROYED` evidence for the iron deposit at 49,52,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; board, labels, construction cluster, and overlays remained readable,
  - `pnpm smoke:smooth` passed with measured FPS 29 and smooth visual interpolation,
  - `pnpm ai:review:strict -- --json --no-write` passed: 0 actionable unresolved, 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed after full smoke: 479 replayed, 0 failures, 0 contract warnings,
  - `pnpm smoke:mock-ollama` passed on rerun with parser/transport/cooldown recovery and gpt-oss chat adapter coverage; first run timed out waiting for the post-cooldown recovery decision,
  - full `pnpm smoke` passed with board, diplomacy, AI report review, information request, post-game learning, persistence, and screenshot checks,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`; the board and AI report review panel render normally.
- Remaining backlog:
  - make survival scoring and AI prompts account for controlled, defended, raided, and denied resource deposits,
  - add siege engines, breach previews, and contested field repair under fire,
  - improve PixiJS resource/fortification silhouettes and zoom-aware labels,
  - keep every future targetable item, siege engine, inventory object, and processing building on the health/armor/attack/range plus destruction contract.

### 2026-07-05 Combat Stat Coverage And Siege QA Hardening

- Responded to the follow-up requirement that every unit and item has health, armor, and attack stats:
  - exported declared `unitTypes` and `buildingTypes` so tests can cover the full entity type surface instead of only currently spawned units/buildings,
  - moved unit cooldown into the unit stat definition table so every unit type has a complete health/armor/attack/range/cooldown contract at definition time,
  - added `getUnitTypeCombatStats()`, `getBuildingTypeCombatStats()`, and `getResourceTypeCombatStats()` for type-level QA and future tooling,
  - expanded the sim contract test to cover every unit type, every building type, and every resource deposit type, including unspawned `trader`.
- Rechecked destroyability beyond walls:
  - existing wall tests still prove walls block movement until destroyed and become walkable afterward,
  - added a sim regression proving targeted siege orders destroy locked gates and turrets through normal combat,
  - generalized `window.force_siege_for_test()` so browser smoke can create weakened hostile wall/gate/turret fixtures using real building stats,
  - `pnpm smoke:buildings` now proves explicit `ATTACK` orders destroy wall, gate, and turret targets; wall/gate tiles are non-walkable before destruction and walkable after destruction.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts --reporter=dot` passed: 49 tests,
  - full `pnpm test` passed: 113 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with `test_siege_wall`, `test_siege_gate`, `test_siege_turret`, and `RESOURCE_DEPOSIT_DESTROYED` evidence,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; board, labels, construction cluster, and overlays remained readable though dense,
  - `pnpm smoke:smooth` passed with measured FPS 28.8 and visible interpolation,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-frame-loop.png`; the board and observer panel render normally,
  - `pnpm ai:review:strict -- --json --no-write` passed: 0 actionable unresolved, 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed after full smoke: 482 replayed, 0 failures, 0 contract warnings,
  - shared `develop-web-game` Playwright client exited cleanly,
  - full `pnpm smoke` passed with board, diplomacy, AI report review, information request, learning, persistence, full wall/gate/turret/resource QA, and screenshot checks,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png`; the board and AI report review panel render normally.
- Remaining backlog:
  - implement resource-control scoring and prompt-safe deposit posture for controlled, defended, raided, and denied deposits,
  - add siege engines, breach previews, and contested field repair under fire,
  - keep future inventory items, siege engines, processing buildings, and any targetable board object on this health/armor/attack/range plus destruction contract.

### 2026-07-05 Resource-Control Posture And Reply Scheduling

- Delivered the first strategic resource-control scoring slice:
  - added `ResourceDepositPosture`, `ResourceControlSummary`, and `ResourceDenialRecord` simulation contracts,
  - deposits are now classified as controlled, contested, foreign-controlled, uncontrolled, defended, hostile-defended, raided, under attack, and recently denied,
  - resource-denial records are written when a hostile/resource raid destroys a deposit,
  - survival safety now includes a bounded resource-control modifier, tuned so scarce/strategic deposits matter without hundreds of wood/food tiles saturating the score,
  - resource raid/destruction events are visible only to observing or participating tribes instead of broadcasting hidden coordinates to everyone.
- Exposed the posture safely to AI and browser QA:
  - LLM prompts include `Known resource posture` and visible raid-target posture tags while preserving exact coordinates only for visible deposits,
  - `REQUEST_INFO` answers use the same visible posture and strengthened hidden-rival caveats for private wealth, stockpiles, unseen deposits, and rival strategy,
  - `render_game_to_text()` exposes `resourceControl` plus `visibleResourceDepositsForPlayer`,
  - `window.force_resource_raid_for_test()` now returns before/after posture, resource-control summaries, and denial records.
- Fixed a QA-discovered diplomacy starvation bug:
  - resource-control summary recomputation initially pushed frame pressure high enough that the general smoke kept replies suppressed,
  - added a short cache for resource-control summaries so animation-frame reads stay cheap,
  - allowed LLM reply scheduling to bypass only frame-pressure suppression while still respecting active-job capacity and model-concurrency rules, so delivered messenger packets do not wait forever for a written reply.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - focused `pnpm exec vitest run packages/sim/src/sim.test.ts apps/client/src/llm.test.ts --reporter=dot` passed: 109 tests,
  - full `pnpm test` passed: 114 tests,
  - `pnpm build` passed,
  - `pnpm smoke:buildings` passed with live deposit posture, denial record, explicit siege, repair, and construction evidence,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png`; board, overlays, construction cluster, and selected turret render normally,
  - `pnpm smoke:smooth` passed after caching with measured FPS 30.4 and visible interpolation,
  - inspected `/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smooth-frame-loop.png`; board and observer panel render normally,
  - first `pnpm smoke` run exposed the reply starvation bug; after the scheduler fix, full `pnpm smoke` passed with an AI-authored diplomacy reply, board, report review, info request, learning, persistence, and screenshot checks,
  - `pnpm ai:review:strict -- --json --no-write` passed: 0 actionable unresolved, 0 parser/transport open,
  - `pnpm ai:snapshots:replay -- --strict --json --no-write` passed: 486 replayed, 0 failures, 0 contract warnings.
- Remaining backlog:
  - expand resource-control scoring into defended logistics routes, tribute, embargoes, market manipulation, and richer resource-denial consequences,
  - continue the PixiJS graphics upgrade so resource/fortification posture becomes more readable to humans,
  - add siege engines, breach previews, and contested field repair under fire.

### 2026-07-05 Packet Item Stats And Universal Combat Coverage

- Closed the literal item-stat gap in the combat contract:
  - physical messenger packets now extend the shared `CombatStats` surface with health, armor, attack/range, and cooldown,
  - dispatched packets initialize as `itemType: "packet"` items with their own HP instead of relying only on the carrier messenger,
  - packets killed with messengers or by century population elimination now drop to `hp: 0`,
  - `getPacketItemCombatStats()` and `getPacketItemTypeCombatStats()` expose packet item stats for tests and browser tooling.
- Added a universal runtime coverage guard:
  - `getCombatStatCoverageReport()` verifies declared unit types, building types, resource types, live units, live buildings, live resource deposits, and packet items,
  - dead/exhausted resource deposits must be removed from the map,
  - bare forest tiles can no longer behave like unstatted wood; harvestable wood must be a live `ResourceDeposit`,
  - `render_game_to_text()` now exposes `combatStatCoverage` and per-packet item combat stats.
- Rechecked walls and destroyable defenses under the same contract:
  - the existing wall test still proves walls block movement until destroyed and become walkable after destruction,
  - browser building smoke now checks combat-stat coverage after building setup and again after wall/gate/turret siege, resource raid, damage, and repair flows.
- QA completed:
  - `pnpm exec tsc --noEmit` passed,
  - full `pnpm test -- --run packages/sim/src/sim.test.ts` passed: 114 tests,
  - `pnpm build` passed,
  - `node --check scripts/smoke-playwright.mjs && node --check scripts/smoke-building-visibility.mjs && git diff --check` passed,
  - `pnpm smoke:buildings` passed with clean combat-stat coverage after construction and after siege/raid/repair,
  - `pnpm smoke:smooth` passed with measured FPS 27.5 and visible interpolation,
  - full `pnpm smoke` passed with packet item combat stats visible in the browser hook and clean combat-stat coverage.
- Remaining backlog:
  - decide whether future dropped packets, siege projectiles, trade goods, and inventory objects should become targetable map entities or remain abstract records,
  - continue PixiJS label-tier/readability work so statted resources, packets, fortifications, and battle states are easier to inspect visually.
