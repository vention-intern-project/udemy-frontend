import { describe, it, expect } from 'vitest';
import {
  RADIUS_SM,
  RADIUS_MD,
  RADIUS_LG,
  RADIUS_XL,
  RADIUS_FULL,
  BORDER_WIDTH_DEFAULT,
  BORDER_WIDTH_EMPHASIZED,
  borderTokens,
} from '@shared/ui/tokens/border';

describe('Border tokens', () => {
  it('should expose expected radius constants', () => {
    expect(RADIUS_SM).toBe('4px');
    expect(RADIUS_MD).toBe('8px');
    expect(RADIUS_LG).toBe('12px');
    expect(RADIUS_XL).toBe('16px');
    expect(RADIUS_FULL).toBe('9999px');
  });

  it('should expose expected border width constants', () => {
    expect(BORDER_WIDTH_DEFAULT).toBe('1px');
    expect(BORDER_WIDTH_EMPHASIZED).toBe('2px');
  });

  it('should expose stable CSS custom property names/values', () => {
    expect(borderTokens['--radius-sm']).toBe(RADIUS_SM);
    expect(borderTokens['--radius-md']).toBe(RADIUS_MD);
    expect(borderTokens['--radius-lg']).toBe(RADIUS_LG);
    expect(borderTokens['--radius-xl']).toBe(RADIUS_XL);
    expect(borderTokens['--radius-full']).toBe(RADIUS_FULL);
    expect(borderTokens['--border-width']).toBe(BORDER_WIDTH_DEFAULT);
    expect(borderTokens['--border-width-emphasized']).toBe(BORDER_WIDTH_EMPHASIZED);
  });
});
