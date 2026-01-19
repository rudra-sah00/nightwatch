'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { LoginForm } from '@/features/auth/components';
import { Toast } from '@/components/feedback';

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading, forceLogoutMessage, clearForceLogoutMessage } = useAuth();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <main
                style={{
                    minHeight: '100vh',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '3rem', height: '3rem' }}>
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: '2px solid transparent',
                                borderTopColor: '#ffffff',
                                animation: 'spin 1s linear infinite',
                            }}
                        />
                    </div>
                </div>
            </main>
        );
    }

    if (isAuthenticated) {
        return null;
    }

    return (
        <main
            style={{
                minHeight: '100vh',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {forceLogoutMessage && (
                <Toast
                    message={forceLogoutMessage}
                    type="warning"
                    onClose={clearForceLogoutMessage}
                />
            )}

            <div
                style={{
                    width: '100%',
                    maxWidth: '28rem',
                    animation: 'fadeIn 0.5s ease-out forwards',
                }}
            >
                {/* Logo/Brand */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '5rem',
                            height: '5rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <img
                            src="/play.ico"
                            alt="Watch Rudra"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <h1
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Watch Rudra
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Sign in to continue</p>
                </div>

                {/* Login Card */}
                <div
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '1.5rem',
                        padding: '2rem',
                        boxShadow: '0 0 30px rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <LoginForm />
                </div>

                {/* Footer */}
                <p
                    style={{
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontSize: '0.75rem',
                        marginTop: '2rem',
                    }}
                >
                    Secure single-session authentication
                </p>
            </div>
        </main>
    );
}
