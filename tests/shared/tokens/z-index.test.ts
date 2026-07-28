import { describe, it, expect } from 'vitest';
import {
  Z_BASE,
  Z_RAISED,
  Z_DROPDOWN,
  Z_STICKY,
  Z_OVERLAY,
  Z_ACCESSIBILITY,
  Z_MODAL,
  Z_TOAST,
  zIndex,
  zIndexTokens,
} from '@shared/ui/tokens/z-index';

describe('Z-index tokens', () => {
  it('should expose expected z-index constants', () => {
    expect(Z_BASE).toBe(0);
    expect(Z_RAISED).toBe(100);
    expect(Z_DROPDOWN).toBe(200);
    expect(Z_STICKY).toBe(300);
    expect(Z_OVERLAY).toBe(400);
    expect(Z_ACCESSIBILITY).toBe(450);
    expect(Z_MODAL).toBe(500);
    expect(Z_TOAST).toBe(600);
  });

  it('should expose expected named zIndex map', () => {
    expect(zIndex.base).toBe(Z_BASE);
    expect(zIndex.raised).toBe(Z_RAISED);
    expect(zIndex.dropdown).toBe(Z_DROPDOWN);
    expect(zIndex.sticky).toBe(Z_STICKY);
    expect(zIndex.overlay).toBe(Z_OVERLAY);
    expect(zIndex.accessibility).toBe(Z_ACCESSIBILITY);
    expect(zIndex.modal).toBe(Z_MODAL);
    expect(zIndex.toast).toBe(Z_TOAST);
  });

  it('should expose stable CSS custom property names/values', () => {
    expect(zIndexTokens['--z-base']).toBe('0');
    expect(zIndexTokens['--z-raised']).toBe('100');
    expect(zIndexTokens['--z-dropdown']).toBe('200');
    expect(zIndexTokens['--z-sticky']).toBe('300');
    expect(zIndexTokens['--z-overlay']).toBe('400');
    expect(zIndexTokens['--z-accessibility']).toBe('450');
    expect(zIndexTokens['--z-modal']).toBe('500');
    expect(zIndexTokens['--z-toast']).toBe('600');
  });
});
