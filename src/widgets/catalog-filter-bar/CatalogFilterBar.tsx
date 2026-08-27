import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  draftFromCatalogQuery,
  validateCatalogDraft,
  type CatalogFilterValidationErrors,
  type CatalogPriceField,
  type CatalogPriceRange,
  type CatalogPriceRangeDraft,
  type CatalogQuery,
} from '@features/catalog-discovery';
import { Button, Input, VisuallyHidden } from '@shared/ui/primitives';

import styles from './CatalogFilterBar.module.css';

interface CatalogFilterBarProps {
  query: CatalogQuery;
  onApply: (next: CatalogQuery) => void;
}

function priceDraftFromCatalogQuery(query: CatalogQuery): CatalogPriceRangeDraft {
  const draft = draftFromCatalogQuery(query);
  return { min_price: draft.min_price, max_price: draft.max_price };
}

function priceRangeMatches(left: CatalogPriceRange, right: CatalogPriceRange): boolean {
  return left.min_price === right.min_price && left.max_price === right.max_price;
}

function hasInvertedPriceRange(draft: CatalogPriceRangeDraft): boolean {
  if (draft.min_price.trim() === '' || draft.max_price.trim() === '') return false;
  const minimum = Number(draft.min_price);
  const maximum = Number(draft.max_price);
  return (
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    minimum >= 0 &&
    maximum >= 0 &&
    maximum < minimum
  );
}

export function CatalogFilterBar({ query, onApply }: CatalogFilterBarProps) {
  const { t } = useTranslation();
  const rangeDescriptionId = `catalog-price-range-description-${useId()}`;
  const [draft, setDraft] = useState<CatalogPriceRangeDraft>(() =>
    priceDraftFromCatalogQuery(query),
  );
  const [errors, setErrors] = useState<CatalogFilterValidationErrors>({});
  const [open, setOpen] = useState(false);
  const draftRef = useRef(draft);
  const queryRef = useRef(query);
  const rootRef = useRef<HTMLFormElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const lastAppliedRangeRef = useRef<CatalogPriceRange>({
    min_price: query.min_price,
    max_price: query.max_price,
  });

  draftRef.current = draft;
  queryRef.current = query;

  useEffect(() => {
    setDraft(priceDraftFromCatalogQuery(query));
    setErrors({});
    lastAppliedRangeRef.current = { min_price: query.min_price, max_price: query.max_price };
  }, [query]);

  const update = (key: CatalogPriceField, value: string) => {
    const next = { ...draftRef.current, [key]: value };
    draftRef.current = next;
    setDraft(next);
  };

  const applyDraft = (draftToApply = draftRef.current): boolean => {
    if (hasInvertedPriceRange(draftToApply)) {
      setErrors({ max_price: 'maximumPriceMustBeAtLeast' });
      return false;
    }
    const currentQuery = queryRef.current;
    const validation = validateCatalogDraft({
      search_query: currentQuery.search_query ?? '',
      min_price: draftToApply.min_price,
      max_price: draftToApply.max_price,
      sort: currentQuery.sort,
    });
    setErrors(validation.errors);
    if (!validation.value) return false;

    const nextRange: CatalogPriceRange = {
      min_price: validation.value.min_price,
      max_price: validation.value.max_price,
    };
    const currentRange: CatalogPriceRange = {
      min_price: currentQuery.min_price,
      max_price: currentQuery.max_price,
    };
    if (
      priceRangeMatches(nextRange, currentRange) ||
      priceRangeMatches(nextRange, lastAppliedRangeRef.current)
    )
      return true;

    lastAppliedRangeRef.current = nextRange;
    onApply({
      ...validation.value,
      search_query: currentQuery.search_query,
      sort: currentQuery.sort,
    });
    return true;
  };
  const close = (restoreApplied = false) => {
    if (restoreApplied) {
      const restored = priceDraftFromCatalogQuery(queryRef.current);
      draftRef.current = restored;
      setDraft(restored);
      setErrors({});
    }
    setOpen(false);
    globalThis.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  useEffect(() => {
    if (!open) return undefined;
    const cancel = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(true);
    };
    document.addEventListener('pointerdown', cancel, true);
    return () => document.removeEventListener('pointerdown', cancel, true);
  }, [open]);
  const minimumError =
    errors.min_price === 'nonNegativePrice' ? t('catalog:nonNegativePrice') : undefined;
  const maximumError =
    errors.max_price === 'nonNegativePrice'
      ? t('catalog:nonNegativePrice')
      : errors.max_price === 'maximumPriceMustBeAtLeast'
        ? t('catalog:maximumPriceMustBeAtLeast')
        : undefined;
  const appliedRangeDescription = [
    query.min_price === undefined
      ? null
      : `${t('catalog:priceFrom', { defaultValue: 'From' })}: ${query.min_price}`,
    query.max_price === undefined
      ? null
      : `${t('catalog:priceTo', { defaultValue: 'To' })}: ${query.max_price}`,
  ]
    .filter((description): description is string => description !== null)
    .join(', ');

  return (
    <form
      ref={rootRef}
      className={styles.root}
      data-part="catalog-filter-form"
      aria-label={t('catalog:courseFilters', { defaultValue: 'Course filters' })}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (applyDraft()) close();
      }}
    >
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        data-part="catalog-price-trigger"
        type="button"
        aria-describedby={appliedRangeDescription ? rangeDescriptionId : undefined}
        aria-expanded={open}
        aria-controls={open ? 'catalog-price-disclosure' : undefined}
        onClick={() => {
          if (open) close(true);
          else setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
          }
        }}
      >
        <span>{t('catalog:priceTrigger', { defaultValue: 'Price' })}</span>
        <span className={styles.chevron} data-part="catalog-price-chevron" aria-hidden="true" />
      </button>
      {appliedRangeDescription ? (
        <VisuallyHidden id={rangeDescriptionId}>{appliedRangeDescription}</VisuallyHidden>
      ) : null}
      {open ? (
        <fieldset
          id="catalog-price-disclosure"
          className={styles.priceRange}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            }
          }}
        >
          <legend className={styles.legend}>
            {t('catalog:priceRange', { defaultValue: 'Price range' })}
          </legend>
          <Input
            label={t('catalog:priceFrom', { defaultValue: 'From' })}
            name="min_price"
            type="number"
            inputMode="decimal"
            min="0"
            fieldClassName={styles.field}
            value={draft.min_price}
            error={minimumError}
            onChange={(event) => update('min_price', event.target.value)}
          />
          <Input
            label={t('catalog:priceTo', { defaultValue: 'To' })}
            name="max_price"
            type="number"
            inputMode="decimal"
            min="0"
            fieldClassName={styles.field}
            value={draft.max_price}
            error={maximumError}
            onChange={(event) => update('max_price', event.target.value)}
          />
          <Button type="submit">{t('catalog:priceDone', { defaultValue: 'Done' })}</Button>
        </fieldset>
      ) : null}
    </form>
  );
}
