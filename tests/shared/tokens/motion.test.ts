import { describe, it, expect } from 'vitest';
import {
  DURATION_FAST,
  DURATION_BASE,
  DURATION_SLOW,
  DURATION_REDUCED_MOTION,
  EASING_STANDARD,
  EASING_ENTER,
  EASING_EXIT,
  motionTokens,
} from '@shared/ui/tokens/motion';

describe('Motion tokens', () => {
  it('should expose expected duration constants', () => {
    expect(DURATION_FAST).toBe(120);
    expect(DURATION_BASE).toBe(180);
    expect(DURATION_SLOW).toBe(240);
    expect(DURATION_REDUCED_MOTION).toBe(80);
  });

  it('should expose expected easing constants', () => {
    expect(EASING_STANDARD).toBe('cubic-bezier(0.2, 0, 0, 1)');
    expect(EASING_ENTER).toBe('cubic-bezier(0, 0, 0.2, 1)');
    expect(EASING_EXIT).toBe('cubic-bezier(0.4, 0, 1, 1)');
  });

  it('should expose stable CSS custom property names/values', () => {
    expect(motionTokens['--duration-fast']).toBe('120ms');
    expect(motionTokens['--duration-base']).toBe('180ms');
    expect(motionTokens['--duration-slow']).toBe('240ms');
    expect(motionTokens['--duration-reduced']).toBe('80ms');
    expect(motionTokens['--easing-standard']).toBe(EASING_STANDARD);
    expect(motionTokens['--easing-enter']).toBe(EASING_ENTER);
    expect(motionTokens['--easing-exit']).toBe(EASING_EXIT);
  });
});
