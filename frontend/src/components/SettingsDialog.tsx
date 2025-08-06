import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DevControls } from '@/components/DevControls';
import { Settings } from 'lucide-react';
import { ReactNode } from 'react';

interface SettingsDialogProps {
  children?: ReactNode;
}

export function SettingsDialog({ children }: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <button
            className="bg-blue text-white rounded-lg p-3 hover:bg-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white border border-gray-300 rounded-xl shadow-xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-semibold text-gray-900">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="border-t border-gray-200 pt-4">
            <DevControls />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
