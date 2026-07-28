/**
 * Token contract tests — Color tokens
 *
 * Verifies that all semantic color tokens are defined with the correct hex/rgba values.
 *
 */
import { describe, it, expect } from 'vitest';
import {
  COLOR_CANVAS,
  COLOR_SURFACE,
  COLOR_SURFACE_ELEVATED,
  COLOR_SURFACE_INVERTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_DEFAULT,
  BORDER_STRONG,
  ACTION_PRIMARY_BG,
  ACTION_PRIMARY_BG_HOVER,
  ACTION_PRIMARY_BG_PRESSED,
  ACTION_PRIMARY_FG,
  ACTION_SECONDARY_BG,
  ACTION_SECONDARY_FG,
  ACTION_LINK,
  FOCUS_RING,
  FOCUS_RING_WIDTH,
  FOCUS_RING_OFFSET,
  STATE_SELECTED_BG,
  STATE_CONTROL_HIGHLIGHT,
  STATE_DISABLED_BG,
  STATE_DISABLED_TEXT,
  FEEDBACK_SUCCESS,
  FEEDBACK_WARNING,
  FEEDBACK_ERROR,
  FEEDBACK_INFO,
  RATING_EMPHASIS,
  OVERLAY_SCRIM,
  colorTokens,
} from '../../../src/shared/ui/tokens/color';

describe('Color tokens', () => {
  describe('Surface tokens', () => {
    it('COLOR_CANVAS should be #F7F8FA', () => {
      expect(COLOR_CANVAS).toBe('#F7F8FA');
    });

    it('COLOR_SURFACE should be #FFFFFF', () => {
      expect(COLOR_SURFACE).toBe('#FFFFFF');
    });

    it('COLOR_SURFACE_ELEVATED should be #FFFFFF', () => {
      expect(COLOR_SURFACE_ELEVATED).toBe('#FFFFFF');
    });

    it('COLOR_SURFACE_INVERTED should be #1F2937', () => {
      expect(COLOR_SURFACE_INVERTED).toBe('#1F2937');
    });
  });

  describe('Text tokens', () => {
    it('TEXT_PRIMARY should be #111827', () => {
      expect(TEXT_PRIMARY).toBe('#111827');
    });

    it('TEXT_SECONDARY should be #374151', () => {
      expect(TEXT_SECONDARY).toBe('#374151');
    });

    it('TEXT_MUTED should be #6B7280', () => {
      expect(TEXT_MUTED).toBe('#6B7280');
    });
  });

  describe('Border tokens', () => {
    it('BORDER_DEFAULT should be #D1D5DB', () => {
      expect(BORDER_DEFAULT).toBe('#D1D5DB');
    });

    it('BORDER_STRONG should be #9CA3AF', () => {
      expect(BORDER_STRONG).toBe('#9CA3AF');
    });
  });

  describe('Action tokens', () => {
    it('ACTION_PRIMARY_BG should be #6D28D9', () => {
      expect(ACTION_PRIMARY_BG).toBe('#6D28D9');
    });

    it('ACTION_PRIMARY_BG_HOVER should be #5B21B6', () => {
      expect(ACTION_PRIMARY_BG_HOVER).toBe('#5B21B6');
    });

    it('ACTION_PRIMARY_BG_PRESSED should be #4C1D95', () => {
      expect(ACTION_PRIMARY_BG_PRESSED).toBe('#4C1D95');
    });

    it('ACTION_PRIMARY_FG should be #FFFFFF', () => {
      expect(ACTION_PRIMARY_FG).toBe('#FFFFFF');
    });

    it('ACTION_SECONDARY_BG should be #EDE9FE', () => {
      expect(ACTION_SECONDARY_BG).toBe('#EDE9FE');
    });

    it('ACTION_SECONDARY_FG should be #4C1D95', () => {
      expect(ACTION_SECONDARY_FG).toBe('#4C1D95');
    });

    it('ACTION_LINK should be #1D4ED8', () => {
      expect(ACTION_LINK).toBe('#1D4ED8');
    });
  });

  describe('Focus token', () => {
    it('FOCUS_RING should be the primary purple #6D28D9', () => {
      expect(FOCUS_RING).toBe('#6D28D9');
    });

    it('FOCUS_RING_WIDTH should be 2px', () => {
      expect(FOCUS_RING_WIDTH).toBe('2px');
    });

    it('FOCUS_RING_OFFSET should be 2px', () => {
      expect(FOCUS_RING_OFFSET).toBe('2px');
    });
  });

  describe('State tokens', () => {
    it('STATE_SELECTED_BG should be #DBEAFE', () => {
      expect(STATE_SELECTED_BG).toBe('#DBEAFE');
    });

    it('STATE_CONTROL_HIGHLIGHT should be #EEF0F4 without replacing selected state', () => {
      expect(STATE_CONTROL_HIGHLIGHT).toBe('#EEF0F4');
      expect(STATE_CONTROL_HIGHLIGHT).not.toBe(STATE_SELECTED_BG);
      expect(colorTokens['--state-control-highlight']).toBe(STATE_CONTROL_HIGHLIGHT);
    });

    it('STATE_DISABLED_BG should be #E5E7EB', () => {
      expect(STATE_DISABLED_BG).toBe('#E5E7EB');
    });

    it('STATE_DISABLED_TEXT should be #9CA3AF', () => {
      expect(STATE_DISABLED_TEXT).toBe('#9CA3AF');
    });
  });

  describe('Feedback tokens', () => {
    it('FEEDBACK_SUCCESS should be #047857', () => {
      expect(FEEDBACK_SUCCESS).toBe('#047857');
    });

    it('FEEDBACK_WARNING should be #92400E', () => {
      expect(FEEDBACK_WARNING).toBe('#92400E');
    });

    it('FEEDBACK_ERROR should be #B91C1C', () => {
      expect(FEEDBACK_ERROR).toBe('#B91C1C');
    });

    it('FEEDBACK_INFO should be #1E40AF', () => {
      expect(FEEDBACK_INFO).toBe('#1E40AF');
    });

    it('RATING_EMPHASIS should be #B45309', () => {
      expect(RATING_EMPHASIS).toBe('#B45309');
    });
  });

  describe('Overlay scrim', () => {
    it('OVERLAY_SCRIM should include rgba with 0.56 opacity', () => {
      expect(OVERLAY_SCRIM).toMatch(/rgba\(/);
      expect(OVERLAY_SCRIM).toContain('0.56');
    });
  });

  describe('colorTokens map', () => {
    it('should export a colorTokens object', () => {
      expect(colorTokens).toBeDefined();
      expect(typeof colorTokens).toBe('object');
    });

    it('should contain all required CSS variable keys', () => {
      expect('--color-canvas' in colorTokens).toBe(true);
      expect('--color-surface' in colorTokens).toBe(true);
      expect('--text-primary' in colorTokens).toBe(true);
      expect('--action-primary-bg' in colorTokens).toBe(true);
      expect('--focus-ring' in colorTokens).toBe(true);
      expect('--feedback-error' in colorTokens).toBe(true);
    });

    it('colorTokens values should match the exported constants', () => {
      expect(colorTokens['--color-canvas']).toBe(COLOR_CANVAS);
      expect(colorTokens['--text-primary']).toBe(TEXT_PRIMARY);
      expect(colorTokens['--action-primary-bg']).toBe(ACTION_PRIMARY_BG);
      expect(colorTokens['--focus-ring']).toBe(FOCUS_RING);
    });
  });
});
