import type {
  AcademicDepartment,
  SupportArea,
} from './routing';

export type AuthPayload = {
  sub: string;
  schoolId: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  exp: number;
};

export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';
const TOKEN_STORAGE_KEY = 'accessToken';

function notifyTokenChanged(): void {
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function decodeJwt(token: string): AuthPayload | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as AuthPayload;
  } catch {
    return null;
  }
}

function isTokenCurrent(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

export function saveToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  notifyTokenChanged();
}

export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  notifyTokenChanged();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return null;
  }

  if (!isTokenCurrent(token)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }

  return token;
}
