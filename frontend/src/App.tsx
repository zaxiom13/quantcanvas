import React from 'react';
import { KdbConsole } from '@/KdbConsole';
import { Toaster } from '@/components/ui/sonner';
import { SimpleVisualOutput } from '@/components/SimpleVisualOutput';
import { Header } from '@/components/Header';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { ReferenceCard } from '@/components/ReferenceCard';
import { EnhancedChapterModal } from '@/components/EnhancedChapterModal';
import { saveStateManager, ReadingPosition, Chapter } from '@/lib/saveState';
import { chapterLoader } from '@/lib/chapterLoader';

const { useState, useRef, useEffect } = React;

interface GranularChapter {
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
}

function App() {
const isDevMode = true;
  const [visualData, setVisualData] = useState<any>(null);
  const [isMouseMode, setIsMouseMode] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVisualOutputOpen, setIsVisualOutputOpen] = useState(false);
  const [activeView, setActiveView] = useState('console');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLearningGuideOpen, setIsLearningGuideOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [readingPosition, setReadingPosition] = useState<ReadingPosition | null>(null);
  const [granularChapters, setGranularChapters] = useState<GranularChapter[]>([]);
  const setQueryRef = useRef<((query: string) => void) | null>(null);

  // Load granular chapters data
  useEffect(() => {
    const loadGranularChapters = async () => {
      try {
        const response = await fetch('/src/data/chapters_granular.json');
        const data = await response.json();
        setGranularChapters(data);
        console.log('Loaded granular chapters for header:', data.length, 'chapters');
      } catch (error) {
        console.error('Failed to load granular chapters for header:', error);
      }
    };
    
    loadGranularChapters();
  }, []);

  // Load save state on component mount
  useEffect(() => {
    const loadSaveState = async () => {
      const saveState = saveStateManager.getSaveState();
      
      // Restore reading position
      if (saveState.readingPosition) {
        setReadingPosition(saveState.readingPosition);
      }
      
      // Restore selected chapter if it exists
      if (saveState.selectedChapter) {
        try {
          const chapter = await chapterLoader.findChapterById(saveState.selectedChapter.id);
          if (chapter) {
            setSelectedChapter(chapter);
          }
        } catch (error) {
          console.error('Failed to restore selected chapter:', error);
        }
      }
    };

    loadSaveState();

    // Cleanup save state manager on unmount
    return () => {
      saveStateManager.destroy();
    };
  }, []);

  // Global keyboard shortcut to focus query input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + L to focus query input
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (setQueryRef.current) {
          // Trigger focus by setting the current query (if any) to itself
          setQueryRef.current('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    // Focus query input after layout change
    setTimeout(() => {
      if (setQueryRef.current) {
        setQueryRef.current('');
      }
    }, 300);
  };

  const openVisualOutput = () => {
    setIsVisualOutputOpen(true);
  };

  const closeVisualOutput = () => {
    setIsVisualOutputOpen(false);
    // End any active modes when closing the visual output
    if (isMouseMode) setIsMouseMode(false);
    if (isLiveMode) setIsLiveMode(false);
  };

  const handleQuerySet = (setQueryFn: (query: string) => void) => {
    setQueryRef.current = setQueryFn;
  };

  const toggleMouseMode = () => {
    if (isLiveMode) setIsLiveMode(false);
    setIsMouseMode(!isMouseMode);
  };

  const toggleLiveMode = () => {
    if (isMouseMode) setIsMouseMode(false);
    setIsLiveMode(!isLiveMode);
  };

  const handleApplyQuery = (query: string) => {
    if (setQueryRef.current) {
      setQueryRef.current(query);
    }
  };

  const resumeReading = () => {
    if (readingPosition && selectedChapter) {
      console.log('Resuming reading with position:', readingPosition);
      setIsChapterModalOpen(true);
    }
  };

  const openLearningGuide = () => {
    setIsLearningGuideOpen(true);
  };

  const closeLearningGuide = () => {
    setIsLearningGuideOpen(false);
  };

  const openChapterSearch = () => {
    // TODO: Implement chapter search functionality
    console.log('Chapter search requested');
  };



  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    saveStateManager.updateSelectedChapter(chapter);
    setIsChapterModalOpen(true);
  };

  const closeChapterModal = () => {
    setIsChapterModalOpen(false);
    // Don't clear selectedChapter here so Resume Reading can work
    // setSelectedChapter(null);
  };

  // Update save state when reading position changes
  const handleReadingPositionChange = (position: ReadingPosition | null) => {
    setReadingPosition(position); // Update local state
    saveStateManager.updateReadingPosition(position);
  };

  return (
    <div className="h-screen bg-offWhite text-offBlack flex flex-col overflow-hidden">
      {/* Enhanced Header */}
<Header 
        isDevMode={isDevMode} 
        connectionStatus={connectionStatus}
        activeView={activeView}
        hasReadingPosition={!!readingPosition && !isChapterModalOpen}
        onResumeReading={resumeReading}
        readingChapterTitle={selectedChapter?.title}
        readingPosition={readingPosition}
        granularChapters={granularChapters}
      />
      
      {/* Main Console Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <NavigationSidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          activeView={activeView}
          onViewChange={setActiveView}
          onLearningGuideOpen={openLearningGuide}
          onChapterSelect={handleChapterSelect}
          onChapterSearchOpen={openChapterSearch}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-3 bg-gradient-to-br from-offWhite to-fadedBlue8">
          <div className="h-full flex flex-col gap-3">
            {/* KDB Console - Full Height */}
            <div className="flex-1 min-h-0">
              <div className="h-full bg-white rounded-xl border-2 border-offBlack16 shadow-lg overflow-hidden">
                <div className="h-full">
                  <KdbConsole
                    onVisualData={setVisualData}
                    onQuerySet={handleQuerySet}
                    onConnectionChange={setConnectionStatus}
                    activeView={activeView}
                    onOpenVisualOutput={openVisualOutput}
                    hasVisualData={!!visualData}
                    onQueryChange={setQuery}
                    onLastQueryChange={setLastQuery}
                    isMouseMode={isMouseMode}
                    isLiveMode={isLiveMode}
                    onToggleMouseMode={toggleMouseMode}
                    onToggleLiveMode={toggleLiveMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Reference Card Modal */}
      <ReferenceCard
        isOpen={isLearningGuideOpen}
        onClose={closeLearningGuide}
      />

      {/* Chapter Modal */}
      <EnhancedChapterModal
        key={isChapterModalOpen ? 'modal-open' : 'modal-closed'}
        isOpen={isChapterModalOpen}
        onClose={closeChapterModal}
        chapter={selectedChapter}
        onApplyQuery={handleApplyQuery}
        onPositionChange={handleReadingPositionChange}
        initialPosition={readingPosition}
      />

      {/* Visual Output Modal */}
      <SimpleVisualOutput
        data={visualData}
        isOpen={isVisualOutputOpen}
        onClose={closeVisualOutput}
        isMouseMode={isMouseMode}
        isLiveMode={isLiveMode}
        onToggleMouseMode={toggleMouseMode}
        onToggleLiveMode={toggleLiveMode}
        hasQuery={!!lastQuery}
        lastQuery={lastQuery}
      />

      <Toaster />
    </div>
  );
}

export default App;
