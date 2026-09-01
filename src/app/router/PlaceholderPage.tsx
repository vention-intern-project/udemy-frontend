import { useId } from 'react';

import type { AppRouteDefinition } from './route-registry';
import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  route: AppRouteDefinition;
}
// This is a placeholder page for routes that are not yet implemented.
// It displays the route title and description, plus a note to use the navigation to continue exploring LearnHub.
export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const titleId = `placeholder-title-${useId()}`;
  return (
    <section className={styles.root} aria-labelledby={titleId}>
      <h1 id={titleId}>{route.title}</h1>
      <p>{route.description}</p>
      <p className={styles.note}>Use the navigation to continue exploring LearnHub.</p>
    </section>
  );
}
