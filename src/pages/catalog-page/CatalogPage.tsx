import { useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { CatalogCourse } from '@entities/course';
import {
  parseCatalogQuery, serializeCatalogQuery, type CatalogQuery, type CatalogRequester,
  useCatalogDiscovery,
} from '@features/catalog-discovery';
import { useSession } from '@features/auth-session';
import { CatalogFilterBar } from '@widgets/catalog-filter-bar';
import { Button, Notice, Pagination, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import './catalog-page.css';

function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <li className="catalog-page__item">
      <article className="catalog-card">
        <h2 className="catalog-card__title"><Link to={`/courses/${course.id}`}>{course.title}</Link></h2>
        <dl className="catalog-card__meta">
          <div><dt>Instructor</dt><dd>{course.instructorName}</dd></div>
          <div><dt>Price</dt><dd>{course.price} {course.currency}</dd></div>
          <div><dt>Total lessons</dt><dd>{course.totalLessonCount}</dd></div>
          <div><dt>Availability</dt><dd>{course.isPublished ? 'Published' : 'Not published'}</dd></div>
        </dl>
      </article>
    </li>
  );
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const query = useMemo(() => parseCatalogQuery(new URLSearchParams(search)), [search]);
  const { requestOptional } = useSession();
  const request = useCallback<CatalogRequester>((options) => requestOptional(options), [requestOptional]);
  const discovery = useCatalogDiscovery(query, request);

  useEffect(() => {
    const canonical = serializeCatalogQuery(query);
    if (canonical !== search) setSearchParams(canonical, { replace: true });
  }, [query, search, setSearchParams]);

  const navigate = useCallback((next: CatalogQuery) => {
    setSearchParams(serializeCatalogQuery(next));
  }, [setSearchParams]);

  const results = discovery.data;
  const announcement = results
    ? `${results.total} ${results.total === 1 ? 'course' : 'courses'} found. Page ${results.page}.`
    : null;

  return (
    <section className="catalog-page" aria-labelledby="catalog-page-title">
      <div className="catalog-page__header">
        <p className="catalog-page__eyebrow">Discover</p>
        <h1 id="catalog-page-title">Course catalog</h1>
        <p>Find a course by topic, instructor, price, or sort order.</p>
      </div>
      <CatalogFilterBar query={query} onApply={navigate} />

      {discovery.status === 'initial-loading' ? (
        <SkeletonGroup className="catalog-page__skeletons" label="Loading course results">
          <Skeleton shape="rect" height={156} />
          <Skeleton shape="rect" height={156} />
          <Skeleton shape="rect" height={156} />
        </SkeletonGroup>
      ) : null}
      {discovery.status === 'refreshing' ? <p className="catalog-page__refresh" role="status">Updating course results…</p> : null}
      {discovery.failure ? (
        <Notice tone="error" title={discovery.failure.title} className="catalog-page__notice">
          <p>{discovery.failure.message}</p>
          <Button variant="secondary" onClick={discovery.retry}>Try again</Button>
        </Notice>
      ) : null}

      {results ? (
        <section className="catalog-page__results" aria-labelledby="catalog-results-title">
          <div className="catalog-page__results-heading">
            <h2 id="catalog-results-title">{results.total} {results.total === 1 ? 'course' : 'courses'} found</h2>
            <p className="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
          </div>
          {results.items.length === 0 ? (
            <Notice tone="info" title="No courses found">Try changing or clearing your filters.</Notice>
          ) : (
            <ul className="catalog-page__list">{results.items.map((course) => <CourseCard key={course.id} course={course} />)}</ul>
          )}
          {results.pages > 0 ? (
            <Pagination
              currentPage={results.page}
              totalPages={results.pages}
              hasNext={results.hasNext}
              hasPrevious={results.hasPrevious}
              label="Course result pages"
              onPageChange={(page) => navigate({ ...query, page })}
            />
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
