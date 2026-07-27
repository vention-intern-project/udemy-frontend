import { describe, expect, it } from 'vitest';

import {
  decodeCourseDetailDto,
  decodeLessonListDto,
  mapCourseDetailDto,
  mapLessonListDto,
} from '../../../src/entities/course';

const lesson = {
  id: 3,
  title: 'Welcome',
  lesson_type: 'video',
  download_url: '/media/lessons/private.mp4',
  description: null,
  is_published: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('course detail transport boundary', () => {
  it('preserves exact course metadata while removing lesson links from the domain model', () => {
    const detail = mapCourseDetailDto(decodeCourseDetailDto({
      id: 7,
      title: 'React foundations',
      description: 'Build reliable interfaces.',
      price: '19.9900',
      currency: 'USD',
      published_at: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
      lessons: [lesson],
    }));

    expect(detail).toEqual(expect.objectContaining({
      id: 7,
      instructorId: 2,
      instructorName: 'Ada Lovelace',
      price: '19.9900',
      publishedAt: null,
    }));
    expect(detail.lessons[0]).toEqual(expect.objectContaining({ id: 3, title: 'Welcome' }));
    expect(detail.lessons[0]).not.toHaveProperty('downloadUrl');
  });

  it.each([
    ['/media/lessons/private.mp4', 'populated'],
    [null, 'redacted'],
  ])('maps %s link fixture to identical metadata-only outline (%s)', (downloadUrl, _fixtureName) => {
    const outline = mapLessonListDto(decodeLessonListDto({
      items: [{ ...lesson, download_url: downloadUrl }],
      page: 1,
      page_size: 100,
      total: 1,
      pages: 1,
      has_next: false,
      has_previous: false,
    }));

    expect(outline.items).toEqual([{
      id: 3,
      title: 'Welcome',
      lessonType: 'video',
      description: null,
      isPublished: true,
    }]);
    expect(JSON.stringify(outline)).not.toContain('/media/lessons/');
  });

  it('rejects malformed success pagination', () => {
    expect(() => decodeLessonListDto({
      items: [], page: 1, page_size: 100, total: 1, pages: 0,
      has_next: false, has_previous: false,
    })).toThrow(/pagination/i);
  });

  it.each([
    ['page count', { items: [lesson], page: 1, page_size: 100, total: 101, pages: 1, has_next: false, has_previous: false }],
    ['page bounds', { items: [lesson], page: 2, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: true }],
    ['next flag', { items: [lesson], page: 1, page_size: 100, total: 101, pages: 2, has_next: false, has_previous: false }],
    ['previous flag', { items: [lesson], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: true }],
    ['item limit', { items: [lesson, { ...lesson, id: 4 }], page: 1, page_size: 1, total: 2, pages: 2, has_next: true, has_previous: false }],
    ['items exceed total', { items: [lesson], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false }],
  ])('rejects invalid lesson pagination %s', (_caseName, payload) => {
    expect(() => decodeLessonListDto(payload)).toThrow(/pagination/i);
  });
});
