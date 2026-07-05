# Sovereign Worlds Development Tree Roadmap

**Version:** 1.0  
**Date:** June 30, 2026  
**Owner:** Sovereign Worlds team  
**Scope:** AI sovereign gameplay progression tree for long-horizon civilizations  

This roadmap defines a **branching development system** with 100+ possible civic, economic, and military institutions.  
LLM sovereigns can unlock, delay, or reject developments based on context, goals, resources, and external pressure.

## Use in Game Design

- **Node format:** each development has mechanics, prerequisites, trade-offs, and AI decision hooks.
- **Mechanics should be deterministic:** all effects are explicit numeric modifiers or finite-state transitions.
- **Choice friction:** controversial institutions are never free; they have social and geopolitical side effects.
- **Game-theory intent:** nodes can unlock opportunities and liabilities, making “progress” non-linear.
- **Timed gold pressure:** developments should affect how a sovereign competes for, delays, contests, raids, defends, or manipulates the final gold score before the timer ends.
- **Post-game learning:** every completed game should produce per-sovereign lessons that feed the next iteration's private memory and make each AI individually smarter.
- **Implementation strategy:** phase-gated delivery for stability, while preserving branching compatibility.

## Resource, Fortification, and Board-Readability Integration

This roadmap must stay tied to the visible board. Development choices should change what a sovereign can build, which deposits matter, and where conflict pressure appears.

- **Construction resource ladder:**
  - wood remains the early flexible material for farms, scaffolding, watchtower frames, and emergency repairs.
  - stone supports walls, towers, roads, courts, monuments, and siege-resistant districts.
  - clay supports walls, bricks, kilns, granaries, archives, sanitation, and high-density settlement upgrades.
  - limestone supports mortar, limewash, watchtower foundations, durable wall logistics, roads, courts, sanitation, and later cement/fortress upgrades.
  - iron is scarce and should gate turrets, stronger gates, siege tools, weapons, policing, mining, and industrial state capacity.
  - coal is scarce and should gate turret operation, ironworks, advanced metallurgy, steam/industrial capacity, pollution, and military production surges.
  - gold remains currency, diplomacy, professional military, media patronage, markets, bribes, and institutional upkeep.
- **Scarcity design:**
  - each kingdom needs enough local material for basic survival and one or two early defensive choices.
  - scarce coal and iron plus richer limestone/clay/stone/gold deposits should appear near central roads, borders, or other contestable terrain.
  - deterministic seeded jitter should prevent every match from having the same exact resource front line.
  - Survival scoring should reward yearly wealth improvement, food security, protected logistics, defended homes, controlled deposits, tribute, and battlefield denial rather than only passive stockpiling.
- **Wall and turret tree hooks:**
  - masonry, lime mortar, brick kilns, perimeter walls, gates, military architecture, coal-fired ironworking, ballistics, and siege engineering should unlock stronger fortification variants.
  - democracy, media, law, slavery/forced labor, conscription, taxation, policing, and public works should alter how quickly fortifications are built, how they are financed, and how unrest or legitimacy reacts.
  - LLM sovereigns should be free to negotiate access to deposits, lie about military buildup, trade coal/iron/limestone, embargo rivals, raid miners, build defensive belts, or provoke wars over resources.
- **Survival mandate and learning tree hooks:**
  - democracy, media, law, religion, courts, slavery/forced labor, abolition, taxation, credit, military doctrine, espionage, propaganda, and public works should create different paths to legitimacy, wealth, labor capacity, unrest, and diplomatic isolation.
  - The primary AI goal is to keep the population happy and safe; happiness depends on the population becoming a bit wealthier every game-year.
  - One game-year should take roughly 20 real seconds at 1x speed. Every 100 game-years, the poorest surviving population dies out; the last survivor around year 400 wins.
  - Exact rival wealth is hidden from AI prompts. Sovereigns can ask each other about wealth and safety, but answers can be truthful, refused, exaggerated, or lies.
  - A sovereign near the bottom should pursue catch-up strategies: forced-march extraction, debt-financed construction, alliance blocs, sabotage, propaganda, reform legitimacy, raids, trade, or conquest.
  - The learning mechanism should record why each AI survived or died out, including yearly wealth movement, happiness, safety, food security, diplomacy usefulness, raids, and missed opportunities; future prompts should use those memories without hardcoding strategy.
- **Readable board requirement:**
  - every new resource/building class needs a distinct icon shape, abbreviation, legend entry, hover text, and browser-hook representation.
  - walls must remain visibly different from roads, terrain, buildings, and labels because they change pathing rules.
  - QA should verify both simulation behavior and human-readable display before adding further resource types.
- **PixiJS visual production track:**
  - the game should move beyond the current conceptual/debug-board look by using PixiJS v8 scene-graph features deliberately: sprite/texture atlases for terrain, resources, units, buildings, wall/gate states, construction feedback, combat, and diplomacy packets.
  - replace most map-letter dependence with readable visual silhouettes first, then keep abbreviations as optional overlays for debugging and accessibility.
  - add zoom-aware label tiers so full names, short labels, and icons appear at different zoom levels instead of crowding the board.
  - use PixiJS layers/containers for terrain, roads, resources, fortifications, units, projectiles, fog, selection, overlays, and UI effects so the board has visual hierarchy rather than one flat conceptual layer.
  - add lightweight animation/state cues: walking, gathering, construction progress, gate opening/locking, turret firing, wall damage, messenger travel, scouting, and battle impact.
  - keep performance QA mandatory: any visual upgrade must preserve the smooth-frame gate, avoid per-frame static terrain redraws, and keep `render_game_to_text()` as the source of truth for automated checks.

### Near-Term Fortification and Resource Implementation Backlog

**Delivered visual/readability baseline on June 30, 2026:** resource labels are toggleable, contested deposits can be highlighted, walls and turret ranges have a defense overlay, an 8-tile strategic grid is drawn on the board, and browser smoke must verify that the resource HUD does not overlap the board.

**Delivered construction-resource expansion on June 30, 2026:** limestone and coal joined clay and iron as first-class stockpiles, gather targets, map deposits, build-cost inputs, legend entries, hover-inspectable resources, and browser-hook outputs. Coal and iron are intentionally scarce and contestable; limestone is more available but still strategically relevant for fortification logistics.

**Delivered first gate/armor slice on July 5, 2026:** walls remain absolute movement blockers for everyone until destroyed; gates are buildable after Masonry plus Ironworking, default open, can be closed or locked, and closed/locked gates block movement. Units and buildings now expose health, armor, attack, and range stats, and armor reduces incoming damage while keeping walls/gates destroyable.

**Delivered gate access-policy slice on July 5, 2026:** open gates now support `all`, `owner_allies`, and `owner_only` passage policies. Pathfinding, movement recovery, AI order schema, LLM prompts, selected-panel UI, hover text, browser hooks, and building smoke QA all expose the policy. Walls are also proven destroyable through the normal combat loop, not only direct damage helpers.

**Delivered explicit siege-order slice on July 5, 2026:** `ATTACK` orders can now include `targetBuildingId` so AIs can intentionally breach visible hostile walls, gates, turrets, or buildings. Military units path to an adjacent attack position, prioritize the ordered structure over ambient building priorities, declare war/break alliances consistently, and destroy the target through normal armor-reduced combat.

**Delivered first repair-order slice on July 5, 2026:** `REPAIR` orders can now target a damaged owned building by exact `targetBuildingId` or `buildingId`. Idle peons path to an adjacent work tile, spend repair resources scaled to missing health, restore health up to `maxHp`, emit repair events, and never resurrect destroyed structures or repair foreign/full-health buildings. LLM prompts expose owned building IDs, health, armor, attack/range, and repair availability so sovereigns can decide to save damaged walls, gates, turrets, or core buildings.

**Delivered durability-visualization slice on July 5, 2026:** visible units and buildings now expose a shared combat-stat snapshot with health percentage and condition, while buildings also expose `damageState`, `repairState`, and movement-blocking status. Damaged walls/gates/turrets render cracks, rubble, scorch marks, health bars, repair rings, and recently repaired pulses, and browser smoke proves damaged -> repairing -> repaired state transitions.

**Delivered combat-stat contract hardening on July 5, 2026:** units and buildings now inherit an explicit shared combat stat type, resource deposits now carry health, armor, attack/range, and condition metadata, gathering reduces deposit health alongside finite amount, dead buildings are excluded from visibility projections, and browser damage QA uses the real armor-reduced building damage API.

**Delivered resource raid/destruction slice on July 5, 2026:** visible resource deposits can now be raided by `ATTACK` orders using `targetX`, `targetY`, and `targetResourceType`. Military units path into range, apply armor-reduced damage to the deposit, destroy/exhaust it through the shared damage contract, and emit `RESOURCE_RAID_ORDER` plus `RESOURCE_DEPOSIT_DESTROYED` evidence. LLM prompts and order availability expose visible raidable deposits without revealing hidden rival wealth.

