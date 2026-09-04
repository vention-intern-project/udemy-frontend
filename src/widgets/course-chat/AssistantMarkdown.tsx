import type { ReactNode } from 'react';

export interface AssistantMarkdownProps {
  readonly text: string;
}

interface AssistantMarkdownTextToken {
  readonly kind: 'text';
  readonly value: string;
}

interface AssistantMarkdownCodeToken {
  readonly kind: 'code';
  readonly value: string;
}

interface AssistantMarkdownLinkToken {
  readonly kind: 'link';
  readonly label: string;
  readonly href: string;
}

interface AssistantMarkdownStrongToken {
  readonly kind: 'strong';
  readonly value: string;
}

interface AssistantMarkdownEmphasisToken {
  readonly kind: 'emphasis';
  readonly value: string;
}

type AssistantMarkdownInlineToken =
  | AssistantMarkdownTextToken
  | AssistantMarkdownCodeToken
  | AssistantMarkdownLinkToken
  | AssistantMarkdownStrongToken
  | AssistantMarkdownEmphasisToken;

interface AssistantMarkdownParagraphBlock {
  readonly kind: 'paragraph';
  readonly lines: readonly string[];
  readonly literal: boolean;
}

interface AssistantMarkdownHeadingBlock {
  readonly kind: 'heading';
  readonly level: number;
  readonly text: string;
}

interface AssistantMarkdownUnorderedListBlock {
  readonly kind: 'unordered-list';
  readonly items: readonly string[];
}

interface AssistantMarkdownOrderedListBlock {
  readonly kind: 'ordered-list';
  readonly items: readonly string[];
}

interface AssistantMarkdownCodeBlock {
  readonly kind: 'code';
  readonly text: string;
}

type AssistantMarkdownBlock =
  | AssistantMarkdownParagraphBlock
  | AssistantMarkdownHeadingBlock
  | AssistantMarkdownUnorderedListBlock
  | AssistantMarkdownOrderedListBlock
  | AssistantMarkdownCodeBlock;

interface AssistantMarkdownLinkCandidate {
  readonly source: string;
  readonly end: number;
  readonly label: string | null;
  readonly href: string | null;
}

interface AssistantMarkdownDelimitedToken {
  readonly end: number;
  readonly value: string;
}

const MAX_TOKENS = 4_096;

function isSupportedEscape(value: string): boolean {
  return (
    value === '\\' ||
    value === '`' ||
    value === '*' ||
    value === '[' ||
    value === ']' ||
    value === '(' ||
    value === ')'
  );
}

function appendText(tokens: AssistantMarkdownInlineToken[], value: string) {
  if (value === '') return;
  const previous = tokens[tokens.length - 1];
  if (previous?.kind === 'text') {
    tokens[tokens.length - 1] = { kind: 'text', value: previous.value + value };
    return;
  }
  tokens.push({ kind: 'text', value });
}

function decodeEscapes(value: string): string {
  let decoded = '';
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];
    if (current === '\\' && next !== undefined && isSupportedEscape(next)) {
      decoded += next;
      index += 1;
    } else decoded += current;
  }
  return decoded;
}

