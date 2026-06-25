import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExitGuardModal from '../../../../src/pages/PostEditor/components/ExitGuardModal';

const props = {
  open: true,
  primaryLabel: 'Save draft',
  onSave: vi.fn(),
  onDiscard: vi.fn(),
  onCancel: vi.fn(),
};

describe('ExitGuardModal', () => {
  it('(EG-1) renders nothing when closed', () => {
    const { container } = render(<ExitGuardModal {...props} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('(EG-2) shows the scenario-specific primary label', () => {
    render(<ExitGuardModal {...props} primaryLabel="Save changes" />);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('(EG-3) the primary button saves', async () => {
    const onSave = vi.fn();
    render(<ExitGuardModal {...props} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onSave).toHaveBeenCalled();
  });

  it('(EG-4) Discard discards', async () => {
    const onDiscard = vi.fn();
    render(<ExitGuardModal {...props} onDiscard={onDiscard} />);
    await userEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('(EG-5) Keep editing cancels', async () => {
    const onCancel = vi.fn();
    render(<ExitGuardModal {...props} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
