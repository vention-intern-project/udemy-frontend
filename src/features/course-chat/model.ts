import type { AssistantContext } from '@entities/api';

export type CourseChatContext = AssistantContext;

export interface CourseAssistantContext {
  readonly context: CourseChatContext;
  readonly enrollmentId?: number;
}

export interface ChatMessage {
  readonly id: string;
  readonly author: 'learner' | 'assistant';
  readonly text: string;
}

export type CourseChatErrorState =
  | 'sign_in_required'
  | 'unavailable'
  | 'invalid_request'
  | 'response_failed'
  | 'temporarily_unavailable';
