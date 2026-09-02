import { MessageCircleMore } from 'lucide-react';
import { type CSSProperties, useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import type { CourseAssistantContext } from '@features/course-chat';

import { CourseChatLauncherInteraction } from './CourseChatLauncherInteraction';
import styles from './CourseChatLauncher.module.css';

interface CourseChatLauncherProps {
  readonly assistant: CourseAssistantContext;
}

interface CourseChatRootStyle extends CSSProperties {
  readonly '--course-chat-footer-clearance': string;
}

interface FooterClearanceState {
  readonly amount: number;
  readonly routeKey: string;
}

// DD-271 requires the spacing-4 breathing gap in measured viewport geometry.
// CSS tokens cannot participate in DOMRect arithmetic, so this mirrors --spacing-4.
const FOOTER_CLEARANCE_GAP_PX = 16;

export function CourseChatLauncher({ assistant }: CourseChatLauncherProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const launcherDescriptionId = useId();
  const widgetId = useId();
  const [open, setOpen] = useState(false);
  const [interactionMounted, setInteractionMounted] = useState(false);
  const [footerClearance, setFooterClearance] = useState<FooterClearanceState>({
    amount: 0,
    routeKey: location.key,
  });
  const rootRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const appliedFooterClearanceRef = useRef(0);

  useLayoutEffect(() => {
    appliedFooterClearanceRef.current = 0;
    setFooterClearance({ amount: 0, routeKey: location.key });
    const root = rootRef.current;
    const precedingFooter = root?.previousElementSibling;
    const footer =
      precedingFooter?.tagName === 'FOOTER'
        ? precedingFooter
        : document.querySelector('footer:not([data-part="course-card-footer"])');
    if (!(root instanceof HTMLElement) || !(footer instanceof HTMLElement)) return undefined;

    let frame: number | null = null;
    let initialFrame: number | null = null;
    let isInitialGeometryPending = true;
    const updateClearance = () => {
      const rootRect = root.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const appliedClearance = appliedFooterClearanceRef.current;
      const normalRootTop = rootRect.top + appliedClearance;
      const normalRootBottom = rootRect.bottom + appliedClearance;
      const footerIsVisible = footerRect.bottom > 0 && footerRect.top < window.innerHeight;
      const footerIsWithinClearanceZone =
        normalRootTop < footerRect.bottom &&
        normalRootBottom + FOOTER_CLEARANCE_GAP_PX > footerRect.top;
      const nextClearance =
        footerIsVisible && footerIsWithinClearanceZone
          ? Math.max(0, normalRootBottom - footerRect.top + FOOTER_CLEARANCE_GAP_PX)
          : 0;
      appliedFooterClearanceRef.current = nextClearance;
      setFooterClearance((current) =>
        current.amount === nextClearance && current.routeKey === location.key
          ? current
          : { amount: nextClearance, routeKey: location.key },
      );
    };
    const scheduleClearanceUpdate = () => {
      if (isInitialGeometryPending || frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        updateClearance();
      });
    };
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleClearanceUpdate);
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(scheduleClearanceUpdate);
    observer?.observe(root);
    observer?.observe(footer);
    mutationObserver?.observe(footer.parentElement ?? root, { childList: true, subtree: true });
    const visualViewport = window.visualViewport;
    initialFrame = requestAnimationFrame(() => {
      initialFrame = null;
      isInitialGeometryPending = false;
      scheduleClearanceUpdate();
    });
    document.addEventListener('scroll', scheduleClearanceUpdate, true);
    window.addEventListener('resize', scheduleClearanceUpdate);
    visualViewport?.addEventListener('resize', scheduleClearanceUpdate);
    visualViewport?.addEventListener('scroll', scheduleClearanceUpdate);

    return () => {
      if (initialFrame !== null) cancelAnimationFrame(initialFrame);
      if (frame !== null) cancelAnimationFrame(frame);
      observer?.disconnect();
      mutationObserver?.disconnect();
      document.removeEventListener('scroll', scheduleClearanceUpdate, true);
      window.removeEventListener('resize', scheduleClearanceUpdate);
      visualViewport?.removeEventListener('resize', scheduleClearanceUpdate);
      visualViewport?.removeEventListener('scroll', scheduleClearanceUpdate);
    };
  }, [location.key]);

  const rootStyle: CourseChatRootStyle | undefined =
    footerClearance.amount === 0 || footerClearance.routeKey !== location.key
      ? undefined
      : { '--course-chat-footer-clearance': `${footerClearance.amount}px` };
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) launcherRef.current?.focus();
  };
  return (
    <aside
      ref={rootRef}
      className={styles.root}
      style={rootStyle}
      aria-label={t('ai:courseAssistant0319')}
    >
      {interactionMounted ? (
        <CourseChatLauncherInteraction
          assistant={assistant}
          footerClearance={footerClearance.amount}
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
          aria-label={t('a11y:openAiAssistant')}
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
          {t('ai:openAiAssistant')}
        </span>
      </span>
    </aside>
  );
}
