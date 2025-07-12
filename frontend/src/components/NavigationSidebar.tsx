import React from 'react';
import { 
  BookOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Terminal,
  Tent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsDialog } from './SettingsDialog';

interface NavigationSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onLearningGuideOpen: () => void;
  isDevMode: boolean;
  onDevModeChange: (isDevMode: boolean) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  isCollapsed,
  onToggle,
  activeView,
  onViewChange,
  onLearningGuideOpen,
  isDevMode,
  onDevModeChange
}) => {
  return (
    <Card className={`${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 border-r-2 border-offBlack16 bg-gradient-to-b from-white to-fadedBlue8 shadow-lg rounded-none`}>
      <CardContent className="p-0 h-full">
        <div className="flex flex-col h-full">
          {/* Header with toggle button */}
          <div className="p-4 border-b border-offBlack16 flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-bold text-offBlack">QuantCanvas</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-blue hover:text-blue hover:bg-fadedBlue8"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Main Navigation */}
          <nav className="flex-1 p-2">
            <div className="space-y-2">
              <Button
                variant={activeView === 'console' ? "secondary" : "ghost"}
                className={`w-full justify-start transition-all duration-200 ${
                  isCollapsed ? 'px-2' : 'px-4'
                } ${
                  activeView === 'console' 
                    ? 'bg-fadedBlue16 text-blue border-l-4 border-blue' 
                    : 'hover:bg-fadedBlue8 text-offBlack'
                }`}
                onClick={() => onViewChange('console')}
              >
                <div className="flex items-center">
                  <Terminal className="h-5 w-5" />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-medium">KDB Console</div>
                      <div className="text-xs text-offBlack/70 mt-1">Interactive terminal</div>
                    </div>
                  )}
                </div>
              </Button>
              
              <Button
                variant={activeView === 'awning' ? "secondary" : "ghost"}
                className={`w-full justify-start transition-all duration-200 ${
                  isCollapsed ? 'px-2' : 'px-4'
                } ${
                  activeView === 'awning' 
                    ? 'bg-fadedBlue16 text-blue border-l-4 border-blue' 
                    : 'hover:bg-fadedBlue8 text-offBlack'
                }`}
                onClick={() => onViewChange('awning')}
              >
                <div className="flex items-center">
                  <Tent className="h-5 w-5" />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-medium">Awning Demo</div>
                      <div className="text-xs text-offBlack/70 mt-1">Shop front awnings</div>
                    </div>
                  )}
                </div>
              </Button>
              
              <Button
                variant="ghost"
                className={`w-full justify-start transition-all duration-200 ${
                  isCollapsed ? 'px-2' : 'px-4'
                } hover:bg-fadedBlue8 text-offBlack`}
                onClick={onLearningGuideOpen}
              >
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5" />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-medium">Learning Guide</div>
                      <div className="text-xs text-offBlack/70 mt-1">KDB+ Reference</div>
                    </div>
                  )}
                </div>
              </Button>
            </div>
          </nav>
          
          {/* Bottom section - Settings */}
          <div className="p-2 border-t border-offBlack16">
            <SettingsDialog isDevMode={isDevMode} onDevModeChange={onDevModeChange}>
              <Button
                variant="ghost"
                className={`w-full justify-start hover:bg-fadedBlue8 text-offBlack ${
                  isCollapsed ? 'px-2' : 'px-4'
                }`}
              >
                <Settings className="h-5 w-5" />
                {!isCollapsed && <span className="ml-3">Settings</span>}
              </Button>
            </SettingsDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 