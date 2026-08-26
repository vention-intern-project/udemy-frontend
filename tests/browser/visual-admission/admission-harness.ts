import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

import { expect, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';

export const admissionWidths = [320, 390, 617, 767, 768, 895, 1100, 1280, 1440] as const;
export const admissionLocales = ['en', 'ru', 'uz'] as const;
export const admissionZoomWidths = [320, 768, 1280] as const;
export const canonicalScreenshotWidths = [320, 768, 1280] as const;
export type AdmissionLocale = (typeof admissionLocales)[number];
export type AdmissionWidth = (typeof admissionWidths)[number];
export type AdmissionScreenshotMode = 'canonical' | 'full';
export interface AdmissionCapturedScreenshotEvidence {
  readonly kind: 'captured';
  readonly path: string;
  readonly sha256: string;
}
export interface AdmissionNotCapturedScreenshotEvidence {
  readonly kind: 'not_captured';
  readonly provenance: 'default-canonical-subset';
}
export type AdmissionScreenshotEvidence = AdmissionCapturedScreenshotEvidence | AdmissionNotCapturedScreenshotEvidence;
const selectedAdmissionCell = process.env.VISUAL_ADMISSION_SCREENSHOT;
const screenshotMode: AdmissionScreenshotMode = process.env.VISUAL_ADMISSION_SCREENSHOT_MODE === 'full' ? 'full' : 'canonical';
const selectedLocale = selectedAdmissionCell?.split('--')[2];
export const selectedAdmissionLocales: readonly AdmissionLocale[] =
  selectedLocale && admissionLocales.includes(selectedLocale as AdmissionLocale) ? [selectedLocale as AdmissionLocale] : admissionLocales;

interface RawLocaleObservation {
  readonly documentLocale: string;
  readonly storedLocale: string | null;
}

export interface ObservedLocaleConvergence {
  readonly documentLocale: AdmissionLocale | undefined;
  readonly storageLocale: AdmissionLocale | undefined;
  readonly storagePresent: boolean;
}

export interface StrictLocaleConvergence {
  readonly documentLocale: AdmissionLocale;
  readonly storageLocale: AdmissionLocale;
  readonly storagePresent: true;
}

export interface InitialLocaleBootstrapProvenance {
  readonly kind: 'initial-default-en-missing-storage';
  readonly observedDocumentLocale: 'en';
  readonly observedStorage: 'missing';
}

function parseAdmissionLocale(value: string | null): AdmissionLocale | undefined {
  return typeof value === 'string' && admissionLocales.includes(value as AdmissionLocale)
    ? value as AdmissionLocale
    : undefined;
}

export function observeLocaleConvergence(locale: RawLocaleObservation): ObservedLocaleConvergence {
  return {
    documentLocale: parseAdmissionLocale(locale.documentLocale),
    storageLocale: parseAdmissionLocale(locale.storedLocale),
    storagePresent: locale.storedLocale !== null,
  };
}

export interface AdmissionContext {
  readonly matrix: string;
  readonly scenario: string;
  readonly route: string;
  readonly state: string;
  readonly session: 'anonymous' | 'authenticated';
  readonly disposition: 'observed' | 'product-failure' | 'harness-failure';
}

export type AdmissionInteractionStatus = 'pass' | 'fail' | 'not_applicable';

export interface AdmissionInteractionCheck {
  readonly status: AdmissionInteractionStatus;
  readonly reason?: string;
}

export interface AdmissionInteractionEvidence {
  readonly mode: 'focus_transition' | 'modal_focus_containment';
  readonly target: string;
  readonly focus: AdmissionInteractionCheck;
  readonly keyboard: AdmissionInteractionCheck;
  readonly minTarget44: AdmissionInteractionCheck;
  readonly modal?: {
    readonly initialDialogFocus: boolean;
    readonly tabFocusWithinDialog: boolean;
    readonly noBackgroundFocus: boolean;
    readonly enabledDialogActions: number;
  };
}

export interface AdmissionNavigationTeardown {
  /** Monotonic per-page identity assigned when Playwright observes the request. */
  readonly requestId: number;
  readonly method: 'GET';
  readonly path: string;
  readonly error: 'net::ERR_ABORTED';
  readonly boundary: AdmissionNavigationBoundaryProvenance;
  readonly preNavigationRequest: true;
}


export interface AdmissionNavigationBoundaryProvenance {
  readonly epoch: number;
  readonly phase: 'pre_document_commit';
  readonly cause: 'capture-route-navigation' | 'locale-reload';
  readonly sourceLocale: AdmissionLocale;
  readonly targetLocale: AdmissionLocale;
  readonly matrix: 'M01';
  readonly scenario: 'completion-ready';
  readonly route: '/learning/enrollments/4';
  readonly bootstrap?: InitialLocaleBootstrapProvenance;
}

interface PendingAdmissionRequest {
  readonly requestId: number;
  readonly method: string;
  readonly path: string;
  readonly captureWindow: AdmissionCaptureWindow;
}

export type AdmissionRequestCause = 'initial-navigation' | 'locale-reload' | 'capture-route-navigation';
export type AdmissionRequestPhase = 'pre_document_commit' | 'post_document_commit';

export interface AdmissionCaptureWindow {
  readonly captureWindowId: number;
  readonly navigationEpoch: number;
  readonly context: AdmissionContext;
  readonly sourceLocale: AdmissionLocale;
  readonly targetLocale: AdmissionLocale;
  readonly cause: AdmissionRequestCause;
  phase: AdmissionRequestPhase;
}

export interface AdmissionRequestLifecycle {
  readonly requestId: number;
  readonly sequence: number;
  readonly method: string;
  readonly path: string;
  readonly captureWindowId: number;
  readonly navigationEpoch: number;
  readonly context: AdmissionContext;
  readonly sourceLocale: AdmissionLocale;
  readonly targetLocale: AdmissionLocale;
  readonly cause: AdmissionRequestCause;
  readonly phase: AdmissionRequestPhase;
  readonly outcome: 'response' | 'failure';
  readonly status?: number;
  readonly error?: string;
}

export interface AdmissionSupersededReadLifecycle {
  readonly failedRequestId: number;
  readonly replacementRequestId: number;
  readonly failedSequence: number;
  readonly replacementSequence: number;
  readonly method: 'GET';
  readonly path: string;
  readonly captureWindowId: number;
  readonly navigationEpoch: number;
  readonly context: AdmissionContext;
  readonly sourceLocale: AdmissionLocale;
  readonly targetLocale: AdmissionLocale;
  readonly cause: AdmissionRequestCause;
  readonly phase: AdmissionRequestPhase;
  readonly replacementStatus: number;
  readonly targetRendered: true;
}

export interface AdmissionPendingRequestDeclaration {
  readonly method: string;
  readonly path: string;
}

export interface AdmissionDeclaredPendingRequest {
  readonly requestId: number;
  readonly method: string;
  readonly path: string;
  readonly captureWindowId: number;
  readonly navigationEpoch: number;
  readonly context: AdmissionContext;
  readonly sourceLocale: AdmissionLocale;
  readonly targetLocale: AdmissionLocale;
  readonly cause: AdmissionRequestCause;
  readonly phase: AdmissionRequestPhase;
  readonly outcome: 'declared_pending';
}

interface ActiveDeclaredPendingRequest {
  readonly declaration: AdmissionPendingRequestDeclaration;
  readonly captureWindow: AdmissionCaptureWindow;
  request: PendingAdmissionRequest | undefined;
  requestObject: Request | undefined;
  closed: boolean;
}

interface AdmissionNavigationBoundary {
  readonly epoch: number;
  readonly phase: 'pre_document_commit';
  readonly cause: AdmissionNavigationBoundaryProvenance['cause'];
  readonly sourceLocale: AdmissionLocale;
  readonly allowedPaths: ReadonlySet<string>;
  readonly bootstrap?: InitialLocaleBootstrapProvenance;
}


export interface LocaleReloadSource {
  readonly sourceLocale: AdmissionLocale;
  readonly bootstrap?: InitialLocaleBootstrapProvenance;
}

const catalogHeroAssetPath = '/src/pages/catalog-page/assets/catalog-hero-ui025.png';
export interface CatalogHeroLifecycleEvent {
  readonly requestId: number; readonly sequence: number; readonly method: 'GET'; readonly path: typeof catalogHeroAssetPath; readonly resourceType: 'image'; readonly kind: 'aborted' | 'replacement'; readonly status?: number; readonly error?: 'net::ERR_ABORTED'; readonly replacesRequestId?: number; readonly catalogHeroRendered?: true;
  readonly boundary: { readonly epoch: number; readonly cause: 'locale-reload' | 'capture-route-navigation'; readonly phase: 'pre_document_commit' | 'post_document_commit'; readonly documentCommitted: boolean; readonly sourceLocale: AdmissionLocale; readonly targetLocale: AdmissionLocale; readonly matrix: 'M03'; readonly scenario: 'hero-price-sort'; readonly route: '/'; };
}
interface CatalogHeroBoundary { readonly epoch: number; readonly cause: 'locale-reload' | 'capture-route-navigation'; readonly sourceLocale: AdmissionLocale; readonly targetLocale: AdmissionLocale; phase: 'pre_document_commit' | 'post_document_commit'; documentCommitted: boolean; }

/**
 * A candidate exists only from `prepareForNavigation()` until the next
 * main-frame document commit.  A later failure is an ordinary diagnostic.
 */
export class NavigationTeardownEpochTracker {
  private epoch = 0;
  private activeBoundary: AdmissionNavigationBoundary | undefined;
  private readonly candidates = new Map<Request, AdmissionNavigationBoundary>();

  begin(cause: AdmissionNavigationBoundaryProvenance['cause'], source: LocaleReloadSource, allowedPaths: readonly string[]) {
    // A new explicit navigation supersedes every uncommitted predecessor.
    // Clearing rather than transferring candidates prevents cross-navigation
    // or cross-locale attribution when a caller starts a new boundary early.
    this.candidates.clear();
    const boundary: AdmissionNavigationBoundary = {
      epoch: this.epoch + 1,
      phase: 'pre_document_commit',
      cause,
      sourceLocale: source.sourceLocale,
      allowedPaths: new Set(allowedPaths),
      bootstrap: source.bootstrap,
    };
    this.epoch = boundary.epoch;
    this.activeBoundary = boundary;
    return boundary;
  }

  addExisting(request: Request) {
    if (this.activeBoundary) this.candidates.set(request, this.activeBoundary);
  }

  addNew(request: Request) {
    if (this.activeBoundary) this.candidates.set(request, this.activeBoundary);
  }

  take(request: Request) {
    const candidate = this.candidates.get(request);
    this.candidates.delete(request);
    return candidate;
  }

  discard(request: Request) {
    this.candidates.delete(request);
  }

  commitMainFrameDocument() {
    const boundary = this.activeBoundary;
    if (!boundary) return;
    for (const [request, candidate] of this.candidates)
      if (candidate.epoch === boundary.epoch) this.candidates.delete(request);
    this.activeBoundary = undefined;
  }

  dispose() {
    this.candidates.clear();
    this.activeBoundary = undefined;
  }

  currentEpoch() { return this.epoch; }
}

export interface RoutedProductObservation {
  readonly matrix: 'M01';
  readonly scenario: 'completion-ready';
  readonly fingerprint: 'm01-keyboard-undo-no-transition';
  readonly routedTo: 'FE-059';
  readonly decisionIds: readonly ['FE058-D05-KEYBOARD-UNDO-ROUTE-TO-FE059', 'FE059-D01-KEYBOARD-UNDO-SCOPE-EXPANSION'];
  readonly source: 'dedicated-m01-routed-repro';
  readonly attempt: number;
  readonly completionTrigger: 'pointer';
}

interface ExecutableIdentityRegistryDocument {
  readonly schema: 'fe058-admission/executable-identity-registry-v1';
  readonly paths: readonly string[];
}

export interface AdmissionExecutableIdentity {
  readonly path: string;
  readonly sha256: string;
}

const executableIdentityRegistryPath = 'tests/browser/visual-admission/executable-identity-registry.json';
const publicCommandManifestPath = 'package.json';
const publicCommandName = 'test:visual-admission';
const publicCommandValue = 'node scripts/quality/visual-admission.mjs';
const supportedExecutableIdentityExtensions = new Set(['.json', '.mjs', '.ps1', '.ts']);

function hash(value: Buffer | string) { return createHash('sha256').update(value).digest('hex'); }
async function fileHash(path: string) { return hash(await readFile(path)); }
function validateExecutableIdentityPath(repositoryRoot: string, path: string) {
  if (!path || isAbsolute(path) || path.includes('\\') || normalize(path).split('\\').join('/') !== path || !supportedExecutableIdentityExtensions.has(extname(path)))
    throw new Error(`Unsupported or non-canonical executable identity path: ${path || '(empty)'}`);
  const resolvedPath = resolve(repositoryRoot, path);
  const repositoryRelative = relative(repositoryRoot, resolvedPath);
  if (!repositoryRelative || repositoryRelative === '..' || repositoryRelative.startsWith(`..${sep}`) || isAbsolute(repositoryRelative))
    throw new Error(`Executable identity path escapes the repository: ${path}`);
}

function parseExecutableIdentityRegistry(value: unknown): ExecutableIdentityRegistryDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Malformed executable identity registry document.');
  const document = value as Partial<ExecutableIdentityRegistryDocument>;
  if (document.schema !== 'fe058-admission/executable-identity-registry-v1' || !Array.isArray(document.paths) || document.paths.some((path) => typeof path !== 'string'))
    throw new Error('Malformed executable identity registry schema or paths.');
  return document as ExecutableIdentityRegistryDocument;
}

