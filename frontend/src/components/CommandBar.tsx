import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Zap } from 'lucide-react';

interface CommandBarProps {
  hasQuery: boolean;
  isMouseMode: boolean;
  isLiveMode: boolean;
  onToggleMouseMode: () => void;
  onToggleLiveMode: () => void;
  onClearConsole?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  hasQuery,
  isMouseMode,
  isLiveMode,
  onToggleMouseMode,
  onToggleLiveMode,
  onClearConsole,
}) => {
  return (
    <div className="h-10 flex items-center gap-2 px-3 border-b border-white/10 bg-[#0f1416]">
      {/* Mouse and Live buttons removed - now only available in Visual Output Panel */}
      <div className="ml-auto flex items-center gap-2">
        {onClearConsole && (
          <Button onClick={onClearConsole} variant="destructive" size="sm" title="Clear Console">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-[#e5eef2]/60">
          <Zap className="h-3 w-3" />
          <span>Enter to run • Ctrl+L focus • Ctrl+Shift+X clear</span>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;

