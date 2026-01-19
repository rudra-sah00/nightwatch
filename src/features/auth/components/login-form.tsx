'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { loginSchema, LoginInput } from '@/features/auth';
import { Button, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ApiError } from '@/types';
import { AlertCircle } from 'lucide-react';
import { z } from 'zod';

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
        if (fieldErrors[name as keyof typeof fieldErrors]) {
            setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const errors: typeof fieldErrors = {};
            result.error.issues.forEach((err: z.ZodIssue) => {
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
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className={cn(
                    "flex items-center gap-2 rounded-lg p-3 text-sm border",
                    error.toLowerCase().includes('locked')
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : error.toLowerCase().includes('warning')
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-destructive/15 text-destructive border-destructive/20"
                )}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <Input
                    id="email"
                    type="text"
                    name="email"
                    placeholder="Email or username"
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    autoComplete="username"
                    disabled={isLoading}
                    className="bg-secondary/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="bg-secondary/50"
                />
            </div>

            <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full text-base font-semibold mt-6"
            >
                Sign In
            </Button>
        </form>
    );
}
