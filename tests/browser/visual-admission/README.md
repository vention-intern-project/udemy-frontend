# FE-058 visual admission

From a clean clone with the repository dependencies already installed, run the full admission family:

```powershell
npm run test:visual-admission
```

The default run executes all 1,032 behavioral cells (EN/RU/UZ, declared states, widths, zoom, interaction, diagnostics, and identities). It stores 258 canonical cell PNGs: 320, 768, and 1280 CSS-pixel widths at 100%, plus the required M01 outcome PNG. Other cells contain explicit no-screenshot provenance.

Use `--full-screenshots` only when every cell PNG is required:

```powershell
npm run test:visual-admission -- --full-screenshots
```

List exact canonical cell names or run one exact named cell (which always emits its PNG):

```powershell
npm run test:visual-admission -- --list
npm run test:visual-admission -- --screenshot M02--anonymous-catalog--ru--895--100
```

Optionally supply a unique `--run-id <id>`; an existing RunId is refused. Outputs are RunId-local under `test-results/visual-admission/<run-id>/`; successful full runs publish `fe058-admission.json` and `close-or-route.md` there. The runner uses one worker and zero retries, runs every shard once, collects all shard failures, prints a deterministic summary, exits nonzero, and does not aggregate when any shard fails.
