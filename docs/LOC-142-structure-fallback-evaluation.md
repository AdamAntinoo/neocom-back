# LOC-142 — External structure source evaluation

**Status:** evaluation recorded; **not** wired to production.  
**Primary path:** official ESI Universe structures API (`getStructureById` / `getUniverseStructuresStructureId`) — LOC-132.

## Trigger

When the official ESI structures API fails for a structure id (error, empty, or inaccessible), the programme may consider third-party structure information sources.

## Candidate (minimum): Adam4EVE Structure Search

| Topic | Notes |
| --- | --- |
| Access method | Web UI / site search (Adam4EVE); programmatic access (scrape or any unofficial API) is **not** confirmed for production use |
| ToS / licensing | Not reviewed for NEOCOM redistribution or automated querying — **blocker** until legal/ToS review |
| Data completeness vs ESI | Expected to cover public citadel/structure names and systems; completeness vs authenticated ESI structure payload (owner, type, position) is **unknown** without a sample comparison |
| Mapping into `SpaceLocation` | Would need `structureId`, `structureName`, `structureTypeId`, `ownerId` / corporation fields, plus system → constellation → region (LOC-141). Any missing fields would leave incomplete Redis write-through |
| Nest outbound adapter | **Not justified yet** — no ToS clearance, no stable machine API contract, ESI remains primary |

## Decision

Do **not** add a Nest outbound adapter for Adam4EVE (or similar) until:

1. ToS/licensing review is recorded as acceptable for automated use, and  
2. A concrete access method and field mapping into `SpaceLocation` are specified, and  
3. This evaluation is updated with that decision.

Until then, structure resolve failures surface as catalog absence / ESI errors; ESI remains the only production structure path.