function assertPublicCommandBinding(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Malformed public command manifest.');
  const scripts = (value as { readonly scripts?: unknown }).scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) throw new Error('Malformed public command manifest scripts.');
  if ((scripts as Record<string, unknown>)[publicCommandName] !== publicCommandValue)
    throw new Error(`Public command mapping must be ${publicCommandName}=${publicCommandValue}.`);
}

async function readExecutableIdentities(repositoryRoot: string): Promise<readonly AdmissionExecutableIdentity[]> {
  const registry = parseExecutableIdentityRegistry(JSON.parse(await readFile(join(repositoryRoot, executableIdentityRegistryPath), 'utf8')) as unknown);
  if (registry.paths.length !== 33) throw new Error(`Executable identity registry must contain exactly 33 paths, found ${registry.paths.length}.`);
  const seen = new Set<string>();
  for (const path of registry.paths) {
    validateExecutableIdentityPath(repositoryRoot, path);
    if (seen.has(path)) throw new Error(`Duplicate executable identity registry path: ${path}`);
    seen.add(path);
  }
  if (!seen.has(executableIdentityRegistryPath)) throw new Error('Executable identity registry must bind its own path.');
  if (!seen.has(publicCommandManifestPath)) throw new Error('Executable identity registry must bind the public command manifest.');
  assertPublicCommandBinding(JSON.parse(await readFile(join(repositoryRoot, publicCommandManifestPath), 'utf8')) as unknown);
  return Promise.all(registry.paths.map(async (path) => ({ path, sha256: await fileHash(join(repositoryRoot, path)) })));
}

