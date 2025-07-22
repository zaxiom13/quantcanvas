import React, { useState } from 'react';
import { 
  BookOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Terminal,
  Tent,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsDialog } from './SettingsDialog';
import chaptersData from '@/data/chapters.json';

interface Chapter {
  id: string;
  number: string;
  title: string;
  fullTitle: string;
  content: string;
  granularType: 'chapter' | 'subsection';
  parentChapter?: string;
  parentNumber?: string;
  type?: 'h2' | 'h3';
  level?: number;
  depth?: number;
}

interface NavigationSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onLearningGuideOpen: () => void;
  onChapterSelect: (chapter: Chapter) => void;
  isDevMode: boolean;
  onDevModeChange: (isDevMode: boolean) => void;
}

// Get chapter icons
const getChapterIcon = (chapter: Chapter) => {
  const iconMap: { [key: string]: string } = {
    'Overview': '📖',
    'Q Shock and Awe': '⚡',
    'Basic Data Types: Atoms': '🔢',
    'Lists': '📋',
    'Operators': '⚙️',
    'Dictionaries': '📚',
    'Functions': '🔧',
    'Transforming Data': '🔄',
    'Tables': '📊',
    'Queries: q-sql': '🔍',
    'Execution Control': '🎮',
    'I/O': '💾',
    'Workspace Organization': '🏢',
    'Commands and System Variables': '⌨️',
    'Introduction to Kdb+': '🚀',
    'Built-in Functions': '📦',
    'Error Messages': '⚠️'
  };
  return iconMap[chapter.title] || '📄';
};

// Transform chapters data to include granularType
const transformChapters = (chapters: any[]): Chapter[] => {
  return chapters.map(chapter => ({
    ...chapter,
    granularType: 'chapter' as const
  }));
};

// Filter and sort chapters (exclude duplicates and sort properly)
const qForMortalsChapters = transformChapters(chaptersData as any[])
  .filter(chapter => chapter.number !== 'Q' && chapter.number !== 'Preface')
  .sort((a, b) => {
    const aNum = parseInt(a.number) || (a.number === 'A' ? 100 : 101);
    const bNum = parseInt(b.number) || (b.number === 'A' ? 100 : 101);
    return aNum - bNum;
  });

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  isCollapsed,
  onToggle,
  activeView,
  onViewChange,
  onLearningGuideOpen,
  onChapterSelect,
  isDevMode,
  onDevModeChange
}) => {
  const [isQForMortalsExpanded, setIsQForMortalsExpanded] = useState(false);
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
          
          {/* Main Navigation - Scrollable */}
          <nav className="flex-1 p-2 overflow-y-auto">
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
                      <div className="font-medium">Basics</div>
                      <div className="text-xs text-offBlack/70 mt-1">KDB+ Reference</div>
                    </div>
                  )}
                </div>
              </Button>

              {/* Q for Mortals Chapters Section */}
              {!isCollapsed && (
                <div className="mt-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-4 py-3 h-auto hover:bg-fadedBlue8 text-offBlack border-b border-offBlack16"
                    onClick={() => setIsQForMortalsExpanded(!isQForMortalsExpanded)}
                  >
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5" />
                      <div className="ml-3 flex-1 text-left">
                        <div className="font-medium">Q for Mortals</div>
                        <div className="text-xs text-offBlack/70 mt-1">Complete reference guide</div>
                      </div>
                      {isQForMortalsExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                  {isQForMortalsExpanded && (
                    <div className="space-y-1 mt-2 transition-all duration-200">
                      {qForMortalsChapters.map((chapter) => (
                        <Button
                          key={chapter.id}
                          variant="ghost"
                          className="w-full justify-start px-4 py-2 h-auto text-xs hover:bg-fadedBlue8 text-offBlack ml-4"
                          onClick={() => onChapterSelect(chapter)}
                        >
                          <div className="flex items-center">
                            <span className="text-sm mr-2">{getChapterIcon(chapter)}</span>
                            <span className="text-left truncate">{chapter.fullTitle}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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