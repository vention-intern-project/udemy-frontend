import type { PaginationDto } from '@shared/api';

export interface ReviewDto {
  id: number;
  course_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreateDto {
  rating: number;
  comment: string | null;
}

export interface ReviewUpdateDto {
  rating: number;
  comment: string | null;
}

export type ReviewListDto = PaginationDto<ReviewDto>;

export interface ReviewPageQueryDto {
  page: number;
  page_size: 20;
}
