import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  LayoutGrid, 
  Settings,
  BarChart3
} from 'lucide-react';
import { LearningGuide } from '@/components/LearningGuide';
import BookPanel from '@/components/BookPanel';
import ReferencePanel from '@/components/ReferencePanel';
import VisualOutputPanel from '@/components/VisualOutputPanel';
import SettingsPanel from '@/components/SettingsPanel';
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

interface RightDockProps {
  onApplyQuery?: (query: string) => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onChapterSelect?: (chapter: Chapter) => void;
  selectedChapter?: Chapter | null;
  visualData?: any;
  isMouseMode?: boolean;
  isLiveMode?: boolean;
  onToggleMouseMode?: () => void;
  onToggleLiveMode?: () => void;
  hasQuery?: boolean;
  lastQuery?: string;
  readingPosition?: import('@/lib/saveState').ReadingPosition | null;
  onPositionChange?: (position: import('@/lib/saveState').ReadingPosition | null) => void;
}

export const RightDock: React.FC<RightDockProps> = React.memo(({ 
  onApplyQuery, 
  activeView, 
  onViewChange, 
  onChapterSelect,
  selectedChapter,
  visualData,
  isMouseMode,
  isLiveMode,
  onToggleMouseMode,
  onToggleLiveMode,
  hasQuery,
  lastQuery,
  readingPosition,
  onPositionChange,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'reference' | 'book' | 'chapter' | 'visual' | 'settings' | 'layout'>('guide');
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="h-full w-full overflow-hidden border-white/10 bg-[#0f1416] flex flex-col">
      <CardHeader className="p-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Navigation tab removed */}
            <Button
              variant={activeTab === 'guide' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'guide' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('guide')}
              title="KDB+ Basics & Examples"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Guide
            </Button>
            <Button
              variant={activeTab === 'reference' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'reference' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('reference')}
              title="Reference"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Ref
            </Button>
            <Button
              variant={activeTab === 'book' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'book' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('book')}
              title="Book"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Book
            </Button>
            <Button
              variant={activeTab === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'visual' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('visual')}
              title="Visual Output"
            >
              <BarChart3 className="h-3 w-3 mr-1" /> Visual
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'settings' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="Settings"
            >
              <Settings className="h-3 w-3 mr-1" /> Settings
            </Button>
            <Button
              variant={activeTab === 'layout' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-xs px-2 ${activeTab === 'layout' ? 'border-neon-500/40' : ''}`}
              onClick={() => setActiveTab('layout')}
              title="Workspace"
            >
              <LayoutGrid className="h-3 w-3 mr-1" /> Layout
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full w-full overflow-hidden">
          {/* Navigation content removed */}
          {activeTab === 'guide' && (
            <div className="h-full overflow-hidden flex flex-col">
              <LearningGuide isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} onApplyQuery={onApplyQuery} />
            </div>
          )}
          {activeTab === 'reference' && (
            <ReferencePanel />
          )}
          {activeTab === 'book' && (
            <BookPanel
              onApplyQuery={onApplyQuery}
              onViewChange={onViewChange}
              selectedChapter={selectedChapter || null}
              onChapterSelect={onChapterSelect}
              readingPosition={readingPosition || null}
              onPositionChange={onPositionChange}
            />
          )}
          {activeTab === 'visual' && (
            <VisualOutputPanel
              data={visualData}
              isMouseMode={!!isMouseMode}
              isLiveMode={!!isLiveMode}
              onToggleMouseMode={onToggleMouseMode || (() => {})}
              onToggleLiveMode={onToggleLiveMode || (() => {})}
              hasQuery={!!hasQuery}
              lastQuery={lastQuery}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel />
          )}
          {activeTab === 'layout' && (
            <div className="h-full flex items-center justify-center text-[#e5eef2]/60">Coming soon: custom workspace widgets</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default RightDock;