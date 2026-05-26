import client from './client';

interface AuthResponse {
  token: string;
  user: { id: number; email: string; name: string };
}

export function register(email: string, password: string, name: string) {
  return client.post<AuthResponse>('/auth/register', { email, password, name });
}

export function login(email: string, password: string) {
  return client.post<AuthResponse>('/auth/login', { email, password });
}

export function getMe() {
  return client.get<AuthResponse['user']>('/auth/me');
}
