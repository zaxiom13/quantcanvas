import { useState, useRef } from 'react';
import { KdbConsole } from '@/KdbConsole';
import { Toaster } from '@/components/ui/sonner';
import { VisualOutput } from '@/components/VisualOutput';
import { Header } from '@/components/Header';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { LearningGuideModal } from '@/components/LearningGuideModal';
import AwningDemo from '@/components/AwningDemo';

function App() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [visualData, setVisualData] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVisualOutputCollapsed, setIsVisualOutputCollapsed] = useState(true);
  const [activeView, setActiveView] = useState('console');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLearningGuideOpen, setIsLearningGuideOpen] = useState(false);
  const setQueryRef = useRef<((query: string) => void) | null>(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleVisualOutput = () => {
    setIsVisualOutputCollapsed(!isVisualOutputCollapsed);
  };

  const handleQuerySet = (setQueryFn: (query: string) => void) => {
    setQueryRef.current = setQueryFn;
  };

  const handleApplyQuery = (query: string) => {
    if (setQueryRef.current) {
      setQueryRef.current(query);
    }
  };

  const openLearningGuide = () => {
    setIsLearningGuideOpen(true);
  };

  const closeLearningGuide = () => {
    setIsLearningGuideOpen(false);
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
          isDevMode={isDevMode}
          onDevModeChange={setIsDevMode}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-3 bg-gradient-to-br from-offWhite to-fadedBlue8">
          {activeView === 'awning' ? (
            <div className="h-full overflow-auto">
              <AwningDemo />
            </div>
          ) : (
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
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Learning Guide Modal */}
      <LearningGuideModal
        isOpen={isLearningGuideOpen}
        onClose={closeLearningGuide}
        onApplyQuery={handleApplyQuery}
      />

      <Toaster />
    </div>
  );
}

export default App;
