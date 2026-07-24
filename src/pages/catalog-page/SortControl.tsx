import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { CATALOG_SORT_VALUES, type CatalogSort } from '@features/catalog-discovery';

const SORT_LABEL: Readonly<Record<CatalogSort, string>> = {
  created_at: 'Oldest',
  '-created_at': 'Newest',
  price: 'Low to High',
  '-price': 'High to Low',
  title: 'A to Z',
  '-title': 'Z to A',
};

interface SortControlProps {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusListboxRef = useRef(false);
  const finePointerHoverRef = useRef(false);
  const activeIndexRef = useRef<number | null>(null);
  const listboxId = `catalog-sort-options-${useId()}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const selectedIndex = Math.max(0, CATALOG_SORT_VALUES.indexOf(value));
  const activeOptionId = activeIndex === null ? undefined : `${listboxId}-option-${activeIndex}`;

  const setActive = useCallback((index: number | null) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);
  const close = useCallback((restoreFocus = false) => {
    focusListboxRef.current = false;
    setOpen(false);
    setActive(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, [setActive]);
  const openList = useCallback((index = selectedIndex, focusListbox = false) => {
    focusListboxRef.current = focusListbox;
    setActive(index);
    setOpen(true);
  }, [selectedIndex, setActive]);

  useEffect(() => { close(); }, [close, value]);
  const setListboxRef = useCallback((element: HTMLDivElement | null) => {
    if (element && focusListboxRef.current) {
      focusListboxRef.current = false;
      element.focus();
    }
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [close, open]);
  const select = useCallback((index: number) => {
    const sort = CATALOG_SORT_VALUES[index];
    if (!sort) return;
    close();
    onChange(sort);
  }, [close, onChange]);
  const supportsFinePointerHover = (pointerType: string) => pointerType === 'mouse'
    && (typeof window.matchMedia !== 'function' || window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  return (
    <div
      ref={rootRef}
      className={['catalog-page__sort-control', open && 'catalog-page__sort-control--open'].filter(Boolean).join(' ')}
      onPointerEnter={(event) => {
        finePointerHoverRef.current = supportsFinePointerHover(event.pointerType);
        if (finePointerHoverRef.current) openList(selectedIndex);
      }}
      onPointerLeave={() => {
        if (finePointerHoverRef.current) close();
        finePointerHoverRef.current = false;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={triggerRef}
        className="catalog-page__sort-trigger"
        type="button"
        aria-label={`Sort by: ${SORT_LABEL[value]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (finePointerHoverRef.current) {
            if (!open) openList(selectedIndex);
            return;
          }
          if (open) close();
          else openList(selectedIndex, true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openList(selectedIndex, true);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openList(Math.min(selectedIndex + 1, CATALOG_SORT_VALUES.length - 1), true);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            openList(Math.max(selectedIndex - 1, 0), true);
          }
        }}
      >
        <span>{SORT_LABEL[value]}</span>
        <span className="catalog-page__sort-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={setListboxRef}
          className="catalog-page__sort-listbox"
          id={listboxId}
          role="listbox"
          aria-label="Sort by options"
          tabIndex={-1}
          aria-activedescendant={activeOptionId}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive(Math.min((activeIndexRef.current ?? selectedIndex) + 1, CATALOG_SORT_VALUES.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(Math.max((activeIndexRef.current ?? selectedIndex) - 1, 0));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActive(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActive(CATALOG_SORT_VALUES.length - 1);
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (activeIndexRef.current !== null) select(activeIndexRef.current);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            } else if (event.key === 'Tab') {
              close();
            }
          }}
        >
          {CATALOG_SORT_VALUES.map((sort, index) => (
            <div
              key={sort}
              id={`${listboxId}-option-${index}`}
              className={['catalog-page__sort-option', activeIndex === index && 'catalog-page__sort-option--active'].filter(Boolean).join(' ')}
              role="option"
              aria-selected={value === sort}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => select(index)}
            >
              <span className="catalog-page__sort-radio" aria-hidden="true" />
              {SORT_LABEL[sort]}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
