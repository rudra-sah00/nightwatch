'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { loginSchema, LoginInput } from '@/features/auth';
import { Button, Input } from '@/components/ui';
import { ApiError } from '@/types';

export function LoginForm() {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<LoginInput>({
        email: '',
        password: '',
    });
    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        password?: string;
    }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: LoginInput) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (fieldErrors[name as keyof typeof fieldErrors]) {
            setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        // Validate with Zod
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const errors: typeof fieldErrors = {};
            result.error.errors.forEach((err) => {
                const field = err.path[0] as keyof typeof fieldErrors;
                if (field) {
                    errors[field] = err.message;
                }
            });
            setFieldErrors(errors);
            return;
        }

        setIsLoading(true);

        try {
            await login(formData);
        } catch (err: unknown) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div
                    style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <p style={{ fontSize: '0.875rem', color: 'rgb(248, 113, 113)' }}>
                        {error}
                    </p>
                </div>
            )}

            <Input
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                autoComplete="email"
                disabled={isLoading}
            />

            <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
                autoComplete="current-password"
                disabled={isLoading}
            />

            <div style={{ marginTop: '0.5rem' }}>
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    style={{ width: '100%' }}
                >
                    Sign In
                </Button>
            </div>
        </form>
    );
}
