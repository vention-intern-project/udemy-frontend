import { useId, type ReactNode } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Notice';

export interface DestructiveConfirmationProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
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
  error,
  cancelLabel = 'Cancel',
}: DestructiveConfirmationProps) {
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
        <Notice id={errorId} tone="error" title="Unable to complete action">{error}</Notice>
      ) : null}
      <div className="ui-dialog__actions">
        <Button variant="secondary" onClick={onCancel} disabled={confirming}>
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          state={confirming ? 'loading' : error ? 'error' : 'idle'}
          loadingLabel="Deleting…"
          statusMessage={confirming ? 'Destructive action in progress' : undefined}
          announceStatus={!showError}
          aria-describedby={showError ? errorId : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
