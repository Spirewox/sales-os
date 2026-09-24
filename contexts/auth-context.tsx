'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContextType } from '@/types';
import { useWhoAmI } from '@/hooks/use-queries';
import { axiosPost } from '@/lib/api';
import { clearWhoAmICache } from '@/lib/whoami-cache';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: user,
    isError,
    isPending,
    refetch,
  } = useWhoAmI();

  // Only block when there is no cached/resolved user yet
  const loading = isPending && !user;

  useEffect(() => {
    if (!isError) return;
    clearWhoAmICache();
    queryClient.setQueryData(['whoami'], null);
  }, [isError, queryClient]);

  const login = async (email: string, password: string) => {
    await axiosPost('auth/login', { identifier: email, password }, true);
    await refetch();
    router.replace('/');
  };

  const logout = async () => {
    try {
      await axiosPost('auth/logout', {}, true);
    } finally {
      clearWhoAmICache();
      queryClient.setQueryData(['whoami'], null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
        error: isError,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
