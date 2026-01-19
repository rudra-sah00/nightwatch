'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from 'react';
import { User, ForceLogoutPayload } from '@/types';
import { getStoredUser, storeUser, clearStoredUser } from '@/lib/auth';
import { initSocket, disconnectSocket, onForceLogout, offForceLogout } from '@/lib/ws';
import { loginUser, logoutUser, LoginInput } from '@/features/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: LoginInput) => Promise<void>;
    logout: () => Promise<void>;
    forceLogoutMessage: string | null;
    clearForceLogoutMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [forceLogoutMessage, setForceLogoutMessage] = useState<string | null>(null);
    const forceLogoutHandlerRef = useRef<((payload: ForceLogoutPayload) => void) | null>(null);

    // Handle force logout from WebSocket
    const handleForceLogout = useCallback((payload: ForceLogoutPayload) => {
        console.log('🚫 Force logout received:', payload);
        setForceLogoutMessage(payload.message);
        clearStoredUser();
        disconnectSocket();
        setUser(null);
    }, []);

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedUser = getStoredUser();
        if (storedUser) {
            setUser(storedUser);
            // Connect WebSocket with stored credentials
            initSocket(storedUser.id, storedUser.sessionId);
            forceLogoutHandlerRef.current = handleForceLogout;
            onForceLogout(handleForceLogout);
        }
        setIsLoading(false);

        return () => {
            if (forceLogoutHandlerRef.current) {
                offForceLogout(forceLogoutHandlerRef.current);
            }
            disconnectSocket();
        };
    }, [handleForceLogout]);

    const login = useCallback(async (data: LoginInput) => {
        const response = await loginUser(data);
        const { user: loggedInUser } = response;

        // Store user
        storeUser(loggedInUser);
        setUser(loggedInUser);

        // Clear any previous force logout message
        setForceLogoutMessage(null);

        // Initialize WebSocket connection
        initSocket(loggedInUser.id, loggedInUser.sessionId);
        forceLogoutHandlerRef.current = handleForceLogout;
        onForceLogout(handleForceLogout);
    }, [handleForceLogout]);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearStoredUser();
            disconnectSocket();
            setUser(null);
        }
    }, []);

    const clearForceLogoutMessage = useCallback(() => {
        setForceLogoutMessage(null);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        forceLogoutMessage,
        clearForceLogoutMessage,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
