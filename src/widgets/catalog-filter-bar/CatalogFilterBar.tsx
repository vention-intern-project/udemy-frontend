import { useEffect, useRef, useState } from 'react';

import {
  draftFromCatalogQuery, validateCatalogDraft,
  type CatalogFilterDraft, type CatalogFilterValidation, type CatalogQuery,
} from '@features/catalog-discovery';
import { Input } from '@shared/ui/primitives';

import './catalog-filter-bar.css';

type PriceDraft = Pick<CatalogFilterDraft, 'min_price' | 'max_price'>;
type PriceRange = Pick<CatalogQuery, 'min_price' | 'max_price'>;

interface CatalogFilterBarProps {
  query: CatalogQuery;
  onApply: (next: CatalogQuery) => void;
}

function priceDraftFromCatalogQuery(query: CatalogQuery): PriceDraft {
  const draft = draftFromCatalogQuery(query);
  return { min_price: draft.min_price, max_price: draft.max_price };
}

function priceRangeMatches(left: PriceRange, right: PriceRange): boolean {
  return left.min_price === right.min_price && left.max_price === right.max_price;
}

export function CatalogFilterBar({ query, onApply }: CatalogFilterBarProps) {
  const [draft, setDraft] = useState<PriceDraft>(() => priceDraftFromCatalogQuery(query));
  const [errors, setErrors] = useState<CatalogFilterValidation['errors']>({});
  const draftRef = useRef(draft);
  const queryRef = useRef(query);
  const lastAppliedRangeRef = useRef<PriceRange>({ min_price: query.min_price, max_price: query.max_price });

  draftRef.current = draft;
  queryRef.current = query;

  useEffect(() => {
    setDraft(priceDraftFromCatalogQuery(query));
    setErrors({});
    lastAppliedRangeRef.current = { min_price: query.min_price, max_price: query.max_price };
  }, [query]);

  const update = <K extends keyof PriceDraft>(key: K, value: PriceDraft[K]) => {
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

    const nextRange: PriceRange = {
      min_price: validation.value.min_price,
      max_price: validation.value.max_price,
    };
    const currentRange: PriceRange = {
      min_price: currentQuery.min_price,
      max_price: currentQuery.max_price,
    };
    if (priceRangeMatches(nextRange, currentRange) || priceRangeMatches(nextRange, lastAppliedRangeRef.current)) return;

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
      className="catalog-filter-bar"
      aria-label="Course filters"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        applyDraft();
      }}
    >
      <fieldset className="catalog-filter-bar__price-range">
        <legend className="ui-sr-only">Price range</legend>
        <span className="catalog-filter-bar__legend" aria-hidden="true">Price range:</span>
        <Input
          label={<span className="ui-sr-only">Min price</span>}
          name="min_price"
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Min price"
          fieldClassName="catalog-filter-bar__field"
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
          label={<span className="ui-sr-only">Max price</span>}
          name="max_price"
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Max price"
          fieldClassName="catalog-filter-bar__field"
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
