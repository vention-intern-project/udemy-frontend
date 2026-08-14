import {
  readBoolean,
  readNonNegativeInteger,
  readPositiveInteger,
  readRecord,
} from './runtime-validation';

export interface PaginationEnvelope<TItem> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface PaginationCollection<TItem> {
  readonly items: readonly TItem[];
  readonly total: number;
  readonly pageSize: number;
  readonly pages: number;
}

export interface PaginationEnvelopeFields {
  readonly items: string;
  readonly page: string;
  readonly pageSize: string;
  readonly total: string;
  readonly pages: string;
  readonly hasNext: string;
  readonly hasPrevious: string;
}

export interface PaginationEnvelopeOptions<TItem> {
  readonly context: string;
  readonly decodeItem: (value: unknown) => TItem;
  readonly fields: PaginationEnvelopeFields;
}

export interface PaginationCollectorOptions<TItem> {
  readonly context: string;
  readonly signal: AbortSignal;
  readonly maximumPages: number;
  readonly fetchPage: (page: number) => Promise<PaginationEnvelope<TItem>>;
  readonly identifyItem: (item: TItem) => string | number;
}

function invalidPagination(context: string): TypeError {
  return new TypeError(`Invalid ${context} pagination`);
}

function invalidTotal(context: string): TypeError {
  return new TypeError(`Invalid ${context} total`);
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('The operation was aborted', 'AbortError');
}

export function decodePaginationEnvelope<TItem>(
  value: unknown,
  options: PaginationEnvelopeOptions<TItem>,
): PaginationEnvelope<TItem> {
  try {
    const response = readRecord(value, options.context);
    const rawItems = response[options.fields.items];
    if (!Array.isArray(rawItems)) throw invalidPagination(options.context);

    const page = readPositiveInteger(response[options.fields.page], `${options.context} page`);
    const pageSize = readPositiveInteger(
      response[options.fields.pageSize],
      `${options.context} page size`,
    );
    const total = readNonNegativeInteger(
      response[options.fields.total],
      `${options.context} total`,
    );
    const pages = readNonNegativeInteger(
      response[options.fields.pages],
      `${options.context} pages`,
    );
    const hasNext = readBoolean(response[options.fields.hasNext], `${options.context} has next`);
    const hasPrevious = readBoolean(
      response[options.fields.hasPrevious],
      `${options.context} has previous`,
    );
    const items = rawItems.map(options.decodeItem);
    const expectedPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const remainingItems = Math.max(0, total - (page - 1) * pageSize);
    const itemLimit = Math.min(pageSize, remainingItems);

    if (
      pages !== expectedPages ||
      page > Math.max(1, pages) ||
      items.length > itemLimit ||
      hasNext !== page < pages ||
      hasPrevious !== page > 1
    ) {
      throw invalidPagination(options.context);
    }

    return { items, page, pageSize, total, pages, hasNext, hasPrevious };
  } catch (error) {
    if (error instanceof TypeError && error.message === `Invalid ${options.context} pagination`)
      throw error;
    throw invalidPagination(options.context);
  }
}

export async function collectPaginationPages<TItem>(
  options: PaginationCollectorOptions<TItem>,
): Promise<PaginationCollection<TItem>> {
  const items: TItem[] = [];
  const identities = new Set<string | number>();
  let expectedPages: number | null = null;
  let expectedTotal: number | null = null;
  let expectedPageSize: number | null = null;

  for (let page = 1; expectedPages === null || page <= expectedPages; page += 1) {
    assertNotAborted(options.signal);
    const envelope = await options.fetchPage(page);

    if (envelope.page !== page) throw invalidPagination(options.context);
    if (expectedPages === null) {
      if (envelope.pages > options.maximumPages) throw invalidPagination(options.context);
      expectedPages = envelope.pages;
      expectedTotal = envelope.total;
      expectedPageSize = envelope.pageSize;
    } else if (
      envelope.pages !== expectedPages ||
      envelope.total !== expectedTotal ||
      envelope.pageSize !== expectedPageSize
    ) {
      throw invalidPagination(options.context);
    }

    for (const item of envelope.items) {
      const identity = options.identifyItem(item);
      if (identities.has(identity)) throw invalidPagination(options.context);
      identities.add(identity);
      items.push(item);
    }
  }

  if (items.length !== expectedTotal) throw invalidTotal(options.context);
  return {
    items,
    total: expectedTotal ?? 0,
    pageSize: expectedPageSize ?? 0,
    pages: expectedPages ?? 0,
  };
}
