'use client';

import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GuestGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for session termination message on mount
  useEffect(() => {
    const message = sessionStorage.getItem('session_terminated_message');
    if (message) {
      setSessionMessage(message);
      sessionStorage.removeItem('session_terminated_message');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionMessage('');
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        // Redirect to original URL or home
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-zinc-800/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        {/* Session Termination Message */}
        {sessionMessage && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-blue-400 text-sm font-medium block">Session Ended</span>
              <span className="text-blue-300/80 text-sm">{sessionMessage}</span>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-700/50 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400 text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-300">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className={cn(
                    'bg-black/50 border-zinc-700 text-white placeholder-zinc-600',
                    'focus:border-white/50 focus:ring-white/20 transition-all'
                  )}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className={cn(
                    'bg-black/50 border-zinc-700 text-white placeholder-zinc-600',
                    'focus:border-white/50 focus:ring-white/20 transition-all'
                  )}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full py-6 font-semibold transition-all duration-200',
                  'bg-white text-black hover:bg-zinc-200',
                  'shadow-lg shadow-white/10 hover:shadow-white/20'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-zinc-600 text-sm mt-6">Contact admin for access</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}
