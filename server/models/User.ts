import { RowDataPacket } from 'mysql2';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow extends RowDataPacket, User {}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export const sanitizeUser = (user: User): UserResponse => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
