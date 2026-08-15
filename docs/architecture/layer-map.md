# Frontend Architecture Invariants

> **Current inventory:** [`frontend-inventory.md`](./frontend-inventory.md)
> **Historical provenance:** This invariant set originated in a historical planning decision register; that local planning material is not part of this repository-facing document set.

This document defines stable layer rules. It intentionally does not enumerate current routes,
modules, or folder contents; use the linked inventory for that maintained snapshot.

## Layer hierarchy

```text
app  →  pages  →  widgets  →  features  →  entities  →  shared
```

| Layer      | Stable responsibility                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `app`      | Bootstrap, routing, provider wiring, and top-level layouts.                                                |
| `pages`    | Route-level composition; pages are not reusable lower-layer dependencies.                                  |
| `widgets`  | Reusable composite UI blocks spanning pages or one workflow.                                               |
| `features` | User-facing capabilities, flows, query/mutation wiring, and business orchestration.                        |
| `entities` | Domain models, DTOs, mappers, and view-model selectors.                                                    |
| `shared`   | Endpoint-agnostic primitives, utilities, configuration, accessibility helpers, and API-client foundations. |

## Import direction

Upper layers may import from lower layers only. Lower layers never import from upper layers.

```text
app         ← pages, widgets, features, entities, shared
pages       ← widgets, features, entities, shared
widgets     ← features, entities, shared
features    ← entities, shared
entities    ← shared
shared      ← nothing
```

- Cross-feature usage goes through each feature's explicit public API.
- `app` provider wiring consumes lower-layer public APIs.
- `shared` has no domain knowledge and does not import from any domain layer.

## Forbidden upward edges

| From layer | Must not import                                   |
| ---------- | ------------------------------------------------- |
| `pages`    | `app`                                             |
| `widgets`  | `app`, `pages`                                    |
| `features` | `app`, `pages`, `widgets`                         |
| `entities` | `app`, `pages`, `widgets`, `features`             |
| `shared`   | `app`, `pages`, `widgets`, `features`, `entities` |

## Historical decision provenance

ARCH-001 through ARCH-018 in the source document are the original planning decision register.
They remain provenance for these invariants, not a current inventory claim. In particular, prior
proposed folder trees and candidate directions must not be read as evidence of a live module,
route, or owner; the live route registry and the current inventory govern those facts.
