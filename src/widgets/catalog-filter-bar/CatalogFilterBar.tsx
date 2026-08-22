import { useEffect, useRef, useState, type FocusEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  draftFromCatalogQuery,
  validateCatalogDraft,
  type CatalogFilterValidationErrors,
  type CatalogFilterValidationErrorKey,
  type CatalogPriceField,
  type CatalogPriceRange,
  type CatalogPriceRangeDraft,
  type CatalogQuery,
} from '@features/catalog-discovery';
import { Input, VisuallyHidden } from '@shared/ui/primitives';

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

function validationErrorMessage(
  t: TFunction,
  error: CatalogFilterValidationErrorKey | undefined,
): string | undefined {
  return error ? t(`catalog:${error}`) : undefined;
}

export function CatalogFilterBar({ query, onApply }: CatalogFilterBarProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CatalogPriceRangeDraft>(() =>
    priceDraftFromCatalogQuery(query),
  );
  const [errors, setErrors] = useState<CatalogFilterValidationErrors>({});
  const draftRef = useRef(draft);
  const queryRef = useRef(query);
  const priceRangeRef = useRef<HTMLFieldSetElement | null>(null);
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

  const applyDraft = (draftToApply = draftRef.current) => {
    if (hasInvertedPriceRange(draftToApply)) {
      setErrors({ max_price: 'maximumPriceMustBeAtLeast' });
      return;
    }
    const currentQuery = queryRef.current;
    const validation = validateCatalogDraft({
      search_query: currentQuery.search_query ?? '',
      min_price: draftToApply.min_price,
      max_price: draftToApply.max_price,
      sort: currentQuery.sort,
    });
    setErrors(validation.errors);
    if (!validation.value) return;

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
      return;

    lastAppliedRangeRef.current = nextRange;
    onApply({
      ...validation.value,
      search_query: currentQuery.search_query,
      sort: currentQuery.sort,
    });
  };

  const applyOnBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && priceRangeRef.current?.contains(nextTarget)) return;
    applyDraft({ ...draftRef.current });
  };

  const applyOnEnter = () => {
    applyDraft();
  };
  const minimumError = validationErrorMessage(t, errors.min_price);
  const maximumError = validationErrorMessage(t, errors.max_price);

  return (
    <form
      className={styles.root}
      aria-label={t('catalog:courseFilters', { defaultValue: 'Course filters' })}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        applyDraft();
      }}
    >
      <fieldset ref={priceRangeRef} className={styles.priceRange}>
        <legend className={styles.legend}>
          {t('catalog:priceRange', { defaultValue: 'Price range' })}
        </legend>
        <span
          className={styles.priceLabel}
          data-part="catalog-filter-price-label"
          aria-hidden="true"
        >
          {t('catalog:priceLabel', { defaultValue: 'Price:' })}
        </span>
        <Input
          label={
            <>
              <span>{t('catalog:min', { defaultValue: 'Min' })}</span>
              <VisuallyHidden> {t('catalog:price', { defaultValue: 'price' })}</VisuallyHidden>
            </>
          }
          name="min_price"
          type="number"
          placeholder={t('catalog:minPrice', { defaultValue: 'Min price' })}
          inputMode="decimal"
          min="0"
          fieldClassName={styles.field}
          value={draft.min_price}
          error={minimumError}
          onChange={(event) => update('min_price', event.target.value)}
          onBlur={applyOnBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyOnEnter();
            }
          }}
        />
        <Input
          label={
            <>
              <span>{t('catalog:max', { defaultValue: 'Max' })}</span>
              <VisuallyHidden> {t('catalog:price', { defaultValue: 'price' })}</VisuallyHidden>
            </>
          }
          name="max_price"
          type="number"
          placeholder={t('catalog:maxPrice', { defaultValue: 'Max price' })}
          inputMode="decimal"
          min="0"
          fieldClassName={styles.field}
          value={draft.max_price}
          error={maximumError}
          onChange={(event) => update('max_price', event.target.value)}
          onBlur={applyOnBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyOnEnter();
            }
          }}
        />
      </fieldset>
    </form>
  );
}
