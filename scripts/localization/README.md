# Localization review exchange

These public Node commands read only explicit paths and never load local-only orchestration files. The canonical
registry remains the sole corpus source of truth; generated resources are always rendered by the
corpus engine and committed together with the registry only after full-pack preflight succeeds.

## Export a standard CSV pack

```powershell
npm run localization:review:export -- <registryPath> <outputCsvPath> <taskId> [ru,uz] [unitIdsJsonPath]
```

`unitIdsJsonPath`, when supplied, must name a JSON array of stable corpus IDs. Rows are sorted by
ID and locale. The fixed columns bind the task, ID, locale, source revision, contexts,
placeholders, plurals, candidate, status, request time, verdict, replacement, reviewer identity,
native-review attestation, and review time. Exporting the same corpus and arguments produces the
same bytes. Registry and output must be distinct files; lexical, normalized, case-insensitive
Windows, symbolic-link, and hard-link aliases are rejected before any write.

Reviewers may leave a row undecided or enter exactly one verdict:

- `approve`: allowed only from `review_requested`; a trimmed replacement is applied, otherwise the
  current candidate is approved unchanged.
- `request_changes`: allowed only from `review_requested`; a non-empty trimmed replacement is
  required as review evidence and the candidate becomes `changes_requested`.
- `withdraw`: allowed only from `review_requested`; all review fields and replacement stay empty,
  and the candidate returns to `draft` without approval.

Ordinary approvals and change requests require a trimmed reviewer ID/name, exact
`native-review` attestation, and a UTC RFC3339 millisecond `reviewedAt` after the exported
`requestedAt` and no later than the import time.

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
