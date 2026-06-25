import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkdownToolbar from '../../../../src/pages/PostEditor/components/MarkdownToolbar';

const noop = () => {};

describe('MarkdownToolbar', () => {
  it('(TB-1) clicking Bold emits the bold action', async () => {
    const onAction = vi.fn();
    render(<MarkdownToolbar mode="edit" onMode={noop} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /^Bold/i }));
    expect(onAction).toHaveBeenCalledWith('bold');
  });

  it('(TB-2) clicking Insert image emits the image action', async () => {
    const onAction = vi.fn();
    render(<MarkdownToolbar mode="edit" onMode={noop} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /Insert image/i }));
    expect(onAction).toHaveBeenCalledWith('image');
  });

  it('(TB-3) clicking Preview switches mode', async () => {
    const onMode = vi.fn();
    render(<MarkdownToolbar mode="edit" onMode={onMode} onAction={noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onMode).toHaveBeenCalledWith('preview');
  });

  it('(TB-4) formatting buttons are disabled in preview mode', () => {
    render(<MarkdownToolbar mode="preview" onMode={noop} onAction={noop} />);
    expect(screen.getByRole('button', { name: /^Bold/i })).toBeDisabled();
  });

  it('(TB-5) the active mode toggle reflects the current mode', () => {
    render(<MarkdownToolbar mode="preview" onMode={noop} onAction={noop} />);
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'false');
  });
});
