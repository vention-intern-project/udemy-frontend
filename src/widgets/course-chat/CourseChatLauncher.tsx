import { MessageCircleMore, MoreVertical, Square, Trash2, X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  useCourseChat,
  useCourseChatSessionControls,
  type CourseAssistantContext,
} from '@features/course-chat';
import { Button, DestructiveConfirmation } from '@shared/ui/primitives';

import { CourseChatContent } from './CourseChatPanel';
import styles from './CourseChatLauncher.module.css';

interface CourseChatLauncherProps {
  readonly assistant: CourseAssistantContext | null;
  readonly guest?: boolean;
}

export function CourseChatLauncher({ assistant, guest = false }: CourseChatLauncherProps) {
  const { resetConversation } = useCourseChatSessionControls();
  const location = useLocation();
  const launcherDescriptionId = useId();
  const [open, setOpen] = useState(false);
  const [interactionMounted, setInteractionMounted] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const footer = document.querySelector('footer');
    if (root === null || footer === null) return undefined;

    let frame = 0;
    const applyFooterClearance = () => {
      const clearance = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
      root.style.setProperty('--course-chat-footer-clearance', `${clearance}px`);
    };
    const updateFooterClearance = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyFooterClearance();
      });
    };
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateFooterClearance);
    observer?.observe(footer);
    if (footer.parentElement !== null) observer?.observe(footer.parentElement);
    window.addEventListener('scroll', updateFooterClearance, { passive: true });
    window.addEventListener('resize', updateFooterClearance);
    applyFooterClearance();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateFooterClearance);
      window.removeEventListener('resize', updateFooterClearance);
      observer?.disconnect();
      root.style.removeProperty('--course-chat-footer-clearance');
    };
  }, []);
  const close = (restoreFocus = true) => {
    if (assistant !== null) resetConversation(assistant.context);
    setOpen(false);
    setInteractionMounted(false);
    if (restoreFocus) launcherRef.current?.focus();
  };
  return (
    <aside ref={rootRef} className={styles.root} aria-label="Course assistant">
      {interactionMounted ? (
        <CourseChatLauncherInteraction
          assistant={assistant!}
          open={open}
          onClose={() => close()}
          onExpand={() => {
            setOpen(false);
            setInteractionMounted(false);
          }}
        />
      ) : null}
      <span className={styles.launcherAnchor}>
        <button
          ref={launcherRef}
          className={styles.launcher}
          type="button"
          aria-describedby={launcherDescriptionId}
          aria-label="Open AI assistant"
          onClick={() => {
            if (guest) {
              setOpen(true);
              return;
            }
            if (interactionMounted) {
              close(false);
              return;
            }
            setInteractionMounted(true);
            setOpen(true);
          }}
        >
          <MessageCircleMore aria-hidden="true" />
        </button>
        <span id={launcherDescriptionId} className={styles.launcherTooltip} role="tooltip">
          Open AI assistant
        </span>
      </span>
      {guest && open ? (
        <GuestAssistantGuidance
          returnTo={`${location.pathname}${location.search}${location.hash}`}
        />
      ) : null}
    </aside>
  );
}

interface CourseChatLauncherInteractionProps {
  readonly assistant: CourseAssistantContext;
  readonly open: boolean;
  onClose(): void;
  onExpand(): void;
}

function CourseChatLauncherInteraction({
  assistant,
  open,
  onClose,
  onExpand,
}: CourseChatLauncherInteractionProps) {
  const chat = useCourseChat(assistant.context);
  const navigate = useNavigate();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const actionTriggerId = useId();
  return (
    <section className={styles.widget} aria-label="Course assistant chat" hidden={!open}>
      <header className={styles.header}>
        <strong className={styles.headerTitle}>Course assistant</strong>
        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            aria-label="Expand course assistant"
            onClick={() => {
              onExpand();
              navigate(
                assistant.context.kind === 'course' && assistant.enrollmentId !== undefined
                  ? `/learning/enrollments/${assistant.enrollmentId}/ai-chat`
                  : '/ai-chat',
              );
            }}
          >
            <Square className={styles.expandIcon} aria-hidden="true" />
          </Button>
          <span className={styles.actionMenu}>
            <Button
              variant="ghost"
              id={actionTriggerId}
              aria-label="Conversation actions"
              aria-expanded={isActionMenuOpen}
              onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsActionMenuOpen(false);
              }}
            >
              <MoreVertical aria-hidden="true" />
            </Button>
            {isActionMenuOpen ? (
              <span
                className={styles.actionMenuList}
                aria-label="Conversation actions"
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  setIsActionMenuOpen(false);
                  document.getElementById(actionTriggerId)?.focus();
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
          <Button variant="ghost" aria-label="Close course assistant" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
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

interface GuestAssistantGuidanceProps {
  readonly returnTo: string;
}

function GuestAssistantGuidance({ returnTo }: GuestAssistantGuidanceProps) {
  const encodedReturnTo = encodeURIComponent(returnTo);
  return (
    <section
      className={`${styles.widget} ${styles.guestWidget}`}
      aria-label="AI assistant sign in guidance"
    >
      <header className={styles.header}>
        <strong className={styles.headerTitle}>Course assistant</strong>
      </header>
      <p className={styles.guestCopy}>Create an account to use the AI learning assistant.</p>
      <div className={styles.guestActions}>
        <Link className={styles.guestSignupLink} to={`/signup?returnTo=${encodedReturnTo}`}>
          Create an account
        </Link>
        <Link className={styles.guestLoginLink} to={`/login?returnTo=${encodedReturnTo}`}>
          Log in
        </Link>
      </div>
    </section>
  );
}
