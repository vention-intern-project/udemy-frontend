import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { SendHorizontal, Sparkles } from 'lucide-react';

import { Button, Notice, Textarea, VisuallyHidden } from '@shared/ui/primitives';
import {
  useCourseChat,
  type ChatMessage,
  type CourseChatContext,
  type CourseChatWorkflow,
} from '@features/course-chat';

import styles from './CourseChatPanel.module.css';

interface CourseChatPanelProps {
  readonly context: CourseChatContext;
  readonly compact?: boolean;
  readonly focusOnOpen?: boolean;
}

function errorCopy(error: ReturnType<typeof useCourseChat>['error']) {
  if (error === 'sign_in_required')
    return ['Sign in required', 'Sign in again before using the assistant.'] as const;
  if (error === 'invalid_request')
    return ['Message needs checking', 'Check the message and try again.'] as const;
  if (error === 'temporarily_unavailable')
    return [
      'Assistant temporarily unavailable',
      'The assistant is temporarily unavailable.',
    ] as const;
  return ['Assistant unavailable', 'The assistant is unavailable for this course.'] as const;
}

interface CourseChatContentProps {
  readonly chat: CourseChatWorkflow;
  readonly context: CourseChatContext;
  readonly compact: boolean;
  readonly focusOnOpen: boolean;
}

interface ChatMessageBubbleProps {
  readonly message: ChatMessage;
}

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 24;

function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isLearner = message.author === 'learner';
  return (
    <div className={`${styles.messageRow} ${isLearner ? styles.learnerRow : styles.assistantRow}`}>
      {!isLearner ? (
        <span className={`${styles.avatar} ${styles.assistantAvatar}`} aria-hidden="true">
          <Sparkles />
        </span>
      ) : null}
      <p className={`${styles.messageBubble} ${isLearner ? styles.learner : styles.assistant}`}>
        {message.text}
      </p>
    </div>
  );
}

function AssistantTypingIndicator() {
  return (
    <div
      className={`${styles.messageRow} ${styles.assistantRow} ${styles.typingRow}`}
      role="status"
    >
      <span className={`${styles.avatar} ${styles.assistantAvatar}`} aria-hidden="true">
        <Sparkles />
      </span>
      <span className={styles.typingContent}>
        <span className={styles.typingDots} aria-hidden="true">
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
        </span>
        <span className={styles.typingLabel}>Thinking…</span>
      </span>
    </div>
  );
}

function AssistantResponseError() {
  return (
    <div
      className={`${styles.messageRow} ${styles.assistantRow} ${styles.responseErrorRow}`}
      role="alert"
    >
      <span className={`${styles.avatar} ${styles.assistantAvatar}`} aria-hidden="true">
        <Sparkles />
      </span>
      <p className={styles.responseErrorCopy}>Couldn’t generate a response.</p>
    </div>
  );
}

export function CourseChatContent({ chat, context, compact, focusOnOpen }: CourseChatContentProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  useEffect(() => {
    if (focusOnOpen) inputRef.current?.focus();
  }, [focusOnOpen]);
  const inlineResponseFailure = chat.error === 'response_failed';
  const feedback = chat.error === null || inlineResponseFailure ? null : errorCopy(chat.error);
  useLayoutEffect(() => {
    const messages = messagesRef.current;
    if (messages !== null && shouldStickToBottomRef.current) {
      messages.scrollTop = messages.scrollHeight;
    }
  }, [chat.messages, chat.pending, inlineResponseFailure]);
  const handleSubmitKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    chat.submit();
  };
  return (
    <section
      className={`${styles.panel} ${compact ? styles.compact : styles.full}`}
      aria-label="Course assistant"
    >
      <div
        ref={messagesRef}
        className={styles.messages}
        aria-live="polite"
        onScroll={(event) => {
          const messages = event.currentTarget;
          shouldStickToBottomRef.current =
            messages.scrollHeight - messages.clientHeight - messages.scrollTop <=
            AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
        }}
      >
        {chat.messages.length === 0 ? (
          <p className={styles.empty}>
            {context.kind === 'general'
              ? 'Ask a question about your learning.'
              : 'Ask a question about this course.'}
          </p>
        ) : null}
        {chat.messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {chat.pending ? <AssistantTypingIndicator /> : null}
        {inlineResponseFailure ? <AssistantResponseError /> : null}
      </div>
      {feedback ? (
        <div className={compact ? styles.compactError : undefined}>
          <Notice tone="error" title={feedback[0]}>
            {feedback[1]}
          </Notice>
        </div>
      ) : null}
      <div className={compact ? styles.compactComposerArea : styles.fullComposerArea}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            chat.submit();
          }}
          className={styles.form}
        >
          <Textarea
            ref={inputRef}
            label={<VisuallyHidden>Message the course assistant</VisuallyHidden>}
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            disabled={!compact && chat.pending}
            placeholder="Ask a follow up question..."
            className={compact ? styles.compactInput : styles.fullInput}
            fieldClassName={compact ? styles.compactInputField : styles.fullInputField}
            rows={1}
            onKeyDown={handleSubmitKeyDown}
          />
          <Button
            type="submit"
            aria-label="Send message"
            disabled={chat.pending || chat.draft.trim() === ''}
            state={chat.pending ? 'loading' : 'idle'}
            loadingLabel={<VisuallyHidden>Sending message</VisuallyHidden>}
          >
            <SendHorizontal aria-hidden="true" />
          </Button>
        </form>
      </div>
    </section>
  );
}

export function CourseChatPanel({
  context,
  compact = false,
  focusOnOpen = true,
}: CourseChatPanelProps) {
  const chat = useCourseChat(context);
  return (
    <CourseChatContent chat={chat} context={context} compact={compact} focusOnOpen={focusOnOpen} />
  );
}
