export interface UserRecord {
  id: string;
  username: string;
  name?: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name?: string;
}
