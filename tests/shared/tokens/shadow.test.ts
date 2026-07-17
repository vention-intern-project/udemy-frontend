import { describe, it, expect } from 'vitest';
import {
  SHADOW_1,
  SHADOW_2,
  SHADOW_3,
  OVERLAY_SCRIM_SHADOW,
  shadowTokens,
} from '@shared/ui/tokens/shadow';
import { OVERLAY_SCRIM } from '@shared/ui/tokens/color';

describe('Shadow tokens', () => {
  it('should expose expected shadow constants', () => {
    expect(SHADOW_1).toBe('0 1px 2px rgba(17, 24, 39, 0.08)');
    expect(SHADOW_2).toBe('0 4px 12px rgba(17, 24, 39, 0.12)');
    expect(SHADOW_3).toBe('0 12px 28px rgba(17, 24, 39, 0.16)');
  });

  it('should expose stable CSS custom property names/values', () => {
    expect(shadowTokens['--shadow-1']).toBe(SHADOW_1);
    expect(shadowTokens['--shadow-2']).toBe(SHADOW_2);
    expect(shadowTokens['--shadow-3']).toBe(SHADOW_3);
  });

  it('should keep scrim export aligned with color token', () => {
    expect(OVERLAY_SCRIM_SHADOW).toBe(OVERLAY_SCRIM);
  });
});
