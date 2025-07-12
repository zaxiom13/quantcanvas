import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StartKdb, StopKdb, RestartKdb, ForceStartKdb } from 'wailsjs/go/main/App';
import { toast } from 'sonner';

export function DevControls() {
  const [isLoading, setIsLoading] = useState(false);

  const handleBackendAction = useCallback(async (action: 'start' | 'stop' | 'restart' | 'force-start') => {
    setIsLoading(true);
    const promise = () => {
      switch (action) {
        case 'start':
          return StartKdb();
        case 'stop':
          return StopKdb();
        case 'restart':
          return RestartKdb();
        case 'force-start':
          return ForceStartKdb();
      }
    };

    toast.promise(promise(), {
      loading: `Executing ${action}...`,
      success: `Successfully executed ${action}!`,
      error: (err) => `Failed to execute ${action}: ${err}`,
      finally: () => setIsLoading(false),
    });
  }, []);

  return (
    <div className="space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <h3 className="font-semibold">Developer Controls</h3>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleBackendAction('start')} disabled={isLoading} variant="secondary">
          Start KDB+
        </Button>
        <Button onClick={() => handleBackendAction('stop')} disabled={isLoading} variant="secondary">
          Stop KDB+
        </Button>
        <Button onClick={() => handleBackendAction('restart')} disabled={isLoading} variant="secondary">
          Restart KDB+
        </Button>
        <Button onClick={() => handleBackendAction('force-start')} disabled={isLoading} variant="destructive">
          Force Start KDB+
        </Button>
      </div>
    </div>
  );
} 