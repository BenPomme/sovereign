# Sovereign Worlds Implementation Plan

Source: `Sovereign_Worlds_Design_Document.md` v0.2, dated 2026-06-27.

## Core Understanding

Sovereign Worlds is not an LLM-driven unit-control game. It is a deterministic,
server-authoritative 2D RTS simulation where local LLM sovereigns make occasional
validated strategic decisions.

The key design bet is physical communication. Diplomacy is only interesting if
messages are real in-world objects carried by vulnerable messengers through fog,
terrain, borders, roads, ambushes, delays, refusals, captures, and stale
information.

The prototype should prove this loop:

1. Five tribes gather, build, scout, trade, and fight in a persistent world.
2. Each tribe has an embodied sovereign with private knowledge and memory.
3. Tribes cannot instantly communicate.
4. A message physically travels, may fail, and only becomes knowledge after
   legitimate delivery.
5. A local LLM sovereign can reason from limited observations and issue legal
   high-level orders.

## Recommended Architecture

Use the design document's stack, with clear separation between simulation,
rendering, UI, persistence, and AI orchestration.

| Layer | Recommendation | Notes |
|---|---|---|
| Language | TypeScript | Shared schemas and deterministic logic. |
| Repo | pnpm monorepo | Apps plus reusable packages. |
| Client | Vite + PixiJS + DOM HUD | Pixi renders the map; DOM handles text-heavy panels. |
| Server | Node.js authoritative process | Owns truth, validation, visibility, events, persistence. |
| Multiplayer | Defer Colyseus until multiplayer milestone | Keep projection boundaries compatible with later adoption. |
| Persistence | SQLite with WAL | Event log plus periodic snapshots. |
| AI | Ollama connector behind interface | Use deterministic fallback when local LLM fails. |
| Tests | Vitest | Simulation, schema, replay, and AI validation tests. |

Suggested structure:

```text
apps/
  client/
  server/
packages/
  shared/       # IDs, schemas, constants, event types
  sim/          # deterministic game state and systems
  ai/           # prompts, memory summaries, validators, model interface
  persistence/  # SQLite event/snapshot storage
```

The simulation package must not depend on PixiJS, DOM APIs, Ollama, or SQLite.
The client must never receive hidden world state.

## Build Strategy

Do not start with LLMs. Start with a world worth reasoning about.

### Milestone 0: Foundation

Deliver:

- TypeScript monorepo.
- Client and server apps.
- Shared schemas and constants.
- Deterministic tick loop with seeded RNG.
- Blank or simple generated map rendered in the browser.
- Basic test, lint, and format scripts.

Acceptance:

- Client and server run locally.
- Server advances turns deterministically.
- Browser renders a map connected to server state.

### Milestone 1: Scripted RTS Core

Deliver:

- Tile map with terrain, roads, resources, and starting regions.
- Tribes, units, buildings, resources, and population cap.
- Movement and pathfinding.
- Peon gathering and deposit loop.
- Building construction and unit production.
- Basic combat with health, range, speed, and morale placeholder.
- Fog of war and per-tribe known/stale/unknown map state.
- Scripted AI behavior for five tribes.
- Save/load snapshots.

Acceptance:

- Five non-LLM tribes can gather, build, recruit, scout, and fight for at least
  10 minutes without crashing or needing human input.

### Milestone 2: Physical Messenger MVP

Deliver:

- Messenger unit.
- Message and packet schemas.
- Packet state machine.
- Messenger assignment, pathing, delivery to known town hall, reply, return,
  refusal, delay, overdue, and death/loss behavior.
- Message lifecycle events persisted to SQLite.
- Human-visible messenger panel.
- Basic interception or killing.

Acceptance:

- Blue sends a message to Red.
- A physical Blue messenger carries it to Red's known town hall.
- Red can reply, refuse, delay, or detain.
- Blue only reads a reply after the messenger returns.
- If the messenger dies in fog, Blue does not immediately know.

### Milestone 3: LLM Sovereigns

Deliver:

- Agent profiles and five starting personalities.
- Prompt builder using only legitimate observations and private memory.
- Memory summary store.
- Structured JSON schemas for strategic orders and messenger decisions.
- Ollama connector with timeout.
- Order validator.
- Planner that converts strategic orders into unit/building tasks.
- Decision log and deterministic fallback policy.

Acceptance:

- Five AI sovereigns periodically issue high-level legal orders.
- At least one sovereign sends messenger diplomacy based on partial knowledge.
- Invalid or hallucinated orders are rejected and summarized back to the agent.

### Milestone 4: Diplomacy and Trade

Deliver:

- Relationship states.
- Soft promises.
- Tribute/gift message type using capped ledger transfer.
- Trade routes between markets.
- Reputation events.
- Gate policies for foreign messengers.

