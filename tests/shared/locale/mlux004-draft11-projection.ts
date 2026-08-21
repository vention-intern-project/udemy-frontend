// Generated from the MLUX-001-DRAFT-11 Corpus and Occurrences sheets using the prescribed read-only @oai/artifact-tool extraction.
// Do not import runtime mapping or resources here: this is the independent test oracle.

export type Mlux004Draft11Namespace =
  | 'a11y'
  | 'ai'
  | 'auth'
  | 'cart'
  | 'catalog'
  | 'common'
  | 'course'
  | 'learning'
  | 'navigation'
  | 'routes';

export interface Mlux004Draft11Occurrence {
  readonly id: string;
  readonly context: string;
  readonly classification: 'Accessibility only' | 'Visible UI copy';
  readonly ownerTask: 'MLUX-004';
}

export interface Mlux004Draft11Unit {
  readonly unitId: string;
  readonly namespace: Mlux004Draft11Namespace;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly resourceStatus: 'Draft';
  readonly russian: {
    readonly value: string;
    readonly resource: 'Draft';
    readonly review: 'Pending';
  };
  readonly uzbek: {
    readonly value: string;
    readonly resource: 'Draft';
    readonly review: 'Pending';
  };
  readonly ownerTask: 'MLUX-002' | 'MLUX-003' | 'MLUX-004';
  readonly occurrences: readonly Mlux004Draft11Occurrence[];
}

