import type {
  LocaleMappingRecord,
  LocaleOccurrence,
  LocaleOccurrenceClassification,
  LocalePlaceholderContract,
} from './mapping';

export interface Mlux006FollowupTranslationEntry {
  readonly unitId: string;
  readonly en: string;
  readonly ru: string;
  readonly uz: string;
}

interface Mlux006FollowupOccurrenceInput {
  readonly id: string;
  readonly context: string;
  readonly classification: LocaleOccurrenceClassification;
}

interface Mlux006FollowupRecord {
  readonly unitId: string;
  readonly namespace: 'auth';
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly placeholdersByLocale?: LocalePlaceholderContract;
  readonly ru: string;
  readonly uz: string;
  readonly occurrences: readonly Mlux006FollowupOccurrenceInput[];
}

const records: readonly Mlux006FollowupRecord[] = [
  {
    unitId: 'MLUX-C0457',
    namespace: 'auth',
    key: 'validationFieldRequired',
    english: '{{fieldLabel}} is required.',
    variables: ['fieldLabel'],
    placeholdersByLocale: {
      en: ['fieldLabel'],
      ru: ['fieldLabel'],
      uz: ['fieldLabel'],
    },
    ru: 'Поле «{{fieldLabel}}» обязательно.',
    uz: '«{{fieldLabel}}» maydonini to‘ldirish shart.',
    occurrences: [
      {
        id: 'O0649',
        context:
          'src/features/auth-workflows/validation.ts:95 — Auth workflow / client required-field descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
      {
        id: 'O0650',
        context:
          'src/features/auth-workflows/validation.ts:161 — Auth workflow / server required-field descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0458',
    namespace: 'auth',
    key: 'validationInvalidEmail',
    english: 'Enter a valid email address.',
    variables: [],
    ru: 'Введите корректный адрес электронной почты.',
    uz: 'To‘g‘ri elektron pochta manzilini kiriting.',
    occurrences: [
      {
        id: 'O0651',
        context: 'src/features/auth-workflows/validation.ts:100 — Auth workflow / email descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
      {
        id: 'O0652',
        context:
          'src/features/auth-workflows/validation.ts:167 — Auth workflow / server email descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0459',
    namespace: 'auth',
    key: 'validationPasswordsDoNotMatch',
    english: 'Passwords do not match.',
    variables: [],
    ru: 'Пароли не совпадают.',
    uz: 'Parollar mos kelmaydi.',
    occurrences: [
      {
        id: 'O0653',
        context:
          'src/features/auth-workflows/validation.ts:120 — Auth workflow / signup password-confirmation descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
      {
        id: 'O0654',
        context:
          'src/features/auth-workflows/validation.ts:130 — Auth workflow / reset password-confirmation descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0460',
    namespace: 'auth',
    key: 'validationInvalidRole',
    english: 'Choose a valid role.',
    variables: [],
    ru: 'Выберите корректную роль.',
    uz: 'To‘g‘ri rolni tanlang.',
    occurrences: [
      {
        id: 'O0655',
        context: 'src/features/auth-workflows/validation.ts:121 — Auth workflow / role descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
      {
        id: 'O0656',
        context:
          'src/features/auth-workflows/validation.ts:170 — Auth workflow / server role descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0461',
    namespace: 'auth',
    key: 'validationCheckField',
    english: 'Check this field and submit again.',
    variables: [],
    ru: 'Проверьте это поле и отправьте форму снова.',
    uz: 'Bu maydonni tekshirib, formani qayta yuboring.',
    occurrences: [
      {
        id: 'O0657',
        context:
          'src/features/auth-workflows/validation.ts:172 — Auth workflow / generic server field descriptor',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0462',
    namespace: 'auth',
    key: 'validationReviewHighlightedField',
    english: 'Review the highlighted field and submit again.',
    variables: [],
    ru: 'Проверьте выделенное поле и отправьте форму снова.',
    uz: 'Belgilangan maydonni tekshirib, qayta yuboring.',
    occurrences: [
      {
        id: 'O0658',
        context:
          'src/features/auth-workflows/useForgotPasswordWorkflow.ts:73 — Forgot-password / client validation summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0463',
    namespace: 'auth',
    key: 'failureOffline',
    english: 'You appear to be offline. Check your connection and submit again.',
    variables: [],
    ru: 'Похоже, нет подключения к интернету. Проверьте соединение и отправьте форму снова.',
    uz: 'Internet aloqasi yo‘q ko‘rinadi. Ulanishni tekshirib, formani qayta yuboring.',
    occurrences: [
      {
        id: 'O0659',
        context: 'src/features/auth-workflows/validation.ts:185 — Auth workflow / offline summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0464',
    namespace: 'auth',
    key: 'failureRequest',
    english: 'We could not complete that request. Please try again.',
    variables: [],
    ru: 'Не удалось выполнить запрос. Повторите попытку.',
    uz: 'So‘rovni bajarib bo‘lmadi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0660',
        context:
          'src/features/auth-workflows/validation.ts:209 — Auth workflow / technical failure summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0465',
    namespace: 'auth',
    key: 'failureSignup',
    english: 'We could not create this account. The email may already be in use.',
    variables: [],
    ru: 'Не удалось создать аккаунт. Возможно, этот адрес уже используется.',
    uz: 'Akkaunt yaratib bo‘lmadi. Bu elektron pochta manzili allaqachon ishlatilayotgan bo‘lishi mumkin.',
    occurrences: [
      {
        id: 'O0661',
        context:
          'src/features/auth-workflows/validation.ts:214 — Signup workflow / public failure summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0466',
    namespace: 'auth',
    key: 'failureLogin',
    english: 'The email or password was not accepted.',
    variables: [],
    ru: 'Неверный адрес электронной почты или пароль.',
    uz: 'Elektron pochta manzili yoki parol noto‘g‘ri.',
    occurrences: [
      {
        id: 'O0662',
        context:
          'src/features/auth-workflows/validation.ts:216 — Login workflow / public failure summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0467',
    namespace: 'auth',
    key: 'failureReset',
    english: 'This reset link is invalid or has expired. Request a new link and try again.',
    variables: [],
    ru: 'Эта ссылка для сброса недействительна или срок её действия истёк. Запросите новую ссылку и повторите попытку.',
    uz: 'Bu tiklash havolasi yaroqsiz yoki uning muddati tugagan. Yangi havolani so‘rab, qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0663',
        context:
          'src/features/auth-workflows/validation.ts:218 — Reset-password workflow / public failure summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0468',
    namespace: 'auth',
    key: 'failureForgot',
    english: 'We could not process the request. Please try again.',
    variables: [],
    ru: 'Не удалось обработать запрос. Повторите попытку.',
    uz: 'So‘rovni ishlab bo‘lmadi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0664',
        context:
          'src/features/auth-workflows/validation.ts:219 — Forgot-password workflow / public failure summary',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
];

export const MLUX_006_FOLLOWUP_TRANSLATIONS: readonly Mlux006FollowupTranslationEntry[] =
  records.map(({ unitId, english, ru, uz }) => ({ unitId, en: english, ru, uz }));

export const MLUX_006_FOLLOWUP_RUNTIME_MAPPING: readonly LocaleMappingRecord[] = records.map(
  (record) => ({
    unitId: record.unitId,
    namespace: record.namespace,
    key: record.key,
    english: record.english,
    variables: record.variables,
    ...(record.placeholdersByLocale ? { placeholdersByLocale: record.placeholdersByLocale } : {}),
    plural: false,
    resourceStatus: 'Draft',
    russian: { resource: 'Draft', review: 'Pending' },
    uzbek: { resource: 'Draft', review: 'Pending' },
    ownerTask: 'MLUX-006-FOLLOWUP',
    occurrences: record.occurrences.map((occurrence) => ({
      ...occurrence,
      ownerTask: 'MLUX-006-FOLLOWUP',
    })),
  }),
);

export type Mlux006FollowupSharedOccurrence = LocaleOccurrence & {
  readonly unitId: 'MLUX-C0203' | 'MLUX-C0204' | 'MLUX-C0205' | 'MLUX-C0362' | 'MLUX-C0363';
  readonly ownerTask: 'MLUX-006-FOLLOWUP';
};

const sharedOccurrenceSources = [
  {
    id: 'O0646',
    unitId: 'MLUX-C0203',
    context:
      'src/pages/course-detail-page/CourseOutline.tsx:83 — Page: course-detail-page / lesson type',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0647',
    unitId: 'MLUX-C0204',
    context:
      'src/pages/course-detail-page/CourseOutline.tsx:83 — Page: course-detail-page / lesson type',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0648',
    unitId: 'MLUX-C0205',
    context:
      'src/pages/course-detail-page/CourseOutline.tsx:83 — Page: course-detail-page / lesson type',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0665',
    unitId: 'MLUX-C0362',
    context:
      'src/features/auth-workflows/validation.ts:199 — Auth workflow / server validation summary',
    classification: 'Visible UI copy + accessibility label',
  },
  {
    id: 'O0666',
    unitId: 'MLUX-C0363',
    context:
      'src/features/auth-workflows/validation.ts:200 — Auth workflow / server validation fallback summary',
    classification: 'Visible UI copy + accessibility label',
  },
] as const satisfies readonly Omit<Mlux006FollowupSharedOccurrence, 'ownerTask'>[];

export const MLUX_006_FOLLOWUP_SHARED_OCCURRENCES: readonly Mlux006FollowupSharedOccurrence[] =
  sharedOccurrenceSources.map((occurrence) => ({
    ...occurrence,
    ownerTask: 'MLUX-006-FOLLOWUP',
  }));
