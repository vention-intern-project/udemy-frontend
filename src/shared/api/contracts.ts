export interface PaginationDto<TItem> {
  items: TItem[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PageQueryDto {
  page?: number;
  page_size?: number;
}
