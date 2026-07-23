import { useEffect, useState } from 'react';

import {
  CATALOG_SORT_VALUES, draftFromCatalogQuery, validateCatalogDraft,
  type CatalogFilterDraft, type CatalogQuery,
} from '@features/catalog-discovery';
import { Button, Input, Select } from '@shared/ui/primitives';

import './catalog-filter-bar.css';

const SORT_LABEL: Readonly<Record<(typeof CATALOG_SORT_VALUES)[number], string>> = {
  id: 'ID: low to high',
  '-id': 'ID: high to low',
  title: 'Title: A to Z',
  '-title': 'Title: Z to A',
  price: 'Price: low to high',
  '-price': 'Price: high to low',
  created_at: 'Created: oldest first',
  '-created_at': 'Created: newest first',
};

export function CatalogFilterBar({ query, onApply }: {
  query: CatalogQuery;
  onApply: (next: CatalogQuery) => void;
}) {
  const [draft, setDraft] = useState<CatalogFilterDraft>(() => draftFromCatalogQuery(query));
  const [errors, setErrors] = useState<Partial<Record<'min_price' | 'max_price', string>>>({});

  useEffect(() => {
    setDraft(draftFromCatalogQuery(query));
    setErrors({});
  }, [query]);

  const update = <K extends keyof CatalogFilterDraft>(key: K, value: CatalogFilterDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <form
      className="catalog-filter-bar"
      aria-label="Course filters"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const validation = validateCatalogDraft(draft);
        setErrors(validation.errors);
        if (validation.value) onApply(validation.value);
      }}
    >
      <Input
        label="Search courses"
        name="search_query"
        value={draft.search_query}
        onChange={(event) => update('search_query', event.target.value)}
        placeholder="Search title, description, or instructor first or last name"
      />
      <Input
        label="Minimum price"
        name="min_price"
        type="number"
        inputMode="decimal"
        min="0"
        value={draft.min_price}
        error={errors.min_price}
        onChange={(event) => update('min_price', event.target.value)}
      />
      <Input
        label="Maximum price"
        name="max_price"
        type="number"
        inputMode="decimal"
        min="0"
        value={draft.max_price}
        error={errors.max_price}
        onChange={(event) => update('max_price', event.target.value)}
      />
      <Select
        label="Sort courses"
        name="sort"
        value={draft.sort}
        onChange={(event) => update('sort', event.target.value as CatalogFilterDraft['sort'])}
      >
        {CATALOG_SORT_VALUES.map((sort) => <option key={sort} value={sort}>{SORT_LABEL[sort]}</option>)}
      </Select>
      <div className="catalog-filter-bar__action">
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}
