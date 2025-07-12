import React from 'react';
import { Activity, Cpu, HardDrive, Wifi, WifiOff, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatusPanelProps {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ connectionStatus }) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-gold animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green';
      case 'connecting':
        return 'text-gold';
      case 'disconnected':
        return 'text-red';
    }
  };

  const currentTime = new Date().toLocaleTimeString();

  return (
    <Card className="h-full border-2 border-offBlack16 bg-gradient-to-r from-white to-fadedBlue8 shadow-lg">
      <CardContent className="p-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left side - Connection Status */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-offBlack">
              <Activity className="h-4 w-4" />
              <span className="text-sm">System Active</span>
            </div>
          </div>
          
          {/* Center - System Metrics */}
          <div className="flex items-center space-x-8 text-offBlack">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-blue" />
              <span className="text-sm">CPU: Normal</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-purple" />
              <span className="text-sm">Memory: OK</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
              <span className="text-sm">QuantCanvas Online</span>
            </div>
          </div>
          
          {/* Right side - Time and additional info */}
          <div className="flex items-center space-x-4 text-offBlack">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono">{currentTime}</span>
            </div>
            
            <div className="px-3 py-1 bg-blue/10 rounded-full border border-blue/20">
              <span className="text-xs font-medium text-blue">v1.0.0</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 