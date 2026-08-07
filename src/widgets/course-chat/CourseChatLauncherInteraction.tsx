import { MoreVertical, Square, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCourseChat, type CourseAssistantContext } from '@features/course-chat';
import { Button, DestructiveConfirmation } from '@shared/ui/primitives';

import { CourseChatContent } from './CourseChatPanel';
import styles from './CourseChatLauncher.module.css';

interface CourseChatLauncherInteractionProps {
  readonly assistant: CourseAssistantContext;
  readonly open: boolean;
  readonly returnTo: string;
  readonly widgetId: string;
  onClose(): void;
  onExpand(): void;
}

export function CourseChatLauncherInteraction({
  assistant,
  open,
  returnTo,
  widgetId,
  onClose,
  onExpand,
}: CourseChatLauncherInteractionProps) {
  const chat = useCourseChat(assistant.context);
  const navigate = useNavigate();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isActionTooltipSuppressed, setIsActionTooltipSuppressed] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const actionTriggerId = useId();
  const actionMenuId = useId();
  const actionMenuRef = useRef<HTMLSpanElement>(null);
  const widgetRef = useRef<HTMLElement>(null);

  const dismissActionMenuToComposer = () => {
    setIsActionMenuOpen(false);
    queueMicrotask(() =>
      widgetRef.current
        ?.querySelector<HTMLTextAreaElement>('textarea')
        ?.focus({ preventScroll: true }),
    );
  };

  useEffect(() => {
    if (!isActionMenuOpen || !open) return;

    const dismissOnOutsidePointerDown = (event: PointerEvent) => {
      if (actionMenuRef.current?.contains(event.target as Node)) return;
      setIsActionMenuOpen(false);
    };

    document.addEventListener('pointerdown', dismissOnOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointerDown);
  }, [isActionMenuOpen, open]);

  useEffect(() => {
    if (open) return;
    setIsActionMenuOpen(false);
    setIsActionTooltipSuppressed(false);
  }, [open]);

  return (
    <section
      ref={widgetRef}
      id={widgetId}
      className={styles.widget}
      aria-label="Course assistant chat"
      hidden={!open}
    >
      <header className={styles.header}>
        <strong className={styles.headerTitle}>Course assistant</strong>
        <div className={styles.headerActions}>
          <span className={styles.headerControl}>
            <Button
              variant="ghost"
              aria-label="Expand course assistant"
              onClick={() => {
                onExpand();
                navigate(
                  assistant.context.kind === 'course' && assistant.enrollmentId !== undefined
                    ? `/learning/enrollments/${assistant.enrollmentId}/ai-chat`
                    : '/ai-chat',
                  { state: { returnTo } },
                );
              }}
            >
              <Square className={styles.expandIcon} aria-hidden="true" />
            </Button>
            <span className={styles.headerTooltip} role="tooltip">
              Expand chat
            </span>
          </span>
          <span
            ref={actionMenuRef}
            className={[
              styles.headerControl,
              styles.actionMenu,
              isActionTooltipSuppressed ? styles.actionMenuTooltipSuppressed : null,
            ]
              .filter(Boolean)
              .join(' ')}
            onPointerEnter={() => {
              if (!isActionMenuOpen) {
                setIsActionTooltipSuppressed(false);
              }
            }}
          >
            <Button
              variant="ghost"
              id={actionTriggerId}
              aria-label="Conversation actions"
              aria-controls={isActionMenuOpen ? actionMenuId : undefined}
              aria-expanded={isActionMenuOpen}
              onClick={() => {
                setIsActionTooltipSuppressed(true);
                setIsActionMenuOpen((isOpen) => !isOpen);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Escape' || !isActionMenuOpen) return;
                event.preventDefault();
                dismissActionMenuToComposer();
              }}
            >
              <MoreVertical aria-hidden="true" />
            </Button>
            {!isActionMenuOpen ? (
              <span className={styles.headerTooltip} role="tooltip">
                Conversation actions
              </span>
            ) : null}
            {isActionMenuOpen ? (
              <span
                className={styles.actionMenuList}
                id={actionMenuId}
                aria-label="Conversation actions"
                data-part="mini-chat-action-menu"
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  dismissActionMenuToComposer();
                }}
              >
                <button
                  className={styles.actionMenuItem}
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setIsClearConfirmationOpen(true);
                  }}
                >
                  <span>Clear chat</span>
                  <Trash2 aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </span>
          <span className={styles.headerControl}>
            <Button
              variant="ghost"
              aria-label="Close course assistant"
              onClick={() => {
                setIsActionMenuOpen(false);
                onClose();
              }}
            >
              <X aria-hidden="true" />
            </Button>
            <span className={styles.headerTooltip} role="tooltip">
              Close chat
            </span>
          </span>
        </div>
      </header>
      <CourseChatContent chat={chat} context={assistant.context} compact focusOnOpen={open} />
      <DestructiveConfirmation
        open={isClearConfirmationOpen}
        title="Clear this conversation?"
        description="This action cannot be undone."
        confirmLabel="Clear conversation"
        onConfirm={() => {
          chat.reset();
          setIsClearConfirmationOpen(false);
        }}
        onCancel={() => {
          setIsClearConfirmationOpen(false);
          queueMicrotask(() => document.getElementById(actionTriggerId)?.focus());
        }}
      />
    </section>
  );
}
