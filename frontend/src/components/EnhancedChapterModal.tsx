import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, BookOpen, FileText, Search, Filter, ArrowRight, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Utility function to strip HTML and extract text content
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

// Utility function to highlight search terms in text
const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
        {part}
      </mark>
    ) : (
      part
    )
  );
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Lock scroll on body when modal is open
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
      // Clear search when opening a new chapter
      setSearchTerm('');
      setShowSearchResults(false);
      setIsSearchVisible(false);
      
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (!isSearchVisible) {
          setIsSearchVisible(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
          searchInputRef.current?.focus();
        }
      }
      
      // Escape to close search
      if (e.key === 'Escape' && isSearchVisible) {
        e.preventDefault();
        setSearchTerm('');
        setShowSearchResults(false);
        setIsSearchVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSearchVisible]);

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

  // Search results - sections that contain the search term
  const searchResults = useMemo(() => {
    if (!chapter || !searchTerm.trim()) return [];
    
    const allSubsections = getSubsections(chapter.id);
    const results: Array<{
      section: GranularChapter;
      matches: Array<{ context: string; index: number }>;
    }> = [];
    
    try {
      // Escape special regex characters for literal search
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedTerm, 'gi');
      
      // Search in main chapter content if no subsections
      if (allSubsections.length === 0) {
        const cleanContent = stripHtml(chapter.content);
        const matches = Array.from(cleanContent.matchAll(searchRegex));
        
        if (matches.length > 0) {
          const contextMatches = matches.slice(0, 3).map((match, index) => {
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(cleanContent.length, match.index! + match[0].length + 50);
            return {
              context: cleanContent.substring(start, end),
              index: match.index!
            };
          });
          
          results.push({
            section: chapter,
            matches: contextMatches
          });
        }
      }
      
      // Search in subsections
      allSubsections.forEach(subsection => {
        const cleanContent = stripHtml(subsection.content);
        const titleContent = subsection.fullTitle;
        const allContent = titleContent + ' ' + cleanContent;
        
        const matches = Array.from(allContent.matchAll(searchRegex));
        
        if (matches.length > 0) {
          // Get up to 3 context snippets
          const contextMatches = matches.slice(0, 3).map((match, index) => {
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(allContent.length, match.index! + match[0].length + 50);
            return {
              context: allContent.substring(start, end),
              index: match.index!
            };
          });
          
          results.push({
            section: subsection,
            matches: contextMatches
          });
        }
      });
      
    } catch (error) {
      // Invalid regex, return empty results
      console.warn('Invalid regex pattern:', searchTerm);
    }
    
    return results;
  }, [chapter, granularChapters, searchTerm]);

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
  const hasSearchResults = searchResults.length > 0;

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
          <div className="flex items-center justify-between mb-4">
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
                    {searchTerm.trim()
                      ? `${searchResults.length} search results in ${subsections.length} sections`
                      : `${subsections.length} subsections available`
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasSubsections && (
                <div className={`relative flex items-center rounded-md overflow-hidden transition-all duration-300 ease-in-out
                  ${isSearchVisible 
                    ? 'bg-gradient-to-r from-blue/5 to-blue/10 ring-1 ring-blue/30 shadow-sm' 
                    : 'bg-white/80 hover:bg-white ring-1 ring-offBlack/10 hover:ring-offBlack/20'}`}>
                  <Input
                    ref={searchInputRef}
                    placeholder="Search within chapter..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearchResults(e.target.value.trim().length > 0);
                    }}
                    className={`pr-3 h-9 border-0 focus:ring-0 focus:outline-none placeholder:text-offBlack/40
                      transition-all duration-300 ease-in-out backdrop-blur-sm text-base
                      ${isSearchVisible 
                        ? 'w-64 opacity-100 bg-transparent pl-4' 
                        : 'w-0 opacity-0 bg-transparent pl-0'}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSearchVisible(!isSearchVisible);
                      if (!isSearchVisible) {
                        setTimeout(() => searchInputRef.current?.focus(), 100);
                      } else {
                        setSearchTerm('');
                        setShowSearchResults(false);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-2 transition-all duration-200
                      ${isSearchVisible 
                        ? 'text-blue hover:bg-blue/20' 
                        : 'text-offBlack/70 hover:bg-offBlack/10'}`}
                    title="Toggle Search"
                  >
                    <Search className={`h-4 w-4 transition-colors ${isSearchVisible ? 'text-blue' : 'text-offBlack/70'}`} />
                    <span className={`text-sm font-medium transition-colors ${isSearchVisible ? 'text-blue' : 'text-offBlack/70'}`}>
                      {isSearchVisible ? 'Close' : 'Search'}
                    </span>
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-offBlack hover:bg-fadedBlue16"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 flex overflow-hidden">
           <div className="flex-1 overflow-hidden flex flex-col">
             <CardContent ref={contentScrollRef} className="p-0 flex-1 overflow-y-auto">
               <div className="p-6">
                 {/* Search Results or Subsections content */}
                 {hasSubsections ? (
                   <>
                     {showSearchResults && searchTerm.trim() ? (
                       /* Search Results View */
                       <div className="space-y-4">
                         {!hasSearchResults ? (
                           <div className="flex items-center justify-center py-12">
                             <div className="text-center">
                               <Search className="h-8 w-8 text-offBlack/30 mx-auto mb-4" />
                               <p className="text-offBlack/70 mb-2">No matches found</p>
                               <p className="text-sm text-offBlack/50">
                                 Try different search terms
                               </p>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                   setSearchTerm('');
                                   setShowSearchResults(false);
                                   setIsSearchVisible(false);
                                 }}
                                 className="mt-4"
                               >
                                 Close Search
                               </Button>
                             </div>
                           </div>
                         ) : (
                           <div className="space-y-3">
                             <div className="text-sm text-offBlack/70 mb-4 font-medium">
                               Search Results ({searchResults.length} sections):
                             </div>
                             {searchResults.map((result, index) => (
                               <Card 
                                 key={result.section.id}
                                 className="border border-offBlack16 hover:border-blue/30 hover:shadow-sm transition-all cursor-pointer"
                                 onClick={() => {
                                   setShowSearchResults(false);
                                   setIsSearchVisible(false);
                                   setActiveSection(result.section.id);
                                   setTimeout(() => {
                                     const element = document.getElementById(result.section.id);
                                     if (element) {
                                       element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                     }
                                   }, 100);
                                 }}
                               >
                                 <CardContent className="p-4">
                                   <div className="flex items-start space-x-3">
                                     <div className="flex-shrink-0 mt-1">
                                       {result.section.granularType === 'chapter' ? (
                                         <BookOpen className="h-4 w-4 text-blue" />
                                       ) : (
                                         <FileText className="h-4 w-4 text-green-600" />
                                       )}
                                     </div>
                                     
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center space-x-2 mb-2">
                                         <h4 className="font-semibold text-offBlack">
                                           {highlightText(result.section.fullTitle, searchTerm)}
                                         </h4>
                                         <Badge variant="outline" className="text-xs">
                                           {result.section.granularType === 'chapter' ? 'Chapter' : result.section.type?.toUpperCase()}
                                         </Badge>
                                       </div>
                                       
                                       {result.matches.slice(0, 2).map((match, matchIndex) => (
                                         <p key={matchIndex} className="text-sm text-offBlack/70 mb-1 leading-relaxed">
                                           ...{highlightText(match.context, searchTerm)}...
                                         </p>
                                       ))}
                                       
                                       {result.matches.length > 2 && (
                                         <p className="text-xs text-blue mt-2">
                                           +{result.matches.length - 2} more matches
                                         </p>
                                       )}
                                     </div>
                                     
                                     <div className="flex-shrink-0">
                                       <ArrowRight className="h-4 w-4 text-offBlack/30" />
                                     </div>
                                   </div>
                                 </CardContent>
                               </Card>
                             ))}
                           </div>
                         )}
                       </div>
                     ) : (
                       /* Normal Subsections View */
                       <div className="space-y-6">
                         {subsections.map((subsection) => (
                           <div
                             key={subsection.id}
                             id={subsection.id}
                             className={`border-l-4 pl-4 transition-all duration-200 ${
                               activeSection === subsection.id
                                 ? 'border-blue bg-blue/5'
                                 : 'border-transparent'
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
                     )}
                   </>
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