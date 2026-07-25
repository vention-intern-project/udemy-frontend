export interface CartCourseSummary {
  id: number;
  title: string;
  price: string;
  currency: string;
}

export interface CartItem {
  id: number;
  courseId: number;
  addedAt: string;
  course: CartCourseSummary;
}

export interface Cart {
  id: number;
  items: CartItem[];
  totalPrice: string;
  currency: string;
  itemCount: number;
}
