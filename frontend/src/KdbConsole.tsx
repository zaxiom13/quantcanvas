import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - No TS types for text-table
import table from 'text-table';
import { KdbWebSocketClient } from './kdb';
import { GetKdbPort } from '../wailsjs/go/main/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBar } from '@/components/StatusBar';

interface Result {
  type: 'query' | 'response' | 'error' | 'system';
  content: any;
  timestamp: string;
}

interface KdbConsoleProps {
  onVisualData?: (data: any) => void;
  onQuerySet?: (setQueryFn: (query: string) => void) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const KdbConsole: React.FC<KdbConsoleProps> = ({ onVisualData, onQuerySet, onConnectionChange }) => {
  const kdbClientRef = useRef<KdbWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempQuery, setTempQuery] = useState('');
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Expose setQuery function to parent component
  useEffect(() => {
    if (onQuerySet) {
      onQuerySet(setQuery);
    }
  }, [onQuerySet]);

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
            setConnectionAttempts(0);
            onConnectionChange?.('connected');
            // Only show success toast on manual connection attempts
            if (connectionAttempts > 0) {
              toast.success('Connected successfully!', {
                duration: 2000,
              });
            }
          });
          client.setOnClose(() => {
            setIsConnected(false);
            onConnectionChange?.('disconnected');
            // Only show disconnect toast if it was unexpected (not manual disconnect)
            if (connectionAttempts === 0) {
              toast.info('Connection lost. Click Connect to reconnect.', {
                duration: 3000,
              });
            }
          });
          client.setOnError((error: Error) => {
            toast.error(`Connection error: ${error.message}`, {
              duration: 4000,
            });
          });
          kdbClientRef.current = client;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.error(`Initialization failed: ${errorMessage}`, {
          duration: 4000,
        });
      }
    };
    init();
  }, [connectionAttempts]);

  const handleConnect = useCallback(async () => {
    if (!kdbClientRef.current) {
      toast.error('Client not initialized.', {
        duration: 3000,
      });
      return;
    }
    setIsLoading(true);
    setConnectionAttempts(prev => prev + 1);
    onConnectionChange?.('connecting');
    try {
      await kdbClientRef.current.connect();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        onConnectionChange?.('disconnected');
        toast.error(`Connection failed: ${errorMessage}`, {
          duration: 4000,
          position: 'top-center',
        });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionAttempts(0); // Reset so we don't show disconnect toast
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

    // Generate comprehensive table summary for array of objects
    const generateTableSummary = (table: any[]): string => {
      if (table.length === 0) return 'Empty table';
      
      const columns = Object.keys(table[0]);
      const summary = [`Table Summary (${table.length} rows, ${columns.length} columns)`];
      
      // Column analysis
      summary.push(`Columns: ${columns.join(', ')}`);
      
      // Analyze each column
      columns.forEach(col => {
        const values = table.map(row => row[col]).filter(v => v !== null && v !== undefined);
        const nonNullCount = values.length;
        const nullCount = table.length - nonNullCount;
        
        if (nonNullCount === 0) {
          summary.push(`  ${col}: all null/undefined`);
          return;
        }
        
        const sampleValues = values.slice(0, 3);
        const uniqueCount = new Set(values).size;
        
        // Type detection
        const types = new Set(values.map(v => typeof v));
        const typeStr = Array.from(types).join('|');
        
        // Numeric analysis
        const numericValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));
        if (numericValues.length > 0) {
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          const sum = numericValues.reduce((a, b) => a + b, 0);
          const mean = sum / numericValues.length;
          const variance = numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length;
          const std = Math.sqrt(variance);
          
          summary.push(`  ${col} (${typeStr}): min=${min.toFixed(2)}, max=${max.toFixed(2)}, mean=${mean.toFixed(2)}, std=${std.toFixed(2)}`);
        } else {
          // Non-numeric analysis
          const sampleStr = sampleValues.map(v => String(v).substring(0, 20)).join(', ');
          summary.push(`  ${col} (${typeStr}): ${uniqueCount} unique values, sample: ${sampleStr}${sampleValues.length < values.length ? '...' : ''}`);
        }
        
        if (nullCount > 0) {
          summary.push(`    nulls: ${nullCount}/${table.length} (${(nullCount/table.length*100).toFixed(1)}%)`);
        }
      });
      
      return summary.join('\n');
    };

    // Generate matrix summary for 2D arrays
    const generateMatrixSummary = (matrix: any[][]): string => {
      if (matrix.length === 0) return 'Empty matrix';
      
      const rows = matrix.length;
      const cols = matrix[0]?.length || 0;
      const summary = [`Matrix Summary (${rows} rows × ${cols} columns)`];
      
      // Flatten all numeric values
      const allNums = matrix.flat().filter(v => typeof v === 'number' && Number.isFinite(v));
      
      if (allNums.length > 0) {
        const min = Math.min(...allNums);
        const max = Math.max(...allNums);
        const sum = allNums.reduce((a, b) => a + b, 0);
        const mean = sum / allNums.length;
        const variance = allNums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allNums.length;
        const std = Math.sqrt(variance);
        
        summary.push(`  Numeric stats: min=${min.toFixed(4)}, max=${max.toFixed(4)}, mean=${mean.toFixed(4)}, std=${std.toFixed(4)}`);
      }
      
      // Check for nulls/undefined
      const nullCount = matrix.flat().filter(v => v === null || v === undefined).length;
      const totalElements = rows * cols;
      if (nullCount > 0) {
        summary.push(`  Nulls: ${nullCount}/${totalElements} (${(nullCount/totalElements*100).toFixed(1)}%)`);
      }
      
      // Show sample of first few rows/cols
      const sampleRows = Math.min(3, rows);
      const sampleCols = Math.min(5, cols);
      if (sampleRows < rows || sampleCols < cols) {
        summary.push(`  Sample (${sampleRows}×${sampleCols}):`);
        for (let i = 0; i < sampleRows; i++) {
          const row = matrix[i].slice(0, sampleCols).map(v => String(v).substring(0, 8));
          summary.push(`    [${row.join(', ')}${sampleCols < cols ? '...' : ''}]`);
        }
        if (sampleRows < rows) {
          summary.push(`    ...`);
        }
      }
      
      return summary.join('\n');
    };

    // Helper to format n-dimensional arrays using `text-table` for 2-D slices or summary for big arrays
    const formatArray = (arr: any, depth = 0): string => {
      const indent = '  '.repeat(depth);

      // Show summary for large arrays (more than 30 elements)
      const totalElements = countElements(arr);
      if (depth === 0 && totalElements > 30) {
        const shape = getShape(arr);
        
        // Check if this is a table (array of objects)
        if (arr.length > 0 && arr.every((el: any) => typeof el === 'object' && el !== null && !Array.isArray(el))) {
          return generateTableSummary(arr);
        }
        
        // Check if this is a 2D array (matrix)
        if (shape.length === 2 && arr.every((el: any) => Array.isArray(el))) {
          return generateMatrixSummary(arr);
        }
        
        // Default array summary
        const nums = flattenNumbers(arr);
        let mean = 'n/a';
        let std = 'n/a';
        if (nums.length > 0) {
          const m = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
          const varVal = nums.reduce((a: number, b: number) => a + (b - m) ** 2, 0) / nums.length;
          mean = m.toFixed(4);
          std = Math.sqrt(varVal).toFixed(4);
        }
        return [
          `${shape.length}D array summary`,
          `shape : ${shape.join(' x ')}`,
          `size  : ${totalElements}`,
          `mean  : ${mean}`,
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
    <Card className="h-full w-full flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
            <CardTitle className="text-lg">Console</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
            <div className="h-full w-full flex flex-col bg-offBlack text-white rounded-lg shadow-inner overflow-hidden">
              <div ref={resultsRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-4">
                  {results.map((result, index) => (
                      <div key={index} className="flex items-start">
                          <span className="text-offBlack/50 mr-2 select-none">{result.timestamp}</span>
                          <span className={`mr-2 font-bold ${
                              result.type === 'query' ? 'text-blue' :
                              result.type === 'error' ? 'text-red' :
                              result.type === 'system' ? 'text-gold' :
                              'text-green'
                          }`}>
                              {result.type === 'query' ? '>' : result.type === 'error' ? '!' : result.type === 'system' ? '#' : '<'}
                          </span>
                          <pre className="flex-1 whitespace-pre-wrap break-words">{formatResult(result.content)}</pre>
                      </div>
                  ))}
              </div>

              <div className="p-2 border-t border-offBlack16 flex-shrink-0">
                  <Textarea
                      value={query}
                      onChange={handleQueryChange}
                      onKeyDown={handleKeyPress}
                      placeholder={isConnected ? "Enter kdb+ query..." : "Not connected. Click Connect."}
                      className="w-full bg-offBlack border-offBlack16 focus:ring-blue resize-none"
                      disabled={!isConnected || isLoading}
                  />
              </div>

              <div className="px-4 py-2 border-t border-offBlack16 flex items-center justify-between flex-shrink-0">
                  <StatusBar isConnected={isConnected} isLoading={isLoading} />
                  <div className="flex items-center space-x-2">
                      <Button onClick={clearResults} variant="destructive" size="sm" disabled={results.length === 0}>Clear</Button>
                      {isConnected ? (
                          <Button onClick={handleDisconnect} variant="secondary" size="sm">Disconnect</Button>
                      ) : (
                          <Button onClick={handleConnect} variant="secondary" size="sm" disabled={isLoading}>{isLoading ? "Connecting..." : "Connect"}</Button>
                      )}
                  </div>
              </div>
            </div>
        </CardContent>
    </Card>
  );
}; 