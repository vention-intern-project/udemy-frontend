export type LessonType = 'video' | 'text' | 'pdf';

export interface Course {
  id: number;
  instructorId: number;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  lessonType: LessonType;
  downloadUrl: string | null;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCourse {
  id: number;
  title: string;
  description: string | null;
  instructorName: string;
  price: string;
  currency: string;
  totalLessonCount: number;
  isPublished: boolean;
}

export interface CatalogCourseList {
  items: readonly CatalogCourse[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
