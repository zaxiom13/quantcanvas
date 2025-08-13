import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Mouse } from 'lucide-react';

interface CommandBarProps {
  hasQuery: boolean;
  isMouseMode: boolean;
  isLiveMode: boolean;
  onToggleMouseMode: () => void;
  onToggleLiveMode: () => void;
  onClearConsole?: () => void;
  mouseX?: number;
  mouseY?: number;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  hasQuery,
  isMouseMode,
  isLiveMode,
  onToggleMouseMode,
  onToggleLiveMode,
  onClearConsole: _onClearConsole,
  mouseX,
  mouseY,
}) => {
  return (
    <div className="h-10 flex items-center gap-2 px-3 border-b border-white/10 bg-[#0f1416]">
      {/* Mouse and Live buttons removed - now only available in Visual Output Panel */}
      <div className="ml-auto flex items-center gap-2">
        {(typeof mouseX === 'number' && typeof mouseY === 'number') && (
          <div className="hidden md:flex items-center gap-1 text-[11px] text-[#e5eef2]/70">
            <Mouse className="h-3 w-3" />
            <span>mouseX:{mouseX.toFixed(3)}, mouseY:{mouseY.toFixed(3)}</span>
          </div>
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

