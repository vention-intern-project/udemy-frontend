import type { CartDto, CartItemDto, CheckoutDto, MockPaymentCompleteDto } from './dto';
import type { Cart } from './model';
import { readNonNegativeInteger, readPositiveInteger, readRecord, readString } from '@shared/api';

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

export function decodeCartItemDto(value: unknown): CartItemDto {
  const item = readRecord(value, 'cart item');
  const course = readRecord(item.course, 'cart course');
  const courseId = readPositiveInteger(item.course_id, 'cart item course id');
  const decodedCourse = {
    id: readPositiveInteger(course.id, 'cart course id'),
    title: readString(course.title, 'cart course title'),
    price: readString(course.price, 'cart course price'),
    currency: readString(course.currency, 'cart course currency'),
  };
  if (decodedCourse.id !== courseId) throw new TypeError('Invalid cart course identity');
  return {
    id: readPositiveInteger(item.id, 'cart item id'),
    course_id: courseId,
    added_at: readString(item.added_at, 'cart item added_at'),
    course: decodedCourse,
  };
}

export function decodeCartDto(value: unknown): CartDto {
  const response = readRecord(value, 'cart response');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid cart items');
  const items = response.items.map(decodeCartItemDto);
  const itemCount = readNonNegativeInteger(response.item_count, 'cart item count');
  if (itemCount !== items.length) throw new TypeError('Invalid cart item count');
  return { id: readPositiveInteger(response.id, 'cart id'), items, total_price: readString(response.total_price, 'cart total price'), currency: readString(response.currency, 'cart currency'), item_count: itemCount };
}

export function decodeCheckoutDto(value: unknown): CheckoutDto {
  const response = readRecord(value, 'checkout response');
  return { message: readString(response.message, 'checkout message'), enrolled_courses: readNonNegativeInteger(response.enrolled_courses, 'checkout enrolled courses') };
}

export function decodeMockPaymentCompleteDto(value: unknown): MockPaymentCompleteDto {
  const response = readRecord(value, 'mock payment response');
  const status = readString(response.status, 'mock payment status');
  if (status !== 'active' && status !== 'cancelled') throw new TypeError('Invalid mock payment status');
  return { enrollment_id: readPositiveInteger(response.enrollment_id, 'mock payment enrollment id'), status, message: readString(response.message, 'mock payment message') };
}