1. **Building-tree prerequisites:** extend per-tribe development state beyond current walls, gates, and turrets into stronger walls, siege tools, road upgrades, gate automation, and later fortification variants behind masonry, brick kilns, ironworking, ballistics, and military architecture.
2. **Chosen placement:** let LLMs choose perimeter/fortification intent and later add human tile previews only after the human play model is decided.
3. **Advanced siege behavior:** add siege tools, breach previews, contested field repairs under fire, and multi-unit assault doctrines on top of explicit building-target attacks.
4. **Gate diplomacy and strategy:** let sovereigns negotiate gate access, lie about open routes, lock allies out, create safe-passage treaties, stage ambushes at gates, charge tolls, sabotage controls, or deliberately sacrifice a gate to delay pursuit.
5. **Fortification stat contract:** any future board item, siege engine, inventory object, or resource-processing installation must declare health, armor, attack, range, and destruction behavior when it can be targeted or can affect combat.
6. **PixiJS graphics upgrade:** replace the current conceptual debug-board style with a production-oriented PixiJS visual pass: terrain/resource sprites, building silhouettes, wall/gate state art, animated units, selection/route previews, construction/damage/firing effects, and zoom-aware overlays.
7. **Survival scoring:** make century reviews and AI prompts account for controlled coal, iron, limestone, clay, stone, food, wood, and gold deposits, defended logistics routes, happiness, safety, tribute, embargoes, and raided/denied deposits.
8. **Map readability overlays:** add optional overlays for contested resources, wall/turret/gate networks, war fronts, and blocked routes, with zoom-aware labels to reduce clutter.
9. **QA gates:** every fortification/resource/graphics slice must prove simulation blocking/destruction, visible UI representation, hook output, smooth-frame performance, and browser smoke coverage before adding new resource types or art complexity.
10. **Post-game learning QA:** every win-condition slice must prove century reviews eliminate the poorest surviving population, the year-400 survivor wins, and one individualized learning note is written per sovereign for the next iteration.

## Node Schema

- **Mechanics:** immediate simulation changes.
- **Effects:** what gains or penalties are applied, with examples.
- **Prereqs/Tradeoffs:** required nodes/resources and costs.
- **AI Hook:** decision prompts/features for sovereign logic.
- **Phase:** rollout phase target.

---

## Phase 0 — Foundational State Formation (P0)

- **SW-001 — Unified Settlement Layout**
  - **Mechanics:** introduces a contiguous administrative zone around the town center.
  - **Effects:** +5 unit movement coherence; +10% scouting overlap.
  - **Prereqs/Tradeoffs:** requires initial population >12; delays expansion by +5% until layout completed.
  - **AI Hook:** prefer if frontier control is weak and theft events are rising.
  - **Phase:** P0.

- **SW-002 — Census Tablets**
  - **Mechanics:** periodic population survey with household counts by age/labor status.
  - **Effects:** unlocks labor caps, draft quotas, and public support estimates (+10 accuracy on policy forecasts).
  - **Prereqs/Tradeoffs:** literacy admin > 20; +5 upkeep in scribes.
  - **AI Hook:** use for recruitment planning and anti-famine policy.
  - **Phase:** P0.

- **SW-003 — Grain Reserve Granary**
  - **Mechanics:** stores emergency provisions with spoilage curve.
  - **Effects:** famine trigger delay +2 turns at reserve level 1; +1.5 morale for urban districts under siege.
  - **Prereqs/Tradeoffs:** requires 20% of food output; early cost reduces troop training throughput by 10%.
  - **AI Hook:** trigger before harsh winters or war escalations.
  - **Phase:** P0.

- **SW-004 — Basic Standard of Measures**
  - **Mechanics:** introduces standardized units for resource conversion and levy accounting.
  - **Effects:** +5% tax efficiency; reduces market disputes by 25%.
  - **Prereqs/Tradeoffs:** nearby scribal center; +1 turn for audits.
  - **AI Hook:** prioritize when trade volume grows.
  - **Phase:** P0.

- **SW-005 — Frontier Wardens**
  - **Mechanics:** creates low-grade patrol network on borders with alert behavior.
  - **Effects:** +12% early warning on raids; +2 upkeep.
  - **Prereqs/Tradeoffs:** requires outpost radius expansion; increases maintenance in remote tiles.
  - **AI Hook:** activate when hostile scouts increase.
  - **Phase:** P0.

- **SW-006 — First Magistrate**
  - **Mechanics:** one adjudicator for petty disputes, trespass, and theft penalties.
  - **Effects:** civil compliance +8%; reduces unrest from theft by half.
  - **Prereqs/Tradeoffs:** requires SW-002; can be captured by mobs if legitimacy < 30.
  - **AI Hook:** useful when grievance events spike.
  - **Phase:** P0.

- **SW-007 — Stone Marker Boundaries**
  - **Mechanics:** permanent markers define disputed claims for land and grazing routes.
  - **Effects:** reduced border skirmishes by 20%; +0.5 tax stability.
  - **Prereqs/Tradeoffs:** terrain tools and labor; can trigger neighboring claims if unconsented.
  - **AI Hook:** use before aggressive expansion.
  - **Phase:** P0.

- **SW-008 — Night Signal Network**
  - **Mechanics:** torches and beacon relay for district alerts.
  - **Effects:** incident response latency -30%.
  - **Prereqs/Tradeoffs:** line-of-sight map coverage required; reveals own movements as noise to enemies.
  - **AI Hook:** enable during war prep.
  - **Phase:** P0.

- **SW-009 — Ritual Court Day**
  - **Mechanics:** monthly public hearing for complaints and public proclamations.
  - **Effects:** +6 legitimacy; +4 unrest if unresolved petitions exceed 3 cycles.
  - **Prereqs/Tradeoffs:** requires SW-002; time investment per cycle.
  - **AI Hook:** schedule after policy changes or tax edits.
  - **Phase:** P0.

- **SW-010 — Village Guard Militia**
  - **Mechanics:** citizen militia with alarm reaction and area patrol AI.
  - **Effects:** +8% anti-sabotage coverage; slower construction cadence on farms.
  - **Prereqs/Tradeoffs:** training quota consumes food; can become politicized during unrest.
  - **AI Hook:** choose when theft/espionage risk is nontrivial.
  - **Phase:** P0.

## Phase 1 — Governance, Legitimacy, and Institutions (P1)

- **SW-011 — Tribal Council**
  - **Mechanics:** representative body with advisory voting weights.
  - **Effects:** policy consistency +12%; policy reversal risk -20% when factional fragmentation >50%.
  - **Prereqs/Tradeoffs:** needs SW-002 and public literacy; policy speed penalty when consensus low.
  - **AI Hook:** use for slower but stable constitutional states.
  - **Phase:** P1.

- **SW-012 — Hereditary Monarchy**
  - **Mechanics:** single line succession rule, strong symbolic legitimacy.
  - **Effects:** command speed +15%; dissent penalty if succession disputed.
  - **Prereqs/Tradeoffs:** requires bloodline continuity; civil unrest spike if royal house weakens.
  - **AI Hook:** choose for centralized wartime governance.
  - **Phase:** P1.

- **SW-013 — Elective Sovereignty**
  - **Mechanics:** periodic election events pick sovereign.
  - **Effects:** legitimacy +14 when fairness high; campaign cost +8% treasury drain.
  - **Prereqs/Tradeoffs:** requires free hall of record, minimum 3 regions; high volatility if misinformation spread.
  - **AI Hook:** useful for anti-coup resilience.
  - **Phase:** P1.

- **SW-014 — Regency Council**
  - **Mechanics:** temporary multi-actor executive body during succession or crisis.
  - **Effects:** decision throughput -25% but policy acceptance +20%.
  - **Prereqs/Tradeoffs:** requires SW-006 or SW-013; internal power struggle risk.
  - **AI Hook:** trigger during succession crises or civil war prevention.
  - **Phase:** P1.

- **SW-015 — Provincial Governors**
  - **Mechanics:** decentralizes taxation and local recruitment authority.
  - **Effects:** local efficiency +12%; empire cohesion -4% if governor control index is low.
  - **Prereqs/Tradeoffs:** requires boundary network + administrative tier; higher corruption vectors.
  - **AI Hook:** use in large empires for logistics.
  - **Phase:** P1.

- **SW-016 — Central Chancellery**
  - **Mechanics:** formal decree writing, archives, and implementation queue.
  - **Effects:** policy bugs reduced by 30%; +2 turn overhead on new decrees.
  - **Prereqs/Tradeoffs:** requires SW-004 + scribes.
  - **AI Hook:** pick for strategic pacing and consistency.
  - **Phase:** P1.

- **SW-017 — Dual-Executive Model**
  - **Mechanics:** separates war and domestic authority into two high offices.
  - **Effects:** +18 crisis response in war; coordination tax if trust <60.
  - **Prereqs/Tradeoffs:** requires SW-016 and elite rivalry controls.
  - **AI Hook:** useful for strong military campaigns.
  - **Phase:** P1.

- **SW-018 — Oath of Office**
  - **Mechanics:** formal rule on legal tenure and dismissal conditions.
  - **Effects:** corruption events -20%; elite dissent +5 if seen as constraint.
  - **Prereqs/Tradeoffs:** requires SW-006.
  - **AI Hook:** apply in long-term institutions for stability.
  - **Phase:** P1.

- **SW-019 — Constitutional Charter**
  - **Mechanics:** defines codified rights and limits executive action.
  - **Effects:** tax legitimacy +12, repression policy costs rise, propaganda gain reduced.
  - **Prereqs/Tradeoffs:** requires SW-011 + SW-013 path or SW-014 path; legal disputes may delay policies.
  - **AI Hook:** enforce for anti-chaos states.
  - **Phase:** P1.

