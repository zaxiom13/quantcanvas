import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DevControls } from '@/components/DevControls';
import { Settings } from 'lucide-react';
import { ReactNode } from 'react';

interface SettingsDialogProps {
  isDevMode: boolean;
  onDevModeChange: (isDevMode: boolean) => void;
  children?: ReactNode;
}

export function SettingsDialog({ isDevMode, onDevModeChange, children }: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <button className="bg-blue text-white border-2 border-blue rounded-lg p-2 shadow-sm hover:bg-blue/90 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white border-2 border-offBlack16 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-blue font-bold text-xl">Settings</DialogTitle>
          <DialogDescription className="text-offBlack/70">
            Manage application settings and developer options.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dev-mode"
              checked={isDevMode}
              onCheckedChange={onDevModeChange}
            />
            <Label htmlFor="dev-mode" className="text-offBlack font-medium">Developer Mode</Label>
          </div>
        </div>
        {isDevMode && <DevControls />}
      </DialogContent>
    </Dialog>
  );
} 