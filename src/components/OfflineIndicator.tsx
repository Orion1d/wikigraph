import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[2000] animate-fade-in">
      {!isOnline ? (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You're offline - cached content available</span>
        </div>
      ) : showReconnected ? (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Back online</span>
        </div>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
