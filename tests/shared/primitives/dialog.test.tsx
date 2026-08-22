// @vitest-environment jsdom

import { StrictMode, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { focusElement, getTabbableElements } from '../../../src/shared/accessibility';
import { LocaleProvider } from '../../../src/shared/locale';
import { DestructiveConfirmation, Dialog } from '../../../src/shared/ui/primitives';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  document.querySelector('[data-dialog-portal-root]')?.remove();
  document.documentElement.removeAttribute('data-density');
});

function LocaleTestProvider({ children }: PropsWithChildren) {
  return <LocaleProvider initialLocale="en">{children}</LocaleProvider>;
}

function renderWithLocale(ui: ReactNode) {
  return render(ui, { wrapper: LocaleTestProvider });
}

function DialogHarness({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open editor
      </button>
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
      <button ref={disabledInitialRef} type="button" disabled>
        Disabled initial target
      </button>
      <fieldset disabled>
        <button type="button">Disabled fieldset target</button>
      </fieldset>
      <div hidden>
        <button type="button">Hidden ancestor target</button>
      </div>
      <div aria-hidden="true">
        <button type="button">ARIA-hidden ancestor target</button>
      </div>
      <div ref={(node) => node?.setAttribute('inert', '')}>
        <button type="button">Inert ancestor target</button>
      </div>
      <div style={{ display: 'none' }}>
        <button type="button">Non-rendered target</button>
      </div>
      <div style={{ visibility: 'hidden' }}>
        <button type="button">Invisible target</button>
      </div>
      <button type="button" tabIndex={-1}>
        Negative tabindex target
      </button>
      <input type="radio" name="focus-contract" aria-label="Inactive radio target" />
      <input type="radio" name="focus-contract" aria-label="Checked radio target" defaultChecked />
      <button type="button">Available target</button>
    </Dialog>
  );
}

function ProgrammaticInitialFocusHarness() {
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open
      title="Programmatic initial focus"
      onClose={() => undefined}
      showCloseButton={false}
      initialFocusRef={initialFocusRef}
    >
      <button ref={initialFocusRef} type="button" tabIndex={-1}>
        Programmatic target
      </button>
      <button type="button">Tabbable target</button>
    </Dialog>
  );
}

function MultipleDialogsHarness() {
  const [firstOpen, setFirstOpen] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setFirstOpen(true)}>
        Open first dialog
      </button>
      <Dialog
        open={firstOpen}
        title="First dialog"
        onClose={() => setFirstOpen(false)}
        showCloseButton={false}
      >
        <button type="button" onClick={() => setSecondOpen(true)}>
          Open second dialog
        </button>
      </Dialog>
      <Dialog
        open={secondOpen}
        title="Second dialog"
        onClose={() => setSecondOpen(false)}
        showCloseButton={false}
      >
        <button type="button" onClick={() => setFirstOpen(false)}>
          Close underlying dialog
        </button>
        <button type="button" onClick={() => setSecondOpen(false)}>
          Close top dialog
        </button>
      </Dialog>
    </>
  );
}

