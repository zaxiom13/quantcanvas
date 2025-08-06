import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock, BookOpen } from 'lucide-react';
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

export const Header: React.FC<HeaderProps> = ({ 
    isDevMode, 
    connectionStatus, 
    activeView,
    hasReadingPosition,
    onResumeReading,
    readingChapterTitle,
    readingPosition,
    granularChapters
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

    // Helper function to format the resume button text with chapter and subsection details
    const getResumeText = (): string => {
        if (!readingPosition || !granularChapters) {
            return `Resume: ${readingChapterTitle || 'Reading'}`;
        }

        // Find the active subsection if it exists
        if (readingPosition.activeSection) {
            const activeSubsection = granularChapters.find(
                ch => ch.id === readingPosition.activeSection && ch.granularType === 'subsection'
            );

            if (activeSubsection) {
                // Format as "Chapter Title > Subsection Title"
                const chapterPart = readingChapterTitle || 'Chapter';
                const subsectionPart = activeSubsection.title || activeSubsection.fullTitle;
                
                // Truncate if too long for better UI
                const maxLength = 60;
                const combinedText = `${chapterPart} > ${subsectionPart}`;
                
                if (combinedText.length > maxLength) {
                    // Try to truncate the subsection part while keeping the chapter
                    const availableForSubsection = maxLength - chapterPart.length - 3; // 3 for " > "
                    if (availableForSubsection > 10) {
                        return `${chapterPart} > ${subsectionPart.substring(0, availableForSubsection - 3)}...`;
                    } else {
                        // If chapter title is too long, truncate everything
                        return combinedText.substring(0, maxLength - 3) + '...';
                    }
                }
                
                return combinedText;
            }
        }

        // Fallback to just chapter title
        return `Resume: ${readingChapterTitle || 'Reading'}`;
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
            
            {/* Right side - Resume, Time and shortcuts */}
            <div className="flex items-center space-x-4 text-offBlack">
                {/* Resume Reading Button */}
                {hasReadingPosition && onResumeReading && (
                    <Button
                        onClick={onResumeReading}
                        variant="secondary"
                        size="sm"
                        className="text-blue hover:text-blue hover:bg-fadedBlue16 max-w-xs"
                        title={getResumeText()} // Full text in tooltip
                    >
                        <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{getResumeText()}</span>
                    </Button>
                )}
                
                <div className="flex items-center space-x-2 text-offBlack/60">
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
