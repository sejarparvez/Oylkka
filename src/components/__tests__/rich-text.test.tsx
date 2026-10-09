import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { RichText } from '@/components/rich-text';

describe('RichText', () => {
  it('renders level-2 headings with the heading tag', () => {
    render(<RichText content='## Shipping Rates' />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Shipping Rates');
  });

  it('renders level-3 headings', () => {
    render(<RichText content='### Within Dhaka' />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Within Dhaka',
    );
  });

  it('renders list items', () => {
    render(<RichText content={'- First\n- Second'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders plain and bold paragraphs', () => {
    render(<RichText content={'Plain line\n**Bold line**'} />);
    expect(screen.getByText('Plain line')).toBeTruthy();
    expect(screen.getByText('Bold line')).toBeTruthy();
  });

  it('never renders embedded markup as HTML', () => {
    render(<RichText content={'<script>alert(1)</script>'} />);
    // The text is escaped, so no executable script node is created.
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
  });
});
