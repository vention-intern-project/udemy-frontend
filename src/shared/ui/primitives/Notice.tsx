import type { HTMLAttributes, ReactNode } from 'react';

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
  dismissLabel = 'Dismiss notification',
  className,
  children,
  ...props
}: NoticeProps) {
  const role = politeness === 'assertive' ? 'alert' : politeness === 'polite' ? 'status' : undefined;

  return (
    <div
      {...props}
      role={role}
      aria-live={politeness === 'off' ? undefined : politeness}
      aria-atomic={politeness === 'off' ? undefined : true}
      data-tone={tone}
      className={['ui-notice', `ui-notice--${tone}`, className].filter(Boolean).join(' ')}
    >
      <div className="ui-notice__content">
        {title ? <strong className="ui-notice__title">{title}</strong> : null}
        <div>{children}</div>
      </div>
      {onDismiss ? (
        <button className="ui-notice__dismiss" type="button" onClick={onDismiss} aria-label={dismissLabel}>
          ×
        </button>
      ) : null}
    </div>
  );
}
