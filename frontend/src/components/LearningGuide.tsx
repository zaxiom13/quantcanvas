import React from 'react';
import { Button } from './ui/button';

const kdbExamples = [
  {
    category: 'Basic Queries',
    items: [
      { q: 'til 10', doc: 'Generate a list of numbers from 0 to 9.' },
      { q: '10#`a`b`c', doc: 'Create a list of 10 repeating symbols.' },
      { q: '`a`b`c!1 2 3', doc: 'Create a dictionary (map).' },
      { q: 'flip `name`age`city!(`A`B`C;20 25 30;`X`Y`Z)', doc: 'Create a simple table.' },
    ],
  },
  {
    category: 'Data Types',
    items: [
      { q: '`symbol', doc: 'A symbol (interned string).' },
      { q: '2024.07.27', doc: 'A date type.' },
      { q: '14:30:00.000', doc: 'A time type.' },
      { q: '1f', doc: 'A float number (e.g., 1.0).' },
    ],
  },
  {
    category: 'System Commands',
    items: [
      { q: '\\t til 1000', doc: 'Time the execution of an expression.' },
      { q: '\\ts til 1000', doc: 'Time and show memory usage.' },
      { q: '\\v', doc: 'List variables in the workspace.' },
      { q: '\\f', doc: 'List functions in the workspace.' },
    ],
  },
];

export const LearningGuide: React.FC = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-300 border-4 border-green-500 shadow-inner p-4 font-mono">
      <h2 className="text-xl font-bold mb-4">Kdb+ Learning Guide</h2>
      <div className="flex-1 overflow-y-auto pr-2">
        {kdbExamples.map((section) => (
          <div key={section.category} className="mb-6">
            <h3 className="text-lg font-semibold text-green-400 mb-2">{section.category}</h3>
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li key={item.q} className="text-xs border border-green-700/50 p-2 rounded-md bg-green-900/10">
                  <p className="font-bold text-green-300 mb-1">{item.doc}</p>
                  <div className="flex items-center justify-between">
                    <code className="text-green-400 bg-black/50 px-1 rounded">{item.q}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-200 hover:bg-green-700/30 h-6 px-2"
                      onClick={() => copyToClipboard(item.q)}
                    >
                      Copy
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
       <div className="text-xs text-center pt-2 border-t border-green-700/50 text-green-600">
        <p>Execute: <kbd>Enter</kbd> | Newline: <kbd>Shift+Enter</kbd></p>
      </div>
    </div>
  );
}; 