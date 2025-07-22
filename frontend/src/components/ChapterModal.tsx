import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Chapter {
  id: string;
  number: string;
  title: string;
  fullTitle: string;
  content: string;
}

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  onClose,
  chapter
}) => {
  if (!isOpen || !chapter) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] bg-white border-2 border-offBlack16 shadow-2xl">
        <CardHeader className="border-b border-offBlack16 bg-gradient-to-r from-fadedBlue8 to-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-offBlack">
              {chapter.fullTitle}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-offBlack hover:bg-fadedBlue16"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[85vh] overflow-y-auto">
            <div 
              className="prose prose-slate max-w-none p-8 chapter-content"
              dangerouslySetInnerHTML={{ __html: chapter.content }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 