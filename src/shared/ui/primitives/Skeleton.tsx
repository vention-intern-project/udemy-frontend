import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './Skeleton.module.css';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  shape?: 'text' | 'rect' | 'circle';
}

export function Skeleton({
  width,
  height,
  shape = 'text',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={[styles.skeleton, styles[shape], 'ui-skeleton', `ui-skeleton--${shape}`, className]
        .filter(Boolean)
        .join(' ')}
      data-part="skeleton"
      style={{ ...style, width, height }}
    />
  );
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  children: ReactNode;
}

export function SkeletonGroup({ label, className, children, ...props }: SkeletonGroupProps) {
  const { t } = useTranslation();
  return (
    <div
      {...props}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? t('a11y:loadingContent', { defaultValue: 'Loading content' })}
      className={[styles.group, 'ui-skeleton-group', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
