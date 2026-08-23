import type { Locale } from './types';

export type UnitLifecycle = 'active' | 'retired';
export type LocaleReviewStatus =
  | 'draft'
  | 'review_requested'
  | 'changes_requested'
  | 'approved'
  | 'stale';

export interface SourceRevision {
  readonly value: string;
}

export interface RetirementProvenance {
  readonly reason: string;
  readonly sourceRevision: string;
}

export interface LocalizationCorpusSummary {
  readonly translationUnits: number;
  readonly sourceOccurrences: number;
  readonly mergedDuplicateRows: number;
}

export interface LocalizationCorpusExclusion {
  readonly reason: string;
  readonly source?: string;
}

export type LocalePluralForms = Readonly<Record<string, string>>;

export interface LocalizationPluralForms {
  readonly en: LocalePluralForms;
  readonly ru: LocalePluralForms;
  readonly uz: LocalePluralForms;
}

export type BaselineLocaleResources = Readonly<
  Record<Locale, Readonly<Record<string, Readonly<Record<string, string>>>>>
>;

export interface LocalizationOccurrence {
  readonly id: string;
  readonly context: string;
}

export interface LocaleCandidate {
  readonly candidate: string;
  readonly sourceRevision: string;
  readonly status: LocaleReviewStatus;
  readonly reviewerId?: string | null;
  readonly verdict?: string | null;
  readonly requestedAt?: string | null;
  readonly reviewedAt?: string | null;
  readonly approvalRecordedAt?: string | null;
  readonly approvalAuthority?: LocaleApprovalAuthority | null;
  readonly history: readonly LocaleCandidateHistoryEvent[];
}

export interface LocaleApprovalAuthority {
  readonly kind: 'human_native_review';
  readonly reviewerId: string;
  readonly reviewerName: string;
}

export interface LocaleApprovalRecord {
  readonly reviewerId: string;
  readonly reviewerName: string;
  readonly reviewedAt: string;
  readonly approvalRecordedAt: string;
  readonly approvalAuthority: LocaleApprovalAuthority;
}

export interface LocaleSourceRevisionHistoryEvent {
  readonly type: 'source_revision';
  readonly sourceRevision: string;
}

export interface LocaleTransitionHistoryEvent {
  readonly type: 'transition';
  readonly from: LocaleReviewStatus;
  readonly to: LocaleReviewStatus;
  readonly previousCandidate: string;
  readonly nextCandidate: string;
  readonly humanApproval?: LocaleApprovalRecord;
}

export type LocaleCandidateHistoryEvent =
  | LocaleSourceRevisionHistoryEvent
  | LocaleTransitionHistoryEvent;

export interface LocalizationUnit {
  readonly id: string;
  readonly namespace: string;
  readonly key: string;
  readonly english: string;
  readonly sourceRevision: string;
  readonly unitLifecycle: UnitLifecycle;
  readonly occurrences: readonly LocalizationOccurrence[];
  readonly placeholdersByLocale: Readonly<Record<Locale, readonly string[]>>;
  readonly locales: Readonly<Record<'ru' | 'uz', LocaleCandidate>>;
  readonly retirement?: RetirementProvenance;
  readonly retirementHistory?: readonly RetirementProvenance[];
  readonly pluralForms?: LocalizationPluralForms | null;
  readonly migrationProvenance?: UnitMigrationProvenance;
}

export interface UnitMigrationProvenance {
  readonly legacyResourceStatus: string;
  readonly legacyReviewStatus: string;
  readonly ownerTasks: readonly string[];
}

export interface CorpusMigrationProvenance {
  readonly sourceVersion: string;
  readonly sourceSha256: string;
  readonly sourceOccurrences: number;
  readonly importedAt: null;
}

export interface LocalizationCorpus {
  readonly formatVersion: 1;
  readonly corpusVersion: string;
  readonly source: { readonly sha256: string };
  readonly baselineResources: BaselineLocaleResources;
  readonly summary: LocalizationCorpusSummary;
  readonly exclusions: readonly LocalizationCorpusExclusion[];
  readonly units: readonly LocalizationUnit[];
  readonly migration: CorpusMigrationProvenance;
}
