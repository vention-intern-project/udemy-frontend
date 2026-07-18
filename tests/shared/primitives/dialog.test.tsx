// @vitest-environment jsdom

import { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DestructiveConfirmation, Dialog } from '../../../src/shared/ui/primitives';
import { ThemeProvider } from '../../../src/shared/ui/theme/ThemeProvider';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  document.documentElement.removeAttribute('data-density');
});

function DialogHarness({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open editor</button>
      <Dialog
        open={open}
        title="Edit lesson"
        description="Update lesson details"
        onClose={() => setOpen(false)}
        showCloseButton={false}
        busy={busy}
      >
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Dialog>
    </>
  );
}

function TabbabilityHarness() {
  const disabledInitialRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open
      title="Tabbability contract"
      onClose={() => undefined}
      showCloseButton={false}
      initialFocusRef={disabledInitialRef}
    >
      <button ref={disabledInitialRef} type="button" disabled>Disabled initial target</button>
      <fieldset disabled><button type="button">Disabled fieldset target</button></fieldset>
      <div hidden><button type="button">Hidden ancestor target</button></div>
      <div aria-hidden="true"><button type="button">ARIA-hidden ancestor target</button></div>
      <div ref={(node) => node?.setAttribute('inert', '')}>
        <button type="button">Inert ancestor target</button>
      </div>
      <div style={{ display: 'none' }}><button type="button">Non-rendered target</button></div>
      <div style={{ visibility: 'hidden' }}><button type="button">Invisible target</button></div>
      <button type="button" tabIndex={-1}>Negative tabindex target</button>
      <input type="radio" name="focus-contract" aria-label="Inactive radio target" />
      <input type="radio" name="focus-contract" aria-label="Checked radio target" defaultChecked />
      <button type="button">Available target</button>
    </Dialog>
  );
}

function MultipleDialogsHarness() {
  const [firstOpen, setFirstOpen] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setFirstOpen(true)}>Open first dialog</button>
      <Dialog
        open={firstOpen}
        title="First dialog"
        onClose={() => setFirstOpen(false)}
        showCloseButton={false}
      >
        <button type="button" onClick={() => setSecondOpen(true)}>Open second dialog</button>
      </Dialog>
      <Dialog
        open={secondOpen}
        title="Second dialog"
        onClose={() => setSecondOpen(false)}
        showCloseButton={false}
      >
        <button type="button" onClick={() => setFirstOpen(false)}>Close underlying dialog</button>
        <button type="button" onClick={() => setSecondOpen(false)}>Close top dialog</button>
      </Dialog>
    </>
  );
}

function EscapeOwnershipHarness({ busy, onEscapeBubble }: {
  busy: boolean;
  onEscapeBubble: () => void;
}) {
  const [firstOpen, setFirstOpen] = useState(true);
  const [secondOpen, setSecondOpen] = useState(true);

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') onEscapeBubble();
      }}
    >
      <Dialog
        open={firstOpen}
        title="Underlying dialog"
        onClose={() => setFirstOpen(false)}
        showCloseButton={false}
      >
        <button type="button">Underlying action</button>
      </Dialog>
      <Dialog
        open={secondOpen}
        title="Top dialog"
        onClose={() => setSecondOpen(false)}
        showCloseButton={false}
        busy={busy}
      >
        <button type="button">Top action</button>
      </Dialog>
    </div>
  );
}

