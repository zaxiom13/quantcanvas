import React, { useMemo, useRef, useEffect, Component, ReactNode } from 'react';
import { BarChart3, Mouse, Play, Pause, Download, FileJson, FileSpreadsheet, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Bar } from 'react-chartjs-2';
import { exportChartPNG, exportCanvasPNG, exportJSON, exportCSV, exportText, maybeExportCSVFromUnknown } from '../lib/export';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Error boundary component to catch rendering errors in table
class TableErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Table rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0b0f10] rounded-md border border-white/10">
          <div className="text-center text-[#e5eef2] p-4">
            <p className="text-red-400 mb-2">Table rendering error</p>
            <p className="text-sm opacity-70">Data structure may be changing too rapidly</p>
            <p className="text-xs opacity-50 mt-2">Try pausing mouse mode or using a simpler query</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface VisualOutputPanelProps {
  data: any;
  isMouseMode: boolean;
  isLiveMode: boolean;
  onToggleMouseMode: () => void;
  onToggleLiveMode: () => void;
  hasQuery: boolean;
  lastQuery?: string;
}

const ImageCanvas: React.FC<{ data: any }> = React.memo(({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isGrayscaleMatrix = (arr: any): boolean => Array.isArray(arr) && arr.length > 0 && arr.every((row) => Array.isArray(row) && row.every((v) => typeof v === 'number'));
  const isColorMatrix = (arr: any): boolean => Array.isArray(arr) && arr.length > 0 && arr.every((row) => Array.isArray(row) && row.every((pix) => Array.isArray(pix) && (pix.length === 3 || pix.length === 4)));
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const CANVAS_SIZE = 800;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (isGrayscaleMatrix(data)) {
      const h = data.length;
      const w = Math.max(...data.map((r: any[]) => r.length));
      let min = Infinity, max = -Infinity;
      data.forEach((row: number[]) => row.forEach((val: number) => { if (val < min) min = val; if (val > max) max = val; }));
      const range = max - min;
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const origX = Math.floor((x * w) / CANVAS_SIZE);
          const origY = Math.floor((y * h) / CANVAS_SIZE);
          const val = data[origY]?.[origX] ?? 0;
          const gray = range > 0 ? Math.round(((val - min) / range) * 255) : 128;
          const idx = (y * CANVAS_SIZE + x) * 4;
          imgData.data[idx] = gray;
          imgData.data[idx + 1] = gray;
          imgData.data[idx + 2] = gray;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (isColorMatrix(data)) {
      const h = data.length;
      const w = Math.max(...data.map((r: any[]) => r.length));
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const origX = Math.floor((x * w) / CANVAS_SIZE);
          const origY = Math.floor((y * h) / CANVAS_SIZE);
          const pix = data[origY]?.[origX] ?? [0, 0, 0];
          const idx = (y * CANVAS_SIZE + x) * 4;
          imgData.data[idx] = Math.min(255, Math.max(0, pix[0]));
          imgData.data[idx + 1] = Math.min(255, Math.max(0, pix[1]));
          imgData.data[idx + 2] = Math.min(255, Math.max(0, pix[2]));
          imgData.data[idx + 3] = pix.length === 4 ? Math.min(255, Math.max(0, pix[3])) : 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [data]);
  return (
    <div className="h-full flex justify-center items-center bg-offWhite overflow-hidden p-1">
      <canvas ref={(el) => { 
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
        setCanvasEl?.(el);
      }} className="max-w-full max-h-full w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
});

const ChartView = React.memo(({ data }: { data: number[] }) => {
  const chartData = {
    labels: data.map((_, index) => index.toString()),
    datasets: [
      { label: 'Values', data, backgroundColor: 'rgba(59, 130, 246, 0.6)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      title: { 
        display: true, 
        text: `Array of ${data.length} values`, 
        font: { size: 14 },
        color: '#e5eef2'
      } 
    },
    scales: {
      y: { 
        beginAtZero: false, 
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#e5eef2' }
      },
      x: { 
        grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
        ticks: { 
          maxTicksLimit: Math.min(20, data.length),
          color: '#e5eef2'
        } 
      },
    },
  } as any;
  return (
    <div className="h-full p-4 bg-[#0b0f10] rounded-md border border-white/10">
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
});

const TextView = React.memo(({ data }: { data: any }) => {
  const formatData = (data: any): string => {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (typeof data === 'string') return data;
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'boolean') return data.toString();
    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      if (data.length <= 10) return JSON.stringify(data, null, 2);
      return `[${data.length} items] ${JSON.stringify(data.slice(0, 5), null, 2)}...`;
    }
    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    return String(data);
  };
  return (
    <div className="h-full p-4 overflow-auto bg-[#0b0f10] rounded-md border border-white/10">
      <pre className="text-sm font-mono text-[#e5eef2] whitespace-pre-wrap break-words">{formatData(data)}</pre>
    </div>
  );
});

const TableView = React.memo(({ data, columns }: { data: any[]; columns: any[] }) => {
  // Add safety checks for data and columns
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0b0f10] rounded-md border border-white/10">
        <div className="text-center text-[#e5eef2]/60 p-4">
          <p>No table data available</p>
        </div>
      </div>
    );
  }

  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0b0f10] rounded-md border border-white/10">
        <div className="text-center text-[#e5eef2]/60 p-4">
          <p>No table columns defined</p>
        </div>
      </div>
    );
  }

  try {
    const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
    
    return (
      <TableErrorBoundary>
        <div className="w-full h-full overflow-auto bg-[#0b0f10] rounded-md border border-white/10 shadow-crt">
          <div className="h-full overflow-auto">
            <table className="w-full text-left border-collapse text-[#e5eef2]">
              <thead className="sticky top-0 bg-white/5">
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th key={header.id} className="p-3 border-b border-white/10 font-bold">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row: any, index: number) => (
                  <tr key={row.id} className={`hover:bg-white/5 ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}`}>
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id} className="p-3 border-b border-white/10">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TableErrorBoundary>
    );
  } catch (error) {
    console.error('Table creation error:', error);
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0b0f10] rounded-md border border-white/10">
        <div className="text-center text-[#e5eef2] p-4">
          <p className="text-red-400 mb-2">Table creation failed</p>
          <p className="text-sm opacity-70">Invalid data structure for table rendering</p>
        </div>
      </div>
    );
  }
});

const Placeholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-offBlack/70 p-6">
    <div className="mb-4 p-4 bg-blue/10 rounded-xl">
      <BarChart3 className="h-12 w-12 text-blue" />
    </div>
    <h3 className="text-2xl font-bold mb-3 text-offBlack">Visual Output Console</h3>
    <p className="text-base text-center leading-relaxed max-w-md">
      This panel will display charts, tables, and images.
      <br />
      Try running a query that returns an array of numbers, tabular data, or a matrix.
    </p>
    <div className="mt-6 flex items-center space-x-2">
      <div className="w-2 h-2 bg-blue rounded-full animate-pulse"></div>
      <span className="text-sm text-offBlack/50">Awaiting Data</span>
    </div>
  </div>
);

export const VisualOutputPanel: React.FC<VisualOutputPanelProps> = React.memo(({
  data,
  isMouseMode,
  isLiveMode,
  onToggleMouseMode,
  onToggleLiveMode,
  hasQuery,
  lastQuery,
}) => {
  const isGrayscaleMatrix = (arr: any): boolean => Array.isArray(arr) && arr.length > 0 && arr.every((row) => Array.isArray(row) && row.every((v) => typeof v === 'number'));
  const isColorMatrix = (arr: any): boolean => Array.isArray(arr) && arr.length > 0 && arr.every((row) => Array.isArray(row) && row.every((pix) => Array.isArray(pix) && (pix.length === 3 || pix.length === 4)));
  const isTableData = (d: any): boolean => {
    if (!d) return false;
    if (Array.isArray(d) && d.length > 0) return typeof d[0] === 'object' && d[0] !== null && !Array.isArray(d[0]);
    if (typeof d === 'object' && !Array.isArray(d) && d !== null) {
      const keys = Object.keys(d);
      return keys.length > 0 && Array.isArray(d[keys[0]]);
    }
    return false;
  };
  const isNumericArray = (arr: any): boolean => Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === 'number' && Number.isFinite(v));

  const hasMouseVars = (q?: string) => !!q && /(\bmouseX\b|\bmouseY\b)/i.test(q);
  const shouldShowMouse = hasMouseVars(lastQuery);

  const currentView = useMemo(() => {
    if (isGrayscaleMatrix(data) || isColorMatrix(data)) return 'image';
    if (isNumericArray(data)) return 'chart';
    if (isTableData(data)) return 'table';
    return 'text';
  }, [data]);

  const { tableData, columns } = useMemo(() => {
    try {
      let tableData: any[] = [];
      let columns: any[] = [];
      
      // Enhanced safety checks and data validation
      if (!data) {
        return { tableData, columns };
      }

      // Handle array of objects (most common table format)
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
        // Ensure all objects have consistent keys to avoid column mismatch
        const firstItem = data[0];
        const keys = Object.keys(firstItem);
        
        // Validate that all rows have the same structure
        const allRowsConsistent = data.every(row => 
          row && typeof row === 'object' && !Array.isArray(row) && 
          keys.every(key => key in row)
        );
        
        if (allRowsConsistent && keys.length > 0) {
          columns = keys.map((key) => ({ 
            accessorKey: key, 
            header: key,
            // Add stable key for React
            id: key
          }));
          tableData = data;
        }
      } 
      // Handle object with array properties (column-based format)
      else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const keys = Object.keys(data);
        if (keys.length > 0) {
          // Check if all values are arrays of the same length
          const firstKey = keys[0];
          const firstArray = data[firstKey];
          
          if (Array.isArray(firstArray)) {
            const arrayLength = firstArray.length;
            const allArraysSameLength = keys.every(key => 
              Array.isArray(data[key]) && data[key].length === arrayLength
            );
            
            if (allArraysSameLength && arrayLength > 0) {
              columns = keys.map((key) => ({ 
                accessorKey: key, 
                header: key,
                id: key
              }));
              tableData = Array.from({ length: arrayLength }, (_, i) => 
                Object.fromEntries(keys.map((k) => [k, (data as any)[k][i]]))
              );
            }
          }
        }
      }
      
      return { tableData, columns };
    } catch (error) {
      console.error('Error processing table data:', error);
      return { tableData: [], columns: [] };
    }
  }, [data]);

  const chartRef = useRef<any>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleExportPNG = async () => {
    const ts = new Date().toISOString().replace(/[:]/g, '-');
    if (currentView === 'chart' && Array.isArray(data)) {
      // Wait a bit for chart to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (chartRef.current) {
        // Ensure chart is ready before export
        if (chartRef.current.canvas) {
          await exportChartPNG(chartRef.current, `chart-${ts}.png`);
        }
      } else if (chartContainerRef.current) {
        const canvas = chartContainerRef.current.querySelector('canvas');
        if (canvas) {
          await exportCanvasPNG(canvas as HTMLCanvasElement, `chart-${ts}.png`);
        }
      }
    } else if (currentView === 'image') {
      if (imageCanvasRef.current) {
        await exportCanvasPNG(imageCanvasRef.current, `image-${ts}.png`);
      }
    }
  };

  const handleExportJSON = () => {
    const ts = new Date().toISOString().replace(/[:]/g, '-');
    if (currentView === 'table' && tableData.length > 0) {
      exportJSON(data, `table-${ts}.json`);
    } else if (currentView === 'chart' && Array.isArray(data)) {
      exportJSON(data, `chart-${ts}.json`);
    } else if (currentView === 'image' && Array.isArray(data)) {
      exportJSON(data, `image-data-${ts}.json`);
    } else if (typeof data === 'string') {
      exportJSON(data, `text-${ts}.json`);
    } else {
      exportJSON(data, `data-${ts}.json`);
    }
  };

  const handleExportCSV = () => {
    const ts = new Date().toISOString().replace(/[:]/g, '-');
    if (currentView === 'table' && tableData.length > 0) {
      if (!maybeExportCSVFromUnknown(data, `table-${ts}.csv`)) {
        exportCSV(tableData, `table-${ts}.csv`);
      }
    } else if (currentView === 'chart' && Array.isArray(data)) {
      exportCSV({ values: data }, `chart-${ts}.csv`);
    }
  };

  const handleExportText = () => {
    const ts = new Date().toISOString().replace(/[:]/g, '-');
    if (typeof data === 'string') {
      exportText(data, `text-${ts}.txt`);
    }
  };
  return (
    <div className="h-full flex flex-col overflow-hidden text-[#e5eef2]">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-neon-500" />
          <span className="text-sm">Visual Output</span>
        </div>
        <div className="flex items-center space-x-2">
          {shouldShowMouse ? (
            <Button onClick={onToggleMouseMode} variant={isMouseMode ? 'secondary' : 'outline'} size="sm" className={`${isMouseMode ? 'border-neon-500/40' : ''}`} title="Toggle mouse mode" disabled={!hasQuery}>
              <Mouse className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onToggleLiveMode} variant={isLiveMode ? 'secondary' : 'outline'} size="sm" title="Toggle live mode" disabled={!hasQuery}>
              {isLiveMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Export buttons */}
          <div className="flex items-center space-x-1">
            {(currentView === 'chart' || currentView === 'image') && (
              <Button onClick={handleExportPNG} variant="outline" size="sm" title="Export as PNG" disabled={!data}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={handleExportJSON} variant="outline" size="sm" title="Export as JSON" disabled={!data}>
              <FileJson className="h-4 w-4" />
            </Button>
            {(currentView === 'table' || currentView === 'chart') && (
              <Button onClick={handleExportCSV} variant="outline" size="sm" title="Export as CSV" disabled={!data}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            )}
            {typeof data === 'string' && (
              <Button onClick={handleExportText} variant="outline" size="sm" title="Export as Text" disabled={!data}>
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-3">
        {!data ? (
          <Placeholder />
        ) : currentView === 'image' ? (
          <ImageCanvas data={data} setCanvasEl={(el) => { imageCanvasRef.current = el; }} />
        ) : currentView === 'chart' ? (
          <ChartView data={data as number[]} />
        ) : currentView === 'table' ? (
          <TableView data={tableData} columns={columns} />
        ) : (
          <TextView data={data} />
        )}
      </div>
    </div>
  );
});

export default VisualOutputPanel;

