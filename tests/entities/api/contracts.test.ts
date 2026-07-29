import { describe, expect, it } from 'vitest';

import {
  API_OPERATIONS,
  API_OPERATION_BY_ID,
  CONTRACT_ASSUMPTIONS,
  normalizeLessonPageQuery,
  normalizePageQuery,
} from '../../../src/entities/api';
import type {
  ApiOperationDefinition,
  ChatRequestDto,
  ChatResponseDto,
  PathCourse,
  PathCourseLesson,
  PathEnrollment,
  PathFilename,
  PathLesson,
  SelectedApiContractMap,
} from '../../../src/entities/api';
import type {
  CartDto,
  CartItemAddDto,
  CartItemDto,
  CheckoutDto,
  MockPaymentCompleteDto,
  MockPaymentCompletionRequestDto,
  CourseDetailDto,
  CourseDto,
  CourseEnrollmentListDto,
  CourseListDto,
  CourseListQueryDto,
  CourseProgressDto,
  CourseWriteDto,
  DeleteMessageDto,
  EnrollmentCreateDto,
  EnrollmentDto,
  EnrollmentListDto,
  ForgotPasswordRequestDto,
  LessonDto,
  LessonListDto,
  LessonPageQueryDto,
  LessonProgressDto,
  LessonWriteDto,
  LoginRequestDto,
  LoginResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  ResetPasswordRequestDto,
  UserProfileDto,
  UserRegisterDto,
} from '../../../src/entities';
import type { ApiBinaryResponse, PageQueryDto, PaginationDto } from '../../../src/shared/api';

type ExpectedContractMap = {
  'API-002': { input: undefined; response: CartDto };
  'API-003': { input: undefined; response: void };
  'API-004': { input: undefined; response: CheckoutDto };
  'API-005': { input: { body: CartItemAddDto }; response: CartItemDto };
  'API-006': { input: { path: PathCourse }; response: void };
  'API-007': { input: { body: ChatRequestDto }; response: ChatResponseDto };
  'API-008': { input: { query: CourseListQueryDto }; response: CourseListDto };
  'API-009': { input: { body: CourseWriteDto }; response: CourseDto };
  'API-010': { input: { path: PathCourse }; response: CourseDetailDto };
  'API-011': { input: { path: PathCourse; body: CourseWriteDto }; response: CourseDto };
  'API-012': { input: { path: PathCourse }; response: DeleteMessageDto };
  'API-013': {
    input: { path: PathCourse; query: PageQueryDto };
    response: CourseEnrollmentListDto;
  };
  'API-014': { input: { path: PathCourse; query: LessonPageQueryDto }; response: LessonListDto };
  'API-015': { input: { path: PathCourse; body: LessonWriteDto }; response: LessonDto };
  'API-016': { input: { path: PathCourseLesson }; response: DeleteMessageDto };
  'API-017': { input: { path: PathCourseLesson }; response: LessonProgressDto };
  'API-018': { input: { path: PathCourseLesson }; response: LessonProgressDto };
  'API-019': { input: { path: PathCourse }; response: CourseProgressDto };
  'API-020': { input: { body: EnrollmentCreateDto }; response: EnrollmentDto };
  'API-021': { input: { query: PageQueryDto }; response: EnrollmentListDto };
  'API-022': { input: { path: PathEnrollment }; response: EnrollmentDto };
  'API-023': { input: { body: ForgotPasswordRequestDto }; response: MessageResponseDto };
  'API-024': { input: { body: LoginRequestDto }; response: LoginResponseDto };
  'API-025': { input: { path: PathFilename }; response: ApiBinaryResponse };
  'API-026': { input: undefined; response: UserProfileDto };
  'API-029': { input: { body: ResetPasswordRequestDto }; response: MessageResponseDto };
  'API-030': { input: { path: PathLesson }; response: LessonDto };
  'API-031': { input: { path: PathLesson; body: LessonWriteDto }; response: LessonDto };
  'API-032': { input: { path: PathLesson; body: FormData }; response: LessonDto };
  'API-033': { input: { body: UserRegisterDto }; response: RegisterResponseDto };
  'API-034': { input: { body: MockPaymentCompletionRequestDto }; response: MockPaymentCompleteDto };
};

