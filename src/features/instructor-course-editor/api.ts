import type {
  LessonFileUploadAcknowledgementDto,
  LessonType,
  LessonUploadStatusDto,
} from '@entities/course';
import type { SessionContextValue } from '@features/auth-session';
import { requestOperation } from '@features/auth-session';
import { ApiError, readBoolean, readPositiveInteger, readRecord, readString } from '@shared/api';

import type {
  CreateInstructorLessonInput,
  InstructorEditorCourse,
  InstructorEditorLesson,
  InstructorLessonFileUploadAcknowledgement,
  InstructorLessonUploadReference,
  InstructorLessonUploadStatus,
  UpdateInstructorCourseInput,
  UpdateInstructorLessonInput,
} from './model';

const LESSON_TYPES = new Set<LessonType>(['video', 'text', 'pdf']);
const UPLOAD_STATUS_POLL_INTERVAL_MS = 2_000;
const MAX_UPLOAD_STATUS_LOGICAL_GETS = 15;
const MAX_UPLOAD_STATUS_ELAPSED_MS = 30_000;
const UPLOAD_ID_PATTERN = /^[a-f0-9]{32}$/u;
const ISO_DATE_TIME_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d):(?<second>[0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u;

export type InstructorLessonUploadObservation = InstructorLessonUploadStatus | 'unavailable';

export type InstructorLessonUploadStatusListener = (
  observation: InstructorLessonUploadObservation,
) => void;

export interface InstructorLessonUploadStatusObserverOptions {
  readonly session: SessionContextValue;
  readonly reference: InstructorLessonUploadReference;
  readonly onStatus: InstructorLessonUploadStatusListener;
}

export interface InstructorLessonUploadStatusObserver {
  dispose(): void;
}

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : readString(value, label);
}

function readUploadId(value: unknown, label: string): string {
  const uploadId = readString(value, label);
  if (!UPLOAD_ID_PATTERN.test(uploadId)) throw new TypeError(`Invalid ${label}`);
  return uploadId;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isCalendarValidIsoDateTime(value: string): boolean {
  const match = ISO_DATE_TIME_PATTERN.exec(value);
  if (!match?.groups) return false;
  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function lessonType(value: unknown): LessonType {
  if (typeof value === 'string' && LESSON_TYPES.has(value as LessonType))
    return value as LessonType;
  throw new TypeError('Invalid lesson type');
}

function decodeLesson(value: unknown, expectedCourseId?: number): InstructorEditorLesson {
  const lesson = readRecord(value, 'lesson');
  const courseId = expectedCourseId ?? readPositiveInteger(lesson.course_id, 'lesson course id');
  return {
    id: readPositiveInteger(lesson.id, 'lesson id'),
    courseId,
    title: readString(lesson.title, 'lesson title'),
    lessonType: lessonType(lesson.lesson_type),
    description: nullableString(lesson.description, 'lesson description'),
    isPublished: readBoolean(lesson.is_published, 'lesson is_published'),
  };
}

function decodeLessonFileUploadAcknowledgement(
  value: unknown,
  expectedLessonId: number,
): InstructorLessonFileUploadAcknowledgement {
  const acknowledgement = readRecord(value, 'lesson file upload acknowledgement');
  const uploadId = readUploadId(acknowledgement.upload_id, 'upload acknowledgement upload id');
  const status = readString(acknowledgement.status, 'upload acknowledgement status');
  if (status !== 'queued') throw new TypeError('Invalid upload acknowledgement status');
  const acknowledgementLessonId = readPositiveInteger(
    acknowledgement.lesson_id,
    'upload acknowledgement lesson id',
  );
  if (acknowledgementLessonId !== expectedLessonId)
    throw new TypeError('Invalid upload acknowledgement lesson id');
  const dto: LessonFileUploadAcknowledgementDto = {
    lesson_id: acknowledgementLessonId,
    upload_id: uploadId,
    status,
    detail: readString(acknowledgement.detail, 'upload acknowledgement detail'),
  };
  return {
    lessonId: dto.lesson_id,
    uploadId: dto.upload_id,
    status: dto.status,
    detail: dto.detail,
  };
}

function decodeLessonUploadStatus(
  value: unknown,
  expected: InstructorLessonUploadReference,
): InstructorLessonUploadStatus {
  const response = readRecord(value, 'lesson upload status');
  const uploadId = readUploadId(response.upload_id, 'upload status upload id');
  if (uploadId !== expected.uploadId) throw new TypeError('Invalid upload status upload id');
  const lessonId = readPositiveInteger(response.lesson_id, 'upload status lesson id');
  if (lessonId !== expected.lessonId) throw new TypeError('Invalid upload status lesson id');
  const status = readString(response.status, 'upload status status');
  if (status !== 'queued' && status !== 'processing' && status !== 'ready' && status !== 'failed')
    throw new TypeError('Invalid upload status status');
  const failureReason = nullableString(response.failure_reason, 'upload status failure reason');
  const updatedAt = readString(response.updated_at, 'upload status updated at');
  if (!isCalendarValidIsoDateTime(updatedAt))
    throw new TypeError('Invalid upload status updated at');
  const dto: LessonUploadStatusDto = {
    upload_id: uploadId,
    lesson_id: lessonId,
    status,
    failure_reason: failureReason,
    updated_at: updatedAt,
  };
  return dto.status;
}

function decodeCourse(value: unknown): InstructorEditorCourse {
  const course = readRecord(value, 'course');
  const instructor = readRecord(course.instructor, 'course instructor');
  if (!Array.isArray(course.lessons)) throw new TypeError('Invalid course lessons');
  const id = readPositiveInteger(course.id, 'course id');
  return {
    id,
    instructorId: readPositiveInteger(instructor.id, 'course instructor id'),
    title: readString(course.title, 'course title'),
    description: nullableString(course.description, 'course description'),
    price: readString(course.price, 'course price'),
    currency: readString(course.currency, 'course currency'),
    lessons: course.lessons.map((item) => decodeLesson(item, id)),
  };
}

function decodeUpdatedCourse(value: unknown): InstructorEditorCourse {
  const course = readRecord(value, 'course');
  return {
    id: readPositiveInteger(course.id, 'course id'),
    instructorId: readPositiveInteger(course.instructor_id, 'course instructor id'),
    title: readString(course.title, 'course title'),
    description: nullableString(course.description, 'course description'),
    price: readString(course.price, 'course price'),
    currency: readString(course.currency, 'course currency'),
    lessons: [],
  };
}

function decodeDeleteMessage(value: unknown): void {
  readString(readRecord(value, 'delete response').message, 'delete message');
}

export function instructorEditorCourseQueryKey(epoch: string | null | undefined, courseId: number) {
  return ['instructor-course-editor', epoch ?? null, 'course', courseId] as const;
}

export function instructorEditorLessonQueryKey(epoch: string | null | undefined, lessonId: number) {
  return ['instructor-course-editor', epoch ?? null, 'lesson', lessonId] as const;
}

export function requestInstructorEditorCourse(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<InstructorEditorCourse> {
  return requestOperation(session, 'API-010', {
    path: `/courses/${courseId}`,
    signal,
    decode: decodeCourse,
  });
}

export function requestInstructorEditorLesson(
  session: SessionContextValue,
  lessonId: number,
  signal: AbortSignal,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-030', {
    path: `/lessons/${lessonId}`,
    signal,
    decode: decodeLesson,
  });
}

export function updateInstructorCourse(
  session: SessionContextValue,
  courseId: number,
  input: UpdateInstructorCourseInput,
): Promise<InstructorEditorCourse> {
  return requestOperation(session, 'API-011', {
    path: `/courses/${courseId}`,
    body: input,
    dedupeKey: `instructor-course:${courseId}:update`,
    decode: decodeUpdatedCourse,
  });
}

export function deleteInstructorCourse(
  session: SessionContextValue,
  courseId: number,
): Promise<void> {
  return requestOperation(session, 'API-012', {
    path: `/courses/${courseId}`,
    dedupeKey: `instructor-course:${courseId}:delete`,
    decode: decodeDeleteMessage,
  });
}

export function createInstructorLesson(
  session: SessionContextValue,
  courseId: number,
  input: CreateInstructorLessonInput,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-015', {
    path: `/courses/${courseId}/lessons`,
    body: {
      title: input.title,
      lesson_type: input.lessonType,
      description: input.description,
      is_published: input.isPublished,
    },
    dedupeKey: `instructor-course:${courseId}:create-lesson:${input.title}`,
    decode: (value) => decodeLesson(value, courseId),
  });
}

