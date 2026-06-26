import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImagePasteModal from '../../../../src/pages/PostEditor/components/ImagePasteModal';

beforeAll(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  });
});

const file = new File(['x'], 'diagram.png', { type: 'image/png' });

describe('ImagePasteModal', () => {
  it('(IP-1) renders nothing when there is no file', () => {
    const { container } = render(<ImagePasteModal file={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('(IP-2) shows a preview and prefills alt text from the filename', () => {
    render(<ImagePasteModal file={file} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByLabelText(/alt text/i)).toHaveValue('diagram');
  });

  it('(IP-3) Insert confirms with the entered alt text', async () => {
    const onConfirm = vi.fn();
    render(<ImagePasteModal file={file} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const alt = screen.getByLabelText(/alt text/i);
    await userEvent.clear(alt);
    await userEvent.type(alt, 'system diagram');
    await userEvent.click(screen.getByRole('button', { name: /insert/i }));
    expect(onConfirm).toHaveBeenCalledWith('system diagram');
  });

  it('(IP-4) Insert falls back to the filename when alt is cleared', async () => {
    const onConfirm = vi.fn();
    render(<ImagePasteModal file={file} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/alt text/i));
    await userEvent.click(screen.getByRole('button', { name: /insert/i }));
    expect(onConfirm).toHaveBeenCalledWith('diagram');
  });

  it('(IP-5) Cancel dismisses without confirming', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ImagePasteModal file={file} onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
