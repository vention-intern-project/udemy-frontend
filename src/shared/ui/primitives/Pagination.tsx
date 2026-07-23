import type { HTMLAttributes } from 'react';

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

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
  className,
  ...props
}: PaginationProps) {
  const safeTotal = positiveSafeInteger(totalPages) ?? 1;
  const safeCurrent = Math.min(positiveSafeInteger(currentPage) ?? 1, safeTotal);
  const previousAvailable = hasPrevious ?? safeCurrent !== 1;
  const nextAvailable = hasNext ?? safeCurrent !== safeTotal;

  const changePage = (page: number) => {
    if (
      Number.isSafeInteger(page)
      && page !== safeCurrent
      && page >= 1
      && page <= safeTotal
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
    <nav {...props} aria-label={label} className={['ui-pagination', className].filter(Boolean).join(' ')}>
      <span className="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">
        Page {safeCurrent} of {safeTotal}
      </span>
      <button
        type="button"
        className="ui-pagination__button"
        disabled={!previousAvailable}
        onClick={() => { if (previousAvailable) changePage(safeCurrent - 1); }}
        aria-label="Go to previous page"
      >
        Previous
      </button>
      <div className="ui-pagination__pages">
        {pageItems(safeCurrent, safeTotal).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className="ui-pagination__button"
              aria-label={`Go to page ${item}`}
              aria-current={item === safeCurrent ? 'page' : undefined}
              disabled={!pageAvailable(item)}
              onClick={() => changePage(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="ui-pagination__ellipsis" aria-hidden="true">…</span>
          ),
        )}
      </div>
      <button
        type="button"
        className="ui-pagination__button"
        disabled={!nextAvailable}
        onClick={() => { if (nextAvailable) changePage(safeCurrent + 1); }}
        aria-label="Go to next page"
      >
        Next
      </button>
    </nav>
  );
}
