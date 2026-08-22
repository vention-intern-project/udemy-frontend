import type { HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

function pageItems(currentPage: number, totalPages: number): PageItem[] {
  if (!Number.isSafeInteger(currentPage) || !Number.isSafeInteger(totalPages)) return [1];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const adjacentPages = [currentPage - 1, currentPage, currentPage + 1].filter(
    Number.isSafeInteger,
  );
  const values = new Set([1, totalPages, ...adjacentPages]);
  const pages = Array.from(values)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
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
  label,
  hasNext,
  hasPrevious,
  directionDisplay = 'text',
  className,
  ...props
}: PaginationProps) {
  const { t } = useTranslation();
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
      Number.isSafeInteger(page) &&
      page !== safeCurrent &&
      page >= 1 &&
      (allowBeyondTotal || page <= safeTotal) &&
      (page >= safeCurrent || previousAvailable) &&
      (page <= safeCurrent || nextAvailable)
    ) {
      onPageChange(page);
    }
  };

  const pageAvailable = (page: number) =>
    (page >= safeCurrent || previousAvailable) && (page <= safeCurrent || nextAvailable);
  const visiblePageItems = pageItems(safeCurrent, safeTotal);
  const hasVisibleCurrentPage = visiblePageItems.includes(safeCurrent);
  const directionClassName = [
    styles.button,
    directionDisplay === 'arrows' && styles.direction,
    'ui-pagination__button',
    directionDisplay === 'arrows' && 'ui-pagination__button--direction',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      {...props}
      aria-label={label ?? t('a11y:pagination', { defaultValue: 'Pagination' })}
      className={[styles.pagination, 'ui-pagination', className].filter(Boolean).join(' ')}
    >
      <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
        {t('common:page')} {safeCurrent} {t('common:of')} {safeTotal}
      </VisuallyHidden>
      {previousAvailable && previousTarget !== undefined ? (
        <button
          type="button"
          className={directionClassName}
          onClick={() => changePage(previousTarget, true)}
          aria-label={t('a11y:goToPreviousPage', { defaultValue: 'Go to previous page' })}
        >
          {directionDisplay === 'arrows' ? (
            <ChevronLeft size={20} aria-hidden="true" />
          ) : (
            t('common:previous', { defaultValue: 'Previous' })
          )}
        </button>
      ) : (
        <span
          className={[styles.directionSlot, 'ui-pagination__direction-slot'].join(' ')}
          aria-hidden="true"
        />
      )}
      <div className={[styles.pages, 'ui-pagination__pages'].join(' ')}>
        {visiblePageItems.map((item) =>
          typeof item === 'number' ? (
            item === safeCurrent ? (
              <span
                key={item}
                className={[styles.currentPage, 'ui-pagination__current-page'].join(' ')}
                aria-current="page"
                aria-label={t('a11y:pageCurrentPage', {
                  pageNumber: item,
                  defaultValue: `Page ${item}, current page`,
                })}
              >
                {item}
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={[styles.button, 'ui-pagination__button'].join(' ')}
                aria-label={t('a11y:goToPage', {
                  pageNumber: item,
                  defaultValue: `Go to page ${item}`,
                })}
                disabled={!pageAvailable(item)}
                onClick={() => changePage(item)}
              >
                {item}
              </button>
            )
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
        {!hasVisibleCurrentPage ? (
          <span
            className={[styles.currentPage, 'ui-pagination__current-page'].join(' ')}
            aria-current="page"
            aria-label={t('a11y:pageCurrentPage', {
              pageNumber: safeCurrent,
              defaultValue: `Page ${safeCurrent}, current page`,
            })}
          >
            {safeCurrent}
          </span>
        ) : null}
      </div>
      {nextAvailable && nextTarget !== undefined ? (
        <button
          type="button"
          className={directionClassName}
          onClick={() => changePage(nextTarget, true)}
          aria-label={t('a11y:goToNextPage', { defaultValue: 'Go to next page' })}
        >
          {directionDisplay === 'arrows' ? (
            <ChevronRight size={20} aria-hidden="true" />
          ) : (
            t('common:next', { defaultValue: 'Next' })
          )}
        </button>
      ) : (
        <span
          className={[styles.directionSlot, 'ui-pagination__direction-slot'].join(' ')}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
