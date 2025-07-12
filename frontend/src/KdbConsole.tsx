import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - No TS types for text-table
import table from 'text-table';
import { KdbWebSocketClient } from './kdb';
import { GetKdbPort } from '../wailsjs/go/main/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBar } from '@/components/StatusBar';

interface Result {
  type: 'query' | 'response' | 'error' | 'system';
  content: any;
  timestamp: string;
}

interface KdbConsoleProps {
  onVisualData?: (data: any) => void;
}

export const KdbConsole: React.FC<KdbConsoleProps> = ({ onVisualData }) => {
  const kdbClientRef = useRef<KdbWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempQuery, setTempQuery] = useState('');
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [results]);

  const addResult = useCallback((type: Result['type'], content: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults((prev) => [...prev, { type, content, timestamp }]);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const port = await GetKdbPort();
        if (!kdbClientRef.current) {
          const client = new KdbWebSocketClient(`ws://localhost:${port}`);
          client.setOnConnect(() => {
            setIsConnected(true);
            toast.success('WebSocket connected!');
          });
          client.setOnClose(() => {
            setIsConnected(false);
            toast.info('WebSocket disconnected.');
          });
          client.setOnError((error: Error) => {
            toast.error(`WebSocket error: ${error.message}`);
          });
          kdbClientRef.current = client;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.error(`Initialization failed: ${errorMessage}`);
      }
    };
    init();
  }, []);

  const handleConnect = useCallback(async () => {
    if (!kdbClientRef.current) {
      toast.error('Client not initialized.');
      return;
    }
    setIsLoading(true);
    toast.info('Connecting to WebSocket...');
    try {
      await kdbClientRef.current.connect();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.error(`Connection failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    kdbClientRef.current?.disconnect();
  }, []);

  const executeQuery = useCallback(async () => {
    if (!query.trim() || !kdbClientRef.current) return;

    setIsLoading(true);
    addResult('query', query);

    // Add to history if it's not already the last item
    setQueryHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== query.trim()) {
        return [...prev, query.trim()];
      }
      return prev;
    });

    try {
      const result = await kdbClientRef.current.query(query);
      addResult('response', result);
      // if result looks like tabular data, forward to visual output
      if (onVisualData && Array.isArray(result)) {
        onVisualData(result);
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        addResult('error', `Query failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setQuery('');
      setHistoryIndex(-1);
      setTempQuery('');
    }
  }, [query, addResult, onVisualData]);

  const clearResults = () => {
    setResults([]);
    if (onVisualData) {
      onVisualData(null);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Reset history navigation when user types
    if (historyIndex !== -1) {
      setHistoryIndex(-1);
      setTempQuery('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (queryHistory.length > 0) {
        if (historyIndex === -1) {
          // Starting to navigate history, save current query
          setTempQuery(query);
          setHistoryIndex(queryHistory.length - 1);
          setQuery(queryHistory[queryHistory.length - 1]);
        } else if (historyIndex > 0) {
          // Go to previous query in history
          setHistoryIndex(historyIndex - 1);
          setQuery(queryHistory[historyIndex - 1]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        if (historyIndex < queryHistory.length - 1) {
          // Go to next query in history
          setHistoryIndex(historyIndex + 1);
          setQuery(queryHistory[historyIndex + 1]);
        } else {
          // Go back to the temporary query or empty
          setHistoryIndex(-1);
          setQuery(tempQuery);
          setTempQuery('');
        }
      }
    }
  };

  const formatResult = (content: any) => {
    // ---- ARRAY HELPERS ----
    const countElements = (arr: any): number => Array.isArray(arr) ? arr.reduce((sum: number, el: any) => sum + countElements(el), 0) : 1;

    const getShape = (arr: any): number[] => {
      const shape: number[] = [];
      let cur = arr;
      while (Array.isArray(cur)) {
        shape.push(cur.length);
        cur = cur[0];
      }
      return shape;
    };

    const flattenNumbers = (arr: any, out: number[] = []): number[] => {
      if (Array.isArray(arr)) {
        arr.forEach((el: any) => flattenNumbers(el, out));
      } else if (typeof arr === 'number' && Number.isFinite(arr)) {
        out.push(arr);
      }
      return out;
    };

    // Helper to format n-dimensional arrays using `text-table` for 2-D slices or summary for big arrays
    const formatArray = (arr: any, depth = 0): string => {
      const indent = '  '.repeat(depth);

      // Show summary for large arrays (more than 1000 elements)
      const totalElements = countElements(arr);
      if (depth === 0 && totalElements > 1000) {
        const shape = getShape(arr);
        const nums = flattenNumbers(arr);
        let mean = 'n/a';
        let varianceStr = 'n/a';
        let std = 'n/a';
        if (nums.length > 0) {
          const m = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
          const varVal = nums.reduce((a: number, b: number) => a + (b - m) ** 2, 0) / nums.length;
          mean = m.toFixed(4);
          std = Math.sqrt(varVal).toFixed(4);
          varianceStr = varVal.toFixed(4);
        }
        return [
          `${shape.length}D array summary`,
          `shape : ${shape.join(' x ')}`,
          `size  : ${totalElements}`,
          `mean  : ${mean}`,
          `var   : ${varianceStr}`,
          `std   : ${std}`,
        ].join('\n');
      }

      if (!Array.isArray(arr)) return indent + String(arr);

      // Handle kdb+ table (array of objects) by converting to a 2D array for formatting
      if (depth === 0 && arr.length > 0 && arr.every((el: any) => typeof el === 'object' && el !== null && !Array.isArray(el))) {
        const headers = Array.from(new Set(arr.flatMap((o: any) => Object.keys(o))));
        const body = arr.map((obj: { [key: string]: any }) => 
          headers.map(header => {
            const val = obj[header];
            if (val === undefined || val === null) return '';
            // Represent nested structures concisely
            if (typeof val === 'object') {
              return Array.isArray(val) ? '[...]' : '{...}';
            }
            return String(val);
          })
        );
        arr = [headers, ...body];
      }

      // 1-D: simple row
      if (arr.every((el: any) => !Array.isArray(el))) {
        return indent + arr.join(' ');
      }

      // 2-D: pretty grid via text-table
      if (arr.every((el: any) => Array.isArray(el) && el.every((sub: any) => !Array.isArray(sub)))) {
        const MAX_ROWS = 50;
        const MAX_COLS = 20;
        const MAX_CELL_WIDTH = 30;

        const originalRows = arr.length;
        const originalCols = arr[0]?.length || 0;

        let displayArr = arr;
        const rowsTruncated = originalRows > MAX_ROWS;
        const colsTruncated = originalCols > MAX_COLS;

        if (rowsTruncated) {
          displayArr = displayArr.slice(0, MAX_ROWS);
        }

        if (colsTruncated) {
          displayArr = displayArr.map((row: any[]) => row.slice(0, MAX_COLS));
        }

        let cellWasTruncated = false;
        const formattedArr = displayArr.map((row: any[]) =>
          row.map((val: any) => {
            const s = val === null ? 'null' : String(val);
            if (s.length > MAX_CELL_WIDTH) {
              cellWasTruncated = true;
              return s.substring(0, MAX_CELL_WIDTH - 3) + '...';
            }
            return s;
          })
        );

        const tbl = table(formattedArr);

        let result = tbl
          .split('\n')
          .map((line: string) => indent + line)
          .join('\n');

        if (rowsTruncated || colsTruncated || cellWasTruncated) {
          const parts = [];
          if (rowsTruncated || colsTruncated) {
            parts.push(
              `dims ${displayArr.length}x${
                displayArr[0]?.length || 0
              } of ${originalRows}x${originalCols}`
            );
          }
          if (cellWasTruncated) {
            parts.push('some cells truncated');
          }
          result += `\n${indent}... (output truncated: ${parts.join(', ')}) ...`;
        }

        return result;
      }

      // n-D: recurse, blank line between slices
      return arr
        .map((sub: any) => formatArray(sub, depth + 1))
        .join('\n\n');
    };

    if (Array.isArray(content)) {
      return formatArray(content);
    }

    // Objects → pretty JSON
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content, null, 2);
    }

    return String(content);
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-300 border-4 border-green-500 shadow-inner">
      <div className="p-4 border-b border-green-700/50">
        <h2 className="text-xl font-bold">Console</h2>
        <p className="text-muted-foreground text-sm mt-1">Execute kdb+ commands</p>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <div ref={resultsRef} className="h-full overflow-y-auto p-4 space-y-2">
          {results.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              <p>No results yet.</p>
              <p className="text-sm mt-2">Connect to the kdb+ WebSocket to get started.</p>
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} className="border-l-2 pl-4" style={{ borderColor: result.type === 'query' ? '#60A5FA' : result.type === 'response' ? '#4ADE80' : result.type === 'error' ? '#F87171' : '#9CA3AF' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${
                      result.type === 'query' ? 'text-blue-400' :
                      result.type === 'response' ? 'text-green-400' :
                      result.type === 'error' ? 'text-red-400' :
                      'text-gray-400'
                  }`}>
                    {result.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp}
                  </span>
                </div>
                <pre className="text-sm whitespace-pre-wrap break-all">{formatResult(result.content)}</pre>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-muted/50 p-4 border-t border-green-700/50">
        <div className="relative">
          <Textarea
            value={query}
            onChange={handleQueryChange}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Enter kdb+ query (e.g., til 10)" : "Connect to kdb+ to run queries"}
            disabled={!isConnected || isLoading}
            rows={3}
            className="w-full bg-background border rounded p-2 pr-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
          />
          <Button
            onClick={executeQuery}
            disabled={!isConnected || isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            Execute
          </Button>
        </div>
        <StatusBar
          isConnected={isConnected}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onClear={clearResults}
        />
      </div>
    </div>
  );
}; 