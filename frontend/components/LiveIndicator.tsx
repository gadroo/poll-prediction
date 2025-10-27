import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  isConnected: boolean;
}

export function LiveIndicator({ isConnected }: LiveIndicatorProps) {
  return (
    <Badge
      variant={isConnected ? 'default' : 'secondary'}
      className="flex items-center gap-1"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Disconnected</span>
        </>
      )}
    </Badge>
  );
}

