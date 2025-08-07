import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// @ts-ignore - No TS types for text-table
import table from 'text-table';
import { KdbWebSocketClient } from './kdb';
import { GetKdbPort } from '../wailsjs/go/main/App';
// @ts-ignore - ResetKdbServer exists but TS definitions may be cached
import { ResetKdbServer } from '../wailsjs/go/main/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Play, Pause, ChevronDown, ChevronUp, Trash2, Mouse, X, RotateCcw } from 'lucide-react';
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

// New interface for grouped query/response pairs
interface ResultGroup {
  id: string;
  query: string;
  queryTimestamp: string;
  response?: any;
  responseTimestamp?: string;
  error?: string;
  errorTimestamp?: string;
  isExpanded: boolean;
}

// Live session interface for live/mouse mode
export interface LiveSession {
  id: string;
  mode: 'live' | 'mouse';
  query: string;
  startTime: string;
  endTime?: string;
  results: any[];
  isExpanded: boolean;
}

interface KdbConsoleProps {
  onVisualData?: (data: any) => void;
  onQuerySet?: (setQueryFn: (query: string) => void) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
  activeView?: string;
  hasVisualData?: boolean;
  onQueryChange?: (query: string) => void;
  onLastQueryChange?: (lastQuery: string) => void;
  onCurrentSessionChange?: (session: LiveSession | null) => void;
  isMouseMode?: boolean;
  isLiveMode?: boolean;
  onToggleMouseMode?: () => void;
  onToggleLiveMode?: () => void;
  onProvideExecutor?: (executeFn: (query: string) => void) => void;
}

