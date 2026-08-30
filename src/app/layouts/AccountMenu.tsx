import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { UserProfile, UserRole } from '@entities/user';
import { useSession } from '@features/auth-session';
import { NATIVE_LOCALE_METADATA, SUPPORTED_LOCALES, useLocale } from '@shared/locale';

import styles from './AppShell.module.css';

interface AccountMenuProps {
  user: UserProfile;
  showLanguage?: boolean;
}

interface AccountRolePresentation {
  readonly Icon: LucideIcon;
  readonly labelKey: AccountRoleTranslationKey;
}

type AccountRoleTranslationKey = 'auth:student' | 'course:instructor' | 'auth:admin';

const ACCOUNT_ROLE_PRESENTATION: Record<UserRole, AccountRolePresentation> = {
  student: { Icon: GraduationCap, labelKey: 'auth:student' },
  instructor: { Icon: UserRound, labelKey: 'course:instructor' },
  admin: { Icon: ShieldCheck, labelKey: 'auth:admin' },
};

export function AccountMenu({ user, showLanguage = false }: AccountMenuProps) {
  const { clearSession } = useSession();
  const { t } = useTranslation();
  const { clearStoredLocale, locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [languageView, setLanguageView] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountDetailsRef = useRef<HTMLDivElement>(null);
  const languageBackRef = useRef<HTMLButtonElement>(null);
  const languageRowRef = useRef<HTMLButtonElement>(null);
  const pendingLanguageFocusRef = useRef<'back' | 'language' | null>(null);
  const suppressNextAccountFocusOpenRef = useRef(false);
  const menuId = `account-menu-${useId()}`;
  const identity = `${user.name} ${user.surname}`;
  const initials =
    `${user.name.trim().charAt(0)}${user.surname.trim().charAt(0)}`.toLocaleUpperCase();
  const rolePresentation = ACCOUNT_ROLE_PRESENTATION[user.role];
  const RoleIcon = rolePresentation.Icon;
  const dismissAccountMenu = useCallback(() => {
    setOpen(false);
    setPinned(false);
    setLanguageView(false);
    pendingLanguageFocusRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;

    const restoreAccountTriggerFocus = () => {
      suppressNextAccountFocusOpenRef.current = true;
      accountTriggerRef.current?.focus({ preventScroll: true });
    };
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !accountMenuRef.current?.contains(event.target)) {
        dismissAccountMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissAccountMenu();
        restoreAccountTriggerFocus();
      }
    };
    const closeOnScroll = () => {
      const shouldRestoreTriggerFocus =
        document.activeElement instanceof Node &&
        Boolean(accountDetailsRef.current?.contains(document.activeElement));
      dismissAccountMenu();
      if (shouldRestoreTriggerFocus) restoreAccountTriggerFocus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }, [dismissAccountMenu, open]);

  useEffect(() => {
    const focusTarget = pendingLanguageFocusRef.current;
    if (!open || focusTarget === null) return;

    const target = focusTarget === 'back' ? languageBackRef.current : languageRowRef.current;
    target?.focus({ preventScroll: true });
    pendingLanguageFocusRef.current = null;
  }, [languageView, open]);

  return (
    <div
      ref={accountMenuRef}
      className={[styles.accountMenu, open ? styles.accountMenuOpen : null]
        .filter(Boolean)
        .join(' ')}
      onFocus={() => {
        if (suppressNextAccountFocusOpenRef.current) {
          suppressNextAccountFocusOpenRef.current = false;
          return;
        }
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!pinned && !event.currentTarget.contains(event.relatedTarget)) dismissAccountMenu();
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) dismissAccountMenu();
      }}
    >
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-label={t('a11y:accountMenu', { identity })}
        className={[styles.accountInitials, open ? styles.accountInitialsOpen : null]
          .filter(Boolean)
          .join(' ')}
        data-account-initials
        ref={accountTriggerRef}
        type="button"
        onClick={() => {
          if (pinned) {
            dismissAccountMenu();
            return;
          }
          setPinned(true);
          setOpen(true);
        }}
      >
        {initials}
      </button>
      {open ? (
        <div
          ref={accountDetailsRef}
          aria-label={t('a11y:accountDetails', { identity })}
          className={styles.accountMenuList}
          id={menuId}
          role="group"
        >
          {showLanguage && languageView ? (
            <div className={styles.accountLanguageView} data-part="account-language-view">
              <button
                className={styles.accountMenuLanguage}
                ref={languageBackRef}
                type="button"
                onClick={() => {
                  pendingLanguageFocusRef.current = 'language';
                  setLanguageView(false);
                }}
              >
                <ArrowLeft aria-hidden="true" size={16} />
                <span>{t('common:back')}</span>
              </button>
              <span className={styles.accountLanguageTitle}>{t('common:language')}</span>
              {SUPPORTED_LOCALES.map((candidate) => {
                const selected = candidate === locale;
                return (
                  <button
                    key={candidate}
                    aria-pressed={selected}
                    className={[
                      styles.accountMenuLanguage,
                      selected ? styles.accountMenuLanguageSelected : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    onClick={() => {
                      setLocale(candidate);
                      pendingLanguageFocusRef.current = 'language';
                      setLanguageView(false);
                    }}
                  >
                    <span>{NATIVE_LOCALE_METADATA[candidate].nativeLabel}</span>
                    {selected ? <Check aria-label={t('common:selected')} size={16} /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className={styles.accountMenuProfile} data-part="account-menu-profile">
                <span className={styles.accountMenuAvatar} aria-hidden="true">
                  {initials}
                </span>
                <span className={styles.accountMenuDetails}>
                  <span className={styles.accountMenuName}>{identity}</span>
                  <span className={styles.accountMenuEmail}>{user.email}</span>
                </span>
                <span className={styles.accountMenuRole}>
                  <RoleIcon data-part="account-menu-role-icon" aria-hidden="true" size={16} />
                  <span>{t(rolePresentation.labelKey)}</span>
                </span>
              </div>
              <div className={styles.accountMenuDivider} role="separator" />
              {showLanguage ? (
                <button
                  className={styles.accountMenuLanguage}
                  ref={languageRowRef}
                  type="button"
                  onClick={() => {
                    pendingLanguageFocusRef.current = 'back';
                    setLanguageView(true);
                  }}
                >
                  <span>{t('common:language')}</span>
                  <span className={styles.accountMenuLanguageValue}>
                    {NATIVE_LOCALE_METADATA[locale].code}
                  </span>
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              ) : null}
              <button
                className={styles.accountMenuLogout}
                type="button"
                onClick={() => {
                  clearStoredLocale();
                  clearSession();
                  navigate('/');
                }}
              >
                <LogOut aria-hidden="true" size={16} />
                {t('auth:logOut')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
