'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui';
import { Toast } from '@/components/feedback';

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    isLoading,
    isAuthenticated,
    logout,
    forceLogoutMessage,
    clearForceLogoutMessage,
  } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
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

  if (!isAuthenticated || !user) {
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
        {/* Welcome Card */}
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
          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '6rem',
                  height: '6rem',
                  borderRadius: '50%',
                  background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Online indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '0.25rem',
                  right: '0.25rem',
                  width: '1.25rem',
                  height: '1.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(34, 197, 94)',
                  border: '4px solid #000000',
                }}
              />
            </div>
          </div>

          {/* Welcome Text */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Welcome back!
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)' }}>
              {user.name}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {user.email}
            </p>
          </div>

          {/* Session Info */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', color: 'rgba(255, 255, 255, 0.6)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Session Active
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ID: {user.sessionId.slice(0, 8)}...
                </p>
              </div>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(34, 197, 94)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* WebSocket Status */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', color: 'rgba(255, 255, 255, 0.6)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Real-time Connection
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                  WebSocket connected
                </p>
              </div>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(34, 197, 94)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Info Note */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
              <strong style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Single Session Mode:</strong>{' '}
              If you login from another device, this session will be automatically terminated.
            </p>
          </div>

          {/* Logout Button */}
          <Button
            variant="secondary"
            size="lg"
            style={{ width: '100%' }}
            onClick={logout}
          >
            <svg
              style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </Button>
        </div>
      </div>
    </main>
  );
}
