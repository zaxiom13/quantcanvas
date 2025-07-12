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

interface SettingsDialogProps {
  isDevMode: boolean;
  onDevModeChange: (isDevMode: boolean) => void;
}

export function SettingsDialog({ isDevMode, onDevModeChange }: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-black text-green-300 border-4 border-green-500 p-1 hover:bg-green-800/20">
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
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
            <Label htmlFor="dev-mode">Developer Mode</Label>
          </div>
        </div>
        {isDevMode && <DevControls />}
      </DialogContent>
    </Dialog>
  );
} 