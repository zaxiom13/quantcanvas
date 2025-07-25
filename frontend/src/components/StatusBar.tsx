import React from 'react';

interface StatusBarProps {
  isConnected: boolean;
  isLoading: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isConnected, isLoading }) => {
  const statusText = isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected';
  const statusColor = isLoading ? 'bg-gold' : isConnected ? 'bg-green' : 'bg-red';

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${statusColor}`} />
      <span className="text-sm font-medium text-offBlack/80">{statusText}</span>
    </div>
  );
}; 