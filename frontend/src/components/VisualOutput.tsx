import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
  } from "@tanstack/react-table";
import type { ColumnDef, HeaderGroup, Header, Row, Cell } from "@tanstack/react-table";
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface VisualOutputProps {
  data: any;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Placeholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-offBlack/70 p-6">
    <div className="mb-4 p-4 bg-blue/10 rounded-xl">
      <BarChart3 className="h-12 w-12 text-blue" />
    </div>
    <h3 className="text-2xl font-bold mb-3 text-offBlack">Visual Output Console</h3>
    <p className="text-base text-center leading-relaxed max-w-md">
      This panel will display charts, tables, and images.
      <br />
      Try running a query that returns tabular data or an array of numbers.
    </p>
    <div className="mt-6 flex items-center space-x-2">
      <div className="w-2 h-2 bg-blue rounded-full animate-pulse"></div>
      <span className="text-sm text-offBlack/50">Awaiting Data</span>
    </div>
  </div>
);

const TableView = ({ data, columns }: { data: any[], columns: any[] }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full h-full overflow-auto bg-white rounded-lg border-2 border-offBlack16 shadow-sm">
      <div className="h-full overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-fadedBlue8">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th key={header.id} className="p-3 border-b-2 border-offBlack16 font-bold text-offBlack">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row: any, index: number) => (
              <tr key={row.id} className={`hover:bg-fadedBlue8 ${index % 2 === 0 ? 'bg-white' : 'bg-offWhite'}`}>
                {row.getVisibleCells().map((cell: any) => (
                  <td key={cell.id} className="p-3 border-b border-offBlack16 text-offBlack">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const calculatePercentile = (data: number[], percentile: number): number => {
    if (data.length === 0) return 0;
    const sortedData = [...data].sort((a, b) => a - b);
    const index = (percentile / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
        return sortedData[lower];
    }
    const weight = index - lower;
    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
};

const calculateFreedmanDiaconisBins = (data: number[]): number => {
    if (data.length < 4) { // Not enough data for quartiles
        // Fallback to square-root choice for small samples
        return Math.ceil(Math.sqrt(data.length)) || 1;
    }
    const q1 = calculatePercentile(data, 25);
    const q3 = calculatePercentile(data, 75);
    const iqr = q3 - q1;

    // If IQR is 0, it indicates low variability. Use Sturges' formula as a robust fallback.
    if (iqr === 0) {
        return Math.ceil(Math.log2(data.length) + 1);
    }

    const binWidth = 2 * iqr * Math.pow(data.length, -1/3);
    const dataRange = Math.max(...data) - Math.min(...data);
    
    // If all data points are the same, we only need one bin.
    if (dataRange === 0) {
        return 1;
    }

    const numBins = Math.ceil(dataRange / binWidth);
    
    // Cap the number of bins to prevent excessively granular histograms that can hurt performance and readability.
    // 50 is a reasonable upper limit for many applications.
    return Math.min(numBins, 50);
};


const calculateHistogram = (data: number[]) => {
    if (data.length === 0) return { labels: [], data: [] };
    const numBins = calculateFreedmanDiaconisBins(data);
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min === max) {
        return { labels: [String(min)], data: [data.length] };
    }
    const binSize = (max - min) / numBins;
    const bins = new Array(numBins).fill(0);
    const labels = new Array(numBins);

    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        labels[i] = `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`;
    }

    for (const value of data) {
        if (value === max) {
            bins[numBins - 1]++;
        } else {
            const binIndex = Math.floor((value - min) / binSize);
            bins[binIndex]++;
        }
    }

    return { labels, data: bins };
};


const ChartView = ({
  data,
  xAxisKey,
  yAxisKeys,
  chartType,
  numericColumns,
}: {
  data: any[];
  xAxisKey: string | null;
  yAxisKeys: string[];
  chartType: 'line' | 'bar' | 'scatter' | 'histogram';
  numericColumns: string[];
}) => {
  const chartData = useMemo(() => {
    if (chartType === 'histogram') {
        if (!xAxisKey || !Array.isArray(data) || data.length === 0) {
            return { labels: [], datasets: [] };
        }
        const numericData = data.map(row => row[xAxisKey]).filter(v => typeof v === 'number');
        const { labels, data: histData } = calculateHistogram(numericData);
        return {
            labels,
            datasets: [{
                label: `Frequency of ${xAxisKey}`,
                data: histData,
                backgroundColor: '#1865f2',
                borderColor: '#1865f2',
                borderWidth: 1,
            }]
        };
    }

    if (!xAxisKey || yAxisKeys.length === 0 || !Array.isArray(data) || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const isXNumeric = numericColumns.includes(xAxisKey);
    const kaColors = ['#1865f2', '#00a60e', '#ffb100', '#d92916', '#9059ff'];

    const labels = isXNumeric ? undefined : data.map((row) => row[xAxisKey]);
    const datasets = yAxisKeys.map((key, i) => ({
      label: key,
      data: data.map((row) => isXNumeric ? {x: row[xAxisKey], y: row[key]} : row[key]),
      borderColor: kaColors[i % kaColors.length],
      backgroundColor: chartType === 'bar' ? kaColors[i % kaColors.length] + '80' : kaColors[i % kaColors.length],
      fill: false,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }));

    return { labels, datasets };
  }, [data, xAxisKey, yAxisKeys, chartType, numericColumns]);

  const isXNumeric = xAxisKey ? numericColumns.includes(xAxisKey) : false;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#21242c', font: { family: 'Lato', size: 14 } },
      },
      title: {
        display: true,
        text: chartType === 'histogram' ? `Histogram of ${xAxisKey}` : `${yAxisKeys.join(', ')} vs ${xAxisKey}`,
        color: '#21242c',
        font: { family: 'Lato', size: 16, weight: 'bold' },
      },
    },
    scales: {
      x: {
        type: isXNumeric && chartType !== 'bar' ? 'linear' : 'category',
        ticks: { color: '#21242c', font: { family: 'Lato', size: 12 } },
        grid: { color: 'rgba(33, 36, 44, 0.1)' },
      },
      y: {
        type: 'linear',
        ticks: { color: '#21242c', font: { family: 'Lato', size: 12 } },
        grid: { color: 'rgba(33, 36, 44, 0.1)' },
      },
    },
  };

  if (chartType === 'histogram') {
    if (!xAxisKey) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                <h3 className="text-lg font-bold mb-2">Histogram</h3>
                <p className="text-sm text-center">
                    Select a numeric data column to display its distribution.
                </p>
            </div>
        )
    }
  } else if (!xAxisKey || yAxisKeys.length === 0) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <h3 className="text-lg font-bold mb-2">Chart Output</h3>
            <p className="text-sm text-center">
                Select an X-axis and at least one Y-axis to display a chart.
            </p>
        </div>
    )
  }

  const ChartComponent = {
    line: Line,
    bar: Bar,
    scatter: Scatter,
    histogram: Bar,
  }[chartType];

  return <ChartComponent data={chartData} options={options} />;
};


