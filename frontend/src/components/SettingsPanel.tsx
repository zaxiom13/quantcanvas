import React from 'react';
import { DevControls } from '@/components/DevControls';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const SettingsPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col overflow-hidden text-[#e5eef2]">
      <div className="p-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <CardTitle className="text-base font-semibold text-[#e5eef2]">Settings</CardTitle>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-6">
          <div className="border-t border-white/10 pt-4">
            <DevControls />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

