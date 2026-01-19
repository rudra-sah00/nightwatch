'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

        return (
            <div style={{ width: '100%', marginBottom: '1rem' }}>
                {label && (
                    <label
                        htmlFor={inputId}
                        style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.8)',
                            marginBottom: '0.5rem',
                        }}
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: error
                            ? '1px solid rgba(239, 68, 68, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s ease-out',
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = error
                            ? 'rgba(239, 68, 68, 0.7)'
                            : 'rgba(255, 255, 255, 0.3)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = error
                            ? 'rgba(239, 68, 68, 0.5)'
                            : 'rgba(255, 255, 255, 0.1)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    className={className}
                    {...props}
                />
                {error && (
                    <p style={{
                        marginTop: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'rgb(248, 113, 113)',
                    }}>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
