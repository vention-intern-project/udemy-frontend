import type { CSSProperties, HTMLAttributes } from 'react';

import styles from './Pagination.module.css';
import { VisuallyHidden } from './VisuallyHidden';

type PaginationDirectionDisplay = 'text' | 'arrows';

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
  hasNext?: boolean;
  hasPrevious?: boolean;
  directionDisplay?: PaginationDirectionDisplay;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

const currentPageStyle = {
  color: 'var(--action-primary-fg)',
  background: 'var(--action-primary-bg)',
  borderColor: 'var(--action-primary-bg)',
  cursor: 'default',
} satisfies CSSProperties;

function pageItems(currentPage: number, totalPages: number): PageItem[] {
  if (!Number.isSafeInteger(currentPage) || !Number.isSafeInteger(totalPages)) return [1];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const adjacentPages = [currentPage - 1, currentPage, currentPage + 1]
    .filter(Number.isSafeInteger);
  const values = new Set([1, totalPages, ...adjacentPages]);
  const pages = Array.from(values).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result: PageItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      result.push(index === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    result.push(page);
  });
  return result;
}

function positiveSafeInteger(value: number): number | undefined {
  return Number.isSafeInteger(value) && value >= 1 ? value : undefined;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label = 'Pagination',
  hasNext,
  hasPrevious,
  directionDisplay = 'text',
  className,
  ...props
}: PaginationProps) {
  const safeTotal = positiveSafeInteger(totalPages) ?? 1;
  const positiveCurrent = positiveSafeInteger(currentPage) ?? 1;
  const usesServerAvailability = hasNext !== undefined || hasPrevious !== undefined;
  const safeCurrent = usesServerAvailability
    ? positiveCurrent
    : Math.min(positiveCurrent, safeTotal);
  const previousTarget = positiveSafeInteger(safeCurrent - 1);
  const nextTarget = positiveSafeInteger(safeCurrent + 1);
  const previousAvailable = previousTarget !== undefined && (hasPrevious ?? safeCurrent !== 1);
  const nextAvailable = nextTarget !== undefined && (hasNext ?? safeCurrent !== safeTotal);

  const changePage = (page: number, allowBeyondTotal = false) => {
    if (
      Number.isSafeInteger(page)
      && page !== safeCurrent
      && page >= 1
      && (allowBeyondTotal || page <= safeTotal)
      && (page >= safeCurrent || previousAvailable)
      && (page <= safeCurrent || nextAvailable)
    ) {
      onPageChange(page);
    }
  };

  const pageAvailable = (page: number) => (
    (page >= safeCurrent || previousAvailable)
    && (page <= safeCurrent || nextAvailable)
  );

  return (
    <nav
      {...props}
      aria-label={label}
      className={[styles.pagination, 'ui-pagination', className].filter(Boolean).join(' ')}
    >
      <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
        Page {safeCurrent} of {safeTotal}
      </VisuallyHidden>
      <button
        type="button"
        className={[
          styles.button,
          directionDisplay === 'arrows' && styles.direction,
          'ui-pagination__button',
          directionDisplay === 'arrows' && 'ui-pagination__button--direction',
        ].filter(Boolean).join(' ')}
        disabled={!previousAvailable}
        onClick={() => {
          if (previousAvailable && previousTarget !== undefined) changePage(previousTarget, true);
        }}
        aria-label="Go to previous page"
      >
        {directionDisplay === 'arrows' ? <span aria-hidden="true">&lt;</span> : 'Previous'}
      </button>
      <div className={[styles.pages, 'ui-pagination__pages'].join(' ')}>
        {pageItems(safeCurrent, safeTotal).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={[styles.button, 'ui-pagination__button'].join(' ')}
              aria-label={`Go to page ${item}`}
              aria-current={item === safeCurrent ? 'page' : undefined}
              disabled={item === safeCurrent || !pageAvailable(item)}
              style={item === safeCurrent ? currentPageStyle : undefined}
              onClick={() => changePage(item)}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              className={[styles.ellipsis, 'ui-pagination__ellipsis'].join(' ')}
              aria-hidden="true"
            >
              …
            </span>
          ),
        )}
      </div>
      <button
        type="button"
        className={[
          styles.button,
          directionDisplay === 'arrows' && styles.direction,
          'ui-pagination__button',
          directionDisplay === 'arrows' && 'ui-pagination__button--direction',
        ].filter(Boolean).join(' ')}
        disabled={!nextAvailable}
        onClick={() => {
          if (nextAvailable && nextTarget !== undefined) changePage(nextTarget, true);
        }}
        aria-label="Go to next page"
      >
        {directionDisplay === 'arrows' ? <span aria-hidden="true">&gt;</span> : 'Next'}
      </button>
    </nav>
  );
}
