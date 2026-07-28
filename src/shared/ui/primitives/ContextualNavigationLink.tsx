import { Link, type LinkProps } from 'react-router-dom';

import styles from './ContextualNavigationLink.module.css';

export interface ContextualNavigationLinkProps extends LinkProps {}

export function ContextualNavigationLink({ className, ...props }: ContextualNavigationLinkProps) {
  return <Link {...props} className={[styles.link, className].filter(Boolean).join(' ')} />;
}
