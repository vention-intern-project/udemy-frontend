import { type KeyboardEvent } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import styles from './ContextualNavigationLink.module.css';

export interface ContextualNavigationLinkProps extends LinkProps {}

export function activateContextualNavigationOnSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (
    ![' ', 'Space', 'Spacebar'].includes(event.key) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;

  event.preventDefault();
  event.currentTarget.click();
}

export function ContextualNavigationLink({ className, ...props }: ContextualNavigationLinkProps) {
  return <Link {...props} className={[styles.link, className].filter(Boolean).join(' ')} />;
}