export const MLUX_004_DRAFT11_PROJECTION: readonly Mlux004Draft11Unit[] = [
  {
    unitId: 'MLUX-C0003',
    namespace: 'navigation',
    key: 'catalog',
    english: 'Catalog',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Каталог',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Katalog',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-002',
    occurrences: [
      {
        id: 'O0160',
        context: 'src/pages/cart-page/CartPage.tsx:61 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0174',
        context: 'src/pages/cart-page/CartPage.tsx:90 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0385',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:175 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0004',
    namespace: 'navigation',
    key: 'logIn',
    english: 'Log in',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Войти',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kirish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-002',
    occurrences: [
      {
        id: 'O0136',
        context: 'src/pages/cart-page/CartPage.tsx:149 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0146',
        context: 'src/pages/cart-page/CartPage.tsx:186 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0163',
        context: 'src/pages/cart-page/CartPage.tsx:65 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0391',
        context: 'src/pages/login-page/LoginPage.tsx:25 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0006',
    namespace: 'navigation',
    key: 'myLearning',
    english: 'My learning',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Моё обучение',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’limim',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-002',
    occurrences: [
      {
        id: 'O0166',
        context: 'src/pages/cart-page/CartPage.tsx:68 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0367',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:149 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0386',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:179 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0007',
    namespace: 'navigation',
    key: 'instructorCourses',
    english: 'Instructor courses',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курсы преподавателя',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘qituvchi kurslari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-002',
    occurrences: [
      {
        id: 'O0170',
        context: 'src/pages/cart-page/CartPage.tsx:72 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0024',
    namespace: 'routes',
    key: 'learningDetailsTitle',
    english: 'Learning details',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сведения об обучении',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim tafsilotlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0167',
        context: 'src/pages/cart-page/CartPage.tsx:69 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0026',
    namespace: 'routes',
    key: 'courseAssistantTitle',
    english: 'Course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0168',
        context: 'src/pages/cart-page/CartPage.tsx:70 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0028',
    namespace: 'routes',
    key: 'aiAssistantTitle',
    english: 'AI assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'ИИ-ассистент',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'AI yordamchi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0169',
        context: 'src/pages/cart-page/CartPage.tsx:71 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0031',
    namespace: 'routes',
    key: 'editCourseTitle',
    english: 'Edit course',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Редактировать курс',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kursni tahrirlash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0171',
        context: 'src/pages/cart-page/CartPage.tsx:73 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0033',
    namespace: 'routes',
    key: 'courseEnrollmentsTitle',
    english: 'Course enrollments',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Записи на курс',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kursga yozilishlar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0172',
        context: 'src/pages/cart-page/CartPage.tsx:74 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0035',
    namespace: 'routes',
    key: 'editLessonTitle',
    english: 'Edit lesson',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Редактировать урок',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Darsni tahrirlash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0173',
        context: 'src/pages/cart-page/CartPage.tsx:75 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0039',
    namespace: 'routes',
    key: 'courseDetailsTitle',
    english: 'Course details',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сведения о курсе',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tafsilotlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0161',
        context: 'src/pages/cart-page/CartPage.tsx:63 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0041',
    namespace: 'routes',
    key: 'createAccountTitle',
    english: 'Create account',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Создать аккаунт',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Akkaunt yaratish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0162',
        context: 'src/pages/cart-page/CartPage.tsx:64 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0415',
        context: 'src/pages/signup-page/SignupPage.tsx:25 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0042',
    namespace: 'routes',
    key: 'createAccountDescription',
    english: 'Create a LearnHub account to start learning or teaching.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Создайте аккаунт LearnHub, чтобы учиться или преподавать.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘qish yoki dars berishni boshlash uchun LearnHub akkauntini yarating.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0416',
        context: 'src/pages/signup-page/SignupPage.tsx:26 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0043',
    namespace: 'routes',
    key: 'loginDescription',
    english: 'Access your learning or instructor workspace.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Перейдите в пространство обучения или преподавателя.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim yoki o‘qituvchi ish maydoniga kiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0393',
        context: 'src/pages/login-page/LoginPage.tsx:29 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0044',
    namespace: 'routes',
    key: 'forgotPasswordTitle',
    english: 'Forgot password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Забыли пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parolni unutdingizmi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0164',
        context: 'src/pages/cart-page/CartPage.tsx:66 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0222',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:17 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0045',
    namespace: 'routes',
    key: 'forgotPasswordDescription',
    english: 'Request help signing back in to your account.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Запросите помощь, чтобы снова войти в аккаунт.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Akkauntingizga qayta kirish uchun yordam so‘rang.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0223',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:18 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0046',
    namespace: 'routes',
    key: 'resetPasswordTitle',
    english: 'Reset password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сбросить пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parolni tiklash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0165',
        context: 'src/pages/cart-page/CartPage.tsx:67 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0398',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:24 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0404',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:77 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0047',
    namespace: 'routes',
    key: 'resetPasswordDescription',
    english: 'Choose a new password for your account.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Выберите новый пароль для аккаунта.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Akkauntingiz uchun yangi parol tanlang.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0399',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:25 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0405',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:78 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0059',
    namespace: 'routes',
    key: 'tryAgain',
    english: 'Try again',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Повторить',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Qayta urinish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-003',
    occurrences: [
      {
        id: 'O0206',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:115 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0218',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:38 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0066',
    namespace: 'auth',
    key: 'hidePassword',
    english: 'Hide password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Скрыть пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parolni yashirish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0081',
        context: 'src/features/auth-workflows/AuthForm.tsx:112 — Feature: auth-workflows',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0067',
    namespace: 'auth',
    key: 'showPassword',
    english: 'Show password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Показать пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parolni ko‘rsatish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0082',
        context: 'src/features/auth-workflows/AuthForm.tsx:112 — Feature: auth-workflows',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0068',
    namespace: 'learning',
    key: 'mediaCouldNotBeLoadedTry',
    english: 'Media could not be loaded. Try again.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Не удалось загрузить медиафайл. Повторите попытку.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Mediafaylni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0083',
        context: 'src/features/media-access/LessonMediaAccess.tsx:112 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0069',
    namespace: 'learning',
    key: 'loadPdf',
    english: 'Load PDF',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузить PDF',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF-ni yuklash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0084',
        context: 'src/features/media-access/LessonMediaAccess.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0070',
    namespace: 'learning',
    key: 'loadVideo',
    english: 'Load video',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузить видео',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Videoni yuklash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0085',
        context: 'src/features/media-access/LessonMediaAccess.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0071',
    namespace: 'learning',
    key: 'loadingMedia',
    english: 'Loading media…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка медиа…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Media yuklanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0086',
        context: 'src/features/media-access/LessonMediaAccess.tsx:124 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0072',
    namespace: 'learning',
    key: 'lessonVideoPreview',
    english: 'Lesson video preview',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предпросмотр видео урока',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Dars videosini oldindan ko‘rish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0087',
        context: 'src/features/media-access/LessonMediaAccess.tsx:83 — Feature: media-access',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0073',
    namespace: 'learning',
    key: 'preparingVideo',
    english: 'Preparing video…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Подготавливаем видео…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Video tayyorlanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0088',
        context: 'src/features/media-access/LessonMediaAccess.tsx:92 — Feature: media-access',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0074',
    namespace: 'learning',
    key: 'videoReady',
    english: 'Video ready.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Видео готово.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Video tayyor.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0089',
        context: 'src/features/media-access/LessonMediaAccess.tsx:92 — Feature: media-access',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0075',
    namespace: 'learning',
    key: 'pdfCouldNotBeDisplayedTry',
    english: 'PDF could not be displayed. Try again.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Не удалось отобразить PDF. Повторите попытку.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF-ni ko‘rsatib bo‘lmadi. Qayta urinib ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0090',
        context: 'src/features/media-access/LessonPdfPreview.tsx:115 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0076',
    namespace: 'learning',
    key: 'pdfReadyPageOf',
    english: 'PDF ready. Page {currentPage} of {totalPages}.',
    variables: ['currentPage', 'totalPages'],
    resourceStatus: 'Draft',
    russian: {
      value: 'PDF готов. Страница {currentPage} из {totalPages}.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF tayyor. {totalPages} sahifadan {currentPage}-sahifa.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0091',
        context: 'src/features/media-access/LessonPdfPreview.tsx:117 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0077',
    namespace: 'learning',
    key: 'renderingPdfPage',
    english: 'Rendering PDF page {currentPage}.',
    variables: ['currentPage'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отображаем страницу PDF: {currentPage}.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF-ning {currentPage}-sahifasi tayyorlanmoqda.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0092',
        context: 'src/features/media-access/LessonPdfPreview.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0078',
    namespace: 'learning',
    key: 'loadingPdfPreview',
    english: 'Loading PDF preview…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка предпросмотра PDF…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF ko‘rinishi yuklanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0093',
        context: 'src/features/media-access/LessonPdfPreview.tsx:120 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0079',
    namespace: 'learning',
    key: 'lessonPdfPreview',
    english: 'Lesson PDF preview',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предпросмотр PDF урока',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Dars PDF-faylini oldindan ko‘rish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0094',
        context: 'src/features/media-access/LessonPdfPreview.tsx:127 — Feature: media-access',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0080',
    namespace: 'learning',
    key: 'pdfPages',
    english: 'PDF pages',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Страницы PDF',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF sahifalari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0095',
        context: 'src/features/media-access/LessonPdfPreview.tsx:136 — Feature: media-access',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0081',
    namespace: 'learning',
    key: 'tryPdfAgain',
    english: 'Try PDF again',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Повторить загрузку PDF',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'PDF-ni qayta yuklash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0096',
        context: 'src/features/media-access/LessonPdfPreview.tsx:160 — Feature: media-access',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0082',
    namespace: 'ai',
    key: 'invalidCourseAssistantAddress',
    english: 'Invalid course assistant address',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Неверный адрес ассистента курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi manzili noto‘g‘ri',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0097',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:100 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0083',
    namespace: 'ai',
    key: 'returnToMyLearningAndChoose',
    english: 'Return to my learning and choose a course to open its assistant.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Вернитесь в раздел «Моё обучение» и выберите курс, чтобы открыть его ассистента.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisini ochish uchun “Ta’limim” bo‘limiga qayting va kursni tanlang.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0098',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:101 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0084',
    namespace: 'ai',
    key: 'recommendACourse',
    english: 'Recommend a course',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Порекомендуй курс',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tavsiya qil',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0099',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:127 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0085',
    namespace: 'ai',
    key: 'recommendACourseBasedOnMy',
    english: 'Recommend a course based on my learning goals.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Порекомендуй курс с учётом моих целей обучения.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim maqsadlarimga mos kurs tavsiya qil.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0100',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:128 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0086',
    namespace: 'ai',
    key: 'explainAConcept',
    english: 'Explain a concept',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Объясни понятие',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Tushunchani izohla',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0101',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:132 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0087',
    namespace: 'ai',
    key: 'explainAConceptIAmLearning',
    english: 'Explain a concept I am learning in simple terms.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Объясни простыми словами понятие, которое я изучаю.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘rganayotgan tushunchamni sodda qilib izohla.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0102',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:133 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0088',
    namespace: 'ai',
    key: 'quizMe',
    english: 'Quiz me',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверь мои знания',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bilimimni tekshir',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0103',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:137 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0089',
    namespace: 'ai',
    key: 'quizMeOnTheCourseMaterial',
    english: 'Quiz me on the course material I am learning.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверь мои знания по материалам курса, который я изучаю.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘rganayotgan kurs materiallari bo‘yicha bilimimni tekshir.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0104',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:138 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0090',
    namespace: 'ai',
    key: 'suggestedActions',
    english: 'Suggested Actions',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предлагаемые действия',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Tavsiya etilgan amallar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0105',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:210 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0091',
    namespace: 'ai',
    key: 'quickPromptsToJumpstartYourSession',
    english: 'Quick prompts to jumpstart your session',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Быстрые запросы для начала работы',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Suhbatni boshlash uchun tezkor so‘rovlar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0106',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:212 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0108',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:224 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0092',
    namespace: 'ai',
    key: 'suggestedActions0092',
    english: 'Suggested Actions',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предлагаемые действия',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Tavsiya etilgan amallar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0107',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:223 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0093',
    namespace: 'ai',
    key: 'courseAssistant',
    english: 'Course Assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0109',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:245 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0094',
    namespace: 'ai',
    key: 'generalAssistanceChat',
    english: 'General Assistance Chat',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Чат общей помощи',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Umumiy yordam chati',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0110',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:245 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0095',
    namespace: 'ai',
    key: 'assistantAvailable',
    english: 'Assistant available',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент доступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi mavjud',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0111',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:253 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0096',
    namespace: 'ai',
    key: 'assistantUnavailable',
    english: 'Assistant unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0112',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:255 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0097',
    namespace: 'ai',
    key: 'assistantAvailabilityUnknown',
    english: 'Assistant availability unknown',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Доступность ассистента неизвестна',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi holati noma’lum',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0113',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:256 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0098',
    namespace: 'ai',
    key: 'poweredByLearnhubIntelligence',
    english: 'Powered by LearnHub Intelligence',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'На базе LearnHub Intelligence',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'LearnHub Intelligence asosida',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0114',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:311 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0099',
    namespace: 'ai',
    key: 'conversationActions',
    english: 'Conversation actions',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Действия с диалогом',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Suhbat amallari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0115',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:319 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0116',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:331 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0447',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:114 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0448',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:138 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0100',
    namespace: 'ai',
    key: 'clearChat',
    english: 'Clear chat',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистить чат',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Chatni tozalash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0117',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:347 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0449',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:154 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0101',
    namespace: 'ai',
    key: 'closeAssistantChat',
    english: 'Close assistant chat',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Закрыть чат с ассистентом',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi chatini yopish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0118',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:355 — Page: ai-chat-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0102',
    namespace: 'ai',
    key: 'clearThisConversation',
    english: 'Clear this conversation?',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистить этот диалог?',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu suhbat tozalansinmi?',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0119',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:376 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0451',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:180 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0103',
    namespace: 'ai',
    key: 'thisActionCannotBeUndone',
    english: 'This action cannot be undone.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Это действие нельзя отменить.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu amalni bekor qilib bo‘lmaydi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0120',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:377 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0452',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:181 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0104',
    namespace: 'ai',
    key: 'clearConversation',
    english: 'Clear conversation',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистить диалог',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Suhbatni tozalash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0121',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:378 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0453',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:182 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0105',
    namespace: 'ai',
    key: 'loadingCourseAssistant',
    english: 'Loading course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка ассистента курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi yuklanmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0122',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:56 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0106',
    namespace: 'ai',
    key: 'courseAssistantUnavailable',
    english: 'Course assistant unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент курса недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0123',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:64 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0125',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:75 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0107',
    namespace: 'ai',
    key: 'thisAssistantIsUnavailableForThis',
    english: 'This assistant is unavailable for this course.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент недоступен для этого курса.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kurs uchun yordamchi mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0124',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:65 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0126',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:76 — Page: ai-chat-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0108',
    namespace: 'cart',
    key: 'checkoutAccepted',
    english: 'Checkout accepted',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оформление принято',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma qabul qilindi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0127',
        context: 'src/pages/cart-page/CartPage.tsx:121 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0109',
    namespace: 'cart',
    key: 'mockCheckoutWasAcceptedPaymentIs',
    english: 'Mock checkout was accepted. Payment is pending; continue in My Learning.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value:
        'Тестовое оформление принято. Платёж ожидает обработки; продолжите в разделе «Моё обучение».',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; “Ta’limim” bo‘limida davom eting.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0128',
        context: 'src/pages/cart-page/CartPage.tsx:122 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0110',
    namespace: 'cart',
    key: 'checkMyLearning',
    english: 'Check My Learning',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверить «Моё обучение»',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '“Ta’limim”ni tekshirish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0129',
        context: 'src/pages/cart-page/CartPage.tsx:123 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0133',
        context: 'src/pages/cart-page/CartPage.tsx:142 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0141',
        context: 'src/pages/cart-page/CartPage.tsx:162 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0111',
    namespace: 'cart',
    key: 'checkoutStatusNeedsChecking',
    english: 'Checkout status needs checking',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Нужно проверить статус оформления',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma holatini tekshirish kerak',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0130',
        context: 'src/pages/cart-page/CartPage.tsx:128 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0112',
    namespace: 'cart',
    key: 'weCouldNotConfirmCheckoutCheck',
    english: 'We could not confirm checkout. Check the cart status for updated guidance.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value:
        'Не удалось подтвердить оформление. Проверьте статус корзины для получения актуальных инструкций.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value:
        'Buyurtmani tasdiqlab bo‘lmadi. Yangilangan ko‘rsatmalar uchun savat holatini tekshiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0131',
        context: 'src/pages/cart-page/CartPage.tsx:129 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0113',
    namespace: 'cart',
    key: 'checkoutStatusRemainsUnknown',
    english: 'Checkout status remains unknown',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Статус оформления по-прежнему неизвестен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma holati hanuz noma’lum',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0132',
        context: 'src/pages/cart-page/CartPage.tsx:137 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0114',
    namespace: 'cart',
    key: 'signInRequired',
    english: 'Sign in required',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Требуется вход',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kirish talab qilinadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0134',
        context: 'src/pages/cart-page/CartPage.tsx:147 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0364',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:121 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0459',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:22 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0115',
    namespace: 'cart',
    key: 'signInAgainBeforeContinuingCheckout',
    english: 'Sign in again before continuing checkout.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Войдите снова, прежде чем продолжить оформление.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtmani davom ettirishdan oldin qayta kiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0135',
        context: 'src/pages/cart-page/CartPage.tsx:148 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0116',
    namespace: 'cart',
    key: 'checkoutUnavailable',
    english: 'Checkout unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оформление недоступно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma berish imkonsiz',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0137',
        context: 'src/pages/cart-page/CartPage.tsx:154 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0144',
        context: 'src/pages/cart-page/CartPage.tsx:172 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0117',
    namespace: 'cart',
    key: 'thisCheckoutIsNotAvailableFor',
    english: 'This checkout is not available for the current account.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оформление недоступно для текущего аккаунта.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Joriy akkaunt uchun buyurtma berish mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0138',
        context: 'src/pages/cart-page/CartPage.tsx:155 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0118',
    namespace: 'cart',
    key: 'enrollmentChanged',
    english: 'Enrollment changed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Запись на курс изменилась',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kursga yozilish holati o‘zgardi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0139',
        context: 'src/pages/cart-page/CartPage.tsx:160 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0119',
    namespace: 'cart',
    key: 'yourEnrollmentChangedCheckMyLearning',
    english: 'Your enrollment changed. Check My Learning before taking another action.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Статус записи изменился. Перед следующим действием проверьте раздел «Моё обучение».',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yozilish holati o‘zgardi. Keyingi amaldan oldin “Ta’limim” bo‘limini tekshiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0140',
        context: 'src/pages/cart-page/CartPage.tsx:161 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0120',
    namespace: 'cart',
    key: 'cartChanged',
    english: 'Cart changed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Корзина изменилась',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savat o‘zgardi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0142',
        context: 'src/pages/cart-page/CartPage.tsx:167 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0121',
    namespace: 'cart',
    key: 'yourCartIsNoLongerReady',
    english: 'Your cart is no longer ready for this checkout. Refresh it before trying again.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Корзина больше не готова к оформлению. Обновите её перед повторной попыткой.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savat bu buyurtma uchun tayyor emas. Qayta urinishdan oldin uni yangilang.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0143',
        context: 'src/pages/cart-page/CartPage.tsx:168 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0122',
    namespace: 'cart',
    key: 'checkoutIsCurrentlyUnavailableTryAgain',
    english: 'Checkout is currently unavailable. Try again later.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оформление сейчас недоступно. Повторите попытку позже.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma berish hozircha mavjud emas. Keyinroq qayta urinib ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0145',
        context: 'src/pages/cart-page/CartPage.tsx:173 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0123',
    namespace: 'cart',
    key: 'cartCleared',
    english: 'Cart cleared.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Корзина очищена.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savat tozalandi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0147',
        context: 'src/pages/cart-page/CartPage.tsx:212 — Page: cart-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0124',
    namespace: 'cart',
    key: 'courseRemovedFromCart',
    english: 'Course removed from cart.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курс удалён из корзины.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs savatdan olib tashlandi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0148',
        context: 'src/pages/cart-page/CartPage.tsx:212 — Page: cart-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0125',
    namespace: 'cart',
    key: 'addACourseFromTheCatalog',
    english: 'Add a course from the catalog when you are ready to learn.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Когда будете готовы учиться, добавьте курс из каталога.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘qishga tayyor bo‘lsangiz, katalogdan kurs qo‘shing.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0149',
        context: 'src/pages/cart-page/CartPage.tsx:422 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0126',
    namespace: 'cart',
    key: 'clearCart',
    english: 'Clear cart',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистить корзину',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savatni tozalash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0150',
        context: 'src/pages/cart-page/CartPage.tsx:472 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0158',
        context: 'src/pages/cart-page/CartPage.tsx:587 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0127',
    namespace: 'cart',
    key: 'preview',
    english: 'Preview {courseTitle}',
    variables: ['courseTitle'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предпросмотр курса «{courseTitle}»',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '{courseTitle} kursini oldindan ko‘rish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0151',
        context: 'src/pages/cart-page/CartPage.tsx:507 — Page: cart-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0128',
    namespace: 'cart',
    key: 'coursePreview',
    english: 'Course preview',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Предпросмотр курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kursni oldindan ko‘rish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0152',
        context: 'src/pages/cart-page/CartPage.tsx:509 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0129',
    namespace: 'cart',
    key: 'remove',
    english: 'Remove {courseTitle}',
    variables: ['courseTitle'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Удалить курс «{courseTitle}»',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '{courseTitle} kursini olib tashlash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0153',
        context: 'src/pages/cart-page/CartPage.tsx:536 — Page: cart-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0130',
    namespace: 'cart',
    key: 'checkingOut',
    english: 'Checking out…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оформление…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Buyurtma rasmiylashtirilmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0154',
        context: 'src/pages/cart-page/CartPage.tsx:573 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0131',
    namespace: 'cart',
    key: 'insecureCheckout',
    english: 'Insecure checkout',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Небезопасное оформление',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Xavfsiz bo‘lmagan buyurtma',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0155',
        context: 'src/pages/cart-page/CartPage.tsx:579 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0132',
    namespace: 'cart',
    key: 'clearCart0132',
    english: 'Clear cart?',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистить корзину?',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savat tozalansinmi?',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0156',
        context: 'src/pages/cart-page/CartPage.tsx:585 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0133',
    namespace: 'cart',
    key: 'thisRemovesEveryCourseFromYour',
    english:
      'This removes every course from your cart. You can add courses again from the catalog.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Все курсы будут удалены из корзины. Вы сможете снова добавить их из каталога.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value:
        'Savatdagi barcha kurslar olib tashlanadi. Ularni katalogdan yana qo‘shishingiz mumkin.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0157',
        context: 'src/pages/cart-page/CartPage.tsx:586 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0134',
    namespace: 'cart',
    key: 'clearingCart',
    english: 'Clearing cart...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Очистка корзины...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savat tozalanmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0159',
        context: 'src/pages/cart-page/CartPage.tsx:589 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0135',
    namespace: 'catalog',
    key: 'courseResultsUpdated',
    english: 'Course results updated.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Результаты поиска курсов обновлены.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs natijalari yangilandi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0175',
        context: 'src/pages/catalog-page/CatalogPage.tsx:22 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0178',
        context: 'src/pages/catalog-page/CatalogPage.tsx:290 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0136',
    namespace: 'catalog',
    key: 'updatingCourseResults',
    english: 'Updating course results…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Обновляем результаты поиска курсов…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs natijalari yangilanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0176',
        context: 'src/pages/catalog-page/CatalogPage.tsx:22 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0177',
        context: 'src/pages/catalog-page/CatalogPage.tsx:283 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0137',
    namespace: 'catalog',
    key: 'catalogRefreshStatus',
    english: 'Catalog refresh status',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Статус обновления каталога',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Katalog yangilanish holati',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0179',
        context: 'src/pages/catalog-page/CatalogPage.tsx:341 — Page: catalog-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0138',
    namespace: 'catalog',
    key: 'loadingCourseResults',
    english: 'Loading course results…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка результатов поиска курсов…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs natijalari yuklanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0180',
        context: 'src/pages/catalog-page/CatalogPage.tsx:350 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0139',
    namespace: 'catalog',
    key: 'found',
    english: 'Found',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Найдено',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Topildi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0181',
        context: 'src/pages/catalog-page/CatalogPage.tsx:353 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0140',
    namespace: 'catalog',
    key: 'courseResultsUnavailable',
    english: 'Course results unavailable.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Результаты поиска курсов недоступны.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs natijalari mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0182',
        context: 'src/pages/catalog-page/CatalogPage.tsx:361 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0141',
    namespace: 'catalog',
    key: 'noCoursesFound',
    english: 'No courses found',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курсы не найдены',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurslar topilmadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0183',
        context: 'src/pages/catalog-page/CatalogPage.tsx:407 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0142',
    namespace: 'catalog',
    key: 'courseResultPages',
    english: 'Course result pages',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Страницы результатов поиска курсов',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs natijalari sahifalari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0184',
        context: 'src/pages/catalog-page/CatalogPage.tsx:435 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0143',
    namespace: 'catalog',
    key: 'enrollForFree',
    english: 'Enroll for free',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Записаться бесплатно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bepul yozilish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0185',
        context: 'src/pages/catalog-page/CourseCard.tsx:212 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0144',
    namespace: 'catalog',
    key: 'viewCourseDetails',
    english: 'View course details',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Открыть сведения о курсе',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tafsilotlarini ko‘rish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0186',
        context: 'src/pages/catalog-page/CourseCard.tsx:392 — Page: catalog-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0145',
    namespace: 'catalog',
    key: 'thisCourseIsNotAvailableFor',
    english: 'This course is not available for enrollment yet.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Запись на этот курс пока недоступна.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kursga yozilish hozircha mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0187',
        context: 'src/pages/catalog-page/CourseCard.tsx:67 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0146',
    namespace: 'catalog',
    key: 'noCourseDescriptionIsAvailable',
    english: 'No course description is available.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Описание курса отсутствует.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tavsifi mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0188',
        context: 'src/pages/catalog-page/CourseCard.tsx:71 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0207',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:122 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0377',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:321 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0147',
    namespace: 'catalog',
    key: 'lowToHigh',
    english: 'Low to High',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'По возрастанию',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘sish tartibida',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0189',
        context: 'src/pages/catalog-page/SortControl.tsx:10 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0148',
    namespace: 'catalog',
    key: 'highToLow',
    english: 'High to Low',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'По убыванию',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kamayish tartibida',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0190',
        context: 'src/pages/catalog-page/SortControl.tsx:11 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0149',
    namespace: 'catalog',
    key: 'sortBy',
    english: 'Sort by: {sortLabel}',
    variables: ['sortLabel'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сортировка: {sortLabel}',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Saralash: {sortLabel}',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0191',
        context: 'src/pages/catalog-page/SortControl.tsx:114 — Page: catalog-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0150',
    namespace: 'catalog',
    key: 'aToZ',
    english: 'A to Z',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'От А до Я',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'A dan Z gacha',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0192',
        context: 'src/pages/catalog-page/SortControl.tsx:12 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0151',
    namespace: 'catalog',
    key: 'zToA',
    english: 'Z to A',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'От Я до А',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Z dan A gacha',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0193',
        context: 'src/pages/catalog-page/SortControl.tsx:13 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0152',
    namespace: 'catalog',
    key: 'sortByOptions',
    english: 'Sort by options',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Параметры сортировки',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Saralash parametrlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0194',
        context: 'src/pages/catalog-page/SortControl.tsx:151 — Page: catalog-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0153',
    namespace: 'catalog',
    key: 'oldest',
    english: 'Oldest',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сначала старые',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Avval eskilari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0195',
        context: 'src/pages/catalog-page/SortControl.tsx:8 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0154',
    namespace: 'catalog',
    key: 'newest',
    english: 'Newest',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сначала новые',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Avval yangilari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0196',
        context: 'src/pages/catalog-page/SortControl.tsx:9 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0155',
    namespace: 'course',
    key: 'pleaseWait',
    english: 'Please wait…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Подождите…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kuting…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0197',
        context:
          'src/pages/course-detail-page/CourseActionPanel.tsx:127 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0156',
    namespace: 'course',
    key: 'notAvailable',
    english: 'Not available',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Недоступно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0198',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:46 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0157',
    namespace: 'course',
    key: 'courseIsNotPublished',
    english: 'Course is not published',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курс не опубликован',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs nashr qilinmagan',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0199',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:47 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0158',
    namespace: 'course',
    key: 'actionFailed',
    english: 'Action failed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Не удалось выполнить действие',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amal bajarilmadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0200',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:53 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0159',
    namespace: 'course',
    key: 'enrollmentComplete',
    english: 'Enrollment complete',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Запись завершена',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yozilish yakunlandi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0201',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:61 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0160',
    namespace: 'course',
    key: 'youAreNowEnrolledInThis',
    english: 'You are now enrolled in this course.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Вы записаны на этот курс.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Siz bu kursga yozildingiz.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0202',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:62 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0161',
    namespace: 'course',
    key: 'addedToCart',
    english: 'Added to cart',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Добавлено в корзину',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savatga qo‘shildi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0203',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:67 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0162',
    namespace: 'course',
    key: 'thisCourseWasAddedToYour',
    english: 'This course was added to your cart.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курс добавлен в корзину.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kurs savatingizga qo‘shildi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0204',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:68 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0163',
    namespace: 'course',
    key: 'actionUnavailable',
    english: 'Action unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Действие недоступно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amal mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0205',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:75 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0164',
    namespace: 'course',
    key: 'instructor',
    english: 'Instructor',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Преподаватель',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'O‘qituvchi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0208',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:140 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0411',
        context: 'src/pages/signup-page/RolePicker.tsx:22 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0165',
    namespace: 'course',
    key: 'totalLessons',
    english: 'Total lessons',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Всего уроков',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Jami darslar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0209',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:144 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0166',
    namespace: 'course',
    key: 'status',
    english: 'Status',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Статус',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Holat',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0210',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:148 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0167',
    namespace: 'course',
    key: 'draft',
    english: 'Draft',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Черновик',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Qoralama',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0211',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:149 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0168',
    namespace: 'course',
    key: 'published',
    english: 'Published',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Опубликовано',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Nashr qilingan',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0212',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:149 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0169',
    namespace: 'course',
    key: 'courseNotFound',
    english: 'Course not found',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курс не найден',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs topilmadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0213',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:35 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0170',
    namespace: 'course',
    key: 'thisCourseDoesNotExistOr',
    english: 'This course does not exist or is no longer available.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Курс не существует или больше недоступен.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kurs mavjud emas yoki endi ochiq emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0214',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:36 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0171',
    namespace: 'course',
    key: 'returnToTheCourseCatalog',
    english: 'Return to the course catalog',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Вернуться в каталог курсов',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurslar katalogiga qaytish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0215',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:37 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0172',
    namespace: 'course',
    key: 'courseDetailsRecovered',
    english: 'Course details recovered.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сведения о курсе восстановлены.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tafsilotlari tiklandi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0216',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:64 — Page: course-detail-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0173',
    namespace: 'course',
    key: 'courseOutlineRecovered',
    english: 'Course outline recovered.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Структура курса восстановлена.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs tuzilmasi tiklandi.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0217',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:68 — Page: course-detail-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0174',
    namespace: 'course',
    key: 'noLessonDescriptionIsAvailable',
    english: 'No lesson description is available.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Описание урока отсутствует.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Dars tavsifi mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0219',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:49 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0484',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:236 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0175',
    namespace: 'course',
    key: 'draftMetadata',
    english: 'Draft metadata',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Данные черновика',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Qoralama ma’lumotlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0220',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:50 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0485',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:239 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0176',
    namespace: 'course',
    key: 'listed',
    english: 'Listed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'В списке',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ro‘yxatda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0221',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:50 — Page: course-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0177',
    namespace: 'auth',
    key: 'backToLogin',
    english: 'Back to login',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Вернуться ко входу',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kirishga qaytish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0224',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:19 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0400',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:26 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0406',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:79 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0178',
    namespace: 'auth',
    key: 'useYourResetLink',
    english: 'Use your reset link',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Используйте ссылку для сброса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Tiklash havolasidan foydalaning',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0225',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:22 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0179',
    namespace: 'auth',
    key: 'requestReceived',
    english: 'Request received',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Запрос получен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'So‘rov qabul qilindi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0226',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:27 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0180',
    namespace: 'auth',
    key: 'email',
    english: 'Email',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Электронная почта',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Elektron pochta',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0227',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:40 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0395',
        context: 'src/pages/login-page/LoginPage.tsx:48 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0418',
        context: 'src/pages/signup-page/SignupPage.tsx:44 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0181',
    namespace: 'auth',
    key: 'submittingRequest',
    english: 'Submitting request...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отправка запроса...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'So‘rov yuborilmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0228',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:52 — Page: forgot-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0223',
    namespace: 'learning',
    key: 'active',
    english: 'Active',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Активно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Faol',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0374',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:313 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0388',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:28 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0224',
    namespace: 'learning',
    key: 'cancelled',
    english: 'Cancelled',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отменено',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bekor qilingan',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0375',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:315 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0389',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:29 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0225',
    namespace: 'learning',
    key: 'paymentPending',
    english: 'Payment pending',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Платёж ожидается',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'To‘lov kutilmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0376',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:316 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0378',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:375 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0390',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:30 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0261',
    namespace: 'learning',
    key: 'mockPaymentDeclined',
    english: 'Mock payment declined',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Тестовый платёж отклонён',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Sinov to‘lovi rad etildi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0361',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:102 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0262',
    namespace: 'learning',
    key: 'paymentRemainsPending',
    english: 'Payment remains pending',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Платёж по-прежнему ожидается',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'To‘lov hanuz kutilmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0362',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:108 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0263',
    namespace: 'learning',
    key: 'paymentStatusNeedsChecking',
    english: 'Payment status needs checking',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Нужно проверить статус платежа',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'To‘lov holatini tekshirish kerak',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0363',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:114 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0264',
    namespace: 'learning',
    key: 'paymentUnavailable',
    english: 'Payment unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Оплата недоступна',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'To‘lov mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0365',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:127 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0366',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:133 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0265',
    namespace: 'learning',
    key: 'learningWorkspaceUnavailable',
    english: 'Learning workspace unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Пространство обучения недоступно',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim ish maydoni mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0368',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:231 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0371',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:282 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0373',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:300 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0266',
    namespace: 'learning',
    key: 'thisLearningWorkspaceIsUnavailable',
    english: 'This learning workspace is unavailable.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Это пространство обучения недоступно.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu ta’lim ish maydoni mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0369',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:232 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0372',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:283 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0267',
    namespace: 'learning',
    key: 'loadingLearningWorkspace',
    english: 'Loading learning workspace',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка пространства обучения',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim ish maydoni yuklanmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0370',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:240 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0268',
    namespace: 'learning',
    key: 'learningProgressUnavailable',
    english: 'Learning progress unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Прогресс обучения недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim jarayoni mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0379',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:376 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0269',
    namespace: 'learning',
    key: 'checkingPaymentStatus',
    english: 'Checking payment status…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверяем статус платежа…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'To‘lov holati tekshirilmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0380',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:392 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0270',
    namespace: 'learning',
    key: 'completingMockPayment',
    english: 'Completing mock payment…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Завершаем тестовый платёж…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Sinov to‘lovi yakunlanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0381',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:404 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0271',
    namespace: 'learning',
    key: 'learningProgressIsNotAvailableFor',
    english: 'Learning progress is not available for this enrollment.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Прогресс обучения недоступен для этой записи на курс.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kursga yozilish uchun ta’lim jarayoni mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0382',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:422 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0272',
    namespace: 'learning',
    key: 'mockPaymentSubmitted',
    english: 'Mock payment submitted',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Тестовый платёж отправлен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Sinov to‘lovi yuborildi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0383',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:95 — Page: learning-detail-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0273',
    namespace: 'learning',
    key: 'startYourLearningJourney',
    english: 'Start your learning journey',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Начните обучение',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim yo‘lingizni boshlang',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0384',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:152 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0274',
    namespace: 'learning',
    key: 'learningEnrollmentsPagination',
    english: 'Learning enrollments pagination',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Навигация по страницам обучения',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’limga yozilishlar sahifalari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0387',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:217 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0275',
    namespace: 'auth',
    key: 'logInWithAStudentAccount',
    english: 'Log in with a student account to view your cart and continue checkout.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Войдите с аккаунтом студента, чтобы открыть корзину и продолжить оформление.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Savatni ko‘rish va buyurtmani davom ettirish uchun talaba akkaunti bilan kiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0392',
        context: 'src/pages/login-page/LoginPage.tsx:28 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0276',
    namespace: 'auth',
    key: 'newToLearnhub',
    english: 'New to LearnHub?',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Впервые в LearnHub?',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'LearnHub’da yangimisiz?',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0394',
        context: 'src/pages/login-page/LoginPage.tsx:33 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0277',
    namespace: 'auth',
    key: 'password',
    english: 'Password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parol',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0396',
        context: 'src/pages/login-page/LoginPage.tsx:59 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0421',
        context: 'src/pages/signup-page/SignupPage.tsx:85 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0278',
    namespace: 'auth',
    key: 'loggingIn',
    english: 'Logging in...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Выполняется вход...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kirilmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0397',
        context: 'src/pages/login-page/LoginPage.tsx:73 — Page: login-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0279',
    namespace: 'auth',
    key: 'newPassword',
    english: 'New password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Новый пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yangi parol',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0401',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:38 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0280',
    namespace: 'auth',
    key: 'confirmNewPassword',
    english: 'Confirm new password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Подтвердите новый пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yangi parolni tasdiqlang',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0402',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:48 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0281',
    namespace: 'auth',
    key: 'resettingPassword',
    english: 'Resetting password...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сброс пароля...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parol tiklanmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0403',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:59 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0282',
    namespace: 'auth',
    key: 'passwordResetComplete',
    english: 'Password reset complete',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Пароль сброшен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parol tiklandi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0407',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:81 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0283',
    namespace: 'auth',
    key: 'logInWithYourNewPassword',
    english: 'Log in with your new password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Войти с новым паролем',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yangi parol bilan kirish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0408',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:83 — Page: reset-password-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0284',
    namespace: 'auth',
    key: 'roleOptions',
    english: 'Role options',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Варианты роли',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Rol variantlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0409',
        context: 'src/pages/signup-page/RolePicker.tsx:124 — Page: signup-page',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0285',
    namespace: 'auth',
    key: 'student',
    english: 'Student',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Студент',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Talaba',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0410',
        context: 'src/pages/signup-page/RolePicker.tsx:21 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0286',
    namespace: 'auth',
    key: 'admin',
    english: 'Admin',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Администратор',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Administrator',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0412',
        context: 'src/pages/signup-page/RolePicker.tsx:23 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0287',
    namespace: 'auth',
    key: 'role',
    english: 'Role',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Роль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Rol',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0413',
        context: 'src/pages/signup-page/RolePicker.tsx:84 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0288',
    namespace: 'auth',
    key: 'creatingAccount',
    english: 'Creating account...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Создание аккаунта...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Akkaunt yaratilmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0414',
        context: 'src/pages/signup-page/SignupPage.tsx:106 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0289',
    namespace: 'auth',
    key: 'alreadyHaveAnAccount',
    english: 'Already have an account?',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Уже есть аккаунт?',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Akkauntingiz bormi?',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0417',
        context: 'src/pages/signup-page/SignupPage.tsx:29 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0290',
    namespace: 'auth',
    key: 'firstName',
    english: 'First name',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Имя',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ism',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0419',
        context: 'src/pages/signup-page/SignupPage.tsx:56 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0291',
    namespace: 'auth',
    key: 'lastName',
    english: 'Last name',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Фамилия',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Familiya',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0420',
        context: 'src/pages/signup-page/SignupPage.tsx:67 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0292',
    namespace: 'auth',
    key: 'confirmPassword',
    english: 'Confirm password',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Подтвердите пароль',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Parolni tasdiqlang',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0422',
        context: 'src/pages/signup-page/SignupPage.tsx:95 — Page: signup-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0293',
    namespace: 'a11y',
    key: 'actionInProgress',
    english: 'Action in progress',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Действие выполняется',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amal bajarilmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0423',
        context: 'src/shared/ui/primitives/Button.tsx:22 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0294',
    namespace: 'a11y',
    key: 'actionCompleted',
    english: 'Action completed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Действие выполнено',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amal bajarildi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0424',
        context: 'src/shared/ui/primitives/Button.tsx:23 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0295',
    namespace: 'a11y',
    key: 'actionFailed',
    english: 'Action failed',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Не удалось выполнить действие',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amal bajarilmadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0425',
        context: 'src/shared/ui/primitives/Button.tsx:24 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0296',
    namespace: 'common',
    key: 'loading',
    english: 'Loading…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yuklanmoqda…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0426',
        context: 'src/shared/ui/primitives/Button.tsx:31 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0297',
    namespace: 'common',
    key: 'working',
    english: 'Working...',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Выполняется...',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bajarilmoqda...',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0427',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:28 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0298',
    namespace: 'common',
    key: 'cancel',
    english: 'Cancel',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отмена',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bekor qilish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0428',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0299',
    namespace: 'common',
    key: 'unableToCompleteAction',
    english: 'Unable to complete action',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Не удалось выполнить действие',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Amalni bajarib bo‘lmadi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0429',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:45 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0300',
    namespace: 'a11y',
    key: 'closeDialog',
    english: 'Close dialog',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Закрыть диалог',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Dialogni yopish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0430',
        context: 'src/shared/ui/primitives/Dialog.tsx:218 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0301',
    namespace: 'a11y',
    key: 'dismissNotification',
    english: 'Dismiss notification',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Закрыть уведомление',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bildirishnomani yopish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0431',
        context: 'src/shared/ui/primitives/Notice.tsx:21 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0302',
    namespace: 'a11y',
    key: 'goToPreviousPage',
    english: 'Go to previous page',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Перейти на предыдущую страницу',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Oldingi sahifaga o‘tish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0432',
        context: 'src/shared/ui/primitives/Pagination.tsx:108 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0303',
    namespace: 'common',
    key: 'previous',
    english: 'Previous',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Назад',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Oldingi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0433',
        context: 'src/shared/ui/primitives/Pagination.tsx:113 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0304',
    namespace: 'a11y',
    key: 'pageCurrentPage',
    english: 'Page {pageNumber}, current page',
    variables: ['pageNumber'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Страница {pageNumber}, текущая страница',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '{pageNumber}-sahifa, joriy sahifa',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0434',
        context: 'src/shared/ui/primitives/Pagination.tsx:130 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0436',
        context: 'src/shared/ui/primitives/Pagination.tsx:160 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0305',
    namespace: 'a11y',
    key: 'goToPage',
    english: 'Go to page {pageNumber}',
    variables: ['pageNumber'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Перейти на страницу {pageNumber}',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '{pageNumber}-sahifaga o‘tish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0435',
        context: 'src/shared/ui/primitives/Pagination.tsx:139 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0306',
    namespace: 'a11y',
    key: 'goToNextPage',
    english: 'Go to next page',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Перейти на следующую страницу',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Keyingi sahifaga o‘tish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0437',
        context: 'src/shared/ui/primitives/Pagination.tsx:171 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0307',
    namespace: 'common',
    key: 'next',
    english: 'Next',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Далее',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Keyingi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0438',
        context: 'src/shared/ui/primitives/Pagination.tsx:173 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0308',
    namespace: 'a11y',
    key: 'pagination',
    english: 'Pagination',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Постраничная навигация',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Sahifalash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0439',
        context: 'src/shared/ui/primitives/Pagination.tsx:50 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0309',
    namespace: 'a11y',
    key: 'loadingContent',
    english: 'Loading content',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Загрузка содержимого',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kontent yuklanmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0440',
        context: 'src/shared/ui/primitives/Skeleton.tsx:42 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0310',
    namespace: 'catalog',
    key: 'courseFilters',
    english: 'Course filters',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Фильтры курсов',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs filtrlari',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0441',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:121 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0311',
    namespace: 'catalog',
    key: 'min',
    english: 'Min',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Мин.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Min.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0442',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:140 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0312',
    namespace: 'catalog',
    key: 'minPrice',
    english: 'Min price',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Минимальная цена',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Minimal narx',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0443',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:146 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0313',
    namespace: 'catalog',
    key: 'max',
    english: 'Max',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Макс.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Maks.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0444',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:164 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0314',
    namespace: 'catalog',
    key: 'maxPrice',
    english: 'Max price',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Максимальная цена',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Maksimal narx',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0445',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0315',
    namespace: 'catalog',
    key: 'maximumPriceMustBeAtLeast',
    english: 'Maximum price must be at least the minimum price.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Максимальная цена должна быть не меньше минимальной.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Maksimal narx minimal narxdan kam bo‘lmasligi kerak.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0446',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:73 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0316',
    namespace: 'ai',
    key: 'closeCourseAssistant',
    english: 'Close course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Закрыть ассистента курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisini yopish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0450',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:163 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0317',
    namespace: 'ai',
    key: 'courseAssistantChat',
    english: 'Course assistant chat',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Чат с ассистентом курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi chati',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0454',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:70 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0318',
    namespace: 'ai',
    key: 'expandCourseAssistant',
    english: 'Expand course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Развернуть ассистента курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisini kengaytirish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0455',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:79 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0319',
    namespace: 'ai',
    key: 'courseAssistant0319',
    english: 'Course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0456',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:184 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0320',
    namespace: 'ai',
    key: 'askAQuestionAboutYourLearning',
    english: 'Ask a question about your learning.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Задайте вопрос о своём обучении.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’limingiz haqida savol bering.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0457',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:200 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0321',
    namespace: 'ai',
    key: 'askAQuestionAboutThisCourse',
    english: 'Ask a question about this course.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Задайте вопрос об этом курсе.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kurs haqida savol bering.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0458',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:201 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0322',
    namespace: 'ai',
    key: 'signInAgainBeforeUsingThe',
    english: 'Sign in again before using the assistant.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Войдите снова, прежде чем использовать ассистента.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchidan foydalanishdan oldin qayta kiring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0460',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:22 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0323',
    namespace: 'ai',
    key: 'messageTheCourseAssistant',
    english: 'Message the course assistant',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Написать ассистенту курса',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurs yordamchisiga yozish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0461',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:229 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0324',
    namespace: 'ai',
    key: 'askAboutCoursesLessonsOrLearning',
    english: 'Ask about courses, lessons, or learning…',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Спросите о курсах, уроках или обучении…',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Kurslar, darslar yoki ta’lim haqida so‘rang…',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0462',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:233 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0325',
    namespace: 'ai',
    key: 'checkTheMessageAndTryAgain',
    english: 'Check the message and try again.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверьте сообщение и повторите попытку.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Xabarni tekshirib, qayta urinib ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0463',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:24 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0326',
    namespace: 'ai',
    key: 'messageNeedsChecking',
    english: 'Message needs checking',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Проверьте сообщение',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Xabarni tekshirish kerak',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0464',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:24 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0327',
    namespace: 'ai',
    key: 'sendMessage',
    english: 'Send message',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отправить сообщение',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Xabar yuborish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0465',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:243 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0328',
    namespace: 'ai',
    key: 'sendingMessage',
    english: 'Sending message',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отправка сообщения',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Xabar yuborilmoqda',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0466',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:246 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0329',
    namespace: 'ai',
    key: 'assistantTemporarilyUnavailable',
    english: 'Assistant temporarily unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент временно недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi vaqtincha mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0467',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:27 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0330',
    namespace: 'ai',
    key: 'theAssistantIsTemporarilyUnavailable',
    english: 'The assistant is temporarily unavailable.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент временно недоступен.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi vaqtincha mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0468',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:28 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0331',
    namespace: 'ai',
    key: 'assistantUnavailable0331',
    english: 'Assistant unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0469',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0332',
    namespace: 'ai',
    key: 'theAssistantIsUnavailable',
    english: 'The assistant is unavailable.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Ассистент недоступен.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yordamchi mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0470',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0333',
    namespace: 'learning',
    key: 'completeLesson',
    english: 'Complete lesson',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Завершить урок',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Darsni yakunlash',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0471',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:114 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0334',
    namespace: 'learning',
    key: 'undoCompletion',
    english: 'Undo completion',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Отменить завершение',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Yakunlashni bekor qilish',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0472',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:114 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0335',
    namespace: 'learning',
    key: 'learningProgressIsUnavailable',
    english: 'Learning progress is unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Прогресс обучения недоступен',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim jarayoni mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0473',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:142 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0336',
    namespace: 'learning',
    key: 'tryAgainToLoadThisWorkspace',
    english: 'Try again to load this workspace.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Повторите загрузку этого пространства.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu ish maydonini qayta yuklab ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0474',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:143 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0337',
    namespace: 'learning',
    key: 'lessonOutlineIsUnavailable',
    english: 'Lesson outline is unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Структура уроков недоступна',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Darslar tuzilmasi mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0475',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0338',
    namespace: 'learning',
    key: 'progressSummaryIsUnavailable',
    english: 'Progress summary is unavailable',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Сводка прогресса недоступна',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Jarayon xulosasi mavjud emas',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0476',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0339',
    namespace: 'learning',
    key: 'tryAgainToLoadYourProgress',
    english: 'Try again to load your progress summary.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Повторите загрузку сводки прогресса.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Jarayon xulosasini qayta yuklab ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0477',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:175 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0340',
    namespace: 'learning',
    key: 'tryAgainToLoadTheLesson',
    english: 'Try again to load the lesson outline.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Повторите загрузку структуры уроков.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Darslar tuzilmasini qayta yuklab ko‘ring.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0478',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:176 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0341',
    namespace: 'learning',
    key: 'learningProgress',
    english: 'Learning progress',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Прогресс обучения',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ta’lim jarayoni',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0479',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:187 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0342',
    namespace: 'learning',
    key: 'ofCompleted',
    english: '{completedLessons} of {totalLessons} {lessonsLabel} completed',
    variables: ['completedLessons', 'lessonsLabel', 'totalLessons'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Завершено: {completedLessons} из {totalLessons} {lessonsLabel}',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: '{totalLessons} ta {lessonsLabel}dan {completedLessons} tasi yakunlandi',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0480',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:189 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0343',
    namespace: 'learning',
    key: 'ofCompleted0343',
    english: '{completedLessons} of {totalLessons} {lessonsLabel} completed, {progressPercentage}%',
    variables: ['completedLessons', 'lessonsLabel', 'progressPercentage', 'totalLessons'],
    resourceStatus: 'Draft',
    russian: {
      value:
        'Завершено: {completedLessons} из {totalLessons} {lessonsLabel}, {progressPercentage}%',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value:
        '{totalLessons} ta {lessonsLabel}dan {completedLessons} tasi yakunlandi, {progressPercentage}%',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0481',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:198 — Shared UI',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0344',
    namespace: 'learning',
    key: 'lessons',
    english: 'Lessons ({totalLessons})',
    variables: ['totalLessons'],
    resourceStatus: 'Draft',
    russian: {
      value: 'Уроки ({totalLessons})',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Darslar ({totalLessons})',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0482',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:205 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0345',
    namespace: 'learning',
    key: 'noLessonMetadataIsAvailableFor',
    english: 'No lesson metadata is available for this course.',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Для этого курса нет данных об уроках.',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Bu kurs uchun dars ma’lumotlari mavjud emas.',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0483',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:214 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
  {
    unitId: 'MLUX-C0346',
    namespace: 'learning',
    key: 'listedMetadata',
    english: 'Listed metadata',
    variables: [],
    resourceStatus: 'Draft',
    russian: {
      value: 'Опубликованные данные',
      resource: 'Draft',
      review: 'Pending',
    },
    uzbek: {
      value: 'Ro‘yxatdagi ma’lumotlar',
      resource: 'Draft',
      review: 'Pending',
    },
    ownerTask: 'MLUX-004',
    occurrences: [
      {
        id: 'O0486',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:239 — Shared UI',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  },
] as const;

// DRAFT-12 supplemental corpus approved by MLUX004-D04. This remains test-owned
// and intentionally does not import the runtime mapping or resources.
export const MLUX_004_DRAFT12_EXISTING_OCCURRENCES: Readonly<
  Record<string, readonly Mlux004Draft11Occurrence[]>
> = {
  'MLUX-C0006': [
    {
      id: 'O0487',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:108 — Page: learning-list-page',
      classification: 'Visible UI copy',
      ownerTask: 'MLUX-004',
    },
    {
      id: 'O0489',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:123 — Page: learning-list-page',
      classification: 'Visible UI copy',
      ownerTask: 'MLUX-004',
    },
  ],
  'MLUX-C0059': [
    {
      id: 'O0502',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:133 — Visible UI copy',
      classification: 'Visible UI copy',
      ownerTask: 'MLUX-004',
    },
  ],
};

function supplementalUnit(
  unitId: string,
  namespace: Mlux004Draft11Namespace,
  key: string,
  english: string,
  russian: string,
  uzbek: string,
  occurrences: readonly Mlux004Draft11Occurrence[],
  variables: readonly string[] = [],
): Mlux004Draft11Unit {
  return {
    unitId,
    namespace,
    key,
    english,
    variables,
    resourceStatus: 'Draft',
    russian: { value: russian, resource: 'Draft', review: 'Pending' },
    uzbek: { value: uzbek, resource: 'Draft', review: 'Pending' },
    ownerTask: 'MLUX-004',
    occurrences,
  };
}

export const MLUX_004_DRAFT12_SUPPLEMENTAL_PROJECTION: readonly Mlux004Draft11Unit[] = [
  supplementalUnit(
    'MLUX-C0347',
    'learning',
    'loadingYourLearning',
    'Loading your learning',
    'Загрузка обучения',
    'Ta’lim yuklanmoqda',
    [
      {
        id: 'O0488',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:111 — Accessibility only',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0348',
    'learning',
    'noCoursesEnrolledYet',
    'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',
    'Вы ещё не записались ни на один курс. Откройте каталог и выберите свой первый курс.',
    'Siz hali hech qaysi kursga yozilmadingiz. Katalogni ochib, ilk kursingizni tanlang.',
    [
      {
        id: 'O0490',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:161 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0349',
    'learning',
    'browseCourses',
    'Browse courses',
    'Смотреть курсы',
    'Kurslarni ko‘rish',
    [
      {
        id: 'O0491',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:165 — Page: learning-list-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0350',
    'learning',
    'enrollmentSummary',
    '{total} enrollment{suffix} · Page {page} of {pages}',
    'Записей на курсы: {total} · Страница {page} из {pages}',
    'Kurslarga yozilishlar: {total} · {page}-sahifa, jami {pages} ta',
    [
      {
        id: 'O0492',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:194 — Accessibility only',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
    ['page', 'pages', 'suffix', 'total'],
  ),
  supplementalUnit(
    'MLUX-C0351',
    'learning',
    'openCourse',
    'Open course',
    'Открыть курс',
    'Kursni ochish',
    [
      {
        id: 'O0493',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:212 — Visible UI copy',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit('MLUX-C0352', 'ai', 'thinking', 'Thinking…', 'Думаю…', 'O‘ylanmoqda…', [
    {
      id: 'O0494',
      context: 'src/widgets/course-chat/CourseChatPanel.tsx:112 — Accessibility only',
      classification: 'Accessibility only',
      ownerTask: 'MLUX-004',
    },
  ]),
  supplementalUnit(
    'MLUX-C0353',
    'ai',
    'couldntGenerateResponse',
    'Couldn’t generate a response.',
    'Не удалось сгенерировать ответ.',
    'Javobni yaratib bo‘lmadi.',
    [
      {
        id: 'O0495',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:127 — Visible UI copy',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0354',
    'catalog',
    'browseCoursesCraftedByIndustry',
    'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',
    'Изучайте курсы от экспертов отрасли. Развивайте карьеру в технологиях, дизайне, бизнесе и управлении.',
    'Soha mutaxassislari yaratgan kurslarni o‘rganing. Texnologiya, dizayn, biznes va boshqaruvda karyerangizni rivojlantiring.',
    [
      {
        id: 'O0496',
        context: 'src/pages/catalog-page/CatalogPage.tsx:335 — Page: catalog-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0355',
    'cart',
    'browseCourses',
    'Browse courses',
    'Смотреть курсы',
    'Kurslarni ko‘rish',
    [
      {
        id: 'O0497',
        context: 'src/pages/cart-page/CartPage.tsx:251 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0498',
        context: 'src/pages/cart-page/CartPage.tsx:490 — Page: cart-page',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0356',
    'catalog',
    'priceUnavailable',
    'Price unavailable',
    'Цена недоступна',
    'Narx mavjud emas',
    [
      {
        id: 'O0499',
        context: 'src/pages/catalog-page/course-card-presentation.ts:44 — Visible UI copy',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0500',
        context: 'src/pages/catalog-page/course-card-presentation.ts:53 — Visible UI copy',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit(
    'MLUX-C0357',
    'course',
    'courseAction',
    'Course action',
    'Действия с курсом',
    'Kurs amallari',
    [
      {
        id: 'O0501',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:104 — Accessibility only',
        classification: 'Accessibility only',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
];

export const MLUX_004_DRAFT12_PROJECTION: readonly Mlux004Draft11Unit[] = [
  ...MLUX_004_DRAFT11_PROJECTION.map((unit) => ({
    ...unit,
    occurrences: [
      ...unit.occurrences,
      ...(MLUX_004_DRAFT12_EXISTING_OCCURRENCES[unit.unitId] ?? []),
    ],
  })),
  ...MLUX_004_DRAFT12_SUPPLEMENTAL_PROJECTION,
];

const MLUX_004_DRAFT17_SUPPLEMENTAL_PROJECTION: readonly Mlux004Draft11Unit[] = [
  supplementalUnit(
    'MLUX-C0366',
    'catalog',
    'priceRange',
    'Price range',
    'Диапазон цен',
    'Narx oralig‘i',
    [
      {
        id: 'O0512',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:135 — Visible UI copy',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ],
  ),
  supplementalUnit('MLUX-C0367', 'catalog', 'priceLabel', 'Price:', 'Цена:', 'Narx:', [
    {
      id: 'O0513',
      context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:141 — Visible UI copy',
      classification: 'Visible UI copy',
      ownerTask: 'MLUX-004',
    },
  ]),
  supplementalUnit('MLUX-C0368', 'catalog', 'price', 'price', 'цена', 'narx', [
    {
      id: 'O0514',
      context:
        'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:147 — Accessibility only (minimum price suffix)',
      classification: 'Accessibility only',
      ownerTask: 'MLUX-004',
    },
    {
      id: 'O0515',
      context:
        'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:171 — Accessibility only (maximum price suffix)',
      classification: 'Accessibility only',
      ownerTask: 'MLUX-004',
    },
  ]),
];

export const MLUX_004_DRAFT17_PROJECTION: readonly Mlux004Draft11Unit[] = [
  ...MLUX_004_DRAFT12_PROJECTION,
  ...MLUX_004_DRAFT17_SUPPLEMENTAL_PROJECTION,
];
