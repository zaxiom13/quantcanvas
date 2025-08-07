import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Filter, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
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

const referenceData = generateKdbExamples();

interface ReferenceCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceCard: React.FC<ReferenceCardProps> = React.memo(({ 
  isOpen, 
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    return ['all', ...referenceData.map(section => section.category)];
  }, []);

  const filteredData = useMemo(() => {
    let filtered = referenceData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(section => section.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.doc.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(section => section.items.length > 0);
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-[#0f1416] border border-white/10 rounded-md shadow-crt p-0 flex flex-col text-[#e5eef2]">
        <DialogHeader className="flex items-center justify-between border-b border-white/10 p-6 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-md border border-white/10">
              <BookOpen className="h-5 w-5 text-neon-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#e5eef2]">Q/KDB+ Basics</DialogTitle>
              <p className="text-sm text-[#e5eef2]/70">Executable q examples and quick reference</p>
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filter Bar */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e5eef2]/50" />
              <Input
                placeholder="Search q examples or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-[#0b0f10] border-white/10 text-[#e5eef2] placeholder:text-[#e5eef2]/50"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-white/5"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-[#e5eef2]/70" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-[#0b0f10] border border-white/10 rounded-md text-sm text-[#e5eef2] focus:outline-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                className="hover:border-neon-500/40 hover:bg-white/5"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Reference Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#e5eef2]/60 text-lg mb-2">No results found</div>
              <div className="text-[#e5eef2]/50 text-sm">Try adjusting your search terms or category filter</div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredData.map((section, sectionIndex) => (
                <div key={section.category} className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-neon-500">{section.category}</h3>
                    <span className="text-[11px] text-[#e5eef2]/60 bg-white/5 px-2 py-1 rounded border border-white/10">
                      {section.items.length} items
                    </span>
                  </div>
                  
                  <div className="grid gap-3">
                    {section.items.map((item, itemIndex) => (
                      <Card key={`${sectionIndex}-${itemIndex}`} className="border border-white/10 hover:border-neon-500/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="bg-[#0b0f10] text-[#e5eef2] px-3 py-1 rounded-md font-mono text-sm font-medium border border-white/10">
                                {item.q.split(' ')[0]}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-[#0b0f10] rounded-md p-3 mb-2 border border-white/10">
                                <code className="text-sm font-mono text-[#e5eef2] whitespace-pre-wrap break-all">
                                  {item.q}
                                </code>
                              </div>
                              <p className="text-sm text-[#e5eef2]/80 leading-relaxed">{item.doc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with stats */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-[#e5eef2]/70">
            <div>
              Showing {filteredData.reduce((acc, section) => acc + section.items.length, 0)} of {' '}
              {referenceData.reduce((acc, section) => acc + section.items.length, 0)} items
            </div>
            <div>
              {filteredData.length} of {referenceData.length} categories
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});