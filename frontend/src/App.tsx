import { useState } from 'react';
import { KdbConsole } from '@/KdbConsole';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Toaster } from '@/components/ui/sonner';
import { VisualOutput } from '@/components/VisualOutput';
import { LearningGuide } from '@/components/LearningGuide';

function App() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [visualData, setVisualData] = useState<any>(null);

  return (
    <div className="dark">
      <div className="min-h-screen bg-black text-green-300 font-mono">
        <div className="container mx-auto h-screen overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Settings button */}
          <div className="absolute top-4 right-4 z-10">
            <SettingsDialog isDevMode={isDevMode} onDevModeChange={setIsDevMode} />
          </div>

          {/* Learning Guide */}
          <div className="col-span-1 h-full min-h-0 overflow-hidden">
            <LearningGuide />
          </div>

          {/* Main Content Area */}
          <div className="col-span-1 lg:col-span-2 h-full flex flex-col gap-4">
            {/* Visual Output (top half) */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <VisualOutput data={visualData} />
            </div>

            {/* Console (bottom half) */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <KdbConsole onVisualData={setVisualData} />
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    </div>
  );
}

export default App;
