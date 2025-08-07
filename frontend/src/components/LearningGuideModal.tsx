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
      <DialogContent className="max-w-4xl max-h-[90vh] bg-[#0f1416] border border-white/10 rounded-md shadow-crt p-0 flex flex-col text-[#e5eef2]">
        <DialogHeader className="flex items-center justify-between border-b border-white/10 p-6 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-md border border-white/10">
              <BookOpen className="h-5 w-5 text-neon-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#e5eef2]">Basics</DialogTitle>
              <p className="text-sm text-[#e5eef2]/70">KDB+ Reference & Examples</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {kdbExamples.map((section, sectionIndex) => (
            <div key={section.category} className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
                <Terminal className="h-5 w-5 text-neon-500" />
                <h3 className="text-lg font-bold text-neon-500">{section.category}</h3>
              </div>
              
              <div className="grid gap-4">
                {section.items.map((item, itemIndex) => (
                  <Card key={`${sectionIndex}-${itemIndex}`} className="border border-white/10 hover:border-neon-500/40 transition-colors">
                    <CardContent className="p-4">
                      <p className="text-sm text-[#e5eef2] mb-3 leading-relaxed">{item.doc}</p>
                      <div className="bg-[#0b0f10] text-[#e5eef2] p-3 rounded-md font-mono text-sm mb-3 overflow-x-auto border border-white/10">
                        {item.q}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQueryClick(item.q)}
                          className="hover:border-neon-500/40 hover:bg-white/5"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Apply Query
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(item.q)}
                          className="hover:border-neon-500/40 hover:bg-white/5"
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