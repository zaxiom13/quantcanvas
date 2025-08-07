import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, ArrowRight, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EnhancedChapterPanel from '@/components/EnhancedChapterPanel';
import { chapterLoader } from '@/lib/chapterLoader';
import { Chapter, ReadingPosition } from '@/lib/saveState';
import { saveStateManager } from '@/lib/saveState';

interface BookPanelProps {
  onApplyQuery?: (query: string) => void;
  onViewChange?: (view: string) => void;
  selectedChapter?: Chapter | null;
  onChapterSelect?: (chapter: Chapter) => void;
  readingPosition?: ReadingPosition | null;
  onPositionChange?: (position: ReadingPosition | null) => void;
}

const BookPanel: React.FC<BookPanelProps> = ({
  onApplyQuery,
  onViewChange,
  selectedChapter,
  onChapterSelect,
  readingPosition,
  onPositionChange,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    chapter: string;
    section: string;
  }>>([]);

  useEffect(() => {
    let mounted = true;
    chapterLoader.loadChapters().then((chs) => {
      if (!mounted) return;
      setChapters(chs);
      // Prefer explicit selection, else resume position
      if (selectedChapter) {
        setActiveChapter(selectedChapter);
      } else if (readingPosition) {
        const found = chs.find((c) => c.id === readingPosition.chapterId) || null;
        if (found) setActiveChapter(found);
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedChapter, readingPosition]);

  const refreshBookmarks = () => {
    const state = saveStateManager.getSaveState();
    setBookmarks(state.bookmarks || []);
  };

  useEffect(() => {
    refreshBookmarks();
    const onStorage = (e: StorageEvent) => {
      // Refresh on any save-state change
      if (e.key === null || e.key === 'quantCanvas-save-state') {
        refreshBookmarks();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const compareChapterNumbers = (a: Chapter, b: Chapter): number => {
    const aParts = (a.number || '').split('.').map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
    const bParts = (b.number || '').split('.').map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i++) {
      const aVal = aParts[i] ?? -Infinity;
      const bVal = bParts[i] ?? -Infinity;
      if (aVal !== bVal) return aVal - bVal;
    }
    // Fallback: stable by title
    return (a.title || '').localeCompare(b.title || '');
  };

  const sortedChapters = useMemo(() => {
    return [...chapters].sort(compareChapterNumbers);
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedChapters;
    return sortedChapters.filter((c) =>
      (c.fullTitle || '').toLowerCase().includes(term) ||
      (c.title || '').toLowerCase().includes(term) ||
      (c.number || '').toLowerCase().includes(term)
    );
  }, [sortedChapters, searchTerm]);

  if (activeChapter) {
    return (
      <div className="h-full overflow-hidden">
        <EnhancedChapterPanel
          chapter={activeChapter}
          onApplyQuery={onApplyQuery}
          onPositionChange={(pos) => onPositionChange?.(pos as unknown as ReadingPosition)}
          initialPosition={
            readingPosition && readingPosition.chapterId === activeChapter.id
              ? readingPosition
              : null
          }
          onExit={() => setActiveChapter(null)}
          onViewChange={onViewChange}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden text-[#e5eef2]">
      <CardHeader className="p-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-md border border-white/10">
              <BookOpen className="h-5 w-5 text-neon-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#e5eef2]">Book</CardTitle>
              <p className="text-[12px] text-[#e5eef2]/70">All chapters</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {readingPosition && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs hover:border-neon-500/40 hover:bg-white/5"
                onClick={() => {
                  const found = chapters.find((c) => c.id === readingPosition.chapterId);
                  if (found) {
                    setActiveChapter(found);
                    onChapterSelect?.(found);
                  }
                }}
                title="Resume reading"
              >
                <BookOpen className="h-3 w-3 mr-2" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs hover:border-neon-500/40 hover:bg-white/5"
              onClick={() => {
                const next = !showBookmarks;
                setShowBookmarks(next);
                if (next) {
                  refreshBookmarks();
                }
              }}
              title={showBookmarks ? 'Show chapters' : 'Show bookmarks'}
            >
              <Bookmark className="h-3 w-3 mr-2" />
              {showBookmarks ? 'Chapters' : 'Bookmarks'}
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e5eef2]/50" />
              <Input
                placeholder="Search chapters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0b0f10] border-white/10 text-[#e5eef2] placeholder:text-[#e5eef2]/50"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-2">
        {showBookmarks ? (
          bookmarks.length === 0 ? (
            <div className="text-sm text-[#e5eef2]/70 p-3">No bookmarks saved yet.</div>
          ) : (
            bookmarks.slice().reverse().map((bm) => (
              <Card
                key={bm.id}
                className="border border-white/10 hover:border-neon-500/40 transition-colors cursor-pointer"
                onClick={() => {
                  const found = chapters.find((c) => (c.fullTitle === bm.chapter) || (c.title === bm.chapter));
                  if (found) {
                    onPositionChange?.({ chapterId: found.id, activeSection: bm.section });
                    setActiveChapter(found);
                    onChapterSelect?.(found);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#e5eef2]/80">
                        Bookmark
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#e5eef2] truncate">{bm.title}</div>
                        <div className="text-xs text-[#e5eef2]/60 truncate">{bm.chapter} • {new Date(bm.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#e5eef2]/50 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )
        ) : (
          filteredChapters.map((ch) => (
            <Card
              key={ch.id}
              className="border border-white/10 hover:border-neon-500/40 transition-colors cursor-pointer"
              onClick={() => {
                setActiveChapter(ch);
                if (onChapterSelect) onChapterSelect(ch);
              }}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#e5eef2]/80">
                    {ch.number}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#e5eef2]">{ch.fullTitle || ch.title}</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#e5eef2]/50" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BookPanel;

