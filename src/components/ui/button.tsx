'use client';

import React, { ButtonHTMLAttributes, forwardRef, CSSProperties } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            style,
            ...props
        },
        ref
    ) => {
        const baseStyles: CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500,
            borderRadius: '0.75rem',
            transition: 'all 0.2s ease-out',
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
            opacity: disabled || isLoading ? 0.5 : 1,
            border: 'none',
            outline: 'none',
        };

        const variantStyles: Record<string, CSSProperties> = {
            primary: {
                backgroundColor: '#ffffff',
                color: '#000000',
            },
            secondary: {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            ghost: {
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
            },
        };

        const sizeStyles: Record<string, CSSProperties> = {
            sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
            md: { padding: '0.625rem 1.25rem', fontSize: '1rem' },
            lg: { padding: '0.875rem 1.5rem', fontSize: '1.125rem' },
        };

        const combinedStyles: CSSProperties = {
            ...baseStyles,
            ...variantStyles[variant],
            ...sizeStyles[size],
            ...style,
        };

        return (
            <button
                ref={ref}
                style={combinedStyles}
                disabled={disabled || isLoading}
                onMouseEnter={(e) => {
                    if (variant === 'primary') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                    } else if (variant === 'secondary') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (variant === 'primary') {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'scale(1)';
                    } else if (variant === 'secondary') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                }}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            style={{
                                animation: 'spin 1s linear infinite',
                                marginRight: '0.5rem',
                                width: '1rem',
                                height: '1rem',
                            }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                style={{ opacity: 0.25 }}
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                style={{ opacity: 0.75 }}
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Loading...
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
