'use client';

import { Crown, Shield } from 'lucide-react';

interface RoleIconProps {
  role: 'HOST' | 'ADMIN' | null;
}

export function RoleIcon({ role }: RoleIconProps) {
  if (role === 'HOST') {
    return <Crown className="w-3 h-3 text-amber-400" />;
  }
  if (role === 'ADMIN') {
    return <Shield className="w-3 h-3 text-blue-400" />;
  }
  return null;
}
