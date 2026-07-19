import type { CartDto } from './dto';
import type { Cart } from './model';

export function mapCartDto(dto: CartDto): Cart {
  return {
    id: dto.id,
    items: dto.items.map((item) => ({
      id: item.id,
      courseId: item.course_id,
      addedAt: item.added_at,
      course: { ...item.course },
    })),
    totalPrice: dto.total_price,
    currency: dto.currency,
    itemCount: dto.item_count,
  };
}
