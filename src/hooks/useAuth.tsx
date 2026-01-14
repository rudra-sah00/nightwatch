'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    isAuthenticated,
    getStoredUser,
    logout as apiLogout,
    getCurrentUser
} from '@/lib/api';

interface User {
    id: string;
    username: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            if (isAuthenticated()) {
                const storedUser = getStoredUser();
                if (storedUser) {
                    setUser(storedUser);
                } else {
                    const result = await getCurrentUser();
                    if (result.data) {
                        setUser(result.data);
                    }
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (username: string, password: string) => {
        const { login: apiLoginFn } = await import('@/lib/api');
        const result = await apiLoginFn(username, password);

        if (result.data) {
            setUser(result.data.user);
            return { success: true };
        }

        return { success: false, error: result.error || 'Login failed' };
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isLoggedIn: !!user,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
