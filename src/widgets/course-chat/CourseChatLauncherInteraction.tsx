import { MoreVertical, Square, Trash2, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCourseChat, type CourseAssistantContext } from '@features/course-chat';
import { Button, DestructiveConfirmation } from '@shared/ui/primitives';

import { CourseChatContent } from './CourseChatPanel';
import styles from './CourseChatLauncher.module.css';

interface CourseChatLauncherInteractionProps {
  readonly assistant: CourseAssistantContext;
  readonly footerClearance: number;
  readonly open: boolean;
  readonly returnTo: string;
  readonly widgetId: string;
  onClose(): void;
  onExpand(): void;
}

interface ActionMenuViewportPlacement {
  readonly inlineStart: number;
  readonly blockStart: number;
}

type ActionMenuViewportStyle = Pick<CSSProperties, 'left' | 'top'>;

const ACTION_MENU_VIEWPORT_GUTTER = 4;

export function CourseChatLauncherInteraction({
  assistant,
  footerClearance,
  open,
  returnTo,
  widgetId,
  onClose,
  onExpand,
}: CourseChatLauncherInteractionProps) {
  const { t } = useTranslation();
  const chat = useCourseChat(assistant.context);
  const navigate = useNavigate();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isActionTooltipSuppressed, setIsActionTooltipSuppressed] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const [actionMenuPlacement, setActionMenuPlacement] =
    useState<ActionMenuViewportPlacement | null>(null);
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

  useLayoutEffect(() => {
    if (!isActionMenuOpen) {
      setActionMenuPlacement(null);
      return undefined;
    }

    const updateActionMenuPlacement = () => {
      const menu = actionMenuRef.current?.querySelector<HTMLElement>(
        '[data-part="mini-chat-action-menu"]',
      );
      const trigger = actionMenuRef.current?.querySelector<HTMLButtonElement>(
        ':scope > [data-part="button-wrapper"] > button',
      );
      if (menu == null || trigger == null) return;

      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = visualViewport?.height ?? document.documentElement.clientHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const menuRect = menu.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const maximumInlineStart = Math.max(
        viewportLeft + ACTION_MENU_VIEWPORT_GUTTER,
        viewportRight - menuRect.width - ACTION_MENU_VIEWPORT_GUTTER,
      );
      const maximumBlockStart = Math.max(
        viewportTop + ACTION_MENU_VIEWPORT_GUTTER,
        viewportBottom - menuRect.height - ACTION_MENU_VIEWPORT_GUTTER,
      );
      const nextPlacement: ActionMenuViewportPlacement = {
        inlineStart: Math.min(
          Math.max(
            triggerRect.left + triggerRect.width / 2 - menuRect.width / 2,
            viewportLeft + ACTION_MENU_VIEWPORT_GUTTER,
          ),
          maximumInlineStart,
        ),
        blockStart: Math.min(
          Math.max(triggerRect.bottom + 8, viewportTop + ACTION_MENU_VIEWPORT_GUTTER),
          maximumBlockStart,
        ),
      };
      setActionMenuPlacement((current) =>
        current?.inlineStart === nextPlacement.inlineStart &&
        current.blockStart === nextPlacement.blockStart
          ? current
          : nextPlacement,
      );
    };

    updateActionMenuPlacement();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateActionMenuPlacement);
    const menu = actionMenuRef.current?.querySelector<HTMLElement>(
      '[data-part="mini-chat-action-menu"]',
    );
    const trigger = actionMenuRef.current?.querySelector<HTMLButtonElement>(
      ':scope > [data-part="button-wrapper"] > button',
    );
    if (menu != null) observer?.observe(menu);
    if (trigger != null) observer?.observe(trigger);
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', updateActionMenuPlacement);
    visualViewport?.addEventListener('resize', updateActionMenuPlacement);
    visualViewport?.addEventListener('scroll', updateActionMenuPlacement);
    document.addEventListener('scroll', updateActionMenuPlacement, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateActionMenuPlacement);
      visualViewport?.removeEventListener('resize', updateActionMenuPlacement);
      visualViewport?.removeEventListener('scroll', updateActionMenuPlacement);
      document.removeEventListener('scroll', updateActionMenuPlacement, true);
    };
  }, [footerClearance, isActionMenuOpen]);

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

  const actionMenuStyle: ActionMenuViewportStyle | undefined =
    actionMenuPlacement === null
      ? undefined
      : {
          left: actionMenuPlacement.inlineStart,
          top: actionMenuPlacement.blockStart,
        };

  return (
    <section
      ref={widgetRef}
      id={widgetId}
      className={styles.widget}
      aria-label={t('ai:courseAssistantChat', { defaultValue: 'Course assistant chat' })}
      hidden={!open}
    >
      <header className={styles.header}>
        <strong className={styles.headerTitle}>
          {t('ai:courseAssistant0319', { defaultValue: 'Course assistant' })}
        </strong>
        <div className={styles.headerActions}>
          <span className={styles.headerControl}>
            <Button
              variant="ghost"
              aria-label={t('ai:expandCourseAssistant', {
                defaultValue: 'Expand course assistant',
              })}
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
              {t('ai:expandChat')}
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
              aria-label={t('ai:conversationActions', { defaultValue: 'Conversation actions' })}
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
                {t('ai:conversationActions', { defaultValue: 'Conversation actions' })}
              </span>
            ) : null}
            {isActionMenuOpen ? (
              <span
                className={styles.actionMenuList}
                id={actionMenuId}
                aria-label={t('ai:conversationActions', { defaultValue: 'Conversation actions' })}
                data-part="mini-chat-action-menu"
                style={actionMenuStyle}
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
                  <span>{t('ai:clearChat', { defaultValue: 'Clear chat' })}</span>
                  <Trash2 aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </span>
          <span className={styles.headerControl}>
            <Button
              variant="ghost"
              aria-label={t('ai:closeCourseAssistant', { defaultValue: 'Close course assistant' })}
              onClick={() => {
                setIsActionMenuOpen(false);
                onClose();
              }}
            >
              <X aria-hidden="true" />
            </Button>
            <span className={styles.headerTooltip} role="tooltip">
              {t('ai:closeChat')}
            </span>
          </span>
        </div>
      </header>
      <CourseChatContent chat={chat} context={assistant.context} compact focusOnOpen={open} />
      <DestructiveConfirmation
        open={isClearConfirmationOpen}
        title={t('ai:clearThisConversation', { defaultValue: 'Clear this conversation?' })}
        description={t('ai:thisActionCannotBeUndone', {
          defaultValue: 'This action cannot be undone.',
        })}
        confirmLabel={t('ai:clearConversation', { defaultValue: 'Clear conversation' })}
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
