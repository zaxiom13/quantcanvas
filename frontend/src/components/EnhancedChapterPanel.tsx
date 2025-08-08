import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, FileText, Search, ArrowRight, ChevronLeft, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HtmlRenderer } from './HtmlRenderer';
import { saveStateManager } from '@/lib/saveState';

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

export interface ReadingPositionPanel {
  chapterId: string;
  activeSection?: string;
  qBlockId?: string;
}

interface EnhancedChapterPanelProps {
  chapter: GranularChapter | null;
  onApplyQuery?: (query: string) => void;
  onPositionChange?: (position: ReadingPositionPanel | null) => void;
  initialPosition?: ReadingPositionPanel | null;
  onExit?: () => void;
  onViewChange?: (view: string) => void;
}

const throttle = (func: (...args: any[]) => void, limit: number) => {
  let inThrottle = false;
  return function(this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

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

const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm.trim()) return text;
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-300/30 text-yellow-200 rounded px-1">{part}</mark>
    ) : (
      part
    )
  );
};

export const EnhancedChapterPanel: React.FC<EnhancedChapterPanelProps> = ({
  chapter,
  onApplyQuery,
  onPositionChange,
  initialPosition,
  onExit,
  onViewChange,
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
    const loadGranularChapters = async () => {
      try {
        const response = await fetch('/src/data/chapters_granular.json');
        const data = await response.json();
        setGranularChapters(data);
      } catch (error) {
        console.error('Failed to load granular chapters:', error);
      }
    };
    loadGranularChapters();
  }, []);

  // Guard against oscillation: derive once per chapter change
  const hasAppliedInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chapter || granularChapters.length === 0) return;
    if (hasAppliedInitialRef.current === chapter.id) return;

    setSearchTerm('');
    setShowSearchResults(false);
    setIsSearchVisible(false);

    const subsections = getSubsections(chapter.id);
    if (subsections.length === 0) {
      hasAppliedInitialRef.current = chapter.id;
      return;
    }

    let targetSectionId = subsections[0].id;
    if (
      initialPosition &&
      initialPosition.chapterId === chapter.id &&
      initialPosition.activeSection
    ) {
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
      hasAppliedInitialRef.current = chapter.id;
    }, 150);
  }, [chapter, granularChapters, initialPosition]);

  useEffect(() => {
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer || !chapter) return;
    const subsections = getSubsections(chapter.id);
    if (!subsections.length) return;

    let ignoreUntil = 0;
    const handleScroll = () => {
      if (Date.now() < ignoreUntil) return;
      const viewportCenter = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
      let newActiveSectionId: string | null = null;
      for (const subsection of subsections) {
        const element = document.getElementById(subsection.id);
        if (element) {
          if (element.offsetTop <= viewportCenter && element.offsetTop + element.offsetHeight > viewportCenter) {
            newActiveSectionId = subsection.id;
            break;
          }
        }
      }
      if (newActiveSectionId) {
        setActiveSection((currentActive) => (newActiveSectionId !== currentActive ? newActiveSectionId : currentActive));
      }
    };
    const throttledHandleScroll = throttle(handleScroll, 100);
    scrollContainer.addEventListener('scroll', throttledHandleScroll);

    // Briefly ignore scroll-after-programmatic-scroll to prevent oscillation
    const stopIgnore = () => { ignoreUntil = 0; };
    ignoreUntil = Date.now() + 400;
    const t = setTimeout(stopIgnore, 420);

    return () => {
      clearTimeout(t);
      scrollContainer.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [chapter, granularChapters]);

  const getSubsections = (chapterId: string) => {
    const list = granularChapters
      .filter((ch) => ch.granularType === 'subsection' && ch.parentChapter === chapterId);
    if (list.length <= 1) return list;
    // Only sort when needed to reduce work
    let sorted = true;
    for (let i = 1; i < list.length; i++) {
      const aParts = list[i - 1].number.split('.').map(Number);
      const bParts = list[i].number.split('.').map(Number);
      const maxLen = Math.max(aParts.length, bParts.length);
      for (let j = 0; j < maxLen; j++) {
        const aVal = aParts[j] || 0;
        const bVal = bParts[j] || 0;
        if (aVal > bVal) { sorted = false; break; }
        if (aVal < bVal) { break; }
      }
      if (!sorted) break;
    }
    if (sorted) return list;
    return list.slice().sort((a, b) => {
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

  const searchResults = useMemo(() => {
    if (!chapter || !searchTerm.trim()) return [];
    const allSubsections = getSubsections(chapter.id);
    const results: Array<{ section: GranularChapter; matches: Array<{ context: string; index: number }>; }> = [];
    try {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedTerm, 'gi');
      if (allSubsections.length === 0) {
        const cleanContent = stripHtml(chapter.content);
        const matches = Array.from(cleanContent.matchAll(searchRegex));
        if (matches.length > 0) {
          const contextMatches = matches.slice(0, 3).map((match) => {
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(cleanContent.length, match.index! + match[0].length + 50);
            return { context: cleanContent.substring(start, end), index: match.index! };
          });
          results.push({ section: chapter, matches: contextMatches });
        }
      }
      allSubsections.forEach((subsection) => {
        const cleanContent = stripHtml(subsection.content);
        const titleContent = subsection.fullTitle;
        const allContent = titleContent + ' ' + cleanContent;
        const matches = Array.from(allContent.matchAll(searchRegex));
        if (matches.length > 0) {
          const contextMatches = matches.slice(0, 3).map((match) => {
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(allContent.length, match.index! + match[0].length + 50);
            return { context: allContent.substring(start, end), index: match.index! };
          });
          results.push({ section: subsection, matches: contextMatches });
        }
      });
    } catch (error) {
      console.warn('Invalid regex pattern:', searchTerm);
    }
    return results;
  }, [chapter, granularChapters, searchTerm]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddBookmark = (sectionId: string) => {
    if (!chapter) return;
    try {
      const title = `${chapter.fullTitle}`;
      const bookmarkTitle = `Bookmark: ${title}`;
      saveStateManager.addBookmark({
        id: `${chapter.id}-${sectionId}-${Date.now()}`,
        title: bookmarkTitle,
        description: '',
        chapter: chapter.fullTitle || chapter.title,
        section: sectionId,
      });
      // Notify other panels in this tab to refresh
      window.dispatchEvent(new CustomEvent('quantCanvas-bookmarks-updated'));
    } catch (err) {
      console.error('Failed to add bookmark', err);
    }
  };

  const handleApply = (query: string, blockId: string, sectionId: string) => {
    if (onApplyQuery) onApplyQuery(query);
    if (onPositionChange && chapter) {
      onPositionChange({ chapterId: chapter.id, activeSection: sectionId, qBlockId: blockId });
    }
  };

  // Persist reading position when active section changes
  useEffect(() => {
    if (chapter && activeSection && onPositionChange) {
      onPositionChange({ chapterId: chapter.id, activeSection });
    }
  }, [chapter, activeSection, onPositionChange]);

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center text-[#e5eef2]/60">
        Select a chapter from Navigation
      </div>
    );
  }

  const subsections = getSubsections(chapter.id);
  const hasSubsections = subsections.length > 0;
  const hasSearchResults = searchResults.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden text-[#e5eef2]">
      <div className="border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="text-[#e5eef2]/70 hover:bg-white/5 mr-1"
                title="Back to Navigation"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div className="p-2 bg-white/10 rounded-md border border-white/10">
              <BookOpen className="h-5 w-5 text-neon-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#e5eef2]">{chapter.fullTitle}</CardTitle>
              {hasSubsections && (
                <p className="text-[11px] text-[#e5eef2]/70 mt-1">
                  {searchTerm.trim()
                    ? `${searchResults.length} search results in ${subsections.length} sections`
                    : `${subsections.length} subsections available`}
                </p>
              )}
            </div>
          </div>
          {hasSubsections && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs hover:border-neon-500/40 hover:bg-white/5"
              onClick={() => activeSection && handleAddBookmark(activeSection)}
              title="Add bookmark for this section"
            >
              <BookmarkPlus className="h-3 w-3 mr-2" />
              Add Bookmark
            </Button>
          )}
          {hasSubsections && (
            <div className={`relative flex items-center rounded-md overflow-hidden transition-all duration-300 ease-in-out ${
              isSearchVisible ? 'bg-white/10 ring-1 ring-neon-500/30 shadow-sm' : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            }`}>
              <Input
                ref={searchInputRef}
                placeholder="Search within chapter..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(e.target.value.trim().length > 0);
                }}
                tabIndex={isSearchVisible ? 0 : -1}
                className={`pr-3 h-9 border-0 focus:ring-0 focus:outline-none placeholder:text-[#e5eef2]/40 text-[#e5eef2] transition-all duration-300 ease-in-out backdrop-blur-sm text-sm ${
                  isSearchVisible ? 'w-56 opacity-100 bg-transparent pl-4' : 'w-0 opacity-0 bg-transparent pl-0'
                }`}
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
                className={`flex items-center space-x-1.5 px-3 py-2 transition-all duration-200 ${
                  isSearchVisible ? 'text-neon-500 hover:bg-white/10' : 'text-[#e5eef2]/70 hover:bg-white/5'
                }`}
                title="Toggle Search"
              >
                <Search className={`h-4 w-4 transition-colors ${isSearchVisible ? 'text-neon-500' : 'text-[#e5eef2]/70'}`} />
                <span className={`text-sm font-medium transition-colors ${isSearchVisible ? 'text-neon-500' : 'text-[#e5eef2]/70'}`}>
                  {isSearchVisible ? 'Close' : 'Search'}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div ref={contentScrollRef} className="h-full overflow-y-auto p-3">
          {hasSubsections ? (
            <>
              {showSearchResults && searchTerm.trim() ? (
                <div className="space-y-4">
                  {!hasSearchResults ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Search className="h-8 w-8 text-[#e5eef2]/30 mx-auto mb-4" />
                        <p className="text-[#e5eef2]/80 mb-2">No matches found</p>
                        <p className="text-sm text-[#e5eef2]/60">Try different search terms</p>
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
                      <div className="text-sm text-[#e5eef2]/70 mb-2 font-medium">
                        Search Results ({searchResults.length} sections):
                      </div>
                      {searchResults.map((result) => (
                        <Card
                          key={result.section.id}
                          className="border border-white/10 hover:border-neon-500/40 hover:shadow-crt transition-all cursor-pointer"
                          onClick={() => {
                            setShowSearchResults(false);
                            setIsSearchVisible(false);
                            setActiveSection(result.section.id);
                            setTimeout(() => {
                              const element = document.getElementById(result.section.id);
                              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {result.section.granularType === 'chapter' ? (
                                  <BookOpen className="h-4 w-4 text-neon-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-neon-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="font-semibold text-[#e5eef2]">
                                    {highlightText(result.section.fullTitle, searchTerm)}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {result.section.granularType === 'chapter' ? 'Chapter' : result.section.type?.toUpperCase()}
                                  </Badge>
                                </div>
                                {result.matches.slice(0, 2).map((match, matchIndex) => (
                                  <p key={matchIndex} className="text-sm text-[#e5eef2]/70 mb-1 leading-relaxed">
                                    ...{highlightText(match.context, searchTerm)}...
                                  </p>
                                ))}
                              </div>
                              <div className="flex-shrink-0">
                                <ArrowRight className="h-4 w-4 text-[#e5eef2]/40" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  {subsections.map((subsection) => (
                    <div
                      key={subsection.id}
                      id={subsection.id}
                      className={`border-l-4 pl-4 transition-all duration-200 ${activeSection === subsection.id ? 'border-blue bg-blue/5' : 'border-transparent'}`}
                      onMouseEnter={() => setActiveSection(subsection.id)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base font-semibold text-[#e5eef2]">{subsection.fullTitle}</h3>
                        <Badge variant="outline" className="text-xs">{subsection.type}</Badge>
                      </div>
                      <div className="prose prose-invert prose-slate max-w-none subsection-content text-sm leading-relaxed">
                        <HtmlRenderer
                          html={subsection.content}
                          idPrefix={subsection.id}
                          onApplyAndClose={(query: string, blockId: string) => handleApply(query, blockId, subsection.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed">
              <HtmlRenderer
                html={chapter.content}
                idPrefix={chapter.id}
                onApplyAndClose={(query: string, blockId: string) => handleApply(query, blockId, chapter.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedChapterPanel;

