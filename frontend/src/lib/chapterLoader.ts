import { Chapter } from './saveState';

class ChapterLoader {
  private static instance: ChapterLoader;
  private chaptersCache: Chapter[] | null = null;
  private granularChaptersCache: Chapter[] | null = null;
  private loadingPromise: Promise<Chapter[]> | null = null;

  private constructor() {}

  public static getInstance(): ChapterLoader {
    if (!ChapterLoader.instance) {
      ChapterLoader.instance = new ChapterLoader();
    }
    return ChapterLoader.instance;
  }

  public async loadChapters(): Promise<Chapter[]> {
    if (this.chaptersCache) {
      return this.chaptersCache;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.fetchChapters();
    try {
      this.chaptersCache = await this.loadingPromise;
      return this.chaptersCache;
    } finally {
      this.loadingPromise = null;
    }
  }

  public async loadGranularChapters(): Promise<Chapter[]> {
    if (this.granularChaptersCache) {
      return this.granularChaptersCache;
    }

    try {
      const response = await fetch('/src/data/chapters_granular.json');
      const data = await response.json();
      this.granularChaptersCache = data;
      return data;
    } catch (error) {
      console.error('Failed to load granular chapters:', error);
      return [];
    }
  }

  private async fetchChapters(): Promise<Chapter[]> {
    try {
      const response = await fetch('/src/data/chapters.json');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to load chapters:', error);
      return [];
    }
  }

  public async findChapterById(id: string): Promise<Chapter | null> {
    const chapters = await this.loadChapters();
    return chapters.find(chapter => chapter.id === id) || null;
  }

  public async findChapterByNumber(number: string): Promise<Chapter | null> {
    const chapters = await this.loadChapters();
    return chapters.find(chapter => chapter.number === number) || null;
  }

  public async findGranularChapterById(id: string): Promise<Chapter | null> {
    const chapters = await this.loadGranularChapters();
    return chapters.find(chapter => chapter.id === id) || null;
  }

  public clearCache(): void {
    this.chaptersCache = null;
    this.granularChaptersCache = null;
    this.loadingPromise = null;
  }
}

export const chapterLoader = ChapterLoader.getInstance(); 