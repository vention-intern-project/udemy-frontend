import type { Locale } from './types';

export type LocaleNamespace =
  | 'common'
  | 'navigation'
  | 'auth'
  | 'routes'
  | 'a11y'
  | 'catalog'
  | 'course'
  | 'cart'
  | 'learning'
  | 'ai'
  | 'instructor';

export const LOCALE_OWNER_TASKS = ['MLUX-002', 'MLUX-003', 'MLUX-004', 'MLUX-005'] as const;

export type LocaleOwnerTask = (typeof LOCALE_OWNER_TASKS)[number];

export type LocaleOccurrenceClassification =
  | 'Accessibility only'
  | 'Visible UI copy'
  | 'Visible UI copy + accessibility label';

interface LocaleOccurrenceInput {
  readonly id: string;
  readonly context: string;
  readonly classification?: LocaleOccurrenceClassification;
}

export interface LocaleOccurrence {
  readonly id: string;
  readonly context: string;
  readonly classification?: LocaleOccurrenceClassification;
  readonly ownerTask: LocaleOwnerTask;
}

export interface Mlux002SharedOccurrence extends LocaleOccurrence {
  readonly unitId: string;
  readonly ownerTask: 'MLUX-002';
}

export interface Mlux004SharedOccurrence extends LocaleOccurrence {
  readonly unitId: string;
  readonly ownerTask: 'MLUX-004';
}

export interface LocaleResourceReviewStatus {
  readonly resource: 'Draft';
  readonly review: 'Pending';
}

export type LocalePlaceholderContract = Readonly<Record<Locale, readonly string[]>>;

export interface LocaleMappingRecord {
  readonly unitId: string;
  readonly namespace: LocaleNamespace;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly placeholdersByLocale?: LocalePlaceholderContract;
  readonly plural: boolean;
  readonly resourceStatus: 'Draft';
  readonly russian: LocaleResourceReviewStatus;
  readonly uzbek: LocaleResourceReviewStatus;
  readonly ownerTask: LocaleOwnerTask;
  readonly occurrences: readonly LocaleOccurrence[];
}

function record(
  unitId: string,
  namespace: LocaleNamespace,
  key: string,
  english: string,
  variables: readonly string[],
  occurrences: readonly LocaleOccurrenceInput[],
): LocaleMappingRecord {
  return {
    unitId,
    namespace,
    key,
    english,
    variables,
    plural: false,
    resourceStatus: 'Draft',
    russian: { resource: 'Draft', review: 'Pending' },
    uzbek: { resource: 'Draft', review: 'Pending' },
    ownerTask: 'MLUX-002',
    occurrences: occurrences.map((occurrence) => ({ ...occurrence, ownerTask: 'MLUX-002' })),
  };
}

