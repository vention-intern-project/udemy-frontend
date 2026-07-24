import { describe, expect, it } from 'vitest';

import { validateVisualScenarioEvidence } from './visual-quality';

describe('visual quality scenario evidence', () => {
  it('rejects an array used as runtimeInputs metadata', () => {
    const problems = validateVisualScenarioEvidence({
      routes: ['/courses'],
      states: ['catalog loaded'],
      viewports: [{ width: 1280, height: 800 }],
      expectedOutcome: 'catalog remains usable',
      runtimeInputs: ['synthetic input'],
    });

    expect(problems).toContain('runtimeInputs must contain at least one input');
  });
});
