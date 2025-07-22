export interface ReadingPosition {
  chapterId: string;
  activeSection?: string;
  qBlockId?: string;
}

export interface Chapter {
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

export interface SaveState {
  textbook: string;
  lastUpdated: string;
  currentChapter: {
    id: string;
    title: string;
    section: string;
    subsection: string;
  };
  progress: {
    totalChapters: number;
    completedChapters: number;
    currentPage: number;
    totalPages: number;
  };
  readingPosition: ReadingPosition | null;
  selectedChapter: Chapter | null;
  bookmarks: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    chapter: string;
    section: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    timestamp: string;
    chapter: string;
    section: string;
    tags: string[];
  }>;
  session: {
    startTime: string;
    endTime: string;
    duration: number;
    pagesRead: number;
  };
  preferences: {
    autoSave: boolean;
    saveInterval: number;
    theme: string;
    fontSize: string;
  };
}

const SAVE_STATE_KEY = 'quantCanvas-save-state';

export class SaveStateManager {
  private static instance: SaveStateManager;
  private saveState: SaveState;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.saveState = this.loadSaveState();
    this.startAutoSave();
  }

  public static getInstance(): SaveStateManager {
    if (!SaveStateManager.instance) {
      SaveStateManager.instance = new SaveStateManager();
    }
    return SaveStateManager.instance;
  }

  private getDefaultSaveState(): SaveState {
    return {
      textbook: "Q for Mortals",
      lastUpdated: new Date().toISOString(),
      currentChapter: {
        id: "",
        title: "",
        section: "",
        subsection: ""
      },
      progress: {
        totalChapters: 0,
        completedChapters: 0,
        currentPage: 0,
        totalPages: 0
      },
      readingPosition: null,
      selectedChapter: null,
      bookmarks: [],
      notes: [],
      session: {
        startTime: "",
        endTime: "",
        duration: 0,
        pagesRead: 0
      },
      preferences: {
        autoSave: true,
        saveInterval: 300,
        theme: "default",
        fontSize: "medium"
      }
    };
  }

  private loadSaveState(): SaveState {
    try {
      const saved = localStorage.getItem(SAVE_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultSaveState(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load save state:', error);
    }
    return this.getDefaultSaveState();
  }

  private saveToStorage(): void {
    try {
      this.saveState.lastUpdated = new Date().toISOString();
      localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(this.saveState));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  private startAutoSave(): void {
    if (this.saveState.preferences.autoSave && this.saveState.preferences.saveInterval > 0) {
      this.autoSaveInterval = setInterval(() => {
        this.saveToStorage();
      }, this.saveState.preferences.saveInterval * 1000);
    }
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  public getSaveState(): SaveState {
    return { ...this.saveState };
  }

  public updateReadingPosition(position: ReadingPosition | null): void {
    this.saveState.readingPosition = position;
    this.saveToStorage();
  }

  public updateSelectedChapter(chapter: Chapter | null): void {
    this.saveState.selectedChapter = chapter;
    if (chapter) {
      this.saveState.currentChapter = {
        id: chapter.id,
        title: chapter.title,
        section: "",
        subsection: ""
      };
    }
    this.saveToStorage();
  }

  public updateCurrentChapter(chapter: Chapter, section?: string, subsection?: string): void {
    this.saveState.currentChapter = {
      id: chapter.id,
      title: chapter.title,
      section: section || "",
      subsection: subsection || ""
    };
    this.saveToStorage();
  }

  public addBookmark(bookmark: {
    id: string;
    title: string;
    description: string;
    chapter: string;
    section: string;
  }): void {
    this.saveState.bookmarks.push({
      ...bookmark,
      timestamp: new Date().toISOString()
    });
    this.saveToStorage();
  }

  public addNote(note: {
    id: string;
    content: string;
    chapter: string;
    section: string;
    tags: string[];
  }): void {
    this.saveState.notes.push({
      ...note,
      timestamp: new Date().toISOString()
    });
    this.saveToStorage();
  }

  public startSession(): void {
    this.saveState.session.startTime = new Date().toISOString();
    this.saveState.session.endTime = "";
    this.saveState.session.duration = 0;
    this.saveState.session.pagesRead = 0;
    this.saveToStorage();
  }

  public endSession(): void {
    if (this.saveState.session.startTime) {
      this.saveState.session.endTime = new Date().toISOString();
      const start = new Date(this.saveState.session.startTime);
      const end = new Date(this.saveState.session.endTime);
      this.saveState.session.duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      this.saveToStorage();
    }
  }

  public updatePreferences(preferences: Partial<SaveState['preferences']>): void {
    this.saveState.preferences = { ...this.saveState.preferences, ...preferences };
    
    // Restart auto-save if interval changed
    this.stopAutoSave();
    this.startAutoSave();
    
    this.saveToStorage();
  }

  public clearSaveState(): void {
    this.saveState = this.getDefaultSaveState();
    this.saveToStorage();
  }

  public exportSaveState(): string {
    return JSON.stringify(this.saveState, null, 2);
  }

  public importSaveState(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      this.saveState = { ...this.getDefaultSaveState(), ...imported };
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import save state:', error);
      return false;
    }
  }

  public destroy(): void {
    this.stopAutoSave();
  }
}

// Export singleton instance
export const saveStateManager = SaveStateManager.getInstance(); 