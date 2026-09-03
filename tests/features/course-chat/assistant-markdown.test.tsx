// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssistantMarkdown } from '../../../src/widgets/course-chat/AssistantMarkdown';

describe('AssistantMarkdown', () => {
  it('renders headings, paragraphs, lists, inline code, emphasis, and a safe link', () => {
    const { container } = render(
      <AssistantMarkdown
        text={
          '## Plan\n\nFirst line\nsecond line\n\n- Alpha\n- Beta\n\n1. First\n2. Second\n\nUse `npm test` now\n\n**Important** and *note*\n\n[Docs](HTTPS://example.com/a)'
        }
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Plan' })).toBeTruthy();
    expect(container.querySelectorAll('p')[0]?.querySelectorAll('br')).toHaveLength(1);
    expect(container.querySelector('ul')?.textContent).toBe('AlphaBeta');
    expect(container.querySelector('ol')?.textContent).toBe('FirstSecond');
    expect(screen.getByText('npm test', { selector: 'code' })).toBeTruthy();
    expect(screen.getByText('Important', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText('note', { selector: 'em' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe(
      'https://example.com/a',
    );
  });

  it.each(['```ts', '``` ts'])('renders MC-001 %s fenced code as inert code', (opener) => {
    const { container } = render(
      <AssistantMarkdown text={`${opener}\nconst x = '<b>';\n\`\`\``} />,
    );
    expect(container.querySelector('pre code')?.textContent).toBe("const x = '<b>'; ".trim());
    expect(container.querySelectorAll('b')).toHaveLength(0);
  });

  it('renders supported escaped delimiters inside valid strong and emphasis content', () => {
    const { container } = render(<AssistantMarkdown text={'**a\\*b** and *a\\*b*'} />);

    expect(container.querySelector('strong')?.textContent).toBe('a*b');
    expect(container.querySelector('em')?.textContent).toBe('a*b');
  });

  it('keeps empty strong and an unclosed delimiter/link outside a fence literal', () => {
    const emptyStrong = render(<AssistantMarkdown text="****" />);
    expect(emptyStrong.container.textContent).toBe('****');
    expect(emptyStrong.container.querySelectorAll('strong')).toHaveLength(0);
    emptyStrong.unmount();

    const source = '*open [Docs](https://example.com';
    const unclosed = render(<AssistantMarkdown text={source} />);
    expect(unclosed.container.textContent).toBe(source);
    expect(unclosed.container.querySelectorAll('em, a')).toHaveLength(0);
  });

  it('keeps unsafe links, raw HTML, escaped delimiters, nesting, and unclosed syntax literal', () => {
    const source =
      '[js](javascript:alert) [data](data:text/plain,x) [mail](mailto:a@b.test) [auth](https://u:p@example.com/)';
    const unsafe = render(<AssistantMarkdown text={source} />);
    expect(unsafe.container.textContent).toBe(source);
    expect(unsafe.container.querySelectorAll('a')).toHaveLength(0);
    unsafe.unmount();

    const malformed = render(<AssistantMarkdown text={'[broken](https://example.com/a b)'} />);
    expect(malformed.container.textContent).toBe('[broken](https://example.com/a b)');
    expect(malformed.container.querySelectorAll('a')).toHaveLength(0);
    malformed.unmount();

    const html = render(<AssistantMarkdown text={'<img src=x onerror=alert(1)> &copy;'} />);
    expect(html.container.textContent).toBe('<img src=x onerror=alert(1)> &copy;');
    expect(html.container.querySelectorAll('img')).toHaveLength(0);
    html.unmount();

    const literal = render(
      <AssistantMarkdown
        text={
          '\\*not emphasis\\* and \\[x\\]\n\n**outer *inner***\n\n```\n# not heading\n\n*open [Docs](https://example.com'
        }
      />,
    );
    expect(literal.container.textContent).toContain('*not emphasis* and [x]');
    expect(literal.container.textContent).toContain('**outer *inner***');
    expect(literal.container.textContent).toContain(
      '```# not heading*open [Docs](https://example.com',
    );
    expect(literal.container.querySelectorAll('a, strong, em, h1, pre')).toHaveLength(0);
  });

  it('keeps a malformed nested-label link atomic before parsing the following link', () => {
    const malformedSource = '[outer [Docs](https://example.com/a)](https://example.com/b)';
    const { container } = render(
      <AssistantMarkdown text={`${malformedSource} then [Later](https://example.com/c)`} />,
    );

    const paragraph = container.querySelector('p');
    expect(paragraph?.childNodes[0]?.textContent).toBe(`${malformedSource} then `);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Later' }).getAttribute('href')).toBe(
      'https://example.com/c',
    );
  });
});
