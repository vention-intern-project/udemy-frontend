import { MessageCircleMore } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
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
    setOpen(false);
    if (restoreFocus) launcherRef.current?.focus();
  };
  return (
    <aside ref={rootRef} className={styles.root} aria-label="Course assistant">
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
