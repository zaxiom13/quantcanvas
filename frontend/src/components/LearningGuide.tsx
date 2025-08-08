import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, BookOpen, Terminal, Zap } from 'lucide-react';
import { generateKdbExamples } from '@/lib/example-generator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const kdbExamples = generateKdbExamples();

interface LearningGuideProps {
  isExpanded: boolean;
  onToggle: () => void;
  onApplyQuery?: (query: string) => void;
}

export const LearningGuide: React.FC<LearningGuideProps> = React.memo(({ isExpanded, onToggle, onApplyQuery }) => {
  const handleQueryClick = (query: string) => {
    if (onApplyQuery) {
      onApplyQuery(query);
    }
  };

  // Collapsed view - modern minimal design
  if (!isExpanded) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="mb-4 p-3 bg-white/10 rounded-md border border-white/10">
          <BookOpen className="h-8 w-8 text-neon-500" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 hover:bg-white/5"
          onClick={onToggle}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-xs text-[#e5eef2]/70 transform -rotate-90 whitespace-nowrap">
          Basics
        </span>
      </div>
    );
  }

  // Expanded view - enhanced console design
  return (
    <div className="h-full flex flex-col overflow-hidden text-[#e5eef2]">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {kdbExamples.map((section, sectionIndex) => (
          <div key={section.category} className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
              <Terminal className="h-4 w-4 text-neon-500" />
              <h4 className="text-xs font-semibold text-neon-500">{section.category}</h4>
            </div>
            
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <Card key={`${sectionIndex}-${itemIndex}`} className="border border-white/10 hover:border-neon-500/40 transition-colors">
                  <CardContent className="p-3">
                    <p className="text-sm text-[#e5eef2] mb-2 leading-relaxed">{item.doc}</p>
                    
                    <div className="bg-[#0b0f10] rounded-md p-3 mb-3 border border-white/10">
                      <code className="text-xs font-mono text-[#e5eef2] whitespace-pre-wrap break-all">
                        {item.q}
                      </code>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs hover:border-neon-500/40 hover:bg-white/5"
                        onClick={() => handleQueryClick(item.q)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default LearningGuide;