function validLinkHref(destination: string): string | null {
  if (
    Array.from(destination).some((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && (code <= 0x1f || code === 0x7f);
    })
  )
    return null;
  try {
    const url = new URL(destination);
    if (
      !url.protocol.match(/^https?:$/u) ||
      url.username !== '' ||
      url.password !== '' ||
      url.host === ''
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

function readLink(value: string, start: number): AssistantMarkdownLinkCandidate | null {
  let labelEnd = start + 1;
  let nestedLabelDepth = 0;
  let hasNestedLabel = false;
  while (labelEnd < value.length) {
    const character = value[labelEnd];
    if (character === '\\' && isSupportedEscape(value[labelEnd + 1] ?? '')) {
      labelEnd += 2;
      continue;
    }
    if (character === '[') {
      hasNestedLabel = true;
      nestedLabelDepth += 1;
      labelEnd += 1;
      continue;
    }
    if (character === ']') {
      if (nestedLabelDepth === 0) break;
      nestedLabelDepth -= 1;
    }
    labelEnd += 1;
  }
  if (labelEnd === value.length) {
    if (hasNestedLabel)
      return { source: value.slice(start), end: value.length, label: null, href: null };
    return null;
  }
  if (value[labelEnd + 1] !== '(') {
    if (hasNestedLabel)
      return {
        source: value.slice(start, labelEnd + 1),
        end: labelEnd + 1,
        label: null,
        href: null,
      };
    return null;
  }
  let destinationEnd = labelEnd + 2;
  let invalidDestination = false;
  while (destinationEnd < value.length) {
    const character = value[destinationEnd];
    if (character === '\\' && isSupportedEscape(value[destinationEnd + 1] ?? '')) {
      destinationEnd += 2;
      continue;
    }
    if (character === '(' || /\s/u.test(character)) {
      invalidDestination = true;
      destinationEnd += 1;
      continue;
    }
    if (character === ')') break;
    destinationEnd += 1;
  }
  if (destinationEnd === value.length) {
    return { source: value.slice(start), end: value.length, label: null, href: null };
  }
  const source = value.slice(start, destinationEnd + 1);
  const labelSource = value.slice(start + 1, labelEnd);
  const destination = value.slice(labelEnd + 2, destinationEnd);
  if (hasNestedLabel || labelSource === '' || destination === '' || invalidDestination)
    return { source, end: destinationEnd + 1, label: null, href: null };
  return {
    source,
    end: destinationEnd + 1,
    label: decodeEscapes(labelSource),
    href: validLinkHref(destination),
  };
}

function readDelimited(
  value: string,
  start: number,
  delimiter: '`',
): AssistantMarkdownDelimitedToken | null {
  const contentStart = start + delimiter.length;
  const close = value.indexOf(delimiter, contentStart);
  if (close === -1 || close === contentStart) return null;
  const content = value.slice(contentStart, close);
  if (content.includes('`')) return null;
  return { end: close + delimiter.length, value: content };
}

function findUnescapedDelimiter(value: string, start: number, delimiter: string): number {
  for (let index = start; index < value.length; ) {
    if (value[index] === '\\' && isSupportedEscape(value[index + 1] ?? '')) {
      index += 2;
      continue;
    }
    if (value.startsWith(delimiter, index)) return index;
    index += 1;
  }
  return -1;
}

function isValidFormattedContent(value: string): boolean {
  if (value === '') return false;
  for (let index = 0; index < value.length; ) {
    const character = value[index];
    if (character === '\\' && isSupportedEscape(value[index + 1] ?? '')) {
      index += 2;
      continue;
    }
    if (character === '`' || character === '[' || character === ']' || character === '*')
      return false;
    index += 1;
  }
  return true;
}

function parseInline(value: string): readonly AssistantMarkdownInlineToken[] {
  const tokens: AssistantMarkdownInlineToken[] = [];
  for (let index = 0; index < value.length; ) {
    if (tokens.length >= MAX_TOKENS) {
      appendText(tokens, value.slice(index));
      break;
    }
    const character = value[index];
    const next = value[index + 1];
    if (character === '\\' && next !== undefined && isSupportedEscape(next)) {
      appendText(tokens, next);
      index += 2;
      continue;
    }
    if (character === '`') {
      const code = readDelimited(value, index, '`');
      if (code !== null) {
        tokens.push({ kind: 'code', value: code.value });
        index = code.end;
        continue;
      }
    }
    if (character === '[') {
      const link = readLink(value, index);
      if (link !== null) {
        if (link.label !== null && link.href !== null)
          tokens.push({ kind: 'link', label: link.label, href: link.href });
        else appendText(tokens, link.source);
        index = link.end;
        continue;
      }
    }
    if (character === '*' && next === '*') {
      const closing = findUnescapedDelimiter(value, index + 2, '**');
      if (closing !== -1) {
        const candidate = value.slice(index + 2, closing);
        if (isValidFormattedContent(candidate))
          tokens.push({ kind: 'strong', value: decodeEscapes(candidate) });
        else appendText(tokens, value.slice(index, closing + 2));
        index = closing + 2;
        continue;
      }
    }
    if (character === '*') {
      const closing = findUnescapedDelimiter(value, index + 1, '*');
      if (closing !== -1) {
        const candidate = value.slice(index + 1, closing);
        if (isValidFormattedContent(candidate))
          tokens.push({ kind: 'emphasis', value: decodeEscapes(candidate) });
        else appendText(tokens, value.slice(index, closing + 1));
        index = closing + 1;
        continue;
      }
    }
    appendText(tokens, character);
    index += 1;
  }
  return tokens;
}

function isFenceOpener(line: string): boolean {
  if (line === '```') return true;
  if (!line.startsWith('```')) return false;
  const label = line.startsWith('``` ') ? line.slice(4) : line.slice(3);
  return label.length >= 1 && label.length <= 32 && /^[A-Za-z0-9._+-]+$/u.test(label);
}

function headingFor(line: string): AssistantMarkdownHeadingBlock | null {
  let level = 0;
  while (line[level] === '#') level += 1;
  if (level < 1 || level > 6 || line[level] !== ' ' || line.length === level + 1) return null;
  return { kind: 'heading', level, text: line.slice(level + 1) };
}

function unorderedItemFor(line: string): string | null {
  return (line.startsWith('- ') || line.startsWith('* ')) && line.length > 2 ? line.slice(2) : null;
}

function orderedItemFor(line: string): string | null {
  let cursor = 0;
  while (cursor < line.length && line.charCodeAt(cursor) >= 48 && line.charCodeAt(cursor) <= 57)
    cursor += 1;
  const digits = line.slice(0, cursor);
  if (
    digits === '' ||
    digits === '0' ||
    digits.startsWith('0') ||
    Number(digits) > 2_147_483_647 ||
    line.slice(cursor, cursor + 2) !== '. ' ||
    cursor + 2 >= line.length
  )
    return null;
  return line.slice(cursor + 2);
}

function parseBlocks(text: string): readonly AssistantMarkdownBlock[] {
  const lines = text.replace(/\r\n?/gu, '\n').split('\n');
  const blocks: AssistantMarkdownBlock[] = [];
  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    if (isFenceOpener(line)) {
      const closing = lines.indexOf('```', index + 1);
      if (closing === -1) {
        blocks.push({ kind: 'paragraph', lines: lines.slice(index), literal: true });
        break;
      }
      blocks.push({ kind: 'code', text: lines.slice(index + 1, closing).join('\n') });
      index = closing + 1;
      continue;
    }
    const heading = headingFor(line);
    if (heading !== null) {
      blocks.push(heading);
      index += 1;
      continue;
    }
    const unordered = unorderedItemFor(line);
    const ordered = orderedItemFor(line);
    if (unordered !== null || ordered !== null) {
      const items: string[] = [];
      if (ordered !== null) {
        while (index < lines.length) {
          const item = orderedItemFor(lines[index]);
          if (item === null) break;
          items.push(item);
          index += 1;
        }
        blocks.push({ kind: 'ordered-list', items });
      } else {
        while (index < lines.length) {
          const item = unorderedItemFor(lines[index]);
          if (item === null) break;
          items.push(item);
          index += 1;
        }
        blocks.push({ kind: 'unordered-list', items });
      }
      continue;
    }
    if (line === '') {
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index] !== '') {
      if (
        paragraph.length > 0 &&
        (isFenceOpener(lines[index]) ||
          headingFor(lines[index]) !== null ||
          unorderedItemFor(lines[index]) !== null ||
          orderedItemFor(lines[index]) !== null)
      )
        break;
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: 'paragraph', lines: paragraph, literal: false });
  }
  return blocks;
}

