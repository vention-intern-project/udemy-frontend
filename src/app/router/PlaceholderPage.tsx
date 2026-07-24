import { useId } from 'react';

import type { AppRouteDefinition } from './route-registry';

interface PlaceholderPageProps {
  route: AppRouteDefinition;
}

export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const titleId = `placeholder-title-${useId()}`;
  return (
    <section className="app-placeholder" aria-labelledby={titleId}>
      <h1 id={titleId}>{route.title}</h1>
      <p>{route.description}</p>
      <p className="app-placeholder__note">Use the navigation to continue exploring LearnHub.</p>
    </section>
  );
}
