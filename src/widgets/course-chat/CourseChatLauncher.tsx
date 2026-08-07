import { MessageCircleMore } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import type { CourseAssistantContext } from '@features/course-chat';

import { CourseChatLauncherInteraction } from './CourseChatLauncherInteraction';
import styles from './CourseChatLauncher.module.css';

interface CourseChatLauncherProps {
  readonly assistant: CourseAssistantContext;
}

export function CourseChatLauncher({ assistant }: CourseChatLauncherProps) {
  const location = useLocation();
  const launcherDescriptionId = useId();
  const widgetId = useId();
  const [open, setOpen] = useState(false);
  const [interactionMounted, setInteractionMounted] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) launcherRef.current?.focus();
  };
  return (
    <aside className={styles.root} aria-label="Course assistant">
      {interactionMounted ? (
        <CourseChatLauncherInteraction
          assistant={assistant}
          open={open}
          widgetId={widgetId}
          returnTo={`${location.pathname}${location.search}${location.hash}`}
          onClose={() => close()}
          onExpand={() => {
            setOpen(false);
            setInteractionMounted(false);
          }}
        />
      ) : null}
      <span
        className={[styles.launcherAnchor, open ? styles.launcherAnchorOpen : null]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          ref={launcherRef}
          className={styles.launcher}
          type="button"
          aria-describedby={launcherDescriptionId}
          aria-label="Open AI assistant"
          aria-controls={open ? widgetId : undefined}
          aria-expanded={open}
          onClick={() => {
            if (interactionMounted && open) {
              close(false);
              return;
            }
            if (!interactionMounted) setInteractionMounted(true);
            setOpen(true);
          }}
        >
          <MessageCircleMore aria-hidden="true" />
        </button>
        <span id={launcherDescriptionId} className={styles.launcherTooltip} role="tooltip">
          Open AI assistant
        </span>
      </span>
    </aside>
  );
}
