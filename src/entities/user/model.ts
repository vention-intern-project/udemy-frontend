export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserProfile {
  email: string;
  name: string;
  surname: string;
  role: UserRole;
  birthday: string | null;
  phoneNumber: string | null;
  createdAt: string;
}

export interface AuthToken {
  accessToken: string;
}