- **SW-020 — Succession Law**
  - **Mechanics:** legal framework for crown/office handoff and guardianship.
  - **Effects:** succession conflict chance -35%.
  - **Prereqs/Tradeoffs:** requires SW-012 or SW-013.
  - **AI Hook:** activate before high mortality or war attrition.
  - **Phase:** P1.

- **SW-021 — State Census Hall**
  - **Mechanics:** periodic legal registration for taxation, militia, and legal status.
  - **Effects:** resource projection accuracy +25%; bureaucracy +3% per year.
  - **Prereqs/Tradeoffs:** citizen fear if repeated too often.
  - **AI Hook:** unlocks demographic manipulation and targeted policy.
  - **Phase:** P1.

- **SW-022 — Court Faction Registry**
  - **Mechanics:** tracks power blocs and patronage influence.
  - **Effects:** reduces coup risk by +10 when active monitoring exists.
  - **Prereqs/Tradeoffs:** requires SW-021; faction loyalty volatility.
  - **AI Hook:** choose if civil intrigues are frequent.
  - **Phase:** P1.

- **SW-023 — Public Petition Office**
  - **Mechanics:** channels grievances into a tracked workflow.
  - **Effects:** unrest events drop by 15% when response rate maintained.
  - **Prereqs/Tradeoffs:** requires SW-009; ignores petitions increase backlash +20.
  - **AI Hook:** use to absorb discontent early.
  - **Phase:** P1.

- **SW-024 — Rotating Court Location**
  - **Mechanics:** symbolic relocation of governance center between regions.
  - **Effects:** regional loyalty +8 across visited districts; logistics burden +6%.
  - **Prereqs/Tradeoffs:** map scale > medium; travel exposure.
  - **AI Hook:** pick for integration campaigns.
  - **Phase:** P1.

- **SW-025 — Provincial Assemblies**
  - **Mechanics:** local lawmaking circles with regional issue queues.
  - **Effects:** compliance +10 in included provinces; policy latency +2 turns.
  - **Prereqs/Tradeoffs:** requires SW-015 and communication nodes.
  - **AI Hook:** unlock distributed governance at scale.
  - **Phase:** P1.

- **SW-026 — Anti-Coup Watch**
  - **Mechanics:** monitoring of suspicious troop movements, cash spikes, and propaganda.
  - **Effects:** coup chance -30%; civil-military trust -5 if overused.
  - **Prereqs/Tradeoffs:** intelligence baseline required; requires SW-010 or SW-034 style security.
  - **AI Hook:** deploy when command concentration rises.
  - **Phase:** P1.

- **SW-027 — Succession Crisis Protocol**
  - **Mechanics:** emergency chain-of-command rules and emergency decree powers.
  - **Effects:** 3-tick continuity of command; +7 unrest if overused by regent.
  - **Prereqs/Tradeoffs:** requires SW-020 and SW-026.
  - **AI Hook:** use for resilience during war.
  - **Phase:** P1.

- **SW-028 — Exile Tribunal**
  - **Mechanics:** formal process to remove destabilizing elites.
  - **Effects:** removes 1 high-risk actor, but legitimacy penalty if due process fails.
  - **Prereqs/Tradeoffs:** requires judiciary capacity and evidence.
  - **AI Hook:** apply as controlled purging.
  - **Phase:** P1.

- **SW-029 — Heir Education System**
  - **Mechanics:** prepares successors in law, command, and rhetoric.
  - **Effects:** succession transition smoothness +18.
  - **Prereqs/Tradeoffs:** requires SW-020.
  - **AI Hook:** pick for monarchy lines to avoid instability.
  - **Phase:** P1.

- **SW-030 — Civic Identity Edict**
  - **Mechanics:** establishes shared civic narrative and festivals.
  - **Effects:** recruitment +10 and morale +12; cultural minorities discomfort +5.
  - **Prereqs/Tradeoffs:** needs propaganda and religious compatibility checks.
  - **AI Hook:** use when integrating diverse regions.
  - **Phase:** P1.

- **SW-031 — Taxpayer Charter**
  - **Mechanics:** publication of tax rules and penalties.
  - **Effects:** evasion events -25%; public trust +6.
  - **Prereqs/Tradeoffs:** requires SW-004 + SW-019 or SW-013 path.
  - **AI Hook:** use when revenue volatility spikes.
  - **Phase:** P1.

- **SW-032 — Court Record Ledger**
  - **Mechanics:** transparent archive of rulings and disputes.
  - **Effects:** legal consistency +15; slows trial throughput 5%.
  - **Prereqs/Tradeoffs:** literacy and storage.
  - **AI Hook:** choose in institutions with long-running legal disputes.
  - **Phase:** P1.

- **SW-033 — Municipal Charter**
  - **Mechanics:** defines city rights over local taxes and policing.
  - **Effects:** local infrastructure speed +12%; central authority influence -6%.
  - **Prereqs/Tradeoffs:** only after city tier 2 and SW-015.
  - **AI Hook:** enable for regional development arcs.
  - **Phase:** P1.

- **SW-034 — Regency Tax Court**
  - **Mechanics:** special financial judiciary for corruption, fraud, and debt.
  - **Effects:** corruption penalty events -30%; trials generate elite backlash.
  - **Prereqs/Tradeoffs:** requires SW-032 and SW-026.
  - **AI Hook:** deploy in high corruption economies.
  - **Phase:** P1.

- **SW-035 — Executive Immunity Limits**
  - **Mechanics:** temporary loss of immunity under proven legal process.
  - **Effects:** reduces elite predation +20%; executive decision delay +10%.
  - **Prereqs/Tradeoffs:** controversial at start due to power resistance.
  - **AI Hook:** apply in mature stable states only.
  - **Phase:** P1.

- **SW-036 — Diplomatic Legation Bureau**
  - **Mechanics:** treaty drafting, translator corps, messenger authentication.
  - **Effects:** foreign agreement reliability +25%.
  - **Prereqs/Tradeoffs:** requires Phase 0 comms and SW-015.
  - **AI Hook:** needed for sustained diplomacy tree path.
  - **Phase:** P1.

- **SW-037 — Succession Council**
  - **Mechanics:** formal body confirms new leader candidate.
  - **Effects:** transition legitimacy +20; delays leadership transitions.
  - **Prereqs/Tradeoffs:** requires SW-031 and SW-022.
  - **AI Hook:** use where ruler mortality risk is rising.
  - **Phase:** P1.

- **SW-038 — Civil-Military Boundary Statute**
  - **Mechanics:** defines allowed use of troops in domestic tasks.
  - **Effects:** reduces repression penalties by 20%; slows crisis response by 8%.
  - **Prereqs/Tradeoffs:** requires SW-019.
  - **AI Hook:** choose when stability >75.
  - **Phase:** P1.

- **SW-039 — Public Accountability Hearings**
  - **Mechanics:** leaders defend major decisions quarterly.
  - **Effects:** long-term corruption down; immediate short-term legitimacy boost or drop depending on performance.
  - **Prereqs/Tradeoffs:** requires SW-009, SW-032.
  - **AI Hook:** only when legitimacy dips below threshold.
  - **Phase:** P1.

- **SW-040 — Shared Regency Council Seats**
  - **Mechanics:** formal coalition rule requiring coalition agreement.
  - **Effects:** policy shock resilience +30%; faction conflict risk when seats contested.
  - **Prereqs/Tradeoffs:** requires SW-022, SW-037.
  - **AI Hook:** useful in highly plural polities.
  - **Phase:** P1.

## Phase 2 — Economy, Markets, Finance, and Taxation (P2)

- **SW-041 — Market Square**
  - **Mechanics:** centralized exchange node with posted buy/sell prices.
  - **Effects:** trade volume +15%; price manipulation risk +5.
- **Prereqs/Tradeoffs:** requires SW-007 + SW-004.
  - **AI Hook:** unlocks AI resource arbitrage decisions.
  - **Phase:** P2.

- **SW-042 — Fixed Taxation**
  - **Mechanics:** flat levy per household and enterprise.
  - **Effects:** predictable income +10; fairness score may dip for poor districts.
  - **Prereqs/Tradeoffs:** requires SW-021.
  - **AI Hook:** base revenue policy for low-admin empires.
  - **Phase:** P2.

- **SW-043 — Progressive Tax Bands**
  - **Mechanics:** tiered rates by wealth/income.
  - **Effects:** evasion risk +8 but redistributive equity +12.
  - **Prereqs/Tradeoffs:** requires SW-041 + SW-032.
  - **AI Hook:** use where unrest from inequality is high.
  - **Phase:** P2.

- **SW-044 — Grain Tithe Tax**
  - **Mechanics:** in-kind agricultural levy with storage conversion.
  - **Effects:** treasury stabilization during harvest +18; peasant morale -7.
  - **Prereqs/Tradeoffs:** only agrarian districts with SW-003.
  - **AI Hook:** fallback in early shortage and war.
  - **Phase:** P2.

- **SW-045 — Trade Tariff Corridor**
  - **Mechanics:** route-based tolls and customs points.
  - **Effects:** +12 revenue and +4 smuggling pressure.
  - **Prereqs/Tradeoffs:** requires market roads and sentry control.
  - **AI Hook:** balance short-term revenue vs illicit trade growth.
  - **Phase:** P2.

