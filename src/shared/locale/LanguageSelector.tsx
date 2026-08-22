import { Check, ChevronDown, Globe2 } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { NATIVE_LOCALE_METADATA } from './metadata';
import { SUPPORTED_LOCALES } from './types';
import { useLocale } from './LocaleProvider';

export interface LanguageSelectorProps {
  readonly className: string;
  readonly menuClassName: string;
  readonly optionClassName: string;
  readonly selectedOptionClassName: string;
  readonly mobile?: boolean;
}

export function LanguageSelector({
  className,
  menuClassName,
  optionClassName,
  selectedOptionClassName,
  mobile = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = `language-menu-${useId()}`;

  useEffect(() => {
    if (!open) return undefined;
    function dismiss(event: Event) {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && ref.current?.contains(event.target as Node)) return;
      const activeElement = document.activeElement;
      const restoreTriggerFocus =
        activeElement instanceof HTMLElement && ref.current?.contains(activeElement);
      setOpen(false);
      if (restoreTriggerFocus) triggerRef.current?.focus({ preventScroll: true });
    }
    function dismissOnOutsideFocus(event: FocusEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('focusin', dismissOnOutsideFocus);
    window.addEventListener('scroll', dismiss, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('focusin', dismissOnOutsideFocus);
      window.removeEventListener('scroll', dismiss);
    };
  }, [open]);

  function openFromKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (open || (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Space')) return;
    event.preventDefault();
    setOpen(true);
  }

  return (
    <div className={className} ref={ref}>
      <button
        ref={triggerRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={t('navigation:changeLanguage')}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={openFromKeyboard}
      >
        {mobile ? (
          <Globe2 aria-hidden="true" size={20} strokeWidth={1.75} />
        ) : (
          <>
            <span>{NATIVE_LOCALE_METADATA[locale].code}</span>
            <ChevronDown
              aria-hidden="true"
              data-language-selector-chevron
              size={16}
              strokeWidth={1.75}
            />
          </>
        )}
      </button>
      {open ? (
        <div className={menuClassName} id={menuId} aria-label={t('navigation:languageMenu')}>
          {SUPPORTED_LOCALES.map((candidate) => {
            const selected = candidate === locale;
            const label = NATIVE_LOCALE_METADATA[candidate].nativeLabel;
            return (
              <button
                key={candidate}
                aria-pressed={selected}
                className={[optionClassName, selected ? selectedOptionClassName : null]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                onClick={() => {
                  setLocale(candidate);
                  setOpen(false);
                  triggerRef.current?.focus({ preventScroll: true });
                }}
              >
                <span>{label}</span>
                {selected ? <Check aria-label={t('common:selected')} size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
