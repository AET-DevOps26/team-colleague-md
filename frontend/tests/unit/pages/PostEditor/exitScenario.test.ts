import { describe, it, expect } from 'vitest';
import { resolveExitScenario } from '../../../../src/pages/PostEditor/exitScenario';

describe('resolveExitScenario', () => {
  it('(EX-1) a draft saves as a draft', () => {
    const s = resolveExitScenario('DRAFT');
    expect(s.primaryLabel).toBe('Save draft');
    expect(s.saveStatus).toBe('DRAFT');
  });

  it('(EX-2) a published post saves changes without downgrading its status', () => {
    const s = resolveExitScenario('PUBLISHED');
    expect(s.primaryLabel).toBe('Save changes');
    expect(s.saveStatus).toBeUndefined();
  });
});
