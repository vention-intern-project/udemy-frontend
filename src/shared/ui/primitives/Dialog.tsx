import {
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import {
  focusFirst,
  getFocusableElements,
  isTabbableElement,
} from '../../accessibility/focus';

interface DialogOwner {
  id: symbol;
  dialog: HTMLElement;
  invoker: HTMLElement | null;
}

const dialogOwners: DialogOwner[] = [];
let bodyOverflowBeforeDialogs: string | undefined;

function registerDialog(owner: DialogOwner) {
  if (dialogOwners.length === 0) {
    bodyOverflowBeforeDialogs = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  dialogOwners.push(owner);
}

function isTopmostDialog(id: symbol): boolean {
  return dialogOwners[dialogOwners.length - 1]?.id === id;
}

function unregisterDialog(id: symbol): { wasTopmost: boolean; nextTopmost?: DialogOwner } {
  const ownerIndex = dialogOwners.findIndex((owner) => owner.id === id);
  const wasTopmost = ownerIndex >= 0 && ownerIndex === dialogOwners.length - 1;

  if (ownerIndex >= 0) dialogOwners.splice(ownerIndex, 1);
  if (ownerIndex >= 0 && dialogOwners.length === 0) {
    document.body.style.overflow = bodyOverflowBeforeDialogs ?? '';
    bodyOverflowBeforeDialogs = undefined;
  }

  return { wasTopmost, nextTopmost: dialogOwners[dialogOwners.length - 1] };
}

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  closeLabel?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  busy?: boolean;
  className?: string;
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  initialFocusRef,
  closeLabel = 'Close dialog',
  showCloseButton = true,
  closeOnBackdrop = true,
  busy = false,
  className,
}: DialogProps) {
  const generatedId = useId();
  const titleId = `dialog-title-${generatedId}`;
  const descriptionId = description ? `dialog-description-${generatedId}` : undefined;
  const dialogRef = useRef<HTMLDivElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const ownerIdRef = useRef(Symbol('dialog-owner'));

  useLayoutEffect(() => {
    if (!open) return undefined;

    const ownerId = ownerIdRef.current;
    invokerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    if (dialog) {
      registerDialog({
        id: ownerId,
        dialog,
        invoker: invokerRef.current,
      });
      const initial = initialFocusRef?.current;
      if (initial && dialog.contains(initial) && isTabbableElement(initial, dialog)) initial.focus();
      else focusFirst(dialog);
    }

    return () => {
      const { wasTopmost, nextTopmost } = unregisterDialog(ownerId);
      if (!wasTopmost) return;

      if (invokerRef.current?.isConnected) {
        invokerRef.current.focus();
      } else if (nextTopmost?.dialog.isConnected) {
        focusFirst(nextTopmost.dialog);
      }
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isTopmostDialog(ownerIdRef.current)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && (activeIndex <= 0)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target === event.currentTarget
      && isTopmostDialog(ownerIdRef.current)
      && closeOnBackdrop
      && !busy
    ) {
      onClose();
    }
  };

  return (
    <div className="ui-dialog-backdrop" onMouseDown={handleBackdrop}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy || undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={['ui-dialog', className].filter(Boolean).join(' ')}
      >
        <div className="ui-dialog__header">
          <h2 className="ui-dialog__title" id={titleId}>{title}</h2>
          {showCloseButton ? (
            <button
              className="ui-dialog__close"
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
              disabled={busy}
            >
              ×
            </button>
          ) : null}
        </div>
        {description ? <div className="ui-dialog__description" id={descriptionId}>{description}</div> : null}
        <div className="ui-dialog__body">{children}</div>
      </div>
    </div>
  );
}
