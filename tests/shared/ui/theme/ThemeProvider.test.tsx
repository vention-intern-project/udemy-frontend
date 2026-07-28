// @vitest-environment jsdom

import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../../../src/shared/ui/theme';

afterEach(() => {
  document.documentElement.removeAttribute('data-density');
});

describe('ThemeProvider', () => {
  it('applies the one global density during the layout lifecycle and restores the prior value', () => {
    document.documentElement.setAttribute('data-density', 'external');
    const result = render(
      <ThemeProvider initialDensityMode="workspace">
        <div />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute('data-density')).toBe('workspace');
    result.unmount();
    expect(document.documentElement.getAttribute('data-density')).toBe('external');
  });

  it('keeps cleanup safe under StrictMode', () => {
    const result = render(
      <StrictMode>
        <ThemeProvider initialDensityMode="marketplace">
          <div />
        </ThemeProvider>
      </StrictMode>,
    );

    expect(document.documentElement.getAttribute('data-density')).toBe('marketplace');
    result.unmount();
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('rejects nested scoped density owners', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() =>
        render(
          <ThemeProvider>
            <ThemeProvider>
              <div />
            </ThemeProvider>
          </ThemeProvider>,
        ),
      ).toThrow('singleton global density owner');
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('rejects a second React-root owner without disturbing the live owner or external snapshot', () => {
    document.documentElement.setAttribute('data-density', 'external');
    const first = render(
      <ThemeProvider initialDensityMode="workspace">
        <div />
      </ThemeProvider>,
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() =>
        render(
          <ThemeProvider initialDensityMode="marketplace">
            <div />
          </ThemeProvider>,
        ),
      ).toThrow('cannot span multiple React roots');
      expect(consoleError).toHaveBeenCalled();
      expect(document.documentElement.getAttribute('data-density')).toBe('workspace');
    } finally {
      consoleError.mockRestore();
      first.unmount();
    }

    expect(document.documentElement.getAttribute('data-density')).toBe('external');
  });
});
