import React from 'react';
import { Button } from './ui/button';
import { BookOpen, Terminal, Copy, Play } from 'lucide-react';
import { generateKdbExamples } from '@/lib/example-generator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const kdbExamples = generateKdbExamples();

interface LearningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuery?: (query: string) => void;
}

export const LearningGuideModal: React.FC<LearningGuideModalProps> = ({ 
  isOpen, 
  onClose, 
  onApplyQuery 
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleQueryClick = (query: string) => {
    if (onApplyQuery) {
      onApplyQuery(query);
      onClose(); // Close modal after applying query
    } else {
      // Fallback to copy if no apply function provided
      copyToClipboard(query);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white border-2 border-offBlack16 rounded-lg shadow-lg p-0 flex flex-col">
        <DialogHeader className="flex items-center justify-between border-b border-offBlack16 p-6 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-offBlack">Learning Guide</DialogTitle>
              <p className="text-sm text-offBlack/70">KDB+ Reference & Examples</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {kdbExamples.map((section, sectionIndex) => (
            <div key={section.category} className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b-2 border-offBlack16">
                <Terminal className="h-5 w-5 text-blue" />
                <h3 className="text-lg font-bold text-blue">{section.category}</h3>
              </div>
              
              <div className="grid gap-4">
                {section.items.map((item, itemIndex) => (
                  <Card key={`${sectionIndex}-${itemIndex}`} className="border border-offBlack16 hover:border-blue/30 transition-colors">
                    <CardContent className="p-4">
                      <p className="text-sm text-offBlack mb-3 leading-relaxed">{item.doc}</p>
                      <div className="bg-offBlack text-offWhite p-3 rounded-lg font-mono text-sm mb-3 overflow-x-auto">
                        {item.q}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQueryClick(item.q)}
                          className="text-blue hover:text-blue hover:bg-fadedBlue16"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Apply Query
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(item.q)}
                          className="text-offBlack hover:text-offBlack hover:bg-fadedBlue8"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 