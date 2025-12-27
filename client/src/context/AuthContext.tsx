import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  role: 'admin';
  businessName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin user hardcoded for MVP
const ADMIN_USER: User = {
  id: 'admin-tenant-id-001',
  email: 'admin@streaming.com',
  role: 'admin',
  businessName: 'Admin Business'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage on load
    const storedUser = localStorage.getItem('streaming_app_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('streaming_app_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    // Simple mock login - accepts any email/password for now as requested
    // "El login es solo para identificar al usuario administrador"
    if (!email || !password) {
      toast.error('Por favor ingresa email y contraseña');
      return false;
    }

    // Simulate API call
    const newUser = {
      ...ADMIN_USER,
      email: email // Allow using the email provided
    };

    setUser(newUser);
    localStorage.setItem('streaming_app_user', JSON.stringify(newUser));
    toast.success(`Bienvenido, ${email}`);
    setLocation('/');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('streaming_app_user');
    setLocation('/login');
    toast.info('Sesión cerrada');
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-white">Cargando...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
