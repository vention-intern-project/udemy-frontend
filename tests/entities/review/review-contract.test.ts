import { describe, expect, it } from 'vitest';

import { decodeReviewListDto, decodeReviewDto } from '@entities/review';

const review = {
  id: 11,
  course_id: 7,
  user_id: 9,
  rating: 5,
  comment: 'Clear explanation.',
  created_at: '2026-08-28T09:00:00Z',
  updated_at: '2026-08-28T09:30:00Z',
};

describe('review transport boundary', () => {
  it('decodes only the verified review fields and integer rating range', () => {
    expect(decodeReviewDto(review)).toEqual(review);
    expect(() => decodeReviewDto({ ...review, rating: null })).toThrow(TypeError);
    expect(() => decodeReviewDto({ ...review, rating: 4.5 })).toThrow(TypeError);
    expect(() => decodeReviewDto({ ...review, rating: 0 })).toThrow(TypeError);
  });

  it('rejects inconsistent review pagination metadata', () => {
    expect(() =>
      decodeReviewListDto({
        items: [review],
        page: 1,
        page_size: 20,
        total: 1,
        pages: 2,
        has_next: false,
        has_previous: false,
      }),
    ).toThrow(TypeError);
  });
});
