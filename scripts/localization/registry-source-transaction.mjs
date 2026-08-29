function same(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((value, index) => same(value, right[index]));
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const keys = Object.keys(left).sort();
  const other = Object.keys(right).sort();
  return (
    keys.length === other.length &&
    keys.every((key, index) => key === other[index] && same(left[key], right[key]))
  );
}
function fail() {
  throw new Error('registry source is malformed JSON');
}
function space(source, index) {
  while (/\s/.test(source[index] ?? '')) index += 1;
  return index;
}
function string(source, index) {
  if (source[index] !== '"') fail();
  let escaped = false;
  for (let cursor = index + 1; cursor < source.length; cursor += 1) {
    if (escaped) escaped = false;
    else if (source[cursor] === '\\') escaped = true;
    else if (source[cursor] === '"') return { start: index, end: cursor + 1, type: 'string' };
  }
  fail();
}
function node(source, index) {
  const start = space(source, index);
  const character = source[start];
  if (character === '"') return string(source, start);
  if (character === '{') {
    const properties = [];
    let cursor = space(source, start + 1);
    if (source[cursor] === '}') return { start, end: cursor + 1, type: 'object', properties };
    while (cursor < source.length) {
      const key = string(source, cursor);
      const name = JSON.parse(source.slice(key.start, key.end));
      cursor = space(source, key.end);
      if (source[cursor] !== ':') fail();
      const value = node(source, cursor + 1);
      properties.push({ name, value });
      cursor = space(source, value.end);
      if (source[cursor] === '}') return { start, end: cursor + 1, type: 'object', properties };
      if (source[cursor] !== ',') fail();
      cursor = space(source, cursor + 1);
    }
    fail();
  }
  if (character === '[') {
    const values = [];
    let cursor = space(source, start + 1);
    if (source[cursor] === ']') return { start, end: cursor + 1, type: 'array', values };
    while (cursor < source.length) {
      const value = node(source, cursor);
      values.push(value);
      cursor = space(source, value.end);
      if (source[cursor] === ']') return { start, end: cursor + 1, type: 'array', values };
      if (source[cursor] !== ',') fail();
      cursor = space(source, cursor + 1);
    }
    fail();
  }
  let end = start;
  while (end < source.length && !/[\s,}\]]/.test(source[end])) end += 1;
  try {
    JSON.parse(source.slice(start, end));
    return { start, end, type: 'scalar' };
  } catch {
    fail();
  }
}
function direct(root, name) {
  const matches = root.properties.filter((item) => item.name === name);
  if (matches.length !== 1)
    throw new Error(`registry source requires exactly one direct ${name} property`);
  return matches[0].value;
}
function rootOf(source, corpus) {
  const root = node(source, 0);
  if (
    root.type !== 'object' ||
    space(source, root.end) !== source.length ||
    !same(JSON.parse(source), corpus)
  )
    throw new Error('registry source structurally drifted from current corpus');
  return root;
}
function formatted(value, source, target) {
  const line = source.lastIndexOf('\n', target.start) + 1;
  const indent = source.slice(line, target.start).length;
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((part, index) => (index === 0 ? part : `${' '.repeat(indent)}${part}`))
    .join('\n');
}
function patch(source, replacements) {
  let next = source;
  for (const { target, text } of replacements.sort(
    (left, right) => right.target.start - left.target.start,
  ))
    next = `${next.slice(0, target.start)}${text}${next.slice(target.end)}`;
  return next;
}
export function serializeRevisedRegistry({ source, corpus, next }) {
  const units = direct(rootOf(source, corpus), 'units');
  if (
    units.type !== 'array' ||
    units.values.length !== corpus.units.length ||
    next.units.length !== corpus.units.length
  )
    throw new Error('registry source revision requires a stable direct units array');
  const out = patch(
    source,
    units.values.flatMap((target, index) =>
      same(corpus.units[index], next.units[index])
        ? []
        : [{ target, text: formatted(next.units[index], source, target) }],
    ),
  );
  if (!same(JSON.parse(out), next))
    throw new Error('registry source revision serializer structurally drifted from next corpus');
  return out;
}
export function serializeConsumerGrammarRegistry({ source, corpus, next }) {
  const target = direct(rootOf(source, corpus), 'consumerGrammar');
  const out = patch(source, [{ target, text: formatted(next.consumerGrammar, source, target) }]);
  if (!same(JSON.parse(out), next))
    throw new Error(
      'registry source reconciliation serializer structurally drifted from next corpus',
    );
  return out;
}
