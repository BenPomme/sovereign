# Sovereign Worlds

Playable local AI-observation vertical slice for the
`Sovereign_Worlds_Design_Document.md` prototype.

## Run

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173/
```

## Current Slice

- Seeded 128 x 128 world.
- Five sovereign tribes with starting units, buildings, construction resources, colors, and
  fog-of-war visibility.
- PixiJS-rendered map with DOM observer HUD.
- Observer-first UI:
  - all five tribes visible for inspection
  - tribe wealth/unit/messenger summaries
  - AI-chosen sovereign identities, inspirations, and naming styles
  - one visible alliance slot per tribe
  - hover inspection for units, buildings, resources, and terrain
  - latest sovereign AI decision log
  - per-tribe latest AI provider status so fallback is visible
  - physical diplomacy packet list
  - AI bug queue separating model/engine reports from ordinary blocked orders
  - AI information request queue with generated answers for own, visible, and public intelligence
  - AI report review panel with current/cleared buckets, effective backlog counts, status/category/severity/provider/model filters, source/context search, in-app compact snapshot previews, triage status, proof metadata, and latest persisted reports
  - Victory Pressure panel showing the current game-year, population survival mandate, next century review, happiness/safety scores, winner, live learning state, and persisted learning history
  - map layer toggles for resource labels, contested-deposit halos, and wall/turret defense overlays
  - unit, building, and resource legend
  - build-cost legend tying farms, watchtowers, walls, and turrets to their required materials
  - clay, limestone, iron, and coal deposits shown distinctly from food, wood, gold, and stone
  - resource deposits expose health, armor, attack/range, and condition metadata in hover and browser-hook output
- Local LLM sovereign decisions through Ollama:
  - browser calls local Ollama through the Vite `/ollama` proxy
  - default model selection prefers `qwen3.5:9b-mlx` for clean/fast schema output, then `gemma4:12b`, then other schema-compatible local models
  - `gpt-oss` models use a dedicated `/api/chat` schema adapter with low thinking effort instead of the `/api/generate` path
  - opening sovereign identities and first doctrines bootstrap in parallel through the fastest clean schema model so all five teams become active quickly; assigned qwen/gemma/gpt-oss models take over for later strategy and reply turns
  - AI Observer tracks per-model live turns, fallback turns, rejected orders, parser/transport issues, and recovery evidence
  - each AI chooses a history/book-inspired realm name, sovereign name, and starting unit names; there are no hardcoded creative fallback names, and default placeholder realm/sovereign names are rejected and retried
  - each AI writes an independent freeform strategy before choosing immediate executable orders
  - each AI keeps bounded private strategy memory for commitments, lies, grudges, suspicions, alliance intentions, and long-term plans
  - sovereign strategy can ask for information, propose joint plans, invent economic schemes, bluff, lie, scout as spies, betray, attack, or prepare war
  - prompts tell each AI that its primary goal is keeping its population happy, alive, and safe; happiness depends on becoming a bit wealthier each year
  - one game-year lasts roughly 20 real seconds at 1x speed; every 100 game-years, the poorest surviving population is wiped out and dies, which prompts define as the opposite of safety
  - exact rival wealth is hidden from AI prompts; sovereigns can ask each other for wealth/safety information, and the recipient may answer truthfully, refuse, exaggerate, or lie
  - when the survival game resolves, each AI receives an individualized memory lesson based on survival, elimination, happiness, safety, and wealth-per-person; finished-game lessons persist in browser storage and load back into sovereign memory after reload
  - decisions return structured JSON
  - orders are validated before execution
  - later decisions can rename owned villagers, messengers, scouts, and soldiers
  - sovereigns can report bugs into `AI_BUG_REPORTS.md` through a local dev-server endpoint
  - persisted AI bug reports include source kind, decision id, provider/model, turn resources, units, walls/turrets, diplomacy state, survival pressure, accepted/rejected counts, memory, and recent events
  - persisted AI bug reports also save compact JSON state snapshots in `AI_BUG_SNAPSHOTS/` and expose review-panel snapshot previews/links for follow-up debugging
  - `pnpm ai:review` turns unresolved AI reports, per-report triage, and bucket-level currentness state into a ranked iteration backlog in `AI_ITERATION_REVIEW.md`; `pnpm ai:review:strict` gates on distinct unresolved buckets while still showing raw report volume
  - `AI_BUG_BUCKET_TRIAGE.json` stores bucket-level fixed/triaged/ignored coverage by category, provider, model, and source kind; a newer matching report automatically reopens the bucket
  - `pnpm ai:review:buckets` lists the current bucket view without writing files
  - `pnpm ai:review:triage-legacy` migrates known historical report buckets into `triaged`/`ignored` status so current-format failures remain the active backlog
  - `pnpm ai:snapshots:replay` replays saved compact report snapshots as regression fixtures and checks schema, report links, source/context consistency, resources, counts, diplomacy, race vocabulary, and legacy compatibility
  - fixed AI report triage requires structured proof metadata, so a report cannot leave the iteration backlog without evidence such as a test command, source change, or reproduction note
  - sovereigns can spend a legal `REPORT_BUG` order when missing information or broken behavior blocks strategy iteration
  - sovereigns can spend a legal `REQUEST_INFO` order for strategic questions and receive a visible/public intelligence answer without polluting the bug log
  - local model JSON responses are recovered from direct JSON, fenced/prose-wrapped JSON, smart quotes, trailing commas, and some truncated containers before falling back
  - recovered JSON decisions are marked in the accepted-action history as `LLM_JSON_RECOVERED` instead of being silently treated as clean responses
  - transient local-model transport failures, including abort/timeout-style failures, use one bounded retry before falling back
  - successful transport retries are marked in accepted-action history as `LLM_TRANSPORT_RETRY`
  - repeated local-model transport outages activate a visible per-model cooldown, keep the first report with a snapshot, suppress duplicate transport reports while deterministic fallback keeps the game moving, and require a health canary before live Ollama calls resume
  - exhausted local-model failures are split into `LLM transport`, `LLM parser`, and generic `LLM error` categories in the AI bug queue and markdown report instead of silently becoming fallback behavior
  - ordinary blocked actions such as insufficient resources, busy messengers, population cap, or no idle scouts stay visible in the UI queue without polluting the markdown bug file
  - deterministic fallback remains available if Ollama fails
- Optional Blue Crown debug controls:
  - these remain debugging tools only; human-facing gameplay design is intentionally deferred while the AI-only simulation matures
  - select visible units/buildings
  - right-click to move selected owned units
  - train peons, militia, and archers
  - build farms, watchtowers, walls, gates, and turrets
  - assign selected peons to gather food, wood, stone, clay, limestone, iron, coal, or gold
  - send a physical peace offer or warning by messenger
- Baseline simulation AI for gathering, scouting, and training.
- LLM sovereign layer for messenger diplomacy, recruiting, building, repairing,
  scouting, defense, negotiated alliances, attack/war declarations, and policy
  orders.
- Defensive construction:
  - walls block movement until destroyed
  - gates are buildable, can be open/closed/locked, and open gates follow access policies
  - units, buildings, and resource deposits share an explicit health/armor/attack/range stat contract
  - walls are drawn as high-contrast segmented barrier tiles and selected/new walls get a bright construction pulse, centered camera, selected-panel confirmation, and recent-construction labels so rapid builds remain visible
  - selected units and buildings expose health, armor, attack/range, condition, and repair state; damaged walls/gates/turrets draw cracks, rubble, scorch marks, health bars, and repair pulses
  - optional defense overlay outlines wall tiles and shows turret range
  - hostile units can damage and destroy structures in range
  - visible resource deposits can be raided by `ATTACK` with `targetX`, `targetY`, and `targetResourceType`; deposits take armor-reduced damage and disappear when destroyed or exhausted
  - damaged owned buildings can be repaired by idle peons through `REPAIR` orders with scaled repair costs
  - turrets fire on hostile units near the kingdom
  - farms, watchtowers, walls, gates, and turrets use shared construction-cost rules tied to wood, stone, clay, limestone, iron, coal, and gold
  - starting iron and coal are below turret cost so scarce deposits matter for early defensive escalation
  - alliances suppress hostile combat between allied tribes
  - ATTACK orders break alliances with the target and create explicit war state
- Public victory pressure:
  - the sandbox continues, but every 100 game-years the poorest surviving population is wiped out and dies
  - the decisive rule is population happiness and safety, with happiness depending on yearly wealth improvement
  - century-review warnings, eliminations, and the final survival winner are public events visible to all sovereigns
  - after the survival game resolves, `postGameLearnings` writes one lesson per AI into sovereign memory for the next iteration and the browser persists one finished-game learning record
  - `window.render_game_to_text()` exposes victory rule, current year, next review, survivors, winner, score table, construction feedback, recent construction markers, live post-game lessons, and persisted learning history for QA
- Physical messenger packet lifecycle:
  - dispatch
  - outbound travel
  - delivery
  - recipient reads the message
  - recipient AI writes a reply
  - return
  - overdue/loss handling in simulation
- Alliances form through discussion:
  - an AI sends a treaty/alliance offer by messenger
  - the recipient AI reads the delivered text
  - only an explicit accepting reply can form the one-partner alliance
- Event log, diplomacy panel, AI observer panel, and legend.
- Map navigation by dragging empty map space, edge scrolling, WASD/arrows,
  reset view, and wheel zoom.
- Browser QA hooks:
  - `window.render_game_to_text()` returns structured JSON with tick, tribes,
    visible entities, map-layer toggles, board-readability metadata, blocking wall status, building costs, resource-tile samples, contested resource sites, packets, victory pressure, recent AI decisions, per-model LLM quality, sovereign memory, AI issue queue, and events
  - `window.advanceTime(ms)` steps the same simulation path used by the ticker
    and re-renders the game

## Roadmaps

- `Sovereign_Worlds_Development_Tree_Roadmap.md` defines a large future
  civilization development tree with 100+ AI-selectable developments across
  technology, governance, institutions, media, labor systems, diplomacy,
  economy, military doctrine, law, religion, culture, infrastructure,
  construction resources, fortification logistics, and map-control pressure.

Multiplayer, full persistence, treaty enforcement, spies, forgery, and the Vice
President are intentionally deferred.

## Verification

```bash
pnpm test
pnpm build
pnpm ai:review
pnpm ai:review:strict
pnpm ai:snapshots:replay
pnpm smoke:ai-fairness
pnpm smoke:live-ai
pnpm smoke:buildings
pnpm smoke:mock-ollama
pnpm smoke
```

`pnpm ai:snapshots:replay` validates every JSON file in `AI_BUG_SNAPSHOTS/`
against the markdown report links and serialized invariant contract, then writes:

```text
/Users/benjaminpommeraud/Desktop/Sovereigns/AI_SNAPSHOT_REPLAY_REPORT.md
```

`pnpm smoke:buildings` runs a focused browser check that builds a farm,
watchtower, wall, gate, and turret, verifies each new structure is selected, visible,
centered on the map, represented in the selected panel, and retained in the
recent-construction marker list, samples the browser screenshot around each
created building to catch invisible-map regressions, proves explicit siege
orders destroy wall, gate, and turret targets through normal combat, and saves:

```text
/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-buildings.png
```

`pnpm smoke:mock-ollama` runs a fast deterministic browser check that intercepts
the Ollama API in Playwright. It verifies recoverable identity JSON, forced
parser failures, forced transport failures, AI issue persistence, report focus
buckets, snapshots, visible Ollama cooldown state, duplicate transport-report
suppression, failed health canary cooldown extension, successful canary recovery,
post-canary timeout retry, restored live-model decisions, and screenshot capture
without depending on live model timing.

`pnpm smoke:ai-fairness` runs a focused deterministic browser check that
intercepts all five local model assignments. It verifies the first strategy turns
are Blue, Red, Green, Yellow, and Purple before any sovereign gets a second
automatic turn, `/api/generate` schema calls disable thinking, `gpt-oss:20b`
uses `/api/chat` with low thinking effort, and model-quality telemetry records a
clean live `gpt-oss` turn. It saves:

```text
/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-ai-fairness.png
```

`pnpm smoke:live-ai` uses the real local Ollama server. It verifies fast
parallel startup identity setup, first doctrines, default-name rejection,
assigned qwen/gemma/gpt-oss model handoff, fallback counts, and the strict AI
review gate after the sample. By default it also files one controlled live
`REPORT_BUG` canary for each sovereign, proves every canary enters that
sovereign's own iteration inbox and prompt context, marks the canaries fixed
with proof, and proves the fixed lessons re-enter those sovereigns' prompt
contexts. Set `SOVEREIGNS_FORCE_LIVE_AI_ISSUE=0` only for a non-canary timing
sample.

`pnpm smoke` loads the running dev server with Playwright and uses deterministic
Playwright Ollama route mocks for identity setup, decision, and reply. It checks
the observer HUD, diplomacy chat panel, tribe identity panel, legend, hover tooltip, browser QA hooks,
farm/watchtower/wall/gate/turret construction visibility, recent construction markers, construction-resource exposure, explicit siege, resource-raid, and repair orders, explicit `REPORT_BUG`
self-report persistence, `REQUEST_INFO` answer generation and queue isolation, persisted AI report
review summary, bucket currentness/proof, source/context fields, compact snapshot previews/links, severity/provider/model filters, source/context search, and triage controls, public Victory Pressure panel/hook state, AI bug-report
endpoint, persisted post-game learning across reload, contested-resource hook state, map-layer controls, construction-cost legend, parser recovery coverage, LLM transport/parser bug categorization, and event log, and saves:

```text
/Users/benjaminpommeraud/Desktop/Sovereigns/sovereign-worlds-smoke.png
```
