export const REPORT_SCHEMA_VERSION: number;
export const REPORT_CLOCK_SKEW_TOLERANCE_MINUTES: number;
export const REQUIRED_QUALITY_COMMAND_IDS: readonly string[];
export const DIAGNOSTIC_SUMMARY_KEYS: readonly string[];
export const FAILED_COMMAND_OUTPUT_MAX_CHARS: number;
export const FAILED_COMMAND_OUTPUT_MAX_LINES: number;
export interface CommandFailureExcerpt {
  id: string;
  status: 'pass' | 'fail';
  exitCode: number | null;
  errorCode: string | null;
  stdout?: string;
  stderr?: string;
  hasUnexpectedDiagnostics?: boolean;
}
export function classifyCommandDiagnostics(
  stdout?: string,
  stderr?: string,
): {
  allowedRouterFutureWarnings: number;
  unexpectedReactActWarnings: number;
  unexpectedUnhandledRejections: number;
  unexpectedConsoleWarnings: number;
  unexpectedGenericWarnings: number;
};
export function unexpectedDiagnosticCount(diagnostics: unknown): number;
export interface CommandProcessResult {
  error?: Error & { code?: string };
  signal?: string | null;
}
export function commandFailureCode(
  result: CommandProcessResult,
  hasUnexpectedDiagnostics: boolean,
): string | null;
export function formatCommandFailureExcerpt(command: CommandFailureExcerpt): string | null;
export function npmVersionFromUserAgent(userAgent?: string): string;
export interface CapturedCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error & { code?: string };
  signal: string | null;
}
export function runCapturedCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; maxBuffer?: number },
): CapturedCommandResult;
export function reportDigest(report: object): string;
export function createLocalPatchAttestation(
  report: object,
  key: string | Buffer,
): { algorithm: 'hmac-sha256'; digest: string };
export function validateReport(report: unknown): string[];
export function targetForCommit(sha: string): { kind: 'commit'; sha: string };
export function targetForPatch(
  path: string,
  targetRoot?: string,
  baseRoot?: string,
): Promise<{ kind: 'local_patch'; patchSha256: string; changedPaths: string[] }>;
export function verifyReportTarget(report: unknown, target: unknown): string[];
export function validateReportAdmission(report: unknown, options: unknown): string[];
export function validateSchemaDefinition(schema: unknown): string[];