type IsExact<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

const CONTRACT_TYPES_MATCH: IsExact<SelectedApiContractMap, ExpectedContractMap> = true;
const NEUTRAL_PAGINATION_FIXTURE: PaginationDto<{ id: number }> = {
  items: [{ id: 1 }],
  page: 1,
  page_size: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
};

type AuditedOperation = Pick<
  ApiOperationDefinition,
  'id' | 'method' | 'path' | 'requestMode' | 'responseMode'
>;

const AUDITED_OPERATION_TABLE = [
  { id: 'API-002', method: 'GET', path: '/cart', requestMode: 'none', responseMode: 'json' },
  { id: 'API-003', method: 'DELETE', path: '/cart', requestMode: 'none', responseMode: 'void' },
  {
    id: 'API-004',
    method: 'POST',
    path: '/cart/checkout',
    requestMode: 'none',
    responseMode: 'json',
  },
  { id: 'API-005', method: 'POST', path: '/cart/items', requestMode: 'json', responseMode: 'json' },
  {
    id: 'API-006',
    method: 'DELETE',
    path: '/cart/items/:courseId',
    requestMode: 'none',
    responseMode: 'void',
  },
  { id: 'API-007', method: 'POST', path: '/chat/', requestMode: 'json', responseMode: 'json' },
  { id: 'API-008', method: 'GET', path: '/courses', requestMode: 'query', responseMode: 'json' },
  { id: 'API-009', method: 'POST', path: '/courses', requestMode: 'json', responseMode: 'json' },
  {
    id: 'API-010',
    method: 'GET',
    path: '/courses/:courseId',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-011',
    method: 'PATCH',
    path: '/courses/:courseId',
    requestMode: 'json',
    responseMode: 'json',
  },
  {
    id: 'API-012',
    method: 'DELETE',
    path: '/courses/:courseId',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-013',
    method: 'GET',
    path: '/courses/:courseId/enrollments',
    requestMode: 'query',
    responseMode: 'json',
  },
  {
    id: 'API-014',
    method: 'GET',
    path: '/courses/:courseId/lessons',
    requestMode: 'query',
    responseMode: 'json',
  },
  {
    id: 'API-015',
    method: 'POST',
    path: '/courses/:courseId/lessons',
    requestMode: 'json',
    responseMode: 'json',
  },
  {
    id: 'API-016',
    method: 'DELETE',
    path: '/courses/:courseId/lessons/:lessonId',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-017',
    method: 'POST',
    path: '/courses/:courseId/lessons/:lessonId/complete',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-018',
    method: 'POST',
    path: '/courses/:courseId/lessons/:lessonId/incomplete',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-019',
    method: 'GET',
    path: '/courses/:courseId/progress',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-020',
    method: 'POST',
    path: '/enrollments',
    requestMode: 'json',
    responseMode: 'json',
  },
  {
    id: 'API-021',
    method: 'GET',
    path: '/enrollments/my',
    requestMode: 'query',
    responseMode: 'json',
  },
  {
    id: 'API-022',
    method: 'GET',
    path: '/enrollments/:enrollmentId',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-023',
    method: 'POST',
    path: '/forgot-password',
    requestMode: 'json',
    responseMode: 'json',
  },
  { id: 'API-024', method: 'POST', path: '/login', requestMode: 'json', responseMode: 'json' },
  {
    id: 'API-025',
    method: 'GET',
    path: '/media/lessons/:filename',
    requestMode: 'none',
    responseMode: 'binary',
  },
  { id: 'API-026', method: 'GET', path: '/me', requestMode: 'none', responseMode: 'json' },
  {
    id: 'API-029',
    method: 'POST',
    path: '/reset-password',
    requestMode: 'json',
    responseMode: 'json',
  },
  {
    id: 'API-030',
    method: 'GET',
    path: '/lessons/:lessonId',
    requestMode: 'none',
    responseMode: 'json',
  },
  {
    id: 'API-031',
    method: 'PATCH',
    path: '/lessons/:lessonId',
    requestMode: 'json',
    responseMode: 'json',
  },
  {
    id: 'API-032',
    method: 'POST',
    path: '/lessons/:lessonId/upload-file',
    requestMode: 'multipart',
    responseMode: 'json',
  },
  { id: 'API-033', method: 'POST', path: '/signup', requestMode: 'json', responseMode: 'json' },
  {
    id: 'API-034',
    method: 'POST',
    path: '/payments/complete',
    requestMode: 'json',
    responseMode: 'json',
  },
] as const satisfies readonly AuditedOperation[];

