'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Something went wrong
                </h2>
                <p className="text-muted-foreground mb-8">
                    An unexpected error occurred. Please try again.
                </p>
                <Button onClick={reset} variant="default">
                    Try Again
                </Button>
            </div>
        </div>
    );
}