function segment(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, '_'); }
function sameAdmissionContext(left: AdmissionContext, right: AdmissionContext) {
  return left.matrix === right.matrix && left.scenario === right.scenario && left.route === right.route && left.state === right.state && left.session === right.session && left.disposition === right.disposition;
}

export class AdmissionRecorder {
  private readonly seen = new Set<string>();
  private readonly consoleErrors: string[] = [];
  private readonly pageErrors: string[] = [];
  private readonly requestFailures = new Map<number, string[]>();
  private readonly requestLifecycles: AdmissionRequestLifecycle[] = [];
  private readonly catalogHeroLifecycles: CatalogHeroLifecycleEvent[] = [];
  private readonly navigationTeardowns: AdmissionNavigationTeardown[] = [];
  private readonly httpErrors: string[] = [];
  private readonly httpSuccesses: string[] = [];
  private readonly writes: string[] = [];
  private nextRequestId = 1;
  private nextCaptureWindowId = 1;
  private navigationEpoch = 0;
  private activeCaptureWindow: AdmissionCaptureWindow | undefined;
  private readonly identities: Promise<readonly AdmissionExecutableIdentity[]>;
  private readonly pendingRequests = new Map<Request, PendingAdmissionRequest>();
  private readonly declaredPendingRequests = new Map<number, ActiveDeclaredPendingRequest>();
  private readonly navigationEpochs = new NavigationTeardownEpochTracker();
  private catalogHeroBoundary: CatalogHeroBoundary | undefined;
  private catalogHeroEpoch = 0;
  private lifecycleSequence = 1;
  private interactionTarget: Locator | undefined;
  private readonly onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error') this.consoleErrors.push(message.text());
  };
  private readonly onPageError = (error: Error) => this.pageErrors.push(error.message);
  private readonly onRequest = (request: Request) => {
    const url = new URL(request.url());
    const captureWindow = this.activeCaptureWindow;
    if (!captureWindow) throw new Error(`Request observed without an active capture window: ${request.method()} ${url.pathname}`);
    const pending = { requestId: this.nextRequestId++, method: request.method(), path: url.pathname, captureWindow };
    const declaration = this.declaredPendingRequests.get(captureWindow.captureWindowId);
    if (declaration) {
      if (declaration.request || declaration.declaration.method !== pending.method || declaration.declaration.path !== pending.path)
        throw new Error(`Declared pending request does not uniquely match the started request: ${pending.method} ${pending.path}`);
      declaration.request = pending;
      declaration.requestObject = request;
    }
    this.pendingRequests.set(request, pending);
    this.navigationEpochs.addNew(request);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) this.writes.push(`${request.method()} ${url.pathname}`);
  };
  private readonly onFrameNavigated = (frame: ReturnType<Page['mainFrame']>) => {
    if (frame === this.page.mainFrame()) {
      if (this.activeCaptureWindow) this.activeCaptureWindow.phase = 'post_document_commit';
      this.navigationEpochs.commitMainFrameDocument();
      if (this.catalogHeroBoundary) { this.catalogHeroBoundary.phase = 'post_document_commit'; this.catalogHeroBoundary.documentCommitted = true; }
    }
  };
  private readonly onRequestFinished = (request: Request) => {
    const pending = this.terminalPendingRequest(request);
    if (pending && !this.requestLifecycles.some((lifecycle) => lifecycle.requestId === pending.requestId)) this.recordRequestLifecycle(pending, 'response');
    this.pendingRequests.delete(request);
    this.navigationEpochs.discard(request);
  };
  private readonly onRequestFailed = (request: Request) => {
    const pending = this.terminalPendingRequest(request);
    const candidate = this.navigationEpochs.take(request);
    const error = request.failure()?.errorText ?? 'unknown';
    this.pendingRequests.delete(request);
    const priorTerminal = pending && this.requestLifecycles.find((lifecycle) => lifecycle.requestId === pending.requestId);
    if (priorTerminal?.outcome === 'response') return;
    if (pending) this.recordRequestLifecycle(pending, 'failure', { error });
    // Navigation teardown is the legacy M01-specific proof. Other matrices
    // retain their failed lifecycle in-window, where generic D08 matching
    // requires one later exact 2xx replacement instead of suppressing it.
    if (pending && candidate && pending.captureWindow.context.matrix === 'M01' && pending.captureWindow.context.scenario === 'completion-ready' && pending.captureWindow.context.route === '/learning/enrollments/4' && pending.method === 'GET' && candidate.allowedPaths.has(pending.path) && error === 'net::ERR_ABORTED') {
      this.navigationTeardowns.push({ requestId: pending.requestId, method: 'GET', path: pending.path, error: 'net::ERR_ABORTED', boundary: { epoch: candidate.epoch, phase: candidate.phase, cause: candidate.cause, sourceLocale: candidate.sourceLocale, targetLocale: candidate.sourceLocale, matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', ...(candidate.bootstrap ? { bootstrap: candidate.bootstrap } : {}) }, preNavigationRequest: true });
      return;
    }
    if (pending && this.catalogHeroBoundary && pending.method === 'GET' && pending.path === catalogHeroAssetPath && request.resourceType() === 'image' && error === 'net::ERR_ABORTED' && this.catalogHeroBoundary.phase === 'pre_document_commit') {
      const boundary = this.catalogHeroBoundary;
      this.catalogHeroLifecycles.push({ requestId: pending.requestId, sequence: this.lifecycleSequence++, method: 'GET', path: catalogHeroAssetPath, resourceType: 'image', kind: 'aborted', error: 'net::ERR_ABORTED', boundary: { epoch: boundary.epoch, cause: boundary.cause, phase: boundary.phase, documentCommitted: boundary.documentCommitted, sourceLocale: boundary.sourceLocale, targetLocale: boundary.targetLocale, matrix: 'M03', scenario: 'hero-price-sort', route: '/' } });
      return;
    }
    if (!pending) throw new Error(`Failed request lost its lifecycle identity: ${request.method()} ${new URL(request.url()).pathname}`);
    const failures = this.requestFailures.get(pending.captureWindow.captureWindowId) ?? [];
    failures.push(`${request.method()} ${new URL(request.url()).pathname} ${error}`);
    this.requestFailures.set(pending.captureWindow.captureWindowId, failures);
  };
  private readonly onResponse = (response: { request(): Request; url(): string; status(): number }) => {
    const pending = this.terminalPendingRequest(response.request());
    const identity = `${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`;
    if (response.status() >= 400) this.httpErrors.push(identity);
    else if (response.status() >= 200 && response.status() < 300) this.httpSuccesses.push(identity);
    if (pending) this.recordRequestLifecycle(pending, 'response', { status: response.status() });
    const boundary = this.catalogHeroBoundary;
    if (pending && boundary && pending.method === 'GET' && pending.path === catalogHeroAssetPath && response.request().resourceType() === 'image' && response.status() >= 200 && response.status() < 300 && boundary.phase === 'post_document_commit') {
      const aborted = [...this.catalogHeroLifecycles].reverse().find((event) => event.kind === 'aborted' && event.boundary.epoch === boundary.epoch);
      if (aborted) this.catalogHeroLifecycles.push({ requestId: pending.requestId, sequence: this.lifecycleSequence++, method: 'GET', path: catalogHeroAssetPath, resourceType: 'image', kind: 'replacement', status: response.status(), replacesRequestId: aborted.requestId, boundary: { epoch: boundary.epoch, cause: boundary.cause, phase: boundary.phase, documentCommitted: boundary.documentCommitted, sourceLocale: boundary.sourceLocale, targetLocale: boundary.targetLocale, matrix: 'M03', scenario: 'hero-price-sort', route: '/' } });
    }
  };

  private recordRequestLifecycle(pending: PendingAdmissionRequest, outcome: AdmissionRequestLifecycle['outcome'], terminal: Pick<AdmissionRequestLifecycle, 'status' | 'error'> = {}) {
    const window = pending.captureWindow;
    const prior = this.requestLifecycles.find((lifecycle) => lifecycle.requestId === pending.requestId);
    if (prior) {
      if (prior.outcome === outcome && prior.status === terminal.status && prior.error === terminal.error) return;
      throw new Error(`Request reached conflicting terminal outcomes: ${pending.requestId}`);
    }
    this.requestLifecycles.push({ requestId: pending.requestId, sequence: this.lifecycleSequence++, method: pending.method, path: pending.path, captureWindowId: window.captureWindowId, navigationEpoch: window.navigationEpoch, context: window.context, sourceLocale: window.sourceLocale, targetLocale: window.targetLocale, cause: window.cause, phase: window.phase, outcome, ...terminal });
  }

  /**
   * Once a declared-pending window closes, only the exact Request object that
   * started inside it may finish, fail, or produce a response. A method/path
   * match is deliberately insufficient: every `request` event is a new
   * request and must have its own active capture window.
   */
  private terminalPendingRequest(request: Request) {
    const pending = this.pendingRequests.get(request);
    if (pending || this.activeCaptureWindow) return pending;
    const declaration = [...this.declaredPendingRequests.values()].find((candidate) => candidate.closed && candidate.requestObject === request);
    if (declaration?.request) return declaration.request;
    throw new Error(`Terminal request observed without the exact closed declared-pending identity: ${request.method()} ${new URL(request.url()).pathname}`);
  }

  async beginCaptureWindow(context: AdmissionContext, targetLocale: AdmissionLocale, cause: AdmissionRequestCause = 'initial-navigation') {
    const unresolved = [...this.pendingRequests.values()].filter((request) => request.captureWindow.captureWindowId === this.activeCaptureWindow?.captureWindowId);
    if (unresolved.length) throw new Error(`Cannot replace capture window with unresolved request(s): ${unresolved.map((request) => request.requestId).join(',')}`);
    const sourceLocale = await this.observedLocale().catch(() => targetLocale);
    this.activeCaptureWindow = { captureWindowId: this.nextCaptureWindowId++, navigationEpoch: this.navigationEpoch + 1, context, sourceLocale, targetLocale, cause, phase: 'pre_document_commit' };
    this.navigationEpoch = this.activeCaptureWindow.navigationEpoch;
  }

  declarePendingRequest(context: AdmissionContext, targetLocale: AdmissionLocale, declaration: AdmissionPendingRequestDeclaration) {
    const window = this.activeCaptureWindow;
    if (!window || !sameAdmissionContext(window.context, context) || window.targetLocale !== targetLocale)
      throw new Error(`Cannot declare a pending request outside the exact capture window: ${context.matrix}/${context.scenario}/${context.route}/${targetLocale}`);
    if (!declaration.method || !declaration.path.startsWith('/')) throw new Error('Declared pending request requires a method and absolute path.');
    if (this.declaredPendingRequests.has(window.captureWindowId)) throw new Error(`Capture window already has a declared pending request: ${window.captureWindowId}`);
    if ([...this.pendingRequests.values()].some((request) => request.captureWindow.captureWindowId === window.captureWindowId))
      throw new Error(`Cannot declare a pending request while another request remains open in capture window: ${window.captureWindowId}`);
    this.declaredPendingRequests.set(window.captureWindowId, { declaration, captureWindow: window, request: undefined, requestObject: undefined, closed: false });
  }

  async waitForCaptureWindow(context: AdmissionContext, targetLocale: AdmissionLocale) {
    await this.awaitCaptureWindowSettled(context, targetLocale);
  }

  endCaptureWindow(context: AdmissionContext, targetLocale: AdmissionLocale) {
    const window = this.activeCaptureWindow;
    if (!window || !sameAdmissionContext(window.context, context) || window.targetLocale !== targetLocale)
      throw new Error(`Cannot close a non-current capture window: ${context.matrix}/${context.scenario}/${context.route}/${targetLocale}`);
    const unresolved = [...this.pendingRequests.values()].filter((request) => request.captureWindow.captureWindowId === window.captureWindowId);
    const declaration = this.declaredPendingRequests.get(window.captureWindowId);
    if (declaration) {
      if (!declaration.request || unresolved.length !== 1 || unresolved[0] !== declaration.request)
        throw new Error(`Cannot close capture window without its one declared pending request: ${unresolved.map((request) => request.requestId).join(',')}`);
      declaration.closed = true;
    } else if (unresolved.length) throw new Error(`Cannot close capture window with unresolved request(s): ${unresolved.map((request) => request.requestId).join(',')}`);
    this.activeCaptureWindow = undefined;
  }

  private async awaitCaptureWindowSettled(context: AdmissionContext, targetLocale: AdmissionLocale) {
    const window = this.activeCaptureWindow;
    if (!window || !sameAdmissionContext(window.context, context) || window.targetLocale !== targetLocale)
      throw new Error(`Cannot settle a non-current capture window: ${context.matrix}/${context.scenario}/${context.route}/${targetLocale}`);
    const declaration = this.declaredPendingRequests.get(window.captureWindowId);
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const unresolved = [...this.pendingRequests.values()].filter((request) => request.captureWindow.captureWindowId === window.captureWindowId);
      if (declaration) {
        if (declaration.request && unresolved.length === 1 && unresolved[0] === declaration.request) return;
        if (declaration.request && !unresolved.length) throw new Error(`Declared pending request became terminal before evidence capture: ${declaration.request.requestId}`);
        if (unresolved.length && (!declaration.request || unresolved.some((request) => request !== declaration.request)))
          throw new Error(`Capture window has undeclared or extra pending request(s): ${unresolved.map((request) => request.requestId).join(',')}`);
      } else if (!unresolved.length) return;
      await this.page.waitForTimeout(20);
    }
    const unresolved = [...this.pendingRequests.values()].filter((request) => request.captureWindow.captureWindowId === window.captureWindowId);
    throw new Error(declaration ? `Declared pending request did not start before evidence capture: ${window.captureWindowId}` : `Capture window did not settle before evidence capture: ${unresolved.map((request) => request.requestId).join(',')}`);
  }

  private supersededReadLifecycles(lifecycles: readonly AdmissionRequestLifecycle[]): AdmissionSupersededReadLifecycle[] {
    const replacements = new Set<number>();
    const pairs: AdmissionSupersededReadLifecycle[] = [];
    for (const failed of lifecycles) {
      if (failed.method !== 'GET' || failed.outcome !== 'failure' || failed.error !== 'net::ERR_ABORTED') continue;
      const replacement = lifecycles.find((candidate) =>
        candidate.requestId !== failed.requestId &&
        !replacements.has(candidate.requestId) &&
        candidate.sequence > failed.sequence &&
        candidate.method === failed.method && candidate.path === failed.path &&
        candidate.captureWindowId === failed.captureWindowId &&
        candidate.navigationEpoch === failed.navigationEpoch &&
        sameAdmissionContext(candidate.context, failed.context) &&
        candidate.sourceLocale === failed.sourceLocale && candidate.targetLocale === failed.targetLocale &&
        candidate.cause === failed.cause && candidate.phase === failed.phase &&
        candidate.outcome === 'response' && typeof candidate.status === 'number' && candidate.status >= 200 && candidate.status < 300,
      );
      if (!replacement) continue;
      const replacementStatus = replacement.status;
      if (typeof replacementStatus !== 'number') continue;
      replacements.add(replacement.requestId);
      pairs.push({ failedRequestId: failed.requestId, replacementRequestId: replacement.requestId, failedSequence: failed.sequence, replacementSequence: replacement.sequence, method: 'GET', path: failed.path, captureWindowId: failed.captureWindowId, navigationEpoch: failed.navigationEpoch, context: failed.context, sourceLocale: failed.sourceLocale, targetLocale: failed.targetLocale, cause: failed.cause, phase: failed.phase, replacementStatus, targetRendered: true });
    }
    return pairs;
  }

  private diagnosticsSinceLastCapture(context: AdmissionContext, targetLocale: AdmissionLocale) {
    const window = this.activeCaptureWindow;
    if (!window || !sameAdmissionContext(window.context, context) || window.targetLocale !== targetLocale)
      throw new Error(`Capture context has no exact request-lifecycle window: ${context.matrix}/${context.scenario}/${context.route}/${targetLocale}`);
    const unresolved = [...this.pendingRequests.values()].filter((request) => request.captureWindow.captureWindowId === window.captureWindowId);
    const declaration = this.declaredPendingRequests.get(window.captureWindowId);
    if (declaration && (!declaration.request || unresolved.length !== 1 || unresolved[0] !== declaration.request))
      throw new Error(`Capture window cannot serialize an invalid declared pending request: ${unresolved.map((request) => request.requestId).join(',')}`);
    if (!declaration && unresolved.length) throw new Error(`Capture window has unresolved request(s): ${unresolved.map((request) => request.requestId).join(',')}`);
    if (this.navigationTeardowns.length && (context.matrix !== 'M01' || context.scenario !== 'completion-ready' || context.route !== '/learning/enrollments/4'))
      throw new Error(`Navigation teardown cannot bind to this capture context: ${context.matrix}/${context.scenario}/${context.route}`);
    const navigationTeardowns = this.navigationTeardowns.map((teardown) => ({
      ...teardown,
      boundary: { ...teardown.boundary, targetLocale, matrix: context.matrix, scenario: context.scenario, route: context.route },
    }));
    const requestLifecycles = this.requestLifecycles.filter((lifecycle) => lifecycle.captureWindowId === window.captureWindowId);
    const supersededReadLifecycles = this.supersededReadLifecycles(requestLifecycles);
    const supersededFailureCounts = new Map<string, number>();
    for (const pair of supersededReadLifecycles) {
      const identity = `${pair.method} ${pair.path} net::ERR_ABORTED`;
      supersededFailureCounts.set(identity, (supersededFailureCounts.get(identity) ?? 0) + 1);
    }
    const requestFailures = (this.requestFailures.get(window.captureWindowId) ?? []).filter((failure) => {
      const remaining = supersededFailureCounts.get(failure) ?? 0;
      if (!remaining) return true;
      supersededFailureCounts.set(failure, remaining - 1);
      return false;
    });
    const diagnostics = {
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
      requestFailures,
      requestLifecycles,
      supersededReadLifecycles,
      declaredPendingRequests: declaration ? [{ requestId: declaration.request!.requestId, method: declaration.request!.method, path: declaration.request!.path, captureWindowId: window.captureWindowId, navigationEpoch: window.navigationEpoch, context: window.context, sourceLocale: window.sourceLocale, targetLocale: window.targetLocale, cause: window.cause, phase: window.phase, outcome: 'declared_pending' satisfies AdmissionDeclaredPendingRequest['outcome'] }] : [],
      catalogHeroLifecycles: [...this.catalogHeroLifecycles],
      navigationTeardowns,
      httpErrors: [...this.httpErrors],
      httpSuccesses: [...this.httpSuccesses],
      writes: [...this.writes],
    };
    this.consoleErrors.length = 0;
    this.pageErrors.length = 0;
    this.requestFailures.delete(window.captureWindowId);
    this.requestLifecycles.splice(0, this.requestLifecycles.length, ...this.requestLifecycles.filter((lifecycle) => lifecycle.captureWindowId !== window.captureWindowId));
    this.catalogHeroLifecycles.length = 0;
    this.navigationTeardowns.length = 0;
    this.httpErrors.length = 0;
    this.httpSuccesses.length = 0;
    this.writes.length = 0;
    return diagnostics;
  }

  async finalizeDeclaredPendingRequest(context: AdmissionContext, targetLocale: AdmissionLocale, expected: Pick<AdmissionRequestLifecycle, 'outcome' | 'status' | 'error'>) {
    const declaration = [...this.declaredPendingRequests.values()].find((candidate) => sameAdmissionContext(candidate.captureWindow.context, context) && candidate.captureWindow.targetLocale === targetLocale);
    if (!declaration || !declaration.closed || !declaration.request) throw new Error('Declared pending request is not retained from a closed capture window.');
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const lifecycle = this.requestLifecycles.filter((candidate) => candidate.requestId === declaration.request!.requestId);
      if (lifecycle.length === 1) {
        const terminal = lifecycle[0];
        if (terminal.outcome !== expected.outcome || terminal.status !== expected.status || terminal.error !== expected.error)
          throw new Error(`Declared pending request reached an unexpected terminal outcome: ${terminal.requestId}`);
        const pending = { requestId: declaration.request.requestId, method: declaration.request.method, path: declaration.request.path, captureWindowId: declaration.captureWindow.captureWindowId, navigationEpoch: declaration.captureWindow.navigationEpoch, context: declaration.captureWindow.context, sourceLocale: declaration.captureWindow.sourceLocale, targetLocale: declaration.captureWindow.targetLocale, cause: declaration.captureWindow.cause, phase: declaration.captureWindow.phase, outcome: 'declared_pending' satisfies AdmissionDeclaredPendingRequest['outcome'] };
        const release = { schema: 'fe058-admission/declared-pending-release-v1', pending, terminal: { requestId: terminal.requestId, outcome: terminal.outcome, ...(terminal.status === undefined ? {} : { status: terminal.status }), ...(terminal.error === undefined ? {} : { error: terminal.error }) } };
        await writeFile(this.testInfo.outputPath('declared-pending-release.json'), `${JSON.stringify(release, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
        return release;
      }
      if (lifecycle.length > 1) throw new Error(`Declared pending request has duplicate terminal outcomes: ${declaration.request.requestId}`);
      await this.page.waitForTimeout(20);
    }
    throw new Error(`Declared pending request did not reach its terminal outcome: ${declaration.request.requestId}`);
  }

  constructor(private readonly page: Page, private readonly testInfo: TestInfo) {
    page.on('console', this.onConsole);
    page.on('pageerror', this.onPageError);
    page.on('request', this.onRequest);
    page.on('framenavigated', this.onFrameNavigated);
    page.on('requestfinished', this.onRequestFinished);
    page.on('requestfailed', this.onRequestFailed);
    page.on('response', this.onResponse);
    this.identities = this.readIdentities();
  }

  private async readRawLocaleObservation(): Promise<RawLocaleObservation> {
    return this.page.evaluate(() => ({
      documentLocale: document.documentElement.lang,
      storedLocale: localStorage.getItem('learnhub.locale'),
    }));
  }

  async observedLocaleSnapshot(): Promise<ObservedLocaleConvergence> {
    const rawLocale = await this.readRawLocaleObservation().catch(() => ({ documentLocale: '', storedLocale: null }));
    return observeLocaleConvergence(rawLocale);
  }

  async observedLocaleConvergence(): Promise<StrictLocaleConvergence> {
    const rawLocale = await this.readRawLocaleObservation();
    const locale = observeLocaleConvergence(rawLocale);
    if (!locale.documentLocale || !locale.storagePresent || !locale.storageLocale || locale.storageLocale !== locale.documentLocale)
      throw new Error(`Unavailable or mismatched observed locale: document=${rawLocale.documentLocale || 'missing'} storage=${rawLocale.storedLocale ?? 'missing'}`);
    return { documentLocale: locale.documentLocale, storageLocale: locale.storageLocale, storagePresent: true };
  }

  async observedLocale() {
    return (await this.observedLocaleConvergence()).documentLocale;
  }

  async observeLocaleReloadSource(): Promise<LocaleReloadSource> {
    const rawLocale = await this.page.evaluate(() => ({
      documentLocale: document.documentElement.lang,
      storedLocale: localStorage.getItem('learnhub.locale'),
    }));
    const locale = observeLocaleConvergence(rawLocale);
    if (locale.documentLocale && locale.storagePresent && locale.storageLocale === locale.documentLocale)
      return { sourceLocale: locale.documentLocale };
    if (this.navigationEpochs.currentEpoch() === 0 && rawLocale.documentLocale === 'en' && rawLocale.storedLocale === null)
      return {
        sourceLocale: 'en',
        bootstrap: { kind: 'initial-default-en-missing-storage', observedDocumentLocale: 'en', observedStorage: 'missing' },
      };
    throw new Error(`Unavailable or mismatched locale-reload source: document=${rawLocale.documentLocale || 'missing'} storage=${rawLocale.storedLocale ?? 'missing'}`);
  }

  async prepareForNavigation(cause: AdmissionNavigationBoundaryProvenance['cause'], allowedPaths: readonly string[] = [], source?: LocaleReloadSource) {
    if (!allowedPaths.length) return;
    this.navigationEpochs.begin(cause, source ?? { sourceLocale: await this.observedLocale() }, allowedPaths);
    for (const request of this.pendingRequests.keys())
      this.navigationEpochs.addExisting(request);
  }

  async prepareCatalogHeroNavigation(cause: 'locale-reload' | 'capture-route-navigation', targetLocale: AdmissionLocale) {
    if (this.catalogHeroBoundary) throw new Error('Catalog hero lifecycle boundary was not finalized before a new navigation.');
    this.catalogHeroBoundary = { epoch: this.catalogHeroEpoch + 1, cause, sourceLocale: await this.observedLocale(), targetLocale, phase: 'pre_document_commit', documentCommitted: false };
    this.catalogHeroEpoch += 1;
  }

  async confirmCatalogHeroRendered() {
    const boundary = this.catalogHeroBoundary;
    if (!boundary || !boundary.documentCommitted || boundary.phase !== 'post_document_commit') throw new Error('Catalog hero render confirmation requires a committed lifecycle boundary.');
    if (await this.observedLocale() !== boundary.targetLocale) throw new Error('Catalog hero render locale does not match the lifecycle target locale.');
    const rendered = await this.page.evaluate((path) => [...document.querySelectorAll<HTMLElement>('*')].some((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && getComputedStyle(element, '::before').backgroundImage.includes(path); }), catalogHeroAssetPath);
    if (!rendered) throw new Error('Catalog hero asset was not rendered after its navigation boundary.');
    for (let index = 0; index < this.catalogHeroLifecycles.length; index += 1) {
      const event = this.catalogHeroLifecycles[index];
      if (event.kind === 'replacement' && event.boundary.epoch === boundary.epoch) this.catalogHeroLifecycles[index] = { ...event, catalogHeroRendered: true };
    }
    this.catalogHeroBoundary = undefined;
  }

  dispose() {
    this.page.off('console', this.onConsole);
    this.page.off('pageerror', this.onPageError);
    this.page.off('request', this.onRequest);
    this.page.off('framenavigated', this.onFrameNavigated);
    this.page.off('requestfinished', this.onRequestFinished);
    this.page.off('requestfailed', this.onRequestFailed);
    this.page.off('response', this.onResponse);
    this.pendingRequests.clear();
    this.catalogHeroBoundary = undefined;
    this.navigationEpochs.dispose();
  }

  private async readIdentities() {
    return readExecutableIdentities(process.cwd());
  }

  private async interactionLocator() {
    if (this.interactionTarget && await this.interactionTarget.isVisible().catch(() => false) && await this.interactionTarget.isEnabled().catch(() => false)) return this.interactionTarget;
    const candidates = this.page.locator('button:not([disabled]):visible, a[href]:not([href^="#"]):visible, input:not([disabled]):visible, select:not([disabled]):visible, textarea:not([disabled]):visible, [role="button"]:not([aria-disabled="true"]):visible, [role="dialog"]:visible');
    const count = await candidates.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = candidates.nth(index);
      if (!await candidate.isVisible().catch(() => false) || !await candidate.isEnabled().catch(() => false)) continue;
      await candidate.focus().catch(() => undefined);
      if (await candidate.evaluate((element) => document.activeElement === element).catch(() => false)) return candidate;
    }
    return candidates.first();
  }

  private async measureInteraction(context: AdmissionContext): Promise<AdmissionInteractionEvidence> {
    if (context.matrix === 'M09') {
      const reason = 'M09 is report-only under FE058-AC05; it has no interaction acceptance scope.';
      return {
        mode: 'focus_transition',
        target: 'not_applicable',
        focus: { status: 'not_applicable', reason },
        keyboard: { status: 'not_applicable', reason },
        minTarget44: { status: 'not_applicable', reason },
      };
    }

    if (context.matrix === 'M08' && context.scenario === 'clear-pending' && context.state === 'clear-pending' && context.session === 'authenticated') {
      const dialog = this.page.getByRole('dialog');
      const targetName = (await dialog.getAttribute('aria-label')) ?? (await dialog.textContent())?.trim() ?? 'unnamed-modal-dialog';
      const visible = await dialog.isVisible().catch(() => false);
      const box = visible ? await dialog.boundingBox() : null;
      const actionCandidates = dialog.locator('button, [role="button"], input, select, textarea, a[href]');
      const actionCount = await actionCandidates.count();
      let enabledDialogActions = 0;
      for (let index = 0; index < actionCount; index += 1) {
        const action = actionCandidates.nth(index);
        if (await action.isVisible().catch(() => false) && await action.isEnabled().catch(() => false)) enabledDialogActions += 1;
      }
      await dialog.focus().catch(() => undefined);
      const initialDialogFocus = await dialog.evaluate((element) => document.activeElement === element).catch(() => false);
      await this.page.keyboard.press('Tab');
      const tabFocusWithinDialog = await dialog.evaluate((element) => element.contains(document.activeElement)).catch(() => false);
      const noBackgroundFocus = tabFocusWithinDialog;
      const focusPass = visible && initialDialogFocus;
      const keyboardPass = focusPass && tabFocusWithinDialog && noBackgroundFocus && enabledDialogActions === 0;
      const geometryPass = Boolean(box && box.width >= 44 && box.height >= 44);
      return {
        mode: 'modal_focus_containment',
        target: targetName,
        focus: { status: focusPass ? 'pass' : 'fail', ...(focusPass ? {} : { reason: 'Pending clear dialog did not receive initial browser focus.' }) },
        keyboard: { status: keyboardPass ? 'pass' : 'fail', ...(keyboardPass ? {} : { reason: `Pending clear dialog containment failed: within=${tabFocusWithinDialog}, background=${noBackgroundFocus}, enabledActions=${enabledDialogActions}.` }) },
        minTarget44: { status: geometryPass ? 'pass' : 'fail', ...(geometryPass ? {} : { reason: `Dialog geometry was ${box ? `${box.width}x${box.height}` : 'unavailable'} CSS pixels; 44x44 is required.` }) },
        modal: { initialDialogFocus, tabFocusWithinDialog, noBackgroundFocus, enabledDialogActions },
      };
    }

    const target = await this.interactionLocator();
    const targetName = (await target.getAttribute('aria-label')) ?? (await target.textContent())?.trim() ?? 'unnamed-interactive-target';
    const visible = await target.isVisible().catch(() => false);
    const enabled = await target.isEnabled().catch(() => false);
    const box = visible ? await target.boundingBox() : null;
    let focus = false;
    let keyboard = false;
    if (visible && enabled) {
      await target.focus().catch(() => undefined);
      focus = await target.evaluate((element) => document.activeElement === element).catch(() => false);
      if (focus) {
        await this.page.keyboard.press('Tab');
        keyboard = await target.evaluate((element) => document.activeElement !== element).catch(() => false);
        await target.focus().catch(() => undefined);
      }
    }
    return {
      mode: 'focus_transition',
      target: targetName,
      focus: { status: focus ? 'pass' : 'fail', ...(focus ? {} : { reason: 'Named target did not receive browser focus.' }) },
      keyboard: { status: keyboard ? 'pass' : 'fail', ...(keyboard ? {} : { reason: 'Tab did not move browser focus from the named target.' }) },
      minTarget44: {
        status: box && box.width >= 44 && box.height >= 44 ? 'pass' : 'fail',
        ...(box && box.width >= 44 && box.height >= 44 ? {} : { reason: `Target geometry was ${box ? `${box.width}x${box.height}` : 'unavailable'} CSS pixels; 44x44 is required.` }),
      },
    };
  }

  async capture(context: AdmissionContext, locale: AdmissionLocale, width: AdmissionWidth, effectiveZoom: 100 | 200) {
    await this.awaitCaptureWindowSettled(context, locale);
    const localeConvergence = await this.observedLocaleConvergence();
    const observedLocale = localeConvergence.documentLocale;
    if (observedLocale !== locale) throw new Error(`Capture locale does not match observed document locale: expected=${locale} observed=${observedLocale}`);
    const cellId = [context.matrix, context.scenario, locale, width, effectiveZoom].map((value) => segment(String(value))).join('--');
    if (this.seen.has(cellId)) throw new Error(`Duplicate admission cell: ${cellId}`);
    this.seen.add(cellId);
    await this.page.setViewportSize({ width, height: 900 });
    const cdp = await this.page.context().newCDPSession(this.page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: effectiveZoom === 200 ? 2 : 1 });
    await cdp.detach();
    const captureScreenshot = Boolean(selectedAdmissionCell) || screenshotMode === 'full' || (effectiveZoom === 100 && canonicalScreenshotWidths.includes(width as (typeof canonicalScreenshotWidths)[number]));
    let screenshot: AdmissionScreenshotEvidence;
    if (captureScreenshot) {
      const screenshotPath = this.testInfo.outputPath('screenshots', `${cellId}.png`);
      await mkdir(join(this.testInfo.outputDir, 'screenshots'), { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      screenshot = { kind: 'captured', path: join('screenshots', basename(screenshotPath)), sha256: await fileHash(screenshotPath) };
    } else screenshot = { kind: 'not_captured', provenance: 'default-canonical-subset' };
    const geometry = await this.page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    const interaction = await this.measureInteraction(context);
    const record = { ...context, cellId, utc: new Date().toISOString(), locale: observedLocale, localeConvergence, viewportWidth: width, effectiveZoom, screenshot, geometry: { ...geometry, overflow: geometry.documentWidth > geometry.clientWidth || geometry.bodyWidth > geometry.clientWidth }, interaction, diagnostics: this.diagnosticsSinceLastCapture(context, observedLocale), identities: await this.identities };
    const directory = this.testInfo.outputPath('cells');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${cellId}.json`), `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    expect(record.geometry.overflow, `${cellId} horizontal overflow`).toBe(false);
    if (context.matrix !== 'M09') {
      expect(record.interaction.focus.status, `${cellId} focus interaction`).toBe('pass');
      expect(record.interaction.keyboard.status, `${cellId} keyboard interaction`).toBe('pass');
      expect(record.interaction.minTarget44.status, `${cellId} target interaction`).toBe('pass');
    }
    return record;
  }

  async recordRoutedObservation(undo: Locator, complete: Locator, observation: RoutedProductObservation) {
    const observedLocale = await this.observedLocale();
    const undoVisible = await undo.isVisible().catch(() => false);
    const completeVisible = await complete.isVisible().catch(() => false);
    expect(undoVisible, 'routed M01 Undo completion remains visible after Space').toBe(true);
    expect(completeVisible, 'routed M01 Complete lesson does not return after Space').toBe(false);
    const screenshotPath = this.testInfo.outputPath('screenshots', 'M01--completion-ready--undo-space-routed-observation.png');
    await mkdir(join(this.testInfo.outputDir, 'screenshots'), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    const record = {
      schema: 'fe058-admission/routed-observation-v1',
      ...observation,
      trigger: 'Space',
      expectedAfterTrigger: { undoVisible: true, completeVisible: false },
      actualAfterTrigger: { undoVisible, completeVisible },
      utc: new Date().toISOString(),
      screenshot: { path: join('screenshots', basename(screenshotPath)), sha256: await fileHash(screenshotPath) },
      diagnostics: this.diagnosticsSinceLastCapture({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'completed', session: 'authenticated', disposition: 'observed' }, observedLocale),
      identities: await this.identities,
    };
    await writeFile(this.testInfo.outputPath('routed-observation.json'), `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    this.endCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'completed', session: 'authenticated', disposition: 'observed' }, observedLocale);
    return record;
  }

  async recordM01Outcome(undo: Locator, complete: Locator) {
    const localeConvergence = await this.observedLocaleConvergence();
    const observedLocale = localeConvergence.documentLocale;
    const undoVisible = await undo.isVisible().catch(() => false);
    const completeVisible = await complete.isVisible().catch(() => false);
    const outcome = undoVisible && !completeVisible
      ? 'accepted-routed-failure'
      : !undoVisible && completeVisible
        ? 'normal-transition'
        : 'unexpected';
    expect(outcome, 'current M01 Space-undo outcome').not.toBe('unexpected');
    const screenshotPath = this.testInfo.outputPath('screenshots', 'M01--completion-ready--undo-space-current-outcome.png');
    await mkdir(join(this.testInfo.outputDir, 'screenshots'), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    const record = {
      schema: 'fe058-admission/current-m01-outcome-v1', matrix: 'M01', scenario: 'completion-ready', trigger: 'Space',
      outcome, locale: observedLocale, localeConvergence, actualAfterTrigger: { undoVisible, completeVisible }, utc: new Date().toISOString(),
      screenshot: { path: join('screenshots', basename(screenshotPath)), sha256: await fileHash(screenshotPath) },
      diagnostics: this.diagnosticsSinceLastCapture({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'completed', session: 'authenticated', disposition: 'observed' }, observedLocale), identities: await this.identities,
    };
    await writeFile(this.testInfo.outputPath('m01-outcome.json'), `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    this.endCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'completed', session: 'authenticated', disposition: 'observed' }, observedLocale);
    return record;
  }

  async expectInteractive(locator: Locator) {
    this.interactionTarget = locator;
    const box = await locator.boundingBox();
    expect(box, 'named interactive target').not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await locator.focus(); await expect(locator).toBeFocused();
  }

  async resetZoom() {
    const cdp = await this.page.context().newCDPSession(this.page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
}

export async function selectLocale(recorder: AdmissionRecorder, page: Page, locale: AdmissionLocale, allowedTeardownPaths: readonly string[] = [], catalogHeroLifecycle = false) {
  const source = await recorder.observeLocaleReloadSource();
  await recorder.prepareForNavigation('locale-reload', allowedTeardownPaths, source);
  if (catalogHeroLifecycle) await recorder.prepareCatalogHeroNavigation('locale-reload', locale);
  await page.evaluate((value) => localStorage.setItem('learnhub.locale', value), locale);
  await page.reload();
  await expect.poll(() => recorder.observedLocaleSnapshot()).toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
  await expect(recorder.observedLocaleConvergence()).resolves.toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
}

export async function captureDeclaredMatrix(recorder: AdmissionRecorder, context: AdmissionContext, locale: AdmissionLocale) {
  const selectedCell = selectedAdmissionCell;
  const captures = [
    ...admissionWidths.map((width) => ({ width, effectiveZoom: 100 as const })),
    ...admissionZoomWidths.map((width) => ({ width, effectiveZoom: 200 as const })),
  ];
  for (const capture of captures) {
    const cellId = [context.matrix, context.scenario, locale, capture.width, capture.effectiveZoom].map((value) => segment(String(value))).join('--');
    if (!selectedCell || selectedCell === cellId) await recorder.capture(context, locale, capture.width, capture.effectiveZoom);
  }
  recorder.endCaptureWindow(context, locale);
  await recorder.resetZoom();
}

export async function captureViewport(page: Page, id: string, width: number, locale: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.screenshot({ path: `screenshots/${id}-${locale}-${width}.png`, fullPage: true });
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
}

export async function expectTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, 'named interactive target').not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await locator.focus();
  await expect(locator).toBeFocused();
}

export async function checkZoom(page: Page, id: string) {
  const cdp = await page.context().newCDPSession(page);
  try {
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
      await captureViewport(page, `${id}-zoom`, width, 'scale-200');
    }
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
}
