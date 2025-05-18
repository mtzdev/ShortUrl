export interface User {
  username: string;
  email: string;
}

export interface Link {
  id: string;
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
}