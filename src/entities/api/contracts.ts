import type { ApiBinaryResponse, PageQueryDto } from '@shared/api';
import type { CartDto, CartItemAddDto, CartItemDto, CheckoutDto, MockPaymentCompleteDto, MockPaymentCompletionRequestDto } from '../cart';
import type {
  CourseDetailDto,
  CourseDto,
  CourseListDto,
  CourseListQueryDto,
  CourseWriteDto,
  DeleteMessageDto,
  LessonDto,
  LessonListDto,
  LessonPageQueryDto,
  LessonWriteDto,
} from '../course';
import type {
  CourseEnrollmentListDto,
  CourseProgressDto,
  EnrollmentCreateDto,
  EnrollmentDto,
  EnrollmentListDto,
  LessonProgressDto,
} from '../enrollment';
import type {
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  ResetPasswordRequestDto,
  UserProfileDto,
  UserRegisterDto,
} from '../user';

export interface PathCourse { courseId: number }
export interface PathLesson { lessonId: number }
export interface PathCourseLesson extends PathCourse, PathLesson {}
export interface PathEnrollment { enrollmentId: number }
export interface PathFilename { filename: string }

export interface SelectedApiContractMap {
  'API-002': { input: undefined; response: CartDto };
  'API-003': { input: undefined; response: void };
  'API-004': { input: undefined; response: CheckoutDto };
  'API-005': { input: { body: CartItemAddDto }; response: CartItemDto };
  'API-006': { input: { path: PathCourse }; response: void };
  'API-008': { input: { query: CourseListQueryDto }; response: CourseListDto };
  'API-009': { input: { body: CourseWriteDto }; response: CourseDto };
  'API-010': { input: { path: PathCourse }; response: CourseDetailDto };
  'API-011': { input: { path: PathCourse; body: CourseWriteDto }; response: CourseDto };
  'API-012': { input: { path: PathCourse }; response: DeleteMessageDto };
  'API-013': { input: { path: PathCourse; query: PageQueryDto }; response: CourseEnrollmentListDto };
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
}
