import { useId, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CircleHelp, Compass, Medal, MoreVertical, Trash2, X } from 'lucide-react';

import { sanitizeInternalReturnTo } from '@features/auth-session';
import {
  useCourseChat,
  type CourseChatContext,
  type CourseChatWorkflow,
} from '@features/course-chat';
import { useLearningWorkspace } from '@features/learning-progress';
import {
  Button,
  ContextualNavigationLink,
  DestructiveConfirmation,
  Notice,
  Skeleton,
  SkeletonGroup,
} from '@shared/ui/primitives';
import { CourseChatContent } from '@widgets/course-chat';
import heroImage from './assets/ai-chat-hero.png';

import styles from './AiChatPage.module.css';

type AssistantRoute =
  | { readonly kind: 'general' }
  | { readonly kind: 'course'; readonly enrollmentId: number }
  | { readonly kind: 'invalid' };

function assistantRouteFromEnrollmentId(value: string | undefined): AssistantRoute {
  if (value === undefined) return { kind: 'general' };
  if (!/^[1-9]\d*$/.test(value)) return { kind: 'invalid' };

  const enrollmentId = Number(value);
  return Number.isSafeInteger(enrollmentId)
    ? { kind: 'course', enrollmentId }
    : { kind: 'invalid' };
}

export function AiChatPage() {
  const route = assistantRouteFromEnrollmentId(useParams().enrollmentId);
  if (route.kind === 'general') return <GeneralAiChatPage />;
  if (route.kind === 'invalid') return <InvalidCourseAiChatPage />;

  return <CourseAiChatPage enrollmentId={route.enrollmentId} />;
}

interface CourseAiChatPageProps {
  readonly enrollmentId: number;
}

function CourseAiChatPage({ enrollmentId }: CourseAiChatPageProps) {
  const workspace = useLearningWorkspace(enrollmentId, { reducedMotion: false });
  if (workspace.enrollment.isPending)
    return (
      <SkeletonGroup label="Loading course assistant">
        <Skeleton width="40%" height="40px" />
        <Skeleton width="100%" height="360px" shape="rect" />
      </SkeletonGroup>
    );
  if (workspace.enrollment.isError || workspace.enrollment.data === undefined)
    return (
      <section className={styles.state}>
        <h1>Course assistant unavailable</h1>
        <p>This assistant is unavailable for this course.</p>
        <ContextualNavigationLink to="/learning">Return to my learning</ContextualNavigationLink>
      </section>
    );
  const enrollment = workspace.enrollment.data;
  if (enrollment.status !== 'active')
    return (
      <section className={styles.state}>
        <h1>Course assistant unavailable</h1>
        <p>This assistant is unavailable for this course.</p>
        <ContextualNavigationLink to={`/learning/enrollments/${enrollment.id}`}>
          Return to learning workspace
        </ContextualNavigationLink>
      </section>
    );
  return (
    <AssistantPageLayout
      context={{ kind: 'course', courseId: enrollment.courseId }}
      backTo={`/learning/enrollments/${enrollment.id}`}
    />
  );
}

function GeneralAiChatPage() {
  return <AssistantPageLayout context={{ kind: 'general' }} backTo="/learning" />;
}

function InvalidCourseAiChatPage() {
  return (
    <section className={styles.state} aria-labelledby="invalid-course-assistant-route-title">
      <h1 id="invalid-course-assistant-route-title">Invalid course assistant address</h1>
      <p>Return to my learning and choose a course to open its assistant.</p>
      <ContextualNavigationLink to="/learning">Return to my learning</ContextualNavigationLink>
    </section>
  );
}

interface AssistantPageLayoutProps {
  readonly context: CourseChatContext;
  readonly backTo: string;
}

interface AiChatNavigationState {
  readonly returnTo?: unknown;
}

interface SuggestedAction {
  readonly icon: typeof Compass;
  readonly label: string;
  readonly prompt: string;
}

const SUGGESTED_ACTIONS: readonly SuggestedAction[] = [
  {
    icon: Compass,
    label: 'Recommend a course',
    prompt: 'Recommend a course based on my learning goals.',
  },
  {
    icon: CircleHelp,
    label: 'Explain a concept',
    prompt: 'Explain a concept I am learning in simple terms.',
  },
  {
    icon: Medal,
    label: 'Quiz me',
    prompt: 'Quiz me on the course material I am learning.',
  },
];

