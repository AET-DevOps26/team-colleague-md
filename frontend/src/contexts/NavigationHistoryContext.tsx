import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationHistoryContextValue {
  // Pathname of the entry directly below the current one in the browser history stack —
  // i.e. exactly where navigate(-1) lands. null on a fresh entry (deep link / refresh).
  previousPath: string | null;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextValue>({
  previousPath: null,
});

export function useNavigationHistory() {
  return useContext(NavigationHistoryContext);
}

/**
 * Tracks the browser history stack by position so the back button can label itself with the
 * page navigate(-1) actually returns to. We index recorded pathnames by React Router's
 * history index (window.history.state.idx) rather than "the last route visited" — otherwise a
 * back navigation would mislabel the previous page as the one we just left. Must live inside
 * the Router. Pages can still override the label explicitly via navigate(..., { state: { from } }).
 */
export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const stackRef = useRef<string[]>([]);
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    const idx = (window.history.state?.idx as number | undefined) ?? 0;
    stackRef.current[idx] = location.pathname;
    setPreviousPath(idx > 0 ? (stackRef.current[idx - 1] ?? null) : null);
  }, [location]);

  return (
    <NavigationHistoryContext.Provider value={{ previousPath }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}