describe('Dialog', () => {
  it('links its accessible name and description, traps focus, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open editor' });
    await act(async () => user.click(trigger));

    const dialog = screen.getByRole('dialog', { name: 'Edit lesson' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent)
      .toBe('Update lesson details');

    const first = screen.getByRole('button', { name: 'First action' });
    const last = screen.getByRole('button', { name: 'Last action' });
    expect(document.activeElement).toBe(first);

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);

    await act(async () => user.keyboard('{Escape}'));
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(document.activeElement).toBe(trigger);
  });

  it('does not close while a modal action is busy', async () => {
    const user = userEvent.setup();
    render(<DialogHarness busy />);
    await act(async () => user.click(screen.getByRole('button', { name: 'Open editor' })));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  });

  it('contains Escape in the topmost dialog while preserving busy and close ownership', async () => {
    const user = userEvent.setup();
    const onEscapeBubble = vi.fn();
    const { rerender } = render(
      <EscapeOwnershipHarness busy onEscapeBubble={onEscapeBubble} />,
    );

    const underlyingDialog = screen.getByRole('dialog', { name: 'Underlying dialog' });
    fireEvent.keyDown(underlyingDialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Underlying dialog' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Top dialog' })).toBeTruthy();
    expect(onEscapeBubble).toHaveBeenCalledTimes(1);

    onEscapeBubble.mockClear();
    screen.getByRole('button', { name: 'Top action' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Top dialog' }).getAttribute('aria-busy'))
      .toBe('true');
    expect(onEscapeBubble).not.toHaveBeenCalled();

    rerender(<EscapeOwnershipHarness busy={false} onEscapeBubble={onEscapeBubble} />);
    await act(async () => user.keyboard('{Escape}'));
    expect(screen.queryByRole('dialog', { name: 'Top dialog' })).toBe(null);
    expect(screen.getByRole('dialog', { name: 'Underlying dialog' })).toBeTruthy();
    expect(onEscapeBubble).not.toHaveBeenCalled();
  });

  it('uses computed tabbability for entry and wrapping and falls back to the dialog', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TabbabilityHarness />);

    const radio = screen.getByRole('radio', { name: 'Checked radio target' });
    const available = screen.getByRole('button', { name: 'Available target' });
    expect(document.activeElement).toBe(radio);
    await user.tab();
    expect(document.activeElement).toBe(available);
    await user.tab();
    expect(document.activeElement).toBe(radio);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(available);

    rerender(
      <Dialog open title="Fallback contract" onClose={() => undefined} showCloseButton={false}>
        <p>No tabbable content</p>
      </Dialog>,
    );
    const fallbackDialog = screen.getByRole('dialog', { name: 'Fallback contract' });
    expect(document.activeElement).toBe(fallbackDialog);
    await user.tab();
    expect(document.activeElement).toBe(fallbackDialog);
  });

  it('keeps scroll lock and focus ownership correct across multiple dialogs', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'clip';
    render(<MultipleDialogsHarness />);

    const firstInvoker = screen.getByRole('button', { name: 'Open first dialog' });
    await act(async () => {
      await user.click(firstInvoker);
    });
    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open second dialog' }));
    });
    const secondDialog = screen.getByRole('dialog', { name: 'Second dialog' });
    const closeUnderlying = screen.getByRole('button', { name: 'Close underlying dialog' });
    expect(document.activeElement).toBe(closeUnderlying);

    await act(async () => {
      await user.click(closeUnderlying);
    });
    expect(screen.queryByRole('dialog', { name: 'First dialog' })).toBe(null);
    expect(secondDialog).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).not.toBe(firstInvoker);
    expect(secondDialog.contains(document.activeElement)).toBe(true);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Close top dialog' }));
    });
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(document.body.style.overflow).toBe('clip');
    expect(document.activeElement).not.toBe(firstInvoker);
  });
});

describe('ThemeProvider density ownership', () => {
  it('restores nested and sibling provider ownership without clearing another provider', () => {
    document.documentElement.setAttribute('data-density', 'external');
    const nested = render(
      <ThemeProvider initialDensityMode="marketplace">
        <ThemeProvider initialDensityMode="workspace">
          <span>Nested content</span>
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-density')).toBe('workspace');

    nested.rerender(
      <ThemeProvider initialDensityMode="marketplace">
        <span>Outer content</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-density')).toBe('marketplace');
    nested.unmount();
    expect(document.documentElement.getAttribute('data-density')).toBe('external');

    const siblings = render(
      <>
        <ThemeProvider initialDensityMode="marketplace"><span>First</span></ThemeProvider>
        <ThemeProvider initialDensityMode="workspace"><span>Second</span></ThemeProvider>
      </>,
    );
    expect(document.documentElement.getAttribute('data-density')).toBe('workspace');
    siblings.rerender(
      <ThemeProvider initialDensityMode="marketplace"><span>First</span></ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-density')).toBe('marketplace');
    siblings.unmount();
    expect(document.documentElement.getAttribute('data-density')).toBe('external');
  });
});

describe('DestructiveConfirmation', () => {
  it('uses explicit destructive action semantics and assertive failure feedback', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DestructiveConfirmation
        open
        title="Delete this lesson?"
        description="This action is permanent."
        confirmLabel="Delete lesson"
        error="The lesson could not be deleted."
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Delete this lesson?' })).toBeTruthy();
    const alert = screen.getByRole('alert');
    const deleteButton = screen.getByRole('button', { name: 'Delete lesson' });
    expect(alert.textContent).toContain('The lesson could not be deleted.');
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(screen.getAllByText('The lesson could not be deleted.')).toHaveLength(1);
    expect(deleteButton.getAttribute('aria-describedby')).toBe(alert.id);
    expect(deleteButton.querySelector('[data-state-indicator="error"]')?.textContent).toBe('!');
    await user.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
