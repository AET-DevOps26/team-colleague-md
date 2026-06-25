import type { PostStatus } from '../../types';

export interface ExitScenario {
  /** Label for the modal's primary save button. */
  primaryLabel: string;
  /**
   * Status to persist when the user saves on exit. `undefined` for a published
   * post so saving never downgrades it to a draft ("不降级").
   */
  saveStatus?: PostStatus;
}

/**
 * Decide how leaving the editor with unsaved changes should be offered:
 * a published post saves its changes in place; anything else saves as a draft.
 */
export function resolveExitScenario(status: PostStatus): ExitScenario {
  if (status === 'PUBLISHED') return { primaryLabel: 'Save changes' };
  return { primaryLabel: 'Save draft', saveStatus: 'DRAFT' };
}