function renderInline(value: string, keyPrefix: string): ReactNode[] {
  return parseInline(value).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.kind === 'text') return token.value;
    if (token.kind === 'code') return <code key={key}>{token.value}</code>;
    if (token.kind === 'link')
      return (
        <a key={key} href={token.href}>
          {token.label}
        </a>
      );
    if (token.kind === 'strong') return <strong key={key}>{token.value}</strong>;
    return <em key={key}>{token.value}</em>;
  });
}

function renderLines(lines: readonly string[], literal: boolean, keyPrefix: string): ReactNode[] {
  return lines.flatMap((line, index) => [
    ...(index === 0 ? [] : [<br key={`${keyPrefix}-break-${index}`} />]),
    ...(literal ? [line] : renderInline(line, `${keyPrefix}-line-${index}`)),
  ]);
}

function renderListItems(items: readonly string[], keyPrefix: string): ReactNode[] {
  return items.map((item, itemIndex) => (
    <li key={`${keyPrefix}-${itemIndex}`}>{renderInline(item, `${keyPrefix}-${itemIndex}`)}</li>
  ));
}

export function AssistantMarkdown({ text }: AssistantMarkdownProps) {
  return (
    <div>
      {parseBlocks(text).map((block, index) => {
        const key = `assistant-markdown-${index}`;
        if (block.kind === 'paragraph')
          return <p key={key}>{renderLines(block.lines, block.literal, key)}</p>;
        if (block.kind === 'heading') {
          const Heading = `h${block.level}` as keyof JSX.IntrinsicElements;
          return <Heading key={key}>{renderInline(block.text, key)}</Heading>;
        }
        if (block.kind === 'code')
          return (
            <pre key={key}>
              <code>{block.text}</code>
            </pre>
          );
        if (block.kind === 'ordered-list')
          return <ol key={key}>{renderListItems(block.items, key)}</ol>;
        return <ul key={key}>{renderListItems(block.items, key)}</ul>;
      })}
    </div>
  );
}