export function deleteInstructorLesson(
  session: SessionContextValue,
  courseId: number,
  lessonId: number,
): Promise<void> {
  return requestOperation(session, 'API-016', {
    path: `/courses/${courseId}/lessons/${lessonId}`,
    dedupeKey: `instructor-course:${courseId}:lesson:${lessonId}:delete`,
    decode: decodeDeleteMessage,
  });
}

export function updateInstructorLesson(
  session: SessionContextValue,
  lessonId: number,
  input: UpdateInstructorLessonInput,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-031', {
    path: `/lessons/${lessonId}`,
    body: {
      title: input.title,
      lesson_type: input.lessonType,
      description: input.description,
      is_published: input.isPublished,
    },
    dedupeKey: `instructor-lesson:${lessonId}:update`,
    decode: decodeLesson,
  });
}

export function uploadInstructorLessonFile(
  session: SessionContextValue,
  lessonId: number,
  file: File,
): Promise<InstructorLessonFileUploadAcknowledgement> {
  const body = new FormData();
  body.set('file', file);
  return requestOperation(session, 'API-032', {
    path: `/lessons/${lessonId}/upload-file`,
    body,
    dedupeKey: `instructor-lesson:${lessonId}:upload`,
    decode: (value) => decodeLessonFileUploadAcknowledgement(value, lessonId),
  });
}

