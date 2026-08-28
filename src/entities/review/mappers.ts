import {
  decodePaginationEnvelope,
  readNullableString,
  readPositiveInteger,
  readRecord,
  readString,
} from '@shared/api';

import type { ReviewDto, ReviewListDto } from './dto';

const REVIEW_PAGINATION_FIELDS = {
  items: 'items',
  page: 'page',
  pageSize: 'page_size',
  total: 'total',
  pages: 'pages',
  hasNext: 'has_next',
  hasPrevious: 'has_previous',
} as const;

function readReviewRating(value: unknown): number {
  const rating = readPositiveInteger(value, 'review rating');
  if (rating > 5) throw new TypeError('Invalid review rating');
  return rating;
}

export function decodeReviewDto(value: unknown): ReviewDto {
  const review = readRecord(value, 'review');
  return {
    id: readPositiveInteger(review.id, 'review id'),
    course_id: readPositiveInteger(review.course_id, 'review course id'),
    user_id: readPositiveInteger(review.user_id, 'review user id'),
    rating: readReviewRating(review.rating),
    comment: readNullableString(review.comment, 'review comment'),
    created_at: readString(review.created_at, 'review created at'),
    updated_at: readString(review.updated_at, 'review updated at'),
  };
}

export function decodeReviewListDto(value: unknown): ReviewListDto {
  const response = decodePaginationEnvelope(value, {
    context: 'review list',
    decodeItem: decodeReviewDto,
    fields: REVIEW_PAGINATION_FIELDS,
  });
  return {
    items: [...response.items],
    page: response.page,
    page_size: response.pageSize,
    total: response.total,
    pages: response.pages,
    has_next: response.hasNext,
    has_previous: response.hasPrevious,
  };
}
