import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Markdown from '../../../../../src/components/ui/Markdown';

describe('Markdown', () => {
  it('(MK-1) renders headings from Markdown syntax', () => {
    render(<Markdown>{'## Section title'}</Markdown>);
    expect(screen.getByRole('heading', { level: 2, name: 'Section title' })).toBeInTheDocument();
  });

  it('(MK-2) renders bold and italic emphasis', () => {
    const { container } = render(<Markdown>{'**bold** and _italic_'}</Markdown>);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('(MK-3) renders links with an href', () => {
    render(<Markdown>{'[Verita](https://verita.dev)'}</Markdown>);
    expect(screen.getByRole('link', { name: 'Verita' })).toHaveAttribute('href', 'https://verita.dev');
  });

  it('(MK-4) renders images with alt text and src', () => {
    render(<Markdown>{'![a cat](https://img/c.png)'}</Markdown>);
    expect(screen.getByRole('img', { name: 'a cat' })).toHaveAttribute('src', 'https://img/c.png');
  });

  it('(MK-5) supports GFM strikethrough', () => {
    const { container } = render(<Markdown>{'~~gone~~'}</Markdown>);
    expect(container.querySelector('del')?.textContent).toBe('gone');
  });
});
