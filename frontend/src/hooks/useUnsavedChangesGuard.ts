import { useEffect } from 'react';

/**
 * Warn before losing unsaved editor changes on a browser-level navigation
 * (tab close, refresh, hard back) via the native `beforeunload` dialog.
 *
 * In-app route changes are guarded separately by the editor's own Back control,
 * which opens the {@link ExitGuardModal}; a router-level blocker awaits a
 * data-router migration (the app currently mounts a plain `BrowserRouter`).
 */
export function useUnsavedChangesGuard(when: boolean): void {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers require a returnValue to trigger the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
