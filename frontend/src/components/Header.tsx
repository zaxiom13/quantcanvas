import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadingPosition, Chapter } from '@/lib/saveState';

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

interface HeaderProps {
    isDevMode: boolean;
    onDevModeChange?: (isDevMode: boolean) => void;
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    activeView: string;
    hasReadingPosition?: boolean;
    onResumeReading?: () => void;
    readingChapterTitle?: string;
    readingPosition?: ReadingPosition | null;
    granularChapters?: GranularChapter[];
}

export const Header: React.FC<HeaderProps> = ({ activeView }) => {
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
        <header className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-gradient-to-r from-[#0f1416] to-[#0b0f10] shadow-crt flex-shrink-0">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-sm bg-[#132b3a] border border-white/10 shadow-[0_0_10px_rgba(57,255,20,0.15)] flex items-center justify-center">
                        <span className="text-green font-bold text-sm">Q</span>
                    </div>
                    <h1 className="text-lg font-extrabold tracking-tight text-[#e5eef2]">
                        QuantCanvas
                    </h1>
                </div>
                
                {/* Breadcrumb navigation */}
                <div className="flex items-center space-x-2 text-[#e5eef2]/70">
                    <span className="text-sm">Console</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-sm font-semibold text-[#e5eef2]">
                        {getViewDisplayName(activeView)}
                    </span>
                </div>
            </div>
            
            {/* Right side - Time and shortcuts */}
            <div className="flex items-center space-x-4 text-[#e5eef2]">
                <div className="flex items-center space-x-2 text-[#e5eef2]/60">
                    <span className="text-xs">Ctrl+L</span>
                    <span className="text-xs">Focus Query</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-mono">{currentTime}</span>
                </div>
            </div>
        </header>
    );
};