describe('selected backend operation contracts', () => {
  it('registers every selected frontend-facing operation exactly once', () => {
    const expected = AUDITED_OPERATION_TABLE.map(({ id }) => id);

    expect(API_OPERATIONS.map(({ id }) => id)).toEqual(expected);
    expect(new Set(API_OPERATIONS.map(({ id }) => id)).size).toBe(expected.length);
    expect(Object.keys(API_OPERATION_BY_ID)).toEqual(expected);
  });

  it('matches the audited method, path, request, response, and DTO association table', () => {
    expect(
      API_OPERATIONS.map(({ id, method, path, requestMode, responseMode }) => ({
        id,
        method,
        path,
        requestMode,
        responseMode,
      })),
    ).toEqual(AUDITED_OPERATION_TABLE);
    expect(CONTRACT_TYPES_MATCH).toBe(true);
    expect(NEUTRAL_PAGINATION_FIXTURE).toMatchObject({ page: 1, page_size: 20 });
  });

  it('never marks a mutation for automatic retry and exposes dedupe capability', () => {
    const mutations = API_OPERATIONS.filter(({ method }) => method !== 'GET');
    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations.every(({ retry }) => retry === 'never')).toBe(true);
    expect(mutations.every(({ mutationDedupe }) => mutationDedupe === 'supported')).toBe(true);
  });

  it('attaches machine-readable assumption tags only to affected contracts', () => {
    expect(CONTRACT_ASSUMPTIONS.GAP_003).toMatchObject({
      gapId: 'GAP-003',
      state: 'unresolved',
      code: 'GAP-003_FORBIDDEN_NOT_FOUND_AMBIGUITY',
    });
    expect(CONTRACT_ASSUMPTIONS.GAP_007).toMatchObject({
      gapId: 'GAP-007',
      state: 'unresolved',
      code: 'GAP-007_PAGINATION_BOUNDS_UNRESOLVED',
    });
    expect(API_OPERATION_BY_ID['API-012'].assumptionTags).toContain(
      CONTRACT_ASSUMPTIONS.GAP_003.code,
    );
    expect(API_OPERATION_BY_ID['API-008'].assumptionTags).toContain(
      CONTRACT_ASSUMPTIONS.GAP_007.code,
    );
    expect(API_OPERATION_BY_ID['API-010'].assumptionTags).toEqual([]);
  });

  it('applies reversible positive pagination guardrails', () => {
    expect(normalizePageQuery({ page: -3, page_size: 500, search: 'react' })).toEqual({
      page: 1,
      page_size: 100,
      search: 'react',
    });
    expect(normalizeLessonPageQuery({ page: 2.9, size: 0 })).toEqual({ page: 2, size: 1 });
    expect(normalizePageQuery({ page: Number.NaN, page_size: Number.POSITIVE_INFINITY })).toEqual({
      page: 1,
      page_size: 100,
    });
  });
});
