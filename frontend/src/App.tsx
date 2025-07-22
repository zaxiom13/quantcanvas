import React from 'react';
import { KdbConsole } from '@/KdbConsole';
import { Toaster } from '@/components/ui/sonner';
import { VisualOutput } from '@/components/VisualOutput';
import { Header } from '@/components/Header';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { ReferenceCard } from '@/components/ReferenceCard';
import { EnhancedChapterModal } from '@/components/EnhancedChapterModal';
import { saveStateManager, ReadingPosition, Chapter } from '@/lib/saveState';
import { chapterLoader } from '@/lib/chapterLoader';

const { useState, useRef, useEffect } = React;



function App() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [visualData, setVisualData] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVisualOutputCollapsed, setIsVisualOutputCollapsed] = useState(true);
  const [activeView, setActiveView] = useState('console');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLearningGuideOpen, setIsLearningGuideOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [readingPosition, setReadingPosition] = useState<ReadingPosition | null>(null);
  const setQueryRef = useRef<((query: string) => void) | null>(null);

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

  const toggleVisualOutput = () => {
    setIsVisualOutputCollapsed(!isVisualOutputCollapsed);
    // Focus query input after layout change
    setTimeout(() => {
      if (setQueryRef.current) {
        setQueryRef.current('');
      }
    }, 300);
  };

  const handleQuerySet = (setQueryFn: (query: string) => void) => {
    setQueryRef.current = setQueryFn;
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
    setReadingPosition(position);
    saveStateManager.updateReadingPosition(position);
  };

  return (
    <div className="h-screen bg-offWhite text-offBlack flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <Header 
        isDevMode={isDevMode} 
        onDevModeChange={setIsDevMode}
        connectionStatus={connectionStatus}
        activeView={activeView}
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
          isDevMode={isDevMode}
          onDevModeChange={setIsDevMode}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-3 bg-gradient-to-br from-offWhite to-fadedBlue8">
          <div className="h-full flex flex-col gap-3">
            {/* Visual Output - Top */}
            <div className={`transition-all duration-300 ${isVisualOutputCollapsed ? 'h-16' : 'h-96'}`}>
              <VisualOutput 
                data={visualData} 
                isCollapsed={isVisualOutputCollapsed}
                onToggle={toggleVisualOutput}
              />
            </div>
            
            {/* KDB Console - Bottom */}
            <div className="flex-1 min-h-0">
              <div className="h-full bg-white rounded-xl border-2 border-offBlack16 shadow-lg overflow-hidden">
                <div className="h-full">
                  <KdbConsole
                    onVisualData={setVisualData}
                    onQuerySet={handleQuerySet}
                    onConnectionChange={setConnectionStatus}
                    onResumeReading={resumeReading}
                    hasReadingPosition={!!readingPosition && !isChapterModalOpen}
                    readingChapterTitle={selectedChapter?.title}
                    activeView={activeView}
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

      <Toaster />
    </div>
  );
}

export default App;