- **SW-046 — Mint and Coinage**
  - **Mechanics:** standardized currency minting.
  - **Effects:** large-merchant confidence +20; minting costs in ore/metals.
  - **Prereqs/Tradeoffs:** requires SW-041 and secure mint facility.
  - **AI Hook:** crucial for large diplomacy and mercenary contracts.
  - **Phase:** P2.

- **SW-047 — Banking Guild**
  - **Mechanics:** deposit vault, low-rate credit, promissory bonds.
  - **Effects:** investment +25; debt defaults risk +10.
  - **Prereqs/Tradeoffs:** requires SW-046 and law enforcement.
  - **AI Hook:** support AI long-horizon infrastructure planning.
  - **Phase:** P2.

- **SW-048 — State Treasury Bond**
  - **Mechanics:** sells future tax claims for immediate cash.
  - **Effects:** liquidity +30; debt servicing obligations create future fiscal drag.
  - **Prereqs/Tradeoffs:** requires SW-047 and reliable tax base.
  - **AI Hook:** crisis bridge in war or famine.
  - **Phase:** P2.

- **SW-049 — Rural Granary Tax Credit**
  - **Mechanics:** allows tax deferral for food surpluses.
  - **Effects:** production stability +12; short-term treasury dip.
  - **Prereqs/Tradeoffs:** requires SW-003 + SW-043.
  - **AI Hook:** implement in drought-prone zones.
  - **Phase:** P2.

- **SW-050 — Infrastructure Bonds**
  - **Mechanics:** dedicated borrowing for roads, roads, and canals.
  - **Effects:** infrastructure speed +20; debt ratio cap reduced.
  - **Prereqs/Tradeoffs:** needs stable ratings from SW-034 or equivalent.
  - **AI Hook:** unlocks long-range logistics improvements.
  - **Phase:** P2.

- **SW-051 — Toll Bridge Network**
  - **Mechanics:** charged crossings and maintenance crews.
  - **Effects:** movement funding +10; smuggling risk via alternate routes.
  - **Prereqs/Tradeoffs:** requires roads and engineers.
  - **AI Hook:** choose on choke-point maps.
  - **Phase:** P2.

- **SW-052 — State Granaries as Depository**
  - **Mechanics:** state-backed food storage bank for peasants.
  - **Effects:** price volatility reduced and famine resistance +15.
  - **Prereqs/Tradeoffs:** high logistics burden and spoilage.
  - **AI Hook:** stabilize economy before major war.
  - **Phase:** P2.

- **SW-053 — Land Tax Assessment**
  - **Mechanics:** periodic valuation by soil and irrigation access.
  - **Effects:** tax yield precision +30%; social inequity if opaque.
  - **Prereqs/Tradeoffs:** requires SW-004 + survey teams.
  - **AI Hook:** use for advanced fiscal planning.
  - **Phase:** P2.

- **SW-054 — Merchant Charter**
  - **Mechanics:** merchant rights and protections for cross-regional trade.
  - **Effects:** merchant class loyalty +22; anti-merchant sentiment +5.
  - **Prereqs/Tradeoffs:** requires SW-041.
  - **AI Hook:** for export-led expansions.
  - **Phase:** P2.

- **SW-055 — Standardized Weights**
  - **Mechanics:** reduces trade fraud and transaction disputes.
  - **Effects:** market efficiency +8, enforcement needs inspectors.
  - **Prereqs/Tradeoffs:** requires SW-004.
  - **AI Hook:** combine with tariff nodes.
  - **Phase:** P2.

- **SW-056 — Caravan Protection**
  - **Mechanics:** escorts and waystations for trade convoys.
  - **Effects:** trade losses -40%; maintenance cost per route.
  - **Prereqs/Tradeoffs:** requires patrol network and military logistics.
  - **AI Hook:** invest when external trade share >25%.
  - **Phase:** P2.

- **SW-057 — Craft Guild Charter**
  - **Mechanics:** licenses guild crafts with quality standards.
  - **Effects:** production consistency +12; innovation pace +8.
  - **Prereqs/Tradeoffs:** monopoly risk; worker compliance.
  - **AI Hook:** useful for quality-driven economies.
  - **Phase:** P2.

- **SW-058 — Public Works Bureau**
  - **Mechanics:** manages roads, wells, canals, sanitation routes.
  - **Effects:** workforce productivity +10; tax base rises by 5% over 6 cycles.
  - **Prereqs/Tradeoffs:** capital investment and corruption risk.
  - **AI Hook:** best after SW-050.
  - **Phase:** P2.

- **SW-059 — Slavery Registration**
  - **Mechanics:** legal framework for forced labor classification.
  - **Effects:** short-term construction speed +25 and military logistics +8%; +30 unrest among populations and future diplomatic penalties.
  - **Prereqs/Tradeoffs:** requires SW-003 + coercive authority; long-term rebellion multipliers.
  - **AI Hook:** high risk, only model as constrained extreme policy.
  - **Phase:** P2.

- **SW-060 — Forced Labor Quota**
  - **Mechanics:** assigns work gangs for state projects.
  - **Effects:** build throughput +18%; productivity decay if abusive cycles exceed threshold.
  - **Prereqs/Tradeoffs:** requires SW-059.
  - **AI Hook:** only under emergency thresholds; tracks unrest curves.
  - **Phase:** P2.

- **SW-061 — Abolition Reform**
  - **Mechanics:** legal process to end compulsory bondage, compensation framework.
  - **Effects:** unrest among elites +20, long-term labor morale +30, international reputation +25.
  - **Prereqs/Tradeoffs:** requires SW-019 or SW-031 and SW-059.
  - **AI Hook:** choose when legitimacy recovery and moral penalties matter.
  - **Phase:** P2.

- **SW-062 — Debt-Bond Registry**
  - **Mechanics:** tracks debt peonage obligations with redemption milestones.
  - **Effects:** workforce predictability +8; social coercion pressure +12.
  - **Prereqs/Tradeoffs:** requires SW-047.
  - **AI Hook:** alternatives to slavery with lower legitimacy damage.
  - **Phase:** P2.

- **SW-063 — Apprenticeship Tax Incentive**
  - **Mechanics:** subsidizes craft learning for non-noble households.
  - **Effects:** workforce skill index +15; short-term revenue dip.
  - **Prereqs/Tradeoffs:** needs public works or guild.
  - **AI Hook:** good for development without coercion.
  - **Phase:** P2.

- **SW-064 — Port Levies**
  - **Mechanics:** customs fees at coastal/elevated trade nodes.
  - **Effects:** maritime treasury +16; smuggling and black routes increase.
  - **Prereqs/Tradeoffs:** requires strategic trade access.
  - **AI Hook:** use for sea-linked empires.
  - **Phase:** P2.

- **SW-065 — Internal Bond Market**
  - **Mechanics:** secondary trading of public debts and future taxes.
  - **Effects:** liquidity +20 and financial complexity penalty.
  - **Prereqs/Tradeoffs:** requires high literacy admin and SW-047.
  - **AI Hook:** deploy for high complexity states.
  - **Phase:** P2.

- **SW-066 — Rural Banking Posts**
  - **Mechanics:** local credit and storage loans to villages.
  - **Effects:** farm output +12 if default low; default risk regional.
  - **Prereqs/Tradeoffs:** requires trust index >40.
  - **AI Hook:** increases resilience in distributed economies.
  - **Phase:** P2.

- **SW-067 — Harvest Insurance Pool**
  - **Mechanics:** public payouts during crop losses.
  - **Effects:** urban riot risk reduced 20%; treasury needs reserve cap.
  - **Prereqs/Tradeoffs:** requires granary systems.
  - **AI Hook:** use to maintain rural loyalty.
  - **Phase:** P2.

- **SW-068 — Black-Market Suppression Bureau**
  - **Mechanics:** raids, confiscations, intelligence-led seizures.
  - **Effects:** illicit flow down 35%; business chilling effect.
  - **Prereqs/Tradeoffs:** requires military police + legal due process.
  - **AI Hook:** deploy only when revenue losses exceed threshold.
  - **Phase:** P2.

- **SW-069 — Maritime Guild Tax**
  - **Mechanics:** regulates sea trade licensing and anti-smuggling inspection.
  - **Effects:** customs +18; navigator attrition risk.
  - **Prereqs/Tradeoffs:** requires SW-064.
  - **AI Hook:** use for navy-first mercantile states.
  - **Phase:** P2.

- **SW-070 — Industrial Hearth Centers**
  - **Mechanics:** clustered smithies, kilns, and tool houses.
  - **Effects:** unit/tool production +20%; smoke/air quality penalties to nearby districts.
  - **Prereqs/Tradeoffs:** requires fuel supply and road access.
  - **AI Hook:** balance with public health metrics.
  - **Phase:** P2.

- **SW-071 — Transport Guild Monopoly**
  - **Mechanics:** licenses one transport conglomerate with state contracts.
  - **Effects:** logistics efficiency +30%; price manipulation +20.
  - **Prereqs/Tradeoffs:** political backlash likely.
  - **AI Hook:** temporary high-risk growth move.
  - **Phase:** P2.

- **SW-072 — Land Reform Registry**
  - **Mechanics:** audits land concentration and redistributes title rights.
  - **Effects:** peasant loyalty +15, aristocratic taxes contested.
  - **Prereqs/Tradeoffs:** requires survey + judiciary.
  - **AI Hook:** useful against oligarchic stagnation.
  - **Phase:** P2.

