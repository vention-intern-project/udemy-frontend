import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '../../../src/shared/ui/tokens/tokens.css';
import {
  Button,
  DestructiveConfirmation,
  Dialog,
  Input,
  Notice,
  Pagination,
  Select,
  Skeleton,
  SkeletonGroup,
  Textarea,
} from '../../../src/shared/ui/primitives';

import './styles.css';

function PrimitivesHarness() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string>();
  const [page, setPage] = useState(2);

  const confirmDestructiveAction = () => {
    setConfirmationPending(true);
    setConfirmationError(undefined);
    window.setTimeout(() => {
      setConfirmationPending(false);
      setConfirmationError('Demo failure: the item was not deleted.');
    }, 700);
  };

  return (
    <main className="harness-shell">
      <header className="harness-header">
        <p className="harness-eyebrow">Browser accessibility verification</p>
        <h1>Shared UI primitives</h1>
        <p>Use the keyboard to verify visible focus, native activation, modal focus trapping, and state announcements.</p>
      </header>

      <section className="harness-section" aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">Buttons and action states</h2>
        <div className="harness-row">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="destructive">Destructive action</Button>
          <Button state="loading" statusMessage="Saving changes">Save</Button>
          <Button state="success" statusMessage="Changes saved">Saved</Button>
          <Button state="error" statusMessage="Save failed">Retry save</Button>
          <Button disabled>Disabled action</Button>
        </div>
      </section>

      <section className="harness-section" aria-labelledby="fields-heading">
        <h2 id="fields-heading">Form anatomy</h2>
        <div className="harness-grid">
          <Input label="Course title" required helpText="Use a clear, unique title." />
          <Input label="Instructor email" defaultValue="invalid" error="Enter a valid email address." />
          <Select label="Course level" defaultValue="intermediate">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
          <Textarea label="Course description" helpText="Summarize the learning outcomes." />
        </div>
      </section>

      <section className="harness-section" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading">Feedback and loading</h2>
        <div className="harness-grid">
          <Notice tone="info" title="Information" onDismiss={() => undefined}>
            A polite informational update.
          </Notice>
          <Notice tone="success" title="Success">The course was saved.</Notice>
          <Notice tone="warning" title="Warning">Review the lesson order.</Notice>
          <Notice tone="error" title="Error">The request could not be completed.</Notice>
          <SkeletonGroup label="Loading course preview">
            <Skeleton width="45%" />
            <Skeleton width="100%" />
            <Skeleton shape="rect" height={88} />
          </SkeletonGroup>
        </div>
      </section>

      <section className="harness-section" aria-labelledby="pagination-heading">
        <h2 id="pagination-heading">Pagination</h2>
        <Pagination currentPage={page} totalPages={8} onPageChange={setPage} label="Course results pages" />
      </section>

      <section className="harness-section" aria-labelledby="dialogs-heading">
        <h2 id="dialogs-heading">Modal interactions</h2>
        <div className="harness-row">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button variant="destructive" onClick={() => setConfirmationOpen(true)}>
            Open destructive confirmation
          </Button>
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        title="Edit lesson"
        description="Tab in both directions, then press Escape."
        onClose={() => setDialogOpen(false)}
      >
        <Input label="Lesson title" defaultValue="Accessible components" />
        <div className="harness-row harness-row--end">
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setDialogOpen(false)}>Save lesson</Button>
        </div>
      </Dialog>

      <DestructiveConfirmation
        open={confirmationOpen}
        title="Delete this lesson?"
        description="This action is permanent. The lesson and its media file will be removed."
        confirmLabel="Delete lesson"
        cancelLabel="Keep lesson"
        confirming={confirmationPending}
        error={confirmationError}
        onConfirm={confirmDestructiveAction}
        onCancel={() => {
          setConfirmationOpen(false);
          setConfirmationError(undefined);
        }}
      />
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Harness root element is missing.');

createRoot(root).render(
  <StrictMode>
    <PrimitivesHarness />
  </StrictMode>,
);