export const MLUX_002_RUNTIME_MAPPING: readonly LocaleMappingRecord[] = [
  record(
    'MLUX-C0001',
    'a11y',
    'accountMenu',
    'Account menu for {{identity}}',
    ['identity'],
    [{ id: 'O0001', context: 'AccountMenu aria-label' }],
  ),
  record(
    'MLUX-C0002',
    'a11y',
    'accountDetails',
    'Account details for {{identity}}',
    ['identity'],
    [{ id: 'O0002', context: 'AccountMenu aria-label' }],
  ),
  record(
    'MLUX-C0003',
    'navigation',
    'catalog',
    'Catalog',
    [],
    [
      {
        id: 'O0003',
        context:
          'src/app/layouts/app-shell-navigation.ts:49 — AppShell / anonymous navigation declaration',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0006',
        context:
          'src/app/layouts/app-shell-navigation.ts:74 — AppShell / student navigation declaration',
        classification: 'Visible UI copy',
      },
      { id: 'O0010', context: 'AppShell JSX' },
      { id: 'O0014', context: 'AppShell JSX' },
      {
        id: 'O0528',
        context:
          'src/app/layouts/AppShell.tsx:287 — AppShell / NavigationLinks desktop and compact consumer',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0004',
    'navigation',
    'logIn',
    'Log in',
    [],
    [
      {
        id: 'O0004',
        context:
          'src/app/layouts/app-shell-navigation.ts:56 — AppShell / anonymous navigation declaration',
        classification: 'Visible UI copy',
      },
      { id: 'O0015', context: 'AppShell JSX' },
      {
        id: 'O0529',
        context:
          'src/app/layouts/AppShell.tsx:287 — AppShell / NavigationLinks desktop and compact consumer',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0005',
    'navigation',
    'signUp',
    'Sign up',
    [],
    [
      {
        id: 'O0005',
        context:
          'src/app/layouts/app-shell-navigation.ts:63 — AppShell / anonymous navigation declaration',
        classification: 'Visible UI copy',
      },
      { id: 'O0016', context: 'AppShell JSX' },
      {
        id: 'O0530',
        context:
          'src/app/layouts/AppShell.tsx:287 — AppShell / NavigationLinks desktop and compact consumer',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0006',
    'navigation',
    'myLearning',
    'My learning',
    [],
    [
      {
        id: 'O0007',
        context:
          'src/app/layouts/app-shell-navigation.ts:80 — AppShell / student navigation declaration',
        classification: 'Visible UI copy',
      },
      { id: 'O0011', context: 'AppShell JSX' },
      {
        id: 'O0531',
        context:
          'src/app/layouts/AppShell.tsx:287 — AppShell / NavigationLinks desktop and compact consumer',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0007',
    'navigation',
    'instructorCourses',
    'Instructor courses',
    [],
    [
      {
        id: 'O0008',
        context:
          'src/app/layouts/app-shell-navigation.ts:86 — AppShell / instructor navigation declaration',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0532',
        context: 'src/app/layouts/AppShell.tsx:287 — AppShell / NavigationLinks desktop consumer',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0533',
        context:
          'src/app/layouts/AppShell.tsx:865 — AppShell / NavigationLinks instructor compact-menu consumer',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0008',
    'a11y',
    'openAiAssistant',
    'Open AI assistant',
    [],
    [{ id: 'O0009', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0009',
    'common',
    'aiChat',
    'AI chat',
    [],
    [{ id: 'O0012', context: 'AppShell JSX' }],
  ),
  record(
    'MLUX-C0010',
    'common',
    'cart',
    'Cart',
    [],
    [
      { id: 'O0013', context: 'AppShell JSX' },
      { id: 'O0017', context: 'AppShell literal' },
    ],
  ),
  record(
    'MLUX-C0011',
    'a11y',
    'cart',
    'Cart ({{cartCount}})',
    ['cartCount'],
    [{ id: 'O0018', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0012',
    'a11y',
    'primaryNavigation',
    'Primary navigation',
    [],
    [{ id: 'O0019', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0013',
    'a11y',
    'courseCatalogSearch',
    'Course catalog search',
    [],
    [{ id: 'O0020', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0014',
    'a11y',
    'searchCourses',
    'Search courses',
    [],
    [{ id: 'O0021', context: 'AppShell assistive JSX' }],
  ),
  record(
    'MLUX-C0015',
    'common',
    'searchCoursesPlaceholder',
    'Search courses, topics, or instructors',
    [],
    [{ id: 'O0022', context: 'AppShell placeholder' }],
  ),
  record(
    'MLUX-C0016',
    'a11y',
    'recentSearches',
    'Recent searches',
    [],
    [{ id: 'O0023', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0017',
    'common',
    'menu',
    'Menu',
    [],
    [
      { id: 'O0024', context: 'AppShell JSX' },
      { id: 'O0028', context: 'AppShell JSX' },
    ],
  ),
  record(
    'MLUX-C0018',
    'a11y',
    'closeNavigation',
    'Close navigation',
    [],
    [
      { id: 'O0025', context: 'AppShell assistive JSX' },
      { id: 'O0029', context: 'AppShell assistive JSX' },
    ],
  ),
  record(
    'MLUX-C0019',
    'a11y',
    'openNavigation',
    'Open navigation',
    [],
    [
      { id: 'O0026', context: 'AppShell assistive JSX' },
      { id: 'O0030', context: 'AppShell assistive JSX' },
    ],
  ),
  record(
    'MLUX-C0020',
    'a11y',
    'accountNavigation',
    'Account navigation',
    [],
    [{ id: 'O0027', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0021',
    'a11y',
    'mobileNavigation',
    'Mobile navigation',
    [],
    [{ id: 'O0031', context: 'AppShell aria-label' }],
  ),
  record(
    'MLUX-C0022',
    'common',
    'footerCopyright',
    '(c) 2026 LearnHub',
    [],
    [{ id: 'O0032', context: 'AppShell JSX' }],
  ),
  record(
    'MLUX-C0023',
    'common',
    'footerTagline',
    'Accessible learning, built for every role.',
    [],
    [{ id: 'O0033', context: 'AppShell JSX' }],
  ),
  record(
    'MLUX-C0369',
    'auth',
    'logOut',
    'Log out',
    [],
    [
      {
        id: 'O0521',
        context: 'src/app/layouts/AccountMenu.tsx:219 — AppShell / authenticated account menu',
        classification: 'Visible UI copy',
      },
    ],
  ),
  record(
    'MLUX-C0370',
    'a11y',
    'studentNavigation',
    'Student navigation',
    [],
    [
      {
        id: 'O0522',
        context: 'src/app/layouts/AppShell.tsx:194 — AppShell / student compact navigation',
        classification: 'Accessibility only',
      },
    ],
  ),
  record(
    'MLUX-C0371',
    'a11y',
    'anonymousNavigation',
    'Anonymous navigation',
    [],
    [
      {
        id: 'O0523',
        context: 'src/app/layouts/AppShell.tsx:238 — AppShell / anonymous compact navigation',
        classification: 'Accessibility only',
      },
    ],
  ),
  record(
    'MLUX-C0372',
    'a11y',
    'skipToMainContent',
    'Skip to main content',
    [],
    [
      {
        id: 'O0524',
        context: 'src/app/layouts/AppShell.tsx:585 — AppShell / global skip link',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  ),
  record(
    'MLUX-C0373',
    'a11y',
    'learnHubHome',
    'LearnHub home',
    [],
    [
      {
        id: 'O0525',
        context: 'src/app/layouts/AppShell.tsx:609 — AppShell / brand home link',
        classification: 'Accessibility only',
      },
    ],
  ),
];

export const MLUX_002_SHARED_OCCURRENCES: readonly Mlux002SharedOccurrence[] = [
  {
    id: 'O0526',
    unitId: 'MLUX-C0229',
    context: 'src/app/layouts/AppShell.tsx:754 — AppShell / instructor desktop header action',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-002',
  },
  {
    id: 'O0527',
    unitId: 'MLUX-C0229',
    context: 'src/app/layouts/AppShell.tsx:876 — AppShell / instructor compact navigation action',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-002',
  },
];

export const MLUX_004_SHARED_OCCURRENCES: readonly Mlux004SharedOccurrence[] = [
  {
    id: 'O0552',
    unitId: 'MLUX-C0010',
    context: 'src/pages/cart-page/CartPage.tsx:412 — DRAFT-20 residual context',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-004',
  },
  {
    id: 'O0554',
    unitId: 'MLUX-C0010',
    context: 'src/pages/cart-page/CartPage.tsx:442 — DRAFT-20 residual context',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-004',
  },
  {
    id: 'O0556',
    unitId: 'MLUX-C0010',
    context: 'src/pages/cart-page/CartPage.tsx:522 — DRAFT-20 residual context',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-004',
  },
  {
    id: 'O0557',
    unitId: 'MLUX-C0010',
    context: 'src/pages/cart-page/CartPage.tsx:528 — DRAFT-20 residual context',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-004',
  },
  {
    id: 'O0561',
    unitId: 'MLUX-C0194',
    context: 'src/pages/cart-page/CartPage.tsx:597 — DRAFT-20 residual context',
    classification: 'Visible UI copy',
    ownerTask: 'MLUX-004',
  },
  {
    id: 'O0596',
    unitId: 'MLUX-C0008',
    context: 'src/widgets/course-chat/CourseChatLauncher.tsx:151 — DRAFT-20 residual context',
    classification: 'Accessibility only',
    ownerTask: 'MLUX-004',
  },
];

function mlux003Record(
  unitId: string,
  namespace: LocaleNamespace,
  key: string,
  english: string,
  occurrences: readonly LocaleOccurrenceInput[],
  variables: readonly string[] = [],
): LocaleMappingRecord {
  return {
    unitId,
    namespace,
    key,
    english,
    variables,
    plural: false,
    resourceStatus: 'Draft',
    russian: { resource: 'Draft', review: 'Pending' },
    uzbek: { resource: 'Draft', review: 'Pending' },
    ownerTask: 'MLUX-003',
    occurrences: occurrences.map((occurrence) => ({ ...occurrence, ownerTask: 'MLUX-003' })),
  };
}

export const MLUX_003_RUNTIME_MAPPING: readonly LocaleMappingRecord[] = [
  mlux003Record('MLUX-C0004', 'navigation', 'logIn', 'Log in', [
    { id: 'O0054', context: 'PAGE-004 title' },
  ]),
  mlux003Record('MLUX-C0006', 'navigation', 'myLearning', 'My learning', [
    { id: 'O0062', context: 'PAGE-008 title' },
  ]),
  mlux003Record('MLUX-C0007', 'navigation', 'instructorCourses', 'Instructor courses', [
    { id: 'O0040', context: 'PAGE-010 title' },
  ]),
  mlux003Record('MLUX-C0010', 'common', 'cart', 'Cart', [
    { id: 'O0060', context: 'PAGE-007 title' },
  ]),
  mlux003Record('MLUX-C0037', 'routes', 'courseCatalogTitle', 'Course catalog', [
    { id: 'O0048', context: 'PAGE-001 title' },
  ]),
  mlux003Record(
    'MLUX-C0038',
    'routes',
    'courseCatalogDescription',
    'Browse and discover available courses.',
    [{ id: 'O0049', context: 'PAGE-001 description' }],
  ),
  mlux003Record('MLUX-C0039', 'routes', 'courseDetailsTitle', 'Course details', [
    { id: 'O0050', context: 'PAGE-002 title' },
  ]),
  mlux003Record(
    'MLUX-C0040',
    'routes',
    'courseDetailsDescription',
    'Review course information and lessons.',
    [{ id: 'O0051', context: 'PAGE-002 description' }],
  ),
  mlux003Record('MLUX-C0041', 'routes', 'createAccountTitle', 'Create account', [
    { id: 'O0052', context: 'PAGE-003 title' },
  ]),
  mlux003Record(
    'MLUX-C0042',
    'routes',
    'createAccountDescription',
    'Create a LearnHub account to start learning or teaching.',
    [{ id: 'O0053', context: 'PAGE-003 description' }],
  ),
  mlux003Record(
    'MLUX-C0043',
    'routes',
    'loginDescription',
    'Access your learning or instructor workspace.',
    [{ id: 'O0055', context: 'PAGE-004 description' }],
  ),
  mlux003Record('MLUX-C0044', 'routes', 'forgotPasswordTitle', 'Forgot password', [
    { id: 'O0056', context: 'PAGE-005 title' },
  ]),
  mlux003Record(
    'MLUX-C0045',
    'routes',
    'forgotPasswordDescription',
    'Request help signing back in to your account.',
    [{ id: 'O0057', context: 'PAGE-005 description' }],
  ),
  mlux003Record('MLUX-C0046', 'routes', 'resetPasswordTitle', 'Reset password', [
    { id: 'O0058', context: 'PAGE-006 title' },
  ]),
  mlux003Record(
    'MLUX-C0047',
    'routes',
    'resetPasswordDescription',
    'Choose a new password for your account.',
    [{ id: 'O0059', context: 'PAGE-006 description' }],
  ),
  mlux003Record(
    'MLUX-C0048',
    'routes',
    'cartDescription',
    'Your selected courses will appear here.',
    [{ id: 'O0061', context: 'PAGE-007 description' }],
  ),
  mlux003Record(
    'MLUX-C0049',
    'routes',
    'myLearningDescription',
    'Your course enrollments will appear here.',
    [{ id: 'O0063', context: 'PAGE-008 description' }],
  ),
  mlux003Record('MLUX-C0024', 'routes', 'learningDetailsTitle', 'Learning details', [
    { id: 'O0034', context: 'PAGE-009 title' },
  ]),
  mlux003Record(
    'MLUX-C0025',
    'routes',
    'learningDetailsDescription',
    'Course progress and lessons will appear here.',
    [{ id: 'O0035', context: 'PAGE-009 description' }],
  ),
  mlux003Record('MLUX-C0026', 'routes', 'courseAssistantTitle', 'Course assistant', [
    { id: 'O0036', context: 'PAGE-014 title' },
  ]),
  mlux003Record(
    'MLUX-C0027',
    'routes',
    'courseAssistantDescription',
    'Ask questions about an active course.',
    [{ id: 'O0037', context: 'PAGE-014 description' }],
  ),
  mlux003Record('MLUX-C0028', 'routes', 'aiAssistantTitle', 'AI assistant', [
    { id: 'O0038', context: 'PAGE-015 title' },
  ]),
  mlux003Record(
    'MLUX-C0029',
    'routes',
    'aiAssistantDescription',
    'Ask general learning questions.',
    [{ id: 'O0039', context: 'PAGE-015 description' }],
  ),
  mlux003Record(
    'MLUX-C0030',
    'routes',
    'instructorCoursesDescription',
    'Your authored courses will appear here.',
    [{ id: 'O0041', context: 'PAGE-010 description' }],
  ),
  mlux003Record('MLUX-C0031', 'routes', 'editCourseTitle', 'Edit course', [
    { id: 'O0042', context: 'PAGE-011 title' },
  ]),
  mlux003Record(
    'MLUX-C0032',
    'routes',
    'editCourseDescription',
    'Course and lesson editing will appear here.',
    [{ id: 'O0043', context: 'PAGE-011 description' }],
  ),
  mlux003Record('MLUX-C0033', 'routes', 'courseEnrollmentsTitle', 'Course enrollments', [
    { id: 'O0044', context: 'PAGE-012 title' },
  ]),
  mlux003Record(
    'MLUX-C0034',
    'routes',
    'courseEnrollmentsDescription',
    'The selected course roster will appear here.',
    [{ id: 'O0045', context: 'PAGE-012 description' }],
  ),
  mlux003Record('MLUX-C0035', 'routes', 'editLessonTitle', 'Edit lesson', [
    { id: 'O0046', context: 'PAGE-013 title' },
  ]),
  mlux003Record(
    'MLUX-C0036',
    'routes',
    'editLessonDescription',
    'Lesson metadata and upload tools will appear here.',
    [{ id: 'O0047', context: 'PAGE-013 description' }],
  ),
  mlux003Record(
    'MLUX-C0050',
    'routes',
    'renderErrorDocumentTitle',
    'Something went wrong | LearnHub',
    [{ id: 'O0064', context: 'document title' }],
  ),
  mlux003Record(
    'MLUX-C0051',
    'routes',
    'bootstrapDocumentTitle',
    'Preparing your workspace | LearnHub',
    [{ id: 'O0065', context: 'document title' }],
  ),
  mlux003Record(
    'MLUX-C0052',
    'routes',
    'sessionErrorDocumentTitle',
    'Session check failed | LearnHub',
    [{ id: 'O0066', context: 'document title' }],
  ),
  mlux003Record(
    'MLUX-C0053',
    'routes',
    'pageDocumentTitle',
    '{{pageTitle}} | LearnHub',
    [{ id: 'O0067', context: 'document title' }],
    ['pageTitle'],
  ),
  mlux003Record('MLUX-C0054', 'routes', 'notFoundDocumentTitle', 'Page not found | LearnHub', [
    { id: 'O0068', context: 'document title' },
  ]),
  mlux003Record('MLUX-C0055', 'routes', 'bootstrapHeading', 'Preparing your workspace', [
    { id: 'O0069', context: 'BootstrapState' },
  ]),
  mlux003Record('MLUX-C0056', 'routes', 'bootstrapDescription', 'We are verifying your session.', [
    { id: 'O0070', context: 'BootstrapState' },
  ]),
  mlux003Record('MLUX-C0057', 'routes', 'bootstrapLoadingLabel', 'Loading application', [
    { id: 'O0071', context: 'BootstrapState' },
  ]),
  mlux003Record('MLUX-C0058', 'routes', 'sessionErrorHeading', 'Session check failed', [
    { id: 'O0072', context: 'SessionErrorState' },
  ]),
  mlux003Record('MLUX-C0059', 'routes', 'tryAgain', 'Try again', [
    { id: 'O0073', context: 'SessionErrorState' },
    { id: 'O0076', context: 'RenderErrorState' },
  ]),
  mlux003Record('MLUX-C0060', 'routes', 'renderErrorHeading', 'Something went wrong', [
    { id: 'O0074', context: 'RenderErrorState' },
  ]),
  mlux003Record(
    'MLUX-C0061',
    'routes',
    'renderErrorDescription',
    'We could not display this page. Try again or return to the catalog.',
    [{ id: 'O0075', context: 'RenderErrorState' }],
  ),
  mlux003Record('MLUX-C0062', 'routes', 'forbiddenHeading', 'You do not have access to this page', [
    { id: 'O0077', context: 'ForbiddenState' },
  ]),
  mlux003Record(
    'MLUX-C0063',
    'routes',
    'forbiddenDescription',
    'Use an account with the required role, or return to the catalog.',
    [{ id: 'O0078', context: 'ForbiddenState' }],
  ),
  mlux003Record('MLUX-C0064', 'routes', 'notFoundHeading', 'Page not found', [
    { id: 'O0079', context: 'NotFoundState' },
  ]),
  mlux003Record(
    'MLUX-C0065',
    'routes',
    'notFoundDescription',
    'The address may be incorrect, or the page may have moved.',
    [{ id: 'O0080', context: 'NotFoundState' }],
  ),
  mlux003Record(
    'MLUX-003-S001',
    'routes',
    'sessionErrorNoticeTitle',
    'Unable to start the application',
    [{ id: 'MLUX-003-SO001', context: 'SessionErrorState notice title' }],
  ),
  mlux003Record(
    'MLUX-003-S002',
    'routes',
    'sessionErrorNoticeDescription',
    'We could not verify your session. Check your connection and try again.',
    [{ id: 'MLUX-003-SO002', context: 'SessionErrorState notice copy' }],
  ),
  mlux003Record('MLUX-003-S003', 'routes', 'backToCatalog', 'Back to catalog', [
    { id: 'MLUX-003-SO003', context: 'RenderErrorState' },
    { id: 'MLUX-003-SO004', context: 'ForbiddenState' },
    { id: 'MLUX-003-SO005', context: 'NotFoundState' },
  ]),
];

export interface Mlux004TranslationEntry {
  readonly unitId: string;
  readonly en: string;
  readonly ru: string;
  readonly uz: string;
}

interface Mlux004WorkbookUnit {
  readonly unitId: string;
  readonly namespace: LocaleNamespace;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly plural?: boolean;
  readonly placeholdersByLocale?: LocalePlaceholderContract;
  readonly occurrences: readonly LocaleOccurrenceInput[];
  readonly translations: Omit<Mlux004TranslationEntry, 'unitId'>;
}

const MLUX_004_WORKBOOK_UNITS: readonly Mlux004WorkbookUnit[] = [
  {
    unitId: 'MLUX-C0003',
    namespace: 'navigation',
    key: 'catalog',
    english: 'Catalog',
    variables: [],
    occurrences: [
      {
        id: 'O0160',
        context: 'src/pages/cart-page/CartPage.tsx:61 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0174',
        context: 'src/pages/cart-page/CartPage.tsx:90 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0385',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:175 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Catalog',
      ru: 'Каталог',
      uz: 'Katalog',
    },
  },
  {
    unitId: 'MLUX-C0004',
    namespace: 'navigation',
    key: 'logIn',
    english: 'Log in',
    variables: [],
    occurrences: [
      {
        id: 'O0136',
        context: 'src/pages/cart-page/CartPage.tsx:149 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0146',
        context: 'src/pages/cart-page/CartPage.tsx:186 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0163',
        context: 'src/pages/cart-page/CartPage.tsx:65 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0391',
        context: 'src/pages/login-page/LoginPage.tsx:25 — Page: login-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Log in',
      ru: 'Войти',
      uz: 'Kirish',
    },
  },
  {
    unitId: 'MLUX-C0006',
    namespace: 'navigation',
    key: 'myLearning',
    english: 'My learning',
    variables: [],
    occurrences: [
      {
        id: 'O0166',
        context: 'src/pages/cart-page/CartPage.tsx:68 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0367',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:149 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0386',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:179 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'My learning',
      ru: 'Моё обучение',
      uz: 'Ta’limim',
    },
  },
  {
    unitId: 'MLUX-C0007',
    namespace: 'navigation',
    key: 'instructorCourses',
    english: 'Instructor courses',
    variables: [],
    occurrences: [
      {
        id: 'O0170',
        context: 'src/pages/cart-page/CartPage.tsx:72 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Instructor courses',
      ru: 'Курсы преподавателя',
      uz: 'O‘qituvchi kurslari',
    },
  },
  {
    unitId: 'MLUX-C0024',
    namespace: 'routes',
    key: 'learningDetailsTitle',
    english: 'Learning details',
    variables: [],
    occurrences: [
      {
        id: 'O0167',
        context: 'src/pages/cart-page/CartPage.tsx:69 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning details',
      ru: 'Сведения об обучении',
      uz: 'Ta’lim tafsilotlari',
    },
  },
  {
    unitId: 'MLUX-C0026',
    namespace: 'routes',
    key: 'courseAssistantTitle',
    english: 'Course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0168',
        context: 'src/pages/cart-page/CartPage.tsx:70 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course assistant',
      ru: 'Ассистент курса',
      uz: 'Kurs yordamchisi',
    },
  },
  {
    unitId: 'MLUX-C0028',
    namespace: 'routes',
    key: 'aiAssistantTitle',
    english: 'AI assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0169',
        context: 'src/pages/cart-page/CartPage.tsx:71 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'AI assistant',
      ru: 'ИИ-ассистент',
      uz: 'AI yordamchi',
    },
  },
  {
    unitId: 'MLUX-C0031',
    namespace: 'routes',
    key: 'editCourseTitle',
    english: 'Edit course',
    variables: [],
    occurrences: [
      {
        id: 'O0171',
        context: 'src/pages/cart-page/CartPage.tsx:73 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Edit course',
      ru: 'Редактировать курс',
      uz: 'Kursni tahrirlash',
    },
  },
  {
    unitId: 'MLUX-C0033',
    namespace: 'routes',
    key: 'courseEnrollmentsTitle',
    english: 'Course enrollments',
    variables: [],
    occurrences: [
      {
        id: 'O0172',
        context: 'src/pages/cart-page/CartPage.tsx:74 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course enrollments',
      ru: 'Записи на курс',
      uz: 'Kursga yozilishlar',
    },
  },
  {
    unitId: 'MLUX-C0035',
    namespace: 'routes',
    key: 'editLessonTitle',
    english: 'Edit lesson',
    variables: [],
    occurrences: [
      {
        id: 'O0173',
        context: 'src/pages/cart-page/CartPage.tsx:75 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Edit lesson',
      ru: 'Редактировать урок',
      uz: 'Darsni tahrirlash',
    },
  },
  {
    unitId: 'MLUX-C0039',
    namespace: 'routes',
    key: 'courseDetailsTitle',
    english: 'Course details',
    variables: [],
    occurrences: [
      {
        id: 'O0161',
        context: 'src/pages/cart-page/CartPage.tsx:63 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course details',
      ru: 'Сведения о курсе',
      uz: 'Kurs tafsilotlari',
    },
  },
  {
    unitId: 'MLUX-C0041',
    namespace: 'routes',
    key: 'createAccountTitle',
    english: 'Create account',
    variables: [],
    occurrences: [
      {
        id: 'O0162',
        context: 'src/pages/cart-page/CartPage.tsx:64 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0415',
        context: 'src/pages/signup-page/SignupPage.tsx:25 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Create account',
      ru: 'Создать аккаунт',
      uz: 'Akkaunt yaratish',
    },
  },
  {
    unitId: 'MLUX-C0042',
    namespace: 'routes',
    key: 'createAccountDescription',
    english: 'Create a LearnHub account to start learning or teaching.',
    variables: [],
    occurrences: [
      {
        id: 'O0416',
        context: 'src/pages/signup-page/SignupPage.tsx:26 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Create a LearnHub account to start learning or teaching.',
      ru: 'Создайте аккаунт LearnHub, чтобы учиться или преподавать.',
      uz: 'O‘qish yoki dars berishni boshlash uchun LearnHub akkauntini yarating.',
    },
  },
  {
    unitId: 'MLUX-C0043',
    namespace: 'routes',
    key: 'loginDescription',
    english: 'Access your learning or instructor workspace.',
    variables: [],
    occurrences: [
      {
        id: 'O0393',
        context: 'src/pages/login-page/LoginPage.tsx:29 — Page: login-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Access your learning or instructor workspace.',
      ru: 'Перейдите в пространство обучения или преподавателя.',
      uz: 'Ta’lim yoki o‘qituvchi ish maydoniga kiring.',
    },
  },
  {
    unitId: 'MLUX-C0044',
    namespace: 'routes',
    key: 'forgotPasswordTitle',
    english: 'Forgot password',
    variables: [],
    occurrences: [
      {
        id: 'O0164',
        context: 'src/pages/cart-page/CartPage.tsx:66 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0222',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:17 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Forgot password',
      ru: 'Забыли пароль',
      uz: 'Parolni unutdingizmi',
    },
  },
  {
    unitId: 'MLUX-C0045',
    namespace: 'routes',
    key: 'forgotPasswordDescription',
    english: 'Request help signing back in to your account.',
    variables: [],
    occurrences: [
      {
        id: 'O0223',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:18 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Request help signing back in to your account.',
      ru: 'Запросите помощь, чтобы снова войти в аккаунт.',
      uz: 'Akkauntingizga qayta kirish uchun yordam so‘rang.',
    },
  },
  {
    unitId: 'MLUX-C0046',
    namespace: 'routes',
    key: 'resetPasswordTitle',
    english: 'Reset password',
    variables: [],
    occurrences: [
      {
        id: 'O0165',
        context: 'src/pages/cart-page/CartPage.tsx:67 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0398',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:24 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0404',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:77 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Reset password',
      ru: 'Сбросить пароль',
      uz: 'Parolni tiklash',
    },
  },
  {
    unitId: 'MLUX-C0047',
    namespace: 'routes',
    key: 'resetPasswordDescription',
    english: 'Choose a new password for your account.',
    variables: [],
    occurrences: [
      {
        id: 'O0399',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:25 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0405',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:78 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Choose a new password for your account.',
      ru: 'Выберите новый пароль для аккаунта.',
      uz: 'Akkauntingiz uchun yangi parol tanlang.',
    },
  },
  {
    unitId: 'MLUX-C0059',
    namespace: 'routes',
    key: 'tryAgain',
    english: 'Try again',
    variables: [],
    occurrences: [
      {
        id: 'O0206',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:115 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0218',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:38 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try again',
      ru: 'Повторить',
      uz: 'Qayta urinish',
    },
  },
  {
    unitId: 'MLUX-C0066',
    namespace: 'auth',
    key: 'hidePassword',
    english: 'Hide password',
    variables: [],
    occurrences: [
      {
        id: 'O0081',
        context: 'src/features/auth-workflows/AuthForm.tsx:112 — Feature: auth-workflows',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Hide password',
      ru: 'Скрыть пароль',
      uz: 'Parolni yashirish',
    },
  },
  {
    unitId: 'MLUX-C0067',
    namespace: 'auth',
    key: 'showPassword',
    english: 'Show password',
    variables: [],
    occurrences: [
      {
        id: 'O0082',
        context: 'src/features/auth-workflows/AuthForm.tsx:112 — Feature: auth-workflows',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Show password',
      ru: 'Показать пароль',
      uz: 'Parolni ko‘rsatish',
    },
  },
  {
    unitId: 'MLUX-C0068',
    namespace: 'learning',
    key: 'mediaCouldNotBeLoadedTry',
    english: 'Media could not be loaded. Try again.',
    variables: [],
    occurrences: [
      {
        id: 'O0083',
        context: 'src/features/media-access/LessonMediaAccess.tsx:112 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Media could not be loaded. Try again.',
      ru: 'Не удалось загрузить медиафайл. Повторите попытку.',
      uz: 'Mediafaylni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0069',
    namespace: 'learning',
    key: 'loadPdf',
    english: 'Load PDF',
    variables: [],
    occurrences: [
      {
        id: 'O0084',
        context: 'src/features/media-access/LessonMediaAccess.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Load PDF',
      ru: 'Загрузить PDF',
      uz: 'PDF-ni yuklash',
    },
  },
  {
    unitId: 'MLUX-C0070',
    namespace: 'learning',
    key: 'loadVideo',
    english: 'Load video',
    variables: [],
    occurrences: [
      {
        id: 'O0085',
        context: 'src/features/media-access/LessonMediaAccess.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Load video',
      ru: 'Загрузить видео',
      uz: 'Videoni yuklash',
    },
  },
  {
    unitId: 'MLUX-C0071',
    namespace: 'learning',
    key: 'loadingMedia',
    english: 'Loading media…',
    variables: [],
    occurrences: [
      {
        id: 'O0086',
        context: 'src/features/media-access/LessonMediaAccess.tsx:124 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading media…',
      ru: 'Загрузка медиа…',
      uz: 'Media yuklanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0072',
    namespace: 'learning',
    key: 'lessonVideoPreview',
    english: 'Lesson video preview',
    variables: [],
    occurrences: [
      {
        id: 'O0087',
        context: 'src/features/media-access/LessonMediaAccess.tsx:83 — Feature: media-access',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Lesson video preview',
      ru: 'Предпросмотр видео урока',
      uz: 'Dars videosini oldindan ko‘rish',
    },
  },
  {
    unitId: 'MLUX-C0073',
    namespace: 'learning',
    key: 'preparingVideo',
    english: 'Preparing video…',
    variables: [],
    occurrences: [
      {
        id: 'O0088',
        context: 'src/features/media-access/LessonMediaAccess.tsx:92 — Feature: media-access',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Preparing video…',
      ru: 'Подготавливаем видео…',
      uz: 'Video tayyorlanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0074',
    namespace: 'learning',
    key: 'videoReady',
    english: 'Video ready.',
    variables: [],
    occurrences: [
      {
        id: 'O0089',
        context: 'src/features/media-access/LessonMediaAccess.tsx:92 — Feature: media-access',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Video ready.',
      ru: 'Видео готово.',
      uz: 'Video tayyor.',
    },
  },
  {
    unitId: 'MLUX-C0075',
    namespace: 'learning',
    key: 'pdfCouldNotBeDisplayedTry',
    english: 'PDF could not be displayed. Try again.',
    variables: [],
    occurrences: [
      {
        id: 'O0090',
        context: 'src/features/media-access/LessonPdfPreview.tsx:115 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'PDF could not be displayed. Try again.',
      ru: 'Не удалось отобразить PDF. Повторите попытку.',
      uz: 'PDF-ni ko‘rsatib bo‘lmadi. Qayta urinib ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0076',
    namespace: 'learning',
    key: 'pdfReadyPageOf',
    english: 'PDF ready. Page {currentPage} of {totalPages}.',
    variables: ['currentPage', 'totalPages'],
    occurrences: [
      {
        id: 'O0091',
        context: 'src/features/media-access/LessonPdfPreview.tsx:117 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'PDF ready. Page {{currentPage}} of {{totalPages}}.',
      ru: 'PDF готов. Страница {{currentPage}} из {{totalPages}}.',
      uz: 'PDF tayyor. {{totalPages}} sahifadan {{currentPage}}-sahifa.',
    },
  },
  {
    unitId: 'MLUX-C0077',
    namespace: 'learning',
    key: 'renderingPdfPage',
    english: 'Rendering PDF page {currentPage}.',
    variables: ['currentPage'],
    occurrences: [
      {
        id: 'O0092',
        context: 'src/features/media-access/LessonPdfPreview.tsx:119 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Rendering PDF page {{currentPage}}.',
      ru: 'Отображаем страницу PDF: {{currentPage}}.',
      uz: 'PDF-ning {{currentPage}}-sahifasi tayyorlanmoqda.',
    },
  },
  {
    unitId: 'MLUX-C0078',
    namespace: 'learning',
    key: 'loadingPdfPreview',
    english: 'Loading PDF preview…',
    variables: [],
    occurrences: [
      {
        id: 'O0093',
        context: 'src/features/media-access/LessonPdfPreview.tsx:120 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading PDF preview…',
      ru: 'Загрузка предпросмотра PDF…',
      uz: 'PDF ko‘rinishi yuklanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0079',
    namespace: 'learning',
    key: 'lessonPdfPreview',
    english: 'Lesson PDF preview',
    variables: [],
    occurrences: [
      {
        id: 'O0094',
        context: 'src/features/media-access/LessonPdfPreview.tsx:127 — Feature: media-access',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Lesson PDF preview',
      ru: 'Предпросмотр PDF урока',
      uz: 'Dars PDF-faylini oldindan ko‘rish',
    },
  },
  {
    unitId: 'MLUX-C0080',
    namespace: 'learning',
    key: 'pdfPages',
    english: 'PDF pages',
    variables: [],
    occurrences: [
      {
        id: 'O0095',
        context: 'src/features/media-access/LessonPdfPreview.tsx:136 — Feature: media-access',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'PDF pages',
      ru: 'Страницы PDF',
      uz: 'PDF sahifalari',
    },
  },
  {
    unitId: 'MLUX-C0081',
    namespace: 'learning',
    key: 'tryPdfAgain',
    english: 'Try PDF again',
    variables: [],
    occurrences: [
      {
        id: 'O0096',
        context: 'src/features/media-access/LessonPdfPreview.tsx:160 — Feature: media-access',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try PDF again',
      ru: 'Повторить загрузку PDF',
      uz: 'PDF-ni qayta yuklash',
    },
  },
  {
    unitId: 'MLUX-C0082',
    namespace: 'ai',
    key: 'invalidCourseAssistantAddress',
    english: 'Invalid course assistant address',
    variables: [],
    occurrences: [
      {
        id: 'O0097',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:100 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Invalid course assistant address',
      ru: 'Неверный адрес ассистента курса',
      uz: 'Kurs yordamchisi manzili noto‘g‘ri',
    },
  },
  {
    unitId: 'MLUX-C0083',
    namespace: 'ai',
    key: 'returnToMyLearningAndChoose',
    english: 'Return to my learning and choose a course to open its assistant.',
    variables: [],
    occurrences: [
      {
        id: 'O0098',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:101 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Return to my learning and choose a course to open its assistant.',
      ru: 'Вернитесь в раздел «Моё обучение» и выберите курс, чтобы открыть его ассистента.',
      uz: 'Kurs yordamchisini ochish uchun “Ta’limim” bo‘limiga qayting va kursni tanlang.',
    },
  },
  {
    unitId: 'MLUX-C0084',
    namespace: 'ai',
    key: 'recommendACourse',
    english: 'Recommend a course',
    variables: [],
    occurrences: [
      {
        id: 'O0099',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:127 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Recommend a course',
      ru: 'Порекомендуй курс',
      uz: 'Kurs tavsiya qil',
    },
  },
  {
    unitId: 'MLUX-C0085',
    namespace: 'ai',
    key: 'recommendACourseBasedOnMy',
    english: 'Recommend a course based on my learning goals.',
    variables: [],
    occurrences: [
      {
        id: 'O0100',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:128 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Recommend a course based on my learning goals.',
      ru: 'Порекомендуй курс с учётом моих целей обучения.',
      uz: 'Ta’lim maqsadlarimga mos kurs tavsiya qil.',
    },
  },
  {
    unitId: 'MLUX-C0086',
    namespace: 'ai',
    key: 'explainAConcept',
    english: 'Explain a concept',
    variables: [],
    occurrences: [
      {
        id: 'O0101',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:132 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Explain a concept',
      ru: 'Объясни понятие',
      uz: 'Tushunchani izohla',
    },
  },
  {
    unitId: 'MLUX-C0087',
    namespace: 'ai',
    key: 'explainAConceptIAmLearning',
    english: 'Explain a concept I am learning in simple terms.',
    variables: [],
    occurrences: [
      {
        id: 'O0102',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:133 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Explain a concept I am learning in simple terms.',
      ru: 'Объясни простыми словами понятие, которое я изучаю.',
      uz: 'O‘rganayotgan tushunchamni sodda qilib izohla.',
    },
  },
  {
    unitId: 'MLUX-C0088',
    namespace: 'ai',
    key: 'quizMe',
    english: 'Quiz me',
    variables: [],
    occurrences: [
      {
        id: 'O0103',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:137 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Quiz me',
      ru: 'Проверь мои знания',
      uz: 'Bilimimni tekshir',
    },
  },
  {
    unitId: 'MLUX-C0089',
    namespace: 'ai',
    key: 'quizMeOnTheCourseMaterial',
    english: 'Quiz me on the course material I am learning.',
    variables: [],
    occurrences: [
      {
        id: 'O0104',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:138 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Quiz me on the course material I am learning.',
      ru: 'Проверь мои знания по материалам курса, который я изучаю.',
      uz: 'O‘rganayotgan kurs materiallari bo‘yicha bilimimni tekshir.',
    },
  },
  {
    unitId: 'MLUX-C0090',
    namespace: 'ai',
    key: 'suggestedActions',
    english: 'Suggested Actions',
    variables: [],
    occurrences: [
      {
        id: 'O0105',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:210 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Suggested Actions',
      ru: 'Предлагаемые действия',
      uz: 'Tavsiya etilgan amallar',
    },
  },
  {
    unitId: 'MLUX-C0091',
    namespace: 'ai',
    key: 'quickPromptsToJumpstartYourSession',
    english: 'Quick prompts to jumpstart your session',
    variables: [],
    occurrences: [
      {
        id: 'O0106',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:212 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0108',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:224 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Quick prompts to jumpstart your session',
      ru: 'Быстрые запросы для начала работы',
      uz: 'Suhbatni boshlash uchun tezkor so‘rovlar',
    },
  },
  {
    unitId: 'MLUX-C0092',
    namespace: 'ai',
    key: 'suggestedActions0092',
    english: 'Suggested Actions',
    variables: [],
    occurrences: [
      {
        id: 'O0107',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:223 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Suggested Actions',
      ru: 'Предлагаемые действия',
      uz: 'Tavsiya etilgan amallar',
    },
  },
  {
    unitId: 'MLUX-C0093',
    namespace: 'ai',
    key: 'courseAssistant',
    english: 'Course Assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0109',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:245 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course Assistant',
      ru: 'Ассистент курса',
      uz: 'Kurs yordamchisi',
    },
  },
  {
    unitId: 'MLUX-C0094',
    namespace: 'ai',
    key: 'generalAssistanceChat',
    english: 'General Assistance Chat',
    variables: [],
    occurrences: [
      {
        id: 'O0110',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:245 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'General Assistance Chat',
      ru: 'Чат общей помощи',
      uz: 'Umumiy yordam chati',
    },
  },
  {
    unitId: 'MLUX-C0095',
    namespace: 'ai',
    key: 'assistantAvailable',
    english: 'Assistant available',
    variables: [],
    occurrences: [
      {
        id: 'O0111',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:253 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Assistant available',
      ru: 'Ассистент доступен',
      uz: 'Yordamchi mavjud',
    },
  },
  {
    unitId: 'MLUX-C0096',
    namespace: 'ai',
    key: 'assistantUnavailable',
    english: 'Assistant unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0112',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:255 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Assistant unavailable',
      ru: 'Ассистент недоступен',
      uz: 'Yordamchi mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0097',
    namespace: 'ai',
    key: 'assistantAvailabilityUnknown',
    english: 'Assistant availability unknown',
    variables: [],
    occurrences: [
      {
        id: 'O0113',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:256 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Assistant availability unknown',
      ru: 'Доступность ассистента неизвестна',
      uz: 'Yordamchi holati noma’lum',
    },
  },
  {
    unitId: 'MLUX-C0098',
    namespace: 'ai',
    key: 'poweredByLearnhubIntelligence',
    english: 'Powered by LearnHub Intelligence',
    variables: [],
    occurrences: [
      {
        id: 'O0114',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:311 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Powered by LearnHub Intelligence',
      ru: 'На базе LearnHub Intelligence',
      uz: 'LearnHub Intelligence asosida',
    },
  },
  {
    unitId: 'MLUX-C0099',
    namespace: 'ai',
    key: 'conversationActions',
    english: 'Conversation actions',
    variables: [],
    occurrences: [
      {
        id: 'O0115',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:319 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
      {
        id: 'O0116',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:331 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
      {
        id: 'O0447',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:114 — Shared UI',
        classification: 'Accessibility only',
      },
      {
        id: 'O0448',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:138 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Conversation actions',
      ru: 'Действия с диалогом',
      uz: 'Suhbat amallari',
    },
  },
  {
    unitId: 'MLUX-C0100',
    namespace: 'ai',
    key: 'clearChat',
    english: 'Clear chat',
    variables: [],
    occurrences: [
      {
        id: 'O0117',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:347 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0449',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:154 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clear chat',
      ru: 'Очистить чат',
      uz: 'Chatni tozalash',
    },
  },
  {
    unitId: 'MLUX-C0101',
    namespace: 'ai',
    key: 'closeAssistantChat',
    english: 'Close assistant chat',
    variables: [],
    occurrences: [
      {
        id: 'O0118',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:355 — Page: ai-chat-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Close assistant chat',
      ru: 'Закрыть чат с ассистентом',
      uz: 'Yordamchi chatini yopish',
    },
  },
  {
    unitId: 'MLUX-C0102',
    namespace: 'ai',
    key: 'clearThisConversation',
    english: 'Clear this conversation?',
    variables: [],
    occurrences: [
      {
        id: 'O0119',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:376 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0451',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:180 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clear this conversation?',
      ru: 'Очистить этот диалог?',
      uz: 'Bu suhbat tozalansinmi?',
    },
  },
  {
    unitId: 'MLUX-C0103',
    namespace: 'ai',
    key: 'thisActionCannotBeUndone',
    english: 'This action cannot be undone.',
    variables: [],
    occurrences: [
      {
        id: 'O0120',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:377 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0452',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:181 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This action cannot be undone.',
      ru: 'Это действие нельзя отменить.',
      uz: 'Bu amalni bekor qilib bo‘lmaydi.',
    },
  },
  {
    unitId: 'MLUX-C0104',
    namespace: 'ai',
    key: 'clearConversation',
    english: 'Clear conversation',
    variables: [],
    occurrences: [
      {
        id: 'O0121',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:378 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0453',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:182 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clear conversation',
      ru: 'Очистить диалог',
      uz: 'Suhbatni tozalash',
    },
  },
  {
    unitId: 'MLUX-C0105',
    namespace: 'ai',
    key: 'loadingCourseAssistant',
    english: 'Loading course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0122',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:56 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading course assistant',
      ru: 'Загрузка ассистента курса',
      uz: 'Kurs yordamchisi yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0106',
    namespace: 'ai',
    key: 'courseAssistantUnavailable',
    english: 'Course assistant unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0123',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:64 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0125',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:75 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course assistant unavailable',
      ru: 'Ассистент курса недоступен',
      uz: 'Kurs yordamchisi mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0107',
    namespace: 'ai',
    key: 'thisAssistantIsUnavailableForThis',
    english: 'This assistant is unavailable for this course.',
    variables: [],
    occurrences: [
      {
        id: 'O0124',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:65 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0126',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:76 — Page: ai-chat-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This assistant is unavailable for this course.',
      ru: 'Ассистент недоступен для этого курса.',
      uz: 'Bu kurs uchun yordamchi mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0108',
    namespace: 'cart',
    key: 'checkoutAccepted',
    english: 'Checkout accepted',
    variables: [],
    occurrences: [
      {
        id: 'O0127',
        context: 'src/pages/cart-page/CartPage.tsx:121 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checkout accepted',
      ru: 'Оформление принято',
      uz: 'Buyurtma qabul qilindi',
    },
  },
  {
    unitId: 'MLUX-C0109',
    namespace: 'cart',
    key: 'mockCheckoutWasAcceptedPaymentIs',
    english: 'Mock checkout was accepted. Payment is pending; continue in My Learning.',
    variables: [],
    occurrences: [
      {
        id: 'O0128',
        context: 'src/pages/cart-page/CartPage.tsx:122 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock checkout was accepted. Payment is pending; continue in My Learning.',
      ru: 'Тестовое оформление принято. Платёж ожидает обработки; продолжите в разделе «Моё обучение».',
      uz: 'Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; “Ta’limim” bo‘limida davom eting.',
    },
  },
  {
    unitId: 'MLUX-C0110',
    namespace: 'cart',
    key: 'checkMyLearning',
    english: 'Check My Learning',
    variables: [],
    occurrences: [
      {
        id: 'O0129',
        context: 'src/pages/cart-page/CartPage.tsx:123 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0133',
        context: 'src/pages/cart-page/CartPage.tsx:142 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0141',
        context: 'src/pages/cart-page/CartPage.tsx:162 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Check My Learning',
      ru: 'Проверить «Моё обучение»',
      uz: '“Ta’limim”ni tekshirish',
    },
  },
  {
    unitId: 'MLUX-C0111',
    namespace: 'cart',
    key: 'checkoutStatusNeedsChecking',
    english: 'Checkout status needs checking',
    variables: [],
    occurrences: [
      {
        id: 'O0130',
        context: 'src/pages/cart-page/CartPage.tsx:128 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checkout status needs checking',
      ru: 'Нужно проверить статус оформления',
      uz: 'Buyurtma holatini tekshirish kerak',
    },
  },
  {
    unitId: 'MLUX-C0112',
    namespace: 'cart',
    key: 'weCouldNotConfirmCheckoutCheck',
    english: 'We could not confirm checkout. Check the cart status for updated guidance.',
    variables: [],
    occurrences: [
      {
        id: 'O0131',
        context: 'src/pages/cart-page/CartPage.tsx:129 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'We could not confirm checkout. Check the cart status for updated guidance.',
      ru: 'Не удалось подтвердить оформление. Проверьте статус корзины для получения актуальных инструкций.',
      uz: 'Buyurtmani tasdiqlab bo‘lmadi. Yangilangan ko‘rsatmalar uchun savat holatini tekshiring.',
    },
  },
  {
    unitId: 'MLUX-C0113',
    namespace: 'cart',
    key: 'checkoutStatusRemainsUnknown',
    english: 'Checkout status remains unknown',
    variables: [],
    occurrences: [
      {
        id: 'O0132',
        context: 'src/pages/cart-page/CartPage.tsx:137 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checkout status remains unknown',
      ru: 'Статус оформления по-прежнему неизвестен',
      uz: 'Buyurtma holati hanuz noma’lum',
    },
  },
  {
    unitId: 'MLUX-C0114',
    namespace: 'cart',
    key: 'signInRequired',
    english: 'Sign in required',
    variables: [],
    occurrences: [
      {
        id: 'O0134',
        context: 'src/pages/cart-page/CartPage.tsx:147 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0364',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:121 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0459',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:22 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Sign in required',
      ru: 'Требуется вход',
      uz: 'Kirish talab qilinadi',
    },
  },
  {
    unitId: 'MLUX-C0115',
    namespace: 'cart',
    key: 'signInAgainBeforeContinuingCheckout',
    english: 'Sign in again before continuing checkout.',
    variables: [],
    occurrences: [
      {
        id: 'O0135',
        context: 'src/pages/cart-page/CartPage.tsx:148 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Sign in again before continuing checkout.',
      ru: 'Войдите снова, прежде чем продолжить оформление.',
      uz: 'Buyurtmani davom ettirishdan oldin qayta kiring.',
    },
  },
  {
    unitId: 'MLUX-C0116',
    namespace: 'cart',
    key: 'checkoutUnavailable',
    english: 'Checkout unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0137',
        context: 'src/pages/cart-page/CartPage.tsx:154 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0144',
        context: 'src/pages/cart-page/CartPage.tsx:172 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checkout unavailable',
      ru: 'Оформление недоступно',
      uz: 'Buyurtma berish imkonsiz',
    },
  },
  {
    unitId: 'MLUX-C0117',
    namespace: 'cart',
    key: 'thisCheckoutIsNotAvailableFor',
    english: 'This checkout is not available for the current account.',
    variables: [],
    occurrences: [
      {
        id: 'O0138',
        context: 'src/pages/cart-page/CartPage.tsx:155 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This checkout is not available for the current account.',
      ru: 'Оформление недоступно для текущего аккаунта.',
      uz: 'Joriy akkaunt uchun buyurtma berish mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0118',
    namespace: 'cart',
    key: 'enrollmentChanged',
    english: 'Enrollment changed',
    variables: [],
    occurrences: [
      {
        id: 'O0139',
        context: 'src/pages/cart-page/CartPage.tsx:160 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Enrollment changed',
      ru: 'Запись на курс изменилась',
      uz: 'Kursga yozilish holati o‘zgardi',
    },
  },
  {
    unitId: 'MLUX-C0119',
    namespace: 'cart',
    key: 'yourEnrollmentChangedCheckMyLearning',
    english: 'Your enrollment changed. Check My Learning before taking another action.',
    variables: [],
    occurrences: [
      {
        id: 'O0140',
        context: 'src/pages/cart-page/CartPage.tsx:161 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your enrollment changed. Check My Learning before taking another action.',
      ru: 'Статус записи изменился. Перед следующим действием проверьте раздел «Моё обучение».',
      uz: 'Yozilish holati o‘zgardi. Keyingi amaldan oldin “Ta’limim” bo‘limini tekshiring.',
    },
  },
  {
    unitId: 'MLUX-C0120',
    namespace: 'cart',
    key: 'cartChanged',
    english: 'Cart changed',
    variables: [],
    occurrences: [
      {
        id: 'O0142',
        context: 'src/pages/cart-page/CartPage.tsx:167 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Cart changed',
      ru: 'Корзина изменилась',
      uz: 'Savat o‘zgardi',
    },
  },
  {
    unitId: 'MLUX-C0121',
    namespace: 'cart',
    key: 'yourCartIsNoLongerReady',
    english: 'Your cart is no longer ready for this checkout. Refresh it before trying again.',
    variables: [],
    occurrences: [
      {
        id: 'O0143',
        context: 'src/pages/cart-page/CartPage.tsx:168 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your cart is no longer ready for this checkout. Refresh it before trying again.',
      ru: 'Корзина больше не готова к оформлению. Обновите её перед повторной попыткой.',
      uz: 'Savat bu buyurtma uchun tayyor emas. Qayta urinishdan oldin uni yangilang.',
    },
  },
  {
    unitId: 'MLUX-C0122',
    namespace: 'cart',
    key: 'checkoutIsCurrentlyUnavailableTryAgain',
    english: 'Checkout is currently unavailable. Try again later.',
    variables: [],
    occurrences: [
      {
        id: 'O0145',
        context: 'src/pages/cart-page/CartPage.tsx:173 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checkout is currently unavailable. Try again later.',
      ru: 'Оформление сейчас недоступно. Повторите попытку позже.',
      uz: 'Buyurtma berish hozircha mavjud emas. Keyinroq qayta urinib ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0123',
    namespace: 'cart',
    key: 'cartCleared',
    english: 'Cart cleared.',
    variables: [],
    occurrences: [
      {
        id: 'O0147',
        context: 'src/pages/cart-page/CartPage.tsx:212 — Page: cart-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Cart cleared.',
      ru: 'Корзина очищена.',
      uz: 'Savat tozalandi.',
    },
  },
  {
    unitId: 'MLUX-C0124',
    namespace: 'cart',
    key: 'courseRemovedFromCart',
    english: 'Course removed from cart.',
    variables: [],
    occurrences: [
      {
        id: 'O0148',
        context: 'src/pages/cart-page/CartPage.tsx:212 — Page: cart-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course removed from cart.',
      ru: 'Курс удалён из корзины.',
      uz: 'Kurs savatdan olib tashlandi.',
    },
  },
  {
    unitId: 'MLUX-C0125',
    namespace: 'cart',
    key: 'addACourseFromTheCatalog',
    english: 'Add a course from the catalog when you are ready to learn.',
    variables: [],
    occurrences: [
      {
        id: 'O0149',
        context: 'src/pages/cart-page/CartPage.tsx:422 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Add a course from the catalog when you are ready to learn.',
      ru: 'Когда будете готовы учиться, добавьте курс из каталога.',
      uz: 'O‘qishga tayyor bo‘lsangiz, katalogdan kurs qo‘shing.',
    },
  },
  {
    unitId: 'MLUX-C0126',
    namespace: 'cart',
    key: 'clearCart',
    english: 'Clear cart',
    variables: [],
    occurrences: [
      {
        id: 'O0150',
        context: 'src/pages/cart-page/CartPage.tsx:472 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0158',
        context: 'src/pages/cart-page/CartPage.tsx:587 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clear cart',
      ru: 'Очистить корзину',
      uz: 'Savatni tozalash',
    },
  },
  {
    unitId: 'MLUX-C0127',
    namespace: 'cart',
    key: 'preview',
    english: 'Preview {courseTitle}',
    variables: ['courseTitle'],
    occurrences: [
      {
        id: 'O0151',
        context: 'src/pages/cart-page/CartPage.tsx:507 — Page: cart-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Preview {{courseTitle}}',
      ru: 'Предпросмотр курса «{{courseTitle}}»',
      uz: '{{courseTitle}} kursini oldindan ko‘rish',
    },
  },
  {
    unitId: 'MLUX-C0128',
    namespace: 'cart',
    key: 'coursePreview',
    english: 'Course preview',
    variables: [],
    occurrences: [
      {
        id: 'O0152',
        context: 'src/pages/cart-page/CartPage.tsx:509 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course preview',
      ru: 'Предпросмотр курса',
      uz: 'Kursni oldindan ko‘rish',
    },
  },
  {
    unitId: 'MLUX-C0129',
    namespace: 'cart',
    key: 'remove',
    english: 'Remove {courseTitle}',
    variables: ['courseTitle'],
    occurrences: [
      {
        id: 'O0153',
        context: 'src/pages/cart-page/CartPage.tsx:536 — Page: cart-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Remove {{courseTitle}}',
      ru: 'Удалить курс «{{courseTitle}}»',
      uz: '{{courseTitle}} kursini olib tashlash',
    },
  },
  {
    unitId: 'MLUX-C0130',
    namespace: 'cart',
    key: 'checkingOut',
    english: 'Checking out…',
    variables: [],
    occurrences: [
      {
        id: 'O0154',
        context: 'src/pages/cart-page/CartPage.tsx:573 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checking out…',
      ru: 'Оформление…',
      uz: 'Buyurtma rasmiylashtirilmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0131',
    namespace: 'cart',
    key: 'insecureCheckout',
    english: 'Insecure checkout',
    variables: [],
    occurrences: [
      {
        id: 'O0155',
        context: 'src/pages/cart-page/CartPage.tsx:579 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Insecure checkout',
      ru: 'Небезопасное оформление',
      uz: 'Xavfsiz bo‘lmagan buyurtma',
    },
  },
  {
    unitId: 'MLUX-C0132',
    namespace: 'cart',
    key: 'clearCart0132',
    english: 'Clear cart?',
    variables: [],
    occurrences: [
      {
        id: 'O0156',
        context: 'src/pages/cart-page/CartPage.tsx:585 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clear cart?',
      ru: 'Очистить корзину?',
      uz: 'Savat tozalansinmi?',
    },
  },
  {
    unitId: 'MLUX-C0133',
    namespace: 'cart',
    key: 'thisRemovesEveryCourseFromYour',
    english:
      'This removes every course from your cart. You can add courses again from the catalog.',
    variables: [],
    occurrences: [
      {
        id: 'O0157',
        context: 'src/pages/cart-page/CartPage.tsx:586 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This removes every course from your cart. You can add courses again from the catalog.',
      ru: 'Все курсы будут удалены из корзины. Вы сможете снова добавить их из каталога.',
      uz: 'Savatdagi barcha kurslar olib tashlanadi. Ularni katalogdan yana qo‘shishingiz mumkin.',
    },
  },
  {
    unitId: 'MLUX-C0134',
    namespace: 'cart',
    key: 'clearingCart',
    english: 'Clearing cart...',
    variables: [],
    occurrences: [
      {
        id: 'O0159',
        context: 'src/pages/cart-page/CartPage.tsx:589 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Clearing cart...',
      ru: 'Очистка корзины...',
      uz: 'Savat tozalanmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0135',
    namespace: 'catalog',
    key: 'courseResultsUpdated',
    english: 'Course results updated.',
    variables: [],
    occurrences: [
      {
        id: 'O0175',
        context: 'src/pages/catalog-page/CatalogPage.tsx:22 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0178',
        context: 'src/pages/catalog-page/CatalogPage.tsx:290 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course results updated.',
      ru: 'Результаты поиска курсов обновлены.',
      uz: 'Kurs natijalari yangilandi.',
    },
  },
  {
    unitId: 'MLUX-C0136',
    namespace: 'catalog',
    key: 'updatingCourseResults',
    english: 'Updating course results…',
    variables: [],
    occurrences: [
      {
        id: 'O0176',
        context: 'src/pages/catalog-page/CatalogPage.tsx:22 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0177',
        context: 'src/pages/catalog-page/CatalogPage.tsx:283 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Updating course results…',
      ru: 'Обновляем результаты поиска курсов…',
      uz: 'Kurs natijalari yangilanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0137',
    namespace: 'catalog',
    key: 'catalogRefreshStatus',
    english: 'Catalog refresh status',
    variables: [],
    occurrences: [
      {
        id: 'O0179',
        context: 'src/pages/catalog-page/CatalogPage.tsx:341 — Page: catalog-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Catalog refresh status',
      ru: 'Статус обновления каталога',
      uz: 'Katalog yangilanish holati',
    },
  },
  {
    unitId: 'MLUX-C0138',
    namespace: 'catalog',
    key: 'loadingCourseResults',
    english: 'Loading course results…',
    variables: [],
    occurrences: [
      {
        id: 'O0180',
        context: 'src/pages/catalog-page/CatalogPage.tsx:350 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading course results…',
      ru: 'Загрузка результатов поиска курсов…',
      uz: 'Kurs natijalari yuklanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0139',
    namespace: 'catalog',
    key: 'found',
    english: 'Found',
    variables: [],
    occurrences: [
      {
        id: 'O0181',
        context: 'src/pages/catalog-page/CatalogPage.tsx:353 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Found',
      ru: 'Найдено',
      uz: 'Topildi',
    },
  },
  {
    unitId: 'MLUX-C0140',
    namespace: 'catalog',
    key: 'courseResultsUnavailable',
    english: 'Course results unavailable.',
    variables: [],
    occurrences: [
      {
        id: 'O0182',
        context: 'src/pages/catalog-page/CatalogPage.tsx:361 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course results unavailable.',
      ru: 'Результаты поиска курсов недоступны.',
      uz: 'Kurs natijalari mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0141',
    namespace: 'catalog',
    key: 'noCoursesFound',
    english: 'No courses found',
    variables: [],
    occurrences: [
      {
        id: 'O0183',
        context: 'src/pages/catalog-page/CatalogPage.tsx:407 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'No courses found',
      ru: 'Курсы не найдены',
      uz: 'Kurslar topilmadi',
    },
  },
  {
    unitId: 'MLUX-C0142',
    namespace: 'catalog',
    key: 'courseResultPages',
    english: 'Course result pages',
    variables: [],
    occurrences: [
      {
        id: 'O0184',
        context: 'src/pages/catalog-page/CatalogPage.tsx:435 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course result pages',
      ru: 'Страницы результатов поиска курсов',
      uz: 'Kurs natijalari sahifalari',
    },
  },
  {
    unitId: 'MLUX-C0143',
    namespace: 'catalog',
    key: 'enrollForFree',
    english: 'Enroll for free',
    variables: [],
    occurrences: [
      {
        id: 'O0185',
        context: 'src/pages/catalog-page/CourseCard.tsx:220 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Enroll for free',
      ru: 'Записаться бесплатно',
      uz: 'Bepul yozilish',
    },
  },
  {
    unitId: 'MLUX-C0144',
    namespace: 'catalog',
    key: 'viewCourseDetails',
    english: 'View course details',
    variables: [],
    occurrences: [
      {
        id: 'O0186',
        context: 'src/pages/catalog-page/CourseCard.tsx:392 — Page: catalog-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'View course details',
      ru: 'Открыть сведения о курсе',
      uz: 'Kurs tafsilotlarini ko‘rish',
    },
  },
  {
    unitId: 'MLUX-C0145',
    namespace: 'catalog',
    key: 'thisCourseIsNotAvailableFor',
    english: 'This course is not available for enrollment yet.',
    variables: [],
    occurrences: [
      {
        id: 'O0187',
        context: 'src/pages/catalog-page/CourseCard.tsx:67 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This course is not available for enrollment yet.',
      ru: 'Запись на этот курс пока недоступна.',
      uz: 'Bu kursga yozilish hozircha mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0146',
    namespace: 'catalog',
    key: 'noCourseDescriptionIsAvailable',
    english: 'No course description is available.',
    variables: [],
    occurrences: [
      {
        id: 'O0188',
        context: 'src/pages/catalog-page/CourseCard.tsx:71 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0207',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:122 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0377',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:321 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'No course description is available.',
      ru: 'Описание курса отсутствует.',
      uz: 'Kurs tavsifi mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0147',
    namespace: 'catalog',
    key: 'lowToHigh',
    english: 'Low to High',
    variables: [],
    occurrences: [
      {
        id: 'O0189',
        context: 'src/pages/catalog-page/SortControl.tsx:10 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Low to High',
      ru: 'По возрастанию',
      uz: 'O‘sish tartibida',
    },
  },
  {
    unitId: 'MLUX-C0148',
    namespace: 'catalog',
    key: 'highToLow',
    english: 'High to Low',
    variables: [],
    occurrences: [
      {
        id: 'O0190',
        context: 'src/pages/catalog-page/SortControl.tsx:11 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'High to Low',
      ru: 'По убыванию',
      uz: 'Kamayish tartibida',
    },
  },
  {
    unitId: 'MLUX-C0149',
    namespace: 'catalog',
    key: 'sortBy',
    english: 'Sort by: {sortLabel}',
    variables: ['sortLabel'],
    occurrences: [
      {
        id: 'O0191',
        context: 'src/pages/catalog-page/SortControl.tsx:114 — Page: catalog-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Sort by: {{sortLabel}}',
      ru: 'Сортировка: {{sortLabel}}',
      uz: 'Saralash: {{sortLabel}}',
    },
  },
  {
    unitId: 'MLUX-C0150',
    namespace: 'catalog',
    key: 'aToZ',
    english: 'A to Z',
    variables: [],
    occurrences: [
      {
        id: 'O0192',
        context: 'src/pages/catalog-page/SortControl.tsx:12 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'A to Z',
      ru: 'От А до Я',
      uz: 'A dan Z gacha',
    },
  },
  {
    unitId: 'MLUX-C0151',
    namespace: 'catalog',
    key: 'zToA',
    english: 'Z to A',
    variables: [],
    occurrences: [
      {
        id: 'O0193',
        context: 'src/pages/catalog-page/SortControl.tsx:13 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Z to A',
      ru: 'От Я до А',
      uz: 'Z dan A gacha',
    },
  },
  {
    unitId: 'MLUX-C0152',
    namespace: 'catalog',
    key: 'sortByOptions',
    english: 'Sort by options',
    variables: [],
    occurrences: [
      {
        id: 'O0194',
        context: 'src/pages/catalog-page/SortControl.tsx:151 — Page: catalog-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Sort by options',
      ru: 'Параметры сортировки',
      uz: 'Saralash parametrlari',
    },
  },
  {
    unitId: 'MLUX-C0153',
    namespace: 'catalog',
    key: 'oldest',
    english: 'Oldest',
    variables: [],
    occurrences: [
      {
        id: 'O0195',
        context: 'src/pages/catalog-page/SortControl.tsx:8 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Oldest',
      ru: 'Сначала старые',
      uz: 'Avval eskilari',
    },
  },
  {
    unitId: 'MLUX-C0154',
    namespace: 'catalog',
    key: 'newest',
    english: 'Newest',
    variables: [],
    occurrences: [
      {
        id: 'O0196',
        context: 'src/pages/catalog-page/SortControl.tsx:9 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Newest',
      ru: 'Сначала новые',
      uz: 'Avval yangilari',
    },
  },
  {
    unitId: 'MLUX-C0155',
    namespace: 'course',
    key: 'pleaseWait',
    english: 'Please wait…',
    variables: [],
    occurrences: [
      {
        id: 'O0197',
        context:
          'src/pages/course-detail-page/CourseActionPanel.tsx:127 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Please wait…',
      ru: 'Подождите…',
      uz: 'Kuting…',
    },
  },
  {
    unitId: 'MLUX-C0156',
    namespace: 'course',
    key: 'notAvailable',
    english: 'Not available',
    variables: [],
    occurrences: [
      {
        id: 'O0198',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:46 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Not available',
      ru: 'Недоступно',
      uz: 'Mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0157',
    namespace: 'course',
    key: 'courseIsNotPublished',
    english: 'Course is not published',
    variables: [],
    occurrences: [
      {
        id: 'O0199',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:47 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course is not published',
      ru: 'Курс не опубликован',
      uz: 'Kurs nashr qilinmagan',
    },
  },
  {
    unitId: 'MLUX-C0158',
    namespace: 'course',
    key: 'actionFailed',
    english: 'Action failed',
    variables: [],
    occurrences: [
      {
        id: 'O0200',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:53 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Action failed',
      ru: 'Не удалось выполнить действие',
      uz: 'Amal bajarilmadi',
    },
  },
  {
    unitId: 'MLUX-C0159',
    namespace: 'course',
    key: 'enrollmentComplete',
    english: 'Enrollment complete',
    variables: [],
    occurrences: [
      {
        id: 'O0201',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:61 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Enrollment complete',
      ru: 'Запись завершена',
      uz: 'Yozilish yakunlandi',
    },
  },
  {
    unitId: 'MLUX-C0160',
    namespace: 'course',
    key: 'youAreNowEnrolledInThis',
    english: 'You are now enrolled in this course.',
    variables: [],
    occurrences: [
      {
        id: 'O0202',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:62 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'You are now enrolled in this course.',
      ru: 'Вы записаны на этот курс.',
      uz: 'Siz bu kursga yozildingiz.',
    },
  },
  {
    unitId: 'MLUX-C0161',
    namespace: 'course',
    key: 'addedToCart',
    english: 'Added to cart',
    variables: [],
    occurrences: [
      {
        id: 'O0203',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:67 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Added to cart',
      ru: 'Добавлено в корзину',
      uz: 'Savatga qo‘shildi',
    },
  },
  {
    unitId: 'MLUX-C0162',
    namespace: 'course',
    key: 'thisCourseWasAddedToYour',
    english: 'This course was added to your cart.',
    variables: [],
    occurrences: [
      {
        id: 'O0204',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:68 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This course was added to your cart.',
      ru: 'Курс добавлен в корзину.',
      uz: 'Bu kurs savatingizga qo‘shildi.',
    },
  },
  {
    unitId: 'MLUX-C0163',
    namespace: 'course',
    key: 'actionUnavailable',
    english: 'Action unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0205',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:75 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Action unavailable',
      ru: 'Действие недоступно',
      uz: 'Amal mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0164',
    namespace: 'course',
    key: 'instructor',
    english: 'Instructor',
    variables: [],
    occurrences: [
      {
        id: 'O0208',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:140 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0411',
        context: 'src/pages/signup-page/RolePicker.tsx:22 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Instructor',
      ru: 'Преподаватель',
      uz: 'O‘qituvchi',
    },
  },
  {
    unitId: 'MLUX-C0165',
    namespace: 'course',
    key: 'totalLessons',
    english: 'Total lessons',
    variables: [],
    occurrences: [
      {
        id: 'O0209',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:144 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Total lessons',
      ru: 'Всего уроков',
      uz: 'Jami darslar',
    },
  },
  {
    unitId: 'MLUX-C0166',
    namespace: 'course',
    key: 'status',
    english: 'Status',
    variables: [],
    occurrences: [
      {
        id: 'O0210',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:148 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Status',
      ru: 'Статус',
      uz: 'Holat',
    },
  },
  {
    unitId: 'MLUX-C0167',
    namespace: 'course',
    key: 'draft',
    english: 'Draft',
    variables: [],
    occurrences: [
      {
        id: 'O0211',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:149 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Draft',
      ru: 'Черновик',
      uz: 'Qoralama',
    },
  },
  {
    unitId: 'MLUX-C0168',
    namespace: 'course',
    key: 'published',
    english: 'Published',
    variables: [],
    occurrences: [
      {
        id: 'O0212',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:149 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Published',
      ru: 'Опубликовано',
      uz: 'Nashr qilingan',
    },
  },
  {
    unitId: 'MLUX-C0169',
    namespace: 'course',
    key: 'courseNotFound',
    english: 'Course not found',
    variables: [],
    occurrences: [
      {
        id: 'O0213',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:35 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course not found',
      ru: 'Курс не найден',
      uz: 'Kurs topilmadi',
    },
  },
  {
    unitId: 'MLUX-C0170',
    namespace: 'course',
    key: 'thisCourseDoesNotExistOr',
    english: 'This course does not exist or is no longer available.',
    variables: [],
    occurrences: [
      {
        id: 'O0214',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:41 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This course does not exist or is no longer available.',
      ru: 'Курс не существует или больше недоступен.',
      uz: 'Bu kurs mavjud emas yoki endi ochiq emas.',
    },
  },
  {
    unitId: 'MLUX-C0171',
    namespace: 'course',
    key: 'returnToTheCourseCatalog',
    english: 'Return to the course catalog',
    variables: [],
    occurrences: [
      {
        id: 'O0215',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:37 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Return to the course catalog',
      ru: 'Вернуться в каталог курсов',
      uz: 'Kurslar katalogiga qaytish',
    },
  },
  {
    unitId: 'MLUX-C0172',
    namespace: 'course',
    key: 'courseDetailsRecovered',
    english: 'Course details recovered.',
    variables: [],
    occurrences: [
      {
        id: 'O0216',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:64 — Page: course-detail-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course details recovered.',
      ru: 'Сведения о курсе восстановлены.',
      uz: 'Kurs tafsilotlari tiklandi.',
    },
  },
  {
    unitId: 'MLUX-C0173',
    namespace: 'course',
    key: 'courseOutlineRecovered',
    english: 'Course outline recovered.',
    variables: [],
    occurrences: [
      {
        id: 'O0217',
        context: 'src/pages/course-detail-page/CourseDetailPage.tsx:68 — Page: course-detail-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course outline recovered.',
      ru: 'Структура курса восстановлена.',
      uz: 'Kurs tuzilmasi tiklandi.',
    },
  },
  {
    unitId: 'MLUX-C0174',
    namespace: 'course',
    key: 'noLessonDescriptionIsAvailable',
    english: 'No lesson description is available.',
    variables: [],
    occurrences: [
      {
        id: 'O0219',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:49 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0484',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:236 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'No lesson description is available.',
      ru: 'Описание урока отсутствует.',
      uz: 'Dars tavsifi mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0175',
    namespace: 'course',
    key: 'draftMetadata',
    english: 'Draft metadata',
    variables: [],
    occurrences: [
      {
        id: 'O0220',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:50 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0485',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:239 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Draft metadata',
      ru: 'Данные черновика',
      uz: 'Qoralama ma’lumotlari',
    },
  },
  {
    unitId: 'MLUX-C0176',
    namespace: 'course',
    key: 'listed',
    english: 'Listed',
    variables: [],
    occurrences: [
      {
        id: 'O0221',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:50 — Page: course-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Listed',
      ru: 'В списке',
      uz: 'Ro‘yxatda',
    },
  },
  {
    unitId: 'MLUX-C0177',
    namespace: 'auth',
    key: 'backToLogin',
    english: 'Back to login',
    variables: [],
    occurrences: [
      {
        id: 'O0224',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:19 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0400',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:26 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0406',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:79 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Back to login',
      ru: 'Вернуться ко входу',
      uz: 'Kirishga qaytish',
    },
  },
  {
    unitId: 'MLUX-C0178',
    namespace: 'auth',
    key: 'useYourResetLink',
    english: 'Use your reset link',
    variables: [],
    occurrences: [
      {
        id: 'O0225',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:22 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Use your reset link',
      ru: 'Используйте ссылку для сброса',
      uz: 'Tiklash havolasidan foydalaning',
    },
  },
  {
    unitId: 'MLUX-C0179',
    namespace: 'auth',
    key: 'requestReceived',
    english: 'Request received',
    variables: [],
    occurrences: [
      {
        id: 'O0226',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:27 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Request received',
      ru: 'Запрос получен',
      uz: 'So‘rov qabul qilindi',
    },
  },
  {
    unitId: 'MLUX-C0180',
    namespace: 'auth',
    key: 'email',
    english: 'Email',
    variables: [],
    occurrences: [
      {
        id: 'O0227',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:40 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0395',
        context: 'src/pages/login-page/LoginPage.tsx:48 — Page: login-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0418',
        context: 'src/pages/signup-page/SignupPage.tsx:44 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Email',
      ru: 'Электронная почта',
      uz: 'Elektron pochta',
    },
  },
  {
    unitId: 'MLUX-C0181',
    namespace: 'auth',
    key: 'submittingRequest',
    english: 'Submitting request...',
    variables: [],
    occurrences: [
      {
        id: 'O0228',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:52 — Page: forgot-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Submitting request...',
      ru: 'Отправка запроса...',
      uz: 'So‘rov yuborilmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0223',
    namespace: 'learning',
    key: 'active',
    english: 'Active',
    variables: [],
    occurrences: [
      {
        id: 'O0374',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:313 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0388',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:28 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Active',
      ru: 'Активно',
      uz: 'Faol',
    },
  },
  {
    unitId: 'MLUX-C0224',
    namespace: 'learning',
    key: 'cancelled',
    english: 'Cancelled',
    variables: [],
    occurrences: [
      {
        id: 'O0375',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:315 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0389',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:29 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Cancelled',
      ru: 'Отменено',
      uz: 'Bekor qilingan',
    },
  },
  {
    unitId: 'MLUX-C0225',
    namespace: 'learning',
    key: 'paymentPending',
    english: 'Payment pending',
    variables: [],
    occurrences: [
      {
        id: 'O0376',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:316 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0378',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:375 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0390',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:30 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Payment pending',
      ru: 'Платёж ожидается',
      uz: 'To‘lov kutilmoqda',
    },
  },
  {
    unitId: 'MLUX-C0261',
    namespace: 'learning',
    key: 'mockPaymentDeclined',
    english: 'Mock payment declined',
    variables: [],
    occurrences: [
      {
        id: 'O0361',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:102 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock payment declined',
      ru: 'Тестовый платёж отклонён',
      uz: 'Sinov to‘lovi rad etildi',
    },
  },
  {
    unitId: 'MLUX-C0262',
    namespace: 'learning',
    key: 'paymentRemainsPending',
    english: 'Payment remains pending',
    variables: [],
    occurrences: [
      {
        id: 'O0362',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:108 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Payment remains pending',
      ru: 'Платёж по-прежнему ожидается',
      uz: 'To‘lov hanuz kutilmoqda',
    },
  },
  {
    unitId: 'MLUX-C0263',
    namespace: 'learning',
    key: 'paymentStatusNeedsChecking',
    english: 'Payment status needs checking',
    variables: [],
    occurrences: [
      {
        id: 'O0363',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:114 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Payment status needs checking',
      ru: 'Нужно проверить статус платежа',
      uz: 'To‘lov holatini tekshirish kerak',
    },
  },
  {
    unitId: 'MLUX-C0264',
    namespace: 'learning',
    key: 'paymentUnavailable',
    english: 'Payment unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0365',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:127 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0366',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:133 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Payment unavailable',
      ru: 'Оплата недоступна',
      uz: 'To‘lov mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0265',
    namespace: 'learning',
    key: 'learningWorkspaceUnavailable',
    english: 'Learning workspace unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0368',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:231 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0371',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:282 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0373',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:300 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning workspace unavailable',
      ru: 'Пространство обучения недоступно',
      uz: 'Ta’lim ish maydoni mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0266',
    namespace: 'learning',
    key: 'thisLearningWorkspaceIsUnavailable',
    english: 'This learning workspace is unavailable.',
    variables: [],
    occurrences: [
      {
        id: 'O0369',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:232 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0372',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:283 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This learning workspace is unavailable.',
      ru: 'Это пространство обучения недоступно.',
      uz: 'Bu ta’lim ish maydoni mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0267',
    namespace: 'learning',
    key: 'loadingLearningWorkspace',
    english: 'Loading learning workspace',
    variables: [],
    occurrences: [
      {
        id: 'O0370',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:240 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading learning workspace',
      ru: 'Загрузка пространства обучения',
      uz: 'Ta’lim ish maydoni yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0268',
    namespace: 'learning',
    key: 'learningProgressUnavailable',
    english: 'Learning progress unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0379',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:376 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning progress unavailable',
      ru: 'Прогресс обучения недоступен',
      uz: 'Ta’lim jarayoni mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0269',
    namespace: 'learning',
    key: 'checkingPaymentStatus',
    english: 'Checking payment status…',
    variables: [],
    occurrences: [
      {
        id: 'O0380',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:392 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Checking payment status…',
      ru: 'Проверяем статус платежа…',
      uz: 'To‘lov holati tekshirilmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0270',
    namespace: 'learning',
    key: 'completingMockPayment',
    english: 'Completing mock payment…',
    variables: [],
    occurrences: [
      {
        id: 'O0381',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:404 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Completing mock payment…',
      ru: 'Завершаем тестовый платёж…',
      uz: 'Sinov to‘lovi yakunlanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0271',
    namespace: 'learning',
    key: 'learningProgressIsNotAvailableFor',
    english: 'Learning progress is not available for this enrollment.',
    variables: [],
    occurrences: [
      {
        id: 'O0382',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:422 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning progress is not available for this enrollment.',
      ru: 'Прогресс обучения недоступен для этой записи на курс.',
      uz: 'Bu kursga yozilish uchun ta’lim jarayoni mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0272',
    namespace: 'learning',
    key: 'mockPaymentSubmitted',
    english: 'Mock payment submitted',
    variables: [],
    occurrences: [
      {
        id: 'O0383',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:95 — Page: learning-detail-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock payment submitted',
      ru: 'Тестовый платёж отправлен',
      uz: 'Sinov to‘lovi yuborildi',
    },
  },
  {
    unitId: 'MLUX-C0273',
    namespace: 'learning',
    key: 'startYourLearningJourney',
    english: 'Start your learning journey',
    variables: [],
    occurrences: [
      {
        id: 'O0384',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:152 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Start your learning journey',
      ru: 'Начните обучение',
      uz: 'Ta’lim yo‘lingizni boshlang',
    },
  },
  {
    unitId: 'MLUX-C0274',
    namespace: 'learning',
    key: 'learningEnrollmentsPagination',
    english: 'Learning enrollments pagination',
    variables: [],
    occurrences: [
      {
        id: 'O0387',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:217 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning enrollments pagination',
      ru: 'Навигация по страницам обучения',
      uz: 'Ta’limga yozilishlar sahifalari',
    },
  },
  {
    unitId: 'MLUX-C0275',
    namespace: 'auth',
    key: 'logInWithAStudentAccount',
    english: 'Log in with a student account to view your cart and continue checkout.',
    variables: [],
    occurrences: [
      {
        id: 'O0392',
        context: 'src/pages/login-page/LoginPage.tsx:28 — Page: login-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Log in with a student account to view your cart and continue checkout.',
      ru: 'Войдите с аккаунтом студента, чтобы открыть корзину и продолжить оформление.',
      uz: 'Savatni ko‘rish va buyurtmani davom ettirish uchun talaba akkaunti bilan kiring.',
    },
  },
  {
    unitId: 'MLUX-C0276',
    namespace: 'auth',
    key: 'newToLearnhub',
    english: 'New to LearnHub?',
    variables: [],
    occurrences: [
      {
        id: 'O0394',
        context: 'src/pages/login-page/LoginPage.tsx:33 — Page: login-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'New to LearnHub?',
      ru: 'Впервые в LearnHub?',
      uz: 'LearnHub’da yangimisiz?',
    },
  },
  {
    unitId: 'MLUX-C0277',
    namespace: 'auth',
    key: 'password',
    english: 'Password',
    variables: [],
    occurrences: [
      {
        id: 'O0396',
        context: 'src/pages/login-page/LoginPage.tsx:59 — Page: login-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0421',
        context: 'src/pages/signup-page/SignupPage.tsx:85 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Password',
      ru: 'Пароль',
      uz: 'Parol',
    },
  },
  {
    unitId: 'MLUX-C0278',
    namespace: 'auth',
    key: 'loggingIn',
    english: 'Logging in...',
    variables: [],
    occurrences: [
      {
        id: 'O0397',
        context: 'src/pages/login-page/LoginPage.tsx:73 — Page: login-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Logging in...',
      ru: 'Выполняется вход...',
      uz: 'Kirilmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0279',
    namespace: 'auth',
    key: 'newPassword',
    english: 'New password',
    variables: [],
    occurrences: [
      {
        id: 'O0401',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:38 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'New password',
      ru: 'Новый пароль',
      uz: 'Yangi parol',
    },
  },
  {
    unitId: 'MLUX-C0280',
    namespace: 'auth',
    key: 'confirmNewPassword',
    english: 'Confirm new password',
    variables: [],
    occurrences: [
      {
        id: 'O0402',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:48 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Confirm new password',
      ru: 'Подтвердите новый пароль',
      uz: 'Yangi parolni tasdiqlang',
    },
  },
  {
    unitId: 'MLUX-C0281',
    namespace: 'auth',
    key: 'resettingPassword',
    english: 'Resetting password...',
    variables: [],
    occurrences: [
      {
        id: 'O0403',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:59 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Resetting password...',
      ru: 'Сброс пароля...',
      uz: 'Parol tiklanmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0282',
    namespace: 'auth',
    key: 'passwordResetComplete',
    english: 'Password reset complete',
    variables: [],
    occurrences: [
      {
        id: 'O0407',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:81 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Password reset complete',
      ru: 'Пароль сброшен',
      uz: 'Parol tiklandi',
    },
  },
  {
    unitId: 'MLUX-C0283',
    namespace: 'auth',
    key: 'logInWithYourNewPassword',
    english: 'Log in with your new password',
    variables: [],
    occurrences: [
      {
        id: 'O0408',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:83 — Page: reset-password-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Log in with your new password',
      ru: 'Войти с новым паролем',
      uz: 'Yangi parol bilan kirish',
    },
  },
  {
    unitId: 'MLUX-C0284',
    namespace: 'auth',
    key: 'roleOptions',
    english: 'Role options',
    variables: [],
    occurrences: [
      {
        id: 'O0409',
        context: 'src/pages/signup-page/RolePicker.tsx:124 — Page: signup-page',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Role options',
      ru: 'Варианты роли',
      uz: 'Rol variantlari',
    },
  },
  {
    unitId: 'MLUX-C0285',
    namespace: 'auth',
    key: 'student',
    english: 'Student',
    variables: [],
    occurrences: [
      {
        id: 'O0410',
        context: 'src/pages/signup-page/RolePicker.tsx:21 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Student',
      ru: 'Студент',
      uz: 'Talaba',
    },
  },
  {
    unitId: 'MLUX-C0286',
    namespace: 'auth',
    key: 'admin',
    english: 'Admin',
    variables: [],
    occurrences: [
      {
        id: 'O0412',
        context: 'src/pages/signup-page/RolePicker.tsx:23 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Admin',
      ru: 'Администратор',
      uz: 'Administrator',
    },
  },
  {
    unitId: 'MLUX-C0287',
    namespace: 'auth',
    key: 'role',
    english: 'Role',
    variables: [],
    occurrences: [
      {
        id: 'O0413',
        context: 'src/pages/signup-page/RolePicker.tsx:84 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Role',
      ru: 'Роль',
      uz: 'Rol',
    },
  },
  {
    unitId: 'MLUX-C0288',
    namespace: 'auth',
    key: 'creatingAccount',
    english: 'Creating account...',
    variables: [],
    occurrences: [
      {
        id: 'O0414',
        context: 'src/pages/signup-page/SignupPage.tsx:106 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Creating account...',
      ru: 'Создание аккаунта...',
      uz: 'Akkaunt yaratilmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0289',
    namespace: 'auth',
    key: 'alreadyHaveAnAccount',
    english: 'Already have an account?',
    variables: [],
    occurrences: [
      {
        id: 'O0417',
        context: 'src/pages/signup-page/SignupPage.tsx:29 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Already have an account?',
      ru: 'Уже есть аккаунт?',
      uz: 'Akkauntingiz bormi?',
    },
  },
  {
    unitId: 'MLUX-C0290',
    namespace: 'auth',
    key: 'firstName',
    english: 'First name',
    variables: [],
    occurrences: [
      {
        id: 'O0419',
        context: 'src/pages/signup-page/SignupPage.tsx:56 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'First name',
      ru: 'Имя',
      uz: 'Ism',
    },
  },
  {
    unitId: 'MLUX-C0291',
    namespace: 'auth',
    key: 'lastName',
    english: 'Last name',
    variables: [],
    occurrences: [
      {
        id: 'O0420',
        context: 'src/pages/signup-page/SignupPage.tsx:67 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Last name',
      ru: 'Фамилия',
      uz: 'Familiya',
    },
  },
  {
    unitId: 'MLUX-C0292',
    namespace: 'auth',
    key: 'confirmPassword',
    english: 'Confirm password',
    variables: [],
    occurrences: [
      {
        id: 'O0422',
        context: 'src/pages/signup-page/SignupPage.tsx:95 — Page: signup-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Confirm password',
      ru: 'Подтвердите пароль',
      uz: 'Parolni tasdiqlang',
    },
  },
  {
    unitId: 'MLUX-C0293',
    namespace: 'a11y',
    key: 'actionInProgress',
    english: 'Action in progress',
    variables: [],
    occurrences: [
      {
        id: 'O0423',
        context: 'src/shared/ui/primitives/Button.tsx:22 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Action in progress',
      ru: 'Действие выполняется',
      uz: 'Amal bajarilmoqda',
    },
  },
  {
    unitId: 'MLUX-C0294',
    namespace: 'a11y',
    key: 'actionCompleted',
    english: 'Action completed',
    variables: [],
    occurrences: [
      {
        id: 'O0424',
        context: 'src/shared/ui/primitives/Button.tsx:23 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Action completed',
      ru: 'Действие выполнено',
      uz: 'Amal bajarildi',
    },
  },
  {
    unitId: 'MLUX-C0295',
    namespace: 'a11y',
    key: 'actionFailed',
    english: 'Action failed',
    variables: [],
    occurrences: [
      {
        id: 'O0425',
        context: 'src/shared/ui/primitives/Button.tsx:24 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Action failed',
      ru: 'Не удалось выполнить действие',
      uz: 'Amal bajarilmadi',
    },
  },
  {
    unitId: 'MLUX-C0296',
    namespace: 'common',
    key: 'loading',
    english: 'Loading…',
    variables: [],
    occurrences: [
      {
        id: 'O0426',
        context: 'src/shared/ui/primitives/Button.tsx:31 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Loading…',
      ru: 'Загрузка…',
      uz: 'Yuklanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0297',
    namespace: 'common',
    key: 'working',
    english: 'Working...',
    variables: [],
    occurrences: [
      {
        id: 'O0427',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:28 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Working...',
      ru: 'Выполняется...',
      uz: 'Bajarilmoqda...',
    },
  },
  {
    unitId: 'MLUX-C0298',
    namespace: 'common',
    key: 'cancel',
    english: 'Cancel',
    variables: [],
    occurrences: [
      {
        id: 'O0428',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Cancel',
      ru: 'Отмена',
      uz: 'Bekor qilish',
    },
  },
  {
    unitId: 'MLUX-C0299',
    namespace: 'common',
    key: 'unableToCompleteAction',
    english: 'Unable to complete action',
    variables: [],
    occurrences: [
      {
        id: 'O0429',
        context: 'src/shared/ui/primitives/DestructiveConfirmation.tsx:45 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Unable to complete action',
      ru: 'Не удалось выполнить действие',
      uz: 'Amalni bajarib bo‘lmadi',
    },
  },
  {
    unitId: 'MLUX-C0300',
    namespace: 'a11y',
    key: 'closeDialog',
    english: 'Close dialog',
    variables: [],
    occurrences: [
      {
        id: 'O0430',
        context: 'src/shared/ui/primitives/Dialog.tsx:218 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Close dialog',
      ru: 'Закрыть диалог',
      uz: 'Dialogni yopish',
    },
  },
  {
    unitId: 'MLUX-C0301',
    namespace: 'a11y',
    key: 'dismissNotification',
    english: 'Dismiss notification',
    variables: [],
    occurrences: [
      {
        id: 'O0431',
        context: 'src/shared/ui/primitives/Notice.tsx:21 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Dismiss notification',
      ru: 'Закрыть уведомление',
      uz: 'Bildirishnomani yopish',
    },
  },
  {
    unitId: 'MLUX-C0302',
    namespace: 'a11y',
    key: 'goToPreviousPage',
    english: 'Go to previous page',
    variables: [],
    occurrences: [
      {
        id: 'O0432',
        context: 'src/shared/ui/primitives/Pagination.tsx:108 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Go to previous page',
      ru: 'Перейти на предыдущую страницу',
      uz: 'Oldingi sahifaga o‘tish',
    },
  },
  {
    unitId: 'MLUX-C0303',
    namespace: 'common',
    key: 'previous',
    english: 'Previous',
    variables: [],
    occurrences: [
      {
        id: 'O0433',
        context: 'src/shared/ui/primitives/Pagination.tsx:113 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Previous',
      ru: 'Назад',
      uz: 'Oldingi',
    },
  },
  {
    unitId: 'MLUX-C0304',
    namespace: 'a11y',
    key: 'pageCurrentPage',
    english: 'Page {pageNumber}, current page',
    variables: ['pageNumber'],
    occurrences: [
      {
        id: 'O0434',
        context: 'src/shared/ui/primitives/Pagination.tsx:130 — Shared UI',
        classification: 'Accessibility only',
      },
      {
        id: 'O0436',
        context: 'src/shared/ui/primitives/Pagination.tsx:160 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Page {{pageNumber}}, current page',
      ru: 'Страница {{pageNumber}}, текущая страница',
      uz: '{{pageNumber}}-sahifa, joriy sahifa',
    },
  },
  {
    unitId: 'MLUX-C0305',
    namespace: 'a11y',
    key: 'goToPage',
    english: 'Go to page {pageNumber}',
    variables: ['pageNumber'],
    occurrences: [
      {
        id: 'O0435',
        context: 'src/shared/ui/primitives/Pagination.tsx:139 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Go to page {{pageNumber}}',
      ru: 'Перейти на страницу {{pageNumber}}',
      uz: '{{pageNumber}}-sahifaga o‘tish',
    },
  },
  {
    unitId: 'MLUX-C0306',
    namespace: 'a11y',
    key: 'goToNextPage',
    english: 'Go to next page',
    variables: [],
    occurrences: [
      {
        id: 'O0437',
        context: 'src/shared/ui/primitives/Pagination.tsx:171 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Go to next page',
      ru: 'Перейти на следующую страницу',
      uz: 'Keyingi sahifaga o‘tish',
    },
  },
  {
    unitId: 'MLUX-C0307',
    namespace: 'common',
    key: 'next',
    english: 'Next',
    variables: [],
    occurrences: [
      {
        id: 'O0438',
        context: 'src/shared/ui/primitives/Pagination.tsx:173 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Next',
      ru: 'Далее',
      uz: 'Keyingi',
    },
  },
  {
    unitId: 'MLUX-C0308',
    namespace: 'a11y',
    key: 'pagination',
    english: 'Pagination',
    variables: [],
    occurrences: [
      {
        id: 'O0439',
        context: 'src/shared/ui/primitives/Pagination.tsx:50 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Pagination',
      ru: 'Постраничная навигация',
      uz: 'Sahifalash',
    },
  },
  {
    unitId: 'MLUX-C0309',
    namespace: 'a11y',
    key: 'loadingContent',
    english: 'Loading content',
    variables: [],
    occurrences: [
      {
        id: 'O0440',
        context: 'src/shared/ui/primitives/Skeleton.tsx:42 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading content',
      ru: 'Загрузка содержимого',
      uz: 'Kontent yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0310',
    namespace: 'catalog',
    key: 'courseFilters',
    english: 'Course filters',
    variables: [],
    occurrences: [
      {
        id: 'O0441',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:121 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course filters',
      ru: 'Фильтры курсов',
      uz: 'Kurs filtrlari',
    },
  },
  {
    unitId: 'MLUX-C0311',
    namespace: 'catalog',
    key: 'min',
    english: 'Min',
    variables: [],
    occurrences: [
      {
        id: 'O0442',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:140 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Min',
      ru: 'Мин.',
      uz: 'Min.',
    },
  },
  {
    unitId: 'MLUX-C0312',
    namespace: 'catalog',
    key: 'minPrice',
    english: 'Min price',
    variables: [],
    occurrences: [
      {
        id: 'O0443',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:146 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Min price',
      ru: 'Минимальная цена',
      uz: 'Minimal narx',
    },
  },
  {
    unitId: 'MLUX-C0313',
    namespace: 'catalog',
    key: 'max',
    english: 'Max',
    variables: [],
    occurrences: [
      {
        id: 'O0444',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:164 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Max',
      ru: 'Макс.',
      uz: 'Maks.',
    },
  },
  {
    unitId: 'MLUX-C0314',
    namespace: 'catalog',
    key: 'maxPrice',
    english: 'Max price',
    variables: [],
    occurrences: [
      {
        id: 'O0445',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Max price',
      ru: 'Максимальная цена',
      uz: 'Maksimal narx',
    },
  },
  {
    unitId: 'MLUX-C0315',
    namespace: 'catalog',
    key: 'maximumPriceMustBeAtLeast',
    english: 'Maximum price must be at least the minimum price.',
    variables: [],
    occurrences: [
      {
        id: 'O0446',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:73 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Maximum price must be at least the minimum price.',
      ru: 'Максимальная цена должна быть не меньше минимальной.',
      uz: 'Maksimal narx minimal narxdan kam bo‘lmasligi kerak.',
    },
  },
  {
    unitId: 'MLUX-C0316',
    namespace: 'ai',
    key: 'closeCourseAssistant',
    english: 'Close course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0450',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:163 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Close course assistant',
      ru: 'Закрыть ассистента курса',
      uz: 'Kurs yordamchisini yopish',
    },
  },
  {
    unitId: 'MLUX-C0317',
    namespace: 'ai',
    key: 'courseAssistantChat',
    english: 'Course assistant chat',
    variables: [],
    occurrences: [
      {
        id: 'O0454',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:70 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course assistant chat',
      ru: 'Чат с ассистентом курса',
      uz: 'Kurs yordamchisi chati',
    },
  },
  {
    unitId: 'MLUX-C0318',
    namespace: 'ai',
    key: 'expandCourseAssistant',
    english: 'Expand course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0455',
        context: 'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:79 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Expand course assistant',
      ru: 'Развернуть ассистента курса',
      uz: 'Kurs yordamchisini kengaytirish',
    },
  },
  {
    unitId: 'MLUX-C0319',
    namespace: 'ai',
    key: 'courseAssistant0319',
    english: 'Course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0456',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:184 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Course assistant',
      ru: 'Ассистент курса',
      uz: 'Kurs yordamchisi',
    },
  },
  {
    unitId: 'MLUX-C0320',
    namespace: 'ai',
    key: 'askAQuestionAboutYourLearning',
    english: 'Ask a question about your learning.',
    variables: [],
    occurrences: [
      {
        id: 'O0457',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:200 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Ask a question about your learning.',
      ru: 'Задайте вопрос о своём обучении.',
      uz: 'Ta’limingiz haqida savol bering.',
    },
  },
  {
    unitId: 'MLUX-C0321',
    namespace: 'ai',
    key: 'askAQuestionAboutThisCourse',
    english: 'Ask a question about this course.',
    variables: [],
    occurrences: [
      {
        id: 'O0458',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:201 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Ask a question about this course.',
      ru: 'Задайте вопрос об этом курсе.',
      uz: 'Bu kurs haqida savol bering.',
    },
  },
  {
    unitId: 'MLUX-C0322',
    namespace: 'ai',
    key: 'signInAgainBeforeUsingThe',
    english: 'Sign in again before using the assistant.',
    variables: [],
    occurrences: [
      {
        id: 'O0460',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:22 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Sign in again before using the assistant.',
      ru: 'Войдите снова, прежде чем использовать ассистента.',
      uz: 'Yordamchidan foydalanishdan oldin qayta kiring.',
    },
  },
  {
    unitId: 'MLUX-C0323',
    namespace: 'ai',
    key: 'messageTheCourseAssistant',
    english: 'Message the course assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0461',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:229 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Message the course assistant',
      ru: 'Написать ассистенту курса',
      uz: 'Kurs yordamchisiga yozish',
    },
  },
  {
    unitId: 'MLUX-C0324',
    namespace: 'ai',
    key: 'askAboutCoursesLessonsOrLearning',
    english: 'Ask about courses, lessons, or learning…',
    variables: [],
    occurrences: [
      {
        id: 'O0462',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:233 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Ask about courses, lessons, or learning…',
      ru: 'Спросите о курсах, уроках или обучении…',
      uz: 'Kurslar, darslar yoki ta’lim haqida so‘rang…',
    },
  },
  {
    unitId: 'MLUX-C0325',
    namespace: 'ai',
    key: 'checkTheMessageAndTryAgain',
    english: 'Check the message and try again.',
    variables: [],
    occurrences: [
      {
        id: 'O0463',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:24 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Check the message and try again.',
      ru: 'Проверьте сообщение и повторите попытку.',
      uz: 'Xabarni tekshirib, qayta urinib ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0326',
    namespace: 'ai',
    key: 'messageNeedsChecking',
    english: 'Message needs checking',
    variables: [],
    occurrences: [
      {
        id: 'O0464',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:24 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Message needs checking',
      ru: 'Проверьте сообщение',
      uz: 'Xabarni tekshirish kerak',
    },
  },
  {
    unitId: 'MLUX-C0327',
    namespace: 'ai',
    key: 'sendMessage',
    english: 'Send message',
    variables: [],
    occurrences: [
      {
        id: 'O0465',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:243 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Send message',
      ru: 'Отправить сообщение',
      uz: 'Xabar yuborish',
    },
  },
  {
    unitId: 'MLUX-C0328',
    namespace: 'ai',
    key: 'sendingMessage',
    english: 'Sending message',
    variables: [],
    occurrences: [
      {
        id: 'O0466',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:246 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Sending message',
      ru: 'Отправка сообщения',
      uz: 'Xabar yuborilmoqda',
    },
  },
  {
    unitId: 'MLUX-C0329',
    namespace: 'ai',
    key: 'assistantTemporarilyUnavailable',
    english: 'Assistant temporarily unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0467',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:27 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Assistant temporarily unavailable',
      ru: 'Ассистент временно недоступен',
      uz: 'Yordamchi vaqtincha mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0330',
    namespace: 'ai',
    key: 'theAssistantIsTemporarilyUnavailable',
    english: 'The assistant is temporarily unavailable.',
    variables: [],
    occurrences: [
      {
        id: 'O0468',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:28 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'The assistant is temporarily unavailable.',
      ru: 'Ассистент временно недоступен.',
      uz: 'Yordamchi vaqtincha mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0331',
    namespace: 'ai',
    key: 'assistantUnavailable0331',
    english: 'Assistant unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0469',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Assistant unavailable',
      ru: 'Ассистент недоступен',
      uz: 'Yordamchi mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0332',
    namespace: 'ai',
    key: 'theAssistantIsUnavailable',
    english: 'The assistant is unavailable.',
    variables: [],
    occurrences: [
      {
        id: 'O0470',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:30 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'The assistant is unavailable.',
      ru: 'Ассистент недоступен.',
      uz: 'Yordamchi mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0333',
    namespace: 'learning',
    key: 'completeLesson',
    english: 'Complete lesson',
    variables: [],
    occurrences: [
      {
        id: 'O0471',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:114 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Complete lesson',
      ru: 'Завершить урок',
      uz: 'Darsni yakunlash',
    },
  },
  {
    unitId: 'MLUX-C0334',
    namespace: 'learning',
    key: 'undoCompletion',
    english: 'Undo completion',
    variables: [],
    occurrences: [
      {
        id: 'O0472',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:114 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Undo completion',
      ru: 'Отменить завершение',
      uz: 'Yakunlashni bekor qilish',
    },
  },
  {
    unitId: 'MLUX-C0335',
    namespace: 'learning',
    key: 'learningProgressIsUnavailable',
    english: 'Learning progress is unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0473',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:142 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning progress is unavailable',
      ru: 'Прогресс обучения недоступен',
      uz: 'Ta’lim jarayoni mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0336',
    namespace: 'learning',
    key: 'tryAgainToLoadThisWorkspace',
    english: 'Try again to load this workspace.',
    variables: [],
    occurrences: [
      {
        id: 'O0474',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:143 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try again to load this workspace.',
      ru: 'Повторите загрузку этого пространства.',
      uz: 'Bu ish maydonini qayta yuklab ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0337',
    namespace: 'learning',
    key: 'lessonOutlineIsUnavailable',
    english: 'Lesson outline is unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0475',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Lesson outline is unavailable',
      ru: 'Структура уроков недоступна',
      uz: 'Darslar tuzilmasi mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0338',
    namespace: 'learning',
    key: 'progressSummaryIsUnavailable',
    english: 'Progress summary is unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0476',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:170 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Progress summary is unavailable',
      ru: 'Сводка прогресса недоступна',
      uz: 'Jarayon xulosasi mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0339',
    namespace: 'learning',
    key: 'tryAgainToLoadYourProgress',
    english: 'Try again to load your progress summary.',
    variables: [],
    occurrences: [
      {
        id: 'O0477',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:175 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try again to load your progress summary.',
      ru: 'Повторите загрузку сводки прогресса.',
      uz: 'Jarayon xulosasini qayta yuklab ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0340',
    namespace: 'learning',
    key: 'tryAgainToLoadTheLesson',
    english: 'Try again to load the lesson outline.',
    variables: [],
    occurrences: [
      {
        id: 'O0478',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:176 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try again to load the lesson outline.',
      ru: 'Повторите загрузку структуры уроков.',
      uz: 'Darslar tuzilmasini qayta yuklab ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0341',
    namespace: 'learning',
    key: 'learningProgress',
    english: 'Learning progress',
    variables: [],
    occurrences: [
      {
        id: 'O0479',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:187 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Learning progress',
      ru: 'Прогресс обучения',
      uz: 'Ta’lim jarayoni',
    },
  },
  {
    unitId: 'MLUX-C0342',
    namespace: 'learning',
    key: 'ofCompleted',
    english: '{completedLessons} of {totalLessons} {lessonsLabel} completed',
    variables: ['completedLessons', 'totalLessons', 'lessonsLabel'],
    occurrences: [
      {
        id: 'O0480',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:189 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: '{{completedLessons}} of {{totalLessons}} {{lessonsLabel}} completed',
      ru: 'Завершено: {{completedLessons}} из {{totalLessons}} {{lessonsLabel}}',
      uz: '{{totalLessons}} ta {{lessonsLabel}}dan {{completedLessons}} tasi yakunlandi',
    },
  },
  {
    unitId: 'MLUX-C0343',
    namespace: 'learning',
    key: 'ofCompleted0343',
    english: '{completedLessons} of {totalLessons} {lessonsLabel} completed, {progressPercentage}%',
    variables: ['completedLessons', 'totalLessons', 'lessonsLabel', 'progressPercentage'],
    occurrences: [
      {
        id: 'O0481',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:198 — Shared UI',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: '{{completedLessons}} of {{totalLessons}} {{lessonsLabel}} completed, {{progressPercentage}}%',
      ru: 'Завершено: {{completedLessons}} из {{totalLessons}} {{lessonsLabel}}, {{progressPercentage}}%',
      uz: '{{totalLessons}} ta {{lessonsLabel}}dan {{completedLessons}} tasi yakunlandi, {{progressPercentage}}%',
    },
  },
  {
    unitId: 'MLUX-C0344',
    namespace: 'learning',
    key: 'lessons',
    english: 'Lessons ({totalLessons})',
    variables: ['totalLessons'],
    occurrences: [
      {
        id: 'O0482',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:205 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Lessons ({{totalLessons}})',
      ru: 'Уроки ({{totalLessons}})',
      uz: 'Darslar ({{totalLessons}})',
    },
  },
  {
    unitId: 'MLUX-C0345',
    namespace: 'learning',
    key: 'noLessonMetadataIsAvailableFor',
    english: 'No lesson metadata is available for this course.',
    variables: [],
    occurrences: [
      {
        id: 'O0483',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:214 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'No lesson metadata is available for this course.',
      ru: 'Для этого курса нет данных об уроках.',
      uz: 'Bu kurs uchun dars ma’lumotlari mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0346',
    namespace: 'learning',
    key: 'listedMetadata',
    english: 'Listed metadata',
    variables: [],
    occurrences: [
      {
        id: 'O0486',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:239 — Shared UI',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Listed metadata',
      ru: 'Опубликованные данные',
      uz: 'Ro‘yxatdagi ma’lumotlar',
    },
  },
  {
    unitId: 'MLUX-C0347',
    namespace: 'learning',
    key: 'loadingYourLearning',
    english: 'Loading your learning',
    variables: [],
    occurrences: [
      {
        id: 'O0488',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:111 — Accessibility only',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading your learning',
      ru: 'Загрузка обучения',
      uz: 'Ta’lim yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0348',
    namespace: 'learning',
    key: 'noCoursesEnrolledYet',
    english:
      'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',
    variables: [],
    occurrences: [
      {
        id: 'O0490',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:161 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',
      ru: 'Вы ещё не записались ни на один курс. Откройте каталог и выберите свой первый курс.',
      uz: 'Siz hali hech qaysi kursga yozilmadingiz. Katalogni ochib, ilk kursingizni tanlang.',
    },
  },
  {
    unitId: 'MLUX-C0349',
    namespace: 'learning',
    key: 'browseCourses',
    english: 'Browse courses',
    variables: [],
    occurrences: [
      {
        id: 'O0491',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:165 — Page: learning-list-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Browse courses', ru: 'Смотреть курсы', uz: 'Kurslarni ko‘rish' },
  },
  {
    unitId: 'MLUX-C0350',
    namespace: 'learning',
    key: 'enrollmentSummary',
    english: '{total} enrollment{suffix} · Page {page} of {pages}',
    variables: ['total', 'suffix', 'page', 'pages'],
    placeholdersByLocale: {
      en: ['page', 'pages', 'suffix', 'total'],
      ru: ['page', 'pages', 'total'],
      uz: ['page', 'pages', 'total'],
    },
    occurrences: [
      {
        id: 'O0492',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:194 — Accessibility only',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: '{{total}} enrollment{{suffix}} · Page {{page}} of {{pages}}',
      ru: 'Записей на курсы: {{total}} · Страница {{page}} из {{pages}}',
      uz: 'Kurslarga yozilishlar: {{total}} · {{page}}-sahifa, jami {{pages}} ta',
    },
  },
  {
    unitId: 'MLUX-C0351',
    namespace: 'learning',
    key: 'openCourse',
    english: 'Open course',
    variables: [],
    occurrences: [
      {
        id: 'O0493',
        context: 'src/pages/learning-list-page/LearningListPage.tsx:212 — Visible UI copy',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Open course', ru: 'Открыть курс', uz: 'Kursni ochish' },
  },
  {
    unitId: 'MLUX-C0352',
    namespace: 'ai',
    key: 'thinking',
    english: 'Thinking…',
    variables: [],
    occurrences: [
      {
        id: 'O0494',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:112 — Accessibility only',
        classification: 'Accessibility only',
      },
    ],
    translations: { en: 'Thinking…', ru: 'Думаю…', uz: 'O‘ylanmoqda…' },
  },
  {
    unitId: 'MLUX-C0353',
    namespace: 'ai',
    key: 'couldntGenerateResponse',
    english: 'Couldn’t generate a response.',
    variables: [],
    occurrences: [
      {
        id: 'O0495',
        context: 'src/widgets/course-chat/CourseChatPanel.tsx:127 — Visible UI copy',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Couldn’t generate a response.',
      ru: 'Не удалось сгенерировать ответ.',
      uz: 'Javobni yaratib bo‘lmadi.',
    },
  },
  {
    unitId: 'MLUX-C0354',
    namespace: 'catalog',
    key: 'browseCoursesCraftedByIndustry',
    english:
      'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',
    variables: [],
    occurrences: [
      {
        id: 'O0496',
        context: 'src/pages/catalog-page/CatalogPage.tsx:335 — Page: catalog-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',
      ru: 'Изучайте курсы от экспертов отрасли. Развивайте карьеру в технологиях, дизайне, бизнесе и управлении.',
      uz: 'Soha mutaxassislari yaratgan kurslarni o‘rganing. Texnologiya, dizayn, biznes va boshqaruvda karyerangizni rivojlantiring.',
    },
  },
  {
    unitId: 'MLUX-C0355',
    namespace: 'cart',
    key: 'browseCourses',
    english: 'Browse courses',
    variables: [],
    occurrences: [
      {
        id: 'O0497',
        context: 'src/pages/cart-page/CartPage.tsx:251 — Page: cart-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0498',
        context: 'src/pages/cart-page/CartPage.tsx:490 — Page: cart-page',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Browse courses', ru: 'Смотреть курсы', uz: 'Kurslarni ko‘rish' },
  },
  {
    unitId: 'MLUX-C0356',
    namespace: 'catalog',
    key: 'priceUnavailable',
    english: 'Price unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0499',
        context: 'src/pages/catalog-page/course-card-presentation.ts:44 — Visible UI copy',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0500',
        context: 'src/pages/catalog-page/course-card-presentation.ts:53 — Visible UI copy',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Price unavailable', ru: 'Цена недоступна', uz: 'Narx mavjud emas' },
  },
  {
    unitId: 'MLUX-C0357',
    namespace: 'course',
    key: 'courseAction',
    english: 'Course action',
    variables: [],
    occurrences: [
      {
        id: 'O0501',
        context: 'src/pages/course-detail-page/CourseActionPanel.tsx:104 — Accessibility only',
        classification: 'Accessibility only',
      },
    ],
    translations: { en: 'Course action', ru: 'Действия с курсом', uz: 'Kurs amallari' },
  },
  {
    unitId: 'MLUX-C0366',
    namespace: 'catalog',
    key: 'priceRange',
    english: 'Price range',
    variables: [],
    occurrences: [
      {
        id: 'O0512',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:135 — Visible UI copy',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Price range', ru: 'Диапазон цен', uz: 'Narx oralig‘i' },
  },
  {
    unitId: 'MLUX-C0367',
    namespace: 'catalog',
    key: 'priceLabel',
    english: 'Price:',
    variables: [],
    occurrences: [
      {
        id: 'O0513',
        context: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:141 — Visible UI copy',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Price:', ru: 'Цена:', uz: 'Narx:' },
  },
  {
    unitId: 'MLUX-C0368',
    namespace: 'catalog',
    key: 'price',
    english: 'price',
    variables: [],
    occurrences: [
      {
        id: 'O0514',
        context:
          'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:147 — Accessibility only (minimum price suffix)',
        classification: 'Accessibility only',
      },
      {
        id: 'O0515',
        context:
          'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx:171 — Accessibility only (maximum price suffix)',
        classification: 'Accessibility only',
      },
    ],
    translations: { en: 'price', ru: 'цена', uz: 'narx' },
  },
  {
    unitId: 'MLUX-C0399',
    namespace: 'catalog',
    key: 'sortByLabel',
    english: 'Sort by:',
    variables: [],
    occurrences: [
      {
        id: 'O0568',
        context: 'src/pages/catalog-page/CatalogPage.tsx:385 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Sort by:', ru: 'Сортировать по:', uz: 'Saralash:' },
  },
  {
    unitId: 'MLUX-C0400',
    namespace: 'catalog',
    key: 'sort',
    english: 'Sort:',
    variables: [],
    occurrences: [
      {
        id: 'O0569',
        context: 'src/pages/catalog-page/CatalogPage.tsx:388 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Sort:', ru: 'Сортировка:', uz: 'Saralash:' },
  },
  {
    unitId: 'MLUX-C0401',
    namespace: 'catalog',
    key: 'lessonAvailability',
    english: '{{count}} lessons available',
    variables: ['count'],
    plural: true,
    occurrences: [
      {
        id: 'O0570',
        context: 'src/pages/catalog-page/CourseCard.tsx:365 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0571',
        context: 'src/pages/catalog-page/CourseCard.tsx:365 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: '{{count}} lessons available',
      ru: '{{count}} доступный урок',
      uz: '{{count}} ta dars mavjud',
    },
  },
  {
    unitId: 'MLUX-C0402',
    namespace: 'catalog',
    key: 'courseDescription',
    english: 'Course description:',
    variables: [],
    occurrences: [
      {
        id: 'O0572',
        context: 'src/pages/catalog-page/CourseCard.tsx:385 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Course description:', ru: 'Описание курса:', uz: 'Kurs tavsifi:' },
  },
  {
    unitId: 'MLUX-C0403',
    namespace: 'catalog',
    key: 'details',
    english: 'Details',
    variables: [],
    occurrences: [
      {
        id: 'O0573',
        context: 'src/pages/catalog-page/CourseCard.tsx:408 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Details', ru: 'Подробнее', uz: 'Batafsil' },
  },
  {
    unitId: 'MLUX-C0437',
    namespace: 'catalog',
    key: 'masterTheSkillsShapingThe',
    english: 'Master the Skills Shaping the',
    variables: [],
    occurrences: [
      {
        id: 'O0617',
        context: 'src/pages/catalog-page/CatalogPage.tsx:325 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Master the Skills Shaping the',
      ru: 'Освойте навыки, которые формируют',
      uz: 'Kelajakni shakllantirayotgan ko‘nikmalarni egallang',
    },
  },
  {
    unitId: 'MLUX-C0438',
    namespace: 'catalog',
    key: 'future',
    english: 'Future',
    variables: [],
    occurrences: [
      {
        id: 'O0618',
        context: 'src/pages/catalog-page/CatalogPage.tsx:329 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Future', ru: 'будущее', uz: 'Kelajak' },
  },
  {
    unitId: 'MLUX-C0439',
    namespace: 'catalog',
    key: 'tryChangingOrClearingYour',
    english: 'Try changing or clearing your filters.',
    variables: [],
    occurrences: [
      {
        id: 'O0619',
        context: 'src/pages/catalog-page/CatalogPage.tsx:426 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Try changing or clearing your filters.',
      ru: 'Попробуйте изменить или сбросить фильтры.',
      uz: 'Filtrlarni o‘zgartirib yoki tozalab ko‘ring.',
    },
  },
  {
    unitId: 'MLUX-C0441',
    namespace: 'catalog',
    key: 'resultCount',
    english: '{{count}} courses',
    variables: ['count'],
    plural: true,
    occurrences: [
      {
        id: 'O0621',
        context: 'src/pages/catalog-page/CatalogPage.tsx:370 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: '{{count}} courses', ru: '{{count}} курс', uz: '{{count}} ta kurs' },
  },
  {
    unitId: 'MLUX-C0442',
    namespace: 'catalog',
    key: 'addToCart',
    english: 'Add to cart',
    variables: [],
    occurrences: [
      {
        id: 'O0622',
        context:
          'src/pages/catalog-page/course-card-presentation.ts:37 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Add to cart', ru: 'В корзину', uz: 'Savatga qo‘shish' },
  },
  {
    unitId: 'MLUX-C0443',
    namespace: 'catalog',
    key: 'enrollFree',
    english: 'Enroll free',
    variables: [],
    occurrences: [
      {
        id: 'O0623',
        context:
          'src/pages/catalog-page/course-card-presentation.ts:38 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Enroll free', ru: 'Записаться бесплатно', uz: 'Bepul yozilish' },
  },
  {
    unitId: 'MLUX-C0444',
    namespace: 'catalog',
    key: 'notPublished',
    english: 'Not published',
    variables: [],
    occurrences: [
      {
        id: 'O0624',
        context:
          'src/pages/catalog-page/course-card-presentation.ts:39 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'Not published', ru: 'Не опубликован', uz: 'Nashr qilinmagan' },
  },
  {
    unitId: 'MLUX-C0445',
    namespace: 'catalog',
    key: 'free',
    english: 'FREE',
    variables: [],
    occurrences: [
      {
        id: 'O0625',
        context:
          'src/pages/catalog-page/course-card-presentation.ts:49 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'FREE', ru: 'БЕСПЛАТНО', uz: 'BEPUL' },
  },
  {
    unitId: 'MLUX-C0446',
    namespace: 'learning',
    key: 'lessonCount',
    english: 'lesson',
    variables: ['count'],
    plural: true,
    occurrences: [
      {
        id: 'O0626',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:172 — DRAFT-21 progress noun selector',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0627',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:172 — DRAFT-21 progress noun selector',
        classification: 'Accessibility only',
      },
      {
        id: 'O0628',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:254 — DRAFT-21 coming-soon noun selector',
        classification: 'Visible UI copy',
      },
    ],
    translations: { en: 'lesson', ru: 'урок', uz: 'dars' },
  },
  {
    unitId: 'MLUX-C0374',
    namespace: 'course',
    key: 'mediaUnavailableInWorkspace',
    english: 'Media unavailable in this workspace',
    variables: [],
    occurrences: [
      {
        id: 'O0534',
        context: 'src/features/media-access/LessonMediaAccess.tsx:67 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Media unavailable in this workspace',
      ru: 'Медиа недоступны в этом разделе',
      uz: 'Media bu bo‘limda mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0375',
    namespace: 'course',
    key: 'preparingPdfPreview',
    english: 'Preparing PDF preview…',
    variables: [],
    occurrences: [
      {
        id: 'O0536',
        context: 'src/features/media-access/LessonMediaAccess.tsx:104 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Preparing PDF preview…',
      ru: 'Подготовка предпросмотра PDF…',
      uz: 'PDF ko‘rib chiqish tayyorlanmoqda…',
    },
  },
  {
    unitId: 'MLUX-C0376',
    namespace: 'course',
    key: 'previousPage',
    english: 'Previous page',
    variables: [],
    occurrences: [
      {
        id: 'O0537',
        context: 'src/features/media-access/LessonPdfPreview.tsx:161 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Previous page',
      ru: 'Предыдущая страница',
      uz: 'Oldingi sahifa',
    },
  },
  {
    unitId: 'MLUX-C0377',
    namespace: 'course',
    key: 'nextPage',
    english: 'Next page',
    variables: [],
    occurrences: [
      {
        id: 'O0538',
        context: 'src/features/media-access/LessonPdfPreview.tsx:169 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Next page',
      ru: 'Следующая страница',
      uz: 'Keyingi sahifa',
    },
  },
  {
    unitId: 'MLUX-C0378',
    namespace: 'ai',
    key: 'returnToMyLearning',
    english: 'Return to my learning',
    variables: [],
    occurrences: [
      {
        id: 'O0539',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:77 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0541',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:128 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0542',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:227 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0543',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:256 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Return to my learning',
      ru: 'Вернуться к обучению',
      uz: 'Ta’limimga qaytish',
    },
  },
  {
    unitId: 'MLUX-C0379',
    namespace: 'ai',
    key: 'returnToLearningWorkspace',
    english: 'Return to learning workspace',
    variables: [],
    occurrences: [
      {
        id: 'O0540',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:97 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Return to learning workspace',
      ru: 'Вернуться к рабочему пространству обучения',
      uz: 'Ta’lim maydoniga qaytish',
    },
  },
  {
    unitId: 'MLUX-C0380',
    namespace: 'ai',
    key: 'beta',
    english: 'BETA',
    variables: [],
    occurrences: [
      {
        id: 'O0544',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:328 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'BETA',
      ru: 'БЕТА',
      uz: 'BETA',
    },
  },
  {
    unitId: 'MLUX-C0381',
    namespace: 'ai',
    key: 'learningAssistant',
    english: 'AI Learning Assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0545',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:328 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'AI Learning Assistant',
      ru: 'ИИ-помощник для обучения',
      uz: 'AI ta’lim yordamchisi',
    },
  },
  {
    unitId: 'MLUX-C0382',
    namespace: 'ai',
    key: 'assistantDescription',
    english:
      'Ask questions, summarize lessons, take interactive practice quizzes, and get course recommendations tailored directly to your path.',
    variables: [],
    occurrences: [
      {
        id: 'O0546',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:331 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Ask questions, summarize lessons, take interactive practice quizzes, and get course recommendations tailored directly to your path.',
      ru: 'Задавайте вопросы, получайте краткие итоги уроков, проходите интерактивные тесты и получайте рекомендации курсов для вашего пути.',
      uz: 'Savollar bering, darslarni qisqacha o‘rganing, interaktiv mashq testlarini bajaring va yo‘lingizga mos kurs tavsiyalarini oling.',
    },
  },
  {
    unitId: 'MLUX-C0383',
    namespace: 'ai',
    key: 'assistantChat',
    english: 'AI assistant chat',
    variables: [],
    occurrences: [
      {
        id: 'O0547',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:347 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'AI assistant chat',
      ru: 'Чат с ИИ-помощником',
      uz: 'AI yordamchi chati',
    },
  },
  {
    unitId: 'MLUX-C0384',
    namespace: 'ai',
    key: 'conversationPersistence',
    english: 'This conversation stays available while you continue using the assistant.',
    variables: [],
    occurrences: [
      {
        id: 'O0548',
        context: 'src/pages/ai-chat-page/AiChatPage.tsx:423 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This conversation stays available while you continue using the assistant.',
      ru: 'Эта беседа остаётся доступной, пока вы пользуетесь помощником.',
      uz: 'Yordamchidan foydalanganingizda ushbu suhbat saqlanadi.',
    },
  },
  {
    unitId: 'MLUX-C0385',
    namespace: 'cart',
    key: 'checkCheckoutStatus',
    english: 'Check checkout status',
    variables: [],
    occurrences: [
      {
        id: 'O0549',
        context: 'src/pages/cart-page/CartPage.tsx:152 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Check checkout status',
      ru: 'Проверить статус оплаты',
      uz: 'To‘lov holatini tekshirish',
    },
  },
  {
    unitId: 'MLUX-C0386',
    namespace: 'cart',
    key: 'checkoutStatusUncertain',
    english:
      'Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.',
    variables: [],
    occurrences: [
      {
        id: 'O0550',
        context: 'src/pages/cart-page/CartPage.tsx:165 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.',
      ru: 'Корзина пока не может подтвердить, завершилась ли оплата частично. Перед новой оплатой проверьте «Моё обучение».',
      uz: 'Savat to‘lov qisman yakunlanganini hozircha tasdiqlay olmaydi. Yana to‘lov qilishdan oldin «Ta’limim»ni tekshiring.',
    },
  },
  {
    unitId: 'MLUX-C0387',
    namespace: 'cart',
    key: 'refreshCart',
    english: 'Refresh cart',
    variables: [],
    occurrences: [
      {
        id: 'O0551',
        context: 'src/pages/cart-page/CartPage.tsx:266 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Refresh cart',
      ru: 'Обновить корзину',
      uz: 'Savatni yangilash',
    },
  },
  {
    unitId: 'MLUX-C0388',
    namespace: 'a11y',
    key: 'loadingCart',
    english: 'Loading cart',
    variables: [],
    occurrences: [
      {
        id: 'O0553',
        context: 'src/pages/cart-page/CartPage.tsx:427 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading cart',
      ru: 'Загрузка корзины',
      uz: 'Savat yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0389',
    namespace: 'a11y',
    key: 'breadcrumb',
    english: 'Breadcrumb',
    variables: [],
    occurrences: [
      {
        id: 'O0555',
        context: 'src/pages/cart-page/CartPage.tsx:509 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
      {
        id: 'O0586',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:169 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
      {
        id: 'O0592',
        context:
          'src/pages/learning-list-page/LearningListPage.tsx:180 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Breadcrumb',
      ru: 'Хлебные крошки',
      uz: 'Yo‘l ko‘rsatkich',
    },
  },
  {
    unitId: 'MLUX-C0390',
    namespace: 'cart',
    key: 'courseLowercase',
    english: 'course',
    variables: [],
    occurrences: [
      {
        id: 'O0558',
        context: 'src/pages/cart-page/CartPage.tsx:531 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'course',
      ru: 'курс',
      uz: 'kurs',
    },
  },
  {
    unitId: 'MLUX-C0391',
    namespace: 'a11y',
    key: 'cartCourses',
    english: 'Cart courses',
    variables: [],
    occurrences: [
      {
        id: 'O0559',
        context: 'src/pages/cart-page/CartPage.tsx:572 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Cart courses',
      ru: 'Курсы в корзине',
      uz: 'Savatdagi kurslar',
    },
  },
  {
    unitId: 'MLUX-C0392',
    namespace: 'cart',
    key: 'courseLabel',
    english: 'Course',
    variables: [],
    occurrences: [
      {
        id: 'O0560',
        context: 'src/pages/cart-page/CartPage.tsx:588 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course',
      ru: 'Курс',
      uz: 'Kurs',
    },
  },
  {
    unitId: 'MLUX-C0393',
    namespace: 'cart',
    key: 'goToOrderSummary',
    english: 'Go to order summary',
    variables: [],
    occurrences: [
      {
        id: 'O0562',
        context: 'src/pages/cart-page/CartPage.tsx:630 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Go to order summary',
      ru: 'Перейти к итогам заказа',
      uz: 'Buyurtma yakuniga o‘tish',
    },
  },
  {
    unitId: 'MLUX-C0394',
    namespace: 'a11y',
    key: 'cartTotal',
    english: 'Cart total',
    variables: [],
    occurrences: [
      {
        id: 'O0563',
        context: 'src/pages/cart-page/CartPage.tsx:634 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Cart total',
      ru: 'Итог корзины',
      uz: 'Savat jami',
    },
  },
  {
    unitId: 'MLUX-C0395',
    namespace: 'cart',
    key: 'orderSummary',
    english: 'Order summary',
    variables: [],
    occurrences: [
      {
        id: 'O0564',
        context: 'src/pages/cart-page/CartPage.tsx:636 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Order summary',
      ru: 'Итоги заказа',
      uz: 'Buyurtma yakuni',
    },
  },
  {
    unitId: 'MLUX-C0396',
    namespace: 'cart',
    key: 'total',
    english: 'Total',
    variables: [],
    occurrences: [
      {
        id: 'O0565',
        context: 'src/pages/cart-page/CartPage.tsx:639 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Total',
      ru: 'Итого',
      uz: 'Jami',
    },
  },
  {
    unitId: 'MLUX-C0397',
    namespace: 'cart',
    key: 'totalUnavailable',
    english: 'Total unavailable',
    variables: [],
    occurrences: [
      {
        id: 'O0566',
        context: 'src/pages/cart-page/CartPage.tsx:645 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Total unavailable',
      ru: 'Итог недоступен',
      uz: 'Jami mavjud emas',
    },
  },
  {
    unitId: 'MLUX-C0398',
    namespace: 'cart',
    key: 'mockCheckout',
    english: 'Mock checkout',
    variables: [],
    occurrences: [
      {
        id: 'O0567',
        context: 'src/pages/cart-page/CartPage.tsx:654 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock checkout',
      ru: 'Тестовое оформление',
      uz: 'Sinov buyurtmasi',
    },
  },
  {
    unitId: 'MLUX-C0404',
    namespace: 'a11y',
    key: 'loadingCourseDetails',
    english: 'Loading course details',
    variables: [],
    occurrences: [
      {
        id: 'O0574',
        context:
          'src/pages/course-detail-page/CourseDetailPage.tsx:114 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading course details',
      ru: 'Загрузка сведений о курсе',
      uz: 'Kurs tafsilotlari yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0405',
    namespace: 'course',
    key: 'courseOutline',
    english: 'Course outline',
    variables: [],
    occurrences: [
      {
        id: 'O0575',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:39 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Course outline',
      ru: 'Программа курса',
      uz: 'Kurs dasturi',
    },
  },
  {
    unitId: 'MLUX-C0406',
    namespace: 'a11y',
    key: 'loadingCourseOutline',
    english: 'Loading course outline',
    variables: [],
    occurrences: [
      {
        id: 'O0576',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:42 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading course outline',
      ru: 'Загрузка программы курса',
      uz: 'Kurs dasturi yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0407',
    namespace: 'course',
    key: 'noLessonsAdded',
    english: 'No lessons have been added yet.',
    variables: [],
    occurrences: [
      {
        id: 'O0577',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:59 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'No lessons have been added yet.',
      ru: 'Уроки ещё не добавлены.',
      uz: 'Hali darslar qo‘shilmagan.',
    },
  },
  {
    unitId: 'MLUX-C0408',
    namespace: 'course',
    key: 'lessonMarker',
    english: 'lesson ·',
    variables: [],
    occurrences: [
      {
        id: 'O0578',
        context: 'src/pages/course-detail-page/CourseOutline.tsx:72 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0604',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:292 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'lesson ·',
      ru: 'урок ·',
      uz: 'dars ·',
    },
  },
  {
    unitId: 'MLUX-C0409',
    namespace: 'learning',
    key: 'mockPaymentCompleted',
    english:
      'The mock payment completed. Enrollment status was refreshed; learning unlocks only after active status is observed.',
    variables: [],
    occurrences: [
      {
        id: 'O0579',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:101 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'The mock payment completed. Enrollment status was refreshed; learning unlocks only after active status is observed.',
      ru: 'Тестовая оплата завершена. Статус записи обновлён; обучение откроется только после подтверждения активного статуса.',
      uz: 'Sinov to‘lovi yakunlandi. Ro‘yxatdan o‘tish holati yangilandi; ta’lim faqat faol holat tasdiqlangandan keyin ochiladi.',
    },
  },
  {
    unitId: 'MLUX-C0410',
    namespace: 'learning',
    key: 'mockPaymentDeclinedBody',
    english: 'The mock payment was declined. This enrollment remains locked.',
    variables: [],
    occurrences: [
      {
        id: 'O0580',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:111 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'The mock payment was declined. This enrollment remains locked.',
      ru: 'Тестовая оплата отклонена. Эта запись остаётся заблокированной.',
      uz: 'Sinov to‘lovi rad etildi. Bu ro‘yxatdan o‘tish yopiq qoladi.',
    },
  },
  {
    unitId: 'MLUX-C0411',
    namespace: 'learning',
    key: 'enrollmentPending',
    english: 'The enrollment is still pending, so you can choose a new mock payment outcome.',
    variables: [],
    occurrences: [
      {
        id: 'O0581',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:120 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'The enrollment is still pending, so you can choose a new mock payment outcome.',
      ru: 'Запись всё ещё ожидает обработки, поэтому вы можете выбрать новый результат тестовой оплаты.',
      uz: 'Ro‘yxatdan o‘tish hali kutilmoqda, shuning uchun sinov to‘lovi uchun yangi natijani tanlashingiz mumkin.',
    },
  },
  {
    unitId: 'MLUX-C0412',
    namespace: 'learning',
    key: 'paymentStatusUnconfirmed',
    english:
      'We could not confirm the mock payment status. Check enrollment status before taking another action.',
    variables: [],
    occurrences: [
      {
        id: 'O0582',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:131 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'We could not confirm the mock payment status. Check enrollment status before taking another action.',
      ru: 'Не удалось подтвердить статус тестовой оплаты. Перед следующим действием проверьте статус записи.',
      uz: 'Sinov to‘lovi holatini tasdiqlab bo‘lmadi. Keyingi amalni bajarishdan oldin ro‘yxatdan o‘tish holatini tekshiring.',
    },
  },
  {
    unitId: 'MLUX-C0413',
    namespace: 'learning',
    key: 'signInBeforePaymentStatus',
    english: 'Sign in again before checking payment status.',
    variables: [],
    occurrences: [
      {
        id: 'O0583',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:138 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Sign in again before checking payment status.',
      ru: 'Войдите снова перед проверкой статуса оплаты.',
      uz: 'To‘lov holatini tekshirishdan oldin yana kiring.',
    },
  },
  {
    unitId: 'MLUX-C0414',
    namespace: 'learning',
    key: 'paymentActionUnavailable',
    english: 'This payment action is not available for the current account.',
    variables: [],
    occurrences: [
      {
        id: 'O0584',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:147 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'This payment action is not available for the current account.',
      ru: 'Это действие с оплатой недоступно для текущего аккаунта.',
      uz: 'Bu to‘lov amali joriy akkaunt uchun mavjud emas.',
    },
  },
  {
    unitId: 'MLUX-C0415',
    namespace: 'learning',
    key: 'mockPaymentUnavailable',
    english: 'Mock payment is currently unavailable. Check enrollment status later.',
    variables: [],
    occurrences: [
      {
        id: 'O0585',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:156 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock payment is currently unavailable. Check enrollment status later.',
      ru: 'Тестовая оплата сейчас недоступна. Проверьте статус записи позже.',
      uz: 'Sinov to‘lovi hozir mavjud emas. Ro‘yxatdan o‘tish holatini keyinroq tekshiring.',
    },
  },
  {
    unitId: 'MLUX-C0416',
    namespace: 'learning',
    key: 'mockPaymentAwaitingCompletion',
    english:
      'Mock payment is awaiting completion. Learning remains locked until your enrollment is active.',
    variables: [],
    occurrences: [
      {
        id: 'O0588',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:437 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Mock payment is awaiting completion. Learning remains locked until your enrollment is active.',
      ru: 'Тестовая оплата ожидает завершения. Обучение останется заблокированным, пока запись не станет активной.',
      uz: 'Sinov to‘lovi yakunlanishini kutmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.',
    },
  },
  {
    unitId: 'MLUX-C0417',
    namespace: 'learning',
    key: 'checkPaymentStatus',
    english: 'Check payment status',
    variables: [],
    occurrences: [
      {
        id: 'O0589',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:451 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Check payment status',
      ru: 'Проверить статус оплаты',
      uz: 'To‘lov holatini tekshirish',
    },
  },
  {
    unitId: 'MLUX-C0418',
    namespace: 'learning',
    key: 'completeMockPayment',
    english: 'Complete mock payment',
    variables: [],
    occurrences: [
      {
        id: 'O0590',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:465 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Complete mock payment',
      ru: 'Завершить тестовую оплату',
      uz: 'Sinov to‘lovini yakunlash',
    },
  },
  {
    unitId: 'MLUX-C0419',
    namespace: 'learning',
    key: 'simulateMockPaymentFailure',
    english: 'Simulate mock payment failure',
    variables: [],
    occurrences: [
      {
        id: 'O0591',
        context:
          'src/pages/learning-detail-page/LearningDetailPage.tsx:474 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Simulate mock payment failure',
      ru: 'Сымитировать сбой тестовой оплаты',
      uz: 'Sinov to‘lovi xatosini taqlid qilish',
    },
  },
  {
    unitId: 'MLUX-C0420',
    namespace: 'common',
    key: 'page',
    english: 'Page',
    variables: [],
    occurrences: [
      {
        id: 'O0593',
        context: 'src/shared/ui/primitives/Pagination.tsx:103 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Page',
      ru: 'Страница',
      uz: 'Sahifa',
    },
  },
  {
    unitId: 'MLUX-C0421',
    namespace: 'common',
    key: 'of',
    english: 'of',
    variables: [],
    occurrences: [
      {
        id: 'O0594',
        context: 'src/shared/ui/primitives/Pagination.tsx:103 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'of',
      ru: 'из',
      uz: 'dan',
    },
  },
  {
    unitId: 'MLUX-C0422',
    namespace: 'ai',
    key: 'openAiAssistant',
    english: 'Open AI assistant',
    variables: [],
    occurrences: [
      {
        id: 'O0597',
        context: 'src/widgets/course-chat/CourseChatLauncher.tsx:166 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Open AI assistant',
      ru: 'Открыть ИИ-помощника',
      uz: 'AI yordamchini ochish',
    },
  },
  {
    unitId: 'MLUX-C0423',
    namespace: 'ai',
    key: 'expandChat',
    english: 'Expand chat',
    variables: [],
    occurrences: [
      {
        id: 'O0598',
        context:
          'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:99 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Expand chat',
      ru: 'Развернуть чат',
      uz: 'Chatni kengaytirish',
    },
  },
  {
    unitId: 'MLUX-C0424',
    namespace: 'ai',
    key: 'closeChat',
    english: 'Close chat',
    variables: [],
    occurrences: [
      {
        id: 'O0599',
        context:
          'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:178 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Close chat',
      ru: 'Закрыть чат',
      uz: 'Chatni yopish',
    },
  },
  {
    unitId: 'MLUX-C0425',
    namespace: 'learning',
    key: 'updatingLessonProgress',
    english: 'Updating lesson progress.',
    variables: [],
    occurrences: [
      {
        id: 'O0600',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:122 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Updating lesson progress.',
      ru: 'Обновление прогресса урока.',
      uz: 'Dars jarayoni yangilanmoqda.',
    },
  },
  {
    unitId: 'MLUX-C0426',
    namespace: 'a11y',
    key: 'loadingLearningProgress',
    english: 'Loading learning progress',
    variables: [],
    occurrences: [
      {
        id: 'O0601',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:166 — DRAFT-20 residual context',
        classification: 'Accessibility only',
      },
    ],
    translations: {
      en: 'Loading learning progress',
      ru: 'Загрузка прогресса обучения',
      uz: 'Ta’lim jarayoni yuklanmoqda',
    },
  },
  {
    unitId: 'MLUX-C0427',
    namespace: 'learning',
    key: 'availableNow',
    english: 'available now ·',
    variables: [],
    occurrences: [
      {
        id: 'O0602',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:253 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'available now ·',
      ru: 'доступно сейчас ·',
      uz: 'hozir mavjud ·',
    },
  },
  {
    unitId: 'MLUX-C0428',
    namespace: 'learning',
    key: 'comingSoon',
    english: 'coming soon',
    variables: [],
    occurrences: [
      {
        id: 'O0603',
        context:
          'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:254 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'coming soon',
      ru: 'скоро будет доступно',
      uz: 'tez orada mavjud',
    },
  },
  {
    unitId: 'MLUX-C0429',
    namespace: 'auth',
    key: 'openRecoveryLink',
    english: 'Open the password-reset link from your recovery message to choose a new password.',
    variables: [],
    occurrences: [
      {
        id: 'O0606',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:25 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Open the password-reset link from your recovery message to choose a new password.',
      ru: 'Откройте ссылку для сброса пароля из сообщения для восстановления, чтобы выбрать новый пароль.',
      uz: 'Yangi parol tanlash uchun tiklash xabaringizdagi parolni tiklash havolasini oching.',
    },
  },
  {
    unitId: 'MLUX-C0430',
    namespace: 'auth',
    key: 'recoveryChannel',
    english:
      'If the account can use password recovery, the next steps will be available through the configured recovery channel.',
    variables: [],
    occurrences: [
      {
        id: 'O0607',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:30 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'If the account can use password recovery, the next steps will be available through the configured recovery channel.',
      ru: 'Если для аккаунта доступно восстановление пароля, дальнейшие шаги будут доступны через настроенный канал восстановления.',
      uz: 'Agar akkaunt parolni tiklashdan foydalana olsa, keyingi qadamlar sozlangan tiklash kanali orqali mavjud bo‘ladi.',
    },
  },
  {
    unitId: 'MLUX-C0431',
    namespace: 'common',
    key: 'continue',
    english: 'Continue',
    variables: [],
    occurrences: [
      {
        id: 'O0608',
        context:
          'src/pages/forgot-password-page/ForgotPasswordPage.tsx:56 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Continue',
      ru: 'Продолжить',
      uz: 'Davom etish',
    },
  },
  {
    unitId: 'MLUX-C0432',
    namespace: 'auth',
    key: 'createAnAccount',
    english: 'Create an account',
    variables: [],
    occurrences: [
      {
        id: 'O0609',
        context: 'src/pages/login-page/LoginPage.tsx:35 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Create an account',
      ru: 'Создать аккаунт',
      uz: 'Akkaunt yaratish',
    },
  },
  {
    unitId: 'MLUX-C0433',
    namespace: 'auth',
    key: 'forgotYourPassword',
    english: 'Forgot your password?',
    variables: [],
    occurrences: [
      {
        id: 'O0610',
        context: 'src/pages/login-page/LoginPage.tsx:67 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Forgot your password?',
      ru: 'Забыли пароль?',
      uz: 'Parolni unutdingizmi?',
    },
  },
  {
    unitId: 'MLUX-C0434',
    namespace: 'auth',
    key: 'resetTokenHelp',
    english:
      'Your reset link supplies a private token. It stays hidden while you complete this form.',
    variables: [],
    occurrences: [
      {
        id: 'O0611',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:32 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your reset link supplies a private token. It stays hidden while you complete this form.',
      ru: 'Ссылка для сброса содержит приватный токен. Он остаётся скрытым, пока вы заполняете форму.',
      uz: 'Tiklash havolangiz maxfiy tokenni o‘z ichiga oladi. Shaklni to‘ldirayotganingizda u yashirin qoladi.',
    },
  },
  {
    unitId: 'MLUX-C0435',
    namespace: 'auth',
    key: 'passwordUpdated',
    english: 'Your password has been updated.',
    variables: [],
    occurrences: [
      {
        id: 'O0613',
        context:
          'src/pages/reset-password-page/ResetPasswordPage.tsx:85 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your password has been updated.',
      ru: 'Ваш пароль обновлён.',
      uz: 'Parolingiz yangilandi.',
    },
  },
  {
    unitId: 'MLUX-C0436',
    namespace: 'cart',
    key: 'yourCartIsEmpty',
    english: 'Your cart is empty',
    variables: [],
    occurrences: [
      {
        id: 'O0616',
        context: 'src/pages/cart-page/CartPage.tsx:479 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Your cart is empty',
      ru: 'Ваша корзина пуста',
      uz: 'Savatingiz bo‘sh',
    },
  },
  {
    unitId: 'MLUX-C0440',
    namespace: 'course',
    key: 'draftCourse',
    english: 'Draft course',
    variables: [],
    occurrences: [
      {
        id: 'O0620',
        context:
          'src/pages/course-detail-page/CourseDetailPage.tsx:154 — DRAFT-20 residual context',
        classification: 'Visible UI copy',
      },
    ],
    translations: {
      en: 'Draft course',
      ru: 'Черновик курса',
      uz: 'Kurs qoralamasi',
    },
  },
];

const MLUX_004_DRAFT12_EXISTING_OCCURRENCES: Readonly<
  Record<string, readonly LocaleOccurrenceInput[]>
> = {
  'MLUX-C0006': [
    {
      id: 'O0487',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:108 — Page: learning-list-page',
      classification: 'Visible UI copy',
    },
    {
      id: 'O0489',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:123 — Page: learning-list-page',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0059': [
    {
      id: 'O0502',
      context: 'src/pages/learning-list-page/LearningListPage.tsx:133 — Visible UI copy',
      classification: 'Visible UI copy',
    },
  ],
};

const MLUX_004_DRAFT20_EXISTING_OCCURRENCES: Readonly<
  Record<string, readonly LocaleOccurrenceInput[]>
> = {
  'MLUX-C0004': [
    {
      id: 'O0605',
      context: 'src/pages/cart-page/CartPage.tsx:250 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
    {
      id: 'O0614',
      context: 'src/pages/signup-page/SignupPage.tsx:33 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0008': [
    {
      id: 'O0596',
      context: 'src/widgets/course-chat/CourseChatLauncher.tsx:151 — DRAFT-20 residual context',
      classification: 'Accessibility only',
    },
  ],
  'MLUX-C0010': [
    {
      id: 'O0552',
      context: 'src/pages/cart-page/CartPage.tsx:412 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
    {
      id: 'O0554',
      context: 'src/pages/cart-page/CartPage.tsx:442 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
    {
      id: 'O0556',
      context: 'src/pages/cart-page/CartPage.tsx:522 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
    {
      id: 'O0557',
      context: 'src/pages/cart-page/CartPage.tsx:528 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0041': [
    {
      id: 'O0615',
      context: 'src/pages/signup-page/SignupPage.tsx:110 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0046': [
    {
      id: 'O0612',
      context: 'src/pages/reset-password-page/ResetPasswordPage.tsx:63 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0059': [
    {
      id: 'O0587',
      context:
        'src/pages/learning-detail-page/LearningDetailPage.tsx:302 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0114': [
    {
      id: 'O0535',
      context: 'src/features/media-access/LessonMediaAccess.tsx:74 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0194': [
    {
      id: 'O0561',
      context: 'src/pages/cart-page/CartPage.tsx:597 — DRAFT-20 residual context',
      classification: 'Visible UI copy',
    },
  ],
  'MLUX-C0319': [
    {
      id: 'O0595',
      context: 'src/widgets/course-chat/CourseChatLauncher.tsx:127 — DRAFT-20 residual context',
      classification: 'Accessibility only',
    },
  ],
};

const MLUX_004_EXISTING_RESOURCE_OWNERS: Readonly<Record<string, LocaleOwnerTask>> = {
  'MLUX-C0003': 'MLUX-002',
  'MLUX-C0004': 'MLUX-002',
  'MLUX-C0006': 'MLUX-002',
  'MLUX-C0007': 'MLUX-002',
  'MLUX-C0008': 'MLUX-002',
  'MLUX-C0010': 'MLUX-002',
  'MLUX-C0024': 'MLUX-003',
  'MLUX-C0026': 'MLUX-003',
  'MLUX-C0028': 'MLUX-003',
  'MLUX-C0031': 'MLUX-003',
  'MLUX-C0033': 'MLUX-003',
  'MLUX-C0035': 'MLUX-003',
  'MLUX-C0039': 'MLUX-003',
  'MLUX-C0041': 'MLUX-003',
  'MLUX-C0042': 'MLUX-003',
  'MLUX-C0043': 'MLUX-003',
  'MLUX-C0044': 'MLUX-003',
  'MLUX-C0045': 'MLUX-003',
  'MLUX-C0046': 'MLUX-003',
  'MLUX-C0047': 'MLUX-003',
  'MLUX-C0059': 'MLUX-003',
  'MLUX-C0194': 'MLUX-005',
};

function mlux004Record(unit: Mlux004WorkbookUnit): LocaleMappingRecord {
  return {
    unitId: unit.unitId,
    namespace: unit.namespace,
    key: unit.key,
    english: unit.english,
    variables: unit.variables,
    ...(unit.placeholdersByLocale ? { placeholdersByLocale: unit.placeholdersByLocale } : {}),
    plural: unit.plural ?? false,
    resourceStatus: 'Draft',
    russian: { resource: 'Draft', review: 'Pending' },
    uzbek: { resource: 'Draft', review: 'Pending' },
    ownerTask: MLUX_004_EXISTING_RESOURCE_OWNERS[unit.unitId] ?? 'MLUX-004',
    occurrences: [
      ...unit.occurrences,
      ...(MLUX_004_DRAFT12_EXISTING_OCCURRENCES[unit.unitId] ?? []),
      ...(MLUX_004_DRAFT20_EXISTING_OCCURRENCES[unit.unitId] ?? []),
    ].map((occurrence) => ({ ...occurrence, ownerTask: 'MLUX-004' })),
  };
}

export const MLUX_004_RUNTIME_MAPPING: readonly LocaleMappingRecord[] =
  MLUX_004_WORKBOOK_UNITS.map(mlux004Record);

export const MLUX_004_TRANSLATIONS: readonly Mlux004TranslationEntry[] =
  MLUX_004_WORKBOOK_UNITS.map(({ unitId, translations }) => ({ unitId, ...translations }));