- **SW-073 — Anti-Inflation Control**
  - **Mechanics:** caps price spikes, adjusts market lot sizes.
  - **Effects:** price stability +10; market dynamism -8.
  - **Prereqs/Tradeoffs:** requires treasury reserves.
  - **AI Hook:** use during shortages/hyperinflation.
  - **Phase:** P2.

- **SW-074 — State Monopsony (War-time Procurement)**
  - **Mechanics:** state preempts bulk grain/resources for military and relief.
  - **Effects:** supply security +18; private trust -25.
  - **Prereqs/Tradeoffs:** only emergency legal mode + high coercion.
  - **AI Hook:** war economy conversion path.
  - **Phase:** P2.

- **SW-075 — Regional Resource Charter**
  - **Mechanics:** divides extraction rights by region and tax share.
  - **Effects:** local compliance +12; extraction conflicts reduced.
  - **Prereqs/Tradeoffs:** requires boundaries and enforcement.
  - **AI Hook:** use in multi-region empires.
  - **Phase:** P2.

- **SW-076 — Treasury Secrecy Protocol**
  - **Mechanics:** limits public treasury ledger visibility.
  - **Effects:** prevents panic during downturns; corruption detection -15%.
  - **Prereqs/Tradeoffs:** reduces legitimacy if discovered.
  - **AI Hook:** temporary tactical opacity.
  - **Phase:** P2.

- **SW-077 — Trade Mission Network**
  - **Mechanics:** trained envoys for market diplomacy and long-route treaties.
  - **Effects:** route diversity +20; envoy losses penalize reputation.
  - **Prereqs/Tradeoffs:** requires diplomacy bureau.
  - **AI Hook:** expand reach without direct conquest.
  - **Phase:** P2.

- **SW-078 — Provincial Mint Deputies**
  - **Mechanics:** decentralized mint approvals to avoid transport delays.
  - **Effects:** local liquidity up +10; counterfeit risk rises.
  - **Prereqs/Tradeoffs:** requires SW-046 and anti-forgery court.
  - **AI Hook:** scale to wide empires.
  - **Phase:** P2.

- **SW-079 — Public Price Bulletin**
  - **Mechanics:** broadcasts commodity price ranges and shortages.
  - **Effects:** panic drop by 25; speculation can rise if trust low.
  - **Prereqs/Tradeoffs:** requires communication and scribes.
  - **AI Hook:** stabilize markets after shock.
  - **Phase:** P2.

- **SW-080 — Anti-Piracy Statute**
  - **Mechanics:** legal penalties + patrol triggers for river/lake raiding.
  - **Effects:** merchant confidence +25; enforcement costs +10.
  - **Prereqs/Tradeoffs:** requires patrol and navy or cavalry.
  - **AI Hook:** necessary for stable trade networks.
  - **Phase:** P2.

- **SW-081 — Fiscal Forecast Office**
  - **Mechanics:** predicts short-term revenue and debt runway.
  - **Effects:** budget crises -50% if trusted forecasts active.
  - **Prereqs/Tradeoffs:** high analytical complexity and data completeness.
  - **AI Hook:** critical for long planning windows.
  - **Phase:** P2.

- **SW-082 — Currency Anti-Forger Marks**
  - **Mechanics:** mint seals, die complexity, and verification process.
  - **Effects:** fake currency incidents -35%; production slows.
  - **Prereqs/Tradeoffs:** needs SW-046 and inspectors.
  - **AI Hook:** pair with trade expansion.
  - **Phase:** P2.

- **SW-083 — Debt Jubilation Moratorium**
  - **Mechanics:** emergency debt forgiveness event with staged repayment.
  - **Effects:** unrest falls +22; treasury long-term liabilities rise.
  - **Prereqs/Tradeoffs:** requires crisis marker and banking depth.
  - **AI Hook:** only when social stability collapses.
  - **Phase:** P2.

- **SW-084 — Corporate Charter Monopoly (State-Granted)**
  - **Mechanics:** grants exclusive rights over strategic commodity.
  - **Effects:** short-term production +25; political corruption risk +18.
  - **Prereqs/Tradeoffs:** elite capture potential.
  - **AI Hook:** exploit only if competition low.
  - **Phase:** P2.

- **SW-085 — Agricultural Research Plots**
  - **Mechanics:** test plots for yields, crop rotation, soil improvement.
  - **Effects:** yield variance -20%; innovation events +30 after 3 cycles.
  - **Prereqs/Tradeoffs:** requires granary, irrigation, and education.
  - **AI Hook:** long-term food security investment.
  - **Phase:** P2.

- **SW-086 — Tax Farming Outsource**
  - **Mechanics:** private contractors collect taxes under state contract.
  - **Effects:** collection efficiency +12; abuse risk +25.
  - **Prereqs/Tradeoffs:** requires trust contracts and enforcement.
  - **AI Hook:** choose for rapid expansion with weak administration.
  - **Phase:** P2.

- **SW-087 — Infrastructure Insurance Levy**
  - **Mechanics:** taxes funding rebuild costs for bridges/canals.
  - **Effects:** post-raid recovery speed +18.
  - **Prereqs/Tradeoffs:** low short-term revenue.
  - **AI Hook:** defensive strategy for war-prone regions.
  - **Phase:** P2.

- **SW-088 — Export Quota Framework**
  - **Mechanics:** regulates essential good exports and strategic reserves.
  - **Effects:** domestic prices stable +12; partner diplomacy +6.
  - **Prereqs/Tradeoffs:** trade partner discontent possible.
  - **AI Hook:** control macro shocks.
  - **Phase:** P2.

- **SW-089 — Mining Safety Code**
  - **Mechanics:** worker safety standards and mandatory incident reporting.
  - **Effects:** mine output -5, fatality rates down -60.
  - **Prereqs/Tradeoffs:** reduces short-term profits.
  - **AI Hook:** use in mature industrial states.
  - **Phase:** P2.

- **SW-090 — Rural Credit Coops**
  - **Mechanics:** community-managed seed and tools lending.
  - **Effects:** default risk pooled; rural productivity +8.
  - **Prereqs/Tradeoffs:** requires education channels.
  - **AI Hook:** less authoritarian social stability path.
  - **Phase:** P2.

## Phase 3 — Social Systems, Information, and Public Order (P3)

- **SW-091 — State Schools**
  - **Mechanics:** literacy and technical training at district level.
  - **Effects:** administrative productivity +15; cultural assimilation +8.
  - **Prereqs/Tradeoffs:** construction cost and clerical load.
  - **AI Hook:** unlocks complex policy evaluation.
  - **Phase:** P3.

- **SW-092 — Temple-Market Compacts**
  - **Mechanics:** regulate clergy taxation and public ritual contributions.
  - **Effects:** cohesion +12; secular dissent +6.
  - **Prereqs/Tradeoffs:** requires religion policy path.
  - **AI Hook:** use for moral legitimacy spikes.
  - **Phase:** P3.

- **SW-093 — Public Health Corps**
  - **Mechanics:** sanitation, quarantine routes, heal stations.
  - **Effects:** disease spread -35%; upkeep +12.
  - **Prereqs/Tradeoffs:** urban density threshold required.
  - **AI Hook:** high value in dense settlements.
  - **Phase:** P3.

- **SW-094 — Census Health Registry**
  - **Mechanics:** tracks outbreaks and treatment uptake.
  - **Effects:** outbreak response +25%; privacy backlash if abused.
  - **Prereqs/Tradeoffs:** requires public health base.
  - **AI Hook:** preemptive response policy.
  - **Phase:** P3.

- **SW-095 — Public Education Curriculum**
  - **Mechanics:** unified civics, numeracy, civic rights.
  - **Effects:** law compliance +18 and rumor resistance +14.
  - **Prereqs/Tradeoffs:** can reduce local cultural autonomy.
  - **AI Hook:** beneficial for bureaucracy-heavy states.
  - **Phase:** P3.

- **SW-096 — Freedom of Assembly**
  - **Mechanics:** legal channels for gatherings and debate.
  - **Effects:** legitimacy +10, immediate policy delays +5.
  - **Prereqs/Tradeoffs:** requires civil order laws.
  - **AI Hook:** use in high-trust governance.
  - **Phase:** P3.

- **SW-097 — Censorship Office**
  - **Mechanics:** controls rumor flow, printer approvals, and public messages.
  - **Effects:** unrest from dissent -12 initially; trust decay -20 if overused.
  - **Prereqs/Tradeoffs:** requires centralized comms and propaganda.
  - **AI Hook:** short-term control vs long-term legitimacy trade-off.
  - **Phase:** P3.

- **SW-098 — Free Press Charter**
  - **Mechanics:** protects independent information publishing.
  - **Effects:** corruption exposure +20, rumor accuracy +12, policy sabotage risk +8.
  - **Prereqs/Tradeoffs:** requires legal framework and courts.
  - **AI Hook:** transparency strategy.
  - **Phase:** P3.

- **SW-099 — Civil Rights Codex**
  - **Mechanics:** baseline protections against arbitrary detention and labor coercion.
  - **Effects:** long-term productivity +12; immediate elite dissatisfaction.
  - **Prereqs/Tradeoffs:** requires judiciary capacity.
  - **AI Hook:** high stability arc.
  - **Phase:** P3.