Acceptance:

- AI tribes can propose peace, trade, threaten, accept, refuse, betray, and
  remember outcomes in later decisions.

### Milestone 5: Human Sovereign and Vice President

Deliver:

- One human-controlled tribe.
- Unit selection and command UI.
- Message compose/read UI.
- VP instruction panel.
- VP authority levels.
- Disconnect shelter behavior.
- Reconnect event summary.

Acceptance:

- A human can delegate domestic/defensive control, disconnect, reconnect, and
  see what happened, including returned or overdue messengers.

### Milestone 6: Replay and Debug Tools

Deliver:

- Event replay.
- Message lifecycle viewer.
- Per-tribe belief/visibility viewer.
- AI decision inspector.
- Prompt input and JSON output archive.
- Replay hash tests.

Acceptance:

- A developer can explain why an AI sent a message, attacked, delayed a
  messenger, or broke a promise.

### Milestone 7: Multiplayer

Deliver:

- Colyseus or equivalent authoritative room model.
- Multiple human sessions.
- Per-client visibility filtering.
- Reconnect support.
- Optional spectator/admin mode.

Acceptance:

- Two humans and five AI tribes can share one server-authoritative world without
  hidden-state leakage to normal clients.

## First Sprint Checklist

1. Create the monorepo and scripts.
2. Define shared IDs, map, tribe, unit, building, resource, and event types.
3. Implement seeded RNG and fixed-step turn loop.
4. Generate a 128 x 128 test map with five start regions.
5. Spawn five tribes with starting units/buildings/resources.
6. Render map, units, labels, and camera controls.
7. Implement movement and basic A* pathfinding.
8. Add peon gather/deposit loop.
9. Add town hall, house, farm, barracks, market, watchtower.
10. Add scripted AI policies for economy and defense.
11. Add fog-of-war projection and client visibility filtering.
12. Add the first deterministic simulation tests.

First playable target:

```text
Five scripted tribes run locally, visible in browser, with gathering, building,
movement, fog, and basic combat. No LLMs yet.
```

## Complexity-Ranked Work Delegation

Use lightweight local review agents for read-only checks, then split code work
only when file ownership is clear.

| Complexity | Work | Agent pattern |
|---|---|---|
| Low | Docs, backlog grooming, test-case extraction | Single lightweight reviewer. |
| Medium | Renderer, UI panels, schemas, persistence | One worker per owned package/app. |
| High | Simulation core, fog, messenger lifecycle, replay determinism | Main agent plus specialist review before merge. |
| Highest | LLM sovereign planner and hidden-information guarantees | Main agent, security review, replay tests, prompt-injection tests. |

Avoid parallel edits to the same files. Split by package once the repository
exists.

## Defer Until After Core Proof

- Multiplayer.
- WebLLM.
- Spies, forgery, resealing, bribery, and advanced tampering.
- Hard treaty enforcement beyond simple records.
- Cavalry, siege, gates, and naval systems.
- Advanced wall placement, gates, and siege balance beyond the current blocking-wall MVP.
- Procedural art generation.
- Dynamic prices.
- Large worlds or hundreds of units per tribe.
- Public server hosting.

## QA Gates

Every milestone should include a short deterministic scenario test.

Required early tests:

- Same seed and inputs produce the same world hash.
- Fog projection never includes hidden enemy state.
- Peon gather/deposit changes resources predictably.
- Unit movement follows expected path costs.
- Combat produces deterministic health changes.
- Save/load resumes the same turn state.
- Message packet cannot be read before delivery.
- Messenger killed in fog does not notify sender immediately.
- Incoming enemy text is treated as untrusted in-world speech.
- Invalid AI orders are rejected server-side.

## Open Decisions Before Coding

1. Package manager: use pnpm unless there is a reason not to.
2. Server transport for pre-multiplayer prototype: simple WebSocket first or
   Colyseus from day one.
3. Simulation model: simple custom ECS/data-oriented state first, avoid adding
   an ECS library unless complexity demands it.
4. Map generation: fixed authored MVP map first or seeded procedural generator.
5. Local LLM model: current schema-turn routing starts with
   `qwen3.5:9b-mlx`, tries `gemma4:12b` next, then other
   schema-compatible local models. `gpt-oss:*` uses a dedicated `/api/chat`
   schema adapter with low thinking effort instead of the `/api/generate`
   path.
6. Human omniscience over owned messengers: strict information mode or limited
   own-unit tracking.

## Quality Bar

The MVP is successful when a tester can watch an AI-only world create one
meaningful diplomatic situation that could not exist with instant chat:

```text
A message is sent, delayed or endangered, creates uncertainty, returns with
stale information, and changes a sovereign's next decision.
```
