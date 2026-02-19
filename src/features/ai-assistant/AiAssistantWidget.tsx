'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AiAssistantButton } from './components/AiAssistantButton';

export function AiAssistantWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show the floating button if we're already on the AI Assistant page
  if (!user || pathname === '/ai-assistant') return null;

  const navigateToAi = () => {
    router.push('/ai-assistant');
  };

  return (
    <div className="fixed z-[100] bottom-6 right-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toggle Button - Now acting as a navigation trigger */}
      <AiAssistantButton isOpen={false} onClick={navigateToAi} />
    </div>
  );
}
