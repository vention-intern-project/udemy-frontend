export interface CartItemAddDto {
  course_id: number;
}

export interface CartCourseSummaryDto {
  id: number;
  title: string;
  price: string;
  currency: string;
}

export interface CartItemDto {
  id: number;
  course_id: number;
  added_at: string;
  course: CartCourseSummaryDto;
}

export interface CartDto {
  id: number;
  items: CartItemDto[];
  total_price: string;
  currency: string;
  item_count: number;
}

export interface CheckoutDto {
  message: string;
  enrolled_courses: number;
}
