import type { ChatRequestDto, ChatResponseDto } from '@entities/api';
import { createChatRequestDto, decodeChatResponseDto } from '@entities/api';
import { requestOperation, type SessionContextValue } from '@features/auth-session';

import type { CourseChatContext } from './model';

export function requestCourseChat(
  session: SessionContextValue,
  threadId: string,
  message: string,
  context: CourseChatContext,
  signal?: AbortSignal,
): Promise<ChatResponseDto> {
  const body: ChatRequestDto = createChatRequestDto(threadId, message, context);
  return requestOperation(session, 'API-007', {
    path: '/chat/',
    body,
    signal,
    decode: decodeChatResponseDto,
  });
}
