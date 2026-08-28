# Localization review exchange

These public Node commands read only explicit paths and never load local-only orchestration files. The canonical
registry remains the sole corpus source of truth; generated resources are always rendered by the
corpus engine and committed together with the registry only after full-pack preflight succeeds.

## Rebind one stale consumer grammar wrapper

```powershell
npm run localization:consumer:rebind -- <registryPath> <generatedOutputPath> <taskId> <sourcePath> <functionName> <bindingName>
```

This command accepts an exact `FE-NNN` task and one existing canonical translator-wrapper
identity. It computes the current source fingerprint with the corpus engine, allows only that
wrapper's known stale source-graph state during preflight, validates the full next corpus and source
graph, renders generated resources, and commits both targets transactionally. The registry patch is
limited to the selected wrapper's fingerprint. Exact current-fingerprint replay returns `rebound:
false` without writing. Registry/output aliases, missing or ambiguous wrappers, malformed source,
and any unrelated source-graph violation fail before a write. It does not create, review, export,
import, approve, or alter locale candidate metadata.

## Rebind every existing grammar entry for one source file

```powershell
npm run localization:consumer:source-rebind -- <registryPath> <generatedOutputPath> <taskId> <sourcePath>
```

This command accepts one exact normalized `src/`-relative source path and updates only the
`sourceFingerprint` fields of every existing consumer-grammar entry with that source path. It
covers wrappers, forwarders, dependencies, and dynamic-key-family consumers so a file revision is
coherent without changing grammar identities, unit IDs, locale candidates, review metadata,
baseline resources, or occurrences. At least one entry must match; malformed/aliased targets,
missing sources, invalid corpus/source graphs, and transaction failures fail closed. Exact replay
returns `rebound: false` without writing.

## Register authorized draft units

```powershell
npm run localization:draft:register -- <registryPath> <generatedOutputPath> <taskId> <unitsJsonPath>
```

The JSON input is a non-empty array of exact-shape `{ namespace, key, english, ru, uz, context }`
objects. The command accepts only an exact `FE-NNN` task ID; all text is non-empty and trimmed,
contexts must name a `src/` consumer, and placeholders are rejected. It validates the current
corpus, rejects duplicate keys, generated-shape collisions, and lexical/normalized/hard-link target
aliases, assigns the next stable `MLUX-C####` and `MLUX-O####` IDs, then validates and renders the
complete next corpus before one paired atomic commit. Exact replays return `reused` IDs without a
write; non-exact collisions fail closed. New RU and UZ candidates are always `draft` with null
review, verdict, request, approval, and authority metadata.

## Export a standard CSV pack

```powershell
npm run localization:review:export -- <registryPath> <outputCsvPath> <taskId> [ru,uz] [unitIdsJsonPath]
```

`unitIdsJsonPath`, when supplied, must name a non-empty JSON array of non-empty stable corpus ID
strings. Invalid shapes fail with `unitIds must be a non-empty list of stable IDs`. Rows are sorted
by ID and locale. The fixed columns bind the task, ID, locale, source revision, contexts,
placeholders, plurals, candidate, status, request time, verdict, replacement, reviewer identity,
native-review attestation, and review time. Exporting the same corpus and arguments produces the
same bytes. Registry and output must be distinct files; lexical, normalized, case-insensitive
Windows, symbolic-link, and hard-link aliases are rejected before any write.

Reviewers may leave a row undecided or enter exactly one verdict:

- `approve`: allowed only from `review_requested`; a trimmed replacement is applied, otherwise the
  current candidate is approved unchanged.
- `request_changes`: allowed only from `review_requested`; a non-empty trimmed replacement is
  retained with the native-review identity/time evidence while the unchanged candidate becomes
  `changes_requested`. A later authorized drafting transition may apply a corrected candidate.
- `withdraw`: allowed only from `review_requested`; all review fields and replacement stay empty,
  and one first-class withdrawal transition returns the candidate to `draft` without approval or a
  fabricated change request.

Ordinary approvals and change requests require a trimmed reviewer ID/name, exact
`native-review` attestation, and a UTC RFC3339 millisecond `reviewedAt` after the exported
`requestedAt` and no later than the import time.
Every locale candidate accepts only the properties owned by the public `LocaleCandidate` contract;
event-owned approval, change-request, withdrawal, reviewer, authority, and evidence properties are
rejected before transition or normalization. Every non-approved candidate must also carry no
approval or reviewer authority metadata; approve, request-changes, and withdrawal reject an invalid
source candidate before any metadata can be cleared. Protected-source revisions apply the same rule
and validate the complete current lifecycle before stale or metadata normalization. Retained history
accepts only the exact outer keys owned by each source-revision or transition variant; ordinary and
supplied-artifact approval records and their authority objects are exact-shape validated. Retained
change-request replacements remain placeholder-validated against the historical candidate bound to
their source revision, including after a later draft or protected-source change.

## Import a reviewed pack

```powershell
npm run localization:review:import -- csv <packPath> <registryPath> <generatedOutputPath> <importedAt> <taskId>
```

The importer validates the fixed header and every row before live mutation. It rejects malformed
or extra/missing columns, unknown or retired IDs, conflicting duplicates, illegal transitions,
identity/revision/context/value/placeholder/plural drift, and invalid identity or time evidence.
Byte-identical duplicate cells collapse deterministically. It deep-clones the corpus, delegates
transitions and validation to the corpus engine, renders generated resources, stages both target
files, and rolls the registry back if the generated-output rename fails.

The one accepted historical artifact uses a separate hash-bound command:

```powershell
npm run localization:review:import -- supplied-artifact <learnhub-multilingual-review-readable.md> <registryPath> <generatedOutputPath> <approvalRecordedAt>
```

The file is hashed before Markdown parsing and must be exactly
`ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C`. Only the 247 rows that
still match the authorized ordered ID/source-revision identity plus current source, context, and
drafts are admitted. Any protected source-revision, placeholder, plural, or rendering drift
conservatively makes all historical rows stale and performs no write. The baseline 99 stale rows
and 177 current units absent from the artifact stay non-approved. This authority records a
null reviewer and review time plus the importer-only approval time; it cannot be used through the
ordinary CSV path or reused later.

The repository fixture for this artifact is immutable authenticated data, not format-owned prose.
It is intentionally excluded by its exact path in `.prettierignore`; do not reformat, reflow, or
normalize its bytes. A changed hash is an invalid artifact and must not be accommodated by rebinding
the runtime authority.

## Report status without mutation

```powershell
npm run localization:review:report -- <registryPath> [suppliedArtifactPath]
```

The deterministic report exposes only `approved-effective`, `unchanged-approved`,
`stale-source`, `unreviewed`, `malformed`, and `rejected`. It separately reports current-task
required review and inherited pending debt. Counts are localization-unit counts; per-locale
replacement totals remain in the exact artifact admission summary and tests. Validation issues that
cannot be assigned to one active unit are exposed separately in `globalViolations` and never inflate
the six exclusive unit states. Supplying the historical artifact performs the exact
hash/current-corpus classification without writing either target.
