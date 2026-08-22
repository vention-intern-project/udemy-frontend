import type {
  LocaleMappingRecord,
  LocaleNamespace,
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
  readonly namespace: LocaleNamespace;
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
  {
    unitId: 'MLUX-C0469',
    namespace: 'common',
    key: 'serverReturnedAnInvalidResponseTryAgain',
    english: 'The server returned an invalid response. Try again.',
    variables: [],
    ru: 'Сервер вернул некорректный ответ. Повторите попытку.',
    uz: 'Server noto‘g‘ri javob qaytardi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0675',
        context:
          'src/features/course-detail/useCourseDetail.ts:123 — Course Detail load-failure descriptor',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0676',
        context:
          'src/features/learning-progress/learning-progress-contracts.ts:103 — Learning load-failure descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0470',
    namespace: 'common',
    key: 'youAppearOffline',
    english: 'You appear to be offline',
    variables: [],
    ru: 'Похоже, нет подключения к интернету',
    uz: 'Internet aloqasi yo‘q ko‘rinadi',
    occurrences: [
      {
        id: 'O0677',
        context:
          'src/features/course-detail/useCourseDetail.ts:128 — Course Detail offline descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0471',
    namespace: 'common',
    key: 'checkConnectionAndTryAgain',
    english: 'Check your connection and try again.',
    variables: [],
    ru: 'Проверьте подключение и повторите попытку.',
    uz: 'Ulanishni tekshirib, qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0678',
        context:
          'src/features/course-detail/useCourseDetail.ts:129 — Course Detail offline descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0472',
    namespace: 'course',
    key: 'courseDataUnavailable',
    english: 'Course data is unavailable',
    variables: [],
    ru: 'Данные курса недоступны',
    uz: 'Kurs ma’lumotlari mavjud emas',
    occurrences: [
      {
        id: 'O0679',
        context:
          'src/features/course-detail/useCourseDetail.ts:122 — Course Detail invalid-response descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0473',
    namespace: 'course',
    key: 'courseLoadFailed',
    english: 'We could not load this course',
    variables: [],
    ru: 'Не удалось загрузить курс',
    uz: 'Kursni yuklab bo‘lmadi',
    occurrences: [
      {
        id: 'O0680',
        context:
          'src/features/course-detail/useCourseDetail.ts:133 — Course Detail request-failure descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0474',
    namespace: 'common',
    key: 'pleaseTryAgain',
    english: 'Please try again.',
    variables: [],
    ru: 'Повторите попытку.',
    uz: 'Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0681',
        context:
          'src/features/course-detail/useCourseDetail.ts:134 — Course Detail request-failure descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0475',
    namespace: 'learning',
    key: 'sessionEndedSignInToContinue',
    english: 'Your session has ended. Sign in to continue learning.',
    variables: [],
    ru: 'Сеанс завершился. Войдите снова, чтобы продолжить обучение.',
    uz: 'Seansingiz tugadi. Ta’limni davom ettirish uchun qayta kiring.',
    occurrences: [
      {
        id: 'O0682',
        context:
          'src/features/learning-progress/learning-progress-contracts.ts:96 — Learning session descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0476',
    namespace: 'learning',
    key: 'learningDataUnavailable',
    english: 'Learning data is unavailable',
    variables: [],
    ru: 'Данные об обучении недоступны',
    uz: 'Ta’lim ma’lumotlari mavjud emas',
    occurrences: [
      {
        id: 'O0683',
        context:
          'src/features/learning-progress/learning-progress-contracts.ts:102 — Learning invalid-response descriptor',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0684',
        context:
          'src/features/learning-progress/learning-progress-contracts.ts:108 — Learning request-failure descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0477',
    namespace: 'learning',
    key: 'tryAgainInAMoment',
    english: 'Try again in a moment.',
    variables: [],
    ru: 'Повторите попытку через некоторое время.',
    uz: 'Birozdan so‘ng qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0685',
        context:
          'src/features/learning-progress/learning-progress-contracts.ts:109 — Learning request-failure descriptor',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0478',
    namespace: 'catalog',
    key: 'remove',
    english: 'Remove',
    variables: [],
    ru: 'Удалить',
    uz: 'Olib tashlash',
    occurrences: [
      {
        id: 'O0686',
        context: 'src/pages/catalog-page/CourseCard.tsx — Catalog / course action remove',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0479',
    namespace: 'catalog',
    key: 'enrolled',
    english: 'Enrolled',
    variables: [],
    ru: 'Вы записаны',
    uz: 'Yozilgansiz',
    occurrences: [
      {
        id: 'O0687',
        context: 'src/pages/catalog-page/CourseCard.tsx — Catalog / course action enrolled',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0480',
    namespace: 'catalog',
    key: 'adding',
    english: 'Adding…',
    variables: [],
    ru: 'Добавляем…',
    uz: 'Qo‘shilmoqda…',
    occurrences: [
      {
        id: 'O0688',
        context: 'src/pages/catalog-page/CourseCard.tsx — Catalog / course action pending add',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0481',
    namespace: 'catalog',
    key: 'removing',
    english: 'Removing…',
    variables: [],
    ru: 'Удаляем…',
    uz: 'Olib tashlanmoqda…',
    occurrences: [
      {
        id: 'O0689',
        context: 'src/pages/catalog-page/CourseCard.tsx — Catalog / course action pending remove',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0482',
    namespace: 'catalog',
    key: 'enrolling',
    english: 'Enrolling…',
    variables: [],
    ru: 'Записываем…',
    uz: 'Yozilmoqda…',
    occurrences: [
      {
        id: 'O0690',
        context:
          'src/pages/catalog-page/CourseCard.tsx — Catalog / course action pending enrollment',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0483',
    namespace: 'learning',
    key: 'completed',
    english: 'Completed',
    variables: [],
    ru: 'Завершено',
    uz: 'Yakunlandi',
    occurrences: [
      {
        id: 'O0692',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx — Learning / lesson completion state',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0484',
    namespace: 'learning',
    key: 'notCompleted',
    english: 'Not completed',
    variables: [],
    ru: 'Не завершено',
    uz: 'Yakunlanmagan',
    occurrences: [
      {
        id: 'O0693',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx — Learning / lesson completion state',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0486',
    namespace: 'catalog',
    key: 'nonNegativePrice',
    english: 'Enter a non-negative price.',
    variables: [],
    ru: 'Введите неотрицательное значение цены.',
    uz: 'Narx manfiy bo‘lmasligi kerak.',
    occurrences: [
      {
        id: 'O0695',
        context: 'src/features/catalog-discovery/query.ts — Catalog / price validation',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0487',
    namespace: 'course',
    key: 'actionFailedCheckConnection',
    english: 'The action failed. Check your connection and try again.',
    variables: [],
    ru: 'Не удалось выполнить действие. Проверьте подключение и повторите попытку.',
    uz: 'Amalni bajarib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0696',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / retryable mutation failure',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0488',
    namespace: 'course',
    key: 'logInAgainToContinue',
    english: 'Log in again to continue.',
    variables: [],
    ru: 'Войдите снова, чтобы продолжить.',
    uz: 'Davom etish uchun qayta kiring.',
    occurrences: [
      {
        id: 'O0698',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / unauthorized mutation failure',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0489',
    namespace: 'course',
    key: 'actionUnavailableForAccount',
    english: 'This action is not available for your account.',
    variables: [],
    ru: 'Это действие недоступно для вашего аккаунта.',
    uz: 'Bu amal akkauntingiz uchun mavjud emas.',
    occurrences: [
      {
        id: 'O0699',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / forbidden mutation failure',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0490',
    namespace: 'course',
    key: 'courseNoLongerAvailable',
    english: 'This course is no longer available.',
    variables: [],
    ru: 'Этот курс больше недоступен.',
    uz: 'Bu kurs endi mavjud emas.',
    occurrences: [
      {
        id: 'O0700',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / missing-course mutation failure',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0491',
    namespace: 'course',
    key: 'courseAlreadyInLearningList',
    english: 'The course is already in your learning list.',
    variables: [],
    ru: 'Этот курс уже есть в вашем списке обучения.',
    uz: 'Bu kurs allaqachon ta’lim ro‘yxatingizda.',
    occurrences: [
      {
        id: 'O0701',
        context: 'src/features/course-detail/action-state.ts — Course Detail / enrollment conflict',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0492',
    namespace: 'course',
    key: 'courseAlreadyInCart',
    english: 'The course is already in your cart.',
    variables: [],
    ru: 'Этот курс уже в вашей корзине.',
    uz: 'Bu kurs allaqachon savatingizda.',
    occurrences: [
      {
        id: 'O0702',
        context: 'src/features/course-detail/action-state.ts — Course Detail / cart conflict',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0493',
    namespace: 'course',
    key: 'courseStateChangedAvailabilityRefreshed',
    english: 'The course state changed. Availability has been refreshed.',
    variables: [],
    ru: 'Состояние курса изменилось. Доступность обновлена.',
    uz: 'Kurs holati o‘zgardi. Mavjudlik yangilandi.',
    occurrences: [
      {
        id: 'O0703',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / stale conflict reconciliation',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0494',
    namespace: 'course',
    key: 'courseActionReconciliationUncertainty',
    english: 'We could not verify your enrollment or cart.',
    variables: [],
    ru: 'Не удалось проверить запись на курс или корзину.',
    uz: 'Kursga yozilish yoki savatni tekshirib bo‘lmadi.',
    occurrences: [
      {
        id: 'O0704',
        context:
          'src/pages/catalog-page/useCatalogCourseActions.ts — Catalog / action reconciliation uncertainty',
        classification: 'Visible UI copy + accessibility label',
      },
      {
        id: 'O0705',
        context:
          'src/pages/course-detail-page/CourseActionPanel.tsx — Course Detail / action reconciliation uncertainty',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0495',
    namespace: 'course',
    key: 'actionCurrentlyUnavailable',
    english: 'This action is currently unavailable.',
    variables: [],
    ru: 'Это действие сейчас недоступно.',
    uz: 'Bu amal hozir mavjud emas.',
    occurrences: [
      {
        id: 'O0697',
        context:
          'src/features/course-detail/action-state.ts — Course Detail / generic mutation failure',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0496',
    namespace: 'course',
    key: 'signIn',
    english: 'Sign in',
    variables: [],
    ru: 'Войти',
    uz: 'Kiring',
    occurrences: [
      {
        id: 'O0710',
        context:
          'src/features/course-detail/action-state.ts:161 — Course Detail / guest free primary-action helper link',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0723',
        context:
          'src/features/course-detail/action-state.ts:170 — Course Detail / guest paid primary-action helper link',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0497',
    namespace: 'course',
    key: 'signInToEnrollForFree',
    english: 'to enroll for free.',
    variables: [],
    ru: ', чтобы записаться бесплатно.',
    uz: 'bepul yozilish uchun.',
    occurrences: [
      {
        id: 'O0711',
        context:
          'src/features/course-detail/action-state.ts:162 — Course Detail / guest free-enrollment guidance',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0498',
    namespace: 'course',
    key: 'signInToAddCourseToCart',
    english: 'to add this course to your cart.',
    variables: [],
    ru: ', чтобы добавить этот курс в корзину.',
    uz: 'bu kursni savatga qo‘shish uchun.',
    occurrences: [
      {
        id: 'O0712',
        context:
          'src/features/course-detail/action-state.ts:171 — Course Detail / guest paid-enrollment guidance',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0499',
    namespace: 'course',
    key: 'enrollForFree',
    english: 'Enroll for free',
    variables: [],
    ru: 'Записаться бесплатно',
    uz: 'Bepul yozilish',
    occurrences: [
      {
        id: 'O0713',
        context:
          'src/features/course-detail/action-state.ts:164 — Course Detail / guest free disabled action',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0500',
    namespace: 'course',
    key: 'unavailableForAccount',
    english: 'Not available for this account',
    variables: [],
    ru: 'Недоступно для этого аккаунта',
    uz: 'Bu akkaunt uchun mavjud emas',
    occurrences: [
      {
        id: 'O0714',
        context:
          'src/features/course-detail/action-state.ts:178 — Course Detail / non-student disabled action',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0501',
    namespace: 'course',
    key: 'checkingAvailability',
    english: 'Checking availability',
    variables: [],
    ru: 'Проверяем доступность',
    uz: 'Mavjudligi tekshirilmoqda',
    occurrences: [
      {
        id: 'O0715',
        context:
          'src/features/course-detail/action-state.ts:179 — Course Detail / preflight loading disabled action',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0502',
    namespace: 'course',
    key: 'alreadyEnrolled',
    english: 'Already enrolled',
    variables: [],
    ru: 'Вы уже записаны',
    uz: 'Siz allaqachon yozilgansiz',
    occurrences: [
      {
        id: 'O0716',
        context:
          'src/features/course-detail/action-state.ts:181 — Course Detail / already-enrolled disabled action',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0503',
    namespace: 'course',
    key: 'alreadyInCart',
    english: 'Already in cart',
    variables: [],
    ru: 'Уже в корзине',
    uz: 'Savatda allaqachon bor',
    occurrences: [
      {
        id: 'O0717',
        context:
          'src/features/course-detail/action-state.ts:183 — Course Detail / already-in-cart disabled action',
        classification: 'Visible UI copy',
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
  readonly unitId:
    | 'MLUX-C0114'
    | 'MLUX-C0169'
    | 'MLUX-C0170'
    | 'MLUX-C0203'
    | 'MLUX-C0204'
    | 'MLUX-C0205'
    | 'MLUX-C0059'
    | 'MLUX-C0157'
    | 'MLUX-C0265'
    | 'MLUX-C0266'
    | 'MLUX-C0362'
    | 'MLUX-C0363'
    | 'MLUX-C0157'
    | 'MLUX-C0163'
    | 'MLUX-C0442'
    | 'MLUX-C0443';
  readonly ownerTask: 'MLUX-006-FOLLOWUP';
};

const sharedOccurrenceSources = [
  {
    id: 'O0706',
    unitId: 'MLUX-C0157',
    context:
      'src/features/course-detail/action-state.ts — Course Detail / bad-request unpublished mutation failure',
    classification: 'Visible UI copy + accessibility label',
  },
  {
    id: 'O0691',
    unitId: 'MLUX-C0059',
    context: 'src/pages/catalog-page/CourseCard.tsx — Catalog / course action retry',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0670',
    unitId: 'MLUX-C0169',
    context:
      'src/features/course-detail/useCourseDetail.ts:116 — Course Detail not-found descriptor',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0671',
    unitId: 'MLUX-C0170',
    context:
      'src/features/course-detail/useCourseDetail.ts:117 — Course Detail not-found descriptor',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0672',
    unitId: 'MLUX-C0265',
    context:
      'src/features/learning-progress/learning-progress-contracts.ts:88 — Learning unavailable descriptor',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0673',
    unitId: 'MLUX-C0266',
    context:
      'src/features/learning-progress/learning-progress-contracts.ts:89 — Learning unavailable descriptor',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0674',
    unitId: 'MLUX-C0114',
    context:
      'src/features/learning-progress/learning-progress-contracts.ts:95 — Learning sign-in descriptor',
    classification: 'Visible UI copy',
  },
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
    id: 'O0667',
    unitId: 'MLUX-C0203',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:469 — Page: instructor-course-editor-page / lesson list type',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0668',
    unitId: 'MLUX-C0204',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:469 — Page: instructor-course-editor-page / lesson list type',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0669',
    unitId: 'MLUX-C0205',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:469 — Page: instructor-course-editor-page / lesson list type',
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
  {
    id: 'O0718',
    unitId: 'MLUX-C0157',
    context:
      'src/features/course-detail/action-state.ts:153 — Course Detail / draft disabled action',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0719',
    unitId: 'MLUX-C0163',
    context:
      'src/features/course-detail/action-state.ts:155 — Course Detail / invalid-price disabled action',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0720',
    unitId: 'MLUX-C0163',
    context:
      'src/features/course-detail/action-state.ts:184 — Course Detail / unavailable-preflight disabled action',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0721',
    unitId: 'MLUX-C0443',
    context:
      'src/features/course-detail/action-state.ts:186 — Course Detail / eligible free action',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0722',
    unitId: 'MLUX-C0442',
    context:
      'src/features/course-detail/action-state.ts:173 — Course Detail / paid guest disabled action',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0724',
    unitId: 'MLUX-C0442',
    context:
      'src/features/course-detail/action-state.ts:187 — Course Detail / eligible paid action',
    classification: 'Visible UI copy',
  },
] as const satisfies readonly Omit<Mlux006FollowupSharedOccurrence, 'ownerTask'>[];

export const MLUX_006_FOLLOWUP_SHARED_OCCURRENCES: readonly Mlux006FollowupSharedOccurrence[] =
  sharedOccurrenceSources.map((occurrence) => ({
    ...occurrence,
    ownerTask: 'MLUX-006-FOLLOWUP',
  }));
