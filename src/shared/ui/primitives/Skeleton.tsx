import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

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
      className={['ui-skeleton', `ui-skeleton--${shape}`, className].filter(Boolean).join(' ')}
      style={{ ...style, width, height }}
    />
  );
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  children: ReactNode;
}

export function SkeletonGroup({
  label = 'Loading content',
  className,
  children,
  ...props
}: SkeletonGroupProps) {
  return (
    <div
      {...props}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={['ui-skeleton-group', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
