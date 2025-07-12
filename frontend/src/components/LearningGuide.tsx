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

export const LearningGuide: React.FC<LearningGuideProps> = ({ isExpanded, onToggle, onApplyQuery }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleQueryClick = (query: string) => {
    if (onApplyQuery) {
      onApplyQuery(query);
    } else {
      // Fallback to copy if no apply function provided
      copyToClipboard(query);
    }
  };

  // Collapsed view - modern minimal design
  if (!isExpanded) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="mb-4 p-3 bg-blue/10 rounded-lg">
          <BookOpen className="h-8 w-8 text-blue" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue hover:text-blue hover:bg-fadedBlue8 mb-2"
          onClick={onToggle}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-xs text-offBlack/70 transform -rotate-90 whitespace-nowrap">
          Learning Guide
        </span>
      </div>
    );
  }

  // Expanded view - enhanced console design
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-offBlack16 bg-gradient-to-r from-white to-fadedBlue8">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue/10 rounded-lg">
            <BookOpen className="h-4 w-4 text-blue" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-offBlack">Learning Guide</h3>
            <p className="text-xs text-offBlack/70">KDB+ Reference & Examples</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue hover:text-blue hover:bg-fadedBlue8 p-2 h-auto rounded-lg"
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {kdbExamples.map((section, sectionIndex) => (
          <div key={section.category} className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-offBlack16">
              <Terminal className="h-4 w-4 text-blue" />
              <h4 className="text-sm font-bold text-blue">{section.category}</h4>
            </div>
            
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <Card key={`${sectionIndex}-${itemIndex}`} className="border border-offBlack16 hover:border-blue/30 transition-colors">
                  <CardContent className="p-3">
                    <p className="text-sm text-offBlack mb-2 leading-relaxed">{item.doc}</p>
                    
                    <div className="bg-offBlack/5 rounded-lg p-3 mb-3">
                      <code className="text-xs font-mono text-offBlack whitespace-pre-wrap break-all">
                        {item.q}
                      </code>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs border-blue/30 text-blue hover:bg-blue hover:text-white transition-colors"
                        onClick={() => handleQueryClick(item.q)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {onApplyQuery ? 'Execute' : 'Copy'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-offBlack16 bg-gradient-to-r from-white to-fadedBlue8">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue rounded-full animate-pulse"></div>
          <span className="text-xs text-offBlack/70">Interactive Guide Active</span>
        </div>
      </div>
    </div>
  );
}; 