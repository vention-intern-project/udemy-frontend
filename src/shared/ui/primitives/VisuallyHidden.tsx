import { createElement, type HTMLAttributes, type ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

export type VisuallyHiddenElement = 'legend' | 'p' | 'span';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  as?: VisuallyHiddenElement;
  children: ReactNode;
}

export function VisuallyHidden({
  as = 'span',
  className,
  children,
  ...props
}: VisuallyHiddenProps) {
  return createElement(
    as,
    {
      ...props,
      className: [styles.root, className].filter(Boolean).join(' '),
    },
    children,
  );
}
