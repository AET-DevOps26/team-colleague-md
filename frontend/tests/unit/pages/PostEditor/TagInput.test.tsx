import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput from '../../../../src/pages/PostEditor/components/TagInput';
import type { TopicItem } from '../../../../src/types';

const topic = (name: string, displayName = name): TopicItem => ({
  id: name, name, displayName, sortOrder: 0, totalPostCount: 0,
  postsThisWeek: 0, postsPrevWeek: 0, activityScore: 0, isHot: false, followerCount: 0,
});

describe('TagInput', () => {
  it('(TI-1) renders the current tags as chips', () => {
    render(<TagInput tags={['llms', 'agents']} onChange={vi.fn()} searchTopics={vi.fn()} />);
    expect(screen.getByText('#llms')).toBeInTheDocument();
    expect(screen.getByText('#agents')).toBeInTheDocument();
  });

  it('(TI-2) removing a chip emits the remaining tags', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['llms', 'agents']} onChange={onChange} searchTopics={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove llms/i }));
    expect(onChange).toHaveBeenCalledWith(['agents']);
  });

  it('(TI-3) typing surfaces topic suggestions from searchTopics', async () => {
    const searchTopics = vi.fn().mockResolvedValue([topic('rag', 'RAG')]);
    render(<TagInput tags={[]} onChange={vi.fn()} searchTopics={searchTopics} />);
    await userEvent.type(screen.getByRole('textbox'), 'ra');
    expect(await screen.findByRole('option', { name: /RAG/i })).toBeInTheDocument();
    expect(searchTopics).toHaveBeenCalled();
  });

  it('(TI-4) clicking a suggestion adds that topic and clears the input', async () => {
    const onChange = vi.fn();
    const searchTopics = vi.fn().mockResolvedValue([topic('rag', 'RAG')]);
    render(<TagInput tags={[]} onChange={onChange} searchTopics={searchTopics} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'ra');
    await userEvent.click(await screen.findByRole('option', { name: /RAG/i }));
    expect(onChange).toHaveBeenCalledWith(['rag']);
    expect(input.value).toBe('');
  });

  it('(TI-5) pressing Enter creates a new slugified tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} searchTopics={vi.fn().mockResolvedValue([])} />);
    await userEvent.type(screen.getByRole('textbox'), 'Fine Tuning{Enter}');
    expect(onChange).toHaveBeenCalledWith(['fine-tuning']);
  });

  it('(TI-6) Backspace on an empty input removes the last tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['llms', 'agents']} onChange={onChange} searchTopics={vi.fn()} />);
    const input = screen.getByRole('textbox');
    input.focus();
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['llms']);
  });

  it('(TI-7) does not add a duplicate tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['llms']} onChange={onChange} searchTopics={vi.fn().mockResolvedValue([])} />);
    await userEvent.type(screen.getByRole('textbox'), 'llms{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('(TI-8) shows a searching indicator as soon as the user types, before results resolve', async () => {
    let resolve!: (v: TopicItem[]) => void;
    const searchTopics = vi.fn().mockReturnValue(new Promise<TopicItem[]>((r) => { resolve = r; }));
    render(<TagInput tags={[]} onChange={vi.fn()} searchTopics={searchTopics} />);
    await userEvent.type(screen.getByRole('textbox'), 'ra');
    expect(await screen.findByText('Searching…')).toBeInTheDocument();
    resolve([topic('rag', 'RAG')]);
    expect(await screen.findByRole('option', { name: /RAG/i })).toBeInTheDocument();
  });
});
