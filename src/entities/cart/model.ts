export interface Cart {
  id: number;
  items: Array<{
    id: number;
    courseId: number;
    addedAt: string;
    course: { id: number; title: string; price: string; currency: string };
  }>;
  totalPrice: string;
  currency: string;
  itemCount: number;
}
