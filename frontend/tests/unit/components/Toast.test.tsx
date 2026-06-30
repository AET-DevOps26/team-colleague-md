import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, type ToastVariant } from '../../../src/contexts/ToastContext';
import { ToastStack, WelcomePill } from '../../../src/components/ui/Toast';
import { useToast } from '../../../src/hooks/useToast';
import { useWelcome } from '../../../src/hooks/useWelcome';

// LEAVE_MS in ToastContext — the leave transition before an item is unmounted.
const LEAVE = 240;

// Captured context API so tests can drive showToast/showWelcome imperatively.
type Api = ReturnType<typeof useToast> & ReturnType<typeof useWelcome>;
let api: Api;

function Capture() {
  const toast = useToast();
  const welcome = useWelcome();
  api = { ...toast, ...welcome };
  return null;
}

function renderToasts() {
  return render(
    <ToastProvider>
      <Capture />
      <ToastStack />
      <WelcomePill />
    </ToastProvider>,
  );
}

function flush(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe('Toast system', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the message text', () => {
    renderToasts();
    act(() => { api.showToast({ variant: 'info', message: 'Hello world' }); });
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it.each<[ToastVariant, string]>([
    ['success', 'status'],
    ['info', 'status'],
    ['warning', 'status'],
    ['error', 'alert'],
  ])('variant %s renders with data-variant and role=%s', (variant, role) => {
    const { container } = renderToasts();
    act(() => { api.showToast({ variant, message: `${variant} message` }); });
    const item = container.querySelector(`[data-variant="${variant}"]`);
    expect(item).toBeInTheDocument();
    expect(item).toHaveAttribute('role', role);
    // Each variant carries an icon svg.
    expect(item?.querySelector('svg')).toBeInTheDocument();
  });

  it('error toast announces assertively, others politely', () => {
    renderToasts();
    act(() => { api.showToast({ variant: 'error', message: 'boom' }); });
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    act(() => { api.showToast({ variant: 'success', message: 'ok' }); });
    expect(screen.getByText('ok').closest('[data-variant]')).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-dismisses after 4000ms (default lifetime)', () => {
    renderToasts();
    act(() => { api.showToast({ variant: 'info', message: 'auto gone' }); });
    expect(screen.getByText('auto gone')).toBeInTheDocument();
    flush(4000);          // lifetime expires → leave transition begins
    flush(LEAVE);         // transition done → unmounted
    expect(screen.queryByText('auto gone')).not.toBeInTheDocument();
  });

  it('hovering pauses the auto-dismiss timer; leaving resumes it', () => {
    renderToasts();
    act(() => { api.showToast({ variant: 'info', message: 'hover me' }); });
    const item = screen.getByText('hover me').closest('[data-variant]') as HTMLElement;

    flush(2000);                       // 2s elapsed (2s remaining)
    act(() => { fireEvent.mouseEnter(item); });
    flush(10000);                      // paused → no dismiss despite long wait
    expect(screen.getByText('hover me')).toBeInTheDocument();

    act(() => { fireEvent.mouseLeave(item); });
    flush(2000);                       // remaining 2s resumes and expires
    flush(LEAVE);
    expect(screen.queryByText('hover me')).not.toBeInTheDocument();
  });

  it('manual close button dismisses immediately', () => {
    renderToasts();
    act(() => { api.showToast({ variant: 'info', message: 'close me' }); });
    const closeBtn = screen.getByRole('button', { name: 'Dismiss' });
    act(() => { fireEvent.click(closeBtn); });
    flush(LEAVE);
    expect(screen.queryByText('close me')).not.toBeInTheDocument();
  });

  it('dismiss(id) removes a specific toast', () => {
    renderToasts();
    let id = 0;
    act(() => { id = api.showToast({ variant: 'info', message: 'target' }); });
    act(() => { api.dismiss(id); });
    flush(LEAVE);
    expect(screen.queryByText('target')).not.toBeInTheDocument();
  });

  it('dismissAll clears every toast', () => {
    renderToasts();
    act(() => {
      api.showToast({ variant: 'info', message: 'one' });
      api.showToast({ variant: 'success', message: 'two' });
    });
    act(() => { api.dismissAll(); });
    flush(LEAVE);
    expect(screen.queryByText('one')).not.toBeInTheDocument();
    expect(screen.queryByText('two')).not.toBeInTheDocument();
  });

  it('caps the stack at 2 — a 3rd push evicts the oldest', () => {
    renderToasts();
    act(() => {
      api.showToast({ variant: 'info', message: 'first' });
      api.showToast({ variant: 'info', message: 'second' });
      api.showToast({ variant: 'info', message: 'third' });
    });
    flush(LEAVE);   // oldest finishes leaving
    expect(screen.queryByText('first')).not.toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('third')).toBeInTheDocument();
  });

  it('renders an action button, runs its handler, and dismisses on click', () => {
    renderToasts();
    const onUndo = vi.fn();
    act(() => {
      api.showToast({ variant: 'info', message: 'Unfollowed all', action: { label: 'Undo', onClick: onUndo } });
    });
    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    act(() => { fireEvent.click(undoBtn); });
    expect(onUndo).toHaveBeenCalledTimes(1);
    flush(LEAVE);
    expect(screen.queryByText('Unfollowed all')).not.toBeInTheDocument();
  });

  it('a toast with an action lives 6000ms (longer than the default)', () => {
    renderToasts();
    act(() => {
      api.showToast({ variant: 'info', message: 'with undo', action: { label: 'Undo', onClick: vi.fn() } });
    });
    flush(4000);   // past the default 4000ms — still present
    expect(screen.getByText('with undo')).toBeInTheDocument();
    flush(2000);   // reaches 6000ms → leaves
    flush(LEAVE);
    expect(screen.queryByText('with undo')).not.toBeInTheDocument();
  });
});

describe('WelcomePill', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows the greeting and auto-dismisses after 3000ms', () => {
    renderToasts();
    act(() => { api.showWelcome('Welcome back, Alex'); });
    expect(screen.getByText('Welcome back, Alex')).toBeInTheDocument();
    flush(3000);
    expect(screen.queryByText('Welcome back, Alex')).not.toBeInTheDocument();
  });
});
