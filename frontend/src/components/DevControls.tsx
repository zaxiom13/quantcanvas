import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StartKdb, StopKdb, RestartKdb, ForceStartKdb, ResetKdbServer } from 'wailsjs/go/main/App';
import { toast } from 'sonner';

export function DevControls() {
  const [isLoading, setIsLoading] = useState(false);

  const handleBackendAction = useCallback(async (action: 'stop' | 'restart' | 'force-start') => {
    setIsLoading(true);
    // A mapping for more descriptive toast messages
    const actionText = {
      'stop': { present: 'Stopping', past: 'stopped' },
      'restart': { present: 'Restarting', past: 'restarted' },
      'force-start': { present: 'Force starting', past: 'force started' }
    };

    const promise = () => {
      switch (action) {
        case 'stop':
          return StopKdb();
        case 'restart':
          return RestartKdb();
        case 'force-start':
          return ForceStartKdb();
      }
    };

    toast.promise(promise(), {
      loading: `${actionText[action].present} KDB+...`,
      success: `KDB+ ${actionText[action].past} successfully!`,
      error: (err: any) => `Failed to ${action.replace('-', ' ')} KDB+: ${err}`,
      finally: () => setIsLoading(false),
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 pt-2">
      <Button onClick={() => handleBackendAction('restart')} disabled={isLoading} variant="default">
        Restart
      </Button>
      <Button onClick={() => handleBackendAction('stop')} disabled={isLoading} variant="outline">
        Stop
      </Button>
      <Button
        onClick={() => handleBackendAction('force-start')}
        disabled={isLoading}
        variant="destructive"
        className="col-span-2 mt-2"
      >
        Force Start
      </Button>
      <Button
        onClick={() => {
          setIsLoading(true);
          // Get the reset command from the backend
          ResetKdbServer().then(resetCommand => {
            // Show confirmation dialog
            const confirmed = window.confirm(
              'Are you sure you want to reset the KDB server?\n\n' +
              'This will:\n' +
              '• Delete ALL variables and tables\n' +
              '• Clear ALL server state\n' +
              '• Reset the KDB environment\n\n' +
              'This action cannot be undone!'
            );

            if (!confirmed) {
              setIsLoading(false);
              return;
            }

            toast.promise(
              () => ResetKdbServer(),
              {
                loading: 'Resetting KDB+ server...',
                success: 'KDB+ server reset successfully!',
                error: (err: any) => `Failed to reset KDB+ server: ${err}`,
                finally: () => setIsLoading(false),
              }
            );
          });
        }}
        disabled={isLoading}
        variant="outline"
        className="col-span-2 mt-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-600"
      >
        Reset Server
      </Button>
    </div>
  );
}
