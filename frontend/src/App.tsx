import React from 'react';
import { KdbConsole } from '@/KdbConsole';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/Header';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import RightDock from '@/components/RightDock';
import { CommandBar } from '@/components/CommandBar';
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
  

  const [activeView, setActiveView] = useState('console');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [readingPosition, setReadingPosition] = useState<ReadingPosition | null>(null);
  const [granularChapters, setGranularChapters] = useState<GranularChapter[]>([]);
  const setQueryRef = useRef<((query: string) => void) | null>(null);
  const executeQueryRef = useRef<((query: string) => void) | null>(null);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setQueryRef.current?.('');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: true } as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, []);



  const openVisualOutput = () => {
    // No longer needed - visual output is now in the right dock
  };

  const closeVisualOutput = () => {
    // No longer needed - visual output is now in the right dock
    // End any active modes when closing the visual output
    if (isMouseMode) setIsMouseMode(false);
    if (isLiveMode) setIsLiveMode(false);
  };

  const handleQuerySet = (setQueryFn: (query: string) => void) => {
    setQueryRef.current = setQueryFn;
  };

  const toggleMouseMode = () => {
    if (!isMouseMode) {
      // enabling mouse -> disable live
      if (isLiveMode) setIsLiveMode(false);
      setIsMouseMode(true);
    } else {
      setIsMouseMode(false);
    }
  };

  const toggleLiveMode = () => {
    if (!isLiveMode) {
      // enabling live -> disable mouse
      if (isMouseMode) setIsMouseMode(false);
      setIsLiveMode(true);
    } else {
      setIsLiveMode(false);
    }
  };

  const handleApplyQuery = (query: string) => {
    // Set query in input field instead of auto-executing
    // User can press Enter to execute when ready
    if (setQueryRef.current) {
      setQueryRef.current(query);
    }
  };

  const resumeReading = () => {
    if (readingPosition && selectedChapter) {
      console.log('Resuming reading with position:', readingPosition);
      // No longer opening modal - reading happens in right dock chapter tab
    }
  };

  const openLearningGuide = () => {
    // No longer needed - learning guide is now in the right dock
  };

  const closeLearningGuide = () => {
    // No longer needed - learning guide is now in the right dock
  };



  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    saveStateManager.updateSelectedChapter(chapter);
    // No longer opening modal - chapter reading happens in right dock
  };

  const closeChapterModal = () => {
    // No longer needed - no chapter modal
  };

  // Update save state when reading position changes
  const handleReadingPositionChange = (position: ReadingPosition | null) => {
    setReadingPosition(position); // Update local state
    saveStateManager.updateReadingPosition(position);
  };

  return (
    <div className="h-screen bg-offBlack text-offBlack flex flex-col overflow-hidden">
      {/* Enhanced Header */}
<Header 
        isDevMode={isDevMode} 
        connectionStatus={connectionStatus}
        activeView={activeView}
        hasReadingPosition={!!readingPosition}
        onResumeReading={resumeReading}
        readingChapterTitle={selectedChapter?.title}
        readingPosition={readingPosition}
        granularChapters={granularChapters}
      />
      
      {/* Main Console Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resizable main area with right dock */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={70} minSize={50}>
            <main className="h-full overflow-hidden p-3 bg-gradient-to-br from-[#0b0f10] to-[#0f1416]">
              <div className="h-full flex flex-col gap-3">
                <div className="flex-shrink-0">
                  <CommandBar
                    hasQuery={!!lastQuery}
                    isMouseMode={isMouseMode}
                    isLiveMode={isLiveMode}
                    onToggleMouseMode={toggleMouseMode}
                    onToggleLiveMode={toggleLiveMode}
                    onClearConsole={() => {
                      // pass through via ref later if needed
                    }}
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <div className="h-full bg-[#0f1416] rounded-md border border-white/10 shadow-crt overflow-hidden">
                    <KdbConsole
                      onVisualData={setVisualData}
                      onQuerySet={handleQuerySet}
                      onConnectionChange={setConnectionStatus}
                      activeView={activeView}
                      hasVisualData={!!visualData}
                      onQueryChange={setQuery}
                      onLastQueryChange={setLastQuery}
                      isMouseMode={isMouseMode}
                      isLiveMode={isLiveMode}
                      onToggleMouseMode={toggleMouseMode}
                      onToggleLiveMode={toggleLiveMode}
                    onProvideExecutor={(fn) => { executeQueryRef.current = fn; }}
                    />
                  </div>
                </div>
              </div>
            </main>
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-white/5" />
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full p-3">
                <RightDock 
                onApplyQuery={handleApplyQuery}
                activeView={activeView}
                onViewChange={setActiveView}
                onChapterSelect={handleChapterSelect}
                selectedChapter={selectedChapter}
                visualData={visualData}
                isMouseMode={isMouseMode}
                isLiveMode={isLiveMode}
                onToggleMouseMode={toggleMouseMode}
                onToggleLiveMode={toggleLiveMode}
                hasQuery={!!lastQuery}
                lastQuery={lastQuery}
                  readingPosition={readingPosition}
                  onPositionChange={handleReadingPositionChange}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Toaster />
    </div>
  );
}

export default App;