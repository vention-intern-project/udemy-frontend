export type LocaleNamespace = 'common' | 'navigation' | 'auth' | 'a11y';

export interface LocaleOccurrence {
  readonly id: string;
  readonly context: string;
}

export interface LocaleResourceReviewStatus {
  readonly resource: 'Draft';
  readonly review: 'Pending';
}

export interface LocaleMappingRecord {
  readonly unitId: string;
  readonly namespace: LocaleNamespace;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly plural: boolean;
  readonly resourceStatus: 'Draft';
  readonly russian: LocaleResourceReviewStatus;
  readonly uzbek: LocaleResourceReviewStatus;
  readonly ownerTask: 'MLUX-002';
  readonly occurrences: readonly LocaleOccurrence[];
}

function record(
  unitId: string,
  namespace: LocaleNamespace,
  key: string,
  english: string,
  variables: readonly string[],
  occurrences: readonly LocaleOccurrence[],
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
    occurrences,
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
      { id: 'O0003', context: 'navigation literal' },
      { id: 'O0006', context: 'navigation literal' },
      { id: 'O0010', context: 'AppShell JSX' },
      { id: 'O0014', context: 'AppShell JSX' },
    ],
  ),
  record(
    'MLUX-C0004',
    'navigation',
    'logIn',
    'Log in',
    [],
    [
      { id: 'O0004', context: 'navigation literal' },
      { id: 'O0015', context: 'AppShell JSX' },
    ],
  ),
  record(
    'MLUX-C0005',
    'navigation',
    'signUp',
    'Sign up',
    [],
    [
      { id: 'O0005', context: 'navigation literal' },
      { id: 'O0016', context: 'AppShell JSX' },
    ],
  ),
  record(
    'MLUX-C0006',
    'navigation',
    'myLearning',
    'My learning',
    [],
    [
      { id: 'O0007', context: 'navigation literal' },
      { id: 'O0011', context: 'AppShell JSX' },
    ],
  ),
  record(
    'MLUX-C0007',
    'navigation',
    'instructorCourses',
    'Instructor courses',
    [],
    [{ id: 'O0008', context: 'navigation literal' }],
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
      },
    ],
  ),
];
