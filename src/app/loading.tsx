import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <Loader2 className="w-16 h-16 text-white animate-spin" />
    </div>
  );
}
