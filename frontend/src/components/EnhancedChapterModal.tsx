import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HtmlRenderer } from './HtmlRenderer';

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
  depth?: number;
}

interface EnhancedChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: GranularChapter | null;
  onApplyQuery?: (query: string) => void;
  onPositionChange?: (position: { chapterId: string; activeSection?: string; qBlockId?: string; } | null) => void;
  initialPosition?: { chapterId: string; activeSection?: string; qBlockId?: string; } | null;
}

const throttle = (func: (...args: any[]) => void, limit: number) => {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

export const EnhancedChapterModal: React.FC<EnhancedChapterModalProps> = ({
  isOpen,
  onClose,
  chapter,
  onApplyQuery,
  onPositionChange,
  initialPosition
}) => {
  const [granularChapters, setGranularChapters] = useState<GranularChapter[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGranularChapters = async () => {
      try {
        const response = await fetch('/src/data/chapters_granular.json');
        const data = await response.json();
        setGranularChapters(data);
      } catch (error) {
        console.error('Failed to load granular chapters:', error);
      }
    };

    if (isOpen) {
      loadGranularChapters();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && chapter && granularChapters.length > 0) {
      const subsections = getSubsections(chapter.id);
      if (subsections.length > 0) {
        let targetSectionId = subsections[0].id;

        if (initialPosition && initialPosition.chapterId === chapter.id && initialPosition.activeSection) {
            targetSectionId = initialPosition.activeSection;
        }
        
        setActiveSection(targetSectionId);

        setTimeout(() => {
            let elementToScrollTo: HTMLElement | null = null;
            if (initialPosition?.qBlockId) {
                elementToScrollTo = document.getElementById(initialPosition.qBlockId);
            }
            
            if (!elementToScrollTo) {
                elementToScrollTo = document.getElementById(targetSectionId);
            }

            if (elementToScrollTo) {
                elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150); // Increased delay slightly
      }
    }
}, [isOpen, chapter, granularChapters, initialPosition]);

  useEffect(() => {
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer || !chapter) return;

    const subsections = getSubsections(chapter.id);
    if (!subsections.length) return;

    const handleScroll = () => {
        const viewportCenter = scrollContainer.scrollTop + (scrollContainer.clientHeight / 2);

        let newActiveSectionId = null;

        for (const subsection of subsections) {
            const element = document.getElementById(subsection.id);
            if (element) {
                if (element.offsetTop <= viewportCenter && (element.offsetTop + element.offsetHeight) > viewportCenter) {
                    newActiveSectionId = subsection.id;
                    break; 
                }
            }
        }

        if (newActiveSectionId) {
            setActiveSection(currentActive => {
                if (newActiveSectionId !== currentActive) {
                    return newActiveSectionId;
                }
                return currentActive;
            });
        }
    };

    const throttledHandleScroll = throttle(handleScroll, 100);

    scrollContainer.addEventListener('scroll', throttledHandleScroll);
    return () => {
        scrollContainer.removeEventListener('scroll', throttledHandleScroll);
    };
}, [isOpen, chapter, granularChapters]);

  const getSubsections = (chapterId: string) => {
    return granularChapters.filter(
      ch => ch.granularType === 'subsection' && ch.parentChapter === chapterId
    ).sort((a, b) => {
      const aParts = a.number.split('.').map(Number);
      const bParts = b.number.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleClose = () => {
    if (onPositionChange && chapter && activeSection) {
      onPositionChange({
        chapterId: chapter.id,
        activeSection: activeSection
      });
    }
    onClose();
  };

  const handleApplyAndClose = (query: string, blockId: string, sectionId: string) => {
    if (onApplyQuery) {
        onApplyQuery(query);
    }
    
    if (onPositionChange && chapter) {
        onPositionChange({
            chapterId: chapter.id,
            activeSection: sectionId,
            qBlockId: blockId
        });
    }
    
    onClose();
  };

  if (!isOpen || !chapter) return null;

  const subsections = getSubsections(chapter.id);
  const hasSubsections = subsections.length > 0;

  const topLevelSubsections = subsections.filter(sub => {
    if (sub.type !== 'h3') {
        return true; // Keep all non-h3 items (i.e., h2s)
    }
    // For an h3, check if there is an h2 that is its parent
    const isChild = subsections.some(parent => 
        parent.type === 'h2' && sub.number.startsWith(parent.number + '.')
    );
    return !isChild; // Keep it only if it's not a child
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[95vh] bg-white border-2 border-offBlack16 shadow-2xl flex flex-col">
        <CardHeader className="border-b border-offBlack16 bg-gradient-to-r from-fadedBlue8 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-offBlack">
                  {chapter.fullTitle}
                </CardTitle>
                {hasSubsections && (
                  <p className="text-sm text-offBlack/70 mt-1">
                    {subsections.length} subsections available
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-offBlack hover:bg-fadedBlue16"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 flex overflow-hidden">
           <div className="flex-1 overflow-hidden flex flex-col">
             <CardContent ref={contentScrollRef} className="p-0 flex-1 overflow-y-auto">
               <div className="p-6">
                 {/* Subsections content */}
                 {hasSubsections ? (
                   <div className="space-y-6">
                     {subsections.map((subsection) => (
                       <div
                         key={subsection.id}
                         id={subsection.id}
                         className={`border-l-4 pl-4 transition-all duration-200 ${
                           activeSection === subsection.id
                             ? 'border-blue bg-blue/5'
                             : 'border-transparent' // Use transparent to avoid layout shifts
                         }`}
                         onMouseEnter={() => setActiveSection(subsection.id)}
                       >
                         <div className="flex items-center space-x-2 mb-3">
                           <h3 className="text-lg font-semibold text-offBlack">
                             {subsection.fullTitle}
                           </h3>
                           <Badge variant="outline" className="text-xs">
                             {subsection.type}
                           </Badge>
                         </div>
                         <div className="prose prose-slate max-w-none subsection-content">
                             <HtmlRenderer 
                               html={subsection.content}
                               idPrefix={subsection.id}
                               onApplyAndClose={(query: string, blockId: string) => handleApplyAndClose(query, blockId, subsection.id)} 
                             />
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                     <HtmlRenderer 
                         html={chapter.content} 
                         idPrefix={chapter.id}
                         onApplyAndClose={(query: string, blockId: string) => handleApplyAndClose(query, blockId, chapter.id)}
                     />
                 )}
               </div>
             </CardContent>
           </div>
        </div>
      </Card>
    </div>
  );
}; 