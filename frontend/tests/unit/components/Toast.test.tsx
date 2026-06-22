import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from '../../../src/components/ui/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(T-1) renders the message text', () => {
    render(<Toast message="Hello world" show={true} onHide={() => {}} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('(T-2) shows checkmark svg when neutral is false', () => {
    const { container } = render(<Toast message="Following" show={true} onHide={() => {}} neutral={false} />);
    // The check svg has a <path d="M20 6..."> — minus svg has a <circle>
    const checkPath = container.querySelector('path[d="M20 6 9 17l-5-5"]');
    expect(checkPath).toBeInTheDocument();
  });

  it('(T-3) shows minus svg when neutral is true', () => {
    const { container } = render(<Toast message="Unfollowed" show={true} onHide={() => {}} neutral={true} />);
    const circle = container.querySelector('circle[cx="12"]');
    expect(circle).toBeInTheDocument();
  });

  it('(T-4) calls onHide after 2500ms', () => {
    const onHide = vi.fn();
    render(<Toast message="Test" show={true} onHide={onHide} />);
    expect(onHide).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2500); });
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('(T-5) has role="status" for accessibility', () => {
    render(<Toast message="Test" show={true} onHide={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not call onHide when show is false', () => {
    const onHide = vi.fn();
    render(<Toast message="Test" show={false} onHide={onHide} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onHide).not.toHaveBeenCalled();
  });
});