export const KdbConsole: React.FC<KdbConsoleProps> = ({ 
  onVisualData, 
  onQuerySet, 
  onConnectionChange, 
  activeView,
  hasVisualData,
  onQueryChange,
  onLastQueryChange,
  onCurrentSessionChange,
  isMouseMode = false,
  isLiveMode = false,
  onToggleMouseMode,
  onToggleLiveMode,
  onProvideExecutor
}) => {
  const kdbClientRef = useRef<KdbWebSocketClient | null>(null);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [resultGroups, setResultGroups] = useState<ResultGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempQuery, setTempQuery] = useState('');
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isConsoleHovered, setIsConsoleHovered] = useState(false);
  
  // Interactive coordinates state
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [lastQuery, setLastQuery] = useState('');
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isLiveOutputExpanded, setIsLiveOutputExpanded] = useState(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastQueryTimeRef = useRef(0);
  
  // Session management for live/mouse mode
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Combined entries for render (memoized and capped to reduce DOM work)
  const combinedEntries = useMemo(() => {
    const all = [
      ...resultGroups.map((group) => ({
        type: 'resultGroup' as const,
        data: group,
        timestamp: group.queryTimestamp,
        key: group.id
      })),
      ...results.map((result, index) => ({
        type: 'result' as const,
        data: result,
        timestamp: result.timestamp,
        key: `result-${index}`
      })),
      ...liveSessions.map((session) => ({
        type: 'session' as const,
        data: session,
        timestamp: session.startTime,
        key: session.id
      }))
    ];
    const parseTime = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length < 2) return 0;
      const [hours, minutes, seconds = 0] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    };
    const sorted = all.sort((a, b) => parseTime(a.timestamp) - parseTime(b.timestamp));
    const MAX_ENTRIES = 300;
    return sorted.length > MAX_ENTRIES ? sorted.slice(sorted.length - MAX_ENTRIES) : sorted;
  }, [resultGroups, results, liveSessions]);

  // Focus the query input
  const focusQueryInput = useCallback(() => {
    if (queryInputRef.current && isConnected && !isLoading) {
      queryInputRef.current.focus();
    }
  }, [isConnected, isLoading]);

  // Expose setQuery function to parent component with focus
  useEffect(() => {
    if (onQuerySet) {
      onQuerySet((query: string) => {
        setQuery(query);
        // Focus the input after setting the query
        setTimeout(() => focusQueryInput(), 100);
      });
    }
  }, [onQuerySet, focusQueryInput]);

  // Define executeQuery function early so it can be used in useEffect
  const executeQuery = useCallback(async () => {
    if (!query.trim() || !kdbClientRef.current) {
      console.log('⚠️ Query execution skipped - empty query or no client');
      return;
    }

    console.log('🚀 Starting query execution...');
    console.log('📝 Original query:', query.trim());
    
    setIsLoading(true);
    
    // Always prepend mouse coordinates to queries
    const mousePrefix = `mouseX:${mouseX.toFixed(6)}; mouseY:${mouseY.toFixed(6)}; `;
    const finalQuery = mousePrefix + query.trim();
    setLastQuery(query.trim()); // Store the original query for live mode
    
    console.log('🎯 Final query with coordinates:', finalQuery);
    console.log('🕐 Query execution started at:', new Date().toISOString());
    
    // Create a new result group for this query
    const groupId = `query-${Date.now()}`;
    const queryTimestamp = new Date().toLocaleTimeString();
    
    const newGroup: ResultGroup = {
      id: groupId,
      query: query.trim(),
      queryTimestamp,
      isExpanded: false // Start collapsed for cleaner interface
    };
    
    console.log('📊 Created result group:', groupId);
    setResultGroups(prev => [...prev, newGroup]);

    // Add to history if it's not already the last item
    setQueryHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== query.trim()) {
        console.log('📚 Added to query history:', query.trim());
        return [...prev, query.trim()];
      }
      return prev;
    });

    try {
      console.log('📤 Sending query to KDB server...');
      const result = await kdbClientRef.current.query(finalQuery);
      const responseTimestamp = new Date().toLocaleTimeString();
      
      console.log('📨 Raw query result received:', result);
      console.log('📨 Result type:', typeof result);
      console.log('📨 Result received at:', responseTimestamp);
      
      // Check if the result is actually an error object from KDB+
      const isKdbError = result && typeof result === 'object' && 
                        (result.error || result.Error || 
                         (result.msg && (result.error === 'ExecutionError' || result.Error === 'ExecutionError')));
      
      if (isKdbError) {
        // Treat KDB+ error objects as errors
        const errorMessage = result.msg || result.message || result.error || result.Error || 'Unknown KDB+ error';
        console.error('❌ Query returned KDB+ error:', {
          fullResult: result,
          extractedError: errorMessage,
          originalQuery: query.trim(),
          finalQuery: finalQuery
        });
        setResultGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, error: `KDB+ Error: ${errorMessage}`, errorTimestamp: responseTimestamp }
            : group
        ));
      } else {
        // Update the result group with the successful response
        console.log('✅ Query executed successfully');
        console.log('✅ Success result details:', {
          resultType: typeof result,
          isArray: Array.isArray(result),
          arrayLength: Array.isArray(result) ? result.length : 'N/A',
          resultPreview: typeof result === 'object' ? JSON.stringify(result).substring(0, 200) + '...' : String(result).substring(0, 200),
          originalQuery: query.trim()
        });
        
        setResultGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, response: result, responseTimestamp }
            : group
        ));
        
        // Forward the last query result to visual output, but exclude plain text, single values, and null/invalid data
        if (onVisualData && typeof result !== 'string' && typeof result !== 'number' && typeof result !== 'boolean' && 
            result !== null && result !== undefined && 
            !(Array.isArray(result) && (result.length === 0 || result.every(item => item === null || item === undefined)))) {
          console.log('📊 Forwarding result to visual output');
          onVisualData(result);
        } else {
          console.log('🚫 Not forwarding to visual output - result is simple value or null/empty');
        }
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorTimestamp = new Date().toLocaleTimeString();
        
        console.error('❌ Query execution exception:', {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace',
          originalQuery: query.trim(),
          finalQuery: finalQuery
        });
        
        // Update the result group with the error
        setResultGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, error: `Query failed: ${errorMessage}`, errorTimestamp }
            : group
        ));
    } finally {
      setIsLoading(false);
      setQuery('');
      setHistoryIndex(-1);
      setTempQuery('');
      console.log('🏁 Query execution finished, input cleared and focused');
      // Focus the input after query execution
      setTimeout(() => focusQueryInput(), 100);
    }
  }, [query, onVisualData, focusQueryInput, mouseX, mouseY]);

  // Provide external executor to run queries from outside (e.g., Right Dock examples)
  useEffect(() => {
    if (onProvideExecutor) {
      onProvideExecutor((externalQuery: string) => {
        setQuery(externalQuery);
        // Execute after state updates in next tick
        setTimeout(() => {
          executeQuery();
        }, 0);
      });
    }
  }, [onProvideExecutor, executeQuery]);

  // Focus input when component mounts and is connected
  useEffect(() => {
    if (isConnected && !isLoading) {
      setTimeout(() => focusQueryInput(), 200);
    }
  }, [isConnected, isLoading, focusQueryInput]);

  // Focus input after successful connection
  useEffect(() => {
    if (isConnected && connectionAttempts > 0) {
      setTimeout(() => focusQueryInput(), 300);
    }
  }, [isConnected, connectionAttempts, focusQueryInput]);

  // Focus input when clicking on the console area
  const handleConsoleClick = (e: React.MouseEvent) => {
    // Only focus if clicking on the console area but not on interactive elements
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.console-results')) {
      focusQueryInput();
    }
  };

  // Focus input when view changes to console
  useEffect(() => {
    if (activeView === 'console' && isConnected && !isLoading) {
      setTimeout(() => focusQueryInput(), 100);
    }
  }, [activeView, isConnected, isLoading, focusQueryInput]);

  // Optimized mouse coordinate tracking (throttled and conditional)
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const lastStateUpdateRef = useRef(0);

  useEffect(() => {
    const isTrackingActive = isMouseMode || isLiveMode || isInputFocused || isConsoleHovered;
    if (!isTrackingActive) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const normalizedX = e.clientX / window.innerWidth;
      const normalizedY = e.clientY / window.innerHeight;
      const newX = Math.max(0, Math.min(1, normalizedX));
      const newY = Math.max(0, Math.min(1, normalizedY));

      // Store latest coordinates in refs
      mouseXRef.current = newX;
      mouseYRef.current = newY;

      // Only update React state at most every 100ms to avoid re-render thrash
      const now = Date.now();
      if (now - lastStateUpdateRef.current > 100) {
        lastStateUpdateRef.current = now;
        setMouseX(newX);
        setMouseY(newY);
      }

      // If in mouse mode, run throttled queries when movement is significant
      const deltaX = Math.abs(newX - lastMousePosRef.current.x);
      const deltaY = Math.abs(newY - lastMousePosRef.current.y);
      const hasMoved = deltaX > 0.01 || deltaY > 0.01;
      lastMousePosRef.current = { x: newX, y: newY };

      const queryToUse = (lastQuery || query.trim());
      if (isMouseMode && hasMoved && queryToUse && isConnected && !isLoading) {
        const nowTick = Date.now();
        if (nowTick - lastQueryTimeRef.current > 100) {
          lastQueryTimeRef.current = nowTick;
          if (kdbClientRef.current) {
            const mousePrefix = `mouseX:${newX.toFixed(6)}; mouseY:${newY.toFixed(6)}; `;
            const fullQuery = mousePrefix + queryToUse;
            kdbClientRef.current.query(fullQuery).then(result => {
              const isKdbError = result && typeof result === 'object' &&
                (result.error || result.Error || (result.msg && (result.error === 'ExecutionError' || result.Error === 'ExecutionError')));
              if (isKdbError) {
                const errorMessage = result.msg || result.message || result.error || result.Error || 'Unknown KDB+ error';
                const errorEntry = {
                  timestamp: new Date().toLocaleTimeString(),
                  error: `KDB+ Error: ${errorMessage}`,
                  coordinates: { x: newX, y: newY }
                };
                setLiveResults(prev => [...prev, errorEntry]);
                if (currentSessionId) {
                  setLiveSessions(prev => prev.map(session => session.id === currentSessionId ? { ...session, results: [...session.results, errorEntry] } : session));
                }
              } else {
                const resultEntry = {
                  timestamp: new Date().toLocaleTimeString(),
                  result,
                  coordinates: { x: newX, y: newY }
                };
                setLiveResults(prev => [...prev, resultEntry]);
                if (currentSessionId) {
                  setLiveSessions(prev => prev.map(session => session.id === currentSessionId ? { ...session, results: [...session.results, resultEntry] } : session));
                }
                if (onVisualData && typeof result !== 'string' && typeof result !== 'number' && typeof result !== 'boolean' &&
                  result !== null && result !== undefined && !(Array.isArray(result) && (result.length === 0 || result.every(item => item === null || item === undefined))) &&
                  resultGroups.length === 0) {
                  onVisualData(result);
                }
              }
            }).catch(error => {
              const errorEntry = {
                timestamp: new Date().toLocaleTimeString(),
                error: error.message,
                coordinates: { x: newX, y: newY }
              };
              setLiveResults(prev => [...prev, errorEntry]);
              if (currentSessionId) {
                setLiveSessions(prev => prev.map(session => session.id === currentSessionId ? { ...session, results: [...session.results, errorEntry] } : session));
              }
            });
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMouseMode, isLiveMode, isInputFocused, isConsoleHovered, isConnected, isLoading, currentSessionId, onVisualData, resultGroups.length, lastQuery, query]);

  // Live mode execution (interval-based)
  useEffect(() => {
    const queryToUse = lastQuery || query.trim();
    if (isLiveMode && queryToUse && isConnected && !isLoading) {
      const interval = setInterval(() => {
        if (kdbClientRef.current && queryToUse) {
          // Get current mouse coordinates at the time of execution
          const currentMouseX = mouseX;
          const currentMouseY = mouseY;
          const mousePrefix = `mouseX:${currentMouseX.toFixed(6)}; mouseY:${currentMouseY.toFixed(6)}; `;
          const fullQuery = mousePrefix + queryToUse;
          
          kdbClientRef.current.query(fullQuery).then(result => {
            // Check if the result is actually an error object from KDB+
            const isKdbError = result && typeof result === 'object' && 
                              (result.error || result.Error || 
                               (result.msg && (result.error === 'ExecutionError' || result.Error === 'ExecutionError')));
            
            if (isKdbError) {
              // Handle KDB+ error objects
              const errorMessage = result.msg || result.message || result.error || result.Error || 'Unknown KDB+ error';
              const errorEntry = { 
                timestamp: new Date().toLocaleTimeString(),
                error: `KDB+ Error: ${errorMessage}`,
                coordinates: { x: currentMouseX, y: currentMouseY }
              };
              
              // Add to live results for current display
              setLiveResults(prev => [...prev, errorEntry]);
              
              // Add to current session
              if (currentSessionId) {
                setLiveSessions(prev => prev.map(session => 
                  session.id === currentSessionId 
                    ? { ...session, results: [...session.results, errorEntry] }
                    : session
                ));
              }
            } else {
              // Handle successful results
              const resultEntry = { 
                timestamp: new Date().toLocaleTimeString(),
                result,
                coordinates: { x: currentMouseX, y: currentMouseY }
              };
              
              // Add to live results for current display
              setLiveResults(prev => [...prev, resultEntry]);
              
              // Add to current session
              if (currentSessionId) {
                setLiveSessions(prev => prev.map(session => 
                  session.id === currentSessionId 
                    ? { ...session, results: [...session.results, resultEntry] }
                    : session
                ));
              }
              
              // Don't update visual data from live mode if there are regular query results
              if (onVisualData && typeof result !== 'string' && typeof result !== 'number' && typeof result !== 'boolean' && 
                  result !== null && result !== undefined && 
                  !(Array.isArray(result) && (result.length === 0 || result.every(item => item === null || item === undefined))) && 
                  resultGroups.length === 0) {
                onVisualData(result);
              }
            }
          }).catch(error => {
            console.error('Live mode query failed:', error);
            const errorEntry = { 
              timestamp: new Date().toLocaleTimeString(),
              error: error.message,
              coordinates: { x: currentMouseX, y: currentMouseY }
            };
            
            // Add to live results for current display
            setLiveResults(prev => [...prev, errorEntry]);
            
            // Add to current session
            if (currentSessionId) {
              setLiveSessions(prev => prev.map(session => 
                session.id === currentSessionId 
                  ? { ...session, results: [...session.results, errorEntry] }
                  : session
              ));
            }
          });
        }
      }, 100); // 0.1 seconds
      
      liveIntervalRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }
  }, [isLiveMode, lastQuery, query, isConnected, isLoading, onVisualData, resultGroups.length, currentSessionId]); // Removed mouseX, mouseY from dependencies


  // Session creation and management for live/mouse modes
  const createSession = useCallback((mode: 'live' | 'mouse', query: string) => {
    const sessionId = `${mode}-${Date.now()}`;
    const startTime = new Date().toLocaleTimeString();
    
    const newSession: LiveSession = {
      id: sessionId,
      mode,
      query,
      startTime,
      results: [],
      isExpanded: true // Start expanded to show activity
    };
    
    setLiveSessions(prev => [...prev, newSession]);
    setCurrentSessionId(sessionId);
    
    console.log(`🎯 Created new ${mode} session:`, sessionId, 'with query:', query);
    return sessionId;
  }, []);
  
  const endCurrentSession = useCallback(() => {
    if (currentSessionId) {
      const endTime = new Date().toLocaleTimeString();
      setLiveSessions(prev => prev.map(session => 
        session.id === currentSessionId
          ? { ...session, endTime }
          : session
      ));
      
      // Debug logging to see session state when ending
      setLiveSessions(prev => {
        const endingSession = prev.find(s => s.id === currentSessionId);
        console.log(`🏁 Ended session:`, currentSessionId, `with ${endingSession?.results.length || 0} results`);
        if (endingSession && endingSession.results.length > 0) {
          console.log(`🔍 Session results:`, endingSession.results);
        }
        return prev;
      });
      
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);
  
  // Effect to handle mode changes and session creation/ending
  useEffect(() => {
    const queryToUse = lastQuery || query.trim();
    if ((isMouseMode || isLiveMode) && queryToUse && !currentSessionId) {
      const mode = isMouseMode ? 'mouse' : 'live';
      createSession(mode, queryToUse);
    } else if ((!isMouseMode && !isLiveMode) && currentSessionId) {
      endCurrentSession();
    }
  }, [isMouseMode, isLiveMode, lastQuery, query, currentSessionId, createSession, endCurrentSession]);
  
  // Notify parent of lastQuery changes
  useEffect(() => {
    if (onLastQueryChange) {
      onLastQueryChange(lastQuery);
    }
  }, [lastQuery, onLastQueryChange]);
  
  // Notify parent of current session changes
  useEffect(() => {
    if (onCurrentSessionChange) {
      const currentSession = currentSessionId ? liveSessions.find(s => s.id === currentSessionId) || null : null;
      onCurrentSessionChange(currentSession);
    }
  }, [currentSessionId, liveSessions, onCurrentSessionChange]);
  
  // Clear live results
  const clearLiveResults = useCallback(() => {
    setLiveResults([]);
  }, []);
  
  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    // End any active live/mouse mode sessions
    if (currentSessionId) {
      if (isLiveMode && onToggleLiveMode) {
        onToggleLiveMode();
        console.log('Live mode ended due to clearing all sessions');
      }
      if (isMouseMode && onToggleMouseMode) {
        onToggleMouseMode();
        console.log('Mouse mode ended due to clearing all sessions');
      }
    }
    
    setLiveSessions([]);
    setLiveResults([]);
    setCurrentSessionId(null);
  }, [currentSessionId, isLiveMode, isMouseMode, onToggleLiveMode, onToggleMouseMode]);
  
  // Toggle session expansion
  const toggleSessionExpansion = useCallback((sessionId: string) => {
    setLiveSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isExpanded: !session.isExpanded }
        : session
    ));
  }, []);
  
  // Remove a specific session
  const removeSession = useCallback((sessionId: string) => {
    // Check if we're removing the currently active session
    if (currentSessionId === sessionId) {
      // End the current live/mouse mode session properly
      if (isLiveMode && onToggleLiveMode) {
        onToggleLiveMode();
        console.log('Live mode ended due to session deletion:', sessionId);
      }
      if (isMouseMode && onToggleMouseMode) {
        onToggleMouseMode();
        console.log('Mouse mode ended due to session deletion:', sessionId);
      }
      
      // Clear the current session ID
      setCurrentSessionId(null);
      
      // Clear current live results since the active session is being removed
      setLiveResults([]);
    }
    
    // Update the session with end time before removing it
    const currentTime = new Date().toLocaleTimeString();
    setLiveSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, endTime: currentTime }
          : session
      ).filter(session => session.id !== sessionId)
    );
  }, [currentSessionId, isLiveMode, isMouseMode, onToggleLiveMode, onToggleMouseMode]);

  // Result group management functions
  const toggleResultGroupExpansion = useCallback((groupId: string) => {
    setResultGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ));
  }, []);
  
  const removeResultGroup = useCallback((groupId: string) => {
    setResultGroups(prev => {
      const filtered = prev.filter(group => group.id !== groupId);
      
      // Update visual output with the last remaining query result
      if (onVisualData) {
        const successfulGroups = filtered.filter(group => group.response !== undefined && !group.error);
        const lastSuccessfulGroup = successfulGroups[successfulGroups.length - 1];
        
        if (lastSuccessfulGroup && typeof lastSuccessfulGroup.response !== 'string' && 
            typeof lastSuccessfulGroup.response !== 'number' && 
            typeof lastSuccessfulGroup.response !== 'boolean') {
          onVisualData(lastSuccessfulGroup.response);
        } else {
          onVisualData(null);
        }
      }
      
      return filtered;
    });
  }, [onVisualData]);

  const clearAllResultGroups = useCallback(() => {
    setResultGroups([]);
    if (onVisualData) {
      onVisualData(null);
    }
  }, [onVisualData]);

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [results]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any remaining intervals (though we're not using them anymore)
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    };
  }, []);

  // Clear visual data when results are empty
  useEffect(() => {
    if (results.length === 0 && resultGroups.length === 0 && onVisualData) {
      onVisualData(null);
    }
  }, [results.length, resultGroups.length, onVisualData]);

  const addResult = useCallback((type: Result['type'], content: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults((prev) => [...prev, { type, content, timestamp }]);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 Initializing KDB WebSocket client...');
        const port = await GetKdbPort();
        console.log(`📡 Got KDB port from backend: ${port}`);
        
        if (!kdbClientRef.current) {
          const wsUrl = `ws://localhost:${port}`;
          console.log(`🔗 Creating WebSocket client for: ${wsUrl}`);
          
          const client = new KdbWebSocketClient(wsUrl);
          
          client.setOnConnect(() => {
            console.log('✅ WebSocket connected successfully!');
            setIsConnected(true);
            setConnectionAttempts(0);
            onConnectionChange?.('connected');
            
            // Only show success toast on manual connection attempts
            if (connectionAttempts > 0) {
              console.log('🎉 Showing success toast for manual connection');
              toast.success('Connected successfully!', {
                duration: 2000,
              });
            } else {
              console.log('ℹ️ Skipping success toast - auto connection');
            }
            
            // Focus input after successful connection
            console.log('🎯 Focusing input after connection');
            setTimeout(() => focusQueryInput(), 500);
          });
          
          client.setOnClose(() => {
            console.log('🔌 WebSocket connection closed');
            setIsConnected(false);
            onConnectionChange?.('disconnected');
            
            // Only show disconnect toast if it was unexpected (not manual disconnect)
            if (connectionAttempts === 0) {
              console.log('⚠️ Showing disconnect toast - unexpected disconnection');
              toast.info('Connection lost. Click Connect to reconnect.', {
                duration: 3000,
              });
            } else {
              console.log('ℹ️ Skipping disconnect toast - manual disconnection');
            }
          });
          
          client.setOnError((error: Error) => {
            console.error('❌ WebSocket error:', {
              error,
              message: error.message,
              stack: error.stack
            });
            toast.error(`Connection error: ${error.message}`, {
              duration: 4000,
            });
          });
          
          kdbClientRef.current = client;
          console.log('✅ WebSocket client created and configured');
          
          // Auto-connect on initialization
          console.log('🔄 Auto-connecting to KDB server...');
          try {
            await client.connect();
            console.log('✅ Auto-connection successful!');
          } catch (autoConnectError) {
            console.warn('⚠️ Auto-connection failed, user will need to connect manually:', autoConnectError);
            // Don't show error toast for auto-connection failures
          }
        } else {
          console.log('ℹ️ WebSocket client already exists, skipping initialization');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('❌ Client initialization failed:', {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        toast.error(`Initialization failed: ${errorMessage}`, {
          duration: 4000,
        });
      }
    };
    init();
  }, [connectionAttempts]);

  const handleConnect = useCallback(async () => {
    if (!kdbClientRef.current) {
      console.error('❌ Connect failed: Client not initialized');
      toast.error('Client not initialized.', {
        duration: 3000,
      });
      return;
    }
    
    console.log('🔌 Starting connection process...');
    setIsLoading(true);
    setConnectionAttempts(prev => {
      const newAttempts = prev + 1;
      console.log(`📞 Connection attempt #${newAttempts}`);
      return newAttempts;
    });
    onConnectionChange?.('connecting');
    
    try {
      console.log('📡 Calling client.connect()...');
      await kdbClientRef.current.connect();
      console.log('✅ Connection successful!');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('❌ Connection failed:', {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        onConnectionChange?.('disconnected');
        toast.error(`Connection failed: ${errorMessage}`, {
          duration: 4000,
          position: 'top-center',
        });
    } finally {
      setIsLoading(false);
      console.log('🏁 Connection process finished (loading state cleared)');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionAttempts(0); // Reset so we don't show disconnect toast
    kdbClientRef.current?.disconnect();
    // Focus input after disconnect (user might want to reconnect)
    setTimeout(() => focusQueryInput(), 100);
  }, [focusQueryInput]);



  const clearResults = () => {
    setResults([]);
    clearAllResultGroups();
    // Focus input after clearing results
    setTimeout(() => focusQueryInput(), 100);
  };

  // Comprehensive console clear function that resets everything to initial state
  const clearConsole = useCallback(() => {
    // Stop any active modes first
    if (isLiveMode && onToggleLiveMode) {
      onToggleLiveMode();
    }
    if (isMouseMode && onToggleMouseMode) {
      onToggleMouseMode();
    }
    
    // Clear intervals
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    
    // Reset all result-related state
    setResults([]);
    setResultGroups([]);
    setLiveResults([]);
    setLiveSessions([]);
    
    // Reset query and input state
    setQuery('');
    setQueryHistory([]);
    setHistoryIndex(-1);
    setTempQuery('');
    setLastQuery('');
    
    // Reset session state
    setCurrentSessionId(null);
    
    // Clear visual data
    if (onVisualData) {
      onVisualData(null);
    }
    
    // Show success feedback
    toast.success('Console cleared successfully', {
      duration: 2000,
    });
    
    // Focus input after clearing
    setTimeout(() => focusQueryInput(), 100);
  }, [isLiveMode, isMouseMode, onVisualData, focusQueryInput, onToggleLiveMode, onToggleMouseMode]);

  // Check if there's anything to clear
  const hasDataToClear = results.length > 0 || 
                        resultGroups.length > 0 || 
                        liveSessions.length > 0 || 
                        liveResults.length > 0 || 
                        query.trim().length > 0 || 
                        queryHistory.length > 0;

  // Reset KDB server - clears all variables, tables, and state on server side
  const resetServer = useCallback(async () => {
    console.log('🔍 Reset server called - checking connection state:');
    console.log('  - React isConnected:', isConnected);
    console.log('  - kdbClientRef.current:', kdbClientRef.current ? 'exists' : 'null');
    console.log('  - WebSocket isConnected:', kdbClientRef.current?.getIsConnected());
    
    // Check both React state and actual WebSocket connection
    const wsConnected = kdbClientRef.current?.getIsConnected();
    if (!wsConnected || !kdbClientRef.current) {
      console.error('❌ Reset server failed: Not connected to KDB server');
      console.error('  - React isConnected:', isConnected);
      console.error('  - WebSocket isConnected:', wsConnected);
      console.error('  - kdbClientRef.current:', kdbClientRef.current ? 'exists' : 'null');
      toast.error('Not connected to KDB server', {
        duration: 3000,
      });
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to reset the KDB server?\n\n' +
      'This will:\n' +
      '• Delete ALL variables and tables\n' +
      '• Clear ALL server state\n' +
      '• Reset the KDB environment\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) {
      console.log('🚫 Reset server cancelled by user');
      return;
    }

    console.log('🔄 Starting KDB server reset process...');
    setIsLoading(true);
    
    try {
      console.log('📡 Calling backend ResetKdbServer() function...');
      
      // Get the reset command from the backend - better separation of concerns
      const resetCommand = await ResetKdbServer();
      
      console.log('📥 Backend response:', resetCommand);
      
      if (resetCommand.startsWith('ERROR:')) {
        console.error('❌ Backend returned error:', resetCommand);
        toast.error(resetCommand, {
          duration: 4000,
        });
        return;
      }

      console.log('📤 Executing reset command on KDB server:', resetCommand);
      console.log('🕐 Command execution started at:', new Date().toISOString());
      
      const result = await kdbClientRef.current.query(resetCommand);
      
      console.log('📨 Raw KDB server response:', result);
      console.log('📨 Response type:', typeof result);
      console.log('📨 Response received at:', new Date().toISOString());
      
      // Check if the result is an error object
      const isKdbError = result && typeof result === 'object' && 
                        (result.error || result.Error || 
                         (result.msg && (result.error === 'ExecutionError' || result.Error === 'ExecutionError')));
      
      if (isKdbError) {
        const errorMessage = result.msg || result.message || result.error || result.Error || 'Unknown KDB+ error';
        console.error('❌ KDB+ returned error object:', {
          fullResult: result,
          extractedError: errorMessage
        });
        toast.error(`Reset failed: ${errorMessage}`, {
          duration: 4000,
        });
      } else {
        // Handle successful reset
        const successMessage = typeof result === 'object' && result.message ? 
          result.message : 
          String(result);
        
        console.log('✅ KDB server reset successful!');
        console.log('✅ Success message:', successMessage);
        console.log('✅ Full result:', result);
        
        toast.success(successMessage, {
          duration: 3000,
        });

        // Also clear local console state
        console.log('🧹 Clearing local console state...');
        clearConsole();
        console.log('✅ Reset process completed successfully');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Reset server exception caught:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      toast.error(`Server reset failed: ${errorMessage}`, {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 Reset server process finished (loading state cleared)');
    }
  }, [isConnected, clearConsole]);

  // Global keyboard shortcuts for console operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when console is active and not typing in input
      if (activeView !== 'console' || document.activeElement === queryInputRef.current) return;
      
      // Ctrl/Cmd + Shift + X to clear console
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        if (hasDataToClear) {
          clearConsole();
        }
      }
      
      // Ctrl/Cmd + Shift + R to reset server
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (isConnected) {
          resetServer();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeView, clearConsole, hasDataToClear, isConnected, resetServer]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    // Notify parent of query change
    onQueryChange?.(newQuery);
    // Reset history navigation when user types
    if (historyIndex !== -1) {
      setHistoryIndex(-1);
      setTempQuery('');
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    // Add a subtle pulse animation
    if (queryInputRef.current) {
      queryInputRef.current.style.animation = 'focus-pulse 0.3s ease-in-out';
      setTimeout(() => {
        if (queryInputRef.current) {
          queryInputRef.current.style.animation = '';
        }
      }, 300);
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
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
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center space-x-2">
                    Console
                    <span 
                        className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full cursor-help"
                        title="These coordinates are available to use in expressions whenever you like"
                    >
                        mouseX:{mouseX.toFixed(3)}, mouseY:{mouseY.toFixed(3)}
                    </span>
                    {isInputFocused && (
                        <span className="text-xs text-blue bg-blue/10 px-2 py-1 rounded-full animate-pulse">
                            Ready
                        </span>
                    )}
                    {/* Mouse and Live status indicators removed - now only available in Visual Output Panel */}
                </CardTitle>
                <div className="flex items-center space-x-2">
                    {/* Visual output button removed - now only available in right dock */}
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
            <div 
                ref={consoleContainerRef}
                className="h-full w-full flex flex-col bg-[#0b0f10] text-[#39ff14] rounded-md shadow-inner overflow-hidden" 
                onClick={handleConsoleClick}
                onMouseEnter={() => setIsConsoleHovered(true)}
                onMouseLeave={() => setIsConsoleHovered(false)}
            >
              <div ref={resultsRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-4 console-results">
                  {combinedEntries.map((entry) => {
                          if (entry.type === 'result') {
                              const result = entry.data;
                              return (
                                  <div key={entry.key} className="flex items-start">
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
                              );
                          } else if (entry.type === 'resultGroup') {
                              // Query/Response group
                              const group = entry.data as ResultGroup;
                              return (
                                  <div key={entry.key} className="border border-white/10 rounded-md p-3 bg-white/5">
                                      <div 
                                          className="flex items-center justify-between cursor-pointer hover:bg-offBlack/10 rounded p-2 -m-2"
                                          onClick={() => toggleResultGroupExpansion(group.id)}
                                      >
                                          <div className="flex-1">
                                              <div className="flex items-center space-x-2">
                                                  <span className="px-2 py-1 rounded text-[10px] font-semibold bg-white/10 text-neon-500 border border-neon-500/40">
                                                      QUERY
                                                  </span>
                                                  <span className="text-[#e5eef2]/70 text-sm">
                                                      {group.queryTimestamp}
                                                  </span>
                                                  <span className={`text-xs font-medium ${
                                                      group.error ? 'text-red-500 border border-red-500/40 px-2 py-1 rounded' : 
                                                      group.response !== undefined ? 'text-neon-500 border border-neon-500/40 px-2 py-1 rounded' : 'text-yellow-400 border border-yellow-400/40 px-2 py-1 rounded'
                                                  }`}>
                                                      {group.error ? '⚠️ Error' : 
                                                       group.response !== undefined ? '✅ Success' : '⏳ Pending'}
                                                  </span>
                                              </div>
                                              
                                              {/* Query Preview */}
                                              <div className="mt-1 text-xs text-[#e5eef2]/70">
                                                  <strong>Query:</strong> <code className="bg-white/10 px-1 rounded">{group.query}</code>
                                              </div>
                                              
                                              {/* Summary when collapsed */}
                                              {!group.isExpanded && group.response !== undefined && (
                                                  <div className="mt-2 text-xs text-[#e5eef2]/60">
                                                      <span className="text-neon-500">
                                                          Result: {(() => {
                                                              const response = group.response;
                                                              if (typeof response === 'object') {
                                                                  if (Array.isArray(response)) {
                                                                      if (response.length === 0) return 'Empty Array';
                                                                      if (response.length > 0 && response.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
                                                                          return `Table (${response.length} rows)`;
                                                                      }
                                                                      return `Array(${response.length})`;
                                                                  } else if (response === null) {
                                                                      return 'null';
                                                                  } else {
                                                                      const keys = Object.keys(response);
                                                                      if (keys.length === 0) return 'Empty Object';
                                                                      return `Object (${keys.length} properties)`;
                                                                  }
                                                              }
                                                              const str = String(response);
                                                              return str.length > 50 ? str.substring(0, 50) + '...' : str;
                                                          })()}
                                                      </span>
                                                      <div className="text-blue-400 mt-1">Click to expand full result</div>
                                                  </div>
                                              )}
                                              
                                              {!group.isExpanded && group.error && (
                                                  <div className="mt-2 text-xs text-red-500">
                                                      <span className="font-medium">⚠️ Error:</span> {group.error.substring(0, 80)}{group.error.length > 80 ? '...' : ''}
                                                      <div className="text-blue-400 mt-1 font-medium">Click to expand full error details</div>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex items-center space-x-1">
                                              <Button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeResultGroup(group.id);
                                                  }}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-red-500 hover:text-red-500 h-6 w-6 p-0"
                                                  title="Remove result group"
                                              >
                                                  <X className="h-3 w-3" />
                                              </Button>
                                              {group.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </div>
                                      </div>
                                      
                                      {/* Expanded Results */}
                                      {group.isExpanded && (
                                          <div className="mt-3 ml-4 border-l-2 border-white/10 pl-4">
                                              <div className="space-y-3">
                                                  {/* Query */}
                                                  <div className="flex items-start text-sm">
                                                      <span className="text-[#e5eef2]/40 mr-2 select-none text-xs">{group.queryTimestamp}</span>
                                                      <span className="mr-2 font-bold text-neon-500">{'>'}</span>
                                                      <pre className="flex-1 whitespace-pre-wrap break-words text-sm">{group.query}</pre>
                                                  </div>
                                                  
                                                  {/* Response or Error */}
                                                  {group.response !== undefined && (
                                                      <div className="flex items-start text-sm">
                                                          <span className="text-[#e5eef2]/40 mr-2 select-none text-xs">{group.responseTimestamp}</span>
                                                          <span className="mr-2 font-bold text-neon-500">{'<'}</span>
                                                          <pre className="flex-1 whitespace-pre-wrap break-words text-sm">{formatResult(group.response)}</pre>
                                                      </div>
                                                  )}
                                                  
                                                  {group.error && (
                                                      <div className="flex items-start text-sm">
                                                          <span className="text-[#e5eef2]/40 mr-2 select-none text-xs">{group.errorTimestamp}</span>
                                                          <span className="mr-2 font-bold text-red-500">!</span>
                                                          <pre className="flex-1 whitespace-pre-wrap break-words text-sm">{group.error}</pre>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          } else {
                              // Live/Mouse session
                              const session = entry.data as LiveSession;
                              return (
                                  <div key={entry.key} className="border border-white/10 rounded-md p-3 bg-white/5">
                                      <div 
                                          className="flex items-center justify-between cursor-pointer hover:bg-white/10 rounded p-2 -m-2"
                                          onClick={() => toggleSessionExpansion(session.id)}
                                      >
                                          <div className="flex-1">
                                              <div className="flex items-center space-x-2">
                                                  <span className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                                      session.mode === 'live' ? 'border-orange-400/40 text-orange-400' : 'border-neon-500/40 text-neon-500'
                                                  }`}>
                                                      {session.mode === 'live' ? 'LIVE' : 'MOUSE'}
                                                  </span>
                                                  <span className="text-[#e5eef2]/70 text-sm">
                                                      {session.results.length} results
                                                  </span>
                                                  {session.endTime ? (
                                                      <span className="text-[#e5eef2]/50 text-xs">
                                                          {session.startTime} - {session.endTime}
                                                      </span>
                                                  ) : (
                                                      <span className="text-neon-500 text-xs animate-pulse">
                                                          Active
                                                      </span>
                                                  )}
                                                  {session.results.length > 0 && (
                                                      <span className="text-blue-400 text-xs">
                                                          Last: {session.results[session.results.length - 1].timestamp}
                                                      </span>
                                                  )}
                                              </div>
                                              
                                              {/* Session Query */}
                                              <div className="mt-1 text-xs text-[#e5eef2]/70">
                                                  <strong>Query:</strong> <code className="bg-white/10 px-1 rounded">{session.query}</code>
                                              </div>
                                              
                                              {/* Session Summary (when collapsed) */}
                                              {!session.isExpanded && session.results.length > 0 && (
                                                  <div className="mt-2 text-xs text-[#e5eef2]/60">
                                                      <div className="flex items-center space-x-4">
                                                          {session.results[session.results.length - 1].error ? (
                                                              <span className="text-red-500">Last result: Error</span>
                                                          ) : (
                                                              <span className="text-neon-500">
                                                                  Last result: {typeof session.results[session.results.length - 1].result === 'object' ? 
                                                                      (Array.isArray(session.results[session.results.length - 1].result) ? 
                                                                          `Array(${session.results[session.results.length - 1].result.length})` : 
                                                                          'Object') : 
                                                                      String(session.results[session.results.length - 1].result).substring(0, 50)
                                                                  }{String(session.results[session.results.length - 1].result).length > 50 ? '...' : ''}
                                                              </span>
                                                          )}
                                                      </div>
                                                      <div className="text-blue-400 mt-1">Click to expand {session.results.length} results</div>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex items-center space-x-1">
                                              <Button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeSession(session.id);
                                                  }}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-red-500 hover:text-red-500 h-6 w-6 p-0"
                                                  title="Remove session"
                                              >
                                                  <X className="h-3 w-3" />
                                              </Button>
                                              {session.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </div>
                                      </div>
                                      
                                      {/* Session Results (when expanded) */}
                                      {session.isExpanded && (
                                          <div className="mt-3 ml-4 border-l-2 border-white/10 pl-4">
                                              <div className="max-h-96 overflow-y-auto">
                                                  {session.results.length > 0 ? (
                                                      <div className="space-y-2">
                                                          {session.results.map((result, resultIndex) => (
                                                              <div key={resultIndex} className="flex items-start text-sm">
                                                                  <span className="text-[#e5eef2]/40 mr-2 select-none text-xs">{result.timestamp}</span>
                                                                  <span className="text-purple-400 mr-2 font-mono text-xs">
                                                                      ({result.coordinates.x.toFixed(3)}, {result.coordinates.y.toFixed(3)})
                                                                  </span>
                                                                  <span className={`mr-2 font-bold ${
                                                                      result.error ? 'text-red-500' : 'text-neon-500'
                                                                  }`}>
                                                                      {result.error ? '!' : '<'}
                                                                  </span>
                                                                  <pre className="flex-1 whitespace-pre-wrap break-words text-xs">
                                                                      {result.error ? result.error : formatResult(result.result)}
                                                                  </pre>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  ) : (
                                                      <div className="text-center text-[#e5eef2]/50 text-sm py-4">
                                                          No results yet
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          }
                      })}
              </div>

              <div className={`p-2 border-t border-white/10 flex-shrink-0 transition-all duration-200 ${isInputFocused ? 'bg-white/5' : ''}`}>
                  <Textarea
                      ref={queryInputRef}
                      value={query}
                      onChange={handleQueryChange}
                      onKeyDown={handleKeyPress}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder={isConnected ? "Enter kdb+ query... (Ctrl+L to focus)" : "Not connected. Click Connect."}
                      className={`w-full bg-[#0b0f10] border-white/15 focus:ring-neon-500/60 focus:border-neon-500/60 text-[#e5eef2] placeholder:text-[#e5eef2]/60 resize-none font-mono text-sm transition-all duration-200 ${isInputFocused ? 'shadow-[0_0_20px_rgba(57,255,20,0.15)]' : ''}`}
                      disabled={!isConnected || isLoading}
                  />
              </div>

              <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                  <StatusBar isConnected={isConnected} isLoading={isLoading} />
                  <div className="flex items-center space-x-2">
                      <Button 
                          onClick={clearConsole} 
                          variant="destructive" 
                          size="sm" 
                          disabled={!hasDataToClear}
                          title={hasDataToClear ? "Clear all console data, queries, and reset state (Ctrl+Shift+X)" : "Nothing to clear"}
                      >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear Console
                      </Button>
                      {isConnected ? (
                          <Button onClick={handleDisconnect} variant="secondary" size="sm">Disconnect</Button>
                      ) : (
                          <Button 
                              onClick={() => {
                                  handleConnect();
                                  // Focus input after connection attempt
                                  setTimeout(() => focusQueryInput(), 100);
                              }} 
                              variant="secondary" 
                              size="sm" 
                              disabled={isLoading}
                          >
                              {isLoading ? "Connecting..." : "Connect"}
                          </Button>
                      )}
                  </div>
              </div>
            </div>
        </CardContent>
    </Card>
  );
}; 