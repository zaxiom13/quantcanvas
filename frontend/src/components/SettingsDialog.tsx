import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
          <Button variant="outline" size="sm" aria-label="Settings" className="px-3">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#0f1416] border border-white/10 rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] text-[#e5eef2]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-[#e5eef2]">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="border-t border-white/10 pt-4">
            <DevControls />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
