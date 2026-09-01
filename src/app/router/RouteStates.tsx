import {
  Button,
  ContextualNavigationLink,
  Notice,
  Skeleton,
  SkeletonGroup,
} from '../../shared/ui/primitives';
import { useTranslation } from 'react-i18next';
import styles from './RouteStates.module.css';

interface RetryStateProps {
  onRetry: () => void;
}

export function BootstrapState() {
  const { t } = useTranslation();
  return (
    <main className={[styles.root, styles.centered].join(' ')} aria-busy="true">
      <div className={styles.card}>
        <h1>{t('routes:bootstrapHeading')}</h1>
        <p>{t('routes:bootstrapDescription')}</p>
        <SkeletonGroup label={t('routes:bootstrapLoadingLabel')}>
          <Skeleton width="100%" />
          <Skeleton width="82%" />
          <Skeleton width="64%" />
        </SkeletonGroup>
      </div>
    </main>
  );
}

export function SessionErrorState({ onRetry }: RetryStateProps) {
  const { t } = useTranslation();
  return (
    <main className={[styles.root, styles.centered].join(' ')} id="main-content">
      <div className={styles.card}>
        <h1>{t('routes:sessionErrorHeading')}</h1>
        <Notice className={styles.notice} tone="error" title={t('routes:sessionErrorNoticeTitle')}>
          {t('routes:sessionErrorNoticeDescription')}
        </Notice>
        <Button onClick={onRetry}>{t('routes:tryAgain')}</Button>
      </div>
    </main>
  );
}

export function RenderErrorState({ onRetry }: RetryStateProps) {
  const { t } = useTranslation();
  return (
    <main className={[styles.root, styles.centered].join(' ')} id="main-content">
      <div className={styles.card} role="alert" aria-labelledby="render-error-title">
        <h1 id="render-error-title">{t('routes:renderErrorHeading')}</h1>
        <p>{t('routes:renderErrorDescription')}</p>
        <div className={styles.actions}>
          <Button onClick={onRetry}>{t('routes:tryAgain')}</Button>
          <ContextualNavigationLink className={styles.linkButton} to="/">
            {t('routes:backToCatalog')}
          </ContextualNavigationLink>
        </div>
      </div>
    </main>
  );
}

export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <section className={styles.root} aria-labelledby="forbidden-title">
      <div className={styles.card}>
        <p className={styles.eyebrow}>403</p>
        <h1 id="forbidden-title">{t('routes:forbiddenHeading')}</h1>
        <p>{t('routes:forbiddenDescription')}</p>
        <ContextualNavigationLink
          className={[styles.linkButton, styles.forbiddenLink].join(' ')}
          to="/"
        >
          {t('routes:backToCatalog')}
        </ContextualNavigationLink>
      </div>
    </section>
  );
}

export function NotFoundState() {
  const { t } = useTranslation();
  return (
    <section className={styles.root} aria-labelledby="not-found-title">
      <div className={styles.card}>
        <p className={styles.eyebrow}>404</p>
        <h1 id="not-found-title">{t('routes:notFoundHeading')}</h1>
        <p>{t('routes:notFoundDescription')}</p>
        <ContextualNavigationLink className={styles.linkButton} to="/">
          {t('routes:backToCatalog')}
        </ContextualNavigationLink>
      </div>
    </section>
  );
}
