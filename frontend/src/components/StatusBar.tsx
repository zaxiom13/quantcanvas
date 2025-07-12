import { Button } from './ui/button';

interface StatusBarProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onClear: () => void;
}

export function StatusBar({ isConnected, onConnect, onDisconnect, onClear }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={onConnect} disabled={isConnected} variant="outline" size="sm">
          Connect
        </Button>
        <Button onClick={onDisconnect} disabled={!isConnected} variant="outline" size="sm">
          Disconnect
        </Button>
        <Button onClick={onClear} variant="outline" size="sm">
          Clear
        </Button>
      </div>
    </div>
  );
} 