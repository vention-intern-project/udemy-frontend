import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCiGroupResultEnvelope } from '../../scripts/quality/ci-command-results.mjs';
import type {
  CiGroupResultEnvelopeInput,
  CiRunIdentity,
} from '../../scripts/quality/ci-command-results.mjs';
import type {
  CiGroupId,
  QualityCommand,
  QualityCommandId,
  ToolVersions,
} from '../../scripts/quality/report-utils.mjs';
import { QUALITY_COMMAND_GROUPS } from '../../scripts/quality/report-utils.mjs';

const ciRun: CiRunIdentity = { runId: '1', runAttempt: '1' };
const toolVersions: ToolVersions = {
  node: 'v20.19.1',
  npm: '10.8.2',
  typescript: '5.8.3',
  prettier: '3.6.2',
  stylelint: '16.24.0',
  eslint: '9.35.0',
};
const commandId: QualityCommandId = 'tests';
const command: QualityCommand = {
  id: commandId,
  status: 'pass',
  durationMs: 1,
  exitCode: 0,
  errorCode: null,
  diagnostics: {
    allowedRouterFutureWarnings: 0,
    unexpectedReactActWarnings: 0,
    unexpectedUnhandledRejections: 0,
    unexpectedConsoleWarnings: 0,
    unexpectedGenericWarnings: 0,
  },
};
const actualCommandId: QualityCommandId = command.id;
const actualGroupMembers: readonly QualityCommandId[] = QUALITY_COMMAND_GROUPS.tests;
type ActualGroupMember = (typeof QUALITY_COMMAND_GROUPS)[CiGroupId][number];
const input: CiGroupResultEnvelopeInput = {
  group: 'tests',
  sha: 'a'.repeat(40),
  ciRun,
  commands: [command],
  toolVersions,
};

describe('CI command declaration contracts', () => {
  it('permits the runtime-generated timestamp while keeping output and IDs exact', () => {
    const result = createCiGroupResultEnvelope(input);
    const generatedAt: string = result.generatedAt;

    expect(generatedAt).toMatch(/Z$/);
    expect(result.commands[0]?.id).toBe(commandId);
    expect(actualCommandId).toBe(commandId);
    expect(actualGroupMembers).toContain(commandId);
  });

  it('has an isolated compiler regression that rejects widened public command declarations', async () => {
    const fixtureDirectory = await mkdtemp(resolve(tmpdir(), 'quality-command-declarations-'));
    try {
      const declaration = await readFile(resolve('scripts/quality/report-utils.d.mts'), 'utf8');
      const declarationPath = resolve(fixtureDirectory, 'report-utils.d.mts');
      const tsconfigPath = resolve(fixtureDirectory, 'tsconfig.json');
      await writeFile(declarationPath, declaration, 'utf8');
      await writeFile(resolve(fixtureDirectory, 'report-utils.mjs'), '', 'utf8');
      await writeFile(
        resolve(fixtureDirectory, 'contract.ts'),
        `import { QUALITY_COMMAND_GROUPS } from './report-utils.mjs';
import type { CiGroupId, QualityCommand, QualityCommandId } from './report-utils.mjs';

declare const command: QualityCommand;
const commandId: QualityCommandId = command.id;
const groupMembers: readonly QualityCommandId[] = QUALITY_COMMAND_GROUPS.tests;
type ActualGroupMember = (typeof QUALITY_COMMAND_GROUPS)[CiGroupId][number];
// @ts-expect-error Actual group members must reject non-command IDs.
const invalidGroupMember: ActualGroupMember = 'unknown';
// @ts-expect-error Actual command IDs must reject non-command IDs.
const invalidCommand: QualityCommand = { ...command, id: 'unknown' };
void commandId;
void groupMembers;
void invalidGroupMember;
void invalidCommand;
`,
        'utf8',
      );
      await writeFile(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            module: 'ESNext',
            moduleResolution: 'bundler',
            composite: true,
            declaration: true,
            noEmitOnError: true,
            skipLibCheck: true,
            strict: true,
          },
          files: ['contract.ts'],
        }),
        'utf8',
      );

      const compileArguments = [
        resolve('node_modules/typescript/bin/tsc'),
        '--build',
        '--force',
        tsconfigPath,
      ];
      const currentCompile = spawnSync(process.execPath, compileArguments, {
        encoding: 'utf8',
        shell: false,
      });
      expect(currentCompile.status, `${currentCompile.stdout}\n${currentCompile.stderr}`).toBe(0);

      const widenedDeclaration = declaration
        .replace('id: QualityCommandId;', 'id: string;')
        .replace('readonly QualityCommandId[]', 'readonly string[]');
      expect(widenedDeclaration).not.toBe(declaration);
      await writeFile(declarationPath, widenedDeclaration, 'utf8');
      const widenedCompile = spawnSync(process.execPath, compileArguments, {
        encoding: 'utf8',
        shell: false,
      });
      const diagnostics = `${widenedCompile.stdout}\n${widenedCompile.stderr}`;
      expect(widenedCompile.status, diagnostics).toBe(1);
      expect(diagnostics.match(/TS2322/g)).toHaveLength(2);
      expect(diagnostics.match(/TS2578/g)).toHaveLength(2);
    } finally {
      await rm(fixtureDirectory, { force: true, recursive: true });
    }
  });
});

// @ts-expect-error Quality command identifiers must remain within the canonical command domain.
const invalidCommandId: QualityCommandId = 'unknown';
// @ts-expect-error QualityCommand.id must remain within the canonical command domain.
const invalidQualityCommand: QualityCommand = { ...command, id: 'unknown' };
// @ts-expect-error Actual QUALITY_COMMAND_GROUPS members must remain within the canonical command domain.
const invalidActualGroupMember: ActualGroupMember = 'unknown';
void invalidCommandId;
void invalidQualityCommand;
void invalidActualGroupMember;