- **SW-100 — Anti-Slavery Sentiment Index**
  - **Mechanics:** tracks anti-coercive movement intensity.
  - **Effects:** forced labor policies face penalty +25 unrest.
  - **Prereqs/Tradeoffs:** requires religious/civic education network.
  - **AI Hook:** pressure gauge for ethics/political path.
  - **Phase:** P3.

- **SW-101 — Civil Registry of Persons**
  - **Mechanics:** identity records linked to rights, taxes, and obligations.
  - **Effects:** service access +15; surveillance friction +6.
  - **Prereqs/Tradeoffs:** administrative capacity.
  - **AI Hook:** baseline for rights + policing decisions.
  - **Phase:** P3.

- **SW-102 — Civic Welfare Pensions**
  - **Mechanics:** old-age and injury support through treasury.
  - **Effects:** veteran morale +20, budget cost high.
  - **Prereqs/Tradeoffs:** fiscal headroom required.
  - **AI Hook:** stabilizes post-war societies.
  - **Phase:** P3.

- **SW-103 — Public Works Labor Unions**
  - **Mechanics:** legal labor collectives for wage negotiations.
  - **Effects:** strike risk -25 and negotiation costs +10.
  - **Prereqs/Tradeoffs:** legal rights and communication.
  - **AI Hook:** manage labor unrest in big cities.
  - **Phase:** P3.

- **SW-104 — Cultural Festivals Commission**
  - **Mechanics:** state-supported rituals and holidays.
  - **Effects:** morale +12; treasury cost +8.
  - **Prereqs/Tradeoffs:** needs civic unity index.
  - **AI Hook:** morale stabilizer in war and famine.
  - **Phase:** P3.

- **SW-105 — Elite Patronage Ledger**
  - **Mechanics:** tracks gifts to nobles, generals, guild masters.
  - **Effects:** elite loyalty +18, corruption visibility -10.
  - **Prereqs/Tradeoffs:** political risk if leaked.
  - **AI Hook:** containment during coalition periods.
  - **Phase:** P3.

- **SW-106 — Anti-Extremism Mediation**
  - **Mechanics:** identifies radical cells and negotiation teams.
  - **Effects:** terror incidents down 20; civil tension may worsen short-term.
  - **Prereqs/Tradeoffs:** intelligence + legal authority.
  - **AI Hook:** respond to ideological instability.
  - **Phase:** P3.

- **SW-107 — Religious Autonomy Board**
  - **Mechanics:** grants recognized faith institutions internal legal autonomy.
  - **Effects:** minority tensions down; policy enforcement complexity +12.
  - **Prereqs/Tradeoffs:** requires social cohesion and pluralism.
  - **AI Hook:** use when multiple faith groups are present.
  - **Phase:** P3.

- **SW-108 — Controlled Media Network**
  - **Mechanics:** state-run broadcast network with narrative priority.
  - **Effects:** policy uptake +15; dissent visibility -12.
  - **Prereqs/Tradeoffs:** can trigger counter-narratives.
  - **AI Hook:** temporary cohesion tool during crisis.
  - **Phase:** P3.

- **SW-109 — Migration Registry**
  - **Mechanics:** tracks immigrant entry, permits, and labor matching.
  - **Effects:** demographic adaptability +10; xenophobia spikes possible.
  - **Prereqs/Tradeoffs:** required border points.
  - **AI Hook:** strategic population growth and diversity balancing.
  - **Phase:** P3.

- **SW-110 — Assimilation Program**
  - **Mechanics:** language and legal integration for newcomers.
  - **Effects:** integration rate +20; cultural erosion resistance +15.
  - **Prereqs/Tradeoffs:** requires schools and registry.
  - **AI Hook:** long-term unity investment.
  - **Phase:** P3.

- **SW-111 — Migration Restriction Regime**
  - **Mechanics:** quotas and entry inspections.
  - **Effects:** security control +15; labor shortage risk +12.
  - **Prereqs/Tradeoffs:** require registry and border control.
  - **AI Hook:** use in high-threat periods only.
  - **Phase:** P3.

- **SW-112 — Civil Registry Appeals Court**
  - **Mechanics:** independent process for civil complaints.
  - **Effects:** grievance intensity down; procedure cost +15%.
  - **Prereqs/Tradeoffs:** judiciary depth and legal codex.
  - **AI Hook:** use to prevent grievance accumulation.
  - **Phase:** P3.

- **SW-113 — Women’s Guild Inclusion**
  - **Mechanics:** formal workforce and legal recognition.
  - **Effects:** workforce participation +14; traditionalist resistance.
  - **Prereqs/Tradeoffs:** requires rights codex and schools.
  - **AI Hook:** productivity growth route.
  - **Phase:** P3.

- **SW-114 — Child Protection Statute**
  - **Mechanics:** limits child labor and mandatory welfare checks.
  - **Effects:** future labor quality +10; immediate production dip.
  - **Prereqs/Tradeoffs:** requires legal and enforcement capacity.
  - **AI Hook:** long-horizon social health strategy.
  - **Phase:** P3.

- **SW-115 — Population Mobility Infrastructure**
  - **Mechanics:** planned relocation, transit corridors, relocation support.
  - **Effects:** labor rebalancing +18; integration costs.
  - **Prereqs/Tradeoffs:** needs transport and registry.
  - **AI Hook:** fix over/under-populated regions.
  - **Phase:** P3.

- **SW-116 — Anti-Corruption Hotline**
  - **Mechanics:** anonymous reporting channel with evidence trails.
  - **Effects:** detection +22, false-report risk if trust low.
  - **Prereqs/Tradeoffs:** needs press protection and courts.
  - **AI Hook:** improve trust with modest false-positive handling.
  - **Phase:** P3.

- **SW-117 — Public Art and Narrative Program**
  - **Mechanics:** supports literature, murals, and civic narratives.
  - **Effects:** morale +9, dissent channel +4.
  - **Prereqs/Tradeoffs:** cultural spending budget.
  - **AI Hook:** soft governance for integration and morale.
  - **Phase:** P3.

- **SW-118 — Civic Duty Education**
  - **Mechanics:** training for military reserves, disaster response, and voting procedures.
  - **Effects:** mobilization speed +20; peacetime overhead.
  - **Prereqs/Tradeoffs:** requires schools and barracks.
  - **AI Hook:** convert into resilience under threat.
  - **Phase:** P3.

- **SW-119 — Minority Representation Rule**
  - **Mechanics:** reserved advisory seats and anti-discrimination metrics.
  - **Effects:** rebellion risk from excluded groups -18; political resistance +10.
  - **Prereqs/Tradeoffs:** requires council-like institutions.
  - **AI Hook:** reduce long-term secession risk.
  - **Phase:** P3.

- **SW-120 — Public Information Archive**
  - **Mechanics:** long-lived repository for laws, treaties, budgets, and decrees.
  - **Effects:** reduces rumor distortion +20.
  - **Prereqs/Tradeoffs:** high storage/admin.
  - **AI Hook:** enables evidence-driven decisions.
  - **Phase:** P3.

## Phase 4 — Justice, Security, Diplomacy, and Conflict (P4)

- **SW-121 — City Garrison**
  - **Mechanics:** standing urban force and alarm integration.
  - **Effects:** unrest suppression +18; civic budget cost.
  - **Prereqs/Tradeoffs:** requires city administration.
  - **AI Hook:** activate during rebellion risk.
  - **Phase:** P4.

- **SW-122 — Rural Policing**
  - **Mechanics:** local enforcement posts and reporting chains.
  - **Effects:** bandit incidents -30; over-policing complaints +8.
  - **Prereqs/Tradeoffs:** requires magistrates.
  - **AI Hook:** stabilize hinterlands for tax collection.
  - **Phase:** P4.

- **SW-123 — Code of Criminal Law**
  - **Mechanics:** codified punishments, evidentiary standards.
  - **Effects:** court throughput improves; arbitrary punishments reduced.
  - **Prereqs/Tradeoffs:** judiciary and scribes.
  - **AI Hook:** reduce rule-law variation.
  - **Phase:** P4.

- **SW-124 — Judicial Review Court**
  - **Mechanics:** appellate body invalidates unlawful decrees.
  - **Effects:** rights protection +12 and elite resistance +6.
  - **Prereqs/Tradeoffs:** requires SW-032 and trained legal staff.
  - **AI Hook:** high-quality governance branch.
  - **Phase:** P4.

- **SW-125 — Espionage Academy**
  - **Mechanics:** recruit spies, dead-drops, ciphers.
  - **Effects:** intelligence acquisition +25; infiltration risk.
  - **Prereqs/Tradeoffs:** requires communication and policing.
  - **AI Hook:** unlock asymmetrical strategy.
  - **Phase:** P4.

- **SW-126 — Counter-Intelligence Bureau**
  - **Mechanics:** detects infiltrators and leak channels.
  - **Effects:** espionage losses -20; paranoia +10 among elites.
  - **Prereqs/Tradeoffs:** requires legal warrant norms.
  - **AI Hook:** balance with civil liberty pressure.
  - **Phase:** P4.

