import { useEffect, useState } from 'react';

/**
 * Reading progress (0–100) for a long-form element, tracked against the window scroll.
 *
 * 0% when the element's top sits at the top of the viewport, 100% once its bottom reaches
 * the bottom of the viewport. Recomputes on resize and whenever the element's own height
 * changes — Markdown images decoding, or comments loading in late — so the bar stays
 * consistent instead of over/undershooting (a plain `scrollHeight - innerHeight` denominator
 * can never reach 100% when there's padding below the element, and goes negative for posts
 * shorter than the viewport).
 */
export function useReadingProgress(articleRef: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    function update() {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Full distance the element travels from its top hitting the viewport top to its
      // bottom hitting the viewport bottom.
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        // Element fits within the viewport: fully read once its bottom is on screen.
        setProgress(rect.bottom <= window.innerHeight ? 100 : 0);
        return;
      }
      const scrolled = -rect.top;
      setProgress(Math.max(0, Math.min(100, (scrolled / total) * 100)));
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [articleRef]);

  return progress;
}
