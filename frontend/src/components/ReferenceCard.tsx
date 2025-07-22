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

export const ReferenceCard: React.FC<ReferenceCardProps> = ({ 
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
      <DialogContent className="max-w-6xl max-h-[90vh] bg-white border-2 border-offBlack16 rounded-lg shadow-lg p-0 flex flex-col">
        <DialogHeader className="flex items-center justify-between border-b border-offBlack16 p-6 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-offBlack">Q/KDB+ Reference Card</DialogTitle>
              <p className="text-sm text-offBlack/70">Quick reference for q language elements</p>
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filter Bar */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-offBlack16 bg-fadedBlue8/50">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-offBlack/50" />
              <Input
                placeholder="Search functions, operators, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-white border-offBlack16 focus:ring-blue focus:border-blue"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-offBlack/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-offBlack/70" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-offBlack16 rounded-lg text-sm focus:ring-blue focus:border-blue"
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
                className="text-offBlack hover:text-offBlack hover:bg-fadedBlue8"
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
              <div className="text-offBlack/50 text-lg mb-2">No results found</div>
              <div className="text-offBlack/40 text-sm">Try adjusting your search terms or category filter</div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredData.map((section, sectionIndex) => (
                <div key={section.category} className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b-2 border-offBlack16">
                    <h3 className="text-lg font-bold text-blue">{section.category}</h3>
                    <span className="text-xs text-offBlack/50 bg-offBlack/5 px-2 py-1 rounded">
                      {section.items.length} items
                    </span>
                  </div>
                  
                  <div className="grid gap-3">
                    {section.items.map((item, itemIndex) => (
                      <Card key={`${sectionIndex}-${itemIndex}`} className="border border-offBlack16 hover:border-blue/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="bg-offBlack text-offWhite px-3 py-1 rounded font-mono text-sm font-medium">
                                {item.q.split(' ')[0]}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-offBlack/5 rounded-lg p-3 mb-2">
                                <code className="text-sm font-mono text-offBlack whitespace-pre-wrap break-all">
                                  {item.q}
                                </code>
                              </div>
                              <p className="text-sm text-offBlack/80 leading-relaxed">{item.doc}</p>
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
        <div className="flex-shrink-0 px-6 py-3 border-t border-offBlack16 bg-fadedBlue8/30">
          <div className="flex items-center justify-between text-xs text-offBlack/70">
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
}; 