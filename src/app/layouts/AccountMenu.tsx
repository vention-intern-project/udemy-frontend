import { useEffect, useId, useRef, useState } from 'react';
import { GraduationCap, LogOut, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { UserProfile, UserRole } from '@entities/user';
import { useSession } from '@features/auth-session';

import styles from './AppShell.module.css';

interface AccountMenuProps {
  user: UserProfile;
}

interface AccountRolePresentation {
  readonly Icon: LucideIcon;
}

const ACCOUNT_ROLE_PRESENTATION: Record<UserRole, AccountRolePresentation> = {
  student: { Icon: GraduationCap },
  instructor: { Icon: UserRound },
  admin: { Icon: ShieldCheck },
};

export function AccountMenu({ user }: AccountMenuProps) {
  const { clearSession } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressNextAccountFocusOpenRef = useRef(false);
  const menuId = `account-menu-${useId()}`;
  const identity = `${user.name} ${user.surname}`;
  const initials =
    `${user.name.trim().charAt(0)}${user.surname.trim().charAt(0)}`.toLocaleUpperCase();
  const RoleIcon = ACCOUNT_ROLE_PRESENTATION[user.role].Icon;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !accountMenuRef.current?.contains(event.target)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPinned(false);
        suppressNextAccountFocusOpenRef.current = true;
        accountTriggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

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
        if (!pinned && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`Account menu for ${identity}`}
        className={[styles.accountInitials, open ? styles.accountInitialsOpen : null]
          .filter(Boolean)
          .join(' ')}
        data-account-initials
        ref={accountTriggerRef}
        type="button"
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setOpen(false);
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
          aria-label={`Account details for ${identity}`}
          className={styles.accountMenuList}
          id={menuId}
          role="group"
        >
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
              <span>{user.role}</span>
            </span>
          </div>
          <div className={styles.accountMenuDivider} role="separator" />
          <button
            className={styles.accountMenuLogout}
            type="button"
            onClick={() => {
              clearSession();
              navigate('/');
            }}
          >
            <LogOut aria-hidden="true" size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
