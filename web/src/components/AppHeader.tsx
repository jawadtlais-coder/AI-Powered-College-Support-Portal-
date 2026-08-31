'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { AUTH_TOKEN_CHANGED_EVENT, clearToken, getToken } from '@/lib/auth';

function subscribeToAuthToken(onStoreChange: () => void) {
  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);

  return () => {
    window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getAuthTokenSnapshot() {
  return Boolean(getToken());
}

function getAuthTokenServerSnapshot() {
  return false;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const hasToken = useSyncExternalStore(
    subscribeToAuthToken,
    getAuthTokenSnapshot,
    getAuthTokenServerSnapshot,
  );

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <header className="topbar">
      <Link href="/" className="row" style={{ fontWeight: 700 }}>
        <span className="badge">College Support</span>
      </Link>
      <nav>
        <Link href="/privacy" className={pathname === '/privacy' ? 'badge' : ''}>
          Privacy
        </Link>
        <Link href="/terms" className={pathname === '/terms' ? 'badge' : ''}>
          Terms
        </Link>
        {hasToken ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register" className="badge">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
