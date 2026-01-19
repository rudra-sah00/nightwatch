import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <h1 className="text-8xl font-bold gradient-text mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-white mb-2">
                    Page Not Found
                </h2>
                <p className="text-white/60 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link href="/">
                    <Button variant="primary">Go Home</Button>
                </Link>
            </div>
        </div>
    );
}
