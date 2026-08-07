import { useEffect, useRef, useState } from 'react';

import {
  draftFromCatalogQuery,
  validateCatalogDraft,
  type CatalogFilterValidationErrors,
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

export function CatalogFilterBar({ query, onApply }: CatalogFilterBarProps) {
  const [draft, setDraft] = useState<CatalogPriceRangeDraft>(() =>
    priceDraftFromCatalogQuery(query),
  );
  const [errors, setErrors] = useState<CatalogFilterValidationErrors>({});
  const draftRef = useRef(draft);
  const queryRef = useRef(query);
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

  const applyOnBlur = () => {
    applyDraft({ ...draftRef.current });
  };

  return (
    <form
      className={styles.root}
      aria-label="Course filters"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        applyDraft();
      }}
    >
      <fieldset className={styles.priceRange}>
        <legend className={styles.legend}>Price range</legend>
        <span
          className={styles.priceLabel}
          data-part="catalog-filter-price-label"
          aria-hidden="true"
        >
          Price:
        </span>
        <Input
          label={
            <>
              <span>Min</span>
              <VisuallyHidden> price</VisuallyHidden>
            </>
          }
          name="min_price"
          type="number"
          placeholder="Min price"
          inputMode="decimal"
          min="0"
          fieldClassName={styles.field}
          value={draft.min_price}
          error={errors.min_price}
          onChange={(event) => update('min_price', event.target.value)}
          onBlur={applyOnBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyDraft();
            }
          }}
        />
        <Input
          label={
            <>
              <span>Max</span>
              <VisuallyHidden> price</VisuallyHidden>
            </>
          }
          name="max_price"
          type="number"
          placeholder="Max price"
          inputMode="decimal"
          min="0"
          fieldClassName={styles.field}
          value={draft.max_price}
          error={errors.max_price}
          onChange={(event) => update('max_price', event.target.value)}
          onBlur={applyOnBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyDraft();
            }
          }}
        />
      </fieldset>
    </form>
  );
}
