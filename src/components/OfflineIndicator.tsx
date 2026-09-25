import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xl border border-amber-300">
      <WifiOff className="w-4 h-4 animate-bounce" />
      <span>Offline Mode — All decks & synthesizer loops cached!</span>
    </div>
  );
};