function EscapeOwnershipHarness({
  busy,
  onEscapeBubble,
}: {
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
    renderWithLocale(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open editor' });
    await act(async () => user.click(trigger));

    const dialog = screen.getByRole('dialog', { name: 'Edit lesson' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Update lesson details');

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
    renderWithLocale(<DialogHarness busy />);
    await act(async () => user.click(screen.getByRole('button', { name: 'Open editor' })));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  });

  it('contains interaction in the topmost dialog while preserving busy and close ownership', async () => {
    const user = userEvent.setup();
    const onEscapeBubble = vi.fn();
    const { rerender } = renderWithLocale(
      <EscapeOwnershipHarness busy onEscapeBubble={onEscapeBubble} />,
    );

    const underlyingDialog = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-hidden="true"]',
    );
    if (!underlyingDialog) throw new Error('Underlying dialog should remain mounted while hidden.');
    fireEvent.keyDown(underlyingDialog, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"][aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Top dialog' })).toBeTruthy();
    expect(onEscapeBubble).not.toHaveBeenCalled();

    onEscapeBubble.mockClear();
    screen.getByRole('button', { name: 'Top action' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Top dialog' }).getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(onEscapeBubble).not.toHaveBeenCalled();

    rerender(<EscapeOwnershipHarness busy={false} onEscapeBubble={onEscapeBubble} />);
    await act(async () => user.keyboard('{Escape}'));
    expect(screen.queryByRole('dialog', { name: 'Top dialog' })).toBe(null);
    expect(screen.getByRole('dialog', { name: 'Underlying dialog' })).toBeTruthy();
    expect(onEscapeBubble).not.toHaveBeenCalled();
  });

  it('uses computed tabbability for entry and wrapping and falls back to the dialog', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithLocale(<TabbabilityHarness />);

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

  it('names tabbable collection semantics and reports verified programmatic focus', () => {
    const container = document.createElement('div');
    const tabbable = document.createElement('button');
    const negativeTabindex = document.createElement('button');
    negativeTabindex.tabIndex = -1;
    const disabled = document.createElement('button');
    disabled.disabled = true;
    container.append(tabbable, negativeTabindex, disabled);
    document.body.append(container);

    expect(getTabbableElements(container)).toEqual([tabbable]);
    expect(focusElement(negativeTabindex)).toBe(true);
    expect(document.activeElement).toBe(negativeTabindex);
    expect(focusElement(disabled)).toBe(false);
    expect(document.activeElement).toBe(negativeTabindex);

    container.remove();
    expect(focusElement(negativeTabindex)).toBe(false);
  });

  it('accepts a valid programmatic initial target and portals while restoring inert state', () => {
    const preInert = document.createElement('aside');
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Outside action';
    preInert.setAttribute('inert', 'preserved');
    document.body.append(preInert, outside);
    const rendered = renderWithLocale(<ProgrammaticInitialFocusHarness />);

    const dialog = screen.getByRole('dialog', { name: 'Programmatic initial focus' });
    const programmaticTarget = screen.getByRole('button', { name: 'Programmatic target' });
    expect(document.activeElement).toBe(programmaticTarget);
    expect(dialog.parentElement?.parentElement?.hasAttribute('data-dialog-portal-root')).toBe(true);
    expect(rendered.container.getAttribute('inert')).toBe('');
    expect(preInert.getAttribute('inert')).toBe('');

    outside.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    rendered.unmount();
    expect(rendered.container.hasAttribute('inert')).toBe(false);
    expect(preInert.getAttribute('inert')).toBe('preserved');
    preInert.remove();
    outside.remove();
  });

  it('keeps modal registration and environment restoration safe in StrictMode', () => {
    document.body.style.overflow = 'clip';
    const rendered = renderWithLocale(
      <StrictMode>
        <Dialog open title="Strict modal" onClose={() => undefined} showCloseButton={false}>
          <button type="button">Strict action</button>
        </Dialog>
      </StrictMode>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(rendered.container.getAttribute('inert')).toBe('');
    rendered.unmount();
    expect(document.body.style.overflow).toBe('clip');
    expect(rendered.container.hasAttribute('inert')).toBe(false);
  });

  it('keeps scroll lock and focus ownership correct across multiple dialogs', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'clip';
    renderWithLocale(<MultipleDialogsHarness />);

    const firstInvoker = screen.getByRole('button', { name: 'Open first dialog' });
    await act(async () => {
      await user.click(firstInvoker);
    });
    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open second dialog' }));
    });
    const secondDialog = screen.getByRole('dialog', { name: 'Second dialog' });
    expect(screen.getAllByRole('dialog')).toEqual([secondDialog]);
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

describe('DestructiveConfirmation', () => {
  it.each([
    { pendingLabel: undefined, expectedLabel: 'Working...' },
    { pendingLabel: 'Removing this lesson...', expectedLabel: 'Removing this lesson...' },
  ])(
    'announces the $expectedLabel pending label and disables the destructive confirmation',
    ({ pendingLabel, expectedLabel }) => {
      renderWithLocale(
        <DestructiveConfirmation
          open
          title="Delete this lesson?"
          description="This action is permanent."
          confirmLabel="Delete lesson"
          confirming
          pendingLabel={pendingLabel}
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />,
      );

      const confirmation = screen.getByRole('button', { name: expectedLabel });
      expect((confirmation as HTMLButtonElement).disabled).toBe(true);
      expect(confirmation.getAttribute('aria-busy')).toBe('true');
      expect(screen.getByRole('status').textContent).toContain(expectedLabel);
    },
  );

  it('uses explicit destructive action semantics and assertive failure feedback', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithLocale(
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
