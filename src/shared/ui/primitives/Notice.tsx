import type { HTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './Notice.module.css';

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';
export type NoticePoliteness = 'polite' | 'assertive' | 'off';

export interface NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: NoticeTone;
  title?: ReactNode;
  politeness?: NoticePoliteness;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function Notice({
  tone = 'info',
  title,
  politeness = tone === 'error' ? 'assertive' : 'polite',
  onDismiss,
  dismissLabel,
  className,
  children,
  ...props
}: NoticeProps) {
  const { t } = useTranslation();
  const role =
    politeness === 'assertive' ? 'alert' : politeness === 'polite' ? 'status' : undefined;

  return (
    <div
      {...props}
      role={role}
      aria-live={politeness === 'off' ? undefined : politeness}
      aria-atomic={politeness === 'off' ? undefined : true}
      data-tone={tone}
      className={[styles.notice, styles[tone], 'ui-notice', `ui-notice--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={[styles.content, 'ui-notice__content'].join(' ')}>
        {title ? (
          <strong className={[styles.title, 'ui-notice__title'].join(' ')}>{title}</strong>
        ) : null}
        <div>{children}</div>
      </div>
      {onDismiss ? (
        <button
          className={[styles.dismiss, 'ui-notice__dismiss'].join(' ')}
          type="button"
          onClick={onDismiss}
          aria-label={
            dismissLabel ?? t('a11y:dismissNotification', { defaultValue: 'Dismiss notification' })
          }
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
