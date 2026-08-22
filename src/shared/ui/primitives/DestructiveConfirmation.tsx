import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from './Button';
import { Dialog, DialogActions } from './Dialog';
import { Notice } from './Notice';

export interface DestructiveConfirmationProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
  pendingLabel?: ReactNode;
  error?: ReactNode;
  cancelLabel?: ReactNode;
}

export function DestructiveConfirmation({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  confirming = false,
  pendingLabel,
  error,
  cancelLabel,
}: DestructiveConfirmationProps) {
  const { t } = useTranslation();
  const errorId = `destructive-confirmation-error-${useId()}`;
  const showError = Boolean(error) && !confirming;

  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      busy={confirming}
      showCloseButton={false}
    >
      {showError ? (
        <Notice
          id={errorId}
          tone="error"
          title={t('common:unableToCompleteAction', { defaultValue: 'Unable to complete action' })}
        >
          {error}
        </Notice>
      ) : null}
      <DialogActions>
        <Button variant="secondary" onClick={onCancel} disabled={confirming}>
          {cancelLabel ?? t('common:cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button
          variant="destructive"
          state={confirming ? 'loading' : error ? 'error' : 'idle'}
          loadingLabel={pendingLabel ?? t('common:working', { defaultValue: 'Working...' })}
          statusMessage={
            confirming
              ? (pendingLabel ?? t('common:working', { defaultValue: 'Working...' }))
              : undefined
          }
          announceStatus={!showError}
          aria-describedby={showError ? errorId : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
