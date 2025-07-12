import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock } from 'lucide-react';

interface HeaderProps {
    isDevMode: boolean;
    onDevModeChange: (isDevMode: boolean) => void;
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    activeView: string;
}

export const Header: React.FC<HeaderProps> = ({ 
    isDevMode, 
    onDevModeChange, 
    connectionStatus, 
    activeView 
}) => {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const getViewDisplayName = (view: string) => {
        const viewNames: { [key: string]: string } = {
            'console': 'KDB Console',
            'learning': 'Learning Guide',
            'dashboard': 'Dashboard',
            'analytics': 'Analytics',
            'terminal': 'Terminal',
            'database': 'Database',
            'reports': 'Reports',
            'performance': 'Performance',
            'help': 'Help'
        };
        return viewNames[view] || view;
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b-2 border-offBlack16 bg-gradient-to-r from-white to-fadedBlue8 shadow-sm flex-shrink-0">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Q</span>
                    </div>
                    <h1 className="text-xl font-bold text-offBlack">
                        QuantCanvas
                    </h1>
                </div>
                
                {/* Breadcrumb navigation */}
                <div className="flex items-center space-x-2 text-offBlack/70">
                    <span className="text-sm">Console</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-sm font-medium text-offBlack">
                        {getViewDisplayName(activeView)}
                    </span>
                </div>
            </div>
            
            {/* Right side - Time only */}
            <div className="flex items-center space-x-2 text-offBlack">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono">{currentTime}</span>
            </div>
        </header>
    );
}; 