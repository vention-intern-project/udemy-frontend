import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  DestructiveConfirmation,
  Notice,
  Pagination,
  Skeleton,
  SkeletonGroup,
  Textarea,
} from '@shared/ui/primitives';

import { useCourseReviews } from './useCourseReviews';
import styles from './CourseReviews.module.css';

export interface CourseReviewsProps {
  readonly courseId: number;
}

function validRating(value: number): value is 1 | 2 | 3 | 4 | 5 {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function CourseReviews({ courseId }: CourseReviewsProps) {
  const { t } = useTranslation();
  const reviews = useCourseReviews(courseId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [focusReviewsAfterDelete, setFocusReviewsAfterDelete] = useState(false);
  const currentReview = reviews.current.data;
  const hasCurrentReview = reviews.current.isSuccess;
  const isEditing = reviews.hasOwnedReview;
  const mutation = isEditing ? reviews.update : reviews.create;
  useEffect(() => {
    if (hasCurrentReview) {
      setRating(currentReview?.rating ?? 5);
      setComment(currentReview?.comment ?? '');
    } else if (reviews.noOwnedReview) {
      setRating(5);
      setComment('');
    }
  }, [currentReview, hasCurrentReview, reviews.noOwnedReview]);
  useEffect(() => {
    if (confirmDelete || !focusReviewsAfterDelete) return;

    headingRef.current?.focus();
    setFocusReviewsAfterDelete(false);
  }, [confirmDelete, focusReviewsAfterDelete]);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validRating(rating)) return;
    const body = { rating, comment: comment.trim() || null };
    if (isEditing) mutation.mutate(body);
    else reviews.create.mutate(body);
  };
  const mutationError = mutation.error ? t('common:pleaseTryAgain') : null;
  return (
    <section className={styles.section} aria-labelledby="course-reviews-heading">
      <h2 ref={headingRef} id="course-reviews-heading" tabIndex={-1}>
        {t('course:reviewsHeading')}
      </h2>
      {reviews.list.isPending ? (
        <SkeletonGroup label={t('common:loading')}>
          <Skeleton height="80px" shape="rect" />
        </SkeletonGroup>
      ) : null}
      {reviews.list.isError ? (
        <Notice tone="error" title={t('course:reviewsLoadFailed')}>
          <Button
            variant="secondary"
            aria-label={t('course:reviewsHeading')}
            onClick={() => void reviews.list.refetch()}
          >
            {t('routes:tryAgain')}
          </Button>
        </Notice>
      ) : null}
      {reviews.list.data?.items.length === 0 ? <p>{t('course:noReviews')}</p> : null}
      {reviews.list.data?.items.map((review) => (
        <article className={styles.review} key={review.id}>
          <p>{review.comment}</p>
          <data value={review.rating ?? 0}>{review.rating}/5</data>
        </article>
      ))}
      {reviews.list.data && reviews.list.data.pages > 1 ? (
        <Pagination
          currentPage={reviews.list.data.page}
          totalPages={reviews.list.data.pages}
          hasNext={reviews.list.data.has_next}
          hasPrevious={reviews.list.data.has_previous}
          onPageChange={reviews.setPage}
        />
      ) : null}
      {reviews.current.isSuccess || reviews.noOwnedReview ? (
        <form className={styles.form} onSubmit={submit}>
          <h3>{isEditing ? t('course:editReview') : t('course:writeReview')}</h3>
          <label>
            {t('course:ratingLabel')}
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Textarea
            label={t('course:commentLabel')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          {mutationError ? (
            <Notice tone="error" title={t('common:unableToCompleteAction')}>
              {mutationError}
            </Notice>
          ) : null}
          <div className={styles.actions}>
            <Button type="submit" state={mutation.isPending ? 'loading' : 'idle'}>
              {t('course:saveReview')}
            </Button>
            {isEditing ? (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                {t('course:deleteReview')}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
      <DestructiveConfirmation
        open={confirmDelete}
        title={t('course:deleteReviewTitle')}
        description={t('course:deleteReviewDescription')}
        confirmLabel={t('course:deleteReview')}
        confirming={reviews.remove.isPending}
        error={reviews.remove.error ? t('common:pleaseTryAgain') : undefined}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          reviews.remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false);
              setFocusReviewsAfterDelete(true);
            },
          })
        }
      />
    </section>
  );
}