interface SuggestedActionsProps {
  readonly chat: CourseChatWorkflow;
  readonly backTo: string;
  readonly onActionSelect: () => void;
}

function SuggestedActions({ chat, backTo, onActionSelect }: SuggestedActionsProps) {
  return (
    <div className={styles.sidebarColumn}>
      <ContextualNavigationLink className={styles.returnLink} to={backTo}>
        <ChevronLeft aria-hidden="true" />
        Return to my learning
      </ContextualNavigationLink>
      <aside className={styles.sidebar} aria-labelledby="suggested-actions-title">
        <h2 id="suggested-actions-title">Suggested Actions</h2>
        <p>Quick prompts to jumpstart your session</p>
        <div className={styles.suggestedActions}>
          {SUGGESTED_ACTIONS.map(({ icon: Icon, label, prompt }) => {
            const selected = chat.draft === prompt;
            return (
              <button
                key={label}
                className={[
                  styles.suggestedAction,
                  selected ? styles.suggestedActionSelected : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-selected={selected ? 'true' : 'false'}
                type="button"
                onClick={() => {
                  chat.setDraft(prompt);
                  onActionSelect();
                }}
              >
                <Icon aria-hidden="true" focusable="false" />
                {label}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function AssistantPageLayout({ context, backTo }: AssistantPageLayoutProps) {
  const chat = useCourseChat(context);
  const location = useLocation();
  const navigate = useNavigate();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const actionTriggerId = useId();
  const isUnavailable = chat.error === 'temporarily_unavailable' || chat.error === 'unavailable';
  const isAvailable =
    !isUnavailable && chat.messages.some((message) => message.author === 'assistant');
  const chatTitle = context.kind === 'general' ? 'General Assistance Chat' : 'Course Assistant';
  const state = location.state as AiChatNavigationState | null;
  const returnTo =
    typeof state?.returnTo === 'string'
      ? sanitizeInternalReturnTo(state.returnTo, globalThis.location?.origin)
      : null;
  const closeDestination = returnTo && returnTo !== location.pathname ? returnTo : backTo;
  const availabilityLabel = isAvailable
    ? 'Assistant available'
    : isUnavailable
      ? 'Assistant unavailable'
      : 'Assistant availability unknown';
  return (
    <article className={styles.page}>
      <section className={styles.hero} aria-labelledby="ai-chat-hero-title">
        <img className={styles.heroImage} src={heroImage} alt="" aria-hidden="true" />
        <div className={styles.heroContent}>
          <h1 id="ai-chat-hero-title">
            <span className={styles.betaBadge}>BETA</span> AI Learning Assistant
          </h1>
          <p>
            Ask questions, summarize lessons, take interactive practice quizzes, and get course
            recommendations tailored directly to your path.
          </p>
        </div>
      </section>
      <SuggestedActions
        chat={chat}
        backTo={backTo}
        onActionSelect={() => setComposerFocusRequest((request) => request + 1)}
      />
      <section className={styles.chatArea}>
        <section className={styles.chatFrame} aria-label="AI assistant chat">
          <header className={styles.chatFrameHeader}>
            <div className={styles.chatFrameIdentity}>
              <span
                className={`${styles.statusDot} ${isAvailable ? styles.statusAvailable : isUnavailable ? styles.statusUnavailable : styles.statusUnknown}`}
                aria-label={availabilityLabel}
                role="img"
              />
              <span>
                <strong>{chatTitle}</strong>
                <small>Powered by LearnHub Intelligence</small>
              </span>
            </div>
            <div className={styles.chatFrameActions}>
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
              <Button
                variant="ghost"
                aria-label="Close assistant chat"
                onClick={() => navigate(closeDestination)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </header>
          <CourseChatContent
            chat={chat}
            context={context}
            compact={false}
            focusOnOpen
            focusRequest={composerFocusRequest}
          />
        </section>
        <Notice tone="info">
          This conversation stays available while you continue using the assistant.
        </Notice>
      </section>
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
    </article>
  );
}