export function requestInstructorLessonUploadStatus(
  session: SessionContextValue,
  reference: InstructorLessonUploadReference,
  signal: AbortSignal,
): Promise<InstructorLessonUploadStatus> {
  readUploadId(reference.uploadId, 'upload status upload id');
  return requestOperation(session, 'API-036', {
    path: `/lessons/uploads/${reference.uploadId}/status`,
    signal,
    decode: (value) => decodeLessonUploadStatus(value, reference),
  });
}

export function createInstructorLessonUploadStatusObserver({
  session,
  reference,
  onStatus,
}: InstructorLessonUploadStatusObserverOptions): InstructorLessonUploadStatusObserver {
  let stopped = false;
  let logicalGetCount = 0;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let deadlineTimeout: ReturnType<typeof setTimeout> | null = null;
  let inFlight: AbortController | null = null;

  const clearPendingWork = () => {
    if (pollTimeout !== null) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
    if (deadlineTimeout !== null) {
      clearTimeout(deadlineTimeout);
      deadlineTimeout = null;
    }
    inFlight?.abort();
    inFlight = null;
  };
  const stopWith = (observation: InstructorLessonUploadObservation) => {
    if (stopped) return;
    stopped = true;
    clearPendingWork();
    onStatus(observation);
  };
  const dispose = () => {
    if (stopped) return;
    stopped = true;
    clearPendingWork();
  };
  const poll = () => {
    if (stopped) return;
    if (logicalGetCount >= MAX_UPLOAD_STATUS_LOGICAL_GETS) {
      stopWith('unavailable');
      return;
    }
    logicalGetCount += 1;
    const controller = new AbortController();
    inFlight = controller;
    void requestInstructorLessonUploadStatus(session, reference, controller.signal)
      .then((status) => {
        if (stopped || inFlight !== controller) return;
        inFlight = null;
        if (status === 'ready' || status === 'failed') {
          stopWith(status);
          return;
        }
        onStatus(status);
        if (logicalGetCount >= MAX_UPLOAD_STATUS_LOGICAL_GETS) {
          stopWith('unavailable');
          return;
        }
        pollTimeout = setTimeout(poll, UPLOAD_STATUS_POLL_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (stopped || inFlight !== controller) return;
        inFlight = null;
        if (error instanceof ApiError && error.status === 401) {
          dispose();
          return;
        }
        stopWith('unavailable');
      });
  };

  deadlineTimeout = setTimeout(() => stopWith('unavailable'), MAX_UPLOAD_STATUS_ELAPSED_MS);
  poll();
  return { dispose };
}
