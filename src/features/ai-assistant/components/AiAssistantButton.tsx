import { X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiAssistantButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function AiAssistantButton({
  isOpen,
  onClick,
  className,
}: AiAssistantButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'h-14 w-14 rounded-full shadow-2xl transition-all duration-300 z-50',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        // Rotate animation when toggling
        isOpen && 'rotate-90 bg-destructive text-white hover:bg-destructive/90',
        className,
      )}
      aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
    >
      {isOpen ? (
        <X className="h-8 w-8 transition-transform duration-300" />
      ) : (
        <Image
          src="/ai.svg"
          alt="AI Assistant"
          width={32}
          height={32}
          className="h-8 w-8 transition-transform duration-300"
        />
      )}
    </Button>
  );
}
