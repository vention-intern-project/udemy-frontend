import type { PageQueryDto, PaginationDto } from '../../shared/api';

export type LessonTypeDto = 'video' | 'text' | 'pdf';

export interface InstructorDto {
  id: number;
  name: string;
  surname: string;
}

export interface CourseWriteDto {
  title?: string | null;
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
}

export interface CourseDto {
  id: number;
  instructor_id: number;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonWriteDto {
  title?: string | null;
  lesson_type?: LessonTypeDto | null;
  description?: string | null;
  is_published?: boolean | null;
}

export interface LessonDto {
  id: number;
  course_id: number;
  title: string;
  lesson_type: LessonTypeDto;
  download_url: string | null;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type LessonDetailDto = Omit<LessonDto, 'course_id'>;

export interface CourseDetailDto extends Omit<CourseDto, 'instructor_id'> {
  instructor: InstructorDto;
  lessons: LessonDetailDto[];
}

export interface LessonBriefDto {
  id: number;
  title: string;
}

export interface CourseListItemDto {
  id: number;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  published_at: string | null;
  instructor: InstructorDto;
  lessons: LessonBriefDto[];
}

export type CourseListDto = PaginationDto<CourseListItemDto>;
export type LessonListDto = PaginationDto<Omit<LessonDto, 'course_id'>>;

export interface CourseListQueryDto extends PageQueryDto {
  search_query?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'id' | '-id' | 'title' | '-title' | 'price' | '-price' | 'created_at' | '-created_at';
}

export interface LessonPageQueryDto {
  page?: number;
  size?: number;
}

export interface DeleteMessageDto {
  message: string;
}
