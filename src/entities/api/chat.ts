import { readPositiveInteger, readRecord, readString } from '@shared/api';

export interface ChatRequestDto {
  thread_id: string;
  message: string;
  course_id?: number;
  lesson_id?: number;
}

export interface ChatResponseDto {
  thread_id: string;
  response: string;
}

export interface GeneralAssistantContext {
  readonly kind: 'general';
}

export interface CourseAssistantContext {
  readonly kind: 'course';
  readonly courseId: number;
  readonly lessonId?: number;
}

export type AssistantContext = GeneralAssistantContext | CourseAssistantContext;

export function decodeChatResponseDto(value: unknown): ChatResponseDto {
  const response = readRecord(value, 'chat response');
  return {
    thread_id: readString(response.thread_id, 'chat response thread_id'),
    response: readString(response.response, 'chat response text'),
  };
}

export function createChatRequestDto(
  threadId: string,
  message: string,
  context: AssistantContext,
): ChatRequestDto {
  const request: ChatRequestDto = {
    thread_id: readString(threadId, 'chat thread id'),
    message: readString(message, 'chat message'),
  };
  if (context.kind === 'course') {
    request.course_id = readPositiveInteger(context.courseId, 'chat course id');
    if (context.lessonId !== undefined) {
      request.lesson_id = readPositiveInteger(context.lessonId, 'chat lesson id');
    }
  }
  return request;
}