- **SW-127 — Fortress Walls**
  - **Mechanics:** perimeter wall and gate mechanisms. Wall tiles block all movement for every tribe, including owners and allies; only explicit gates can create controlled passage. Explicit `ATTACK` orders can target visible hostile wall ids for breach attempts.
  - **Effects:** siege breach time +40%; trade congestion +5 unless gate capacity is managed.
  - **Prereqs/Tradeoffs:** stone supply and maintenance.
  - **AI Hook:** defensive consolidation strategy; attackers can now name a visible wall segment as a siege target when route denial or conquest requires it.
  - **Phase:** P4.

- **SW-127A — Lockable Gatehouses**
  - **Mechanics:** gate buildings with open, closed, locked, damaged, and destroyed states are implemented for the first slice; open gates support `all`, `owner_allies`, and `owner_only` access policies.
  - **Effects:** route control and border security improve; bad locking decisions can trap workers, block reinforcements, or break trade.
  - **Prereqs/Tradeoffs:** requires fortress walls, iron hardware, and trained gatekeepers or automation.
  - **AI Hook:** negotiate, deceive, revoke, or enforce passage rights; use gates for traps, embargoes, retreats, and siege defense.
  - **Phase:** P4.

- **SW-128 — Turret Battery Network**
  - **Mechanics:** fixed defensive emplacements with overlapping fire zones.
  - **Effects:** early raid casualties increase.
  - **Prereqs/Tradeoffs:** needs wall network and metallurgical support.
  - **AI Hook:** anti-cavalry/raider defense.
  - **Phase:** P4.

- **SW-129 — Siegeworks Program**
  - **Mechanics:** develops scaling ladders, siege towers, breaching gear.
  - **Effects:** offensive damage +30 in sieges; resource draw high.
  - **Prereqs/Tradeoffs:** requires military doctrine and workshops.
  - **AI Hook:** choose for fortress-breaking campaigns.
  - **Phase:** P4.

- **SW-130 — Watchtower Grid**
  - **Mechanics:** chain of elevated vision points and signal reroute.
  - **Effects:** detection time -15%; visibility of non-owners +10%.
  - **Prereqs/Tradeoffs:** construction cost.
  - **AI Hook:** low-cost anti-raid safety.
  - **Phase:** P4.

- **SW-131 — Guerrilla Doctrine**
  - **Mechanics:** irregular warfare tactics for smaller forces.
  - **Effects:** attrition advantage in rough terrain.
  - **Prereqs/Tradeoffs:** requires low mobility cost and local support.
  - **AI Hook:** underdog defense branch.
  - **Phase:** P4.

- **SW-132 — Shock Doctrine**
  - **Mechanics:** rapid aggression and punitive raids.
  - **Effects:** short campaign speed +40%; diplomatic reputation penalties.
  - **Prereqs/Tradeoffs:** high morale troops, high brutality index.
  - **AI Hook:** decisive warfare path with long-term social cost.
  - **Phase:** P4.

- **SW-133 — Defensive Doctrine**
  - **Mechanics:** unit spacing and reserve-first tactics.
  - **Effects:** loss rate reduced; enemy attrition up.
  - **Prereqs/Tradeoffs:** requires stable command.
  - **AI Hook:** resilience vs expansion style.
  - **Phase:** P4.

- **SW-134 — Standing Army**
  - **Mechanics:** permanent, fully paid military organization.
  - **Effects:** response +35; fiscal burden significant.
  - **Prereqs/Tradeoffs:** requires treasury and barracks.
  - **AI Hook:** war deterrence and rapid response.
  - **Phase:** P4.

- **SW-135 — Militia Reserve**
  - **Mechanics:** conditional reserve mobilization with call-up.
  - **Effects:** wartime manpower +30; peace-time cost low.
  - **Prereqs/Tradeoffs:** requires civic duty systems.
  - **AI Hook:** flexible military scaling.
  - **Phase:** P4.

- **SW-136 — Officer Corps Academy**
  - **Mechanics:** command doctrine training and tactical simulations.
  - **Effects:** unit efficiency +15, promotion conflicts.
  - **Prereqs/Tradeoffs:** requires education and barracks.
  - **AI Hook:** long-term campaign quality.
  - **Phase:** P4.

- **SW-137 — Conscription**
  - **Mechanics:** mandatory military service at age bands.
  - **Effects:** manpower +25; labor loss in economy.
  - **Prereqs/Tradeoffs:** requires legal framework and public management.
  - **AI Hook:** emergency war conversion.
  - **Phase:** P4.

- **SW-138 — Mercenary Charter**
  - **Mechanics:** contracts external fighters with fixed terms.
  - **Effects:** force projection +18; loyalty uncertainty +15.
  - **Prereqs/Tradeoffs:** treasury reserves and command controls.
  - **AI Hook:** fast-force ramp in medium game state.
  - **Phase:** P4.

- **SW-139 — Diplomacy Corps**
  - **Mechanics:** formal negotiation units with language, protocol, and treaty memory.
  - **Effects:** alliances hold probability +20.
  - **Prereqs/Tradeoffs:** requires messengers and legation bureaucracy.
  - **AI Hook:** reduce war frequency and open trade.
  - **Phase:** P4.

- **SW-140 — Treaty Ratification**
  - **Mechanics:** codify interstate commitments with violation penalties.
  - **Effects:** betrayal costs increase for both.
  - **Prereqs/Tradeoffs:** requires SW-139 and records.
  - **AI Hook:** stabilize long-term alliances.
  - **Phase:** P4.

- **SW-141 — Espionage Countermeasures: False Flag Detectors**
  - **Mechanics:** tests message authenticity and messenger behavior anomalies.
  - **Effects:** diplomatic deception reduced.
  - **Prereqs/Tradeoffs:** intelligence investment.
  - **AI Hook:** protect treaty pathways.
  - **Phase:** P4.

- **SW-142 — Propaganda Network**
  - **Mechanics:** produces political narratives and morale packets.
  - **Effects:** morale spikes +12 and skepticism reduced.
  - **Prereqs/Tradeoffs:** if overused, trust and external credibility drop.
  - **AI Hook:** combine with crises or major campaigns.
  - **Phase:** P4.

- **SW-143 — Public Diplomatic Ledger**
  - **Mechanics:** tracks promises, debts, and treaty status per tribe.
  - **Effects:** AI reasoning quality on diplomacy +30.
  - **Prereqs/Tradeoffs:** requires archive and legation bureau.
  - **AI Hook:** supports trust or opportunism modeling.
  - **Phase:** P4.

- **SW-144 — Trade Embargo System**
  - **Mechanics:** restricts goods to hostile actors via checkpoint enforcement.
  - **Effects:** target economy hit -20; retaliation risk.
  - **Prereqs/Tradeoffs:** customs controls and enforcement.
  - **AI Hook:** non-military coercion tool.
  - **Phase:** P4.

- **SW-145 — Refuge Policy**
  - **Mechanics:** accepts political/migratory refugees with screening.
  - **Effects:** demographic +8 and labor potential.
  - **Prereqs/Tradeoffs:** increases integration complexity.
  - **AI Hook:** humanitarian and strategic labor policy.
  - **Phase:** P4.

- **SW-146 — Naval Patrol**
  - **Mechanics:** river/lake patrol craft and anti-raid routes.
  - **Effects:** merchant convoy safety +20.
  - **Prereqs/Tradeoffs:** terrain/resource limitations.
  - **AI Hook:** unlocks waterborne strategy.
  - **Phase:** P4.

- **SW-147 — Intelligence Courts**
  - **Mechanics:** specialized adjudication for spy cases and traitors.
  - **Effects:** intelligence discipline +25; due-process reputation risk.
  - **Prereqs/Tradeoffs:** requires legal and CI systems.
  - **AI Hook:** handle high-threat espionage environments.
  - **Phase:** P4.

- **SW-148 — Humanitarian Corridor Protocol**
  - **Mechanics:** protected passage agreements during conflict.
  - **Effects:** humanitarian morale +15 and reputation +25.
  - **Prereqs/Tradeoffs:** requires diplomacy credibility.
  - **AI Hook:** reduce moral/legal penalties.
  - **Phase:** P4.

- **SW-149 — Border Gate Tax Exemption**
  - **Mechanics:** selective exemptions for strategic allies.
  - **Effects:** alliance goodwill +10; smuggling +15.
  - **Prereqs/Tradeoffs:** requires trust and monitoring.
  - **AI Hook:** negotiate for alliance leverage.
  - **Phase:** P4.

- **SW-150 — War Debt Tribunal**
  - **Mechanics:** adjudicates war damage compensation claims.
  - **Effects:** post-conflict stabilization +12; costs from reparations.
  - **Prereqs/Tradeoffs:** post-war legitimacy branch.
  - **AI Hook:** peace consolidation.
  - **Phase:** P4.

## Phase 5 — Long-Horizon Strategic Systems (P5)

- **SW-151 — Succession Education Academy**
  - **Mechanics:** trains dynastic and civil successors with simulation scenarios.
  - **Effects:** leadership quality +25; training time 6 cycles.
  - **Prereqs/Tradeoffs:** high social cost and elite rivalry.
  - **AI Hook:** stabilize multi-century campaigns.
  - **Phase:** P5.

- **SW-152 — Federal Compact**
  - **Mechanics:** devolves sovereignty into federated regions with shared war policy.
  - **Effects:** regional satisfaction +20; decision complexity +22.
  - **Prereqs/Tradeoffs:** requires strong communication and legal cohesion.
  - **AI Hook:** useful for multi-ethnic empire scale.
  - **Phase:** P5.

