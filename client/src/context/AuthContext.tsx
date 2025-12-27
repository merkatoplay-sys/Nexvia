import React, { ReactNode } from 'react';
import { useAuth as useReplitAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export { useAuth } from '@/hooks/use-auth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useReplitAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Redirect to login if not authenticated (except on login/api routes)
    if (!isLoading && !isAuthenticated && location !== '/login' && !location.startsWith('/api')) {
      window.location.href = '/api/login';
    }
  }, [isAuthenticated, isLoading, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return <>{children}</>;
};
