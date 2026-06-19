import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageTopics from '../../../../src/pages/Digest/ManageTopics';

// Minimal deterministic topic data
vi.mock('../../../../src/services/content.service', () => ({
  contentService: {
    getTopicCategories: () => [
      {
        id: 'cat-a',
        label: 'Category A',
        sortOrder: 0,
        topics: [
          { id: 'alpha', name: 'alpha', displayName: 'Alpha', sortOrder: 0, totalPostCount: 10, postsThisWeek: 2, postsPrevWeek: 1, activityScore: 0.5, isHot: false, followerCount: 100 },
          { id: 'beta',  name: 'beta',  displayName: 'Beta',  sortOrder: 1, totalPostCount: 8,  postsThisWeek: 1, postsPrevWeek: 1, activityScore: 0.4, isHot: false, followerCount: 80  },
          { id: 'gamma', name: 'gamma', displayName: 'Gamma', sortOrder: 2, totalPostCount: 5,  postsThisWeek: 1, postsPrevWeek: 1, activityScore: 0.3, isHot: false, followerCount: 60  },
        ],
      },
    ],
  },
}));

describe('ManageTopics', () => {
  let onToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onToggle = vi.fn();
  });

  it('(MT-1) renders followed topics before unfollowed on initial load', () => {
    render(
      <ManageTopics followedTopics={new Set(['gamma'])} onToggle={onToggle} />
    );
    const buttons = screen.getAllByRole('button', { name: /Follow|Following/i });
    // gamma is followed — its button text is "Following"
    // alpha and beta are unfollowed — their buttons are "Follow"
    // gamma should appear before alpha and beta in the DOM
    const allTexts = buttons.map(b => b.textContent);
    // First button should be "Following" (gamma) then "Follow" twice
    expect(allTexts[0]).toBe('Following');
    expect(allTexts[1]).toBe('Follow');
    expect(allTexts[2]).toBe('Follow');
  });

  it('(MT-2) follow-pill shows correct followed count', () => {
    render(
      <ManageTopics followedTopics={new Set(['alpha', 'beta'])} onToggle={onToggle} />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('(MT-3) clicking Follow fires onToggle with the correct tag', async () => {
    render(
      <ManageTopics followedTopics={new Set()} onToggle={onToggle} />
    );
    const followButton = screen.getAllByRole('button', { name: /Follow Alpha/i })[0];
    await userEvent.click(followButton);
    expect(onToggle).toHaveBeenCalledWith('alpha');
  });

  it('(MT-4) clicking Following (unfollow) fires onToggle with the correct tag', async () => {
    render(
      <ManageTopics followedTopics={new Set(['beta'])} onToggle={onToggle} />
    );
    const unfollowButton = screen.getByRole('button', { name: /Unfollow Beta/i });
    await userEvent.click(unfollowButton);
    expect(onToggle).toHaveBeenCalledWith('beta');
  });

  it('(MT-5) search filters topics by displayName', async () => {
    render(
      <ManageTopics followedTopics={new Set()} onToggle={onToggle} />
    );
    const input = screen.getByPlaceholderText('Filter topics…');
    await userEvent.type(input, 'Alph');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
  });

  it('(MT-6) search matches by slug (name) too', async () => {
    render(
      <ManageTopics followedTopics={new Set()} onToggle={onToggle} />
    );
    const input = screen.getByPlaceholderText('Filter topics…');
    await userEvent.type(input, 'gamma');
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('(MT-7) clearing search restores all topics', async () => {
    render(
      <ManageTopics followedTopics={new Set()} onToggle={onToggle} />
    );
    const input = screen.getByPlaceholderText('Filter topics…');
    await userEvent.type(input, 'Alph');
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    await userEvent.clear(input);
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });
});