- **SW-153 — Constitutional Court**
  - **Mechanics:** highest legal body for constitutional disputes.
  - **Effects:** authoritarian swings capped; reform legitimacy +15.
  - **Prereqs/Tradeoffs:** high administrative cost and time.
  - **AI Hook:** high-stability route.
  - **Phase:** P5.

- **SW-154 — National Census + AI Forecast**
  - **Mechanics:** full demographic-economic simulation used by planner.
  - **Effects:** macro prediction quality +30.
  - **Prereqs/Tradeoffs:** data privacy stress index.
  - **AI Hook:** for sophisticated sovereign planning.
  - **Phase:** P5.

- **SW-155 — Merit Rotation Office**
  - **Mechanics:** rotates provincial judges and officers to reduce capture.
  - **Effects:** capture risk -20; morale drop from displaced elites.
  - **Prereqs/Tradeoffs:** requires bureaucracy and transport.
  - **AI Hook:** anti-rent-seeking controls.
  - **Phase:** P5.

- **SW-156 — Judicial Immunity Reform**
  - **Mechanics:** limits executive override over courts.
  - **Effects:** rule consistency +18; immediate executive friction.
  - **Prereqs/Tradeoffs:** requires stable legal stack.
  - **AI Hook:** long-term trust strategy.
  - **Phase:** P5.

- **SW-157 — Constitutional Revision Convention**
  - **Mechanics:** allows major institutional rewrite events with supermajority.
  - **Effects:** reset in trust and policy space; instability risk during transition.
  - **Prereqs/Tradeoffs:** requires political consensus.
  - **AI Hook:** large arc pivot with strategic reset.
  - **Phase:** P5.

- **SW-158 — Imperial Secretariat**
  - **Mechanics:** integrative command for diplomacy, military, economy.
  - **Effects:** cross-domain coordination +25.
  - **Prereqs/Tradeoffs:** central bureaucracy overhead.
  - **AI Hook:** late-game mega-civilization control.
  - **Phase:** P5.

- **SW-159 — Public Debt Audit**
  - **Mechanics:** full debt transparency and repayment roadmap.
  - **Effects:** trust +12 if credible.
  - **Prereqs/Tradeoffs:** exposes legacy liabilities.
  - **AI Hook:** financial recovery before expansion.
  - **Phase:** P5.

- **SW-160 — Global Trade Treaty Framework**
  - **Mechanics:** multi-party trade charter with penalties for violators.
  - **Effects:** trade resilience +40; concession pressure on sovereignty.
  - **Prereqs/Tradeoffs:** mature diplomacy and treasury.
  - **AI Hook:** late diplomacy for stable growth.
  - **Phase:** P5.

- **SW-161 — Universal Draft Registry**
  - **Mechanics:** military census across regions and classes.
  - **Effects:** strategic manpower projection +30; resistance probability among minorities.
  - **Prereqs/Tradeoffs:** requires civil rights baseline to avoid severe unrest.
  - **AI Hook:** sustained conflict planning.
  - **Phase:** P5.

- **SW-162 — Post-War Reconstruction Office**
  - **Mechanics:** rebuild priorities, compensation scheduling, infrastructure sequencing.
  - **Effects:** recovery speed +35 after conflict.
  - **Prereqs/Tradeoffs:** requires reserve funds and civil administration.
  - **AI Hook:** prevents long-term decline.
  - **Phase:** P5.

- **SW-163 — Monumental Infrastructure Corridor**
  - **Mechanics:** major transport/irrigation/fort line integrated project.
  - **Effects:** throughput +50 for whole kingdom.
  - **Prereqs/Tradeoffs:** high debt and labor demands.
  - **AI Hook:** one-time high investment for dominance.
  - **Phase:** P5.

- **SW-164 — Civic Automation Ledger**
  - **Mechanics:** applies scriptable policy enforcement via rule graph.
  - **Effects:** admin burden reduced, policy abuse risk if misconfigured.
  - **Prereqs/Tradeoffs:** stable governance and oversight.
  - **AI Hook:** enables autonomous civic operations.
  - **Phase:** P5.

- **SW-165 — Truth and Reconciliation Council**
  - **Mechanics:** formal reckoning for prior abuses.
  - **Effects:** long-term stability +20, short-term unrest +15.
  - **Prereqs/Tradeoffs:** requires justice institutions.
  - **AI Hook:** recover from repression-heavy arcs.
  - **Phase:** P5.

- **SW-166 — Inter-Regional Water Authority**
  - **Mechanics:** shared basin governance and conflict arbitration.
  - **Effects:** agricultural stability +18.
  - **Prereqs/Tradeoffs:** climate-sensitive and conflict-prone.
  - **AI Hook:** prevent resource wars.
  - **Phase:** P5.

- **SW-167 — Digital Archive Simulation**
  - **Mechanics:** immutable history and decision replay for policy review.
  - **Effects:** institutional memory +25 and learning speed.
  - **Prereqs/Tradeoffs:** storage and cyber-security overhead.
  - **AI Hook:** improves planner accountability.
  - **Phase:** P5.

- **SW-168 — Anti-Extortion Law**
  - **Mechanics:** criminal penalties for coercive levy and racketeering.
  - **Effects:** commercial confidence +12; enforcement friction.
  - **Prereqs/Tradeoffs:** needs functioning courts.
  - **AI Hook:** secure trade and reduce hidden costs.
  - **Phase:** P5.

- **SW-169 — Public-Private Partnership Board**
  - **Mechanics:** sets risk-sharing rules for utilities and infrastructure.
  - **Effects:** build speed +25, accountability complexity +16.
  - **Prereqs/Tradeoffs:** legal and finance capacity.
  - **AI Hook:** accelerate large projects.
  - **Phase:** P5.

- **SW-170 — Moral Economy Charter**
  - **Mechanics:** defines acceptable labor, war spoils, and aid obligations.
  - **Effects:** social cohesion +18; policy flexibility down.
  - **Prereqs/Tradeoffs:** requires broad legitimacy.
  - **AI Hook:** late-game social contract pivot.
  - **Phase:** P5.

- **SW-171 — AI Governance Observatory**
  - **Mechanics:** scores all branches on effectiveness/ethics/stability.
  - **Effects:** sovereign decision quality +15 with explainability hooks.
  - **Prereqs/Tradeoffs:** requires data capture and review.
  - **AI Hook:** meta-governance optimization.
  - **Phase:** P5.

- **SW-172 — Emergency Constitutional Lock**
  - **Mechanics:** temporary concentration of authority with sunset clauses.
  - **Effects:** crisis handling speed +60; legitimacy decay if prolonged.
  - **Prereqs/Tradeoffs:** can only be invoked with declaration.
  - **AI Hook:** crisis-only path, hard cap on extension.
  - **Phase:** P5.

- **SW-173 — Interfaith Arbitration Tribunal**
  - **Mechanics:** handles religious conflicts using mixed legal principles.
  - **Effects:** sect conflict probability -25.
  - **Prereqs/Tradeoffs:** requires autonomy board and legal legitimacy.
  - **AI Hook:** long-term peace maintenance.
  - **Phase:** P5.

- **SW-174 — Exile and Reintegration Program**
  - **Mechanics:** structured reintegration for expelled populations.
  - **Effects:** border violence -18, trust recovery +12.
  - **Prereqs/Tradeoffs:** governance and civic resources.
  - **AI Hook:** reduces persistent insurgency.
  - **Phase:** P5.

- **SW-175 — Generational Planning Board**
  - **Mechanics:** forecasts 5- and 20-cycle resource and succession trajectories.
  - **Effects:** policy consistency and inter-generational stability +22.
  - **Prereqs/Tradeoffs:** requires comprehensive registries.
  - **AI Hook:** for long-running civilizations.
  - **Phase:** P5.

## Implementation Phasing Notes

### Suggested Delivery Slices

1. **Slice A (P0–P1):** Core governance + administrative stability.
2. **Slice B (P2):** Economy, taxation, and labor/legal complexity.
3. **Slice C (P3):** Social systems, information, welfare, and rights/policies.
4. **Slice D (P4):** Courts, policing, security, espionage, diplomacy, military doctrine.
5. **Slice E (P5):** Constitutional and systems-level maturity layer.

### Suggested Dependencies Model

- Use an **AND/OR dependency graph** with:
  - hard gates (`requires`)
  - soft synergy bonuses (`synergy_with`)
  - soft locks that can be bypassed at penalties
- Include **morality / legitimacy as first-class score dimensions** (e.g., `coercion`, `rights`, `stability`, `diplomatic_cost`, `economic_benefit`).
- Every controversial development should explicitly emit:
  - `civil_cost`
  - `economic_cost`
  - `diplomatic_cost`
  - `long_tail_unrest`

### AI Sovereign Decision Hooks (for prompt tooling)

- Choose next developments via weighted utility scoring:
  - `survival_score`
  - `wealth_growth_score`
  - `stability_score`
  - `legitimacy_score`
  - `coercion_penalty`
- Enforce anti-pattern checks:
  - no single-path domination (avoid repeated coercive unlocks)
  - avoid forbidden combinations (e.g., `censorship` without legal oversight if rights high)
  - conflict-aware diplomacy (military doctrine and treaty reputation must cohere).