export const VisualOutput: React.FC<VisualOutputProps> = ({ data, isCollapsed = true, onToggle }) => {
  const [view, setView] = useState<'image' | 'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter' | 'histogram'>('line');
  const [xAxisKey, setXAxisKey] = useState<string | null>(null);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>();
  const frameIdxRef = useRef(0);

  // Debug function to understand data structure
  const debugDataStructure = (data: any) => {
    if (!data) return 'null/undefined';
    if (Array.isArray(data)) {
      if (data.length === 0) return 'empty array';
      const firstEl = data[0];
      if (Array.isArray(firstEl)) {
        if (firstEl.every(v => typeof v === 'number')) {
          return `${data.length}x${firstEl.length} numeric matrix`;
        }
        return `${data.length}x${firstEl.length} mixed matrix`;
      }
      return `array of ${typeof firstEl} (length: ${data.length})`;
    }
    return typeof data;
  };

  // Log data structure when it changes
  React.useEffect(() => {
    if (data) {
      console.log('VisualOutput received data:', {
        structure: debugDataStructure(data),
        sample: Array.isArray(data) && data.length > 0 ? data[0] : data,
        isGrayscaleMatrix: isGrayscaleMatrix(data),
        isColorMatrix: isColorMatrix(data)
      });
    }
  }, [data]);

  const { tableData, columns, columnNames, numericColumns } = useMemo(() => {
    let tableData: any[] = [];
    let columns: any[] = [];
    let columnNames: string[] = [];
    let numericColumns: string[] = [];

    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
        // Array of objects (proper table)
        const keys = Object.keys(data[0]);
        columnNames = keys;
        columns = keys.map((key) => ({ accessorKey: key, header: key }));
        tableData = data;
        numericColumns = keys.filter(k => typeof data[0][k] === 'number');
      }
    } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        // Dictionary of lists (flipped table)
        const keys = Object.keys(data);
        if (keys.length > 0 && Array.isArray(data[keys[0]])) {
            columnNames = keys;
            columns = keys.map(key => ({ accessorKey: key, header: key }));
            const numRows = data[keys[0]].length;
            tableData = Array.from({ length: numRows }, (_, i) => 
                Object.fromEntries(keys.map(k => [k, data[k][i]]))
            );
            if (numRows > 0) {
                numericColumns = keys.filter(k => typeof tableData[0][k] === 'number');
            }
        }
    }
    return { tableData, columns, columnNames, numericColumns };
  }, [data]);

  // Utility type guards
  const isGrayscaleMatrix = (arr: any): arr is number[][] => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    
    // Check if it's an array of arrays with all numbers
    return arr.every(row => 
      Array.isArray(row) && 
      row.length > 0 && 
      row.every(v => typeof v === 'number' && !isNaN(v))
    );
  };

  const isColorMatrix = (arr: any): arr is number[][][] => (
      Array.isArray(arr) && arr.length > 0 &&
      arr.every(row => Array.isArray(row) && row.every(pix => Array.isArray(pix) && (pix.length === 3 || pix.length === 4) && pix.every(c => typeof c === 'number')))
  );

  const isGrayscaleGif = (arr: any): arr is number[][][] => (
      Array.isArray(arr) && arr.length > 0 && isGrayscaleMatrix(arr[0]) && !isColorMatrix(arr)
  );

  const isColorGif = (arr: any): arr is number[][][][] => (
      Array.isArray(arr) && arr.length > 0 && isColorMatrix(arr[0])
  );

  const handleChartTypeChange = (type: any) => {
      if (type === 'line' || type === 'bar' || type === 'scatter' || type === 'histogram') {
        setChartType(type);
        setXAxisKey(null);
        setYAxisKeys([]);
      }
  }

  // Cleanup canvas animation on unmount or data change
  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = undefined;
      }
    };
  }, [data]);

  // Re-trigger canvas rendering when component becomes visible
  useEffect(() => {
    if (!isCollapsed && data && view === 'image') {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          // Force re-render of canvas content
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isCollapsed, data, view]);

    useEffect(() => {
        // Reset selections when data changes
        setXAxisKey(null);
        setYAxisKeys([]);
        
        // Check for image data first
        if (isGrayscaleMatrix(data) || isColorMatrix(data) || isGrayscaleGif(data) || isColorGif(data)) {
            setView('image');
        } else if (isTableData(data)) {
            // If there's exactly one column and it's numeric, default to histogram view
            if (columnNames.length === 1 && numericColumns.length === 1) {
                setView('chart');
                setChartType('histogram');
                setXAxisKey(numericColumns[0]);
            } else {
                setView('table');
            }
        } else {
            setView('table'); // Default fallback
        }
    }, [data, columnNames, numericColumns]);

    const isTableData = (d: any): d is Record<string, any[]> | Record<string, any[]>[] => {
        if (!d) return false;
        if (Array.isArray(d) && d.length > 0) {
            // Only consider arrays of objects (not arrays of arrays)
            return typeof d[0] === 'object' && d[0] !== null && !Array.isArray(d[0]);
        }
        if (typeof d === 'object' && !Array.isArray(d) && d !== null) {
            // Dictionary of lists (flipped table) is still valid
            const keys = Object.keys(d);
            return keys.length > 0 && Array.isArray(d[keys[0]]);
        }
        return false;
    };

    const isProperTable = (d: any): boolean => {
        if (!d) return false;
        if (Array.isArray(d) && d.length > 0) {
            // Only allow arrays of objects (proper tables), not arrays of arrays
            return typeof d[0] === 'object' && d[0] !== null && !Array.isArray(d[0]);
        }
        if (typeof d === 'object' && !Array.isArray(d) && d !== null) {
            // Dictionary of lists (flipped table) is also a proper table
            const keys = Object.keys(d);
            return keys.length > 0 && Array.isArray(d[keys[0]]);
        }
        return false;
    };

    const isChartable = (): boolean => {
        if (!isProperTable(data)) return false;
        if (!tableData || tableData.length === 0) return false;

        const firstRow = tableData[0];
        if (typeof firstRow !== 'object' || firstRow === null) return false;
        
        return numericColumns.length > 0;
    };


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    frameIdxRef.current = 0;

    const drawFrame = (frame: any) => {
        if (!canvas) return;
        const CANVAS_SIZE = 400;
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        canvas.style.imageRendering = 'pixelated';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (isGrayscaleMatrix(frame)) {
            const h = frame.length;
            const w = Math.max(...frame.map((r: any[]) => r.length));
            let min = Infinity, max = -Infinity;
            frame.forEach(row => row.forEach(val => {
                if (val < min) min = val;
                if (val > max) max = val;
            }));
            const range = max - min;
            const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
            for (let y = 0; y < CANVAS_SIZE; y++) {
                for (let x = 0; x < CANVAS_SIZE; x++) {
                    // Map canvas pixel to original array
                    const origX = Math.floor(x * w / CANVAS_SIZE);
                    const origY = Math.floor(y * h / CANVAS_SIZE);
                    const val = frame[origY]?.[origX] ?? 0;
                    const gray = range > 0 ? Math.round(((val - min) / range) * 255) : Math.min(max, 255);
                    const idx = (y * CANVAS_SIZE + x) * 4;
                    imgData.data.set([gray, gray, gray, 255], idx);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (isColorMatrix(frame)) {
            const h = frame.length;
            const w = Math.max(...frame.map((r: any[]) => r.length));
            
            // Calculate min and max for each channel to properly normalize
            let minR = Infinity, maxR = -Infinity;
            let minG = Infinity, maxG = -Infinity;
            let minB = Infinity, maxB = -Infinity;
            let minA = Infinity, maxA = -Infinity;
            
            frame.forEach(row => row.forEach(pix => {
                if (pix[0] < minR) minR = pix[0];
                if (pix[0] > maxR) maxR = pix[0];
                if (pix[1] < minG) minG = pix[1];
                if (pix[1] > maxG) maxG = pix[1];
                if (pix[2] < minB) minB = pix[2];
                if (pix[2] > maxB) maxB = pix[2];
                if (pix.length === 4) {
                    if (pix[3] < minA) minA = pix[3];
                    if (pix[3] > maxA) maxA = pix[3];
                }
            }));
            
            const rangeR = maxR - minR;
            const rangeG = maxG - minG;
            const rangeB = maxB - minB;
            const rangeA = maxA - minA;
            
            const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
            for (let y = 0; y < CANVAS_SIZE; y++) {
                for (let x = 0; x < CANVAS_SIZE; x++) {
                    // Map canvas pixel to original array
                    const origX = Math.floor(x * w / CANVAS_SIZE);
                    const origY = Math.floor(y * h / CANVAS_SIZE);
                    const pix = frame[origY]?.[origX] ?? [0, 0, 0];
                    
                    // Normalize each channel based on actual data range
                    const r = rangeR > 0 ? Math.round(((pix[0] - minR) / rangeR) * 255) : Math.min(maxR, 255);
                    const g = rangeG > 0 ? Math.round(((pix[1] - minG) / rangeG) * 255) : Math.min(maxG, 255);
                    const b = rangeB > 0 ? Math.round(((pix[2] - minB) / rangeB) * 255) : Math.min(maxB, 255);
                    const a = pix.length === 4 
                        ? (rangeA > 0 ? Math.round(((pix[3] - minA) / rangeA) * 255) : Math.min(maxA, 255))
                        : 255;
                    
                    const idx = (y * CANVAS_SIZE + x) * 4;
                    imgData.data.set([r, g, b, a], idx);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }
    };
    
    if ((isColorGif(data) || isGrayscaleGif(data))) {
      const frames = data as any[];
      const render = () => {
        drawFrame(frames[frameIdxRef.current]);
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
        animRef.current = requestAnimationFrame(render);
      };
      render();
    } else if ((isColorMatrix(data) || isGrayscaleMatrix(data))) {
      drawFrame(data);
    }
  }, [data, view, isCollapsed]); // Re-run if view changes or when expanded


  const handleYAxisToggle = (key: string) => {
    setYAxisKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (!data) {
    return (
      <div className="h-full w-full bg-white rounded-xl border-2 border-offBlack16 shadow-lg overflow-hidden flex flex-col">
        <div className="flex-shrink-0 bg-offBlack p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-white" />
            <h3 className="text-base font-semibold text-white">Visual Output</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-white/10 rounded transition-colors duration-200 border border-white/30"
            aria-label={isCollapsed ? "Expand visual output" : "Collapse visual output"}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
          </button>
        </div>
        
        {/* Content Area - Only show when not collapsed */}
        {!isCollapsed && (
          <div className="flex-1 p-4">
            <Placeholder />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white rounded-xl border-2 border-offBlack16 shadow-lg overflow-hidden flex flex-col">
      <div className="flex-shrink-0 bg-offBlack p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-white" />
          <h3 className="text-base font-semibold text-white">Visual Output</h3>
        </div>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-white/10 rounded transition-colors duration-200 border border-white/30"
          aria-label={isCollapsed ? "Expand visual output" : "Collapse visual output"}
        >
          {isCollapsed ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
        </button>
      </div>
      
      {/* View Selection Header - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="flex-shrink-0 flex items-center space-x-2 p-2 border-b-2 border-offBlack16 bg-fadedBlue8">
          {isTableData(data) && (
            <Button onClick={() => setView('table')} variant={view === 'table' ? 'secondary' : 'ghost'} size="sm">Table</Button>
          )}
          {isChartable() && (
            <Button onClick={() => setView('chart')} variant={view === 'chart' ? 'secondary' : 'ghost'} size="sm">Chart</Button>
          )}
          {(isGrayscaleMatrix(data) || isColorMatrix(data) || isGrayscaleGif(data) || isColorGif(data)) && (
            <Button onClick={() => setView('image')} variant={view === 'image' ? 'secondary' : 'ghost'} size="sm">Image</Button>
          )}
        </div>
      )}

      {/* Content Views - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {view === 'table' && isTableData(data) && (
            <div className="h-full overflow-hidden">
              <TableView data={tableData} columns={columns} />
            </div>
          )}
          
          {view === 'image' && (
            <div className="h-full flex justify-center items-center bg-offWhite rounded-lg border-2 border-offBlack16 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain border border-gray-300"
                style={{ minWidth: '100px', minHeight: '100px' }}
              />
            </div>
          )}
          
          {view === 'chart' && isChartable() && (
            <div className='h-full flex overflow-hidden'>
              <div className='w-1/3 flex-shrink-0 p-4 space-y-4 border-r-2 border-offBlack16 bg-fadedBlue8 rounded-l-lg overflow-y-auto'>
                <div>
                  <Label className="font-bold text-blue">Chart Type</Label>
                  <RadioGroup value={chartType} onValueChange={handleChartTypeChange} className="mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="line" id="line" /><Label htmlFor="line">Line</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="bar" id="bar" /><Label htmlFor="bar">Bar</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="scatter" id="scatter" /><Label htmlFor="scatter">Scatter</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="histogram" id="histogram" /><Label htmlFor="histogram">Histogram</Label></div>
                  </RadioGroup>
                </div>
                {chartType === 'histogram' ? (
                  <div>
                    <Label className="font-bold text-blue">Data Column</Label>
                    <RadioGroup value={xAxisKey || ''} onValueChange={setXAxisKey} className="mt-2">
                      {numericColumns.map(key => (
                        <div key={key} className="flex items-center space-x-2">
                          <RadioGroupItem value={key} id={key} />
                          <Label htmlFor={key}>{key}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="font-bold text-blue">X-Axis</Label>
                      <RadioGroup value={xAxisKey || ''} onValueChange={setXAxisKey} className="mt-2">
                        {columnNames.map(key => (
                          <div key={key} className="flex items-center space-x-2">
                            <RadioGroupItem value={key} id={key} />
                            <Label htmlFor={key}>{key}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    
                    {xAxisKey && (
                      <div>
                        <Label className="font-bold text-blue mt-4">Y-Axis (Values)</Label>
                        <div className="mt-2 space-y-2">
                          {numericColumns
                            .filter(key => key !== xAxisKey)
                            .map(key => (
                              <div key={`y-${key}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`y-${key}`}
                                  checked={yAxisKeys.includes(key)}
                                  onCheckedChange={() => handleYAxisToggle(key)}
                                />
                                <Label htmlFor={`y-${key}`}>{key}</Label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className='flex-1 p-4 bg-white rounded-r-lg overflow-hidden'>
                <div className="h-full">
                  <ChartView data={tableData} xAxisKey={xAxisKey} yAxisKeys={yAxisKeys} chartType={chartType} numericColumns={numericColumns} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 