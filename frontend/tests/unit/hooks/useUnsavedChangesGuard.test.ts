import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesGuard } from '../../../src/hooks/useUnsavedChangesGuard';

function fireBeforeUnload(): Event {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e;
}

describe('useUnsavedChangesGuard', () => {
  it('(GU-1) blocks browser unload while there are unsaved changes', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
  });

  it('(GU-2) allows unload when there are no unsaved changes', () => {
    renderHook(() => useUnsavedChangesGuard(false));
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('(GU-3) stops blocking once the guard is turned off', () => {
    const { rerender } = renderHook(({ when }) => useUnsavedChangesGuard(when), {
      initialProps: { when: true },
    });
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
    rerender({ when: false });
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
